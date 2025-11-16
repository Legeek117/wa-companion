import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { getSupabaseClient } from '../config/database';
import { logger } from '../config/logger';
import * as statusService from '../services/status.service';
import { likeStatus, getAllContactsFromSocket, getSocket, getWhatsAppStatus, getAllAvailableStatuses, getContactStatuses } from '../services/whatsapp.service';
import { invalidateStatusConfigCache } from '../services/status.service';
import { checkStatusReactionQuota } from '../services/quota.service';

const supabase = getSupabaseClient();

/**
 * Get status configuration for the authenticated user
 */
export const getStatusConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      });
      return;
    }

    // Get status config using service
    const config = await statusService.getStatusConfig(userId);

    res.json({
      success: true,
      data: {
        enabled: config.global.enabled,
        actionType: config.global.actionType,
        defaultEmoji: config.global.defaultEmoji,
        selectedContacts: config.global.selectedContacts,
        isPremium: config.global.isPremium,
        contacts: config.contacts,
      },
    });
  } catch (error) {
    logger.error('[Status] Error getting status config:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        statusCode: 500,
      },
    });
  }
};

/**
 * Update status configuration for the authenticated user
 */
export const updateStatusConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      });
      return;
    }

    const { enabled, actionType, defaultEmoji, contacts } = req.body;

    // Validate input - enabled is required
    if (enabled !== undefined && typeof enabled !== 'boolean') {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid enabled value. Must be a boolean',
          statusCode: 400,
        },
      });
      return;
    }

    if (actionType && !['view_only', 'view_and_like'].includes(actionType)) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid actionType. Must be "view_only" or "view_and_like"',
          statusCode: 400,
        },
      });
      return;
    }

    if (defaultEmoji !== undefined && typeof defaultEmoji !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid defaultEmoji value. Must be a string',
          statusCode: 400,
        },
      });
      return;
    }
    
    // Validate emoji is not empty if provided
    if (defaultEmoji !== undefined && defaultEmoji.trim() === '') {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid defaultEmoji value. Emoji cannot be empty',
          statusCode: 400,
        },
      });
      return;
    }
    
    // Log the update for debugging
    logger.info(`[Status] 📝 Updating config for user ${userId}:`, {
      enabled,
      actionType,
      defaultEmoji: defaultEmoji ? `"${defaultEmoji}" (length: ${defaultEmoji.length})` : 'not provided',
      hasContacts: Array.isArray(contacts) ? contacts.length : 0,
    });

    // Update or create global status config
    const { data: existingGlobalConfig } = await supabase
      .from('status_config')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Build update object - only include fields that are provided
    const globalConfigData: any = {
      updated_at: new Date().toISOString(),
    };
    
    // Only update fields that are provided in the request
    if (enabled !== undefined) {
      globalConfigData.enabled = enabled;
    }
    if (actionType !== undefined) {
      globalConfigData.action_type = actionType;
    }
    // IMPORTANT: Always update defaultEmoji if provided, even if it's the same value
    // This ensures the emoji is correctly stored in the database
    if (defaultEmoji !== undefined) {
      globalConfigData.default_emoji = defaultEmoji.trim(); // Trim to remove any whitespace
      logger.info(`[Status] Setting default_emoji to: "${globalConfigData.default_emoji}" (length: ${globalConfigData.default_emoji.length})`);
    }
    
    // If no existing config and enabled is not provided, set defaults
    if (!existingGlobalConfig) {
      if (globalConfigData.enabled === undefined) {
        globalConfigData.enabled = false;
      }
      if (!globalConfigData.action_type) {
        globalConfigData.action_type = 'view_and_like';
      }
      // Only set default emoji if not provided
      if (globalConfigData.default_emoji === undefined) {
        globalConfigData.default_emoji = '❤️';
      }
    } else {
      // For updates, preserve existing values if not provided
      if (globalConfigData.enabled === undefined) {
        globalConfigData.enabled = existingGlobalConfig.enabled;
      }
      if (!globalConfigData.action_type) {
        globalConfigData.action_type = existingGlobalConfig.action_type || 'view_and_like';
      }
      // IMPORTANT: Only preserve existing emoji if not explicitly provided in the update
      // If defaultEmoji is provided (even if it's the same), use the new value
      if (globalConfigData.default_emoji === undefined) {
        globalConfigData.default_emoji = existingGlobalConfig.default_emoji || '❤️';
      }
      // If defaultEmoji was provided, it's already set in globalConfigData above
    }
    
    logger.info(`[Status] Final globalConfigData to save for user ${userId}:`, {
      enabled: globalConfigData.enabled,
      action_type: globalConfigData.action_type,
      default_emoji: globalConfigData.default_emoji ? `"${globalConfigData.default_emoji}" (length: ${globalConfigData.default_emoji.length})` : 'not set',
      hasDefaultEmoji: globalConfigData.default_emoji !== undefined,
    });

    if (existingGlobalConfig) {
      // Update existing config
      logger.info(`[Status] Updating existing config for user ${userId}:`, globalConfigData);
      const { error, data: updatedData } = await supabase
        .from('status_config')
        .update(globalConfigData)
        .eq('user_id', userId)
        .select();

      if (error) {
        logger.error('[Status] Error updating global config:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Failed to update global config', statusCode: 500 },
        });
        return;
      }
      
      logger.info(`[Status] Config updated successfully for user ${userId}:`, {
        ...updatedData?.[0],
        default_emoji: updatedData?.[0]?.default_emoji ? `"${updatedData[0].default_emoji}" (length: ${updatedData[0].default_emoji.length})` : 'not set',
      });
      
      // Verify the update was successful by reading it back
      const { data: verifyConfig } = await supabase
        .from('status_config')
        .select('default_emoji, action_type, enabled')
        .eq('user_id', userId)
        .single();
      
      if (verifyConfig) {
        logger.info(`[Status] ✅ Verified config in DB for user ${userId}:`, {
          default_emoji: `"${verifyConfig.default_emoji}" (length: ${verifyConfig.default_emoji?.length || 0})`,
          action_type: verifyConfig.action_type,
          enabled: verifyConfig.enabled,
        });
      }
    } else {
      // Create new config
      logger.info(`[Status] Creating new config for user ${userId}:`, globalConfigData);
      const { error, data: insertedData } = await supabase
        .from('status_config')
        .insert({
          user_id: userId,
          ...globalConfigData,
        })
        .select();

      if (error) {
        logger.error('[Status] Error creating global config:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Failed to create global config', statusCode: 500 },
        });
        return;
      }
      
      logger.info(`[Status] Config created successfully for user ${userId}:`, {
        ...insertedData?.[0],
        default_emoji: insertedData?.[0]?.default_emoji ? `"${insertedData[0].default_emoji}" (length: ${insertedData[0].default_emoji.length})` : 'not set',
      });
    }

    // For premium users: update contact-specific configs
    if (Array.isArray(contacts) && contacts.length > 0) {
      const { data: user } = await supabase
        .from('users')
        .select('plan')
        .eq('id', userId)
        .single();

      if (user?.plan === 'premium') {
        // Update each contact config
        for (const contact of contacts) {
          // Support both formats: { contactId, contactName, ... } and { contact_id, contact_name, ... }
          const contactId = contact.contactId || contact.contact_id;
          const contactName = contact.contactName || contact.contact_name;
          // Default to true if not explicitly set, so contacts are enabled by default
          const contactEnabled = contact.enabled !== undefined ? contact.enabled : true;
          // Use contact emoji if provided and not empty, otherwise use global default
          const contactEmoji = (contact.emoji && contact.emoji.trim() !== '') 
            ? contact.emoji 
            : (defaultEmoji && defaultEmoji.trim() !== '' ? defaultEmoji : '❤️');
          
          // Use contact actionType if provided, otherwise use global actionType
          const contactActionType = (contact.actionType || contact.action_type) 
            ? (contact.actionType || contact.action_type)
            : (actionType || 'view_and_like');
          
          const watchOnly = contact.watchOnly !== undefined ? contact.watchOnly : (contact.watch_only || false);
          
          logger.info(`[Status] Updating contact config for ${contactId}:`, {
            emoji: contactEmoji,
            actionType: contactActionType,
            enabled: contactEnabled,
            watchOnly,
          });

          if (!contactId || !contactName) {
            logger.warn(`[Status] Skipping contact config: missing contactId or contactName`, contact);
            continue;
          }

          const contactConfigData: any = {
            user_id: userId,
            contact_id: contactId,
            contact_name: contactName,
            enabled: contactEnabled,
            emoji: contactEmoji,
            action_type: contactActionType,
            watch_only: watchOnly,
            updated_at: new Date().toISOString(),
          };

          // Check if config exists
          const { data: existingContactConfig } = await supabase
            .from('status_auto_like_config')
            .select('*')
            .eq('user_id', userId)
            .eq('contact_id', contactId)
            .single();

          if (existingContactConfig) {
            // Update existing
            await supabase
              .from('status_auto_like_config')
              .update(contactConfigData)
              .eq('user_id', userId)
              .eq('contact_id', contactId);
          } else {
            // Insert new
            await supabase
              .from('status_auto_like_config')
              .insert(contactConfigData);
          }
        }
      }
    }

    // CRITICAL: Invalidate cache BEFORE returning to ensure next status uses fresh config
    invalidateStatusConfigCache(userId);
    logger.info(`[Status] 🗑️ Config cache invalidated for user ${userId} after update`);

    // Wait a tiny bit to ensure DB write is committed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Return updated config (after cache invalidation, this will fetch fresh data)
    const updatedConfig = await statusService.getStatusConfig(userId);

    logger.info(`[Status] ✅ Returning updated config for user ${userId}:`, {
      enabled: updatedConfig.global.enabled,
      actionType: updatedConfig.global.actionType,
      defaultEmoji: `"${updatedConfig.global.defaultEmoji}"`,
      emojiLength: updatedConfig.global.defaultEmoji?.length || 0,
      emojiCodePoints: updatedConfig.global.defaultEmoji ? Array.from(updatedConfig.global.defaultEmoji as string).map((e: string) => e.codePointAt(0)?.toString(16)).join(',') : 'none',
    });

    res.json({
      success: true,
      data: {
        enabled: updatedConfig.global.enabled,
        actionType: updatedConfig.global.actionType,
        defaultEmoji: updatedConfig.global.defaultEmoji,
        selectedContacts: updatedConfig.global.selectedContacts,
        isPremium: updatedConfig.global.isPremium,
        contacts: updatedConfig.contacts,
      },
    });
  } catch (error) {
    logger.error('[Status] Error updating status config:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        statusCode: 500,
      },
    });
  }
};

/**
 * Get status likes history
 * GET /api/status/likes
 */
export const getStatusLikes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 100;
    const likes = await statusService.getStatusLikesHistory(userId, limit);

    res.json({
      success: true,
      data: likes,
    });
  } catch (error: any) {
    logger.error('[Status] Error getting likes:', {
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

/**
 * Like a status
 * POST /api/status/like
 */
export const likeStatusController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const { contactId, statusId, emoji } = req.body;

    if (!contactId || !statusId) {
      res.status(400).json({
        success: false,
        error: { message: 'contactId and statusId are required', statusCode: 400 },
      });
      return;
    }

    // Normalize emoji to NFC format for iPhone compatibility
    const { normalizeEmoji } = await import('../utils/helpers');
    const originalEmoji = emoji || '❤️';
    const reactionEmoji = normalizeEmoji(originalEmoji);
    
    // Log detailed emoji information for debugging iPhone issues
    const codePoints = Array.from(reactionEmoji).map((e: string) => {
      const cp = e.codePointAt(0);
      return cp ? `U+${cp.toString(16).toUpperCase().padStart(4, '0')}` : '?';
    });
    logger.info(`[Status] 🎯 Emoji normalization:`, {
      original: originalEmoji,
      normalized: reactionEmoji,
      length: reactionEmoji.length,
      codePoints: codePoints.join(' '),
    });

    // Check quota for status reactions (2/day for free, unlimited for premium)
    try {
      await checkStatusReactionQuota(userId);
    } catch (quotaError: any) {
      if (quotaError instanceof Error && quotaError.message.includes('Quota')) {
        res.status(403).json({
          success: false,
          error: {
            message: quotaError.message,
            statusCode: 403,
            isQuotaExceeded: true,
          },
        });
        return;
      }
      // If it's not a quota error, continue
      logger.warn(`[Status] Quota check failed but continuing:`, quotaError);
    }

    // Check WhatsApp connection status first
    const whatsappStatus = await getWhatsAppStatus(userId);
    const isConnected = whatsappStatus.status === 'connected';
    
    logger.info(`[Status] WhatsApp status for user ${userId}:`, {
      status: whatsappStatus.status,
      isConnected,
      hasSocket: !!getSocket(userId),
    });

    // Get active socket for user
    const socket = getSocket(userId);
    if (!socket) {
      logger.warn(`[Status] Socket not found for user ${userId}`, {
        sessionStatus: whatsappStatus.status,
        isConnected,
        message: 'Socket may have been disconnected or session expired',
      });
      
      res.status(400).json({
        success: false,
        error: { 
          message: isConnected 
            ? 'WhatsApp connection lost. Please reconnect your WhatsApp account.' 
            : 'WhatsApp not connected. Please connect your WhatsApp account first.',
          statusCode: 400,
        },
      });
      return;
    }

    // Socket is already validated in getSocket() - it's guaranteed to be valid here

    // For status messages, remoteJid is always 'status@broadcast'
    const remoteJid = 'status@broadcast';

    // Ensure contactId has the correct format (@s.whatsapp.net)
    let formattedContactId = contactId;
    if (!formattedContactId.includes('@')) {
      formattedContactId = `${formattedContactId}@s.whatsapp.net`;
    }

    // Construct messageKey - same format as in handleStatusUpdate
    // For status reactions, we need: remoteJid, id, and participant
    const messageKey: any = {
      remoteJid: remoteJid,
      id: statusId,
      participant: formattedContactId, // The contact who posted the status
      fromMe: false,
    };

    logger.info(`[Status] Attempting to send reaction:`, {
      emoji: reactionEmoji,
      statusId,
      contactId: formattedContactId,
      remoteJid,
      messageKey: JSON.stringify(messageKey),
      socketAvailable: !!socket,
      socketType: typeof socket,
    });

    // Try multiple methods to send the reaction (same as in handleStatusUpdate)
    let reactionSent = false;
    let lastError: any = null;

    // Method 1: Using statusJidList and broadcast (same as auto-like)
    try {
      const statusJidList = [remoteJid, formattedContactId];
      
      logger.info(`[Status] Trying method 1: statusJidList + broadcast`);
      
      await socket.sendMessage(remoteJid, {
        react: {
          text: reactionEmoji,
          key: messageKey,
        },
      }, {
        statusJidList: statusJidList,
        broadcast: true,
      } as any);

      logger.info(`[Status] ✅ ${reactionEmoji} Reaction sent (method 1: statusJidList + broadcast)`);
      reactionSent = true;
    } catch (reactError: any) {
      logger.warn(`[Status] ⚠️ Method 1 failed:`, {
        error: reactError?.message || reactError,
        status: reactError?.status,
        code: reactError?.code,
      });
      lastError = reactError;

      // Method 2: Without statusJidList
      try {
        logger.info(`[Status] Trying method 2: simple sendMessage`);
        
        await socket.sendMessage(remoteJid, {
          react: {
            text: reactionEmoji,
            key: messageKey,
          },
        });

        logger.info(`[Status] ✅ ${reactionEmoji} Reaction sent (method 2: simple sendMessage)`);
        reactionSent = true;
      } catch (reactError2: any) {
        logger.warn(`[Status] ⚠️ Method 2 also failed:`, {
          error: reactError2?.message || reactError2,
          status: reactError2?.status,
          code: reactError2?.code,
        });
        lastError = reactError2;

        // Method 3: Try with just the statusId in the key (some Baileys versions)
        try {
          logger.info(`[Status] Trying method 3: minimal key`);
          
          const minimalKey = {
            remoteJid: remoteJid,
            id: statusId,
            fromMe: false,
          };
          
          await socket.sendMessage(remoteJid, {
            react: {
              text: reactionEmoji,
              key: minimalKey,
            },
          }, {
            statusJidList: [formattedContactId],
          } as any);

          logger.info(`[Status] ✅ ${reactionEmoji} Reaction sent (method 3: minimal key)`);
          reactionSent = true;
        } catch (reactError3: any) {
          logger.error(`[Status] ❌ All methods failed:`, {
            method1: reactError?.message,
            method2: reactError2?.message,
            method3: reactError3?.message,
          });
          lastError = reactError3;
        }
      }
    }

    // Save to database regardless of whether reaction was sent
    // This allows tracking even if WhatsApp API fails
    try {
      await likeStatus(userId, formattedContactId, statusId, reactionEmoji);
      logger.info(`[Status] ✅ Status like saved to database`);
    } catch (dbError) {
      logger.error(`[Status] ❌ Error saving status like to database:`, dbError);
    }

    // Return response based on whether reaction was sent
    if (reactionSent) {
      res.json({
        success: true,
        message: 'Status liked successfully',
      });
    } else {
      // If all methods failed, check if it's because the status is too old or deleted
      const errorMessage = lastError?.message || lastError?.toString() || 'Unknown error';
      const errorStatus = lastError?.status || lastError?.statusCode;
      const errorCode = lastError?.code || lastError?.output?.statusCode;
      
      // Check for various indicators that the status has expired or been deleted
      const isStatusExpired = 
        errorMessage.includes('expired') || 
        errorMessage.includes('not found') ||
        errorMessage.includes('404') ||
        errorMessage.includes('no longer available') ||
        errorMessage.includes('status not found') ||
        errorMessage.includes('message not found') ||
        errorStatus === 404 ||
        errorCode === 404 ||
        (typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('expired')) ||
        (lastError?.output?.tag?.content?.some?.((item: any) => item?.tag === 'item-not-found'));
      
      logger.info(`[Status] Status like failed for user ${userId}:`, {
        statusId,
        contactId: formattedContactId,
        isStatusExpired,
        errorMessage: errorMessage.substring(0, 200),
        errorStatus,
        errorCode,
      });
      
      // If status is expired, also check the database - if it's older than 24h, it's definitely expired
      let shouldRemoveFromList = isStatusExpired;
      if (!shouldRemoveFromList) {
        try {
          const { data: existingLike } = await supabase
            .from('status_likes')
            .select('liked_at, created_at')
            .eq('user_id', userId)
            .eq('status_id', statusId)
            .single();
          
          if (existingLike) {
            const likedAt = new Date(existingLike.liked_at || existingLike.created_at);
            const now = new Date();
            const hoursSinceLike = (now.getTime() - likedAt.getTime()) / (1000 * 60 * 60);
            
            // If status is older than 24 hours, it's definitely expired
            if (hoursSinceLike > 24) {
              shouldRemoveFromList = true;
              logger.info(`[Status] Status ${statusId} is older than 24h (${hoursSinceLike.toFixed(1)}h), marking as expired`);
            }
          }
        } catch (dbError) {
          logger.debug(`[Status] Could not check status age in database:`, dbError);
        }
      }
      
      res.status(400).json({
        success: false,
        error: { 
          message: shouldRemoveFromList
            ? 'Ce statut a expiré ou n\'est plus disponible. Les statuts WhatsApp expirent après 24 heures.'
            : `Impossible d'envoyer la réaction: ${errorMessage.substring(0, 100)}`,
          statusCode: 400,
          isExpired: shouldRemoveFromList,
        },
      });
    }
  } catch (error) {
    logger.error('[Status] Error liking status:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

/**
 * Get status statistics
 * GET /api/status/stats
 */
export const getStatusStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const stats = await statusService.getStatusStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('[Status] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

/**
 * Get available contacts from status likes (for premium users)
 * GET /api/status/contacts
 */
/**
 * Get all available statuses (for StatusList page)
 * GET /api/status/available
 */
export const getAvailableStatuses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const statuses = await getAllAvailableStatuses(userId);

    res.json({
      success: true,
      data: statuses,
    });
  } catch (error: any) {
    logger.error('[Status] Error getting available statuses:', error);
    if (error.message?.includes('not connected')) {
      res.status(400).json({
        success: false,
        error: { message: 'WhatsApp not connected', statusCode: 400 },
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

/**
 * Get all statuses for a specific contact
 * GET /api/status/contact/:contactId
 */
export const getContactStatusesController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const { contactId } = req.params;
    if (!contactId) {
      res.status(400).json({
        success: false,
        error: { message: 'Contact ID is required', statusCode: 400 },
      });
      return;
    }

    const contactStatuses = await getContactStatuses(userId, contactId);

    res.json({
      success: true,
      data: contactStatuses,
    });
  } catch (error: any) {
    logger.error('[Status] Error getting contact statuses:', error);
    if (error.message?.includes('not connected')) {
      res.status(400).json({
        success: false,
        error: { message: 'WhatsApp not connected', statusCode: 400 },
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};

/**
 * Get available contacts from status likes (for premium users)
 * GET /api/status/contacts
 */
export const getStatusContacts = async (req: AuthRequest, res: Response): Promise<void> => {
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

    // Get contacts from all sources (socket, deleted_messages, view_once_captures, status_likes)
    let uniqueContacts = new Map<string, { contact_id: string; contact_name: string }>();
    
    try {
      const allContacts = await getAllContactsFromSocket(userId);
      logger.info(`[Status] Retrieved ${allContacts.length} contacts from all sources`);
      
      for (const contact of allContacts) {
        if (contact.contact_id && !uniqueContacts.has(contact.contact_id)) {
          uniqueContacts.set(contact.contact_id, {
            contact_id: contact.contact_id,
            contact_name: contact.contact_name || contact.contact_id.split('@')[0],
          });
        }
      }
    } catch (error) {
      logger.error('[Status] Error getting contacts from all sources:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to get contacts', statusCode: 500 },
      });
      return;
    }

    // Get existing contact configs
    const { data: existingConfigs } = await supabase
      .from('status_auto_like_config')
      .select('contact_id, enabled, emoji, action_type, watch_only')
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
        enabled: existingConfig?.enabled || false,
        emoji: existingConfig?.emoji || '❤️',
        action_type: (existingConfig?.action_type as 'view_only' | 'view_and_like') || 'view_and_like',
        watch_only: existingConfig?.watch_only || false,
      };
    });

    logger.info(`[Status] Returning ${contacts.length} contacts for premium user ${userId}`);

    res.json({
      success: true,
      data: contacts,
    });
  } catch (error) {
    logger.error('[Status] Error getting contacts:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', statusCode: 500 },
    });
  }
};























