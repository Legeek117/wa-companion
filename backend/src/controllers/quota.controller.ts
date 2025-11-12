import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { getUserQuota } from '../services/quota.service';
import { logger } from '../config/logger';

/**
 * Get user quota information
 * GET /api/quota
 */
export const getUserQuotaController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const quota = await getUserQuota(userId);

    res.json({
      success: true,
      data: quota,
    });
  } catch (error: any) {
    logger.error('[Quota] Error getting quota:', {
      error,
      message: error?.message,
      stack: error?.stack,
      userId: req.userId,
    });
    res.status(500).json({
      success: false,
      error: { 
        message: error?.message || 'Internal server error', 
        statusCode: 500 
      },
    });
  }
};

















