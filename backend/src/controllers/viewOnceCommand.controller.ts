import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { getViewOnceCommandConfig, updateViewOnceCommandConfig } from '../services/viewOnceCommand.service';
import { logger } from '../config/logger';

/**
 * GET /api/view-once/command-config
 * Get View Once command configuration
 */
export const getCommandConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const config = await getViewOnceCommandConfig(userId);

    res.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    logger.error('[ViewOnceCommand] Error getting config:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get command configuration',
        statusCode: 500,
      },
    });
  }
};

/**
 * PUT /api/view-once/command-config
 * Update View Once command configuration
 */
export const updateCommandConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { command_text, command_emoji, enabled } = req.body;

    // Validate input
    if (command_text !== undefined && (typeof command_text !== 'string' || command_text.trim().length === 0)) {
      res.status(400).json({
        success: false,
        error: {
          message: 'command_text must be a non-empty string',
          statusCode: 400,
        },
      });
      return;
    }

    if (command_emoji !== undefined && command_emoji !== null && typeof command_emoji !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          message: 'command_emoji must be a string or null',
          statusCode: 400,
        },
      });
      return;
    }

    if (enabled !== undefined && typeof enabled !== 'boolean') {
      res.status(400).json({
        success: false,
        error: {
          message: 'enabled must be a boolean',
          statusCode: 400,
        },
      });
      return;
    }

    const updates: any = {};
    if (command_text !== undefined) updates.command_text = command_text.trim();
    if (command_emoji !== undefined) updates.command_emoji = command_emoji || null;
    if (enabled !== undefined) updates.enabled = enabled;

    const config = await updateViewOnceCommandConfig(userId, updates);

    res.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    logger.error('[ViewOnceCommand] Error updating config:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to update command configuration',
        statusCode: 500,
      },
    });
  }
};

