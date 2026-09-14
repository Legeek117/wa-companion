import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import logger from '@/lib/logger';

/**
 * Téléchargement d'un fichier sur l'appareil.
 *
 * Sur l'APK natif (Capacitor), `link.download` n'existe pas dans la WebView :
 * on écrit donc le fichier via le plugin natif (dossier Downloads/Documents),
 * avec un fallback robuste : si l'écriture directe échoue (permission, stockage
 * externe indisponible...), on bascule sur la feuille de partage Android qui
 * permet de sauvegarder le fichier dans Files / Galerie / autre app.
 * Sur le web / PWA, on retombe sur le téléchargement navigateur classique.
 */

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
 * Écrit le fichier dans le cache puis ouvre la feuille de partage Android/iOS.
 * Ne nécessite aucune permission particulière (dossier Cache = privé à l'app).
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
      dialogTitle: 'Télécharger / Partager',
    });
    return true;
  } catch (error) {
    logger.error('[Download] Share fallback failed:', error);
    return false;
  }
};

/**
 * Sauvegarde directement dans le dossier Téléchargements (ou Documents sur iOS).
 * Retourne true si le fichier a pu être écrit côté natif ou partagé.
 */
export const saveFileToDownloads = async (
  blob: Blob,
  title: string,
  mimeType?: string
): Promise<boolean> => {
  const filename = getFilename(title, mimeType);

  // Web / PWA : téléchargement classique (fonctionne dans le navigateur, pas dans l'APK)
  if (!Capacitor.isNativePlatform()) {
    triggerBrowserDownload(blob, filename);
    return true;
  }

  try {
    const base64 = await blobToBase64(blob);
    const platform = Capacitor.getPlatform();

    if (platform === 'android') {
      await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Downloads,
        recursive: true,
      });
      return true;
    }

    // iOS : le dossier Downloads n'est pas accessible directement → on écrit dans Documents
    await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    });
    return true;
  } catch (error) {
    logger.error('[Download] Filesystem write failed — fallback partage:', error);
    // Fallback : feuille de partage Android (permet de sauvegarder dans Files/Galerie)
    return shareViaSystem(blob, filename, mimeType);
  }
};

/**
 * Télécharge et si possible ouvre le partage Android (permet de choisir l'app
 * de destination). Fallback : enregistrement silencieux dans Downloads.
 */
export const downloadAndShare = async (
  blob: Blob,
  title: string,
  mimeType?: string
): Promise<boolean> => {
  const filename = getFilename(title, mimeType);

  if (!Capacitor.isNativePlatform()) {
    triggerBrowserDownload(blob, filename);
    return true;
  }

  const shared = await shareViaSystem(blob, filename, mimeType);
  if (shared) {
    return true;
  }
  return saveFileToDownloads(blob, title, mimeType);
};