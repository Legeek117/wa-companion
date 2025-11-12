import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser, getUserById, generateToken } from '../services/auth.service';
import { AuthenticationError } from '../utils/errors';
import { validate, registerSchema, loginSchema } from '../utils/validators';
import { logger } from '../config/logger';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserPlan } from '../types/user.types';

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const data = validate(registerSchema, req.body);

    // Register user
    const result = await registerUser(data);

    res.status(201).json({
      success: true,
      data: result,
      message: 'User registered successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const data = validate(loginSchema, req.body);

    // Login user
    const result = await loginUser(data);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Login successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user
 * GET /api/auth/me
 * Also returns a new token to automatically refresh it
 */
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId || !req.userEmail || !req.userPlan) {
      throw new AuthenticationError('User not authenticated');
    }

    // Get user from database to get latest plan and subscription status
    const user = await getUserById(req.userId);

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Generate a new token with the latest user data (this automatically refreshes the token)
    const newToken = generateToken(user.id, user.email, user.plan as UserPlan);

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        subscription_id: user.subscription_id,
        created_at: user.created_at.toISOString(),
        updated_at: user.updated_at.toISOString(),
      },
      token: newToken, // Return new token to refresh it automatically
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user (invalidate token)
 * POST /api/auth/logout
 */
export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // In a production app, you might want to:
    // 1. Add token to a blacklist in Redis
    // 2. Store refresh tokens and invalidate them
    // For now, we'll just return success
    // The client should remove the token from storage

    logger.info(`User logged out: ${req.userId}`);

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh token (if implementing refresh tokens)
 * POST /api/auth/refresh
 */
export const refreshToken = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Implement refresh token logic if needed
    // For now, return error
    res.status(501).json({
      success: false,
      message: 'Refresh token not implemented yet',
    });
  } catch (error) {
    next(error);
  }
};
