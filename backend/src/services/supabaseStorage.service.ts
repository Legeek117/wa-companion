import { getSupabaseClient } from '../config/database';
import { env } from '../config/env';
import { logger } from '../config/logger';

const STORAGE_BUCKET = env.SUPABASE_STORAGE_BUCKET?.trim();
const supabase = getSupabaseClient();

const isStorageEnabled = (): boolean => {
  return !!STORAGE_BUCKET;
};

/**
 * Upload media to Supabase Storage
 */
export const uploadMediaToSupabase = async (
  buffer: Buffer,
  path: string,
  contentType: string,
  options?: {
    upsert?: boolean;
    cacheControl?: string;
  }
): Promise<string | null> => {
  if (!isStorageEnabled()) {
    logger.warn('[SupabaseStorage] Storage not enabled, SUPABASE_STORAGE_BUCKET not set');
    return null;
  }

  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET as string)
      .upload(path, buffer, {
        upsert: options?.upsert ?? true,
        contentType,
        cacheControl: options?.cacheControl || '3600',
      });

    if (error) {
      logger.error('[SupabaseStorage] Upload error:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET as string)
      .getPublicUrl(path);

    const publicUrl = urlData.publicUrl;
    logger.info(`[SupabaseStorage] Media uploaded: ${path} -> ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    logger.error('[SupabaseStorage] Error uploading media:', error);
    return null;
  }
};

/**
 * Download media from Supabase Storage
 */
export const downloadMediaFromSupabase = async (
  path: string
): Promise<Buffer | null> => {
  if (!isStorageEnabled()) {
    return null;
  }

  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET as string)
      .download(path);

    if (error) {
      logger.error('[SupabaseStorage] Download error:', error);
      return null;
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    logger.info(`[SupabaseStorage] Media downloaded: ${path} (${buffer.length} bytes)`);
    return buffer;
  } catch (error) {
    logger.error('[SupabaseStorage] Error downloading media:', error);
    return null;
  }
};

/**
 * Delete media from Supabase Storage
 */
export const deleteMediaFromSupabase = async (
  path: string
): Promise<boolean> => {
  if (!isStorageEnabled()) {
    return false;
  }

  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET as string)
      .remove([path]);

    if (error) {
      logger.error('[SupabaseStorage] Delete error:', error);
      return false;
    }

    logger.info(`[SupabaseStorage] Media deleted: ${path}`);
    return true;
  } catch (error) {
    logger.error('[SupabaseStorage] Error deleting media:', error);
    return false;
  }
};

/**
 * Get public URL for media in Supabase Storage
 */
export const getMediaPublicUrl = (path: string): string | null => {
  if (!isStorageEnabled()) {
    return null;
  }

  try {
    const { data } = supabase.storage
      .from(STORAGE_BUCKET as string)
      .getPublicUrl(path);

    return data.publicUrl;
  } catch (error) {
    logger.error('[SupabaseStorage] Error getting public URL:', error);
    return null;
  }
};

/**
 * List files in a directory
 */
export const listMediaFiles = async (
  prefix: string,
  limit: number = 1000
): Promise<string[]> => {
  if (!isStorageEnabled()) {
    return [];
  }

  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET as string)
      .list(prefix, { limit });

    if (error) {
      if (error.message?.includes('not found')) {
        return [];
      }
      logger.error('[SupabaseStorage] List error:', error);
      return [];
    }

    return (data || []).map((file) => (prefix ? `${prefix}/${file.name}` : file.name));
  } catch (error) {
    logger.error('[SupabaseStorage] Error listing files:', error);
    return [];
  }
};

