import { WASocket } from '@whiskeysockets/baileys';
import { getSupabaseClient } from '../config/database';
import { logger } from '../config/logger';
import { checkDeletedMessagesQuota, incrementDeletedMessages } from './quota.service';
import { processAndUploadMedia, getMediaType } from './media.service';

const supabase = getSupabaseClient();

// Store messages temporarily to detect deletions
// Cache limité à 1000 messages (en mémoire)
const MAX_CACHE_SIZE = 1000;
const messageStore = new Map<string, {
  userId: string;
  messageId: string;
  senderId: string;
  senderName: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  sentAt: Date;
  message: any;
}>();

/**
 * Clean up old messages from cache if it exceeds MAX_CACHE_SIZE
 */
const cleanupCache = (): void => {
  if (messageStore.size <= MAX_CACHE_SIZE) {
    return;
  }

  // Sort by sentAt and remove oldest messages
  const entries = Array.from(messageStore.entries());
  entries.sort((a, b) => a[1].sentAt.getTime() - b[1].sentAt.getTime());
  
  // Remove oldest entries until we're under the limit
  const toRemove = entries.length - MAX_CACHE_SIZE;
  for (let i = 0; i < toRemove; i++) {
    messageStore.delete(entries[i][0]);
  }
  
  logger.debug(`[DeletedMessages] Cache cleaned: ${toRemove} old messages removed`);
};

/**
 * Store incoming message for deletion detection
 */
export const storeMessage = (_userId: string, _message: any): void => {
  // ⚠️ DÉSACTIVÉ POUR LE DÉPLOIEMENT
  // La fonctionnalité de récupération des messages supprimés est désactivée.
  return;
};

/**
 * Handle message deletion - detect and save deleted messages
 */
export const handleMessageDeletion = async (
  _userId: string,
  _socket: WASocket,
  _deletion: any
): Promise<void> => {
  // ⚠️ DÉSACTIVÉ POUR LE DÉPLOIEMENT
  // La fonctionnalité de récupération des messages supprimés est désactivée.
  return;
};

/**
 * Notify user about deleted message via WhatsApp
 * Envoie le message supprimé directement à l'utilisateur via WhatsApp
 */
const notifyUserAboutDeletedMessage = async (
  userId: string,
  _socket: WASocket,
  storedMessage: {
    senderId: string;
    senderName: string;
    content: string;
    mediaUrl?: string;
    mediaType?: string;
    sentAt: Date;
    message: any;
  },
  delaySeconds: number
): Promise<void> => {
  try {
    // 📬 Notification utilisateur
    // Note: Pour envoyer une notification WhatsApp à l'utilisateur,
    // nous aurions besoin de stocker le numéro WhatsApp de l'utilisateur dans la base de données
    // Pour l'instant, la notification se fait via le dashboard en temps réel
    
    logger.info(`[DeletedMessages] 📬 Deleted message notification (dashboard only):`);
    logger.info(`  👤 From: ${storedMessage.senderName}`);
    logger.info(`  ⏱️ Delay: ${delaySeconds} seconds`);
    logger.info(`  💬 Content: ${storedMessage.content || '(No text)'}`);
    logger.info(`  📎 Media: ${storedMessage.mediaType || 'None'}`);
    
    // Note: Dashboard notification is handled via real-time updates
    // The message is already saved to database, so it will appear in the dashboard
    // TODO: Implement WhatsApp notification by storing user's WhatsApp number in database

    // If message has media and mediaUrl, log it
    if (storedMessage.mediaUrl && storedMessage.mediaType) {
      logger.info(`[DeletedMessages] Media URL available: ${storedMessage.mediaUrl}`);
      // TODO: Implement media re-sending via WhatsApp
      // This would require downloading the media from the URL and sending it via Baileys
    }

    logger.info(`[DeletedMessages] ✅ User ${userId} notified about deleted message from ${storedMessage.senderName}`);
  } catch (error) {
    logger.error(`[DeletedMessages] Error notifying user about deleted message:`, error);
    // Don't throw - notification failure shouldn't break the deletion capture
  }
};

/**
 * Get deleted messages for a user
 */
export const getDeletedMessages = async (userId: string, limit: number = 50) => {
  const { data, error } = await supabase
    .from('deleted_messages')
    .select('*')
    .eq('user_id', userId)
    .order('deleted_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('[DeletedMessages] Error getting deleted messages:', error);
    throw new Error('Failed to get deleted messages');
  }

  return data || [];
};

/**
 * Get deleted message by ID
 */
export const getDeletedMessage = async (userId: string, messageId: string) => {
  const { data, error } = await supabase
    .from('deleted_messages')
    .select('*')
    .eq('id', messageId)
    .eq('user_id', userId)
    .single();

  if (error) {
    logger.error('[DeletedMessages] Error getting deleted message:', error);
    throw new Error('Failed to get deleted message');
  }

  return data;
};

/**
 * Delete a deleted message (remove from database)
 */
export const deleteDeletedMessage = async (userId: string, messageId: string): Promise<void> => {
  logger.info(`[DeletedMessages] Attempting to delete message:`, {
    messageId,
    userId,
  });

  // First, check if the message exists and belongs to the user
  const { data: existingMessage, error: checkError } = await supabase
    .from('deleted_messages')
    .select('id, user_id')
    .eq('id', messageId)
    .eq('user_id', userId)
    .single();

  if (checkError) {
    logger.error('[DeletedMessages] Error checking message existence:', {
      error: checkError,
      message: checkError.message,
      code: checkError.code,
      details: checkError.details,
      hint: checkError.hint,
    });
    
    // If message not found, it's not an error - just return success
    if (checkError.code === 'PGRST116') {
      logger.warn(`[DeletedMessages] Message ${messageId} not found for user ${userId}`);
      return; // Message doesn't exist, consider it already deleted
    }
    
    throw new Error(`Failed to check message: ${checkError.message}`);
  }

  if (!existingMessage) {
    logger.warn(`[DeletedMessages] Message ${messageId} not found for user ${userId}`);
    return; // Message doesn't exist, consider it already deleted
  }

  // Delete the message
  const { error, data } = await supabase
    .from('deleted_messages')
    .delete()
    .eq('id', messageId)
    .eq('user_id', userId)
    .select();

  if (error) {
    logger.error('[DeletedMessages] Error deleting message:', {
      error,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      messageId,
      userId,
    });
    throw new Error(`Failed to delete message: ${error.message}`);
  }

  logger.info(`[DeletedMessages] Message ${messageId} deleted successfully by user ${userId}`, {
    deletedRows: data?.length || 0,
  });
};

/**
 * Get deleted messages statistics
 */
export const getDeletedMessagesStats = async (userId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  // Get deletions today
  const { count: todayCount } = await supabase
    .from('deleted_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('deleted_at', today.toISOString());

  // Get deletions this month
  const { count: monthCount } = await supabase
    .from('deleted_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('deleted_at', thisMonth.toISOString());

  // Get total deletions
  const { count: totalCount } = await supabase
    .from('deleted_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  return {
    deletedToday: todayCount || 0,
    deletedThisMonth: monthCount || 0,
    totalDeleted: totalCount || 0,
  };
};

