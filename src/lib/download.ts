import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import logger from '@/lib/logger';

/**
 * Téléchargement d'un fichier sur l'appareil.
 *
 * Sur l'APK natif (Capacitor), `link.download` n'existe pas dans la WebView.
 * Stratégie Android :
 *  1. Demander la permission de stockage (WRITE_EXTERNAL_STORAGE) au runtime —
 *     indispensable sur Android 10 et moins où elle n'est jamais accordée d'office.
 *  2. Écrire directement dans Téléchargements (fonctionne sur Android ≤ 10 ;
 *     parfois encore sur 11+ selon le device).
 *  3. En échec, ouvrir la feuille de partage Android (Cache + Share) — fonctionne
 *     sur TOUTES les versions, sans permission particulière.
 * Sur iOS : écriture dans Documents (dossier privé, toujours accessible).
 * Sur le web / PWA : téléchargement navigateur classique.
 */

export type DownloadMethod = 'browser' | 'downloads' | 'documents' | 'shared';

export type SaveResult =
  | { ok: true; method: DownloadMethod }
  | { ok: false; error: string; reason: 'empty' | 'permission' | 'write' | 'share' };

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const getFilename = (title: string, mimeType?: string): string => {
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/3gpp': '3gp',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
  };
  const ext = (mimeType && extMap[mimeType.toLowerCase()]) || 'bin';
  const baseName = title.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 60) || 'fichier';
  return `${baseName}.${ext}`;
};

const triggerBrowserDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
};

/**
 * Demande la permission de stockage publique sur Android si elle manque.
 * Sur Android 11+ la demande est ignorée (scoped storage), c'est normal.
 */
const ensurePublicStoragePermission = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return true;
  try {
    const status = await Filesystem.checkPermissions();
    if (status.publicStorage === 'granted') return true;
    const result = await Filesystem.requestPermissions();
    return result.publicStorage === 'granted';
  } catch (error) {
    logger.warn('[Download] Storage permission request failed:', error);
    return false;
  }
};

/**
 * Écrit le fichier dans le cache puis ouvre la feuille de partage Android/iOS.
 * Ne nécessite aucune permission (dossier Cache = privé à l'app).
 * Retourne true dès que la feuille de partage s'est ouverte.
 */
const shareViaSystem = async (blob: Blob, filename: string, mimeType?: string): Promise<boolean> => {
  try {
    const base64 = await blobToBase64(blob);
    const directory = Capacitor.getPlatform() === 'android' ? Directory.Cache : Directory.Documents;
    const path = `amda_share_${Date.now()}_${filename}`;

    await Filesystem.writeFile({ path, data: base64, directory, recursive: true });
    const uri = (await Filesystem.getUri({ path, directory })).uri;

    await Share.share({
      title: filename,
      text: filename,
      url: uri,
      dialogTitle: 'Enregistrer / Partager',
    });
    return true;
  } catch (error) {
    logger.error('[Download] Share sheet failed:', error);
    return false;
  }
};

/**
 * Sauvegarde directement dans le dossier Téléchargements (Android).
 * Peut échouer sur Android 11+ (scoped storage) — le fallback partage s'en charge.
 */
const writeToDownloads = async (
  blob: Blob,
  filename: string
): Promise<boolean> => {
  try {
    const base64 = await blobToBase64(blob);
    await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Downloads,
      recursive: true,
    });
    logger.info(`[Download] Written to Downloads: ${filename}`);
    return true;
  } catch (error) {
    logger.warn(`[Download] Direct Downloads write failed (${filename}):`, error);
    return false;
  }
};

/**
 * Télécharge et enregistre le fichier sur l'appareil.
 * Retourne un objet SaveResult détaillé pour affichage précis côté UI.
 */
export const saveFileToDownloads = async (
  blob: Blob,
  title: string,
  mimeType?: string
): Promise<SaveResult> => {
  const filename = getFilename(title, mimeType);

  if (!blob || blob.size === 0) {
    return { ok: false, error: 'Fichier vide', reason: 'empty' };
  }

  // Web / PWA : téléchargement navigateur classique
  if (!Capacitor.isNativePlatform()) {
    triggerBrowserDownload(blob, filename);
    return { ok: true, method: 'browser' };
  }

  const platform = Capacitor.getPlatform();

  // iOS : Documents est toujours accessible
  if (platform !== 'android') {
    try {
      const base64 = await blobToBase64(blob);
      await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });
      return { ok: true, method: 'documents' };
    } catch (error) {
      logger.error('[Download] iOS Documents write failed:', error);
      const shared = await shareViaSystem(blob, filename, mimeType);
      return shared ? { ok: true, method: 'shared' } : { ok: false, error: 'Écriture et partage échoués', reason: 'write' };
    }
  }

  // ANDROID
  try {
    const canWrite = await ensurePublicStoragePermission();
    if (canWrite) {
      const written = await writeToDownloads(blob, filename);
      if (written) return { ok: true, method: 'downloads' };
    }
  } catch (error) {
    logger.warn('[Download] Android permission/write step failed:', error);
  }

  // Fallback : feuille de partage système (fiable sur toutes les versions Android)
  const shared = await shareViaSystem(blob, filename, mimeType);
  if (shared) return { ok: true, method: 'shared' };

  return { ok: false, error: "Impossible d'écrire ou de partager le fichier", reason: 'share' };
};

/**
 * Ouvrir directement la feuille de partage Android (permet de choisir l'application
 * de destination). Fallback : enregistrement silencieux dans Downloads.
 */
export const downloadAndShare = async (
  blob: Blob,
  title: string,
  mimeType?: string
): Promise<SaveResult> => {
  if (!Capacitor.isNativePlatform()) {
    return saveFileToDownloads(blob, title, mimeType);
  }

  const shared = await shareViaSystem(blob, getFilename(title, mimeType), mimeType);
  if (shared) return { ok: true, method: 'shared' };
  return saveFileToDownloads(blob, title, mimeType);
};