import { getSupabaseClient } from '../config/database';
import { QuotaExceededError, NotFoundError } from '../utils/errors';
import { logger } from '../config/logger';
import { UserPlan } from '../types/user.types';

const supabase = getSupabaseClient();

// Quota limits based on plan
const QUOTA_LIMITS = {
  free: {
    viewOnce: 3,
    deletedMessages: 3,
    scheduledStatuses: 5,
    statusReactions: 2, // 2 reactions per day for free users
  },
  premium: {
    viewOnce: Infinity,
    deletedMessages: Infinity,
    scheduledStatuses: Infinity,
    statusReactions: Infinity, // Unlimited for premium
  },
};

/**
 * Get or create quota record for a user
 */
const getOrCreateQuota = async (userId: string) => {
  try {
    const { data: existingQuota, error: findError } = await supabase
      .from('quotas')
      .select('*')
      .eq('user_id', userId)
      .single();

    // If error is not "not found", log it
    if (findError && findError.code !== 'PGRST116') {
      logger.warn('[Quota] Error finding quota:', {
        error: findError,
        message: findError.message,
        code: findError.code,
        userId,
      });
    }

    if (existingQuota) {
      return existingQuota;
    }

    // Create new quota record
    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1);

    const { data: newQuota, error: createError } = await supabase
      .from('quotas')
      .insert({
        user_id: userId,
        view_once_count: 0,
        deleted_messages_count: 0,
        scheduled_statuses_count: 0,
        reset_date: resetDate.toISOString().split('T')[0], // Use DATE format, not TIMESTAMP
      })
      .select('*')
      .single();

    if (createError) {
      logger.error('[Quota] Error creating quota:', {
        error: createError,
        message: createError.message,
        details: createError.details,
        hint: createError.hint,
        code: createError.code,
        userId,
      });
      throw new Error(`Failed to create quota record: ${createError.message || 'Unknown error'}`);
    }

    if (!newQuota) {
      logger.error('[Quota] No quota data returned after insert');
      throw new Error('Failed to create quota record: No data returned');
    }

    return newQuota;
  } catch (error: any) {
    logger.error('[Quota] Exception in getOrCreateQuota:', error);
    throw error;
  }
};

/**
 * Get user plan
 */
const getUserPlan = async (userId: string): Promise<UserPlan> => {
  const { data: user, error } = await supabase
    .from('users')
    .select('plan')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw new NotFoundError('User not found');
  }

  return user.plan as UserPlan;
};

/**
 * Check if user has exceeded quota for View Once
 */
export const checkViewOnceQuota = async (userId: string): Promise<void> => {
  const plan = await getUserPlan(userId);
  const quota = await getOrCreateQuota(userId);

  const limit = QUOTA_LIMITS[plan].viewOnce;

  if (quota.view_once_count >= limit) {
    throw new QuotaExceededError(
      `View Once quota exceeded. Limit: ${limit === Infinity ? 'unlimited' : limit} per month`
    );
  }
};

/**
 * Check if user has exceeded quota for Deleted Messages
 */
export const checkDeletedMessagesQuota = async (userId: string): Promise<void> => {
  const plan = await getUserPlan(userId);
  const quota = await getOrCreateQuota(userId);

  const limit = QUOTA_LIMITS[plan].deletedMessages;

  if (quota.deleted_messages_count >= limit) {
    throw new QuotaExceededError(
      `Deleted Messages quota exceeded. Limit: ${limit === Infinity ? 'unlimited' : limit} per month`
    );
  }
};

/**
 * Check if user has exceeded quota for Scheduled Statuses
 */
export const checkScheduledStatusQuota = async (userId: string): Promise<void> => {
  const plan = await getUserPlan(userId);
  const quota = await getOrCreateQuota(userId);

  const limit = QUOTA_LIMITS[plan].scheduledStatuses;

  if (quota.scheduled_statuses_count >= limit) {
    throw new QuotaExceededError(
      `Scheduled Statuses quota exceeded. Limit: ${limit === Infinity ? 'unlimited' : limit} per month`
    );
  }
};

/**
 * Increment View Once count
 */
export const incrementViewOnce = async (userId: string): Promise<void> => {
  await checkViewOnceQuota(userId);

  const quota = await getOrCreateQuota(userId);
  const { error } = await supabase
    .from('quotas')
    .update({
      view_once_count: quota.view_once_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    logger.error('Error incrementing view once count:', error);
    throw new Error('Failed to increment view once count');
  }
};

/**
 * Increment Deleted Messages count
 */
export const incrementDeletedMessages = async (userId: string): Promise<void> => {
  await checkDeletedMessagesQuota(userId);

  const quota = await getOrCreateQuota(userId);
  const { error } = await supabase
    .from('quotas')
    .update({
      deleted_messages_count: quota.deleted_messages_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    logger.error('Error incrementing deleted messages count:', error);
    throw new Error('Failed to increment deleted messages count');
  }
};

/**
 * Increment Scheduled Status count
 */
export const incrementScheduledStatus = async (userId: string): Promise<void> => {
  await checkScheduledStatusQuota(userId);

  const quota = await getOrCreateQuota(userId);
  const { error } = await supabase
    .from('quotas')
    .update({
      scheduled_statuses_count: quota.scheduled_statuses_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    logger.error('Error incrementing scheduled statuses count:', error);
    throw new Error('Failed to increment scheduled statuses count');
  }
};

/**
 * Check if user has exceeded daily quota for status reactions
 * Free users: 2 reactions per day
 * Premium users: Unlimited
 */
export const checkStatusReactionQuota = async (userId: string): Promise<void> => {
  const plan = await getUserPlan(userId);
  
  // Premium users have unlimited reactions
  if (plan === 'premium') {
    return;
  }

  // For free users, check daily reactions
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { count, error } = await supabase
    .from('status_likes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('liked_at', today.toISOString());

  if (error) {
    logger.error('[Quota] Error checking status reaction quota:', error);
    throw new Error('Failed to check status reaction quota');
  }

  const limit = QUOTA_LIMITS[plan].statusReactions;
  const used = count || 0;

  if (used >= limit) {
    throw new QuotaExceededError(
      `Quota de réactions de status dépassé. Limite: ${limit} par jour. Passez à Premium pour des réactions illimitées.`
    );
  }
};

/**
 * Get quota information for a user
 */
export const getUserQuota = async (userId: string) => {
  const plan = await getUserPlan(userId);
  const quota = await getOrCreateQuota(userId);

  // Get daily status reactions count
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: statusReactionsCount } = await supabase
    .from('status_likes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('liked_at', today.toISOString());

  return {
    plan,
    viewOnce: {
      used: quota.view_once_count,
      limit: QUOTA_LIMITS[plan].viewOnce,
      remaining: QUOTA_LIMITS[plan].viewOnce === Infinity 
        ? Infinity 
        : QUOTA_LIMITS[plan].viewOnce - quota.view_once_count,
    },
    deletedMessages: {
      used: quota.deleted_messages_count,
      limit: QUOTA_LIMITS[plan].deletedMessages,
      remaining: QUOTA_LIMITS[plan].deletedMessages === Infinity 
        ? Infinity 
        : QUOTA_LIMITS[plan].deletedMessages - quota.deleted_messages_count,
    },
    scheduledStatuses: {
      used: quota.scheduled_statuses_count,
      limit: QUOTA_LIMITS[plan].scheduledStatuses,
      remaining: QUOTA_LIMITS[plan].scheduledStatuses === Infinity 
        ? Infinity 
        : QUOTA_LIMITS[plan].scheduledStatuses - quota.scheduled_statuses_count,
    },
    statusReactions: {
      used: statusReactionsCount || 0,
      limit: QUOTA_LIMITS[plan].statusReactions,
      remaining: QUOTA_LIMITS[plan].statusReactions === Infinity 
        ? Infinity 
        : QUOTA_LIMITS[plan].statusReactions - (statusReactionsCount || 0),
    },
    resetDate: new Date(quota.reset_date),
  };
};

/**
 * Reset monthly quotas for all users
 */
export const resetMonthlyQuotas = async (): Promise<void> => {
  const resetDate = new Date();
  resetDate.setMonth(resetDate.getMonth() + 1);

  const { error } = await supabase
    .from('quotas')
    .update({
      view_once_count: 0,
      deleted_messages_count: 0,
      scheduled_statuses_count: 0,
      reset_date: resetDate.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .lt('reset_date', new Date().toISOString());

  if (error) {
    logger.error('Error resetting monthly quotas:', error);
    throw new Error('Failed to reset monthly quotas');
  }

  logger.info('Monthly quotas reset successfully');
};

// Export service object
export const quotaService = {
  checkViewOnceQuota,
  checkDeletedMessagesQuota,
  checkScheduledStatusQuota,
  checkStatusReactionQuota,
  incrementViewOnce,
  incrementDeletedMessages,
  incrementScheduledStatus,
  getUserQuota,
  resetMonthlyQuotas,
};

