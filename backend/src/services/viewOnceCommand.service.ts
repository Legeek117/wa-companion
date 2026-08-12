import prisma from '../config/database';
import { logger } from '../config/logger';

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
  try {
    let data = await prisma.viewOnceCommandConfig.findUnique({
      where: { userId }
    });

    if (!data) {
      data = await prisma.viewOnceCommandConfig.create({
        data: {
          userId,
          commandText: '.vv',
          commandEmoji: null,
          enabled: true,
        }
      });
    }

    return {
      id: data.id,
      user_id: data.userId,
      command_text: data.commandText,
      command_emoji: data.commandEmoji,
      enabled: data.enabled,
      created_at: data.createdAt.toISOString(),
      updated_at: data.updatedAt.toISOString(),
    };
  } catch (error) {
    logger.error('[ViewOnceCommand] Error getting config:', error);
    throw new Error('Failed to get View Once command config');
  }
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
  try {
    // Ensure config exists
    await getViewOnceCommandConfig(userId);

    const updateData: any = {};
    if (updates.command_text !== undefined) updateData.commandText = updates.command_text;
    if (updates.command_emoji !== undefined) updateData.commandEmoji = updates.command_emoji;
    if (updates.enabled !== undefined) updateData.enabled = updates.enabled;

    const data = await prisma.viewOnceCommandConfig.update({
      where: { userId },
      data: updateData
    });

    return {
      id: data.id,
      user_id: data.userId,
      command_text: data.commandText,
      command_emoji: data.commandEmoji,
      enabled: data.enabled,
      created_at: data.createdAt.toISOString(),
      updated_at: data.updatedAt.toISOString(),
    };
  } catch (error) {
    logger.error('[ViewOnceCommand] Error updating config:', error);
    throw new Error('Failed to update View Once command config');
  }
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
