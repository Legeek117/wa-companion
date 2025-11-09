import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Status schemas
export const likeStatusSchema = z.object({
  statusId: z.string().min(1, 'Status ID is required'),
  emoji: z.string().min(1, 'Emoji is required'),
});

export const scheduleStatusSchema = z.object({
  mediaUrl: z.string().url().optional(),
  caption: z.string().max(700, 'Caption must be less than 700 characters').optional(),
  scheduledAt: z.string().datetime('Invalid date format'),
});

// Autoresponder schemas
export const autoresponderConfigSchema = z.object({
  mode: z.enum(['offline', 'busy', 'meeting', 'vacation', 'custom']),
  message: z.string().min(1, 'Message is required'),
  enabled: z.boolean(),
  filterContacts: z.array(z.string()).optional(),
});

// Subscription schemas
export const createCheckoutSchema = z.object({
  plan: z.enum(['monthly', 'yearly']),
});

