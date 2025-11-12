import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { getSupabaseClient } from '../config/database';
import * as autoresponderService from '../services/autoresponder.service';
import { getAllContactsFromSocket } from '../services/whatsapp.service';
import { logger } from '../config/logger';

const supabase = getSupabaseClient();

/**
 * Get autoresponder configuration
 * GET /api/autoresponder/config
 */
export const getAutoresponderConfigController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const config = await autoresponderService.getAutoresponderConfig(userId);

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('[Autoresponder] Error getting config:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

/**
 * Update autoresponder configuration
 * PUT /api/autoresponder/config
 */
export const updateAutoresponderConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const { mode, enabled, message } = req.body;

    if (!mode) {
      res.status(400).json({
        success: false,
        error: { message: 'Mode is required', statusCode: 400 },
      });
      return;
    }

    if (enabled) {
      await autoresponderService.activateMode(userId, mode, message);
    } else {
      await autoresponderService.deactivateMode(userId, mode);
    }

    const config = await autoresponderService.getAutoresponderConfig(userId);

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('[Autoresponder] Error updating config:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

/**
 * Get autoresponder contacts (Premium only)
 * GET /api/autoresponder/contacts
 * Uses the same method as status contacts - gets from contacts table and other sources
 */
export const getAutoresponderContacts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    // Check if user is premium
    const { data: user } = await supabase
      .from('users')
      .select('plan')
      .eq('id', userId)
      .single();

    if (user?.plan !== 'premium') {
      res.status(403).json({
        success: false,
        error: { message: 'This feature is only available for premium users', statusCode: 403 },
      });
      return;
    }

    // Get contacts from all sources (same method as status contacts)
    let uniqueContacts = new Map<string, { contact_id: string; contact_name: string }>();
    
    try {
      logger.info(`[Autoresponder] Fetching contacts for user ${userId}`);
      const allContacts = await getAllContactsFromSocket(userId);
      logger.info(`[Autoresponder] Retrieved ${allContacts.length} contacts from all sources`);
      
      if (allContacts.length === 0) {
        logger.warn(`[Autoresponder] No contacts found for user ${userId}`);
      }
      
      for (const contact of allContacts) {
        if (contact.contact_id && !uniqueContacts.has(contact.contact_id)) {
          uniqueContacts.set(contact.contact_id, {
            contact_id: contact.contact_id,
            contact_name: contact.contact_name || contact.contact_id.split('@')[0],
          });
        }
      }
      
      logger.info(`[Autoresponder] Unique contacts after deduplication: ${uniqueContacts.size}`);
    } catch (error) {
      logger.error('[Autoresponder] Error getting contacts from all sources:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to get contacts', statusCode: 500 },
      });
      return;
    }

    // Get existing autoresponder contact configs
    const { data: existingConfigs } = await supabase
      .from('autoresponder_contacts')
      .select('contact_id, enabled, custom_message')
      .eq('user_id', userId);

    const existingConfigsMap = new Map(
      existingConfigs?.map((c) => [c.contact_id, c]) || []
    );

    // Merge contacts with existing configs
    const contacts = Array.from(uniqueContacts.values()).map((contact) => {
      const existingConfig = existingConfigsMap.get(contact.contact_id);
      return {
        contact_id: contact.contact_id,
        contact_name: contact.contact_name,
        enabled: existingConfig?.enabled ?? true, // Default to enabled if no config
        custom_message: existingConfig?.custom_message || null,
      };
    });

    logger.info(`[Autoresponder] Returning ${contacts.length} contacts for premium user ${userId}`);

    res.json({
      success: true,
      data: contacts,
    });
  } catch (error) {
    logger.error('[Autoresponder] Error getting contacts:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

/**
 * Update autoresponder contact filter (Premium only)
 * PUT /api/autoresponder/contacts/:id
 */
export const updateAutoresponderContact = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const contactId = req.params.id;
    const { enabled, customMessage, contactName } = req.body;

    if (typeof enabled !== 'boolean') {
      res.status(400).json({
        success: false,
        error: { message: 'Enabled must be a boolean', statusCode: 400 },
      });
      return;
    }

    await autoresponderService.updateContactFilter(
      userId,
      contactId,
      contactName || contactId,
      enabled,
      customMessage
    );

    const config = await autoresponderService.getAutoresponderConfig(userId);

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('[Autoresponder] Error updating contact:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

















