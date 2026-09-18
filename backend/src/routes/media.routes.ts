import { Router, Request, Response, NextFunction } from 'express';
import { protect, AuthRequest } from '../middleware/auth.middleware';
import { apiLimiter } from '../middleware/rateLimit.middleware';
import multer from 'multer';
import { uploadMedia, getExtensionFromMimeType } from '../services/media.service';
import { logger } from '../config/logger';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    // Allow images and videos
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  },
});

/**
 * Upload media for scheduled status
 * POST /api/media/scheduled-status
 */
router.post(
  '/scheduled-status',
  protect,
  apiLimiter,
  upload.single('media'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as AuthRequest).userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { message: 'Unauthorized', statusCode: 401 },
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: {
            message: 'No file uploaded',
            statusCode: 400,
          },
        });
        return;
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);

      try {
        // Upload media to scheduled-status directory
        const mediaUrl = await uploadMedia(
          req.file.buffer,
          `${timestamp}-${randomStr}`,
          req.file.mimetype,
          'scheduled-status',
          userId
        );

        logger.info(`[Media] Scheduled status media uploaded: ${mediaUrl} for user ${userId}`);

        res.json({
          success: true,
          data: {
            mediaUrl,
            filename: `${timestamp}-${randomStr}.${getExtensionFromMimeType(req.file.mimetype)}`,
            size: req.file.size,
            mimeType: req.file.mimetype,
          },
        });
      } catch (error: any) {
        logger.error('[Media] Error uploading scheduled status media:', {
          error,
          message: error?.message,
          userId,
        });
        res.status(500).json({
          success: false,
          error: {
            message: error?.message || 'Internal server error',
            statusCode: 500,
          },
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

export default router;