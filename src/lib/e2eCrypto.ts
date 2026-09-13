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
export const ensureE2EKeys = async (userId: string): Promise<{ hasPublicKey: boolean }> => {
  try {
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
      logger.warn('[E2E] WebCrypto not available (non-secure context?)');
      return { hasPublicKey: false };
    }

    const cryptoObj = window.crypto.subtle;
    const privStorageKey = `${PRIVATE_KEY_STORAGE_PREFIX}${userId}`;
    const pubStorageKey = `${PUBLIC_KEY_STORAGE_PREFIX}${userId}`;

    let privateJwk = localStorage.getItem(privStorageKey);
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
    const hasPublicKey = response.success && response.data?.hasPublicKey === true;

    if (!hasPublicKey) {
      await api.e2e.registerKey(publicSpki);
      logger.info('[E2E] 🔐 Public key registered on server');
    }

    return { hasPublicKey: true };
  } catch (error) {
    logger.error('[E2E] Failed to ensure keys:', error);
    return { hasPublicKey: false };
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