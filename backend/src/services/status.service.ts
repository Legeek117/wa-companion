import { WASocket } from '@whiskeysockets/baileys';
import { getSupabaseClient } from '../config/database';
import { logger } from '../config/logger';
import { likeStatus, addContactIfNotExists } from './whatsapp.service';
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
    // IMPORTANT: If contact has explicit config with enabled=false and watch_only=false,
    // it means the user explicitly disabled this contact, so don't process it
    // But if enabled=false but watch_only=true, we should still watch it (view only)
    // If enabled=true, process it normally
    
    // Contact should be watched if:
    // 1. watch_only is true (watch but don't like), OR
    // 2. enabled is true (watch and optionally like)
    // If both are false, the contact is explicitly disabled
    const shouldWatch = contactConfig.watch_only || contactConfig.enabled;
    
    // If contact is explicitly disabled (both enabled and watch_only are false), 
    // check if this is a "default" disabled entry (created automatically) or explicit user choice
    // For premium users, if global config is enabled, we should still use it unless explicitly disabled
    if (!contactConfig.enabled && !contactConfig.watch_only) {
      // Check if this is an explicit disable or just a default entry
      // If global config is enabled, use it as fallback for premium users
      // This allows premium users to benefit from global config when no specific config is set
      if (globalConfig.enabled) {
        logger.info(`[Status] Premium user ${userId}, contact ${contactId} has disabled config but global config is enabled, using global config as fallback`);
        return {
          shouldWatch: true, // Use global config
          shouldLike: globalActionType === 'view_and_like',
          emoji: globalEmoji,
          actionType: globalActionType,
        };
      } else {
        logger.info(`[Status] Premium user ${userId}, contact ${contactId} is explicitly disabled (enabled=false, watch_only=false) and global config is disabled, skipping`);
        return {
          shouldWatch: false,
          shouldLike: false,
          emoji: globalEmoji, // Return global emoji as fallback
          actionType: globalActionType,
        };
      }
    }
    
    // Determine action type: use contact-specific if explicitly set, otherwise global
    // If contactConfig.action_type is null/undefined, use global
    const actionType = (contactConfig.action_type && 
                        (contactConfig.action_type === 'view_only' || contactConfig.action_type === 'view_and_like'))
      ? contactConfig.action_type
      : globalActionType;
    
    // Should like only if enabled (not watch_only) AND action_type is view_and_like
    const shouldLike = contactConfig.enabled && !contactConfig.watch_only && actionType === 'view_and_like';
    
    logger.info(`[Status] Premium user ${userId}, contact ${contactId} has specific config:`, {
      shouldWatch,
      shouldLike,
      enabled: contactConfig.enabled,
      watch_only: contactConfig.watch_only,
      action_type: contactConfig.action_type,
      contact_emoji: contactConfig.emoji ? `"${contactConfig.emoji}" (length: ${contactConfig.emoji.length})` : 'not set',
      global_emoji: `"${globalEmoji}" (length: ${globalEmoji.length})`,
    });
    
    // Ensure emoji is never empty or undefined
    // Use contact-specific emoji if set, otherwise fall back to global emoji
    const finalEmoji = (contactConfig.emoji && contactConfig.emoji.trim() !== '') 
      ? contactConfig.emoji 
      : globalEmoji;
    
    logger.info(`[Status] 🎯 Final emoji for contact ${contactId}: "${finalEmoji}" (length: ${finalEmoji.length}, source: ${(contactConfig.emoji && contactConfig.emoji.trim() !== '') ? 'contact-specific' : 'global'})`);
    
    return {
      shouldWatch,
      shouldLike,
      emoji: finalEmoji,
      actionType,
    };
  }

  // Premium plan: contact not in watch list (no explicit config), use global config as fallback
  // This allows premium users to still process statuses from contacts not explicitly configured
  // By default, process all contacts unless explicitly disabled
  logger.info(`[Status] Premium user ${userId}, contact ${contactId} not in watch list, using global config as fallback`);
  return {
    shouldWatch: true, // Use global config: watch all contacts by default
    shouldLike: globalActionType === 'view_and_like', // Use global action type
    emoji: globalEmoji,
    actionType: globalActionType,
  };
};

/**
 * Handle status update - detect and auto-like statuses
 * Inspiré du code de référence pour une meilleure détection et réaction
 */
export const handleStatusUpdate = async (
  userId: string,
  socket: WASocket,
  statusUpdate: any
): Promise<void> => {
  try {
    // Baileys emits status updates via messages.upsert
    // Status messages have remoteJid === 'status@broadcast' or include 'status'
    
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
      // En cas d'erreur, continuer quand même (la vérification sera faite dans shouldProcessStatus)
      logger.warn(`[Status] Error checking global config, continuing anyway:`, error);
    }

    // Traiter chaque message individuellement (comme dans OVL)
    // Vérifier si c'est un statut message par message
    logger.info(`[Status] 🔍 Checking ${statusUpdate.messages?.length || 0} message(s) for status updates for user ${userId}`);
    
    // Filtrer les messages de statut - vérification STRICTE comme dans OVL
    const statusMessages = statusUpdate.messages.filter((msg: any) => {
      const remoteJid = msg.key?.remoteJid;
      
      // Vérification STRICTE : remoteJid doit être exactement 'status@broadcast'
      // C'est la façon dont OVL détecte les statuts
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
      // Ne pas logger en debug - c'est normal s'il n'y a pas de statuts
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
        // Pour les statuts, le participant contient le JID du contact qui a posté le statut
        let statusJid = statusMsg.key?.participant || null;
        
        // Si pas de participant dans la clé, essayer depuis le message (contextInfo)
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

        // Si toujours pas de statusJid, on ne peut pas traiter ce statut
        if (!statusJid || statusJid === 'status@broadcast') {
          logger.warn(`[Status] ⚠️ Could not determine status author for status ${statusId}`, {
            hasParticipant: !!statusMsg.key?.participant,
            participant: statusMsg.key?.participant,
            messageKeys: statusMsg.message ? Object.keys(statusMsg.message) : [],
          });
          continue;
        }

        // Normaliser le statusJid (s'assurer qu'il a le format @s.whatsapp.net)
        if (!statusJid.includes('@')) {
          statusJid = `${statusJid}@s.whatsapp.net`;
        } else if (!statusJid.includes('@s.whatsapp.net') && !statusJid.includes('@g.us')) {
          // Si c'est un format différent, essayer de le convertir
          if (statusJid.includes('@')) {
            const parts = statusJid.split('@');
            statusJid = `${parts[0]}@s.whatsapp.net`;
          }
        }

        logger.info(`[Status] 📱 Status detected from: ${statusJid} (ID: ${statusId})`);

        // Récupérer le nom du contact depuis WhatsApp
        // Le nom est généralement disponible dans pushName du message
        let contactName: string | undefined = statusMsg.pushName;
        
        // Si pushName n'est pas disponible, essayer de récupérer depuis le store de contacts
        // Note: socket.store n'est pas disponible dans toutes les versions de Baileys
        // On utilise donc uniquement pushName et la base de données
        
        // Si toujours pas de nom, essayer de récupérer depuis la base de données (si déjà liké)
        if (!contactName) {
          try {
            const { data: existingLike } = await supabase
              .from('status_likes')
              .select('contact_name')
              .eq('user_id', userId)
              .eq('contact_id', statusJid)
              .order('liked_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (existingLike && existingLike.contact_name && 
                existingLike.contact_name !== statusJid.split('@')[0]) {
              contactName = existingLike.contact_name;
              logger.info(`[Status] Contact name from database: ${contactName}`);
            }
          } catch (dbError) {
            logger.debug(`[Status] Could not get contact name from database:`, dbError);
          }
        }
        
        // Si toujours pas de nom, utiliser le numéro de téléphone comme fallback
        if (!contactName) {
          const phoneNumber = statusJid.split('@')[0];
          contactName = phoneNumber;
          logger.debug(`[Status] Using phone number as contact name: ${phoneNumber}`);
        } else {
          logger.info(`[Status] Contact name retrieved: ${contactName}`);
        }

        // Add contact to contacts table if not exists (contactName is guaranteed to be defined at this point)
        const finalContactName = contactName || statusJid.split('@')[0];
        await addContactIfNotExists(userId, statusJid, finalContactName);

        // Extraire les médias du statut
        let mediaUrl: string | undefined;
        let mediaType: string | undefined;
        try {
          const message = statusMsg.message;
          if (message) {
            const mediaInfo = getMediaType({ message });
            if (mediaInfo.type && (mediaInfo.type === 'image' || mediaInfo.type === 'video')) {
              // Sauvegarder le média localement
              const uploadedMediaUrl = await processAndUploadMedia(
                socket,
                statusMsg,
                userId
              );
              if (uploadedMediaUrl) {
                mediaUrl = uploadedMediaUrl;
                mediaType = mediaInfo.type;
                logger.info(`[Status] 📸 Media saved for status ${statusId}: ${mediaUrl}`);
              }
            }
          }
        } catch (mediaError) {
          logger.warn(`[Status] Could not process media for status ${statusId}:`, mediaError);
        }

        // Vérifier si ce statut a déjà été liké récemment (éviter les duplications)
        const { data: existingLike } = await supabase
          .from('status_likes')
          .select('id')
          .eq('user_id', userId)
          .eq('status_id', statusId)
          .limit(1)
          .maybeSingle();

        if (existingLike) {
          logger.debug(`[Status] ⏭️ Status ${statusId} already liked, skipping duplicate`);
          continue;
        }

        // Vérifier si on doit traiter ce statut
        logger.info(`[Status] 🔍 Checking if status should be processed for contact ${statusJid}`);
        const { shouldWatch, shouldLike, emoji, actionType } = await shouldProcessStatus(userId, statusJid);
        
        // Log the decision with more context
        logger.info(`[Status] 📊 Processing decision for ${statusJid}:`, {
          shouldWatch,
          shouldLike,
          actionType,
          emoji: `"${emoji}"`,
          emojiLength: emoji?.length || 0,
          emojiCodePoints: emoji ? Array.from(emoji).map((c: string) => c.codePointAt(0)?.toString(16)).join(',') : 'none',
          reason: !shouldWatch ? 'Contact not in watch list or explicitly disabled' : (shouldLike ? 'Will watch and like' : 'Will watch only'),
        });

        if (!shouldWatch) {
          logger.info(`[Status] ⏭️ Status from ${statusJid} not in watch list, skipping (shouldWatch: ${shouldWatch})`);
          continue;
        }

        // Marquer le statut comme vu (toujours si shouldWatch est true)
        // Utiliser readMessages avec la clé du message directement (comme dans OVL)
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
          // Continuer même si la lecture échoue
        }

        // Si actionType est 'view_only', on ne like PAS (double vérification)
        // Vérifier à la fois actionType et shouldLike pour être sûr
        if (actionType === 'view_only') {
          logger.info(`[Status] ✅ Status marked as read only (view_only mode) for ${statusJid} - NO LIKE`);
          continue;
        }
        
        // Si shouldLike est false, on ne like pas non plus
        if (!shouldLike) {
          logger.info(`[Status] ✅ Status marked as read only (shouldLike=false) for ${statusJid} - NO LIKE`);
          continue;
        }

        // Attendre un peu avant de réagir (pour que le statut soit bien chargé)
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Utiliser l'emoji configuré (pas d'emoji aléatoire)
        // Vérifier que l'emoji est valide et non vide
        // Normalize emoji to NFC format for iPhone compatibility
        const { normalizeEmoji } = await import('../utils/helpers');
        const originalEmoji = emoji && emoji.trim() !== '' ? emoji.trim() : '❤️';
        const reactionEmoji = normalizeEmoji(originalEmoji);
        
        // Log detailed emoji information for debugging iPhone issues
        const codePoints = Array.from(reactionEmoji).map((e: string) => {
          const cp = e.codePointAt(0);
          return cp ? `U+${cp.toString(16).toUpperCase().padStart(4, '0')}` : '?';
        });
        const bytes = Buffer.from(reactionEmoji, 'utf8');
        
        logger.info(`[Status] 🎯 Using emoji for reaction:`, {
          emoji: reactionEmoji,
          original: originalEmoji,
          length: reactionEmoji.length,
          codePoints: codePoints.join(' '),
          bytes: Array.from(bytes).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '),
          normalized: reactionEmoji.normalize('NFC') === reactionEmoji ? 'NFC' : 'other',
        });

        // Essayer de réagir au statut (méthode inspirée d'OVL)
        // OVL utilise: sendMessage avec react, statusJidList et broadcast: true
        try {
          logger.info(`[Status] 💝 Attempting to like status: ${statusJid} (ID: ${statusId}) with emoji ${reactionEmoji}`);
          
          // Méthode OVL: Utiliser statusJidList avec remoteJid et participant, et broadcast: true
          const statusJidList = [statusMsg.key.remoteJid, statusJid];
          
          await socket.sendMessage(statusMsg.key.remoteJid, {
            react: {
              text: reactionEmoji,
              key: statusMsg.key
            }
          }, {
            statusJidList: statusJidList,
            broadcast: true
          } as any);
          
          logger.info(`[Status] ✅ ${reactionEmoji} Reaction sent to status: ${statusJid} (ID: ${statusId})`);
          
          // Sauvegarder le like dans la base de données avec le nom du contact et les médias
          await likeStatus(userId, statusJid, statusId, reactionEmoji, contactName, mediaUrl, mediaType);
          
        } catch (reactError: any) {
          logger.warn(`[Status] ⚠️ Failed to send reaction:`, {
            error: reactError?.message || reactError,
            statusJid,
            statusId,
            emoji: reactionEmoji,
          });
          
          // Sauvegarder quand même dans la base de données (pour le tracking)
          try {
            await likeStatus(userId, statusJid, statusId, reactionEmoji, contactName, mediaUrl, mediaType);
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
        // Continue avec le statut suivant même en cas d'erreur
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
    // Ne pas bloquer le traitement des autres messages
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

