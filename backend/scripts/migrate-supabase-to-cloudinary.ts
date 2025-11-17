/**
 * Script de migration des fichiers Supabase vers Cloudinary
 * 
 * Usage:
 *   npm run build
 *   node dist/scripts/migrate-supabase-to-cloudinary.js
 * 
 * Ou en développement:
 *   ts-node scripts/migrate-supabase-to-cloudinary.ts
 */

import { getSupabaseClient } from '../src/config/database';
import { downloadMediaFromSupabase } from '../src/services/supabaseStorage.service';
import { uploadMediaToCloudinary } from '../src/services/cloudinaryStorage.service';
import { logger } from '../src/config/logger';
import { env } from '../src/config/env';

const STORAGE_BUCKET = env.SUPABASE_STORAGE_BUCKET?.trim();
const supabase = getSupabaseClient();

interface FileInfo {
  path: string;
  userId: string;
  subdirectory: string;
  filename: string;
}

async function listAllSupabaseFiles(): Promise<FileInfo[]> {
  const files: FileInfo[] = [];
  const subdirectories = ['deleted-messages', 'view-once', 'scheduled-status'];

  logger.info('[Migration] Listing files from Supabase...');

  for (const subdirectory of subdirectories) {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET as string)
        .list(subdirectory, { limit: 1000 });

      if (error) {
        if (error.message?.includes('not found')) {
          logger.debug(`[Migration] No files in ${subdirectory}`);
          continue;
        }
        logger.warn(`[Migration] Error listing ${subdirectory}:`, error);
        continue;
      }

      if (!data || data.length === 0) {
        logger.debug(`[Migration] No files in ${subdirectory}`);
        continue;
      }

      for (const item of data) {
        // Check if it's a user folder (folder has id === null)
        if (item.id === null) {
          const userId = item.name;
          logger.debug(`[Migration] Found user folder: ${subdirectory}/${userId}`);

          const { data: userFiles, error: userFilesError } = await supabase.storage
            .from(STORAGE_BUCKET as string)
            .list(`${subdirectory}/${userId}`, { limit: 1000 });

          if (userFilesError) {
            logger.warn(`[Migration] Error listing files for user ${userId}:`, userFilesError);
            continue;
          }

          if (userFiles) {
            for (const file of userFiles) {
              // File has id !== null
              if (file.id !== null) {
                files.push({
                  path: `${subdirectory}/${userId}/${file.name}`,
                  userId,
                  subdirectory,
                  filename: file.name,
                });
              }
            }
          }
        } else {
          // Direct file in subdirectory (no userId folder)
          files.push({
            path: `${subdirectory}/${item.name}`,
            userId: '',
            subdirectory,
            filename: item.name,
          });
        }
      }
    } catch (error) {
      logger.error(`[Migration] Error processing ${subdirectory}:`, error);
    }
  }

  return files;
}

async function migrateFile(file: FileInfo): Promise<boolean> {
  try {
    logger.info(`[Migration] Migrating: ${file.path}`);

    // Download from Supabase
    const buffer = await downloadMediaFromSupabase(file.path);
    if (!buffer) {
      logger.warn(`[Migration] Failed to download: ${file.path}`);
      return false;
    }

    // Determine content type from filename
    const ext = file.filename.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
    else if (ext === 'png') contentType = 'image/png';
    else if (ext === 'gif') contentType = 'image/gif';
    else if (ext === 'webp') contentType = 'image/webp';
    else if (ext === 'mp4') contentType = 'video/mp4';
    else if (ext === 'mov') contentType = 'video/quicktime';
    else if (ext === 'pdf') contentType = 'application/pdf';

    // Upload to Cloudinary
    // Use the same path structure: subdirectory/userId/filename
    const cloudinaryUrl = await uploadMediaToCloudinary(
      buffer,
      file.path,
      contentType,
      { folder: file.subdirectory }
    );

    if (cloudinaryUrl) {
      logger.info(`[Migration] ✅ Migrated: ${file.path} -> ${cloudinaryUrl}`);
      return true;
    } else {
      logger.warn(`[Migration] ❌ Failed to upload to Cloudinary: ${file.path}`);
      return false;
    }
  } catch (error) {
    logger.error(`[Migration] Error migrating ${file.path}:`, error);
    return false;
  }
}

async function main() {
  logger.info('[Migration] ========================================');
  logger.info('[Migration] Starting Supabase → Cloudinary migration');
  logger.info('[Migration] ========================================');

  // Check Cloudinary config
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    logger.error('[Migration] ❌ Cloudinary not configured!');
    logger.error('[Migration] Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
    process.exit(1);
  }

  logger.info('[Migration] ✅ Cloudinary configured');

  // Check Supabase config
  if (!STORAGE_BUCKET) {
    logger.error('[Migration] ❌ Supabase Storage not configured!');
    logger.error('[Migration] Please set SUPABASE_STORAGE_BUCKET');
    process.exit(1);
  }

  logger.info('[Migration] ✅ Supabase Storage configured');

  // List all files
  logger.info('[Migration] Listing all files from Supabase...');
  const files = await listAllSupabaseFiles();
  logger.info(`[Migration] Found ${files.length} files to migrate`);

  if (files.length === 0) {
    logger.info('[Migration] ✅ No files to migrate');
    process.exit(0);
  }

  // Ask for confirmation (in production, you might want to skip this)
  logger.info(`[Migration] Ready to migrate ${files.length} files`);
  logger.info('[Migration] Starting migration in 3 seconds... (Ctrl+C to cancel)');
  await new Promise(resolve => setTimeout(resolve, 3000));

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

  process.exit(0);
}

main().catch(error => {
  logger.error('[Migration] ❌ Fatal error:', error);
  process.exit(1);
});

