import { Response } from 'express';
import { Request } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { getSupabaseClient } from '../config/database';
import * as whatsappService from '../services/whatsapp.service';
import * as messageService from '../services/message.service';
import { listAllSupabaseFiles, migrateFile } from '../services/migration.service';

const supabase = getSupabaseClient();

interface AdminRequest extends Request {
  adminToken?: string;
}

/**
 * Middleware to verify admin token
 */
export const verifyAdminToken = (req: AdminRequest, res: Response, next: () => void): void => {
  const authHeader = req.headers.authorization;
  const adminToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : (req.headers['x-admin-token'] || req.query.token);
  
  if (!adminToken) {
    res.status(401).json({
      success: false,
      error: { message: 'Unauthorized. Admin token required.', statusCode: 401 },
    });
    return;
  }

  // First check if it's the static token (for backward compatibility or scripts)
  const expectedStaticToken = process.env.ADMIN_MIGRATION_TOKEN || 'change-me-in-production';
  if (adminToken === expectedStaticToken) {
    req.adminToken = adminToken as string;
    return next();
  }

  // If not static, try to verify as JWT
  try {
    const decoded = jwt.verify(adminToken as string, env.JWT_SECRET) as { adminId: string; email: string; role: string };
    if (decoded.role !== 'admin') {
      throw new Error('Not an admin token');
    }
    req.adminToken = adminToken as string;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { message: 'Unauthorized. Invalid admin token.', statusCode: 401 },
    });
  }
};

/**
 * Admin Login
 * POST /api/admin/auth/login
 */
export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !admin) {
      res.status(401).json({ success: false, error: { message: 'Email ou mot de passe incorrect' } });
      return;
    }

    const validPassword = await bcrypt.compare(password, admin.password_hash);
    if (!validPassword) {
      res.status(401).json({ success: false, error: { message: 'Email ou mot de passe incorrect' } });
      return;
    }

    const token = jwt.sign(
      { adminId: admin.id, email: admin.email, role: 'admin' },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      success: true,
      data: {
        admin: { id: admin.id, email: admin.email },
        token,
      },
    });
  } catch (error) {
    logger.error('[Admin] Login error:', error);
    res.status(500).json({ success: false, error: { message: 'Erreur lors de la connexion' } });
  }
};

/**
 * Admin Register (Temporary / Initial setup)
 * POST /api/admin/auth/register
 */
export const adminRegister = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password || password.length < 8) {
      res.status(400).json({ success: false, error: { message: 'Email et mot de passe (8 char min) requis' } });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data: admin, error } = await supabase
      .from('admins')
      .insert({ email: email.toLowerCase(), password_hash })
      .select('id, email')
      .single();

    if (error) {
      if (error.code === '23505') {
        res.status(409).json({ success: false, error: { message: 'Cet email est déjà utilisé' } });
      } else {
        throw error;
      }
      return;
    }

    res.status(201).json({
      success: true,
      data: admin,
    });
  } catch (error) {
    logger.error('[Admin] Register error:', error);
    res.status(500).json({ success: false, error: { message: 'Erreur lors de la création du compte' } });
  }
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

/**
 * Get all users and their WhatsApp connection status
 */
export const getAllUsers = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, plan, log_messages, created_at');

    if (error) throw error;

    const { data: sessions } = await supabase
      .from('whatsapp_sessions')
      .select('user_id, status, last_seen');

    const usersWithStatus = users.map(user => {
      const session = sessions?.find(s => s.user_id === user.id);
      return {
        ...user,
        whatsapp_status: session?.status || 'disconnected',
        last_seen: session?.last_seen || null,
      };
    });

    res.status(200).json({
      success: true,
      data: usersWithStatus,
    });
  } catch (error) {
    logger.error('[Admin] Error getting all users:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get users' },
    });
  }
};

/**
 * Toggle message logging for a user
 * POST /api/admin/users/:userId/toggle-logging
 */
export const toggleUserLogging = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      res.status(400).json({
        success: false,
        error: { message: 'enabled field must be a boolean' },
      });
      return;
    }

    const { error } = await supabase
      .from('users')
      .update({ log_messages: enabled })
      .eq('id', userId);

    if (error) throw error;

    // Update the cache in whatsapp service
    whatsappService.updateMessageLoggingCache(userId, enabled);

    res.status(200).json({
      success: true,
      data: { enabled },
    });
  } catch (error) {
    logger.error('[Admin] Error toggling user logging:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to toggle logging' },
    });
  }
};

/**
 * Get contacts for a specific user
 */
export const getUserContacts = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const contacts = await messageService.getContacts(userId);

    res.status(200).json({
      success: true,
      data: contacts,
    });
  } catch (error) {
    logger.error('[Admin] Error getting user contacts:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get contacts' },
    });
  }
};

/**
 * Get messages for a user-contact pair
 */
export const getUserMessages = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { userId, contactId } = req.params;
    const messages = await messageService.getMessages(userId, contactId);

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    logger.error('[Admin] Error getting user messages:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get messages' },
    });
  }
};

/**
 * Send a message as a specific user
 */
export const sendMessageAsUser = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { to, message } = req.body;

    if (!to || !message) {
      res.status(400).json({
        success: false,
        error: { message: 'Recipient and message are required' },
      });
      return;
    }

    await whatsappService.sendMessage(userId, to, message);

    res.status(200).json({
      success: true,
      message: 'Message sent successfully',
    });
  } catch (error) {
    logger.error('[Admin] Error sending message as user:', error);
    res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Failed to send message' },
    });
  }
};

