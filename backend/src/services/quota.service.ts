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
  },
  premium: {
    viewOnce: Infinity,
    deletedMessages: Infinity,
    scheduledStatuses: Infinity,
  },
};

/**
 * Get or create quota record for a user
 */
const getOrCreateQuota = async (userId: string) => {
  const { data: existingQuota } = await supabase
    .from('quotas')
    .select('*')
    .eq('user_id', userId)
    .single();

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
      reset_date: resetDate.toISOString(),
    })
    .select('*')
    .single();

  if (createError || !newQuota) {
    logger.error('Error creating quota:', createError);
    throw new Error('Failed to create quota record');
  }

  return newQuota;
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
 * Get quota information for a user
 */
export const getUserQuota = async (userId: string) => {
  const plan = await getUserPlan(userId);
  const quota = await getOrCreateQuota(userId);

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
  incrementViewOnce,
  incrementDeletedMessages,
  incrementScheduledStatus,
  getUserQuota,
  resetMonthlyQuotas,
};
