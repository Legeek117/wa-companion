import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as viewOnceService from '../services/viewOnce.service';
import { logger } from '../config/logger';

/**
 * Get all view once captures for the authenticated user
 * GET /api/view-once
 */
export const listViewOnceCaptures = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const captures = await viewOnceService.getViewOnceCaptures(userId, limit);

    // Ne pas exposer mediaIv/wrappedKey ici (délivrés via /:id/media pour le déchiffrement)
    // mediaUrl exposé uniquement pour les captures non-chiffrées (affichage direct)
    const sanitized = captures.map((c) => ({
      id: c.id,
      senderId: c.senderId,
      senderName: c.senderName,
      // Compatibilité FRONTEND : la page attend du snake_case (voir useViewOnce.ts)
      sender_id: c.senderId,
      sender_name: c.senderName,
      media_type: c.mediaType,
      media_url: c.encrypted ? undefined : c.mediaUrl,
      captured_at: c.capturedAt,
      created_at: c.createdAt,
      file_size: c.fileSize,
      encrypted: c.encrypted,
    }));

    res.json({
      success: true,
      data: sanitized,
    });
  } catch (error) {
    logger.error('[ViewOnce] Error getting captures:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

/**
 * Get a specific view once capture by ID
 * GET /api/view-once/:id
 */
export const getViewOnceCaptureById = async (req: AuthRequest, res: Response): Promise<void> => {
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
    const capture = await viewOnceService.getViewOnceCapture(userId, captureId);

    // Vue unique chiffrée E2E : renvoyer les métadonnées de déchiffrement
    // Le client récupère les octets via GET /api/view-once/:id/media
    // Format snake_case (compatible frontend, voir useViewOnce.ts)
    res.json({
      success: true,
      data: {
        id: capture.id,
        sender_id: capture.senderId,
        sender_name: capture.senderName,
        media_type: capture.mediaType,
        captured_at: capture.capturedAt,
        created_at: capture.createdAt,
        file_size: capture.fileSize,
        encrypted: capture.encrypted,
        media_url: capture.encrypted ? undefined : capture.mediaUrl,
      },
    });
  } catch (error) {
    logger.error('[ViewOnce] Error getting capture:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

/**
 * Download a view once capture
 * GET /api/view-once/:id/download
 */
export const downloadViewOnceCapture = async (req: AuthRequest, res: Response): Promise<void> => {
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
    const capture = await viewOnceService.getViewOnceCapture(userId, captureId);

    // TODO: Implement actual download from Cloudinary/S3
    // For now, return the media URL
    res.json({
      success: true,
      data: {
        mediaUrl: capture.mediaUrl,
        mediaType: capture.mediaType,
      },
    });
  } catch (error) {
    logger.error('[ViewOnce] Error downloading capture:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

/**
 * Get view once statistics
 * GET /api/view-once/stats
 */
export const getViewOnceStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const stats = await viewOnceService.getViewOnceStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('[ViewOnce] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

/**
 * Delete a view once capture
 * DELETE /api/view-once/:id
 */
export const deleteViewOnceCapture = async (req: AuthRequest, res: Response): Promise<void> => {
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
    await viewOnceService.deleteViewOnceCapture(userId, captureId);

    res.json({
      success: true,
      message: 'View once capture deleted successfully',
    });
  } catch (error: any) {
    logger.error('[ViewOnce] Error deleting capture:', error);
    if (error.message?.includes('not found')) {
      res.status(404).json({
        success: false,
        error: { message: 'View once capture not found', statusCode: 404 },
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};



















