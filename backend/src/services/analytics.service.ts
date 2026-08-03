import prisma from '../config/database';
import { logger } from '../config/logger';

/**
 * Get analytics overview
 */
export const getAnalyticsOverview = async (userId: string) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Get status likes stats
    const totalStatusLikes = await prisma.statusLike.count({
      where: { userId },
    });

    const recentStatusLikes = await prisma.statusLike.count({
      where: {
        userId,
        likedAt: { gte: sevenDaysAgo },
      },
    });

    const previousStatusLikes = await prisma.statusLike.count({
      where: {
        userId,
        likedAt: {
          gte: fourteenDaysAgo,
          lt: sevenDaysAgo,
        },
      },
    });

    // Get view once stats
    const totalViewOnce = await prisma.viewOnceCapture.count({
      where: { userId },
    });

    const recentViewOnce = await prisma.viewOnceCapture.count({
      where: {
        userId,
        capturedAt: { gte: sevenDaysAgo },
      },
    });

    // Get deleted messages stats
    const totalDeletedMessages = await prisma.deletedMessage.count({
      where: { userId },
    });

    const recentDeletedMessages = await prisma.deletedMessage.count({
      where: {
        userId,
        deletedAt: { gte: sevenDaysAgo },
      },
    });

    // Get autoresponder active configs
    const activeAutoresponder = await prisma.autoresponderConfig.count({
      where: {
        userId,
        enabled: true,
      },
    });

    return {
      overview: {
        statusLikes: {
          total: totalStatusLikes,
          recent: recentStatusLikes,
          trend: recentStatusLikes - previousStatusLikes,
        },
        viewOnce: {
          total: totalViewOnce,
          recent: recentViewOnce,
          trend: 0, // TODO: Calculate trend
        },
        deletedMessages: {
          total: totalDeletedMessages,
          recent: recentDeletedMessages,
          trend: 0, // TODO: Calculate trend
        },
        autoresponder: {
          active: activeAutoresponder,
        },
      },
    };
  } catch (error: any) {
    logger.error('[Analytics] Error getting overview:', error);
    throw error;
  }
};

/**
 * Get status analytics
 */
export const getStatusAnalytics = async (userId: string) => {
  try {
    // Get daily data for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const likes = await prisma.statusLike.findMany({
      where: {
        userId,
        likedAt: { gte: thirtyDaysAgo },
      },
      select: { likedAt: true },
    });

    // Group by day
    const dailyData: { date: string; count: number }[] = [];
    const counts: Record<string, number> = {};

    likes.forEach((like) => {
      const date = new Date(like.likedAt).toISOString().split('T')[0];
      counts[date] = (counts[date] || 0) + 1;
    });

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyData.push({
        date: dateStr,
        count: counts[dateStr] || 0,
      });
    }

    return {
      dailyData,
      total: likes.length,
    };
  } catch (error: any) {
    logger.error('[Analytics] Error getting status analytics:', error);
    throw error;
  }
};

/**
 * Get view once analytics
 */
export const getViewOnceAnalytics = async (userId: string) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const captures = await prisma.viewOnceCapture.findMany({
      where: {
        userId,
        capturedAt: { gte: thirtyDaysAgo },
      },
      select: {
        capturedAt: true,
        mediaType: true,
      },
    });

    // Group by day and type
    const dailyData: { date: string; count: number }[] = [];
    const counts: Record<string, number> = {};

    captures.forEach((capture) => {
      const date = new Date(capture.capturedAt).toISOString().split('T')[0];
      counts[date] = (counts[date] || 0) + 1;
    });

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyData.push({
        date: dateStr,
        count: counts[dateStr] || 0,
      });
    }

    return {
      dailyData,
      total: captures.length,
    };
  } catch (error: any) {
    logger.error('[Analytics] Error getting view once analytics:', error);
    throw error;
  }
};

/**
 * Get deleted messages analytics
 */
export const getDeletedMessagesAnalytics = async (userId: string) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const messages = await prisma.deletedMessage.findMany({
      where: {
        userId,
        deletedAt: { gte: thirtyDaysAgo },
      },
      select: { deletedAt: true },
    });

    // Group by day
    const dailyData: { date: string; count: number }[] = [];
    const counts: Record<string, number> = {};

    messages.forEach((msg) => {
      const date = new Date(msg.deletedAt).toISOString().split('T')[0];
      counts[date] = (counts[date] || 0) + 1;
    });

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyData.push({
        date: dateStr,
        count: counts[dateStr] || 0,
      });
    }

    return {
      dailyData,
      total: messages.length,
    };
  } catch (error: any) {
    logger.error('[Analytics] Error getting deleted messages analytics:', error);
    throw error;
  }
};
