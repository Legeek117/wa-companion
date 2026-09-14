import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as messageService from '../services/message.service';
import * as whatsappService from '../services/whatsapp.service';
import { logger } from '../config/logger';

/**
 * List all conversations for the authenticated user
 * GET /api/messages/conversations
 */
export const listConversations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized', statusCode: 401 } });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 200;
    const conversations = await messageService.getConversations(userId, limit);

    res.json({ success: true, data: conversations });
  } catch (error) {
    logger.error('[Messages] Error listing conversations:', error);
    res.status(500).json({ success: false, error: { message: 'Internal server error', statusCode: 500 } });
  }
};

/**
 * Get all messages exchanged with a specific contact
 * GET /api/messages/conversations/:contactId
 */
export const getConversationMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized', statusCode: 401 } });
      return;
    }

    const contactId = decodeURIComponent(req.params.contactId);
    const limit = parseInt(req.query.limit as string) || 500;
    const messages = await messageService.getMessages(userId, contactId, limit);

    const data = messages.map((m) => ({
      id: m.id,
      message_id: m.messageId,
      from_me: m.fromMe,
      content: m.content,
      media_url: m.mediaUrl,
      media_type: m.mediaType,
      timestamp: m.timestamp,
    }));

    res.json({ success: true, data });
  } catch (error) {
    logger.error('[Messages] Error getting conversation messages:', error);
    res.status(500).json({ success: false, error: { message: 'Internal server error', statusCode: 500 } });
  }
};

/**
 * Get the profile picture URL for a contact
 * GET /api/messages/profile-picture/:contactId
 */
export const getProfilePicture = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized', statusCode: 401 } });
      return;
    }

    const contactId = decodeURIComponent(req.params.contactId);
    const profilePicUrl = await whatsappService.getContactProfilePicture(userId, contactId);

    res.json({ success: true, data: { profile_pic_url: profilePicUrl } });
  } catch (error) {
    logger.error('[Messages] Error getting profile picture:', error);
    res.status(500).json({ success: false, error: { message: 'Internal server error', statusCode: 500 } });
  }
};

/**
 * Send a message to a contact using the user's WhatsApp session
 * POST /api/messages/send
 */
export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized', statusCode: 401 } });
      return;
    }

    const { to, message } = req.body;
    if (!to || !message) {
      res.status(400).json({ success: false, error: { message: 'Recipient and message are required' } });
      return;
    }

    const status = await whatsappService.getWhatsAppStatus(userId);
    if (status.status !== 'connected') {
      res.status(400).json({ success: false, error: { message: 'WhatsApp session is not connected' } });
      return;
    }

    await whatsappService.sendMessage(userId, to, message);

    res.status(200).json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    logger.error('[Messages] Error sending message:', error);
    res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Failed to send message' },
    });
  }
};