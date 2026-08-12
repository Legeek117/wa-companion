/**
 * Session Storage Service
 *
 * Les sessions WhatsApp sont stockées UNIQUEMENT sur le système de fichiers local
 * (volume Docker /app/sessions). La synchronisation Supabase est supprimée.
 *
 * Les noms de fonctions sont conservés pour ne pas casser whatsapp.service.ts.
 */

import path from 'path';
import { promises as fs, existsSync } from 'fs';
import { logger } from '../config/logger';

// ─── No-ops pour la compatibilité avec whatsapp.service.ts ───────────────────

/** No-op : les sessions sont sur le disque local, pas besoin de sync cloud. */
export const syncSessionToSupabase = async (
  _userId: string,
  _sessionPath: string
): Promise<void> => {
  // Sessions stockées localement dans le volume Docker — pas de sync cloud
};

/** No-op : debounced sync cloud désactivé. */
export const debouncedSyncSessionToSupabase = (
  _userId: string,
  _sessionPath: string
): void => {
  // No-op
};

/**
 * Vérifie si les fichiers de session existent localement.
 * Retourne toujours false si le dossier est vide (pas de restauration cloud).
 */
export const ensureSessionFromSupabase = async (
  _userId: string,
  sessionPath: string
): Promise<boolean> => {
  const credsPath = path.join(sessionPath, 'creds.json');
  return existsSync(credsPath);
};

/** No-op : plus rien à supprimer dans le cloud. */
export const removeSessionFromSupabase = async (
  _userId: string
): Promise<void> => {
  // No-op
};

// ─── Utilitaires locaux (utilisés ailleurs) ──────────────────────────────────

export const deleteLocalSessionDirectory = async (sessionPath: string): Promise<void> => {
  try {
    await fs.rm(sessionPath, { recursive: true, force: true });
    logger.info(`[SessionStorage] Deleted local session directory: ${sessionPath}`);
  } catch (error) {
    logger.warn(`[SessionStorage] Failed to delete local session directory ${sessionPath}:`, error);
  }
};
