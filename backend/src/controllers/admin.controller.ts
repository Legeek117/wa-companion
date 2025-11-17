import { Response } from 'express';
import { Request } from 'express';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { listAllSupabaseFiles, migrateFile } from '../services/migration.service';

interface AdminRequest extends Request {
  adminToken?: string;
}

/**
 * Middleware to verify admin token
 */
export const verifyAdminToken = (req: AdminRequest, res: Response, next: () => void): void => {
  const adminToken = req.headers['x-admin-token'] || req.query.token;
  const expectedToken = process.env.ADMIN_MIGRATION_TOKEN || 'change-me-in-production';

  if (!adminToken || adminToken !== expectedToken) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Unauthorized. Invalid admin token.',
        statusCode: 401,
      },
    });
    return;
  }

  req.adminToken = adminToken as string;
  next();
};

/**
 * Start migration from Supabase to Cloudinary
 * POST /api/admin/migrate-cloudinary
 * Headers: x-admin-token: YOUR_SECRET_TOKEN
 */
export const startMigration = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    logger.info('[Admin] Migration request received');

    // Check Cloudinary config
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Cloudinary not configured. Please set CLOUDINARY_* variables.',
          statusCode: 400,
        },
      });
      return;
    }

    // Start migration in background (don't block response)
    // The migration will run asynchronously
    migrateAllFiles().catch((error) => {
      logger.error('[Admin] Migration error:', error);
    });

    // Return immediately
    res.status(202).json({
      success: true,
      message: 'Migration started. Check logs for progress.',
      data: {
        status: 'started',
        note: 'Migration is running in background. Check server logs for progress.',
      },
    });
  } catch (error) {
    logger.error('[Admin] Error starting migration:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to start migration',
        statusCode: 500,
      },
    });
  }
};

/**
 * Get migration status
 * GET /api/admin/migration-status
 * Headers: x-admin-token: YOUR_SECRET_TOKEN
 */
export const getMigrationStatus = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    // This is a simple implementation
    // In production, you might want to store status in Redis or database
    res.status(200).json({
      success: true,
      data: {
        message: 'Check server logs for migration status',
        note: 'Migration status is logged in server logs',
      },
    });
  } catch (error) {
    logger.error('[Admin] Error getting migration status:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to get migration status',
        statusCode: 500,
      },
    });
  }
};

/**
 * Background migration function
 */
async function migrateAllFiles(): Promise<void> {
  try {
    logger.info('[Migration] ========================================');
    logger.info('[Migration] Starting Supabase → Cloudinary migration');
    logger.info('[Migration] ========================================');

    // List all files
    logger.info('[Migration] Listing all files from Supabase...');
    const files = await listAllSupabaseFiles();
    logger.info(`[Migration] Found ${files.length} files to migrate`);

    if (files.length === 0) {
      logger.info('[Migration] ✅ No files to migrate');
      return;
    }

    // Migrate files
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      logger.info(`[Migration] [${i + 1}/${files.length}] Processing: ${file.path}`);

      const success = await migrateFile(file);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      // Small delay to avoid rate limiting
      if (i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    logger.info('[Migration] ========================================');
    logger.info(`[Migration] ✅ Migration Complete!`);
    logger.info(`[Migration] Success: ${successCount}`);
    logger.info(`[Migration] Failed: ${failCount}`);
    logger.info('[Migration] ========================================');
  } catch (error) {
    logger.error('[Migration] ❌ Fatal error:', error);
    throw error;
  }
}

