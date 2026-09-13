import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Téléchargement d'un fichier sur l'appareil.
 *
 * Sur l'APK natif (Capacitor), `link.download` n'existe pas dans la WebView :
 * on écrit donc le fichier via le plugin natif (dossier Downloads/Documents),
 * puis on ouvre le panneau de partage/système si besoin.
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
 * Sauvegarde directement dans le dossier Téléchargements (ou Documents sur iOS).
 * Retourne true si le fichier a pu être écrit côté natif.
 */
export const saveFileToDownloads = async (
  blob: Blob,
  title: string,
  mimeType?: string
): Promise<boolean> => {
  const filename = getFilename(title, mimeType);

  // Web / PWA : téléchargement classique (funciona dans le navigateur, pas dans l'APK)
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
    console.error('[Download] Filesystem write failed:', error);
    return false;
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

  try {
    const base64 = await blobToBase64(blob);
    const directory = Capacitor.getPlatform() === 'android' ? Directory.Cache : Directory.Documents;
    const path = `amda_share_${Date.now()}_${filename}`;

    await Filesystem.writeFile({ path, data: base64, directory, recursive: true });
    const uri = await Filesystem.getUri({ path, directory });
    const shareUrl = uri.uri;

    try {
      await Share.share({
        title,
        url: shareUrl,
        dialogTitle: 'Télécharger / Partager',
      });
    } catch {
      // Share annulé ou indisponible → enregistrement silencieux
      await saveFileToDownloads(blob, title, mimeType);
    }
    return true;
  } catch (error) {
    console.error('[Download] Share failed:', error);
    return saveFileToDownloads(blob, title, mimeType);
  }
};