import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthenticationError } from '../utils/errors';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
  userPlan?: 'free' | 'premium';
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      email: string;
      plan: 'free' | 'premium';
    };

    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userPlan = decoded.plan;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid token');
    }
    throw error;
  }
}

export function requirePremium(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.userPlan !== 'premium') {
    res.status(403).json({
      success: false,
      error: {
        message: 'Premium subscription required',
        statusCode: 403,
      },
    });
    return;
  }
  next();
}

