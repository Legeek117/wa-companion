import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../config/logger';
import { ValidationError } from '../utils/errors';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const ALLOWED_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

export const logFrontendEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { level = 'info', message, context, source, path } = req.body || {};

    if (!message || typeof message !== 'string') {
      throw new ValidationError('Message is required');
    }

    const normalizedLevel: LogLevel = ALLOWED_LEVELS.includes(level) ? level : 'info';

    const logContext = {
      origin: 'frontend',
      userId: req.userId || 'anonymous',
      source: source || 'unspecified',
      path,
      context,
    };

    logger[normalizedLevel](`[Frontend] ${message}`, logContext);

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

