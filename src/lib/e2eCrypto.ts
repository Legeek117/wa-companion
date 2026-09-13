import { api } from '@/lib/api';
import logger from '@/lib/logger';

/**
 * E2E decryption for view-once media.
 *
 * The private RSA-OAEP-256 key is generated ON THE DEVICE (WebCrypto) and stored
 * ONLY in localStorage. It is NEVER sent to the server. The server only stores the
 * public key (SPKI base64) used to encrypt / wrap content it cannot decrypt.
 *
 * Decryption flow (all client-side):
 *  1. unwrap the AES key:      RSA-OAEP decrypt(wrappedKey) with the private key
 *  2. decrypt the media:        AES-256-GCM decrypt(ciphertext, iv)
 *
 * WebCrypto expects the ciphertext as (ciphertext || authTag) 16 bytes — this exactly
 * matches the format produced by the backend's AES-256-GCM.
 */

const PRIVATE_KEY_STORAGE_PREFIX = 'amda_e2e_private_key_';
const PUBLIC_KEY_STORAGE_PREFIX = 'amda_e2e_public_key_';

const RSA_ALGO = {
  name: 'RSA-OAEP',
  hash: 'SHA-256',
} as const;

/**
 * Passphrase-protected backup of the private key.
 * The private RSA key is encrypted on-device with AES-256-GCM using a key derived
 * from the user's secret phrase (PBKDF2-SHA256). The ciphertext + salt + IV are
 * stored on the server — the server never sees the passphrase nor the plaintext key.
 * Restoring after a reinstall: user enters the phrase → key is recovered locally.
 */
const BACKUP_PBKDF2_ITERATIONS = 210000;

export interface E2EKeyInitResult {
  hasPublicKey: boolean;
  needsRestore?: boolean;
  hasBackup?: boolean;
}

export interface DecryptedMedia {
  blob: Blob;
  objectUrl: string;
  mimeType: string;
}

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Generate or load the device keypair, register the public key on the server.
 * Must be called once per user (e.g. on login / app boot / view-once page).
 */
export const ensureE2EKeys = async (userId: string): Promise<E2EKeyInitResult> => {
  try {
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
      logger.warn('[E2E] WebCrypto not available (non-secure context?)');
      return { hasPublicKey: false };
    }

    const cryptoObj = window.crypto.subtle;
    const privStorageKey = `${PRIVATE_KEY_STORAGE_PREFIX}${userId}`;
    const pubStorageKey = `${PUBLIC_KEY_STORAGE_PREFIX}${userId}`;

    let privateJwk = localStorage.getItem(privStorageKey);

    // Si aucune clé privée locale : vérifier si une sauvegarde chiffrée existe sur le serveur.
    // Si oui, on NE génère PAS une nouvelle clé (qui rendrait les anciennes captures illisibles) :
    // on signale à l'UI de demander la phrase secrète pour restaurer la clé d'origine.
    if (!privateJwk) {
      const backupResponse = await api.e2e.getKeyBackup();
      if (backupResponse.success === true && backupResponse.data?.hasBackup === true) {
        logger.info('[E2E] 🔑 Backup de clé détecté — restauration requise');
        return { hasPublicKey: false, needsRestore: true, hasBackup: true };
      }
    }

    let privateKey: CryptoKey;

    if (privateJwk) {
      privateKey = await cryptoObj.importKey(
        'jwk',
        JSON.parse(privateJwk),
        RSA_ALGO,
        true,
        ['decrypt']
      );
    } else {
      // Generate a new RSA-OAEP-256 keypair on this device
      const keyPair = await cryptoObj.generateKey(
        {
          ...RSA_ALGO,
          modulusLength: 2048,
          publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        },
        true, // extractable is required to persist the private key on this device
        ['encrypt', 'decrypt']
      );

      privateKey = keyPair.privateKey;

      // Persist the private key on this device only (never on the server)
      const exportedPrivate = await cryptoObj.exportKey('jwk', keyPair.privateKey);
      localStorage.setItem(privStorageKey, JSON.stringify(exportedPrivate));

      // Persist the public key for reuse
      const exportedPublic = await cryptoObj.exportKey('spki', keyPair.publicKey);
      localStorage.setItem(pubStorageKey, arrayBufferToBase64(exportedPublic));

      privateJwk = JSON.stringify(exportedPrivate);
    }

    // Ensure the public key is registered on the server
    let publicSpki = localStorage.getItem(pubStorageKey);
    if (!publicSpki) {
      const publicKey = await cryptoObj.exportKey('spki', privateKey);
      publicSpki = arrayBufferToBase64(publicKey);
      localStorage.setItem(pubStorageKey, publicSpki);
    }

    const response = await api.e2e.keyStatus();
    const serverPublicKey = response.success ? response.data?.publicKey : null;
    const hasPublicKey = response.success === true && response.data?.hasPublicKey === true;

    // Ré-enregistrer si la clé publique serveur ne correspond pas à celle stockée localement
    // (ceci couvre le cas où la clé privée a été régénérée après purge du localStorage).
    if (!hasPublicKey || !serverPublicKey || serverPublicKey !== publicSpki) {
      await api.e2e.registerKey(publicSpki);
      logger.info('[E2E] 🔐 Public key registered/updated on server');
    }

    return { hasPublicKey: true };
  } catch (error) {
    logger.error('[E2E] Failed to ensure keys:', error);
    return { hasPublicKey: false };
  }
};

/**
 * Dérive une clé AES-256-GCM de la phrase secrète via PBKDF2-SHA256.
 */
const deriveAesKeyFromPassphrase = async (passphrase: string, saltBase64: string): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const salt = base64ToArrayBuffer(saltBase64);
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: BACKUP_PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

/**
 * Sauvegarde la clé privée de l'appareil sur le serveur, chiffrée avec la phrase secrète.
 * Permet de la restaurer après une réinstallation (ou sur un autre téléphone).
 */
export const backupPrivateKeyWithPassphrase = async (
  userId: string,
  passphrase: string
): Promise<boolean> => {
  try {
    if (!passphrase || passphrase.trim().length < 6) {
      throw new Error('La phrase secrète doit contenir au moins 6 caractères');
    }

    const privStorageKey = `${PRIVATE_KEY_STORAGE_PREFIX}${userId}`;
    const privateJwk = localStorage.getItem(privStorageKey);

    if (!privateJwk) {
      throw new Error('Aucune clé privée sur cet appareil à sauvegarder');
    }

    const cryptoObj = window.crypto.subtle;

    // 1. Salt + IV aléatoires
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // 2. Dériver la clé AES depuis la phrase
    const aesKey = await deriveAesKeyFromPassphrase(passphrase, arrayBufferToBase64(salt.buffer as ArrayBuffer));

    // 3. Chiffrer le JWK privé (l'appareil seul peut le faire — pas le serveur)
    const enc = new TextEncoder();
    const ciphertext = await cryptoObj.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      enc.encode(privateJwk)
    );

    const encryptedKeyB64 = arrayBufferToBase64(ciphertext as ArrayBuffer);
    const saltB64 = arrayBufferToBase64(salt.buffer as ArrayBuffer);
    const ivB64 = arrayBufferToBase64(iv.buffer as ArrayBuffer);

    const response = await api.e2e.saveKeyBackup({
      encryptedKey: encryptedKeyB64,
      salt: saltB64,
      iv: ivB64,
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Échec de la sauvegarde');
    }

    logger.info('[E2E] 🔐 Private key backup saved with passphrase');
    return true;
  } catch (error: any) {
    logger.error('[E2E] Failed to save key backup:', error);
    throw new Error(error?.message || 'Échec de la sauvegarde de la clé');
  }
};

/**
 * Restaure la clé privée depuis la sauvegarde serveur en utilisant la phrase secrète.
 * Une fois restaurée, la clé est persistée localement et utilisable immédiatement.
 */
export const restorePrivateKeyFromPassphrase = async (
  userId: string,
  passphrase: string
): Promise<boolean> => {
  try {
    const response = await api.e2e.getKeyBackup();

    if (!response.success || response.data?.hasBackup !== true) {
      throw new Error('Aucune sauvegarde de clé trouvée sur le serveur');
    }

    const { encryptedKey, salt, iv } = response.data;

    if (!encryptedKey || !salt || !iv) {
      throw new Error('Sauvegarde de clé incomplète');
    }

    // 1. Dériver la clé AES depuis la phrase saisie
    const aesKey = await deriveAesKeyFromPassphrase(passphrase, salt);

    // 2. Déchiffrer le JWK privé
    let decrypted: ArrayBuffer;
    try {
      decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: base64ToArrayBuffer(iv) },
        aesKey,
        base64ToArrayBuffer(encryptedKey)
      );
    } catch {
      throw new Error('Phrase secrète incorrecte');
    }

    const dec = new TextDecoder();
    const privateJwk = dec.decode(decrypted);

    // 3. Valider + importer la clé privée
    const parsed = JSON.parse(privateJwk);
    await window.crypto.subtle.importKey('jwk', parsed, RSA_ALGO, true, ['decrypt']);

    // 4. Persister sur cet appareil
    const privStorageKey = `${PRIVATE_KEY_STORAGE_PREFIX}${userId}`;
    const pubStorageKey = `${PUBLIC_KEY_STORAGE_PREFIX}${userId}`;
    localStorage.setItem(privStorageKey, privateJwk);

    // 5. Récupérer la clé publique correspondante (SPKI) pour la persister
    try {
      const importedPrivate = await window.crypto.subtle.importKey('jwk', parsed, RSA_ALGO, true, ['decrypt']);
      const publicSpki = await window.crypto.subtle.exportKey('spki', importedPrivate);
      localStorage.setItem(pubStorageKey, arrayBufferToBase64(publicSpki));
    } catch {
      /* la clé publique sera ré-exportée par ensureE2EKeys */
    }

    logger.info('[E2E] 🔓 Private key restored from backup');
    return true;
  } catch (error: any) {
    logger.error('[E2E] Failed to restore key from backup:', error);
    throw new Error(error?.message || 'Échec de la restauration de la clé');
  }
};

/**
 * Supprime la sauvegarde chiffrée de la clé sur le serveur.
 */
export const deletePrivateKeyBackup = async (): Promise<boolean> => {
  try {
    const response = await api.e2e.deleteKeyBackup();
    if (!response.success) {
      throw new Error(response.error?.message || 'Échec de la suppression');
    }
    logger.info('[E2E] 🗑️ Private key backup deleted');
    return true;
  } catch (error: any) {
    logger.error('[E2E] Failed to delete key backup:', error);
    throw new Error(error?.message || 'Échec de la suppression de la sauvegarde');
  }
};

/**
 * Decrypt an encrypted view-once media buffer using the device's private key.
 */
export const decryptViewOnceMedia = async (
  userId: string,
  encryptedBuffer: ArrayBuffer,
  ivBase64: string,
  wrappedKeyBase64: string,
  mimeType: string
): Promise<DecryptedMedia> => {
  const privStorageKey = `${PRIVATE_KEY_STORAGE_PREFIX}${userId}`;
  const privateJwk = localStorage.getItem(privStorageKey);

  if (!privateJwk) {
    throw new Error('Clé privée absente du téléphone (réinstallez l' + 'app et recapturez)');
  }

  const cryptoObj = window.crypto.subtle;

  try {
    // 1. Import the private RSA key stored on the device
    const privateKey = await cryptoObj.importKey('jwk', JSON.parse(privateJwk), RSA_ALGO, true, [
      'decrypt',
    ]);

    // 2. Unwrap the AES-256-GCM key via RSA-OAEP
    //    NB: on décrypte le wrappedKey directement (subtle.decrypt) puis on importe la clé AES
    //    en 'raw' — plutôt que subtle.unwrapKey — car la clé privée ne possède que l'usage
    //    'decrypt' (unwrapKey nécessiterait l'usage 'unwrapKey').
    const wrappedKey = base64ToArrayBuffer(wrappedKeyBase64);
    const aesKeyMaterial = await cryptoObj.decrypt(RSA_ALGO, privateKey, wrappedKey);
    const aesKey = await cryptoObj.importKey(
      'raw',
      aesKeyMaterial,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // 3. Decrypt the media with AES-256-GCM
    const iv = base64ToArrayBuffer(ivBase64);
    const plaintext = await cryptoObj.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      encryptedBuffer
    );

    const blob = new Blob([plaintext], { type: mimeType });
    const objectUrl = URL.createObjectURL(blob);

    return { blob, objectUrl, mimeType };
  } catch (error: any) {
    // Log l'erreur réelle (nom + message) pour diagnostic
    const detail =
      typeof error === 'object' && error !== null
        ? `${error?.name || 'Error'}: ${error?.message || '(sans message)'}`
        : String(error);
    logger.error('[E2E] decryptViewOnceMedia failed', { detail, userId });
    throw new Error(detail);
  }
};

/**
 * Download + decrypt an encrypted view-once capture.
 * Returns null if the device has no private key.
 */
export const fetchAndDecryptViewOnce = async (
  userId: string,
  captureId: string,
  mediaType: 'image' | 'video' | string
): Promise<DecryptedMedia | null> => {
  const result = await api.viewOnce.mediaArrayBuffer(captureId);

  if (result.error || !result.data) {
    throw new Error(result.error?.message || 'Media not available');
  }

  const headers = result.headers;
  const iv = headers.get('X-E2E-IV');
  const wrappedKey = headers.get('X-E2E-WRAPPED-KEY');
  const mimeFromHeader = headers.get('X-E2E-MEDIA-TYPE');

  if (!iv || !wrappedKey) {
    throw new Error('Métadonnées de déchiffrement manquantes');
  }

  const mimeType =
    mimeFromHeader ||
    (mediaType === 'video' ? 'video/mp4' : mediaType === 'audio' ? 'audio/ogg' : 'image/jpeg');

  return decryptViewOnceMedia(userId, result.data, iv, wrappedKey, mimeType);
};