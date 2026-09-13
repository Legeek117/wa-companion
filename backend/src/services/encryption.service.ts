import crypto from 'crypto';
import { logger } from '../config/logger';

/**
 * E2E encryption for view-once media.
 *
 * Architecture:
 * - Le client (téléphone) génère une paire RSA-OAEP-256 via WebCrypto.
 * - La clé PRIVÉE reste UNIQUEMENT sur le téléphone (localStorage), jamais envoyée.
 * - La clé PUBLIQUE (SPKI base64) est enregistrée sur le serveur (users.public_key).
 * - À la capture d'un view-once, le serveur :
 *     1. génère une clé AES-256-GCM aléatoire (éphémère),
 *     2. chiffre le média avec AES-256-GCM (IV aléatoire),
 *     3. enveloppe la clé AES avec la clé publique RSA (RSA-OAEP SHA-256).
 *   → Il ne stocke QUE le ciphertext, l'IV et la clé AES enveloppée.
 * - Le serveur ne peut PAS déchiffrer : il ne possède que la clé publique.
 * - Le client déchiffre localement : RSA-OAEP (clé privée) → clé AES → AES-GCM.
 */

const AES_ALGO = 'aes-256-gcm' as const;
const AES_KEY_BYTES = 32; // AES-256
const IV_BYTES = 12; // GCM standard (96 bits) for WebCrypto/Node compatibility

export interface EncryptedMedia {
  ciphertext: Buffer;      // plaintext AES-256-GCM (ciphertext + authTag de 16 octets)
  iv: string;              // base64, 12 octets
  wrappedKey: string;      // base64, clé AES chiffrée par RSA-OAEP-256
}

/**
 * Reconstruct a PEM public key (SubjectPublicKeyInfo) from a base64 SPKI DER key
 */
const spkiToPem = (spkiBase64: string): string => {
  const der = Buffer.from(spkiBase64, 'base64');
  return `-----BEGIN PUBLIC KEY-----\n${der.toString('base64').match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;
};

/**
 * Encrypt media using hybrid encryption (AES-256-GCM + RSA-OAEP-256).
 * The private RSA key lives only on the client's device; the server can never decrypt.
 */
export const encryptMedia = (buffer: Buffer, spkiBase64: string): EncryptedMedia => {
  try {
    const pem = spkiToPem(spkiBase64);

    // 1. Random AES-256-GCM key + IV
    const aesKey = crypto.randomBytes(AES_KEY_BYTES);
    const iv = crypto.randomBytes(IV_BYTES);

    // 2. Encrypt media with AES-256-GCM
    const cipher = crypto.createCipheriv(AES_ALGO, aesKey, iv);
    const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag(); // 16 octets
    const fullCiphertext = Buffer.concat([ciphertext, authTag]);

    // 3. Wrap the AES key with the user's RSA-OAEP-256 public key
    const wrappedKey = crypto.publicEncrypt(
      {
        key: pem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      aesKey
    );

    return {
      ciphertext: fullCiphertext,
      iv: iv.toString('base64'),
      wrappedKey: wrappedKey.toString('base64'),
    };
  } catch (error) {
    logger.error('[Encryption] Error encrypting media:', error);
    throw new Error(`Failed to encrypt media: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Validate a SPKI base64 public key (RSA). Used before persisting user keys.
 */
export const isValidPublicKey = (spkiBase64: string): boolean => {
  try {
    if (typeof spkiBase64 !== 'string' || spkiBase64.trim() === '') {
      return false;
    }
    const pem = spkiToPem(spkiBase64.trim());
    const keyObject = crypto.createPublicKey(pem);
    const type = keyObject.asymmetricKeyType;
    return type === 'rsa' || type === 'rsa-pss';
  } catch {
    return false;
  }
};