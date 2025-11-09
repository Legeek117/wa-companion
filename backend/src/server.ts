import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { getRedisClient } from './config/redis';

const PORT = env.PORT;

async function startServer(): Promise<void> {
  try {
    // Initialize Redis connection
    if (env.NODE_ENV !== 'test') {
      await getRedisClient();
      logger.info('Redis connected');
    }

    // Start Express server
    app.listen(PORT, () => {
      logger.info({
        message: `🚀 Server running on port ${PORT}`,
        environment: env.NODE_ENV,
        apiUrl: env.API_URL,
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();

