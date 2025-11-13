import { getSupabaseClient } from '../config/database';
import { logger } from '../config/logger';

const supabase = getSupabaseClient();

export interface ViewOnceCommandConfig {
  id: string;
  user_id: string;
  command_text: string;
  command_emoji: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get or create View Once command configuration for a user
 */
export const getViewOnceCommandConfig = async (userId: string): Promise<ViewOnceCommandConfig> => {
  let { data, error } = await supabase
    .from('view_once_command_config')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // Config doesn't exist, create default one
    const { data: newConfig, error: createError } = await supabase
      .from('view_once_command_config')
      .insert({
        user_id: userId,
        command_text: '.vv',
        command_emoji: null,
        enabled: true,
      })
      .select()
      .single();

    if (createError) {
      logger.error('[ViewOnceCommand] Error creating default config:', createError);
      throw new Error('Failed to create View Once command config');
    }

    return newConfig as ViewOnceCommandConfig;
  }

  if (error) {
    logger.error('[ViewOnceCommand] Error getting config:', error);
    throw new Error('Failed to get View Once command config');
  }

  return data as ViewOnceCommandConfig;
};

/**
 * Update View Once command configuration
 */
export const updateViewOnceCommandConfig = async (
  userId: string,
  updates: {
    command_text?: string;
    command_emoji?: string | null;
    enabled?: boolean;
  }
): Promise<ViewOnceCommandConfig> => {
  // Ensure config exists
  await getViewOnceCommandConfig(userId);

  const { data, error } = await supabase
    .from('view_once_command_config')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    logger.error('[ViewOnceCommand] Error updating config:', error);
    throw new Error('Failed to update View Once command config');
  }

  return data as ViewOnceCommandConfig;
};

/**
 * Check if a message matches the user's View Once command
 */
export const matchesViewOnceCommand = async (
  userId: string,
  messageText: string
): Promise<boolean> => {
  try {
    const config = await getViewOnceCommandConfig(userId);

    if (!config.enabled) {
      return false;
    }

    const normalizedText = messageText.trim().toLowerCase();
    const normalizedCommand = config.command_text.trim().toLowerCase();

    // Check text command
    if (normalizedText === normalizedCommand || normalizedText === `!${normalizedCommand.substring(1)}`) {
      return true;
    }

    // Check emoji command
    if (config.command_emoji && messageText.includes(config.command_emoji)) {
      return true;
    }

    return false;
  } catch (error) {
    logger.error('[ViewOnceCommand] Error checking command match:', error);
    return false;
  }
};

