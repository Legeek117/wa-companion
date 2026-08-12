/**
 * Migration service — DÉSACTIVÉ
 * La migration Supabase → Cloudinary n'est plus nécessaire.
 * Tous les médias sont stockés localement dans le volume Docker /app/uploads.
 */

import { logger } from '../config/logger';

export interface FileInfo {
  path: string;
  userId: string;
  subdirectory: string;
  filename: string;
}

/**
 * List all files from Supabase Storage — DÉSACTIVÉ
 */
export async function listAllSupabaseFiles(): Promise<FileInfo[]> {
  logger.info('[Migration] Migration service disabled — no Supabase storage');
  return [];
}

/**
 * Migrate a single file from Supabase to Cloudinary — DÉSACTIVÉ
 */
export async function migrateFile(file: FileInfo): Promise<boolean> {
  logger.info(`[Migration] Migration disabled for file: ${file.path}`);
  return false;
}
