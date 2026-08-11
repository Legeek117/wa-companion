import { Response } from 'express';
import { logger } from '../config/logger';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEvent {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  userId?: string;
  details?: any;
}

class LiveLogService {
  private clients: Set<Response> = new Set();
  private recentLogs: LogEvent[] = [];
  private readonly MAX_RECENT_LOGS = 100;

  /**
   * Add a new SSE client
   */
  public addClient(res: Response): void {
    this.clients.add(res);
    logger.debug(`[LiveLog] Client connected. Total clients: ${this.clients.size}`);

    // Send recent logs to the new client
    if (this.recentLogs.length > 0) {
      res.write(`data: ${JSON.stringify({ type: 'history', logs: this.recentLogs })}\n\n`);
    }

    // Keep alive interval
    const keepAlive = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 15000);

    res.on('close', () => {
      clearInterval(keepAlive);
      this.removeClient(res);
    });
  }

  /**
   * Remove a client
   */
  private removeClient(res: Response): void {
    this.clients.delete(res);
    logger.debug(`[LiveLog] Client disconnected. Total clients: ${this.clients.size}`);
  }

  /**
   * Emit a log event to all connected clients
   */
  public emitLog(level: LogLevel, message: string, userId?: string, details?: any): void {
    const logEvent: LogEvent = {
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
      level,
      message,
      userId,
      details,
    };

    // Store in history
    this.recentLogs.push(logEvent);
    if (this.recentLogs.length > this.MAX_RECENT_LOGS) {
      this.recentLogs.shift(); // Remove oldest
    }

    // Broadcast to clients
    const dataString = `data: ${JSON.stringify({ type: 'log', log: logEvent })}\n\n`;
    
    for (const client of this.clients) {
      try {
        client.write(dataString);
      } catch (err) {
        this.removeClient(client);
      }
    }
  }
}

export const liveLogService = new LiveLogService();
