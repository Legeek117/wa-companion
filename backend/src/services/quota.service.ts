import prisma from '../config/database';
import { QuotaExceededError, NotFoundError } from '../utils/errors';
import { logger } from '../config/logger';
import { UserPlan } from '../types/user.types';

const QUOTA_LIMITS = {
  free: {
    viewOnce: 3,
    deletedMessages: 3,
    scheduledStatuses: 5,
    statusReactions: 2,
  },
  premium: {
    viewOnce: Infinity,
    deletedMessages: Infinity,
    scheduledStatuses: Infinity,
    statusReactions: Infinity,
  },
};

const getOrCreateQuota = async (userId: string) => {
  try {
    let quota = await prisma.quota.findUnique({
      where: { userId },
    });

    if (quota) {
      return quota;
    }

    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1);
    resetDate.setDate(1);

    quota = await prisma.quota.create({
      data: {
        userId,
        resetDate,
      },
    });

    return quota;
  } catch (error) {
    logger.error('[Quota] Exception in getOrCreateQuota:', error);
    throw error;
  }
};

const getUserPlan = async (userId: string): Promise<UserPlan> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user.plan as UserPlan;
};

export const checkViewOnceQuota = async (userId: string): Promise<void> => {
  const plan = await getUserPlan(userId);
  const quota = await getOrCreateQuota(userId);

  const limit = QUOTA_LIMITS[plan].viewOnce;

  if (quota.viewOnceCount >= limit) {
    throw new QuotaExceededError(
      `View Once quota exceeded. Limit: ${limit === Infinity ? 'unlimited' : limit} per month`
    );
  }
};

export const checkDeletedMessagesQuota = async (userId: string): Promise<void> => {
  const plan = await getUserPlan(userId);
  const quota = await getOrCreateQuota(userId);

  const limit = QUOTA_LIMITS[plan].deletedMessages;

  if (quota.deletedMessagesCount >= limit) {
    throw new QuotaExceededError(
      `Deleted Messages quota exceeded. Limit: ${limit === Infinity ? 'unlimited' : limit} per month`
    );
  }
};

export const checkScheduledStatusQuota = async (userId: string): Promise<void> => {
  const plan = await getUserPlan(userId);
  const quota = await getOrCreateQuota(userId);

  const limit = QUOTA_LIMITS[plan].scheduledStatuses;

  if (quota.scheduledStatusesCount >= limit) {
    throw new QuotaExceededError(
      `Scheduled Statuses quota exceeded. Limit: ${limit === Infinity ? 'unlimited' : limit} per month`
    );
  }
};

export const incrementViewOnce = async (userId: string): Promise<void> => {
  await checkViewOnceQuota(userId);

  try {
    await prisma.quota.update({
      where: { userId },
      data: {
        viewOnceCount: { increment: 1 },
      },
    });
  } catch (error) {
    logger.error('Error incrementing view once count:', error);
    throw new Error('Failed to increment view once count');
  }
};

export const incrementDeletedMessages = async (userId: string): Promise<void> => {
  await checkDeletedMessagesQuota(userId);

  try {
    await prisma.quota.update({
      where: { userId },
      data: {
        deletedMessagesCount: { increment: 1 },
      },
    });
  } catch (error) {
    logger.error('Error incrementing deleted messages count:', error);
    throw new Error('Failed to increment deleted messages count');
  }
};

export const incrementScheduledStatus = async (userId: string): Promise<void> => {
  await checkScheduledStatusQuota(userId);

  try {
    await prisma.quota.update({
      where: { userId },
      data: {
        scheduledStatusesCount: { increment: 1 },
      },
    });
  } catch (error) {
    logger.error('Error incrementing scheduled statuses count:', error);
    throw new Error('Failed to increment scheduled statuses count');
  }
};

export const checkStatusReactionQuota = async (userId: string): Promise<void> => {
  const plan = await getUserPlan(userId);

  if (plan === 'premium') {
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const count = await prisma.statusLike.count({
      where: {
        userId,
        likedAt: { gte: today },
      },
    });

    const limit = QUOTA_LIMITS[plan].statusReactions;

    if (count >= limit) {
      throw new QuotaExceededError(
        `Quota de réactions de status dépassé. Limite: ${limit} par jour. Passez à Premium pour des réactions illimitées.`
      );
    }
  } catch (error) {
    if (error instanceof QuotaExceededError) throw error;
    logger.error('[Quota] Error checking status reaction quota:', error);
    throw new Error('Failed to check status reaction quota');
  }
};

export const getUserQuota = async (userId: string) => {
  const plan = await getUserPlan(userId);
  const quota = await getOrCreateQuota(userId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const statusReactionsCount = await prisma.statusLike.count({
    where: {
      userId,
      likedAt: { gte: today },
    },
  });

  return {
    plan,
    viewOnce: {
      used: quota.viewOnceCount,
      limit: QUOTA_LIMITS[plan].viewOnce,
      remaining:
        QUOTA_LIMITS[plan].viewOnce === Infinity
          ? Infinity
          : QUOTA_LIMITS[plan].viewOnce - quota.viewOnceCount,
    },
    deletedMessages: {
      used: quota.deletedMessagesCount,
      limit: QUOTA_LIMITS[plan].deletedMessages,
      remaining:
        QUOTA_LIMITS[plan].deletedMessages === Infinity
          ? Infinity
          : QUOTA_LIMITS[plan].deletedMessages - quota.deletedMessagesCount,
    },
    scheduledStatuses: {
      used: quota.scheduledStatusesCount,
      limit: QUOTA_LIMITS[plan].scheduledStatuses,
      remaining:
        QUOTA_LIMITS[plan].scheduledStatuses === Infinity
          ? Infinity
          : QUOTA_LIMITS[plan].scheduledStatuses - quota.scheduledStatusesCount,
    },
    statusReactions: {
      used: statusReactionsCount,
      limit: QUOTA_LIMITS[plan].statusReactions,
      remaining:
        QUOTA_LIMITS[plan].statusReactions === Infinity
          ? Infinity
          : QUOTA_LIMITS[plan].statusReactions - statusReactionsCount,
    },
    resetDate: quota.resetDate,
  };
};

export const resetMonthlyQuotas = async (): Promise<void> => {
  try {
    const today = new Date();
    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1);
    resetDate.setDate(1);

    await prisma.quota.updateMany({
      where: {
        resetDate: { lt: today },
      },
      data: {
        viewOnceCount: 0,
        deletedMessagesCount: 0,
        scheduledStatusesCount: 0,
        resetDate,
      },
    });

    logger.info('Monthly quotas reset successfully');
  } catch (error) {
    logger.error('Error resetting monthly quotas:', error);
    throw new Error('Failed to reset monthly quotas');
  }
};

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
