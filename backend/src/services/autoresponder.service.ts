import { WASocket } from '@whiskeysockets/baileys';
import { logger } from '../config/logger';
import { getSupabaseClient } from '../config/database';
import { captureViewOnceFromQuoted } from './viewOnce.service';
import { getSocket } from './whatsapp.service';

const supabase = getSupabaseClient();

/**
 * Handle incoming messages for autoresponder and View Once commands
 */
export const handleIncomingMessage = async (
  userId: string,
  socket: WASocket,
  message: any
): Promise<void> => {
  try {
    // Skip messages from self
    if (message.key?.fromMe) {
      return;
    }

    // Skip if no message content
    if (!message.message) {
      return;
    }

    // Extract message text
    const messageText = 
      message.message.conversation ||
      message.message.extendedTextMessage?.text ||
      message.message.imageMessage?.caption ||
      message.message.videoMessage?.caption ||
      '';

    if (!messageText) {
      return;
    }

    const senderId = message.key?.remoteJid;
    const senderName = message.pushName || senderId?.split('@')[0] || 'Unknown';
    const chatJid = senderId || '';

    if (!chatJid) {
      return;
    }

    // Détecter l'emoji 👀 (peut être seul ou avec d'autres caractères)
    const isViewOnceCommand = messageText.trim() === '👀' || 
                              messageText.trim().includes('👀');
    
    if (isViewOnceCommand) {
      logger.info(`[ViewOnce] 📨 View Once command detected (👀) from ${senderId}`);
      
      // Récupérer le quoted message (message répondu)
      const quotedMessage = 
        message.message.extendedTextMessage?.contextInfo?.quotedMessage ||
        message.message.imageMessage?.contextInfo?.quotedMessage ||
        message.message.videoMessage?.contextInfo?.quotedMessage ||
        null;

      if (!quotedMessage) {
        logger.warn(`[ViewOnce] ⚠️ No quoted message found for View Once command from ${senderId}`);
        // Pas de message d'erreur - silencieux
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

      // Capturer le View Once depuis le quoted message
      logger.info(`[ViewOnce] 📸 Capturing View Once from quoted message for user ${userId}`);
      
      const result = await captureViewOnceFromQuoted(
        userId,
        activeSocket,
        quotedMessage,
        chatJid,
        senderId || '',
        senderName,
        'dashboard' // Mode dashboard : sauvegarde silencieuse
      );

      if (result.success) {
        logger.info(`[ViewOnce] ✅ View Once captured successfully: ${result.captureId}`);
      } else {
        logger.warn(`[ViewOnce] ⚠️ View Once capture failed: ${result.error} - ${result.message}`);
        // Pas de message d'erreur dans le chat - silencieux
      }
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

