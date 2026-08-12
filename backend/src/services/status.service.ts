import { WASocket } from '@whiskeysockets/baileys';
import { env } from '../config/env';
import prisma from '../config/database';
import { logger } from '../config/logger';
import { likeStatus, addContactIfNotExists, hasRecentlyProcessedStatus, markStatusAsProcessed } from './whatsapp.service';
import { getMediaType, processAndUploadMedia } from './media.service';

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
  // ⚠️ DÉSACTIVÉ POUR LE DÉPLOIEMENT
  // Seule la capture des View Once est conservée.
  logger.info(`[Status] ⚠️ Status processing is disabled for user ${userId} (Deployment phase)`);
  return {
    shouldWatch: false,
    shouldLike: false,
    emoji: '❤️',
    actionType: 'view_only',
  };
};


/**
 * Handle status update - detect and auto-like statuses
 * ⚠️ DÉSACTIVÉ POUR LE DÉPLOIEMENT
 */
export const handleStatusUpdate = async (
  _userId: string,
  _socket: WASocket,
  _statusUpdate: any
): Promise<void> => {
  // Seule la capture des View Once est conservée.
  // La fonctionnalité de téléchargement des status des autres est supprimée.
  return;
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

