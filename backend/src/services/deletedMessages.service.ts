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
export const storeMessage = (userId: string, message: any): void => {
  try {
    const messageId = message.key?.id;
    const senderId = message.key?.remoteJid;
    
    logger.info(`[DeletedMessages] 📥 Attempting to store message for user ${userId}:`, {
      messageId,
      senderId,
      fromMe: message.key?.fromMe,
      hasMessage: !!message.message,
      messageType: message.message ? Object.keys(message.message)[0] : 'unknown',
      remoteJid: message.key?.remoteJid,
      participant: message.key?.participant,
    });
    
    if (!messageId || !senderId || senderId === 'status@broadcast') {
      logger.warn(`[DeletedMessages] ⚠️ Skipping message: missing ID or sender, or status broadcast`, {
        messageId: messageId || 'MISSING',
        senderId: senderId || 'MISSING',
        remoteJid: message.key?.remoteJid || 'MISSING',
        participant: message.key?.participant || 'MISSING',
      });
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

    // 📥 Capture initiale - Extraction complète du contenu
    if (message.message?.conversation) {
      // Message texte simple
      content = message.message.conversation;
    } else if (message.message?.extendedTextMessage?.text) {
      // Message texte étendu
      content = message.message.extendedTextMessage.text;
    } else if (message.message?.imageMessage) {
      // Image
      mediaType = 'image';
      content = message.message.imageMessage.caption || '';
    } else if (message.message?.videoMessage) {
      // Vidéo
      mediaType = 'video';
      content = message.message.videoMessage.caption || '';
    } else if (message.message?.audioMessage) {
      // Audio
      mediaType = 'audio';
      content = message.message.audioMessage.ptt ? 'Message vocal' : 'Audio';
    } else if (message.message?.stickerMessage) {
      // Sticker
      mediaType = 'sticker';
      content = 'Sticker';
    } else if (message.message?.documentMessage) {
      // Document
      mediaType = 'document';
      content = message.message.documentMessage.fileName || 'Document';
    } else if (message.message?.locationMessage) {
      // Localisation
      mediaType = 'location';
      content = `📍 Localisation: ${message.message.locationMessage.degreesLatitude}, ${message.message.locationMessage.degreesLongitude}`;
    } else if (message.message?.contactMessage) {
      // Contact
      mediaType = 'contact';
      content = `👤 Contact: ${message.message.contactMessage.displayName || 'Contact'}`;
    } else {
      // Check for other media types
      const mediaInfo = getMediaType(message);
      if (mediaInfo.type) {
        mediaType = mediaInfo.type;
      }
    }

    // Note: Téléchargement automatique des médias se fait lors de la suppression
    // pour éviter de télécharger tous les médias inutilement

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

    // Clean up cache if it exceeds MAX_CACHE_SIZE
    cleanupCache();

    // Clean up old messages (older than 24 hours)
    setTimeout(() => {
      messageStore.delete(storeKey);
    }, 24 * 60 * 60 * 1000);

    logger.info(`[DeletedMessages] ✅ Message stored in cache: ${storeKey} (total: ${messageStore.size})`);
    logger.info(`[DeletedMessages] 📋 Message details:`, {
      senderName,
      content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      mediaType,
      sentAt: sentAt.toISOString(),
    });
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
    // Baileys emits message deletions in different formats
    // We need to check for 'messages.delete' or 'messages.update' events
    
    logger.info(`[DeletedMessages] 🔍 Deletion event received for user ${userId}:`, {
      hasKeys: !!deletion?.keys,
      keysCount: deletion?.keys?.length || 0,
      deletionType: deletion?.type,
      deletionKeys: deletion?.keys?.map((k: any) => ({ id: k.id, remoteJid: k.remoteJid })),
      cacheSize: messageStore.size,
    });

    if (!deletion || !deletion.keys || deletion.keys.length === 0) {
      logger.warn(`[DeletedMessages] ⚠️ No keys in deletion event for user ${userId}`);
      return;
    }

    logger.info(`[DeletedMessages] 📋 Processing ${deletion.keys.length} deletion(s) for user ${userId}`);

    for (const key of deletion.keys) {
      const messageId = key.id;
      // Pour les suppressions, le remoteJid peut être dans key.remoteJid ou key.participant
      let senderId = key.remoteJid || key.participant;
      
      logger.info(`[DeletedMessages] 🔍 Processing deletion key:`, {
        messageId,
        senderId,
        remoteJid: key.remoteJid,
        participant: key.participant,
        fromMe: key.fromMe,
        fullKey: JSON.stringify(key).substring(0, 200),
      });
      
      if (!messageId) {
        logger.warn(`[DeletedMessages] ⚠️ Skipping deletion: missing message ID`);
        continue;
      }

      if (!senderId || senderId === 'status@broadcast') {
        logger.warn(`[DeletedMessages] ⚠️ Skipping deletion: missing sender ID or status broadcast`);
        continue;
      }

      // ⚠️ IMPORTANT: Ne capturer que les messages supprimés par l'EXPÉDITEUR
      // Si key.fromMe === true, c'est l'utilisateur qui a supprimé son propre message → IGNORER
      // Si key.fromMe === false ou undefined, c'est l'expéditeur qui a supprimé → CAPTURER
      if (key.fromMe === true) {
        logger.info(`[DeletedMessages] ℹ️ Skipping deletion: user deleted their own message (not capturing)`);
        continue;
      }

      logger.info(`[DeletedMessages] ✅ This is a deletion by the sender (not by user), will capture`);

      // ⚠️ VÉRIFICATION CRITIQUE : Le message DOIT être dans le cache pour être considéré comme supprimé
      // Si le message n'est pas dans le cache, c'est probablement un faux positif
      // Essayer plusieurs formats de clé pour trouver le message dans le cache
      const storeKey1 = `${userId}:${senderId}:${messageId}`;
      const storeKey2 = senderId.includes('@') ? `${userId}:${senderId}:${messageId}` : `${userId}:${senderId}@s.whatsapp.net:${messageId}`;
      
      let storedMessage = messageStore.get(storeKey1);
      if (!storedMessage) {
        storedMessage = messageStore.get(storeKey2);
        if (storedMessage) {
          logger.info(`[DeletedMessages] ✅ Found message with alternative key format: ${storeKey2}`);
        }
      }
      
      // ⚠️ VÉRIFICATION ADDITIONNELLE : Le message doit avoir été reçu récemment
      // Si le message est trop ancien dans le cache (> 1 heure), c'est peut-être un faux positif
      // Mais on permet quand même les suppressions récentes (jusqu'à 1 heure)
      if (storedMessage) {
        const messageAge = Date.now() - storedMessage.sentAt.getTime();
        const maxAge = 60 * 60 * 1000; // 1 heure maximum (plus permissif)
        
        if (messageAge > maxAge) {
          logger.warn(`[DeletedMessages] ⚠️ Message too old in cache (${Math.floor(messageAge / 1000)}s), might be false positive - NOT capturing`);
          continue;
        }
      }

      logger.info(`[DeletedMessages] 🔍 Looking for message in cache:`, {
        triedKeys: [storeKey1, storeKey2],
        found: !!storedMessage,
        cacheSize: messageStore.size,
        cacheKeys: Array.from(messageStore.keys()).slice(0, 10), // First 10 keys for debugging
      });

      if (!storedMessage) {
        // ⚠️ IMPORTANT: Si le message n'est pas dans le cache, on ne le traite PAS comme supprimé
        // Cela évite les faux positifs (messages qui n'ont jamais été reçus)
        logger.warn(`[DeletedMessages] ⚠️ Message not found in cache - NOT treating as deletion:`, {
          triedKeys: [storeKey1, storeKey2],
          messageId,
          senderId,
          cacheSize: messageStore.size,
          reason: 'Message must be in cache to be considered deleted',
        });
        logger.warn(`[DeletedMessages] This could mean:`);
        logger.warn(`[DeletedMessages]   1. Message was deleted before we stored it (not capturing)`);
        logger.warn(`[DeletedMessages]   2. Message was stored with a different key format (not capturing)`);
        logger.warn(`[DeletedMessages]   3. This is a false positive (not capturing)`);
        continue;
      }

      const foundStoreKey = storedMessage ? (messageStore.has(storeKey1) ? storeKey1 : storeKey2) : storeKey1;
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
          // Continue with original mediaUrl if upload fails
        }
      }

      // Save to database
      const { error: insertError } = await supabase
        .from('deleted_messages')
        .insert({
          user_id: userId,
          sender_id: storedMessage.senderId,
          sender_name: storedMessage.senderName,
          message_id: messageId,
          content: storedMessage.content,
          media_url: finalMediaUrl || null,
          media_type: storedMessage.mediaType || null,
          sent_at: storedMessage.sentAt.toISOString(),
          deleted_at: deletedAt.toISOString(),
          delay_seconds: delaySeconds,
        });

      if (insertError) {
        logger.error('[DeletedMessages] Error saving deleted message:', insertError);
        messageStore.delete(storeKey1);
        messageStore.delete(storeKey2);
        continue;
      }

      // Increment quota
      await incrementDeletedMessages(userId);

      // Remove from store
      messageStore.delete(storeKey1);
      messageStore.delete(storeKey2);

      logger.info(`[DeletedMessages] Captured deleted message from ${storedMessage.senderName} for user ${userId} (delay: ${delaySeconds}s)`);

      // 📬 Notification utilisateur - Envoyer le message supprimé via WhatsApp
      try {
        await notifyUserAboutDeletedMessage(userId, socket, storedMessage, delaySeconds);
      } catch (error) {
        logger.warn(`[DeletedMessages] Failed to notify user about deleted message:`, error);
        // Don't fail the whole process if notification fails
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

