import { createClient, RedisClientType } from 'redis';
import { env } from './env';

let redisClient: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType | null> {
  // Skip Redis if not needed for basic functionality
  if (env.NODE_ENV === 'test') {
    return null;
  }

  if (!redisClient) {
    try {
      redisClient = createClient({
        url: env.REDIS_URL,
        password: env.REDIS_PASSWORD,
        socket: {
          host: env.REDIS_HOST,
          port: env.REDIS_PORT,
          reconnectStrategy: (retries) => {
            // Stop trying after 3 retries
            if (retries > 3) {
              console.warn('Redis connection failed after 3 retries, continuing without Redis');
              return false; // Stop reconnecting
            }
            return Math.min(retries * 100, 3000); // Exponential backoff
          },
        },
      });

      redisClient.on('error', (err) => {
        // Only log error, don't throw
        console.warn('Redis Client Error (continuing without Redis):', err.message);
      });

      redisClient.on('connect', () => {
        console.log('Redis Client Connected');
      });

      // Try to connect with timeout
      await Promise.race([
        redisClient.connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
        ),
      ]);
    } catch (error) {
      // If connection fails, set to null and continue without Redis
      console.warn('Redis connection failed, continuing without Redis:', error instanceof Error ? error.message : error);
      redisClient = null;
      return null;
    }
  }
  return redisClient;
}

export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

export default getRedisClient;

