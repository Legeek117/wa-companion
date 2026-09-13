import { WASocket } from '@whiskeysockets/baileys';
import prisma from '../config/database';
import { logger } from '../config/logger';
import { checkDeletedMessagesQuota, incrementDeletedMessages } from './quota.service';
import { processAndUploadMedia, getMediaType } from './media.service';

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

const VALID_MEDIA_TYPES = ['text', 'image', 'video', 'audio', 'document', 'sticker'] as const;

const mapMediaType = (mediaType?: string): any => {
  if (!mediaType) return null;
  return (VALID_MEDIA_TYPES as readonly string[]).includes(mediaType) ? mediaType : null;
};

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
export const storeMessage = (userId: string, message: any): void => {
  try {
    const messageId = message.key?.id;
    const senderId = message.key?.remoteJid;

    if (!messageId || !senderId || senderId === 'status@broadcast') {
      return;
    }

    // Ignore messages from self
    if (message.key?.fromMe) {
      logger.info(`[DeletedMessages] ℹ️ Skipping message: from self (not storing own messages)`);
      return;
    }

    const senderName = message.pushName || senderId || 'Unknown';
    const sentAt = new Date(message.messageTimestamp * 1000 || Date.now());

    // Extract content
    let content = '';
    let mediaUrl = '';
    let mediaType: string | undefined;

    if (message.message?.conversation) {
      content = message.message.conversation;
    } else if (message.message?.extendedTextMessage?.text) {
      content = message.message.extendedTextMessage.text;
    } else if (message.message?.imageMessage) {
      mediaType = 'image';
      content = message.message.imageMessage.caption || '';
    } else if (message.message?.videoMessage) {
      mediaType = 'video';
      content = message.message.videoMessage.caption || '';
    } else if (message.message?.audioMessage) {
      mediaType = 'audio';
      content = message.message.audioMessage.ptt ? 'Message vocal' : 'Audio';
    } else if (message.message?.stickerMessage) {
      mediaType = 'sticker';
      content = 'Sticker';
    } else if (message.message?.documentMessage) {
      mediaType = 'document';
      content = message.message.documentMessage.fileName || 'Document';
    } else if (message.message?.locationMessage) {
      mediaType = 'location';
      content = `📍 Localisation: ${message.message.locationMessage.degreesLatitude}, ${message.message.locationMessage.degreesLongitude}`;
    } else if (message.message?.contactMessage) {
      mediaType = 'contact';
      content = `👤 Contact: ${message.message.contactMessage.displayName || 'Contact'}`;
    } else {
      const mediaInfo = getMediaType(message);
      if (mediaInfo.type) {
        mediaType = mediaInfo.type;
      }
    }

    const storeKey = `${userId}:${senderId}:${messageId}`;

    messageStore.set(storeKey, {
      userId,
      messageId,
      senderId,
      senderName,
      content,
      mediaUrl,
      mediaType,
      sentAt,
      message,
    });

    cleanupCache();

    setTimeout(() => {
      messageStore.delete(storeKey);
    }, 24 * 60 * 60 * 1000);

    logger.debug(`[DeletedMessages] ✅ Message stored in cache: ${storeKey} (total: ${messageStore.size})`);
  } catch (error) {
    logger.error('[DeletedMessages] Error storing message:', error);
  }
};

/**
 * Handle message deletion - detect and save deleted messages
 */
export const handleMessageDeletion = async (
  userId: string,
  socket: WASocket,
  deletion: any
): Promise<void> => {
  try {
    logger.info(`[DeletedMessages] 🔍 Deletion event received for user ${userId}:`, {
      hasKeys: !!deletion?.keys,
      keysCount: deletion?.keys?.length || 0,
      deletionType: deletion?.type,
    });

    if (!deletion || !deletion.keys || deletion.keys.length === 0) {
      logger.warn(`[DeletedMessages] ⚠️ No keys in deletion event for user ${userId}`);
      return;
    }

    for (const key of deletion.keys) {
      const messageId = key.id;
      let senderId = key.remoteJid || key.participant;

      if (!messageId) {
        continue;
      }

      if (!senderId || senderId === 'status@broadcast') {
        continue;
      }

      // ⚠️ IMPORTANT: Ne capturer que les messages supprimés par l'EXPÉDITEUR
      if (key.fromMe === true) {
        logger.info(`[DeletedMessages] ℹ️ Skipping deletion: user deleted their own message (not capturing)`);
        continue;
      }

      const storeKey1 = `${userId}:${senderId}:${messageId}`;
      const storeKey2 = senderId.includes('@') ? `${userId}:${senderId}:${messageId}` : `${userId}:${senderId}@s.whatsapp.net:${messageId}`;

      let storedMessage = messageStore.get(storeKey1);
      if (!storedMessage) {
        storedMessage = messageStore.get(storeKey2);
      }

      if (storedMessage) {
        const messageAge = Date.now() - storedMessage.sentAt.getTime();
        const maxAge = 60 * 60 * 1000; // 1 heure maximum (plus permissif)

        if (messageAge > maxAge) {
          logger.warn(`[DeletedMessages] ⚠️ Message too old in cache (${Math.floor(messageAge / 1000)}s), might be false positive - NOT capturing`);
          continue;
        }
      }

      const foundStoreKey = storedMessage ? (messageStore.has(storeKey1) ? storeKey1 : storeKey2) : storeKey1;

      if (!storedMessage) {
        logger.warn(`[DeletedMessages] ⚠️ Message not found in cache - NOT treating as deletion:`, {
          triedKeys: [storeKey1, storeKey2],
          messageId,
          senderId,
          reason: 'Message must be in cache to be considered deleted',
        });
        continue;
      }

      logger.info(`[DeletedMessages] ✅ Found message in cache: ${foundStoreKey}`);

      // Check quota before saving
      try {
        await checkDeletedMessagesQuota(userId);
      } catch (error: any) {
        if (error.message?.includes('quota exceeded')) {
          logger.warn(`[DeletedMessages] Quota exceeded for user ${userId}, skipping capture`);
          messageStore.delete(storeKey1);
          messageStore.delete(storeKey2);
          continue;
        }
        throw error;
      }

      const deletedAt = new Date();
      const delaySeconds = Math.floor((deletedAt.getTime() - storedMessage.sentAt.getTime()) / 1000);

      // If message has media, try to upload it before saving
      let finalMediaUrl = storedMessage.mediaUrl;
      if (storedMessage.mediaType && storedMessage.message) {
        try {
          const uploadedUrl = await processAndUploadMedia(socket, storedMessage.message, userId, 'deleted-messages');
          if (uploadedUrl) {
            finalMediaUrl = uploadedUrl;
            logger.info(`[DeletedMessages] Media uploaded for deleted message ${messageId}`);
          }
        } catch (error) {
          logger.warn(`[DeletedMessages] Failed to upload media for deleted message ${messageId}:`, error);
        }
      }

      // Save to database
      await prisma.deletedMessage.create({
        data: {
          userId,
          senderId: storedMessage.senderId,
          senderName: storedMessage.senderName,
          messageId,
          content: storedMessage.content,
          mediaUrl: finalMediaUrl || null,
          mediaType: mapMediaType(storedMessage.mediaType),
          sentAt: storedMessage.sentAt,
          deletedAt,
          delaySeconds,
        },
      });

      logger.info(`[DeletedMessages] ✅ Captured deleted message from ${storedMessage.senderName} for user ${userId} (delay: ${delaySeconds}s):`, {
        messageId,
        content: storedMessage.content?.substring(0, 100),
        mediaType: storedMessage.mediaType,
        mediaUrl: finalMediaUrl,
      });

      // 💾 Forcer un flush de la base de données
      // Prisma traite automatiquement par transaction

      // Increment quota
      await incrementDeletedMessages(userId);

      // Remove from store
      messageStore.delete(storeKey1);
      messageStore.delete(storeKey2);

      // 📬 Notification utilisateur - Envoyer le message supprimé via WhatsApp
      try {
        await notifyUserAboutDeletedMessage(userId, socket, storedMessage, delaySeconds);
      } catch (error) {
        logger.warn(`[DeletedMessages] Failed to notify user about deleted message:`, error);
      }

      // Envoyer une notification push
      try {
        const { sendPushNotification } = await import('./notifications.service');
        await sendPushNotification(userId, {
          title: 'Message supprimé récupéré',
          body: `Message de ${storedMessage.senderName} récupéré`,
          image: finalMediaUrl || undefined,
          data: {
            type: 'deleted_message',
            senderId: storedMessage.senderId,
            senderName: storedMessage.senderName,
            messageId,
            delaySeconds: delaySeconds.toString(),
          },
        });
      } catch (notifError) {
        logger.warn('[DeletedMessages] Failed to send push notification:', notifError);
      }
    }
  } catch (error: any) {
    if (error.message?.includes('quota exceeded')) {
      logger.warn(`[DeletedMessages] Quota exceeded for user ${userId}`);
      return;
    }
    logger.error('[DeletedMessages] Error handling message deletion:', error);
  }
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

