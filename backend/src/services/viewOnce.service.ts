import { WASocket, downloadMediaMessage, proto } from '@whiskeysockets/baileys';
import { getSupabaseClient } from '../config/database';
import { logger } from '../config/logger';
import { checkViewOnceQuota, incrementViewOnce } from './quota.service';

const supabase = getSupabaseClient();

/**
 * Handle view once message - capture and save automatically
 * 
 * ⚠️ DÉSACTIVÉ : Cette méthode ne fonctionne plus depuis 2024
 * Les View Once ne s'affichent plus sur les appareils connectés (Web/Desktop/Baileys)
 * 
 * La seule méthode fonctionnelle est via quoted messages (captureViewOnceFromQuoted)
 * Voir : https://github.com/WhiskeySockets/Baileys/issues/XXX
 * 
 * Cette fonction est conservée pour référence mais ne sera jamais appelée
 */
export const handleViewOnceMessage = async (
  _userId: string,
  _socket: WASocket,
  _message: any
): Promise<void> => {
  // DÉSACTIVÉ : Les View Once ne sont plus accessibles directement
  // Utiliser captureViewOnceFromQuoted() via quoted messages à la place
  logger.debug('[ViewOnce] ⚠️ handleViewOnceMessage called but disabled - View Once not accessible on connected devices');
  return;
  
  /* CODE DÉSACTIVÉ - NE FONCTIONNE PLUS
  try {
    // Check if message is view once
    const isViewOnce = message.message?.viewOnceMessageV2 || 
                       message.message?.viewOnceMessage ||
                       message.message?.ephemeralMessage?.message?.viewOnceMessageV2;

    if (!isViewOnce) {
      return;
    }

    // Get the actual message content (image or video)
    const viewOnceContent = message.message?.viewOnceMessageV2?.message ||
                           message.message?.viewOnceMessage?.message ||
                           message.message?.ephemeralMessage?.message?.viewOnceMessageV2?.message;

    if (!viewOnceContent) {
      return;
    }

    const senderId = message.key?.remoteJid;
    const senderName = message.pushName || senderId || 'Unknown';
    const messageId = message.key?.id;

    if (!senderId || !messageId) {
      return;
    }

    // Skip messages from self
    if (!message.key?.fromMe && senderId) {
      // Add contact to contacts table if not exists
      await addContactIfNotExists(userId, senderId, senderName);
    }

    // Check quota before capturing
    try {
      await checkViewOnceQuota(userId);
    } catch (error: any) {
      if (error.message?.includes('quota exceeded')) {
        logger.warn(`[ViewOnce] Quota exceeded for user ${userId}, skipping capture`);
        return;
      }
      throw error;
    }

    // Determine media type and URL
    let mediaUrl = '';
    let mediaType: 'image' | 'video' = 'image';

    if (viewOnceContent.imageMessage) {
      mediaType = 'image';
      // Process and upload media
      const uploadedUrl = await processAndUploadMedia(socket, message, userId);
      if (uploadedUrl) {
        mediaUrl = uploadedUrl;
      } else {
        // Fallback: store message reference
        mediaUrl = `viewonce:${messageId}`;
        logger.warn(`[ViewOnce] Failed to upload media, using fallback for message ${messageId}`);
      }
    } else if (viewOnceContent.videoMessage) {
      mediaType = 'video';
      // Process and upload media
      const uploadedUrl = await processAndUploadMedia(socket, message, userId);
      if (uploadedUrl) {
        mediaUrl = uploadedUrl;
      } else {
        // Fallback: store message reference
        mediaUrl = `viewonce:${messageId}`;
        logger.warn(`[ViewOnce] Failed to upload media, using fallback for message ${messageId}`);
      }
    } else {
      logger.warn(`[ViewOnce] Unknown view once content type for message ${messageId}`);
      return;
    }

    // Save to database
    const { error: insertError } = await supabase
      .from('view_once_captures')
      .insert({
        user_id: userId,
        sender_id: senderId,
        sender_name: senderName,
        media_url: mediaUrl,
        media_type: mediaType,
        captured_at: new Date().toISOString(),
      });

    if (insertError) {
      logger.error('[ViewOnce] Error saving view once capture:', insertError);
      throw new Error('Failed to save view once capture');
    }

    // Increment quota
    await incrementViewOnce(userId);

    logger.info(`[ViewOnce] Captured view once ${mediaType} from ${senderName} for user ${userId}`);
  } catch (error: any) {
    if (error.message?.includes('quota exceeded')) {
      logger.warn(`[ViewOnce] Quota exceeded for user ${userId}`);
      return;
    }
    logger.error('[ViewOnce] Error handling view once message:', error);
  }
  */
};

/**
 * Get view once captures for a user
 */
export const getViewOnceCaptures = async (userId: string, limit: number = 50) => {
  const { data, error } = await supabase
    .from('view_once_captures')
    .select('*')
    .eq('user_id', userId)
    .order('captured_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('[ViewOnce] Error getting captures:', error);
    throw new Error('Failed to get view once captures');
  }

  return data || [];
};

/**
 * Get view once capture by ID
 */
export const getViewOnceCapture = async (userId: string, captureId: string) => {
  const { data, error } = await supabase
    .from('view_once_captures')
    .select('*')
    .eq('id', captureId)
    .eq('user_id', userId)
    .single();

  if (error) {
    logger.error('[ViewOnce] Error getting capture:', error);
    throw new Error('Failed to get view once capture');
  }

  return data;
};

/**
 * Get view once statistics
 */
export const getViewOnceStats = async (userId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  // Get captures today
  const { count: todayCount } = await supabase
    .from('view_once_captures')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('captured_at', today.toISOString());

  // Get captures this month
  const { count: monthCount } = await supabase
    .from('view_once_captures')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('captured_at', thisMonth.toISOString());

  // Get total captures
  const { count: totalCount } = await supabase
    .from('view_once_captures')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  return {
    capturedToday: todayCount || 0,
    capturedThisMonth: monthCount || 0,
    totalCaptured: totalCount || 0,
  };
};

/**
 * ============================================
 * NOUVELLE LOGIQUE : CAPTURE VIA QUOTED MESSAGE
 * ============================================
 * 
 * IMPORTANT: Les View Once ne sont plus accessibles directement
 * sur les appareils connectés (Web/Desktop/Baileys) depuis 2024.
 * La seule méthode fonctionnelle est de capturer depuis un message quoté.
 * 
 * Workflow:
 * 1. L'utilisateur reçoit un View Once sur son téléphone
 * 2. Sans l'ouvrir, il répond avec une commande (.vv ou .viewonce)
 * 3. Le bot extrait le View Once depuis le message quoté
 * 4. Le bot télécharge et sauvegarde le média
 */

/**
 * Extract View Once data from a quoted message
 */
const extractViewOnceFromQuoted = (quotedMessage: proto.IMessage | null | undefined): {
  type: 'image' | 'video' | 'audio' | null;
  caption: string;
  innerMessage: proto.IMessage | null;
  mediaMessage: any;
  viewOnceKey: string | null;
} | null => {
  try {
    if (!quotedMessage) {
      return null;
    }

    let workingMessage: any = quotedMessage;

    if (workingMessage.ephemeralMessage?.message) {
      logger.info('[ViewOnce] 🔁 Unwrapping ephemeral quoted message', {
        keys: Object.keys(workingMessage.ephemeralMessage.message || {}),
      });
      workingMessage = workingMessage.ephemeralMessage.message;
    }

    logger.info('[ViewOnce] 🔍 Extracting View Once from quoted message...', {
      quotedKeys: Object.keys(workingMessage || {}),
    });

    // Chercher la clé viewOnceMessage dans toutes ses variantes
    let viewOnceKey: string | null = null;
    let innerMessage: proto.IMessage | null = null;

    // Méthode 1 : Recherche directe
    const possibleKeys = [
      'viewOnceMessage',
      'viewOnceMessageV2',
      'viewOnceMessageV2Extension'
    ];

    for (const key of possibleKeys) {
      if (workingMessage[key]) {
        viewOnceKey = key;
        innerMessage = workingMessage[key].message || null;
        break;
      }
    }

    // Méthode 2 : Recherche dans les clés
    if (!viewOnceKey && workingMessage) {
      const keys = Object.keys(workingMessage);
      viewOnceKey = keys.find(key => key.startsWith('viewOnce')) || null;
      
      if (viewOnceKey) {
        innerMessage = workingMessage[viewOnceKey]?.message || null;
      }
    }

    // Méthode 3 : Ancien format viewOnce directement sur image/video/audio
    if (!innerMessage) {
      if (workingMessage.imageMessage?.viewOnce) {
        viewOnceKey = 'imageMessage.viewOnce';
        innerMessage = { imageMessage: workingMessage.imageMessage } as proto.IMessage;
      } else if (workingMessage.videoMessage?.viewOnce) {
        viewOnceKey = 'videoMessage.viewOnce';
        innerMessage = { videoMessage: workingMessage.videoMessage } as proto.IMessage;
      } else if (workingMessage.audioMessage?.viewOnce) {
        viewOnceKey = 'audioMessage.viewOnce';
        innerMessage = { audioMessage: workingMessage.audioMessage } as proto.IMessage;
      }
    }

    if (!innerMessage) {
      logger.warn('[ViewOnce] ⚠️ No View Once content found in quoted message');
      return null;
    }

    // Extraire le type et le contenu
    let type: 'image' | 'video' | 'audio' | null = null;
    let caption = '';
    let mediaMessage: any = null;

    if (innerMessage.imageMessage) {
      type = 'image';
      caption = innerMessage.imageMessage.caption || '';
      mediaMessage = innerMessage.imageMessage;
    } else if (innerMessage.videoMessage) {
      type = 'video';
      caption = innerMessage.videoMessage.caption || '';
      mediaMessage = innerMessage.videoMessage;
    } else if (innerMessage.audioMessage) {
      type = 'audio';
      caption = '';
      mediaMessage = innerMessage.audioMessage;
    } else {
      logger.warn('[ViewOnce] ⚠️ Unsupported View Once type');
      return null;
    }

    // Vérifier que c'est bien un View Once (pas déjà ouvert)
    // Note: Cette vérification peut ne pas être fiable car WhatsApp peut ne pas inclure le flag
    // On continue quand même car si c'est dans un quoted message, c'est probablement un View Once
    if (mediaMessage.viewOnce !== true && mediaMessage.viewOnce !== 1) {
      logger.debug('[ViewOnce] ⚠️ View Once flag not found, but continuing anyway (may have been viewed or flag not present)');
      // On continue quand même car le flag peut ne pas être présent même pour un View Once valide
    }

    logger.info(`[ViewOnce] ✅ Extracted View Once: ${type}`, {
      innerKeys: Object.keys(innerMessage || {}),
      mediaHasUrl: !!mediaMessage?.url,
      viewOnceKey,
    });
    
    return {
      type,
      caption,
      innerMessage,
      mediaMessage,
      viewOnceKey,
    };
  } catch (error) {
    logger.error('[ViewOnce] ❌ Error extracting View Once from quoted:', error);
    return null;
  }
};

/**
 * Download media from quoted View Once message
 */
const downloadViewOnceFromQuoted = async (
  socket: WASocket,
  viewOnceData: {
    type: 'image' | 'video' | 'audio';
    innerMessage: proto.IMessage;
  },
  userId: string,
  chatJid: string,
  senderId?: string
): Promise<{
      success: boolean;
      buffer?: Buffer;
      filename?: string;
      error?: string;
}> => {
  try {
    logger.info('[ViewOnce] 📥 Downloading View Once media from quoted...', {
      chatJid,
      senderId,
      hasUrl: !!(viewOnceData.innerMessage as any)?.imageMessage?.url || !!(viewOnceData.innerMessage as any)?.videoMessage?.url,
    });

    // Créer un message formaté pour le téléchargement
    // Format requis par downloadMediaMessage de Baileys
    const downloadMessage = {
      message: viewOnceData.innerMessage,
      key: {
        id: Buffer.from(Date.now().toString() + Math.random().toString()).toString('base64'),
        remoteJid: chatJid,
        fromMe: false,
        participant: chatJid.endsWith('@g.us') ? senderId : undefined,
      },
    };

    // Télécharger avec timeout
    // Note: downloadMediaMessage nécessite le socket pour télécharger
    // Créer un logger silencieux pour le téléchargement
    const silentLogger = {
      level: 'silent',
      trace: () => {},
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      fatal: () => {},
      child: () => silentLogger,
    };
    
    // Télécharger le média avec downloadMediaMessage
    // Cette fonction nécessite le socket actif pour accéder au média
    const downloadPromise = downloadMediaMessage(
      downloadMessage as any,
      'buffer',
      {},
      {
        logger: silentLogger as any,
        reuploadRequest: socket.updateMediaMessage,
      }
    ).catch((error: any) => {
      // Améliorer les messages d'erreur
      if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
        throw new Error('Téléchargement timeout - le média a peut-être expiré');
      }
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        throw new Error('Média non trouvé - le View Once a peut-être expiré ou été supprimé');
      }
      if (error.message?.includes('decrypt') || error.message?.includes('decryption')) {
        throw new Error('Erreur de décryptage - le View Once a peut-être déjà été ouvert');
      }
      throw error;
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Download timeout after 30 seconds')), 30000);
    });

    const buffer = await Promise.race([downloadPromise, timeoutPromise]) as Buffer;

    if (!buffer || buffer.length === 0) {
      throw new Error('Empty buffer received');
    }

    logger.info(`[ViewOnce] ✅ Downloaded: ${buffer.length} bytes`);

    // Générer nom de fichier
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const extension = viewOnceData.type === 'video' ? 'mp4' : (viewOnceData.type === 'audio' ? 'mp3' : 'jpg');
    const filename = `${userId}_${timestamp}_${random}.${extension}`;

    // Upload vers Supabase Storage (ou local en fallback)
    const { uploadMedia } = await import('./media.service');
    const mimeType = viewOnceData.type === 'video' ? 'video/mp4' : (viewOnceData.type === 'audio' ? 'audio/mp3' : 'image/jpeg');
    const mediaUrl = await uploadMedia(buffer, filename, mimeType, 'view-once', userId);
    
    logger.info(`[ViewOnce] 💾 Saved: ${mediaUrl}`);

    return {
      success: true,
      buffer,
      filename,
    };
  } catch (error: any) {
    logger.error('[ViewOnce] ❌ Download error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
};

/**
 * Capture View Once from a quoted message
 * This is the ONLY reliable method to capture View Once messages in 2024+
 */
export const captureViewOnceFromQuoted = async (
  userId: string,
  socket: WASocket,
  quotedMessage: proto.IMessage | null | undefined,
  chatJid: string,
  senderId: string,
  senderName: string,
  commandType: 'vv' | 'dashboard' = 'dashboard'
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  captureId?: string;
}> => {
  try {
    logger.info('[ViewOnce] 📨 Processing View Once capture from quoted message...');

    // 1. Vérifier que c'est bien un message quoté
    if (!quotedMessage) {
      return {
        success: false,
        error: 'no_quoted',
        message: '❌ Veuillez répondre à un message View Once avec cette commande',
      };
    }

    // 2. Extraire le View Once depuis le quoted
    const viewOnceData = extractViewOnceFromQuoted(quotedMessage);

    if (!viewOnceData || !viewOnceData.type) {
      return {
        success: false,
        error: 'not_viewonce',
        message: '❌ Ce message n\'est pas un View Once ou il a déjà expiré',
      };
    }

    logger.info(`[ViewOnce] ✅ Found View Once: ${viewOnceData.type}`, {
      captionLength: viewOnceData.caption?.length || 0,
      hasUrl: !!viewOnceData.mediaMessage?.url,
      viewOnceKey: viewOnceData.viewOnceKey,
    });

    // 3. Vérifier les quotas
    try {
      await checkViewOnceQuota(userId);
    } catch (error: any) {
      if (error.message?.includes('quota exceeded')) {
        const { data: user } = await supabase
          .from('users')
          .select('plan')
          .eq('id', userId)
          .single();
        
        const isPremium = user?.plan === 'premium';
        const limit = isPremium ? 'illimité' : '3';
        
        return {
          success: false,
          error: 'quota_exceeded',
          message: `⚠️ Limite de ${limit} View Once atteinte.\n\n💎 Passez à Premium pour captures illimitées !`,
        };
      }
      throw error;
    }

    // 4. Télécharger le média
    logger.info(`[ViewOnce] 📥 Starting download for ${viewOnceData.type}...`);
    const downloadResult = await downloadViewOnceFromQuoted(
      socket,
      {
        type: viewOnceData.type,
        innerMessage: viewOnceData.innerMessage!,
      },
      userId,
      chatJid,
      senderId,
    );

    if (!downloadResult.success || !downloadResult.buffer) {
      const errorMsg = downloadResult.error || 'Unknown error';
      logger.error(`[ViewOnce] ❌ Download failed: ${errorMsg}`);
      
      // Messages d'erreur plus spécifiques
      let userMessage = '❌ Impossible de télécharger le média.';
      if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
        userMessage = '❌ Le téléchargement a pris trop de temps. Le View Once a peut-être expiré.';
      } else if (errorMsg.includes('not found') || errorMsg.includes('404')) {
        userMessage = '❌ Le View Once a expiré ou a été supprimé.';
      } else if (errorMsg.includes('decrypt') || errorMsg.includes('decryption')) {
        userMessage = '❌ Le View Once a déjà été ouvert et ne peut plus être téléchargé.';
      }
      
      return {
        success: false,
        error: 'download_failed',
        message: userMessage,
      };
    }
    
    logger.info(`[ViewOnce] ✅ Download successful: ${downloadResult.buffer.length} bytes`);

    // 5. Upload vers Supabase Storage (ou local en fallback)
    // Le buffer est déjà téléchargé, on l'upload maintenant
    const { uploadMedia } = await import('./media.service');
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const extension = viewOnceData.type === 'video' ? 'mp4' : (viewOnceData.type === 'audio' ? 'mp3' : 'jpg');
    const filename = `${userId}_${timestamp}_${random}.${extension}`;
    const mimeType = viewOnceData.type === 'video' ? 'video/mp4' : (viewOnceData.type === 'audio' ? 'audio/mp3' : 'image/jpeg');
    const mediaUrl = await uploadMedia(downloadResult.buffer, filename, mimeType, 'view-once', userId);

    // 6. Sauvegarder en base de données
    const fileSize = downloadResult.buffer.length;

    const { data: capture, error: insertError } = await supabase
      .from('view_once_captures')
      .insert({
        user_id: userId,
        sender_id: senderId,
        sender_name: senderName,
        media_url: mediaUrl,
        media_type: viewOnceData.type,
        file_size: fileSize,
        captured_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !capture) {
      logger.error('[ViewOnce] Error saving to database:', insertError);
      return {
        success: false,
        error: 'db_error',
        message: '❌ Erreur lors de la sauvegarde',
      };
    }

    // 7. Incrémenter le quota
    await incrementViewOnce(userId).catch((err) => {
      logger.warn('[ViewOnce] Error incrementing quota:', err);
    });

    // 8. Mode silencieux : ne rien envoyer dans le chat
    // Le View Once est capturé et sauvegardé silencieusement pour le dashboard
    // L'utilisateur peut le consulter dans le dashboard sans que l'expéditeur soit notifié

    logger.info(`[ViewOnce] ✅ View Once captured successfully: ${capture.id}`);

    // 9. Envoyer une notification push
    try {
      const { sendPushNotification } = await import('./notifications.service');
      await sendPushNotification(userId, {
        title: 'View Once capturé',
        body: `Nouveau View Once de ${senderName}`,
        image: mediaUrl || undefined,
        data: {
          type: 'view_once',
          id: capture.id,
          senderId,
          senderName,
        },
      });
    } catch (notifError) {
      logger.warn('[ViewOnce] Failed to send push notification:', notifError);
    }

    return {
      success: true,
      captureId: capture.id,
      message: '✅ View Once capturé avec succès !',
    };
  } catch (error: any) {
    logger.error('[ViewOnce] ❌ Capture error:', error);
    return {
      success: false,
      error: 'unknown',
      message: '❌ Erreur lors de la capture : ' + (error.message || 'Unknown error'),
    };
  }
};











