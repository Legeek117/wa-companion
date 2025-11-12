import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { getSupabaseClient } from '../config/database';
import { AuthenticationError, ValidationError, ConflictError } from '../utils/errors';
import { User, UserPlan } from '../types/user.types';
import { logger } from '../config/logger';

const supabase = getSupabaseClient();

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

/**
 * Hash a password using bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

/**
 * Compare a password with a hash
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Generate JWT token
 */
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

/**
 * Verify JWT token
 */
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

/**
 * Register a new user
 */
export const registerUser = async (data: RegisterData): Promise<AuthResponse> => {
  const { email, password } = data;

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }

  // Validate password strength
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long');
  }

  // Check if user already exists
  const { data: existingUser, error: checkError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  // If error is not "not found", log it
  if (checkError && checkError.code !== 'PGRST116') {
    logger.warn('Error checking existing user:', {
      error: checkError,
      message: checkError.message,
      code: checkError.code,
    });
  }

  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      email: email.toLowerCase(),
      password_hash: passwordHash,
      plan: 'free',
    })
    .select('id, email, plan, subscription_id, created_at, updated_at')
    .single();

  if (createError) {
    logger.error('Error creating user:', {
      error: createError,
      message: createError.message,
      details: createError.details,
      hint: createError.hint,
      code: createError.code,
    });
    throw new Error(`Failed to create user: ${createError.message || 'Unknown error'}`);
  }

  if (!newUser) {
    logger.error('Error creating user: No user data returned');
    throw new Error('Failed to create user: No user data returned');
  }

  // Generate token
  const token = generateToken(newUser.id, newUser.email, newUser.plan as UserPlan);

  logger.info(`User registered: ${newUser.email}`);

  return {
    user: {
      id: newUser.id,
      email: newUser.email,
      plan: newUser.plan as UserPlan,
      subscription_id: newUser.subscription_id || undefined,
      created_at: new Date(newUser.created_at).toISOString(),
      updated_at: new Date(newUser.updated_at).toISOString(),
    },
    token,
  };
};

/**
 * Login user
 */
export const loginUser = async (data: LoginData): Promise<AuthResponse> => {
  const { email, password } = data;

  // Find user by email
  const { data: user, error: findError } = await supabase
    .from('users')
    .select('id, email, password_hash, plan, subscription_id, created_at, updated_at')
    .eq('email', email.toLowerCase())
    .single();

  if (findError || !user) {
    throw new AuthenticationError('Invalid email or password');
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    throw new AuthenticationError('Invalid email or password');
  }

  // Generate token
  const token = generateToken(user.id, user.email, user.plan as UserPlan);

  logger.info(`User logged in: ${user.email}`);

  return {
    user: {
      id: user.id,
      email: user.email,
      plan: user.plan as UserPlan,
      subscription_id: user.subscription_id || undefined,
      created_at: new Date(user.created_at).toISOString(),
      updated_at: new Date(user.updated_at).toISOString(),
    },
    token,
  };
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<User | null> => {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    password_hash: user.password_hash,
    plan: user.plan as UserPlan,
    subscription_id: user.subscription_id || undefined,
    created_at: new Date(user.created_at),
    updated_at: new Date(user.updated_at),
  };
};

/**
 * Get user by email
 */
export const getUserByEmail = async (email: string): Promise<User | null> => {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    password_hash: user.password_hash,
    plan: user.plan as UserPlan,
    subscription_id: user.subscription_id || undefined,
    created_at: new Date(user.created_at),
    updated_at: new Date(user.updated_at),
  };
};

/**
 * Update user plan
 */
export const updateUserPlan = async (userId: string, plan: UserPlan): Promise<void> => {
  const { error } = await supabase
    .from('users')
    .update({ plan, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    logger.error('Error updating user plan:', error);
    throw new Error('Failed to update user plan');
  }

  logger.info(`User plan updated: ${userId} -> ${plan}`);
};

// Export authService object for backward compatibility
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
