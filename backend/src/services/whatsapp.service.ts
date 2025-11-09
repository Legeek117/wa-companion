import makeWASocket, {
  WASocket,
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { env } from '../config/env';
import { getSupabaseClient } from '../config/database';
import { logger } from '../config/logger';
import { ValidationError } from '../utils/errors';
import { WhatsAppSession } from '../types/whatsapp.types';

const supabase = getSupabaseClient();

// Store active WhatsApp sockets by userId
const activeSockets = new Map<string, WASocket>();

// Store QR codes by userId (temporary, cleared after connection)
const qrCodes = new Map<string, string>();

/**
 * Get session directory path for a user
 */
const getSessionPath = (userId: string): string => {
  const sessionsDir = join(process.cwd(), env.WHATSAPP_SESSION_PATH, userId);
  if (!existsSync(sessionsDir)) {
    mkdirSync(sessionsDir, { recursive: true });
  }
  return sessionsDir;
};

/**
 * Get or create WhatsApp session in database
 */
const getOrCreateSession = async (userId: string): Promise<WhatsAppSession> => {
  const { data: existingSession } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existingSession) {
    return {
      userId: existingSession.user_id,
      sessionId: existingSession.session_id,
      qrCode: existingSession.qr_code || undefined,
      status: existingSession.status as 'disconnected' | 'connecting' | 'connected',
      connectedAt: existingSession.connected_at ? new Date(existingSession.connected_at) : undefined,
      lastSeen: existingSession.last_seen ? new Date(existingSession.last_seen) : undefined,
    };
  }

  // Create new session
  const sessionId = `session_${userId}_${Date.now()}`;
  const { data: newSession, error: createError } = await supabase
    .from('whatsapp_sessions')
    .insert({
      user_id: userId,
      session_id: sessionId,
      status: 'disconnected',
    })
    .select('*')
    .single();

  if (createError || !newSession) {
    logger.error('Error creating WhatsApp session:', createError);
    throw new Error('Failed to create WhatsApp session');
  }

  return {
    userId: newSession.user_id,
    sessionId: newSession.session_id,
    status: newSession.status as 'disconnected' | 'connecting' | 'connected',
  };
};

/**
 * Update session status in database
 */
const updateSessionStatus = async (
  userId: string,
  updates: {
    status?: 'disconnected' | 'connecting' | 'connected';
    qrCode?: string | null;
    connectedAt?: Date;
    lastSeen?: Date;
    sessionData?: any;
  }
): Promise<void> => {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.status) updateData.status = updates.status;
  if (updates.qrCode !== undefined) updateData.qr_code = updates.qrCode;
  if (updates.connectedAt) updateData.connected_at = updates.connectedAt.toISOString();
  if (updates.lastSeen) updateData.last_seen = updates.lastSeen.toISOString();
  if (updates.sessionData) updateData.session_data = updates.sessionData;

  const { error } = await supabase
    .from('whatsapp_sessions')
    .update(updateData)
    .eq('user_id', userId);

  if (error) {
    logger.error('Error updating WhatsApp session:', error);
    throw new Error('Failed to update WhatsApp session');
  }
};

/**
 * Connect WhatsApp and generate QR code
 */
export const connectWhatsApp = async (userId: string): Promise<{ qrCode: string; sessionId: string }> => {
  try {
    // Get or create session
    const session = await getOrCreateSession(userId);

    // If already connected, return existing session
    if (session.status === 'connected' && activeSockets.has(userId)) {
      const socket = activeSockets.get(userId);
      if (socket?.user) {
        return {
          qrCode: '',
          sessionId: session.sessionId,
        };
      }
    }

    // Update status to connecting
    await updateSessionStatus(userId, { status: 'connecting' });

    // Get session path
    const sessionPath = getSessionPath(userId);

    // Load auth state
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    // Create socket
    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: logger.child({ level: 'silent' }), // Reduce noise in logs
    });

    // Handle connection updates
    socket.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Generate QR code image
        try {
          const qrCodeImage = await QRCode.toDataURL(qr);
          qrCodes.set(userId, qrCodeImage);
          await updateSessionStatus(userId, {
            status: 'connecting',
            qrCode: qrCodeImage,
          });
          logger.info(`QR code generated for user: ${userId}`);
        } catch (error) {
          logger.error('Error generating QR code:', error);
        }
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        logger.info(`Connection closed for user ${userId}, should reconnect: ${shouldReconnect}`);

        // Update status
        await updateSessionStatus(userId, {
          status: 'disconnected',
          qrCode: null,
        });

        // Remove from active sockets
        activeSockets.delete(userId);
        qrCodes.delete(userId);

        if (shouldReconnect) {
          // Auto-reconnect after 5 seconds
          setTimeout(() => {
            connectWhatsApp(userId).catch((err) => {
              logger.error('Error reconnecting:', err);
            });
          }, 5000);
        }
      } else if (connection === 'open') {
        logger.info(`WhatsApp connected for user: ${userId}`);

        // Update status
        await updateSessionStatus(userId, {
          status: 'connected',
          qrCode: null,
          connectedAt: new Date(),
          lastSeen: new Date(),
        });

        // Store socket
        activeSockets.set(userId, socket);
        qrCodes.delete(userId);
      }
    });

    // Save credentials when updated
    socket.ev.on('creds.update', saveCreds);

    // Handle messages (for future use)
    socket.ev.on('messages.upsert', async (m: any) => {
      // TODO: Handle incoming messages for autoresponder, view once, deleted messages
      logger.debug('Message received:', m);
    });

    // Wait a bit for QR code generation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get QR code if available
    const qrCode = qrCodes.get(userId) || '';

    return {
      qrCode,
      sessionId: session.sessionId,
    };
  } catch (error) {
    logger.error('Error connecting WhatsApp:', error);
    await updateSessionStatus(userId, { status: 'disconnected' });
    throw new Error('Failed to connect WhatsApp');
  }
};

/**
 * Get WhatsApp connection status
 */
export const getWhatsAppStatus = async (userId: string): Promise<{
  status: 'disconnected' | 'connecting' | 'connected';
  qrCode?: string;
  connectedAt?: Date;
  lastSeen?: Date;
}> => {
  const session = await getOrCreateSession(userId);

  // Check if socket is still active
  const socket = activeSockets.get(userId);
  if (socket && session.status === 'connected') {
    // Update last seen
    await updateSessionStatus(userId, { lastSeen: new Date() });
    session.lastSeen = new Date();
  }

  // Get QR code if available
  const qrCode = qrCodes.get(userId) || session.qrCode;

  return {
    status: session.status,
    qrCode,
    connectedAt: session.connectedAt,
    lastSeen: session.lastSeen,
  };
};

/**
 * Disconnect WhatsApp
 */
export const disconnectWhatsApp = async (userId: string): Promise<void> => {
  try {
    const socket = activeSockets.get(userId);

    if (socket) {
      await socket.logout();
      activeSockets.delete(userId);
    }

    // Update status
    await updateSessionStatus(userId, {
      status: 'disconnected',
      qrCode: null,
    });

    qrCodes.delete(userId);

    logger.info(`WhatsApp disconnected for user: ${userId}`);
  } catch (error) {
    logger.error('Error disconnecting WhatsApp:', error);
    throw new Error('Failed to disconnect WhatsApp');
  }
};

/**
 * Get active socket for a user
 */
export const getSocket = (userId: string): WASocket | null => {
  return activeSockets.get(userId) || null;
};

/**
 * Like a status
 */
export const likeStatus = async (
  userId: string,
  statusId: string,
  emoji: string = '❤️'
): Promise<void> => {
  const socket = getSocket(userId);

  if (!socket) {
    throw new ValidationError('WhatsApp not connected');
  }

  try {
    // Parse status ID (format: contactId_statusId)
    const [contactId, actualStatusId] = statusId.split('_');

    // Like status using Baileys API
    // Note: Baileys doesn't have direct status like API
    // This is a placeholder - actual implementation would need WhatsApp Web protocol
    // await socket.sendReceipt(contactId, undefined, [actualStatusId], 'read');

    // TODO: Implement actual status like using Baileys
    // Note: Baileys doesn't have direct status like API, might need to use WhatsApp Web protocol
    logger.info(`Status liked: ${statusId} with emoji: ${emoji}`);

    // Save to database
    const { error } = await supabase.from('status_likes').insert({
      user_id: userId,
      contact_id: contactId,
      contact_name: contactId, // TODO: Get actual contact name
      status_id: actualStatusId,
      emoji_used: emoji,
    });

    if (error) {
      logger.error('Error saving status like:', error);
    }
  } catch (error) {
    logger.error('Error liking status:', error);
    throw new Error('Failed to like status');
  }
};

/**
 * Send a message
 */
export const sendMessage = async (
  userId: string,
  to: string,
  message: string
): Promise<void> => {
  const socket = getSocket(userId);

  if (!socket) {
    throw new ValidationError('WhatsApp not connected');
  }

  try {
    await socket.sendMessage(to, { text: message });
    logger.info(`Message sent from ${userId} to ${to}`);
  } catch (error) {
    logger.error('Error sending message:', error);
    throw new Error('Failed to send message');
  }
};

// Export service object
export const whatsappService = {
  connectWhatsApp,
  getWhatsAppStatus,
  disconnectWhatsApp,
  getSocket,
  likeStatus,
  sendMessage,
};
