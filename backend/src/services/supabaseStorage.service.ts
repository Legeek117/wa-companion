/**
 * Supabase Storage — DÉSACTIVÉ
 * Le stockage des médias utilise le système de fichiers local (volume Docker /app/uploads).
 * Toutes les fonctions sont des no-ops qui retournent null/false/[].
 */

import { logger } from '../config/logger';

export const uploadMediaToSupabase = async (
  _buffer: Buffer,
  _path: string,
  _contentType: string,
  _options?: { upsert?: boolean; cacheControl?: string }
): Promise<string | null> => {
  logger.debug('[SupabaseStorage] Disabled — using local storage');
  return null;
};

export const downloadMediaFromSupabase = async (
  _path: string
): Promise<Buffer | null> => {
  logger.debug('[SupabaseStorage] Disabled — using local storage');
  return null;
};

export const deleteMediaFromSupabase = async (
  _path: string
): Promise<boolean> => {
  return false;
};

export const getMediaPublicUrl = (_path: string): string | null => {
  return null;
};

export const listMediaFiles = async (
  _prefix: string,
  _limit?: number
): Promise<string[]> => {
  return [];
};
