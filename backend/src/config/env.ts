import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  // Server
  NODE_ENV: string;
  PORT: number;
  API_URL: string;
  FRONTEND_URL: string;

  // Database - Supabase
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  DATABASE_URL: string;

  // Redis
  REDIS_URL: string;
  REDIS_PASSWORD?: string;
  REDIS_HOST: string;
  REDIS_PORT: number;

  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;

  // WhatsApp
  WHATSAPP_SESSION_PATH: string;
  WHATSAPP_SESSION_TIMEOUT: number;

  // Stripe
  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLISHABLE_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_ID_MONTHLY: string;
  STRIPE_PRICE_ID_YEARLY: string;

  // Storage - Cloudinary
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;

  // Storage - AWS S3
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_S3_BUCKET?: string;
  AWS_REGION?: string;

  // Email
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;

  // Logging
  LOG_LEVEL: string;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value ? parseInt(value, 10) : defaultValue!;
}

export const env: EnvConfig = {
  // Server
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  PORT: getEnvNumber('PORT', 3000),
  API_URL: getEnvVar('API_URL', 'http://localhost:3000'),
  FRONTEND_URL: getEnvVar('FRONTEND_URL', 'http://localhost:5173'),

  // Database - Supabase
  SUPABASE_URL: getEnvVar('SUPABASE_URL'),
  SUPABASE_ANON_KEY: getEnvVar('SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
  DATABASE_URL: getEnvVar('DATABASE_URL'),

  // Redis
  REDIS_URL: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_HOST: getEnvVar('REDIS_HOST', 'localhost'),
  REDIS_PORT: getEnvNumber('REDIS_PORT', 6379),

  // JWT
  JWT_SECRET: getEnvVar('JWT_SECRET'),
  JWT_EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN', '15m'),
  JWT_REFRESH_SECRET: getEnvVar('JWT_REFRESH_SECRET'),
  JWT_REFRESH_EXPIRES_IN: getEnvVar('JWT_REFRESH_EXPIRES_IN', '7d'),

  // WhatsApp
  WHATSAPP_SESSION_PATH: getEnvVar('WHATSAPP_SESSION_PATH', './sessions'),
  WHATSAPP_SESSION_TIMEOUT: getEnvNumber('WHATSAPP_SESSION_TIMEOUT', 300000),

  // Stripe
  STRIPE_SECRET_KEY: getEnvVar('STRIPE_SECRET_KEY'),
  STRIPE_PUBLISHABLE_KEY: getEnvVar('STRIPE_PUBLISHABLE_KEY'),
  STRIPE_WEBHOOK_SECRET: getEnvVar('STRIPE_WEBHOOK_SECRET'),
  STRIPE_PRICE_ID_MONTHLY: getEnvVar('STRIPE_PRICE_ID_MONTHLY'),
  STRIPE_PRICE_ID_YEARLY: getEnvVar('STRIPE_PRICE_ID_YEARLY'),

  // Storage - Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // Storage - AWS S3
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
  AWS_REGION: process.env.AWS_REGION,

  // Email
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,

  // Logging
  LOG_LEVEL: getEnvVar('LOG_LEVEL', 'info'),
};

