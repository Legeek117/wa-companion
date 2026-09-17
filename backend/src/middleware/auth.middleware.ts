import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth.service';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { UserPlan, UserRole } from '../types/user.types';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
  userPlan?: UserPlan;
  userRole?: UserRole;
}

/**
 * Protect routes - verify JWT token
 */
export const protect = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    // Verify token
    const decoded = verifyToken(token);

    // Attach user info to request
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userPlan = decoded.plan;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      next(error);
    } else {
      next(new AuthenticationError('Invalid or expired token'));
    }
  }
};

/**
 * Authorize routes - check user roles/plans
 */
export const authorize = (...allowedPlans: UserPlan[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.userPlan) {
      throw new AuthenticationError('User not authenticated');
    }

    if (!allowedPlans.includes(req.userPlan)) {
      throw new AuthorizationError(
        `Access denied. Required plan: ${allowedPlans.join(' or ')}`
      );
    }

    next();
  };
};

/**
 * Require Premium plan
 */
export const requirePremium = authorize('premium');

/**
 * Require admin role.
 * La vérification se fait TOUJOURS côté backend (jamais frontend) :
 * on recharge le rôle depuis la base de données à chaque appel, pour
 * que le rôle ne puisse pas être falsifié via un ancien token.
 */
export const requireAdmin = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.userId) {
      throw new AuthenticationError('User not authenticated');
    }

    const { getUserById } = await import('../services/auth.service');
    const user = await getUserById(req.userId);

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (user.role !== 'admin') {
      throw new AuthorizationError('Admin access required');
    }

    req.userRole = user.role;
    next();
  } catch (error) {
    next(error);
  }
};

