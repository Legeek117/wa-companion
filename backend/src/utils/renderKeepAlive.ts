import http from 'http';
import https from 'https';
import { URL } from 'url';
import { env } from '../config/env';
import { logger } from '../config/logger';

const DEFAULT_KEEP_ALIVE_INTERVAL = 10 * 60 * 1000; // 10 minutes
let keepAliveTimer: NodeJS.Timeout | null = null;

const performPing = async (target: string): Promise<void> => {
  return new Promise((resolve) => {
    try {
      const url = new URL(target);
      const client = url.protocol === 'https:' ? https : http;

      const request = client.request(
        url,
        {
          method: 'GET',
          timeout: 10000,
          headers: {
            'User-Agent': 'AMDA-RenderKeepAlive',
          },
        },
        (response) => {
          // Consume response to free up socket
          response.resume();

          if (response.statusCode && response.statusCode >= 400) {
            logger.warn(
              `[KeepAlive] Render ping responded with status ${response.statusCode} ${response.statusMessage || ''}`.trim()
            );
          } else {
            logger.debug(`[KeepAlive] Render ping success (${response.statusCode ?? 'unknown'})`);
          }
          resolve();
        }
      );

      request.on('timeout', () => {
        logger.warn('[KeepAlive] Render ping timed out');
        request.destroy();
        resolve();
      });

      request.on('error', (error) => {
        logger.warn('[KeepAlive] Render ping failed:', error);
        resolve();
      });

      request.end();
    } catch (error) {
      logger.warn('[KeepAlive] Failed to execute keep-alive ping:', error);
      resolve();
    }
  });
};

export const startRenderKeepAlive = (): void => {
  const targetUrl = env.RENDER_KEEP_ALIVE_URL || env.API_URL;
  if (!targetUrl) {
    logger.info('[KeepAlive] Keep alive disabled: no target URL configured');
    return;
  }

  const interval = env.RENDER_KEEP_ALIVE_INTERVAL_MS || DEFAULT_KEEP_ALIVE_INTERVAL;
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }

  logger.info(`[KeepAlive] Starting Render keep-alive ping to ${targetUrl} every ${Math.round(interval / 60000)} minute(s)`);

  // Immediate ping on startup
  performPing(targetUrl);

  keepAliveTimer = setInterval(() => {
    performPing(targetUrl);
  }, Math.max(interval, 60_000)); // minimum 1 minute safety
};

