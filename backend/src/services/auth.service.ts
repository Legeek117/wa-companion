import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import prisma from '../config/database';
import { AuthenticationError, ValidationError, ConflictError, AuthorizationError } from '../utils/errors';
import { User, UserPlan, UserRole } from '../types/user.types';
import { logger } from '../config/logger';
import { sendVerificationEmail } from './mail.service';

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
    role: UserRole;
    subscription_id?: string;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
  };
  token: string;
}

export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Verrouillage de compte après échecs de connexion (M2).
 * Compteur en mémoire par email : 5 échecs → 15 min de blocage.
 */
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_DURATION_MS = 15 * 60 * 1000; // 15 min
const loginAttempts = new Map<string, { count: number; lockedUntil: Date | null }>();

const getLoginAttempts = (email: string) => {
  const entry = loginAttempts.get(email);
  if (!entry) return { count: 0, lockedUntil: null as Date | null };
  return entry;
};

const registerFailedAttempt = (email: string) => {
  const entry = getLoginAttempts(email);
  const count = entry.count + 1;
  if (count >= LOGIN_MAX_ATTEMPTS) {
    loginAttempts.set(email, { count, lockedUntil: new Date(Date.now() + LOGIN_LOCK_DURATION_MS) });
    logger.warn(`[Auth] Compte verrouillé 15 min après échecs répétés: ${email}`);
  } else {
    loginAttempts.set(email, { count, lockedUntil: null });
  }
};

const resetLoginAttempts = (email: string) => {
  loginAttempts.delete(email);
};

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (
  userId: string,
  email: string,
  plan: UserPlan,
  role: UserRole = 'user',
  tokenVersion: number = 0
): string => {
  const payload = {
    userId,
    email,
    plan,
    role,
    tokenVersion,
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): { userId: string; email: string; plan: UserPlan; role: UserRole; tokenVersion: number } => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      email: string;
      plan: UserPlan;
      role: UserRole;
      tokenVersion: number;
    };
    return decoded;
  } catch (error) {
    throw new AuthenticationError('Invalid or expired token');
  }
};

const generateVerificationToken = (): string => crypto.randomBytes(32).toString('hex');

export const registerUser = async (data: RegisterData): Promise<{ user: AuthResponse['user']; needsEmailVerification: boolean }> => {
  const { email, password } = data;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }

  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long');
  }

  const lowerEmail = email.toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email: lowerEmail },
  });

  if (existingUser) {
    // Ne pas révéler si le compte est déjà inscrit → renvoie une erreur générique
    throw new ConflictError('User with this email already exists');
  }

  const passwordHash = await hashPassword(password);
  const verificationToken = generateVerificationToken();
  const verificationExpiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

  // Create user and quota in a transaction
  const newUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: lowerEmail,
        passwordHash,
        plan: 'free',
        emailVerified: false,
        verificationToken,
        verificationExpiresAt,
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

  logger.info(`User registered (pending verification): ${newUser.email}`);

  // Envoi du mail de vérification (non bloquant en cas d'échec, le resend existe)
  const verificationLink = buildVerificationLink(verificationToken);
  try {
    await sendVerificationEmail(newUser.email, verificationLink);
  } catch (error) {
    logger.error('[Auth] Échec envoi mail de vérification:', error);
  }

  return {
    user: {
      id: newUser.id,
      email: newUser.email,
      plan: newUser.plan as UserPlan,
      role: newUser.role as UserRole,
      subscription_id: newUser.subscriptionId || undefined,
      email_verified: false,
      created_at: newUser.createdAt.toISOString(),
      updated_at: newUser.updatedAt.toISOString(),
    },
    needsEmailVerification: true,
  };
};

export const buildVerificationLink = (token: string): string => {
  const isProd = env.NODE_ENV === 'production';
  // En prod, le lien pointe vers le backend (sert la page de confirmation et le deep-link)
  const base = isProd ? env.API_URL : env.API_URL;
  return `${base.replace(/\/$/, '')}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
};

export const verifyUserEmail = async (token: string): Promise<{ email: string }> => {
  const user = await prisma.user.findFirst({
    where: { verificationToken: token },
  });

  if (!user) {
    throw new ValidationError('Invalid or expired verification token');
  }

  if (user.emailVerified) {
    return { email: user.email };
  }

  if (user.verificationExpiresAt && user.verificationExpiresAt.getTime() < Date.now()) {
    throw new ValidationError('Verification token has expired');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
      verificationExpiresAt: null,
    },
  });

  logger.info(`Email verified: ${user.email}`);
  return { email: user.email };
};

export const resendVerificationEmail = async (email: string): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  // Toujours répondre OK (éviter l'énumération d'emails), sauf cas réellement bloquant
  if (!user || user.emailVerified) {
    return;
  }

  // Anti-spam : 1 mail / 60s max
  if (user.verificationExpiresAt && user.verificationExpiresAt.getTime() > Date.now() - (VERIFICATION_TOKEN_TTL_MS - 60 * 1000) && user.verificationToken) {
    // Ne renvoyer qu'une fois par minute : régénère quand même si le mail est vieux de +24h
    const createdAtAge = Date.now() - user.createdAt.getTime();
    if (createdAtAge < VERIFICATION_TOKEN_TTL_MS) {
      return;
    }
  }

  const verificationToken = generateVerificationToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationToken,
      verificationExpiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    },
  });

  const verificationLink = buildVerificationLink(verificationToken);
  try {
    await sendVerificationEmail(user.email, verificationLink);
  } catch (error) {
    logger.error('[Auth] Échec renvoi mail de vérification:', error);
  }
};

export const loginUser = async (data: LoginData): Promise<AuthResponse> => {
  const { email, password } = data;
  const lowerEmail = email.toLowerCase();

  // Verrouillage par compte (M2)
  const attempts = getLoginAttempts(lowerEmail);
  if (attempts.lockedUntil && attempts.lockedUntil.getTime() > Date.now()) {
    const remaining = Math.ceil((attempts.lockedUntil.getTime() - Date.now()) / 1000 / 60);
    throw new AuthorizationError(`Too many failed attempts. Account locked for ${remaining} minute(s).`);
  }

  const user = await prisma.user.findUnique({
    where: { email: lowerEmail },
  });

  if (!user) {
    throw new AuthenticationError('Invalid email or password');
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    registerFailedAttempt(lowerEmail);
    throw new AuthenticationError('Invalid email or password');
  }

  // Mot de passe OK → on réinitialise le compteur d'échecs
  resetLoginAttempts(lowerEmail);

  if (user.banned) {
    throw new AuthorizationError(user.banReason || 'Account banned');
  }

  if (!user.emailVerified) {
    throw new AuthenticationError('Please verify your email address before logging in');
  }

  const token = generateToken(
    user.id,
    user.email,
    user.plan as UserPlan,
    user.role as UserRole,
    user.tokenVersion
  );

  logger.info(`User logged in: ${user.email}`);

  return {
    user: {
      id: user.id,
      email: user.email,
      plan: user.plan as UserPlan,
      role: user.role as UserRole,
      subscription_id: user.subscriptionId || undefined,
      email_verified: user.emailVerified,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
    },
    token,
  };
};

export const logoutUser = async (userId: string): Promise<void> => {
  // Incrémente tokenVersion → tous les tokens JWT émis avant deviennent invalides
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
  logger.info(`User logged out (tokens invalidated): ${userId}`);
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
      role: user.role as UserRole,
      banned: user.banned,
      bannedAt: user.bannedAt || null,
      banReason: user.banReason || null,
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
      role: user.role as UserRole,
      banned: user.banned,
      bannedAt: user.bannedAt || null,
      banReason: user.banReason || null,
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

export const isMailConfigured = (): boolean => {
  return !!env.BREVO_API_KEY;
};

export const authService = {
  registerUser,
  loginUser,
  logoutUser,
  verifyUserEmail,
  resendVerificationEmail,
  getUserById,
  getUserByEmail,
  updateUserPlan,
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  isMailConfigured,
};