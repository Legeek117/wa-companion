import { getSupabaseClient } from '../config/database';
import { logger } from '../config/logger';
import { WASocket } from '@whiskeysockets/baileys';

const supabase = getSupabaseClient();

/**
 * Find the userId that owns a WhatsApp JID (phone number)
 * This is used to identify which user sent a command when multiple users have bots
 */
export const findUserIdByJID = async (jid: string): Promise<string | null> => {
  try {
    if (!jid) {
      return null;
    }

    // Normalize JID (remove @s.whatsapp.net if present, or add it)
    let normalizedJid = jid;
    if (jid.includes('@')) {
      normalizedJid = jid.split('@')[0];
    }

    // Search in whatsapp_sessions table
    // We need to match the JID with the session's phone number
    // The session_data might contain the phone number, or we can check socket.user.id
    
    // Method 1: Check active sockets (if we have access to them)
    // This will be done in the calling function
    
    // Method 2: Search in database by matching with session data
    // Since we store session data, we can try to match the JID
    // However, this is complex because the JID format might vary
    
    // Method 3: Use a reverse lookup - check which user has this JID as their connected phone
    // We'll need to iterate through active sessions or use a different approach
    
    // For now, we'll return null and let the caller handle it
    // The caller should check if the message is fromMe, and if so, use the socket's userId
    return null;
  } catch (error) {
    logger.error('[UserIdentification] Error finding userId by JID:', error);
    return null;
  }
};

/**
 * Find userId by checking if the JID matches the socket's user ID
 * This is the most reliable method when we have access to the socket
 */
export const findUserIdBySocketJID = (jid: string, sockets: Map<string, WASocket>): string | null => {
  try {
    if (!jid) {
      return null;
    }

    // Normalize JID
    let normalizedJid = jid;
    if (jid.includes('@')) {
      normalizedJid = jid.split('@')[0];
    }

    // Iterate through all active sockets to find a match
    for (const [userId, socket] of sockets.entries()) {
      try {
        // Check if socket has user property and if the JID matches
        if (socket.user && socket.user.id) {
          const socketJid = socket.user.id;
          const socketNormalizedJid = socketJid.includes('@') 
            ? socketJid.split('@')[0] 
            : socketJid;
          
          if (socketNormalizedJid === normalizedJid) {
            logger.info(`[UserIdentification] Found userId ${userId} for JID ${jid}`);
            return userId;
          }
        }
      } catch (error) {
        // Skip this socket if there's an error
        continue;
      }
    }

    return null;
  } catch (error) {
    logger.error('[UserIdentification] Error finding userId by socket JID:', error);
    return null;
  }
};

