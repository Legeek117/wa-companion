import Queue from 'bull';
import { getRedisClient } from '../config/redis';
import { logger } from '../config/logger';
import { env } from '../config/env';

interface PairingCodeJob {
  userId: string;
  phoneNumber?: string;
}

let pairingQueue: Queue.Queue<PairingCodeJob> | null = null;

/**
 * Initialize the pairing code queue
 */
export const initializePairingQueue = async (): Promise<void> => {
  try {
    const redisClient = await getRedisClient();
    if (!redisClient) {
      logger.warn('[PairingQueue] Redis not available, pairing queue will not work');
      return;
    }

    // Create queue with Redis connection
    pairingQueue = new Queue<PairingCodeJob>('pairing-code', {
      redis: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 1,
        timeout: 5 * 60 * 1000, // 5 minutes timeout
      },
    });

    pairingQueue.on('error', (error) => {
      logger.error('[PairingQueue] Queue error:', error);
    });

    pairingQueue.on('waiting', (jobId) => {
      logger.debug(`[PairingQueue] Job ${jobId} is waiting`);
    });

    pairingQueue.on('active', (job) => {
      logger.info(`[PairingQueue] Job ${job.id} started for user ${job.data.userId}`);
    });

    pairingQueue.on('completed', (job) => {
      logger.info(`[PairingQueue] Job ${job.id} completed for user ${job.data.userId}`);
    });

    pairingQueue.on('failed', (job, err) => {
      logger.error(`[PairingQueue] Job ${job?.id} failed for user ${job?.data.userId}:`, err);
    });

    logger.info('[PairingQueue] Pairing code queue initialized');
  } catch (error) {
    logger.error('[PairingQueue] Failed to initialize queue:', error);
    pairingQueue = null;
  }
};

/**
 * Add a pairing code request to the queue
 * Returns the job ID if successful, null otherwise
 */
export const addPairingCodeJob = async (
  userId: string,
  phoneNumber?: string
): Promise<string | null> => {
  if (!pairingQueue) {
    logger.error('[PairingQueue] Queue not initialized');
    return null;
  }

  try {
    // Check if user already has an active job
    const activeJobs = await pairingQueue.getJobs(['active', 'waiting']);
    const userActiveJob = activeJobs.find((job) => job.data.userId === userId);

    if (userActiveJob) {
      logger.warn(`[PairingQueue] User ${userId} already has an active pairing code job (${userActiveJob.id})`);
      return userActiveJob.id.toString();
    }

    // Add new job
    const job = await pairingQueue.add(
      { userId, phoneNumber },
      {
        jobId: `pairing-${userId}`, // Unique job ID per user
        priority: 1,
      }
    );

    logger.info(`[PairingQueue] Added pairing code job ${job.id} for user ${userId}`);
    return job.id.toString();
  } catch (error) {
    logger.error(`[PairingQueue] Failed to add job for user ${userId}:`, error);
    return null;
  }
};

/**
 * Get the status of a pairing code job
 */
export const getPairingCodeJobStatus = async (
  userId: string
): Promise<{ status: 'waiting' | 'active' | 'completed' | 'failed' | 'not-found'; jobId?: string }> => {
  if (!pairingQueue) {
    return { status: 'not-found' };
  }

  try {
    const job = await pairingQueue.getJob(`pairing-${userId}`);
    if (!job) {
      return { status: 'not-found' };
    }

    const state = await job.getState();
    return {
      status: state as 'waiting' | 'active' | 'completed' | 'failed',
      jobId: job.id.toString(),
    };
  } catch (error) {
    logger.error(`[PairingQueue] Failed to get job status for user ${userId}:`, error);
    return { status: 'not-found' };
  }
};

/**
 * Remove a pairing code job (cancel it)
 */
export const removePairingCodeJob = async (userId: string): Promise<boolean> => {
  if (!pairingQueue) {
    return false;
  }

  try {
    const job = await pairingQueue.getJob(`pairing-${userId}`);
    if (job) {
      await job.remove();
      logger.info(`[PairingQueue] Removed pairing code job for user ${userId}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`[PairingQueue] Failed to remove job for user ${userId}:`, error);
    return false;
  }
};

/**
 * Get the queue instance (for processing jobs)
 */
export const getPairingQueue = (): Queue.Queue<PairingCodeJob> | null => {
  return pairingQueue;
};

/**
 * Close the queue connection
 */
export const closePairingQueue = async (): Promise<void> => {
  if (pairingQueue) {
    await pairingQueue.close();
    pairingQueue = null;
    logger.info('[PairingQueue] Queue closed');
  }
};

