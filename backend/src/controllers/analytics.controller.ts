import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../config/logger';
import * as analyticsService from '../services/analytics.service';

/**
 * Get analytics overview
 * GET /api/analytics/overview
 */
export const getAnalyticsOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const overview = await analyticsService.getAnalyticsOverview(userId);

    res.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    logger.error('[Analytics] Error getting overview:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

/**
 * Get status analytics
 * GET /api/analytics/status
 */
export const getStatusAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const analytics = await analyticsService.getStatusAnalytics(userId);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('[Analytics] Error getting status analytics:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

/**
 * Get view once analytics
 * GET /api/analytics/view-once
 */
export const getViewOnceAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const analytics = await analyticsService.getViewOnceAnalytics(userId);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('[Analytics] Error getting view once analytics:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

/**
 * Get deleted messages analytics
 * GET /api/analytics/deleted-messages
 */
export const getDeletedMessagesAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const analytics = await analyticsService.getDeletedMessagesAnalytics(userId);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('[Analytics] Error getting deleted messages analytics:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};




