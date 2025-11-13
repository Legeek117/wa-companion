import { getSupabaseClient } from '../config/database';
import { logger } from '../config/logger';

const supabase = getSupabaseClient();

/**
 * Get analytics overview
 */
export const getAnalyticsOverview = async (userId: string) => {
  try {
    // Get status likes stats
    const { count: totalStatusLikes } = await supabase
      .from('status_likes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { count: recentStatusLikes } = await supabase
      .from('status_likes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('liked_at', sevenDaysAgo.toISOString());

    const { count: previousStatusLikes } = await supabase
      .from('status_likes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('liked_at', fourteenDaysAgo.toISOString())
      .lt('liked_at', sevenDaysAgo.toISOString());

    // Get view once stats
    const { count: totalViewOnce } = await supabase
      .from('view_once_captures')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: recentViewOnce } = await supabase
      .from('view_once_captures')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('captured_at', sevenDaysAgo.toISOString());

    // Get deleted messages stats
    const { count: totalDeletedMessages } = await supabase
      .from('deleted_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: recentDeletedMessages } = await supabase
      .from('deleted_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('deleted_at', sevenDaysAgo.toISOString());

    // Get autoresponder active configs
    const { count: activeAutoresponder } = await supabase
      .from('autoresponder_configs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('enabled', true);

    return {
      overview: {
        statusLikes: {
          total: totalStatusLikes || 0,
          recent: recentStatusLikes || 0,
          trend: (recentStatusLikes || 0) - (previousStatusLikes || 0),
        },
        viewOnce: {
          total: totalViewOnce || 0,
          recent: recentViewOnce || 0,
          trend: 0, // TODO: Calculate trend
        },
        deletedMessages: {
          total: totalDeletedMessages || 0,
          recent: recentDeletedMessages || 0,
          trend: 0, // TODO: Calculate trend
        },
        autoresponder: {
          active: activeAutoresponder || 0,
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

    const { data: likes } = await supabase
      .from('status_likes')
      .select('liked_at')
      .eq('user_id', userId)
      .gte('liked_at', thirtyDaysAgo.toISOString());

    // Group by day
    const dailyData: { date: string; count: number }[] = [];
    const counts: Record<string, number> = {};

    likes?.forEach((like) => {
      const date = new Date(like.liked_at).toISOString().split('T')[0];
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
      total: likes?.length || 0,
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

    const { data: captures } = await supabase
      .from('view_once_captures')
      .select('captured_at, media_type')
      .eq('user_id', userId)
      .gte('captured_at', thirtyDaysAgo.toISOString());

    // Group by day and type
    const dailyData: { date: string; count: number }[] = [];
    const counts: Record<string, number> = {};

    captures?.forEach((capture) => {
      const date = new Date(capture.captured_at).toISOString().split('T')[0];
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
      total: captures?.length || 0,
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

    const { data: messages } = await supabase
      .from('deleted_messages')
      .select('deleted_at')
      .eq('user_id', userId)
      .gte('deleted_at', thirtyDaysAgo.toISOString());

    // Group by day
    const dailyData: { date: string; count: number }[] = [];
    const counts: Record<string, number> = {};

    messages?.forEach((msg) => {
      const date = new Date(msg.deleted_at).toISOString().split('T')[0];
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
      total: messages?.length || 0,
    };
  } catch (error: any) {
    logger.error('[Analytics] Error getting deleted messages analytics:', error);
    throw error;
  }
};




