import { getSupabaseClient } from '../config/database';
import { logger } from '../config/logger';
import { canonifyContactJid } from './whatsapp.service';

const supabase = getSupabaseClient();

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
    const { error } = await supabase
      .from('whatsapp_messages')
      .upsert({
        user_id: message.user_id,
        contact_id: canonifyContactJid(message.contact_id) || message.contact_id,
        message_id: message.message_id,
        from_me: message.from_me,
        content: message.content,
        media_url: message.media_url,
        media_type: message.media_type,
        timestamp: message.timestamp.toISOString(),
      }, {
        onConflict: 'user_id, message_id'
      });

    if (error) {
      logger.error('[MessageService] Error upserting message:', error);
    }
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
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('contacts')
      .upsert({
        user_id: userId,
        contact_id: canonicalJid,
        contact_name: finalName,
        last_seen_at: now,
      }, {
        onConflict: 'user_id, contact_id'
      });

    if (error) {
      logger.debug(`[MessageService] Primary upsert failed, trying manual fallback for ${canonicalJid}: ${error.message}`);
      // Fallback: try insert then update
      const { error: insErr } = await supabase
        .from('contacts')
        .insert({
          user_id: userId,
          contact_id: canonicalJid,
          contact_name: finalName,
          last_seen_at: now,
        });
      if (insErr) {
        await supabase
          .from('contacts')
          .update({ contact_name: finalName, last_seen_at: now })
          .eq('user_id', userId)
          .eq('contact_id', canonicalJid);
      }
    }
  } catch (error) {
    logger.debug('[MessageService] Could not upsert contact:', error);
  }
};

/**
 * Get messages for a specific user and contact
 * Returns the 500 MOST RECENT messages, sorted chronologically ASC for display
 */
export const getMessages = async (userId: string, contactId: string, limit: number = 500) => {
  try {
    const canonicalJid = canonifyContactJid(contactId) || contactId;
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('contact_id', canonicalJid)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) return [];

    const result = [...data].sort((a: any, b: any) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      return ta - tb;
    });

    logger.info(`[MessageService] getMessages(user=${userId}, contact=${contactId}) => ${result.length} messages (last ${limit} max, sorted ASC)`);
    return result;
  } catch (error) {
    logger.error('[MessageService] Error getting messages:', error);
    throw error;
  }
};

/**
 * Internal helper: try to upsert a contact contact into DB with max flexibility
 */
const upsertRobust = async (userId: string, jid: string, name: string, lastSeen?: string): Promise<void> => {
  try {
    if (!jid || jid.includes('@g.us') || jid.includes('@broadcast')) return;
    const canonicalJid = canonifyContactJid(jid);
    if (!canonicalJid) return;
    
    const finalName = name && name !== canonicalJid.split('@')[0] ? name : canonicalJid.split('@')[0];
    const now = lastSeen || new Date().toISOString();

    // 1. Try the standard upsert with first_seen_at
    let done = false;
    try {
      const { error } = await supabase
        .from('contacts')
        .upsert({
          user_id: userId,
          contact_id: canonicalJid,
          contact_name: finalName,
          first_seen_at: now,
          last_seen_at: now,
        }, { onConflict: 'user_id, contact_id' });
      if (!error) done = true;
    } catch (_) {}

    // 2. If that failed, try without first_seen_at (maybe column doesn't exist)
    if (!done) {
      try {
        const { error } = await supabase
          .from('contacts')
          .upsert({
            user_id: userId,
            contact_id: canonicalJid,
            contact_name: finalName,
            last_seen_at: now,
          }, { onConflict: 'user_id, contact_id' });
        if (!error) done = true;
      } catch (_) {}
    }

    // 3. Fallback to manual INSERT then UPDATE
    if (!done) {
      try {
        const { error: insErr } = await supabase
          .from('contacts')
          .insert({
            user_id: userId,
            contact_id: canonicalJid,
            contact_name: finalName,
            last_seen_at: now,
          });
        if (!insErr) done = true;
      } catch (_) {}

      if (!done) {
        try {
          await supabase
            .from('contacts')
            .update({ contact_name: finalName, last_seen_at: now })
            .eq('user_id', userId)
            .eq('contact_id', canonicalJid);
          done = true;
        } catch (_) {}
      }
    }
  } catch (e) {
    logger.debug(`[MessageService] upsertRobust failed silently for ${jid}`);
  }
};

/**
 * Get all contacts for a user - ULTRA ROBUST IMPLEMENTATION
 * Strategy:
 *  1. Read from the dedicated `contacts` table
 *  2. Extract DISTINCT contact_ids from: whatsapp_messages, deleted_messages,
 *     view_once_captures, status_likes
 *  3. Merge everything, persist new contacts to contacts table, return sorted
 */
export const getContacts = async (userId: string) => {
  const finalMap = new Map<string, any>();

  try {
    // --- STAGE 1: Read from the `contacts` table (ignore errors, proceed) ---
    try {
      const { data: existing, error: err } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userId)
        .order('last_seen_at', { ascending: false });

      if (!err && existing) {
        for (const c of existing as any[]) {
          if (c && c.contact_id) finalMap.set(c.contact_id, c);
        }
      }
      logger.info(`[MessageService] Stage 1 (contacts table): ${finalMap.size} contacts for user ${userId}`);
    } catch (contactsErr) {
      logger.warn(`[MessageService] Could not read contacts table for user ${userId}: ${(contactsErr as Error).message}`);
    }

    // --- STAGE 2: Extract contact_ids from ALL message-related tables ---
    const addCandidate = (jid: string, name?: string, lastSeen?: string) => {
      if (!jid || jid.includes('@g.us') || jid.includes('@broadcast')) return;
      const existing = finalMap.get(jid);
      const finalName = name && name !== jid.split('@')[0] ? name : jid.split('@')[0];
      if (!existing) {
        finalMap.set(jid, {
          user_id: userId,
          contact_id: jid,
          contact_name: finalName,
          last_seen_at: lastSeen || new Date().toISOString(),
        });
      } else {
        // Upgrade the name if we found a better one
        if ((!existing.contact_name || existing.contact_name === jid.split('@')[0]) &&
            finalName !== jid.split('@')[0]) {
          existing.contact_name = finalName;
        }
        // Upgrade the timestamp if newer
        if (lastSeen) {
          const cur = existing.last_seen_at ? new Date(existing.last_seen_at).getTime() : 0;
          const cand = new Date(lastSeen).getTime();
          if (cand > cur) existing.last_seen_at = lastSeen;
        }
      }
    };

    // 2a. whatsapp_messages (primary source)
    try {
      const { data: rows } = await supabase
        .from('whatsapp_messages')
        .select('contact_id, timestamp, from_me, content')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(10000);

      if (rows && rows.length > 0) {
        for (const r of rows as any[]) {
          addCandidate(r.contact_id, undefined, r.timestamp);
        }
        logger.info(`[MessageService] Stage 2a (whatsapp_messages): scanned ${rows.length} rows for user ${userId}`);
      }
    } catch (e) {
      logger.debug(`[MessageService] whatsapp_messages extraction: ${(e as Error).message}`);
    }

    // 2b. deleted_messages
    try {
      const { data: rows } = await supabase
        .from('deleted_messages')
        .select('sender_id, sender_name, deleted_at')
        .eq('user_id', userId)
        .limit(2000);
      if (rows) {
        for (const r of rows as any[]) addCandidate(r.sender_id, r.sender_name, r.deleted_at);
      }
    } catch (_) {
      logger.debug('[MessageService] deleted_messages not available');
    }

    // 2c. view_once_captures
    try {
      const { data: rows } = await supabase
        .from('view_once_captures')
        .select('sender_id, sender_name, captured_at')
        .eq('user_id', userId)
        .limit(2000);
      if (rows) {
        for (const r of rows as any[]) addCandidate(r.sender_id, r.sender_name, r.captured_at);
      }
    } catch (_) {
      logger.debug('[MessageService] view_once_captures not available');
    }

    // 2d. status_likes
    try {
      const { data: rows } = await supabase
        .from('status_likes')
        .select('contact_id, contact_name, liked_at')
        .eq('user_id', userId)
        .limit(2000);
      if (rows) {
        for (const r of rows as any[]) addCandidate(r.contact_id, r.contact_name, r.liked_at);
      }
    } catch (_) {
      logger.debug('[MessageService] status_likes not available');
    }

    // --- STAGE 3: Persist any newly-discovered contacts to `contacts` table ---
    let persistedCount = 0;
    for (const [jid, entry] of finalMap.entries()) {
      const needsPersist =
        !entry.id || // no primary key => not from DB
        entry.__fromHistory; // flagged as from history
      if (needsPersist || true) {
        // Always try to sync to DB (keeps last_seen_at up to date)
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

    logger.info(`[MessageService] ✅ getContacts(user=${userId}) => ${result.length} contacts total (${persistedCount} synced to DB)`);
    return result;
  } catch (fatal) {
    logger.error(`[MessageService] Fatal in getContacts for user ${userId}:`, fatal);
    // Last-ditch return whatever we have, or empty
    return Array.from(finalMap.values());
  }
};
