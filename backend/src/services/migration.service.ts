/**
 * Migration service - Shared functions for Supabase → Cloudinary migration
 */

import { getSupabaseClient } from '../config/database';
import { downloadMediaFromSupabase } from './supabaseStorage.service';
import { uploadMediaToCloudinary } from './cloudinaryStorage.service';
import { logger } from '../config/logger';
import { env } from '../config/env';

const STORAGE_BUCKET = env.SUPABASE_STORAGE_BUCKET?.trim();
const supabase = getSupabaseClient();

export interface FileInfo {
  path: string;
  userId: string;
  subdirectory: string;
  filename: string;
}

/**
 * List all files from Supabase Storage
 */
export async function listAllSupabaseFiles(): Promise<FileInfo[]> {
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

/**
 * Migrate a single file from Supabase to Cloudinary
 */
export async function migrateFile(file: FileInfo): Promise<boolean> {
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

