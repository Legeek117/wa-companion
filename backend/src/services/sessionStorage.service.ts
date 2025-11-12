import path from 'path';
import { promises as fs, existsSync } from 'fs';
import { env } from '../config/env';
import { getSupabaseClient } from '../config/database';
import { logger } from '../config/logger';

const STORAGE_BUCKET = env.SUPABASE_STORAGE_BUCKET?.trim();
const supabase = getSupabaseClient();

const isStorageEnabled = (): boolean => {
  return !!STORAGE_BUCKET;
};

const ensureDirectory = async (dirPath: string): Promise<void> => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // ignore mkdir errors (directory might already exist)
    logger.debug('[SessionStorage] mkdir error (ignored):', error);
  }
};

const listLocalFiles = async (
  baseDir: string,
  currentDir: string = baseDir
): Promise<Array<{ relativePath: string; fullPath: string }>> => {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  const files: Array<{ relativePath: string; fullPath: string }> = [];

  for (const entry of entries) {
    const entryPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await listLocalFiles(baseDir, entryPath);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      files.push({
        relativePath: path.relative(baseDir, entryPath).replace(/\\/g, '/'),
        fullPath: entryPath,
      });
    }
  }

  return files;
};

const listSupabaseFiles = async (userId: string): Promise<string[]> => {
  if (!isStorageEnabled()) {
    return [];
  }

  const files: string[] = [];

  const walk = async (prefix: string) => {
    const storagePath = prefix ? `${userId}/${prefix}` : userId;
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET as string)
      .list(storagePath, { limit: 1000 });

    if (error) {
      if (error.message?.includes('not found')) {
        return;
      }
      throw error;
    }

    if (!data || data.length === 0) {
      return;
    }

    for (const item of data) {
      const entryRelative = prefix ? `${prefix}/${item.name}` : item.name;
      const isFolder = (item as any).id === null || (item as any).metadata?.mimetype === null;
      if (isFolder) {
        await walk(entryRelative);
      } else {
        files.push(entryRelative);
      }
    }
  };

  await walk('');
  return files;
};

const guessContentType = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.json':
      return 'application/json';
    case '.txt':
      return 'text/plain';
    case '.jpeg':
    case '.jpg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    default:
      return 'application/octet-stream';
  }
};

export const syncSessionToSupabase = async (userId: string, sessionPath: string): Promise<void> => {
  if (!isStorageEnabled()) {
    return;
  }

  try {
    const exists = await fs
      .access(sessionPath)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      logger.debug(`[SessionStorage] Session path ${sessionPath} does not exist locally, skipping upload for user ${userId}`);
      return;
    }

    const files = await listLocalFiles(sessionPath);
    if (files.length === 0) {
      logger.debug(`[SessionStorage] No local session files found for user ${userId}, skipping upload`);
      return;
    }

    for (const file of files) {
      const storagePath = `${userId}/${file.relativePath}`;
      const buffer = await fs.readFile(file.fullPath);
      const contentType = guessContentType(file.fullPath);

      const { error } = await supabase.storage
        .from(STORAGE_BUCKET as string)
        .upload(storagePath, buffer, {
          upsert: true,
          contentType,
          cacheControl: '3600',
        });

      if (error) {
        throw error;
      }
    }

    logger.info(`[SessionStorage] Synced ${files.length} session file(s) to Supabase for user ${userId}`);
  } catch (error) {
    logger.warn(`[SessionStorage] Failed to sync session to Supabase for user ${userId}:`, error);
  }
};

export const ensureSessionFromSupabase = async (userId: string, sessionPath: string): Promise<boolean> => {
  if (!isStorageEnabled()) {
    return false;
  }

  const credsPath = path.join(sessionPath, 'creds.json');
  if (existsSync(credsPath)) {
    return true;
  }

  try {
    const files = await listSupabaseFiles(userId);
    if (files.length === 0) {
      logger.debug(`[SessionStorage] No remote session files found for user ${userId}`);
      return false;
    }

    await ensureDirectory(sessionPath);

    for (const relativePath of files) {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET as string)
        .download(`${userId}/${relativePath}`);

      if (error) {
        throw error;
      }

      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const localPath = path.join(sessionPath, relativePath);
      await ensureDirectory(path.dirname(localPath));
      await fs.writeFile(localPath, buffer);
    }

    logger.info(`[SessionStorage] Restored session files from Supabase for user ${userId}`);
    return true;
  } catch (error) {
    logger.warn(`[SessionStorage] Failed to restore session from Supabase for user ${userId}:`, error);
    return false;
  }
};

export const removeSessionFromSupabase = async (userId: string): Promise<void> => {
  if (!isStorageEnabled()) {
    return;
  }

  try {
    const files = await listSupabaseFiles(userId);
    if (files.length === 0) {
      return;
    }

    const pathsToDelete = files.map((relativePath) => `${userId}/${relativePath}`);
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET as string)
      .remove(pathsToDelete);

    if (error) {
      throw error;
    }

    logger.info(`[SessionStorage] Removed ${files.length} session file(s) from Supabase for user ${userId}`);
  } catch (error) {
    logger.warn(`[SessionStorage] Failed to remove session from Supabase for user ${userId}:`, error);
  }
};

export const deleteLocalSessionDirectory = async (sessionPath: string): Promise<void> => {
  try {
    await fs.rm(sessionPath, { recursive: true, force: true });
    logger.info(`[SessionStorage] Deleted local session directory ${sessionPath}`);
  } catch (error) {
    logger.warn(`[SessionStorage] Failed to delete local session directory ${sessionPath}:`, error);
  }
};

