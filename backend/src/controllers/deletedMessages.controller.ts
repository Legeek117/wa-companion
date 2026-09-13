import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as deletedMessagesService from '../services/deletedMessages.service';
import { logger } from '../config/logger';

/**
 * Get all deleted messages for the authenticated user
 * GET /api/deleted-messages
 */
export const listDeletedMessages = async (req: AuthRequest, res: Response): Promise<void> => {
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
    const messages = await deletedMessagesService.getDeletedMessages(userId, limit);

    // Format snake_case (compatible frontend, voir DeletedMessages.tsx)
    const data = messages.map((m) => ({
      id: m.id,
      sender_id: m.senderId,
      sender_name: m.senderName,
      message_id: m.messageId,
      media_url: m.mediaUrl,
      media_type: m.mediaType,
      content: m.content,
      sent_at: m.sentAt,
      deleted_at: m.deletedAt,
      delay_seconds: m.delaySeconds,
      created_at: m.createdAt,
    }));

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('[DeletedMessages] Error getting messages:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

/**
 * Get a specific deleted message by ID
 * GET /api/deleted-messages/:id
 */
export const getDeletedMessageById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const messageId = req.params.id;
    const message = await deletedMessagesService.getDeletedMessage(userId, messageId);

    if (!message) {
      res.status(404).json({
        success: false,
        error: { message: 'Deleted message not found', statusCode: 404 },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: message.id,
        sender_id: message.senderId,
        sender_name: message.senderName,
        message_id: message.messageId,
        media_url: message.mediaUrl,
        media_type: message.mediaType,
        content: message.content,
        sent_at: message.sentAt,
        deleted_at: message.deletedAt,
        delay_seconds: message.delaySeconds,
        created_at: message.createdAt,
      },
    });
  } catch (error) {
    logger.error('[DeletedMessages] Error getting message:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

/**
 * Export deleted messages
 * GET /api/deleted-messages/export
 */
export const exportDeletedMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    // TODO: Implement export functionality (JSON, CSV, PDF)
    const messages = await deletedMessagesService.getDeletedMessages(userId, 1000);

    res.json({
      success: true,
      data: messages,
      format: 'json',
    });
  } catch (error) {
    logger.error('[DeletedMessages] Error exporting messages:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

/**
 * Delete a deleted message
 * DELETE /api/deleted-messages/:id
 */
export const deleteDeletedMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const messageId = req.params.id;
    
    if (!messageId) {
      res.status(400).json({
        success: false,
        error: { message: 'Message ID is required', statusCode: 400 },
      });
      return;
    }

    logger.info(`[DeletedMessages] Delete request for message ${messageId} by user ${userId}`);

    try {
      await deletedMessagesService.deleteDeletedMessage(userId, messageId);

      res.json({
        success: true,
        message: 'Message deleted successfully',
      });
    } catch (error: any) {
      // If message not found, return 404 instead of 500
      if (error.message?.includes('not found') || error.message?.includes('PGRST116')) {
        logger.warn(`[DeletedMessages] Message ${messageId} not found for user ${userId}`);
        res.status(404).json({
          success: false,
          error: { message: 'Message not found', statusCode: 404 },
        });
        return;
      }

      // For other errors, log and return 500
      logger.error('[DeletedMessages] Error deleting message:', {
        error,
        message: error.message,
        stack: error.stack,
        messageId,
        userId,
      });
      
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Internal server error', statusCode: 500 },
      });
    }
  } catch (error: any) {
    logger.error('[DeletedMessages] Unexpected error in deleteDeletedMessage controller:', {
      error,
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

/**
 * Get deleted messages statistics
 * GET /api/deleted-messages/stats
 */
export const getDeletedMessagesStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const stats = await deletedMessagesService.getDeletedMessagesStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('[DeletedMessages] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};



















