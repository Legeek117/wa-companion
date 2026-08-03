import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import prisma from '../config/database';
import { AuthenticationError, ValidationError, ConflictError } from '../utils/errors';
import { User, UserPlan } from '../types/user.types';
import { logger } from '../config/logger';

export interface RegisterData {
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    plan: UserPlan;
    subscription_id?: string;
    created_at: string;
    updated_at: string;
  };
  token: string;
}

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (userId: string, email: string, plan: UserPlan): string => {
  const payload = {
    userId,
    email,
    plan,
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): { userId: string; email: string; plan: UserPlan } => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      email: string;
      plan: UserPlan;
    };
    return decoded;
  } catch (error) {
    throw new AuthenticationError('Invalid or expired token');
  }
};

export const registerUser = async (data: RegisterData): Promise<AuthResponse> => {
  const { email, password } = data;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }

  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long');
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    const passwordHash = await hashPassword(password);

    // Create user and quota in a transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          plan: 'free',
        },
      });

      // Initialize quota for next month
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);

      await tx.quota.create({
        data: {
          userId: user.id,
          resetDate: nextMonth,
        },
      });

      return user;
    });

    const token = generateToken(newUser.id, newUser.email, newUser.plan as UserPlan);

    logger.info(`User registered: ${newUser.email}`);

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        plan: newUser.plan as UserPlan,
        subscription_id: newUser.subscriptionId || undefined,
        created_at: newUser.createdAt.toISOString(),
        updated_at: newUser.updatedAt.toISOString(),
      },
      token,
    };
  } catch (error) {
    if (error instanceof ConflictError || error instanceof ValidationError) {
      throw error;
    }
    logger.error('Error registering user', { error });
    throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const loginUser = async (data: LoginData): Promise<AuthResponse> => {
  const { email, password } = data;

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    const token = generateToken(user.id, user.email, user.plan as UserPlan);

    logger.info(`User logged in: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan as UserPlan,
        subscription_id: user.subscriptionId || undefined,
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString(),
      },
      token,
    };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    logger.error('Error logging in user', { error });
    throw new Error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      password_hash: user.passwordHash,
      plan: user.plan as UserPlan,
      subscription_id: user.subscriptionId || undefined,
      log_messages: user.logMessages,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  } catch (error) {
    logger.error('Error getting user by ID', { error, userId });
    return null;
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      password_hash: user.passwordHash,
      plan: user.plan as UserPlan,
      subscription_id: user.subscriptionId || undefined,
      log_messages: user.logMessages,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  } catch (error) {
    logger.error('Error getting user by email', { error, email });
    return null;
  }
};

export const updateUserPlan = async (userId: string, plan: UserPlan): Promise<void> => {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { plan },
    });

    logger.info(`User plan updated: ${userId} -> ${plan}`);
  } catch (error) {
    logger.error('Error updating user plan', { error, userId });
    throw new Error('Failed to update user plan');
  }
};

export const authService = {
  registerUser,
  loginUser,
  getUserById,
  getUserByEmail,
  updateUserPlan,
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
};
