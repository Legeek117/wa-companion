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

    res.json({
      success: true,
      data: captures,
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

    res.json({
      success: true,
      data: capture,
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
        mediaUrl: capture.media_url,
        mediaType: capture.media_type,
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

















