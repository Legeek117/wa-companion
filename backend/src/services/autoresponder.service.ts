import { WASocket, proto } from '@whiskeysockets/baileys';
import { logger } from '../config/logger';
import { getSupabaseClient } from '../config/database';
import { captureViewOnceFromQuoted } from './viewOnce.service';
import { getSocket } from './whatsapp.service';

const supabase = getSupabaseClient();

const extractQuotedMessage = (message: any): proto.IMessage | null => {
  if (!message?.message) {
    return null;
  }

  const contexts = [
    message.message?.extendedTextMessage?.contextInfo,
    message.message?.imageMessage?.contextInfo,
    message.message?.videoMessage?.contextInfo,
    message.message?.buttonsResponseMessage?.contextInfo,
    message.message?.listResponseMessage?.contextInfo,
    message.message?.interactiveResponseMessage?.contextInfo,
    message.message?.documentMessage?.contextInfo,
    message.message?.audioMessage?.contextInfo,
    message.message?.stickerMessage?.contextInfo,
  ].filter(Boolean);

  for (const context of contexts) {
    if (context?.quotedMessage) {
      const quoted = context.quotedMessage as proto.IMessage;
      if (quoted?.ephemeralMessage?.message) {
        return quoted.ephemeralMessage.message as proto.IMessage;
      }
      return quoted;
    }
  }

  if (message.message?.contextInfo?.quotedMessage) {
    const quoted = message.message.contextInfo.quotedMessage as proto.IMessage;
    if (quoted?.ephemeralMessage?.message) {
      return quoted.ephemeralMessage.message as proto.IMessage;
    }
    return quoted;
  }

  return null;
};

/**
 * Handle incoming messages for autoresponder and View Once commands
 */
export const handleIncomingMessage = async (
  userId: string,
  socket: WASocket,
  message: any
): Promise<void> => {
  try {
    // Skip if no message content
    if (!message.message) {
      return;
    }

    const fromMe = !!message.key?.fromMe;
    logger.info(`[Autoresponder] Incoming message`, {
      userId,
      messageId: message.key?.id,
      chat: message.key?.remoteJid,
      fromMe,
      hasMessage: !!message.message,
      messageKeys: message.message ? Object.keys(message.message) : [],
    });

    // Extract message text
    const messageText = 
      message.message.conversation ||
      message.message.extendedTextMessage?.text ||
      message.message.imageMessage?.caption ||
      message.message.videoMessage?.caption ||
      '';

    if (!messageText) {
      logger.info('[Autoresponder] Message has no textual content', {
        messageId: message.key?.id,
        chat: message.key?.remoteJid,
      });
      return;
    }

    const normalizedText = messageText.trim().toLowerCase();
    const quotedMessage = extractQuotedMessage(message);

    logger.info(`[ViewOnce] 🔍 Incoming message text: "${messageText}"`, {
      fromMe,
      hasQuoted: !!quotedMessage,
      messageType: Object.keys(message.message || {}),
    });

    const senderId = message.key?.remoteJid;
    const senderName = message.pushName || senderId?.split('@')[0] || 'Unknown';
    const chatJid = senderId || '';

    if (!chatJid) {
      return;
    }

    // Détecter la commande .vv uniquement
    const isVvCommand = normalizedText === '.vv' || normalizedText === '!vv';

    if (!isVvCommand) {
      // Aucune autre commande gérée pour l'instant
      return;
    }

    const commandLabel = '.vv';
    logger.info(`[ViewOnce] 📨 View Once command detected (${commandLabel}) from ${senderId}`, {
      fromMe,
      hasQuotedMessage: !!quotedMessage,
    });
    
    if (!quotedMessage) {
      logger.warn(`[ViewOnce] ⚠️ No quoted message found for View Once command from ${senderId}`, {
        messageId: message.key?.id,
        contextInfoKeys: Object.keys(message.message?.extendedTextMessage?.contextInfo || {}),
      });
      return;
    }

    // Récupérer le socket actif - essayer plusieurs méthodes
    let activeSocket = getSocket(userId);
    
    // Si pas de socket via getSocket, utiliser le socket passé en paramètre
    if (!activeSocket && socket) {
      logger.info(`[ViewOnce] Using socket from message parameter for user ${userId}`);
      activeSocket = socket;
    }
    
    // Si toujours pas de socket, essayer de reconnecter
    if (!activeSocket) {
      logger.warn(`[ViewOnce] No active socket for user ${userId}, attempting to reconnect...`);
      try {
        // Importer la fonction de reconnexion
        const { reconnectWhatsAppIfCredentialsExist } = await import('./whatsapp.service');
        const reconnected = await reconnectWhatsAppIfCredentialsExist(userId);
        if (reconnected) {
          activeSocket = getSocket(userId);
          logger.info(`[ViewOnce] ✅ Socket reconnected for user ${userId}`);
        }
      } catch (error) {
        logger.error(`[ViewOnce] Error attempting to reconnect socket:`, error);
      }
    }
    
    if (!activeSocket) {
      logger.error(`[ViewOnce] ❌ No active socket available for user ${userId} after reconnection attempt`);
      // Pas de message d'erreur - silencieux
      return;
    }

    const captureMode: 'vv' | 'viewonce' | 'dashboard' = 'vv';

    // Capturer le View Once depuis le quoted message
    logger.info(`[ViewOnce] 📸 Capturing View Once from quoted message for user ${userId}`, {
      commandType: captureMode,
      senderId,
      chatJid,
    });
    
    const result = await captureViewOnceFromQuoted(
      userId,
      activeSocket,
      quotedMessage,
      chatJid,
      senderId || '',
      senderName,
      captureMode
    );

    if (result.success) {
      logger.info(`[ViewOnce] ✅ View Once captured successfully: ${result.captureId}`, {
        fromMe,
        commandType: captureMode,
      });
    } else {
      logger.warn(`[ViewOnce] ⚠️ View Once capture failed: ${result.error} - ${result.message}`, {
        fromMe,
        commandType: captureMode,
      });
    }

    // TODO: Ajouter la logique pour l'autoresponder (mode offline/busy)
    // Cette partie sera implémentée plus tard si nécessaire

  } catch (error: any) {
    logger.error(`[Autoresponder] Error handling incoming message for user ${userId}:`, error);
    // Ne pas propager l'erreur pour éviter de bloquer le traitement des autres messages
  }
};

/**
 * Get autoresponder configuration for a user
 */
export const getAutoresponderConfig = async (userId: string) => {
  try {
    // Get user plan
    const { data: user } = await supabase
      .from('users')
      .select('plan')
      .eq('id', userId)
      .single();

    const isPremium = user?.plan === 'premium';

    // Get autoresponder configs
    const { data: configs } = await supabase
      .from('autoresponder_configs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    // Get autoresponder contacts (premium only)
    let contacts: any[] = [];
    if (isPremium) {
      const { data: contactConfigs } = await supabase
        .from('autoresponder_contacts')
        .select('*')
        .eq('user_id', userId)
        .order('contact_name', { ascending: true });
      
      contacts = contactConfigs || [];
    }

    return {
      configs: configs || [],
      contacts,
      isPremium,
    };
  } catch (error: any) {
    logger.error('[Autoresponder] Error getting config:', error);
    throw error;
  }
};

/**
 * Activate autoresponder mode
 */
export const activateMode = async (userId: string, mode: string, message?: string) => {
  try {
    // Check if config exists
    const { data: existing } = await supabase
      .from('autoresponder_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('mode', mode)
      .single();

    if (existing) {
      // Update existing config
      const { error } = await supabase
        .from('autoresponder_configs')
        .update({
          enabled: true,
          message: message || existing.message,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('mode', mode);

      if (error) throw error;
    } else {
      // Create new config
      const defaultMessage = mode === 'offline' 
        ? '🤖 Répondeur automatique\n\nBonjour ! Je ne suis pas disponible pour le moment.\nLaissez-moi un message, je vous répondrai dès que possible.\n\nMerci de votre compréhension !'
        : '⏰ Mode Occupé\n\nJe suis actuellement occupé(e) et ne peux pas répondre.\nJe reviendrai vers vous dès que possible.\n\nMerci de patienter !';

      const { error } = await supabase
        .from('autoresponder_configs')
        .insert({
          user_id: userId,
          mode,
          enabled: true,
          message: message || defaultMessage,
        });

      if (error) throw error;
    }

    // Deactivate other modes
    await supabase
      .from('autoresponder_configs')
      .update({
        enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .neq('mode', mode);

    logger.info(`[Autoresponder] Activated mode ${mode} for user ${userId}`);
  } catch (error: any) {
    logger.error('[Autoresponder] Error activating mode:', error);
    throw error;
  }
};

/**
 * Deactivate autoresponder mode
 */
export const deactivateMode = async (userId: string, mode: string) => {
  try {
    const { error } = await supabase
      .from('autoresponder_configs')
      .update({
        enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('mode', mode);

    if (error) throw error;

    logger.info(`[Autoresponder] Deactivated mode ${mode} for user ${userId}`);
  } catch (error: any) {
    logger.error('[Autoresponder] Error deactivating mode:', error);
    throw error;
  }
};

/**
 * Update contact filter for autoresponder
 */
export const updateContactFilter = async (
  userId: string,
  contactId: string,
  contactName: string,
  enabled: boolean,
  customMessage?: string
) => {
  try {
    // Check if contact config exists
    const { data: existing } = await supabase
      .from('autoresponder_contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('contact_id', contactId)
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('autoresponder_contacts')
        .update({
          enabled,
          custom_message: customMessage || null,
          contact_name: contactName,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('contact_id', contactId);

      if (error) throw error;
    } else {
      // Create new
      const { error } = await supabase
        .from('autoresponder_contacts')
        .insert({
          user_id: userId,
          contact_id: contactId,
          contact_name: contactName,
          enabled,
          custom_message: customMessage || null,
        });

      if (error) throw error;
    }

    logger.info(`[Autoresponder] Updated contact filter for ${contactId} (user ${userId})`);
  } catch (error: any) {
    logger.error('[Autoresponder] Error updating contact filter:', error);
    throw error;
  }
};

