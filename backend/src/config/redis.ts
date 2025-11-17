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
      // Build Redis client config
      // Use URL-only approach to avoid AUTH conflicts
      // Don't specify socket.host/port when using url - it causes conflicts
      
      // Clean the URL - ensure no empty password
      let redisUrl = env.REDIS_URL.trim();
      
      // Remove empty password patterns from URL
      // redis://:@host:port -> redis://host:port
      redisUrl = redisUrl.replace(/^redis:\/\/:@/, 'redis://');
      // redis://:password@host:port -> keep as is if password exists
      
      // If password is provided separately and not empty, inject it into URL
      if (env.REDIS_PASSWORD && env.REDIS_PASSWORD.trim() !== '') {
        // Extract host and port from URL
        const match = redisUrl.match(/^redis:\/\/(?:[^@]+@)?([^:]+):?(\d+)?/);
        if (match) {
          const host = match[1];
          const port = match[2] || '6379';
          redisUrl = `redis://:${env.REDIS_PASSWORD.trim()}@${host}:${port}`;
        }
      } else {
        // Ensure URL has no password field at all
        // Remove any :password@ or :@ from URL
        redisUrl = redisUrl.replace(/^redis:\/\/:[^@]*@/, 'redis://');
      }

      // Log the final URL (without password for security)
      const safeUrl = redisUrl.replace(/redis:\/\/:[^@]+@/, 'redis://***@');
      console.log(`[Redis] Connecting to: ${safeUrl}`);

      const clientConfig: any = {
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries: number) => {
            // Stop trying after 3 retries
            if (retries > 3) {
              console.warn('Redis connection failed after 3 retries, continuing without Redis');
              return false; // Stop reconnecting
            }
            return Math.min(retries * 100, 3000); // Exponential backoff
          },
        },
      };

      redisClient = createClient(clientConfig);

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

