import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';
import { logger } from '../config/logger';
import { isValidPublicKey } from '../services/encryption.service';

/**
 * Register or update the user's E2E RSA public key (SPKI base64).
 * PUT /api/e2e/key
 * Body: { publicKey: string }
 */
export const registerPublicKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const { publicKey } = req.body;

    if (!publicKey || typeof publicKey !== 'string' || publicKey.trim() === '') {
      res.status(400).json({
        success: false,
        error: { message: 'publicKey is required (SPKI base64 string)', statusCode: 400 },
      });
      return;
    }

    const trimmedKey = publicKey.trim();

    if (!isValidPublicKey(trimmedKey)) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid RSA public key (SPKI base64 expected)', statusCode: 400 },
      });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { publicKey: trimmedKey },
    });

    logger.info(`[E2E] 🔐 Public key registered/updated for user ${userId}`);

    res.json({
      success: true,
      data: { message: 'Public key saved' },
    });
  } catch (error) {
    logger.error('[E2E] Error registering public key:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

/**
 * Check if the user has a registered public key.
 * GET /api/e2e/key
 */
export const getPublicKeyStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { publicKey: true },
    });

    res.json({
      success: true,
      data: {
        hasPublicKey: !!user?.publicKey,
        // Renvoyée pour permettre au client de détecter un mismatch
        // (clé privée régénérée après purge du localStorage) et de la ré-enregistrer.
        publicKey: user?.publicKey || null,
      },
    });
  } catch (error) {
    logger.error('[E2E] Error checking public key status:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

/**
 * Save an encrypted backup of the device private key, protected by a user passphrase.
 * The server stores the ciphertext, salt and IV — but never the passphrase nor the plaintext key.
 * PUT /api/e2e/key-backup
 * Body: { encryptedKey: string, salt: string, iv: string }
 */
export const saveKeyBackup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const { encryptedKey, salt, iv } = req.body;

    if (
      !encryptedKey || typeof encryptedKey !== 'string' ||
      !salt || typeof salt !== 'string' ||
      !iv || typeof iv !== 'string'
    ) {
      res.status(400).json({
        success: false,
        error: { message: 'encryptedKey, salt and iv (base64 strings) are required', statusCode: 400 },
      });
      return;
    }

    // Basic sanity check on base64 content
    const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
    if (!base64Regex.test(encryptedKey.trim()) || !base64Regex.test(salt.trim()) || !base64Regex.test(iv.trim())) {
      res.status(400).json({
        success: false,
        error: { message: 'encryptedKey, salt and iv must be base64 strings', statusCode: 400 },
      });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        e2eKeyEncrypted: encryptedKey.trim(),
        e2eKeySalt: salt.trim(),
        e2eKeyIv: iv.trim(),
      },
    });

    logger.info(`[E2E] 🔐 Private key backup saved for user ${userId}`);

    res.json({
      success: true,
      data: { message: 'Private key backup saved' },
    });
  } catch (error) {
    logger.error('[E2E] Error saving key backup:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

/**
 * Get the encrypted private key backup (ciphertext + salt + IV).
 * GET /api/e2e/key-backup
 */
export const getKeyBackup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { e2eKeyEncrypted: true, e2eKeySalt: true, e2eKeyIv: true },
    });

    const hasBackup = !!(user?.e2eKeyEncrypted && user?.e2eKeySalt && user?.e2eKeyIv);

    res.json({
      success: true,
      data: {
        hasBackup,
        encryptedKey: hasBackup ? user?.e2eKeyEncrypted : null,
        salt: hasBackup ? user?.e2eKeySalt : null,
        iv: hasBackup ? user?.e2eKeyIv : null,
      },
    });
  } catch (error) {
    logger.error('[E2E] Error getting key backup:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

/**
 * Delete the encrypted private key backup.
 * DELETE /api/e2e/key-backup
 */
export const deleteKeyBackup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        e2eKeyEncrypted: null,
        e2eKeySalt: null,
        e2eKeyIv: null,
      },
    });

    logger.info(`[E2E] 🗑️ Private key backup deleted for user ${userId}`);

    res.json({
      success: true,
      data: { message: 'Private key backup deleted' },
    });
  } catch (error) {
    logger.error('[E2E] Error deleting key backup:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

/**
 * Stream encrypted view-once media with decryption metadata.
 * GET /api/view-once/:id/media
 *
 * Retourne le fichier binaire (application/octet-stream) avec les headers :
 * - X-E2E-IV : IV (base64) pour AES-GCM
 * - X-E2E-WRAPPED-KEY : clé AES enveloppée (base64) avec RSA-OAEP
 * - X-E2E-MEDIA-TYPE : type MIME original (image/jpeg, video/mp4...)
 *
 * Le client déchiffre avec WebCrypto (RSA-OAEP → AES-GCM) côté téléphone.
 */
export const downloadEncryptedMedia = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const captureId = req.params.id;

    const capture = await prisma.viewOnceCapture.findFirst({
      where: { id: captureId, userId },
    });

    if (!capture) {
      res.status(404).json({
        success: false,
        error: { message: 'View once capture not found', statusCode: 404 },
      });
      return;
    }

    if (!capture.encrypted || !capture.mediaIv || !capture.wrappedKey) {
      res.status(400).json({
        success: false,
        error: { message: 'Capture not encrypted or metadata missing', statusCode: 400 },
      });
      return;
    }

    // Lire le fichier chiffré sur disque (stocké via storageService.upload dans le dossier 'view-once')
    const fs = await import('fs');
    const { storageService } = await import('../services/storage.service');

    // mediaUrl = '/uploads/view-once/filename.enc' → extraire la clé relative
    const relativePath = capture.mediaUrl.replace(/^\/uploads\//, '');
    const localPath = storageService.getLocalPath(relativePath);

    if (!fs.existsSync(localPath)) {
      logger.error(`[ViewOnce] ❌ Encrypted media file not found: ${localPath}`);
      res.status(404).json({
        success: false,
        error: { message: 'Encrypted media file not found', statusCode: 404 },
      });
      return;
    }

    // Déterminer le Content-Type basé sur mediaType
    const contentTypes: Record<string, string> = {
      image: 'image/jpeg',
      video: 'video/mp4',
      audio: 'audio/ogg',
    };
    const contentType = contentTypes[capture.mediaType] || 'application/octet-stream';

    // Setter les headers E2E pour que le client puisse déchiffrer
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fs.statSync(localPath).size);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-E2E-IV', capture.mediaIv);
    res.setHeader('X-E2E-WRAPPED-KEY', capture.wrappedKey);
    res.setHeader('X-E2E-MEDIA-TYPE', contentType);
    res.setHeader('Access-Control-Expose-Headers', 'X-E2E-IV, X-E2E-WRAPPED-KEY, X-E2E-MEDIA-TYPE');

    // Stream le fichier
    const fileStream = fs.createReadStream(localPath);
    fileStream.pipe(res);
  } catch (error) {
    logger.error('[ViewOnce] Error downloading encrypted media:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};
