import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../config/logger';
import { QuotaExceededError } from '../utils/errors';
import * as scheduledStatusService from '../services/scheduledStatus.service';
import * as quotaService from '../services/quota.service';

/**
 * Get all scheduled statuses for the authenticated user
 * GET /api/scheduled-status
 */
export const getScheduledStatuses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const statuses = await scheduledStatusService.getScheduledStatuses(userId);

    res.json({
      success: true,
      data: statuses,
    });
  } catch (error: any) {
    logger.error('[ScheduledStatus] Error getting scheduled statuses:', {
      error,
      message: error?.message,
      userId: req.userId,
    });
    res.status(500).json({
      success: false,
      error: {
        message: error?.message || 'Internal server error',
        statusCode: 500,
      },
    });
  }
};

/**
 * Create a new scheduled status
 * POST /api/scheduled-status
 */
export const createScheduledStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const { mediaUrl, mediaType, caption, scheduledAt } = req.body;

    // Validate input
    if (!scheduledAt) {
      res.status(400).json({
        success: false,
        error: {
          message: 'scheduledAt is required',
          statusCode: 400,
        },
      });
      return;
    }

    if (!mediaUrl || !mediaType) {
      res.status(400).json({
        success: false,
        error: {
          message: 'mediaUrl and mediaType are required',
          statusCode: 400,
        },
      });
      return;
    }

    // Check if scheduled date is in the future
    const scheduledDate = new Date(scheduledAt);
    const now = new Date();
    if (scheduledDate <= now) {
      res.status(400).json({
        success: false,
        error: {
          message: 'scheduledAt must be in the future',
          statusCode: 400,
        },
      });
      return;
    }

    // Check quota
    try {
      await quotaService.checkScheduledStatusQuota(userId);
    } catch (quotaError: any) {
      if (quotaError instanceof QuotaExceededError) {
        res.status(403).json({
          success: false,
          error: {
            message: quotaError.message || 'Quota exceeded. Upgrade to Premium for unlimited scheduled statuses.',
            statusCode: 403,
          },
        });
        return;
      }
      throw quotaError;
    }

    // Create scheduled status
    const status = await scheduledStatusService.createScheduledStatus(
      userId,
      mediaUrl,
      mediaType,
      scheduledAt,
      caption
    );

    // Increment quota after successful creation
    try {
      await quotaService.incrementScheduledStatus(userId);
    } catch (quotaError) {
      logger.warn('[ScheduledStatus] Failed to increment quota, but status was created:', quotaError);
      // Don't fail the request if quota increment fails
    }

    res.status(201).json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    logger.error('[ScheduledStatus] Error creating scheduled status:', {
      error,
      message: error?.message,
      userId: req.userId,
    });
    res.status(500).json({
      success: false,
      error: {
        message: error?.message || 'Internal server error',
        statusCode: 500,
      },
    });
  }
};

/**
 * Update a scheduled status
 * PUT /api/scheduled-status/:id
 */
export const updateScheduledStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const { mediaUrl, mediaType, caption, scheduledAt } = req.body;

    // Check if status exists and belongs to user
    const existingStatus = await scheduledStatusService.getScheduledStatusById(userId, id);
    if (!existingStatus) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Scheduled status not found',
          statusCode: 404,
        },
      });
      return;
    }

    // Can only update pending statuses
    if (existingStatus.status !== 'pending') {
      res.status(400).json({
        success: false,
        error: {
          message: 'Can only update pending statuses',
          statusCode: 400,
        },
      });
      return;
    }

    // If scheduledAt is provided, validate it
    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      const now = new Date();
      if (scheduledDate <= now) {
        res.status(400).json({
          success: false,
          error: {
            message: 'scheduledAt must be in the future',
            statusCode: 400,
          },
        });
        return;
      }
    }

    // Update scheduled status
    const updatedStatus = await scheduledStatusService.updateScheduledStatus(
      userId,
      id,
      mediaUrl,
      mediaType,
      scheduledAt,
      caption
    );

    res.json({
      success: true,
      data: updatedStatus,
    });
  } catch (error: any) {
    logger.error('[ScheduledStatus] Error updating scheduled status:', {
      error,
      message: error?.message,
      userId: req.userId,
      statusId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: {
        message: error?.message || 'Internal server error',
        statusCode: 500,
      },
    });
  }
};

/**
 * Delete a scheduled status
 * DELETE /api/scheduled-status/:id
 */
export const deleteScheduledStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    // Check if status exists and belongs to user
    const existingStatus = await scheduledStatusService.getScheduledStatusById(userId, id);
    if (!existingStatus) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Scheduled status not found',
          statusCode: 404,
        },
      });
      return;
    }

    // Can only delete pending statuses
    if (existingStatus.status !== 'pending') {
      res.status(400).json({
        success: false,
        error: {
          message: 'Can only delete pending statuses',
          statusCode: 400,
        },
      });
      return;
    }

    // Delete scheduled status
    await scheduledStatusService.deleteScheduledStatus(userId, id);

    res.json({
      success: true,
      message: 'Scheduled status deleted successfully',
    });
  } catch (error: any) {
    logger.error('[ScheduledStatus] Error deleting scheduled status:', {
      error,
      message: error?.message,
      userId: req.userId,
      statusId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: {
        message: error?.message || 'Internal server error',
        statusCode: 500,
      },
    });
  }
};
























