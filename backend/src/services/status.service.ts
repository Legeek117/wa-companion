import { WASocket } from '@whiskeysockets/baileys';
import prisma from '../config/database';
import { logger } from '../config/logger';
import { likeStatus, addContactIfNotExists, hasRecentlyProcessedStatus, markStatusAsProcessed } from './whatsapp.service';

// Cache for status configuration to avoid repeated DB queries
interface CachedConfig {
  globalConfig: {
    enabled: boolean;
    action_type: 'view_only' | 'view_and_like';
    default_emoji: string;
  } | null;
  userPlan: 'free' | 'premium' | null;
  contactConfigs: Map<string, {
    enabled: boolean;
    emoji: string;
    action_type: 'view_only' | 'view_and_like';
    watch_only: boolean;
  }>;
  lastUpdated: number;
}

const configCache = new Map<string, CachedConfig>();
const CACHE_TTL = 5 * 1000; // 5 seconds cache - reduced for faster config updates

/**
 * Get cached config or fetch from DB
 */
const getCachedConfig = async (userId: string): Promise<CachedConfig> => {
  const cached = configCache.get(userId);
  const now = Date.now();
  
  // Return cached config if still valid
  if (cached && (now - cached.lastUpdated) < CACHE_TTL) {
    return cached;
  }
  
  // Fetch fresh config from DB using Prisma
  const [globalConfigResult, userResult, contactConfigsResult] = await Promise.all([
    prisma.statusConfig.findUnique({
      where: { userId },
      select: { enabled: true, actionType: true, defaultEmoji: true }
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true }
    }),
    prisma.statusAutoLikeConfig.findMany({
      where: { userId },
      select: { contactId: true, enabled: true, emoji: true, actionType: true, watchOnly: true }
    })
  ]);
  
  // Log what we got from the database
  logger.info(`[Status] 📊 Fetched config from DB for user ${userId}:`, {
    hasGlobalConfig: !!globalConfigResult,
    default_emoji: globalConfigResult?.defaultEmoji ? `"${globalConfigResult.defaultEmoji}" (length: ${globalConfigResult.defaultEmoji.length})` : 'not set',
    action_type: globalConfigResult?.actionType,
    enabled: globalConfigResult?.enabled,
    contactConfigsCount: contactConfigsResult?.length || 0,
  });
  
  const contactConfigsMap = new Map<string, {
    enabled: boolean;
    emoji: string;
    action_type: 'view_only' | 'view_and_like';
    watch_only: boolean;
  }>();
  
  // Build global config first to use as fallback
  const globalConfig = globalConfigResult ? {
    enabled: globalConfigResult.enabled || false,
    action_type: (globalConfigResult.actionType as 'view_only' | 'view_and_like') || 'view_and_like',
    default_emoji: (globalConfigResult.defaultEmoji && globalConfigResult.defaultEmoji.trim() !== '') 
      ? globalConfigResult.defaultEmoji 
      : '❤️',
  } : {
    enabled: false,
    action_type: 'view_and_like' as const,
    default_emoji: '❤️',
  };
  
  logger.info(`[Status] 📊 Built global config for cache for user ${userId}:`, {
    default_emoji: `"${globalConfig.default_emoji}" (length: ${globalConfig.default_emoji.length})`,
    action_type: globalConfig.action_type,
    enabled: globalConfig.enabled,
  });
  
  if (contactConfigsResult) {
    for (const config of contactConfigsResult) {
      const contactEmoji = (config.emoji && config.emoji.trim() !== '') 
        ? config.emoji 
        : globalConfig.default_emoji;
      
      logger.debug(`[Status] Contact config for ${config.contactId}:`, {
        contact_emoji: config.emoji ? `"${config.emoji}" (length: ${config.emoji.length})` : 'not set',
        final_emoji: `"${contactEmoji}" (length: ${contactEmoji.length})`,
        action_type: config.actionType || globalConfig.action_type,
      });
      
      contactConfigsMap.set(config.contactId, {
        enabled: config.enabled || false,
        emoji: contactEmoji,
        action_type: (config.actionType && (config.actionType === 'view_only' || config.actionType === 'view_and_like'))
          ? (config.actionType as 'view_only' | 'view_and_like')
          : globalConfig.action_type,
        watch_only: config.watchOnly || false,
      });
    }
  }
  
  const newCache: CachedConfig = {
    globalConfig: globalConfigResult ? globalConfig : null,
    userPlan: (userResult?.plan as 'free' | 'premium') || null,
    contactConfigs: contactConfigsMap,
    lastUpdated: now,
  };
  
  configCache.set(userId, newCache);
  return newCache;
};

/**
 * Invalidate cache for a user (call this when config is updated)
 */
export const invalidateStatusConfigCache = (userId: string): void => {
  configCache.delete(userId);
  logger.info(`[Status] Cache invalidated for user ${userId}`);
};

/**
 * Get user's status configuration (global + contacts)
 */
export const getStatusConfig = async (userId: string) => {
  // Get global config
  const globalConfig = await prisma.statusConfig.findUnique({
    where: { userId }
  });

  // Get contact-specific configs
  const contactConfigs = await prisma.statusAutoLikeConfig.findMany({
    where: { userId }
  });

  // Get user plan
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true }
  });

  const isPremium = user?.plan === 'premium';

  // Build global config
  const config = {
    enabled: globalConfig?.enabled || false,
    actionType: globalConfig?.actionType || 'view_and_like' as 'view_only' | 'view_and_like',
    defaultEmoji: globalConfig?.defaultEmoji || '❤️',
    selectedContacts: contactConfigs?.filter((c: any) => c.enabled || c.watchOnly).map((c: any) => c.contactId) || [],
    isPremium,
  };

  return {
    global: config,
    contacts: contactConfigs || [],
  };
};

/**
 * Check if status should be processed for a contact
 * Returns: shouldWatch (always mark as read), shouldLike, emoji, actionType
 * Uses cached config for better performance
 */
export const shouldProcessStatus = async (
  userId: string, 
  contactId: string
): Promise<{ 
  shouldWatch: boolean; 
  shouldLike: boolean; 
  emoji: string; 
  actionType: 'view_only' | 'view_and_like';
}> => {
  // Get cached config (or fetch from DB if not cached)
  const cached = await getCachedConfig(userId);
  const globalConfig = cached.globalConfig;
  const isPremium = cached.userPlan === 'premium';

  // If global config is disabled or doesn't exist, don't process
  if (!globalConfig || !globalConfig.enabled) {
    logger.info(`[Status] ⚠️ Global config is disabled or not found for user ${userId}`);
    return {
      shouldWatch: false,
      shouldLike: false,
      emoji: globalConfig?.default_emoji || '❤️',
      actionType: globalConfig?.action_type || 'view_and_like',
    };
  }

  logger.info(`[Status] ✅ Global config is enabled for user ${userId}`, {
    actionType: globalConfig.action_type,
    defaultEmoji: `"${globalConfig.default_emoji}"`,
    emojiLength: globalConfig.default_emoji?.length || 0,
  });

  const globalActionType = globalConfig.action_type;
  // Ensure emoji is never empty or undefined - use ❤️ as ultimate fallback
  const globalEmoji = (globalConfig.default_emoji && globalConfig.default_emoji.trim() !== '') 
    ? globalConfig.default_emoji 
    : '❤️';

  logger.info(`[Status] Using global emoji: "${globalEmoji}" for user ${userId}`);

  if (!isPremium) {
    // Free plan: use global config for all contacts
    logger.info(`[Status] Free plan user ${userId}, using global config for contact ${contactId}`);
    return {
      shouldWatch: true,
      shouldLike: globalActionType === 'view_and_like',
      emoji: globalEmoji,
      actionType: globalActionType,
    };
  }

  // Premium plan: check specific contact config from cache
  const contactConfig = cached.contactConfigs.get(contactId);

  if (contactConfig) {
    const shouldWatch = contactConfig.watch_only || contactConfig.enabled;

    if (!contactConfig.enabled && !contactConfig.watch_only) {
      if (globalConfig.enabled) {
        logger.info(`[Status] Premium user ${userId}, contact ${contactId} has disabled config but global config is enabled, using global config as fallback`);
        return {
          shouldWatch: true,
          shouldLike: globalActionType === 'view_and_like',
          emoji: globalEmoji,
          actionType: globalActionType,
        };
      } else {
        logger.info(`[Status] Premium user ${userId}, contact ${contactId} is explicitly disabled and global config is disabled, skipping`);
        return {
          shouldWatch: false,
          shouldLike: false,
          emoji: globalEmoji,
          actionType: globalActionType,
        };
      }
    }

    const actionType = (contactConfig.action_type && 
                        (contactConfig.action_type === 'view_only' || contactConfig.action_type === 'view_and_like'))
      ? contactConfig.action_type
      : globalActionType;

    const shouldLike = contactConfig.enabled && !contactConfig.watch_only && actionType === 'view_and_like';

    const finalEmoji = (contactConfig.emoji && contactConfig.emoji.trim() !== '') 
      ? contactConfig.emoji 
      : globalEmoji;

    logger.info(`[Status] 🎯 Final emoji for contact ${contactId}: "${finalEmoji}" (length: ${finalEmoji.length})`);

    return {
      shouldWatch,
      shouldLike,
      emoji: finalEmoji,
      actionType,
    };
  }

  // Premium plan: contact not in watch list, use global config as fallback
  logger.info(`[Status] Premium user ${userId}, contact ${contactId} not in watch list, using global config as fallback`);
  return {
    shouldWatch: true,
    shouldLike: globalActionType === 'view_and_like',
    emoji: globalEmoji,
    actionType: globalActionType,
  };
};


/**
 * Handle status update - detect and auto-view/like statuses
 */
export const handleStatusUpdate = async (
  userId: string,
  socket: WASocket,
  statusUpdate: any
): Promise<void> => {
  try {
    if (!statusUpdate || !statusUpdate.messages) {
      logger.debug(`[Status] No status update or messages for user ${userId}`);
      return;
    }

    // Vérifier d'abord si la configuration globale est activée (utilisation du cache)
    try {
      const cached = await getCachedConfig(userId);
      const globalConfig = cached.globalConfig;

      if (!globalConfig || !globalConfig.enabled) {
        logger.info(`[Status] ⚠️ Status processing is disabled in global config for user ${userId}`);
        return;
      }
    } catch (error) {
      logger.warn(`[Status] Error checking global config, continuing anyway:`, error);
    }

    logger.info(`[Status] 🔍 Checking ${statusUpdate.messages?.length || 0} message(s) for status updates for user ${userId}`);

    // Filtrer les messages de statut - vérification STRICTE comme dans OVL
    const statusMessages = statusUpdate.messages.filter((msg: any) => {
      const remoteJid = msg.key?.remoteJid;

      const isStatus = remoteJid === 'status@broadcast';

      if (isStatus) {
        logger.info(`[Status] ✅ Status message detected:`, {
          remoteJid,
          participant: msg.key?.participant,
          messageId: msg.key?.id,
          fromMe: msg.key?.fromMe,
          messageType: msg.message ? Object.keys(msg.message)[0] : 'unknown',
        });
      }

      return isStatus;
    });

    if (statusMessages.length === 0) {
      return;
    }

    logger.info(`[Status] 📱 Detected ${statusMessages.length} status message(s) for user ${userId}`);

    for (const statusMsg of statusMessages) {
      try {
        // Ignorer les statuts du bot lui-même
        if (statusMsg.key?.fromMe) {
          logger.info(`[Status] ⏭️ Skipping own status (fromMe: true) for user ${userId}`);
          continue;
        }

        const statusId = statusMsg.key?.id;
        if (!statusId) {
          logger.warn(`[Status] ⚠️ Status message without ID for user ${userId}`);
          continue;
        }

        // Extraire le contact depuis participant (comme dans OVL)
        let statusJid = statusMsg.key?.participant || null;

        if (!statusJid || statusJid === 'status@broadcast') {
          const messageContent = statusMsg.message;
          if (messageContent?.extendedTextMessage?.contextInfo?.participant) {
            statusJid = messageContent.extendedTextMessage.contextInfo.participant;
          } else if (messageContent?.imageMessage?.contextInfo?.participant) {
            statusJid = messageContent.imageMessage.contextInfo.participant;
          } else if (messageContent?.videoMessage?.contextInfo?.participant) {
            statusJid = messageContent.videoMessage.contextInfo.participant;
          }
        }

        if (!statusJid || statusJid === 'status@broadcast') {
          logger.warn(`[Status] ⚠️ Could not determine status author for status ${statusId}`, {
            hasParticipant: !!statusMsg.key?.participant,
            participant: statusMsg.key?.participant,
            messageKeys: statusMsg.message ? Object.keys(statusMsg.message) : [],
          });
          continue;
        }

        // Normaliser le statusJid
        if (!statusJid.includes('@')) {
          statusJid = `${statusJid}@s.whatsapp.net`;
        } else if (!statusJid.includes('@s.whatsapp.net') && !statusJid.includes('@g.us')) {
          if (statusJid.includes('@')) {
            const parts = statusJid.split('@');
            statusJid = `${parts[0]}@s.whatsapp.net`;
          }
        }

        logger.info(`[Status] 📱 Status detected from: ${statusJid} (ID: ${statusId})`);

        // Skip if this status was already processed recently (prevents loops)
        if (hasRecentlyProcessedStatus(userId, statusId)) {
          logger.debug(`[Status] ⏭️ Status ${statusId} already processed recently for user ${userId}, skipping`);
          continue;
        }
        markStatusAsProcessed(userId, statusId);

        // Récupérer le nom du contact
        let contactName: string | undefined = statusMsg.pushName;

        if (!contactName) {
          try {
            const existingLike = await prisma.statusLike.findFirst({
              where: {
                userId,
                contactId: statusJid,
              },
              orderBy: { likedAt: 'desc' },
              select: { contactName: true },
            });

            if (existingLike && existingLike.contactName &&
                existingLike.contactName !== statusJid.split('@')[0]) {
              contactName = existingLike.contactName;
              logger.info(`[Status] Contact name from database: ${contactName}`);
            }
          } catch (dbError) {
            logger.debug(`[Status] Could not get contact name from database:`, dbError);
          }
        }

        if (!contactName) {
          const phoneNumber = statusJid.split('@')[0];
          contactName = phoneNumber;
          logger.debug(`[Status] Using phone number as contact name: ${phoneNumber}`);
        } else {
          logger.info(`[Status] Contact name retrieved: ${contactName}`);
        }

        // Add contact to contacts table if not exists
        const finalContactName = contactName || statusJid.split('@')[0];
        await addContactIfNotExists(userId, statusJid, finalContactName);

        // Note: les médias des statuts ne sont JAMAIS stockés (confidentialité)
        // Seule la vue automatique et le like sont appliqués.

        // Vérifier si ce statut a déjà été liké récemment (éviter les duplications)
        const existingLike = await prisma.statusLike.findFirst({
          where: { userId, statusId },
          select: { id: true },
        });

        if (existingLike) {
          logger.debug(`[Status] ⏭️ Status ${statusId} already liked, skipping duplicate`);
          continue;
        }

        // Vérifier si on doit traiter ce statut
        logger.info(`[Status] 🔍 Checking if status should be processed for contact ${statusJid}`);
        const { shouldWatch, shouldLike, emoji, actionType } = await shouldProcessStatus(userId, statusJid);

        logger.info(`[Status] 📊 Processing decision for ${statusJid}:`, {
          shouldWatch,
          shouldLike,
          actionType,
          emoji: `"${emoji}"`,
          emojiLength: emoji?.length || 0,
        });

        if (!shouldWatch) {
          logger.info(`[Status] ⏭️ Status from ${statusJid} not in watch list, skipping (shouldWatch: ${shouldWatch})`);
          continue;
        }

        // Marquer le statut comme vu (toujours si shouldWatch est true)
        try {
          logger.info(`[Status] 👁️ Attempting to mark status as read: ${statusJid} (ID: ${statusId})`);
          await socket.readMessages([statusMsg.key]);
          logger.info(`[Status] ✅ Status marked as read successfully: ${statusJid}`);
        } catch (readError: any) {
          logger.warn(`[Status] ⚠️ Failed to mark status as read:`, {
            error: readError?.message || readError,
            statusJid,
            statusId,
          });
        }

        // Si actionType est 'view_only', on ne like PAS
        if (actionType === 'view_only') {
          logger.info(`[Status] ✅ Status marked as read only (view_only mode) for ${statusJid} - NO LIKE`);
          continue;
        }

        if (!shouldLike) {
          logger.info(`[Status] ✅ Status marked as read only (shouldLike=false) for ${statusJid} - NO LIKE`);
          continue;
        }

        // Attendre un peu avant de réagir (pour que le statut soit bien chargé)
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Utiliser l'emoji configuré (pas d'emoji aléatoire)
        const { normalizeEmoji } = await import('../utils/helpers');
        const originalEmoji = emoji && emoji.trim() !== '' ? emoji.trim() : '❤️';
        const reactionEmoji = normalizeEmoji(originalEmoji);

        logger.info(`[Status] 🎯 Using emoji for reaction:`, {
          emoji: reactionEmoji,
          original: originalEmoji,
          length: reactionEmoji.length,
        });

        // Essayer de réagir au statut
        try {
          logger.info(`[Status] 💝 Attempting to like status: ${statusJid} (ID: ${statusId}) with emoji ${reactionEmoji}`);

          await socket.sendMessage(statusMsg.key.remoteJid, {
            react: {
              text: reactionEmoji,
              key: statusMsg.key,
            },
          });

          logger.info(`[Status] ✅ ${reactionEmoji} Reaction sent to status: ${statusJid} (ID: ${statusId})`);

          // Sauvegarder le like dans la base de données (sans média)
          await likeStatus(userId, statusJid, statusId, reactionEmoji, contactName);

        } catch (reactError: any) {
          logger.warn(`[Status] ⚠️ Failed to send reaction:`, {
            error: reactError?.message || reactError,
            statusJid,
            statusId,
            emoji: reactionEmoji,
          });

          // Sauvegarder quand même dans la base de données (pour le tracking)
          try {
            await likeStatus(userId, statusJid, statusId, reactionEmoji, contactName);
            logger.info(`[Status] 💾 Status like saved to database (reaction may have failed)`);
          } catch (dbError) {
            logger.error(`[Status] ❌ Error saving status like to database:`, dbError);
          }
        }
      } catch (error: any) {
        logger.error(`[Status] ❌ Error processing individual status:`, {
          error: error?.message || error,
          stack: error?.stack,
          statusId: statusMsg.key?.id,
          statusJid: statusMsg.key?.participant,
          userId,
        });
      }
    }

    logger.info(`[Status] ✅ Finished processing ${statusMessages.length} status message(s) for user ${userId}`);
  } catch (error: any) {
    logger.error('[Status] ❌ Error handling status update:', {
      error: error?.message || error,
      stack: error?.stack,
      userId,
      messageCount: statusUpdate?.messages?.length || 0,
    });
  }
};


/**
 * Get status likes history
 */
export const getStatusLikesHistory = async (userId: string, limit: number = 100) => {
  try {
    // Calculate the cutoff time: 24 hours ago (WhatsApp statuses expire after 24h)
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Fetch from Prisma with 24h filter
    const data = await prisma.statusLike.findMany({
      where: {
        userId,
        likedAt: { gte: twentyFourHoursAgo }
      },
      orderBy: [
        { statusId: 'desc' },
        { likedAt: 'desc' }
      ]
    });
    
    // Filtrer les doublons par statusId (garder le plus récent)
    const uniqueStatuses = new Map<string, any>();
    if (data) {
      for (const like of data) {
        const statusId = like.statusId;
        if (!uniqueStatuses.has(statusId)) {
          uniqueStatuses.set(statusId, like);
        } else {
          const existing = uniqueStatuses.get(statusId);
          const existingDate = new Date(existing.likedAt || existing.createdAt);
          const currentDate = new Date(like.likedAt || like.createdAt);
          if (currentDate > existingDate) {
            uniqueStatuses.set(statusId, like);
          }
        }
      }
    }
    
    // Convertir en tableau et trier par date
    const uniqueData = Array.from(uniqueStatuses.values())
      .sort((a, b) => {
        const dateA = new Date(a.likedAt || a.createdAt);
        const dateB = new Date(b.likedAt || b.createdAt);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, limit);

    logger.info(`[Status] Retrieved ${uniqueData.length} active statuses (expired statuses filtered) for user ${userId}`);
    return uniqueData || [];
  } catch (error: any) {
    logger.error('[Status] Exception in getStatusLikesHistory:', error);
    throw error;
  }
};

/**
 * Get status statistics
 */
export const getStatusStats = async (userId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisWeek = new Date();
  thisWeek.setDate(thisWeek.getDate() - 7);

  // Get likes today
  const todayCount = await prisma.statusLike.count({
    where: {
      userId,
      likedAt: { gte: today }
    }
  });

  // Get likes this week
  const weekCount = await prisma.statusLike.count({
    where: {
      userId,
      likedAt: { gte: thisWeek }
    }
  });

  // Get total likes
  const totalCount = await prisma.statusLike.count({
    where: { userId }
  });

  return {
    likedToday: todayCount || 0,
    likedThisWeek: weekCount || 0,
    totalLiked: totalCount || 0,
  };
};

