import prisma from '../config/database';
import { logger } from '../config/logger';
import { canonifyContactJid } from './whatsapp.service';

export interface WhatsAppMessage {
  user_id: string;
  contact_id: string;
  message_id: string;
  from_me: boolean;
  content?: string;
  media_url?: string;
  media_type?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker';
  timestamp: Date;
}

/**
 * Store or update a message in the database
 */
export const upsertMessage = async (message: WhatsAppMessage): Promise<void> => {
  try {
    await prisma.whatsappMessage.upsert({
      where: {
        userId_messageId: {
          userId: message.user_id,
          messageId: message.message_id
        }
      },
      update: {
        contactId: canonifyContactJid(message.contact_id) || message.contact_id,
        fromMe: message.from_me,
        content: message.content,
        mediaUrl: message.media_url,
        mediaType: message.media_type,
        timestamp: message.timestamp,
      },
      create: {
        userId: message.user_id,
        contactId: canonifyContactJid(message.contact_id) || message.contact_id,
        messageId: message.message_id,
        fromMe: message.from_me,
        content: message.content,
        mediaUrl: message.media_url,
        mediaType: message.media_type,
        timestamp: message.timestamp,
      }
    });
  } catch (error) {
    logger.error('[MessageService] Unexpected error upserting message:', error);
  }
};

/**
 * Store or update a contact in the database
 */
export const upsertContact = async (userId: string, contactId: string, contactName: string): Promise<void> => {
  try {
    if (!contactId || contactId.includes('@g.us') || contactId.includes('@broadcast')) {
      return;
    }
    
    const canonicalJid = canonifyContactJid(contactId);
    if (!canonicalJid) return;
    
    const finalName = contactName && contactName !== canonicalJid.split('@')[0]
      ? contactName
      : canonicalJid.split('@')[0];
    const now = new Date();

    await prisma.contact.upsert({
      where: {
        userId_contactId: {
          userId,
          contactId: canonicalJid
        }
      },
      update: {
        contactName: finalName,
        lastSeenAt: now,
      },
      create: {
        userId,
        contactId: canonicalJid,
        contactName: finalName,
        lastSeenAt: now,
      }
    });
  } catch (error) {
    logger.debug('[MessageService] Could not upsert contact:', error);
  }
};

/**
 * Get messages for a specific user and contact
 */
export const getMessages = async (userId: string, contactId: string, limit: number = 500) => {
  try {
    const canonicalJid = canonifyContactJid(contactId) || contactId;
    const data = await prisma.whatsappMessage.findMany({
      where: {
        userId,
        contactId: canonicalJid
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });

    if (!data || data.length === 0) return [];

    const result = [...data].sort((a, b) => {
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

    logger.info(`[MessageService] getMessages(user=${userId}, contact=${contactId}) => ${result.length} messages`);
    return result;
  } catch (error) {
    logger.error('[MessageService] Error getting messages:', error);
    throw error;
  }
};

/**
 * Internal helper: try to upsert a contact into DB with max flexibility
 */
const upsertRobust = async (userId: string, jid: string, name: string, lastSeen?: Date | string): Promise<void> => {
  try {
    if (!jid || jid.includes('@g.us') || jid.includes('@broadcast')) return;
    const canonicalJid = canonifyContactJid(jid);
    if (!canonicalJid) return;
    
    const finalName = name && name !== canonicalJid.split('@')[0] ? name : canonicalJid.split('@')[0];
    const now = lastSeen ? new Date(lastSeen) : new Date();

    await prisma.contact.upsert({
      where: {
        userId_contactId: {
          userId,
          contactId: canonicalJid
        }
      },
      update: {
        contactName: finalName,
        lastSeenAt: now,
      },
      create: {
        userId,
        contactId: canonicalJid,
        contactName: finalName,
        lastSeenAt: now,
        firstSeenAt: now,
      }
    });
  } catch (e) {
    logger.debug(`[MessageService] upsertRobust failed silently for ${jid}`);
  }
};

/**
 * Get all contacts for a user - ULTRA ROBUST IMPLEMENTATION
 */
export const getContacts = async (userId: string) => {
  const finalMap = new Map<string, any>();

  try {
    // --- STAGE 1: Read from the `contacts` table ---
    try {
      const existing = await prisma.contact.findMany({
        where: { userId },
        orderBy: { lastSeenAt: 'desc' }
      });
      if (existing) {
        for (const c of existing) {
          if (c && c.contactId) finalMap.set(c.contactId, {
            user_id: c.userId,
            contact_id: c.contactId,
            contact_name: c.contactName,
            last_seen_at: c.lastSeenAt,
            id: c.id
          });
        }
      }
    } catch (contactsErr) {
      logger.warn(`[MessageService] Could not read contacts table for user ${userId}: ${(contactsErr as Error).message}`);
    }

    // --- STAGE 2: Extract contact_ids from ALL message-related tables ---
    const addCandidate = (jid: string, name?: string, lastSeen?: Date | string) => {
      if (!jid || jid.includes('@g.us') || jid.includes('@broadcast')) return;
      const existing = finalMap.get(jid);
      const finalName = name && name !== jid.split('@')[0] ? name : jid.split('@')[0];
      if (!existing) {
        finalMap.set(jid, {
          user_id: userId,
          contact_id: jid,
          contact_name: finalName,
          last_seen_at: lastSeen ? new Date(lastSeen) : new Date(),
        });
      } else {
        if ((!existing.contact_name || existing.contact_name === jid.split('@')[0]) &&
            finalName !== jid.split('@')[0]) {
          existing.contact_name = finalName;
        }
        if (lastSeen) {
          const cur = existing.last_seen_at ? new Date(existing.last_seen_at).getTime() : 0;
          const cand = new Date(lastSeen).getTime();
          if (cand > cur) existing.last_seen_at = new Date(lastSeen);
        }
      }
    };

    // 2a. whatsapp_messages
    try {
      const rows = await prisma.whatsappMessage.findMany({
        where: { userId },
        select: { contactId: true, timestamp: true },
        orderBy: { timestamp: 'desc' },
        take: 10000
      });
      for (const r of rows) addCandidate(r.contactId, undefined, r.timestamp);
    } catch (e) {}

    // 2b. deleted_messages
    try {
      const rows = await prisma.deletedMessage.findMany({
        where: { userId },
        select: { senderId: true, senderName: true, deletedAt: true },
        take: 2000
      });
      for (const r of rows) addCandidate(r.senderId, r.senderName || undefined, r.deletedAt);
    } catch (_) {}

    // 2c. view_once_captures
    try {
      const rows = await prisma.viewOnceCapture.findMany({
        where: { userId },
        select: { senderId: true, senderName: true, capturedAt: true },
        take: 2000
      });
      for (const r of rows) addCandidate(r.senderId, r.senderName || undefined, r.capturedAt);
    } catch (_) {}

    // 2d. status_likes
    try {
      const rows = await prisma.statusLike.findMany({
        where: { userId },
        select: { contactId: true, contactName: true, likedAt: true },
        take: 2000
      });
      for (const r of rows) addCandidate(r.contactId, r.contactName || undefined, r.likedAt || undefined);
    } catch (_) {}

    // --- STAGE 3: Persist any newly-discovered contacts to `contacts` table ---
    let persistedCount = 0;
    for (const [jid, entry] of finalMap.entries()) {
      const needsPersist = !entry.id;
      if (needsPersist || true) {
        await upsertRobust(userId, jid, entry.contact_name, entry.last_seen_at);
        persistedCount++;
      }
    }

    // --- STAGE 4: Convert to sorted array ---
    const result = Array.from(finalMap.values()).sort((a: any, b: any) => {
      const ta = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
      const tb = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
      return tb - ta;
    });

    return result;
  } catch (fatal) {
    logger.error(`[MessageService] Fatal in getContacts for user ${userId}:`, fatal);
    return Array.from(finalMap.values());
  }
};
