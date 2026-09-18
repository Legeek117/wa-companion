import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser, logoutUser, getUserById, generateToken, verifyUserEmail, resendVerificationEmail } from '../services/auth.service';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { validate, registerSchema, loginSchema, verifyEmailSchema, resendVerificationSchema } from '../utils/validators';
import { logger } from '../config/logger';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserPlan, UserRole } from '../types/user.types';

/**
 * Register a new user
 * POST /api/auth/register
 * Crée le compte (email non vérifié) et envoie un mail de vérification.
 * Aucun token n'est délivré tant que l'email n'est pas vérifié.
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const data = validate(registerSchema, req.body);

    // Register user (email verification required)
    const result = await registerUser(data);

    res.status(201).json({
      success: true,
      data: result,
      message: 'User registered successfully. Please verify your email address.',
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
 * Verify email address
 * POST /api/auth/verify-email
 * (aussi accessible en GET avec ?token= pour un clic direct sur le lien du mail)
 */
export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.query.token || (req.body && req.body.token);
    if (!token || typeof token !== 'string') {
      throw new AuthenticationError('Invalid verification token');
    }

    const result = await verifyUserEmail(token);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend verification email
 * POST /api/auth/resend-verification
 */
export const resendVerification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = validate(resendVerificationSchema, req.body);
    await resendVerificationEmail(data.email);

    // Toujours répondre OK pour ne pas révéler l'existence du compte
    res.status(200).json({
      success: true,
      message: 'If your email is registered and not yet verified, a new verification email has been sent.',
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

    if (user.banned) {
      throw new AuthorizationError(user.banReason || 'Account banned');
    }

    const currentVersion = user.token_version ?? 0;

    // Generate a new token with the latest user data (this automatically refreshes the token)
    const newToken = generateToken(user.id, user.email, user.plan as UserPlan, user.role as UserRole, currentVersion);

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        role: user.role,
        subscription_id: user.subscription_id,
        email_verified: user.email_verified,
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
 * Incrémente tokenVersion → tous les tokens existants deviennent invalides.
 */
export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new AuthenticationError('User not authenticated');
    }

    await logoutUser(req.userId);

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