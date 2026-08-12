import { WASocket } from '@whiskeysockets/baileys';
import prisma from '../config/database';
import { logger } from '../config/logger';

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
  try {
    const data = await prisma.deletedMessage.findMany({
      where: { userId },
      orderBy: { deletedAt: 'desc' },
      take: limit
    });
    return data;
  } catch (error) {
    logger.error('[DeletedMessages] Error getting deleted messages:', error);
    throw new Error('Failed to get deleted messages');
  }
};

/**
 * Get deleted message by ID
 */
export const getDeletedMessage = async (userId: string, messageId: string) => {
  try {
    const data = await prisma.deletedMessage.findFirst({
      where: { id: messageId, userId }
    });
    return data;
  } catch (error) {
    logger.error('[DeletedMessages] Error getting deleted message:', error);
    throw new Error('Failed to get deleted message');
  }
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
  try {
    const existingMessage = await prisma.deletedMessage.findFirst({
      where: { id: messageId, userId },
      select: { id: true, userId: true }
    });

    if (!existingMessage) {
      logger.warn(`[DeletedMessages] Message ${messageId} not found for user ${userId}`);
      return; // Message doesn't exist, consider it already deleted
    }

    // Delete the message
    await prisma.deletedMessage.delete({
      where: { id: messageId } // id is unique and findFirst already checked ownership
    });

    logger.info(`[DeletedMessages] Message ${messageId} deleted successfully by user ${userId}`);
  } catch (error: any) {
    logger.error('[DeletedMessages] Error processing message deletion:', {
      error,
      message: error.message,
      messageId,
      userId,
    });
    throw new Error(`Failed to delete message: ${error.message}`);
  }
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
  const todayCount = await prisma.deletedMessage.count({
    where: { userId, deletedAt: { gte: today } }
  });

  // Get deletions this month
  const monthCount = await prisma.deletedMessage.count({
    where: { userId, deletedAt: { gte: thisMonth } }
  });

  // Get total deletions
  const totalCount = await prisma.deletedMessage.count({
    where: { userId }
  });

  return {
    deletedToday: todayCount || 0,
    deletedThisMonth: monthCount || 0,
    totalDeleted: totalCount || 0,
  };
};

