/**
 * User Identification Service
 * Find which user owns a WhatsApp JID (phone number)
 */

import { logger } from '../config/logger';
import { WASocket } from '@whiskeysockets/baileys';

/**
 * Find the userId that owns a WhatsApp JID (phone number)
 * This is used to identify which user sent a command when multiple users have bots
 */
export const findUserIdByJID = async (jid: string): Promise<string | null> => {
  try {
    if (!jid) {
      return null;
    }

    // Normalize JID (remove @s.whatsapp.net if present)
    let normalizedJid = jid;
    if (jid.includes('@')) {
      normalizedJid = jid.split('@')[0];
    }

    // Search is done via socket matching (see findUserIdBySocketJID)
    // Database lookups would be complex because JID format varies
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
