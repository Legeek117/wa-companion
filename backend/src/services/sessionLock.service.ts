import { getRedisClient } from '../config/redis';
import { logger } from '../config/logger';

const LOCK_PREFIX = 'session:lock:';
const LOCK_TTL = 5 * 60; // 5 minutes in seconds

/**
 * Acquire a lock for a user session
 * Returns true if lock was acquired, false if already locked
 */
export const acquireSessionLock = async (userId: string): Promise<boolean> => {
  const redisClient = await getRedisClient();
  if (!redisClient) {
    logger.warn('[SessionLock] Redis not available, lock not acquired');
    return false;
  }

  try {
    const lockKey = `${LOCK_PREFIX}${userId}`;
    
    // Try to set the lock with NX (only if not exists) and EX (expiration)
    const result = await redisClient.setNX(lockKey, '1');
    
    if (result) {
      // Set expiration
      await redisClient.expire(lockKey, LOCK_TTL);
      logger.info(`[SessionLock] Lock acquired for user ${userId}`);
      return true;
    } else {
      logger.warn(`[SessionLock] Lock already exists for user ${userId}`);
      return false;
    }
  } catch (error) {
    logger.error(`[SessionLock] Error acquiring lock for user ${userId}:`, error);
    return false;
  }
};

/**
 * Release a lock for a user session
 */
export const releaseSessionLock = async (userId: string): Promise<boolean> => {
  const redisClient = await getRedisClient();
  if (!redisClient) {
    return false;
  }

  try {
    const lockKey = `${LOCK_PREFIX}${userId}`;
    const result = await redisClient.del(lockKey);
    
    if (result > 0) {
      logger.info(`[SessionLock] Lock released for user ${userId}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`[SessionLock] Error releasing lock for user ${userId}:`, error);
    return false;
  }
};

/**
 * Check if a lock exists for a user
 */
export const hasSessionLock = async (userId: string): Promise<boolean> => {
  const redisClient = await getRedisClient();
  if (!redisClient) {
    return false;
  }

  try {
    const lockKey = `${LOCK_PREFIX}${userId}`;
    const result = await redisClient.exists(lockKey);
    return result === 1;
  } catch (error) {
    logger.error(`[SessionLock] Error checking lock for user ${userId}:`, error);
    return false;
  }
};

/**
 * Extend the lock TTL for a user
 */
export const extendSessionLock = async (userId: string, ttl: number = LOCK_TTL): Promise<boolean> => {
  const redisClient = await getRedisClient();
  if (!redisClient) {
    return false;
  }

  try {
    const lockKey = `${LOCK_PREFIX}${userId}`;
    const exists = await redisClient.exists(lockKey);
    
    if (exists === 1) {
      await redisClient.expire(lockKey, ttl);
      logger.debug(`[SessionLock] Lock extended for user ${userId} (${ttl}s)`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`[SessionLock] Error extending lock for user ${userId}:`, error);
    return false;
  }
};

