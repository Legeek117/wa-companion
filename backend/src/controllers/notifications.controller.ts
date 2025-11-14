import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as notificationsService from '../services/notifications.service';
import { logger } from '../config/logger';

export const saveFCMToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      res.status(400).json({
        success: false,
        error: { message: 'FCM token is required', statusCode: 400 },
      });
      return;
    }

    await notificationsService.saveFCMToken(userId, token);
    res.json({
      success: true,
      message: 'FCM token saved successfully',
    });
  } catch (error) {
    logger.error('[NotificationsController] Error saving FCM token:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

export const deleteFCMToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    await notificationsService.deleteFCMToken(userId);
    res.json({
      success: true,
      message: 'FCM token deleted successfully',
    });
  } catch (error) {
    logger.error('[NotificationsController] Error deleting FCM token:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

export const getNotificationSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const settings = await notificationsService.getNotificationSettings(userId);
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.error('[NotificationsController] Error getting notification settings:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

export const updateNotificationSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const { enabled, viewOnce, statusLiked, deletedMessage } = req.body;
    const settings = await notificationsService.updateNotificationSettings(userId, {
      enabled: enabled !== undefined ? enabled : true,
      viewOnce: viewOnce !== undefined ? viewOnce : true,
      statusLiked: statusLiked !== undefined ? statusLiked : true,
      deletedMessage: deletedMessage !== undefined ? deletedMessage : true,
    });

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.error('[NotificationsController] Error updating notification settings:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

