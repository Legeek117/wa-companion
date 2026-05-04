import { getSupabaseClient } from '../config/database';
import { logger } from '../config/logger';

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
        contact_id: message.contact_id,
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
    const { error } = await supabase
      .from('contacts')
      .upsert({
        user_id: userId,
        contact_id: contactId,
        contact_name: contactName,
        last_seen_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id, contact_id'
      });

    if (error) {
      logger.error('[MessageService] Error upserting contact:', error);
    }
  } catch (error) {
    logger.error('[MessageService] Unexpected error upserting contact:', error);
  }
};

/**
 * Get messages for a specific user and contact
 */
export const getMessages = async (userId: string, contactId: string, limit: number = 100) => {
  try {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('contact_id', contactId)
      .order('timestamp', { ascending: true })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('[MessageService] Error getting messages:', error);
    throw error;
  }
};

/**
 * Get all contacts for a user
 */
export const getContacts = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .order('last_seen_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('[MessageService] Error getting contacts:', error);
    throw error;
  }
};
