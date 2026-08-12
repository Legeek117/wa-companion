import prisma from '../config/database';
import { logger } from '../config/logger';

/**
 * Get scheduled statuses for a user
 */
export const getScheduledStatuses = async (userId: string) => {
  try {
    return await prisma.scheduledStatus.findMany({
      where: { userId },
      orderBy: { scheduledAt: 'asc' }
    });
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
    return await prisma.scheduledStatus.findFirst({
      where: { userId, id }
    });
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
  scheduledAt: string,
  caption?: string
) => {
  try {
    return await prisma.scheduledStatus.create({
      data: {
        userId,
        mediaUrl,
        scheduledAt: new Date(scheduledAt),
        caption: caption || null,
      }
    });
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
  scheduledAt?: string,
  caption?: string
) => {
  try {
    const updateData: any = {};
    if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl;
    if (scheduledAt !== undefined) updateData.scheduledAt = new Date(scheduledAt);
    if (caption !== undefined) updateData.caption = caption || null;

    // First ensure it belongs to the user
    const exists = await prisma.scheduledStatus.findFirst({
      where: { id, userId }
    });
    if (!exists) throw new Error('Status not found or access denied');

    return await prisma.scheduledStatus.update({
      where: { id },
      data: updateData
    });
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
    await prisma.scheduledStatus.deleteMany({
      where: { id, userId }
    });
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
