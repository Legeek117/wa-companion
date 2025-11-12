import { getSupabaseClient } from '../config/database';
import { logger } from '../config/logger';

const supabase = getSupabaseClient();

/**
 * Get scheduled statuses for a user
 */
export const getScheduledStatuses = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('scheduled_statuses')
      .select('*')
      .eq('user_id', userId)
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    logger.error('[ScheduledStatus] Error getting scheduled statuses:', error);
    throw error;
  }
};

/**
 * Get scheduled status by ID
 */
export const getScheduledStatusById = async (userId: string, id: string) => {
  try {
    const { data, error } = await supabase
      .from('scheduled_statuses')
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    logger.error('[ScheduledStatus] Error getting scheduled status:', error);
    throw error;
  }
};

/**
 * Create scheduled status
 */
export const createScheduledStatus = async (
  userId: string,
  mediaUrl: string,
  mediaType: string,
  scheduledAt: string,
  caption?: string
) => {
  try {
    const { data: status, error } = await supabase
      .from('scheduled_statuses')
      .insert({
        user_id: userId,
        media_url: mediaUrl,
        media_type: mediaType,
        scheduled_at: scheduledAt,
        caption: caption || null,
      })
      .select()
      .single();

    if (error) throw error;
    return status;
  } catch (error: any) {
    logger.error('[ScheduledStatus] Error creating scheduled status:', error);
    throw error;
  }
};

/**
 * Update scheduled status
 */
export const updateScheduledStatus = async (
  userId: string,
  id: string,
  mediaUrl?: string,
  mediaType?: string,
  scheduledAt?: string,
  caption?: string
) => {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (mediaUrl !== undefined) updateData.media_url = mediaUrl;
    if (mediaType !== undefined) updateData.media_type = mediaType;
    if (scheduledAt !== undefined) updateData.scheduled_at = scheduledAt;
    if (caption !== undefined) updateData.caption = caption || null;

    const { data: status, error } = await supabase
      .from('scheduled_statuses')
      .update(updateData)
      .eq('user_id', userId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return status;
  } catch (error: any) {
    logger.error('[ScheduledStatus] Error updating scheduled status:', error);
    throw error;
  }
};

/**
 * Delete scheduled status
 */
export const deleteScheduledStatus = async (userId: string, id: string) => {
  try {
    const { error } = await supabase
      .from('scheduled_statuses')
      .delete()
      .eq('user_id', userId)
      .eq('id', id);

    if (error) throw error;
  } catch (error: any) {
    logger.error('[ScheduledStatus] Error deleting scheduled status:', error);
    throw error;
  }
};

export const scheduledStatusService = {
  getScheduledStatuses,
  getScheduledStatusById,
  createScheduledStatus,
  updateScheduledStatus,
  deleteScheduledStatus,
};

