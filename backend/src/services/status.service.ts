import { WASocket } from '@whiskeysockets/baileys';
import { getSupabaseClient } from '../config/database';
import { logger } from '../config/logger';
import { likeStatus, addContactIfNotExists, hasRecentlyProcessedStatus, markStatusAsProcessed } from './whatsapp.service';
import { getMediaType, processAndUploadMedia } from './media.service';

const supabase = getSupabaseClient();

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
  
  // Fetch fresh config from DB
  const [globalConfigResult, userResult, contactConfigsResult] = await Promise.all([
    supabase
      .from('status_config')
      .select('enabled, action_type, default_emoji')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('users')
      .select('plan')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('status_auto_like_config')
      .select('contact_id, enabled, emoji, action_type, watch_only')
      .eq('user_id', userId),
  ]);
  
  // Log what we got from the database
  logger.info(`[Status] 📊 Fetched config from DB for user ${userId}:`, {
    hasGlobalConfig: !!globalConfigResult.data,
    default_emoji: globalConfigResult.data?.default_emoji ? `"${globalConfigResult.data.default_emoji}" (length: ${globalConfigResult.data.default_emoji.length})` : 'not set',
    action_type: globalConfigResult.data?.action_type,
    enabled: globalConfigResult.data?.enabled,
    contactConfigsCount: contactConfigsResult.data?.length || 0,
  });
  
  const contactConfigsMap = new Map<string, {
    enabled: boolean;
    emoji: string;
    action_type: 'view_only' | 'view_and_like';
    watch_only: boolean;
  }>();
  
  // Build global config first to use as fallback
  // IMPORTANT: Use the value from DB directly, don't fallback to '❤️' if it's set
  const globalConfig = globalConfigResult.data ? {
    enabled: globalConfigResult.data.enabled || false,
    action_type: (globalConfigResult.data.action_type as 'view_only' | 'view_and_like') || 'view_and_like',
    // Use the emoji from DB if it exists, otherwise default to '❤️'
    // But if it's null/undefined in DB, use '❤️' as fallback
    default_emoji: (globalConfigResult.data.default_emoji && globalConfigResult.data.default_emoji.trim() !== '') 
      ? globalConfigResult.data.default_emoji 
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
  
  if (contactConfigsResult.data) {
    for (const config of contactConfigsResult.data) {
      // Use contact emoji if it exists and is not empty, otherwise use global default
      const contactEmoji = (config.emoji && config.emoji.trim() !== '') 
        ? config.emoji 
        : globalConfig.default_emoji;
      
      logger.debug(`[Status] Contact config for ${config.contact_id}:`, {
        contact_emoji: config.emoji ? `"${config.emoji}" (length: ${config.emoji.length})` : 'not set',
        final_emoji: `"${contactEmoji}" (length: ${contactEmoji.length})`,
        action_type: config.action_type || globalConfig.action_type,
      });
      
      contactConfigsMap.set(config.contact_id, {
        enabled: config.enabled || false,
        emoji: contactEmoji,
        action_type: (config.action_type && (config.action_type === 'view_only' || config.action_type === 'view_and_like'))
          ? (config.action_type as 'view_only' | 'view_and_like')
          : globalConfig.action_type,
        watch_only: config.watch_only || false,
      });
    }
  }
  
  const newCache: CachedConfig = {
    globalConfig: globalConfigResult.data ? globalConfig : null,
    userPlan: (userResult.data?.plan as 'free' | 'premium') || null,
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
  // Get global status config
  const { data: globalConfig } = await supabase
    .from('status_config')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Get contact-specific configs
  const { data: contactConfigs } = await supabase
    .from('status_auto_like_config')
    .select('*')
    .eq('user_id', userId);

  // Get user plan
  const { data: user } = await supabase
    .from('users')
    .select('plan')
    .eq('id', userId)
    .single();

  const isPremium = user?.plan === 'premium';

  // Build global config
  const config = {
    enabled: globalConfig?.enabled || false,
    actionType: globalConfig?.action_type || 'view_and_like' as 'view_only' | 'view_and_like',
    defaultEmoji: globalConfig?.default_emoji || '❤️',
    selectedContacts: contactConfigs?.filter((c) => c.enabled || c.watch_only).map((c) => c.contact_id) || [],
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
    
    // Utiliser DISTINCT ON pour éviter les duplications basées sur status_id
    // Filter out statuses older than 24 hours (expired statuses)
    const { data, error } = await supabase
      .from('status_likes')
      .select('*')
      .eq('user_id', userId)
      .gte('liked_at', twentyFourHoursAgo.toISOString()) // Only get statuses from last 24h
      .order('status_id', { ascending: false })
      .order('liked_at', { ascending: false });
    
    // Filtrer les doublons par status_id (garder le plus récent)
    const uniqueStatuses = new Map<string, any>();
    if (data) {
      for (const like of data) {
        const statusId = like.status_id;
        if (!uniqueStatuses.has(statusId)) {
          uniqueStatuses.set(statusId, like);
        } else {
          // Si on a déjà ce status_id, garder celui avec la date la plus récente
          const existing = uniqueStatuses.get(statusId);
          const existingDate = new Date(existing.liked_at || existing.created_at);
          const currentDate = new Date(like.liked_at || like.created_at);
          if (currentDate > existingDate) {
            uniqueStatuses.set(statusId, like);
          }
        }
      }
    }
    
    // Convertir en tableau et trier par date
    const uniqueData = Array.from(uniqueStatuses.values())
      .sort((a, b) => {
        const dateA = new Date(a.liked_at || a.created_at);
        const dateB = new Date(b.liked_at || b.created_at);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, limit);

    if (error) {
      logger.error('[Status] Error getting status likes history:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        userId,
      });
      throw new Error(`Failed to get status likes history: ${error.message || 'Unknown error'}`);
    }

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
  const { count: todayCount } = await supabase
    .from('status_likes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('liked_at', today.toISOString());

  // Get likes this week
  const { count: weekCount } = await supabase
    .from('status_likes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('liked_at', thisWeek.toISOString());

  // Get total likes
  const { count: totalCount } = await supabase
    .from('status_likes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  return {
    likedToday: todayCount || 0,
    likedThisWeek: weekCount || 0,
    totalLiked: totalCount || 0,
  };
};

