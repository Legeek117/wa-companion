/**
 * Check if all required environment variables are set
 * This script helps identify missing configuration
 */

import dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config();

interface EnvCheck {
  key: string;
  value: string | undefined;
  required: boolean;
  status: 'ok' | 'missing' | 'placeholder';
}

const requiredVars: string[] = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

const optionalVars: string[] = [
  'REDIS_URL',
  'STRIPE_SECRET_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
];

export function checkEnvironmentVariables(): {
  allSet: boolean;
  missing: string[];
  placeholders: string[];
  checks: EnvCheck[];
} {
  const checks: EnvCheck[] = [];
  const missing: string[] = [];
  const placeholders: string[] = [];

  // Check required variables
  for (const key of requiredVars) {
    const value = process.env[key];
    let status: 'ok' | 'missing' | 'placeholder' = 'ok';

    if (!value) {
      status = 'missing';
      missing.push(key);
    } else if (
      (value.includes('your-') ||
      value.includes('placeholder') ||
      value.includes('change-in-production') ||
      value === '' ||
      value.trim() === '') &&
      !value.startsWith('sb_publishable_')
    ) {
      status = 'placeholder';
      placeholders.push(key);
    }

    checks.push({
      key,
      value: value ? (key.includes('SECRET') || key.includes('KEY') ? '***' : value) : undefined,
      required: true,
      status,
    });
  }

  // Check optional variables
  for (const key of optionalVars) {
    const value = process.env[key];
    let status: 'ok' | 'missing' | 'placeholder' = 'ok';

    if (!value) {
      status = 'missing';
    } else if (
      value.includes('your-') ||
      value.includes('placeholder') ||
      value === '' ||
      value.trim() === ''
    ) {
      status = 'placeholder';
    }

    checks.push({
      key,
      value: value ? (key.includes('SECRET') || key.includes('KEY') || key.includes('PASSWORD') ? '***' : value) : undefined,
      required: false,
      status,
    });
  }

  const allSet = missing.length === 0 && placeholders.length === 0;

  return {
    allSet,
    missing,
    placeholders,
    checks,
  };
}

export function logEnvironmentStatus(): void {
  const { allSet, missing, placeholders, checks } = checkEnvironmentVariables();

  logger.info('🔍 Environment Variables Check:');
  logger.info('================================');

  for (const check of checks) {
    const icon = check.status === 'ok' ? '✅' : check.status === 'missing' ? '❌' : '⚠️';
    const required = check.required ? '(REQUIRED)' : '(OPTIONAL)';
    logger.info(`${icon} ${check.key} ${required}: ${check.status === 'ok' ? 'OK' : check.status === 'missing' ? 'MISSING' : 'PLACEHOLDER'}`);
  }

  logger.info('================================');

  if (!allSet) {
    if (missing.length > 0) {
      logger.error(`❌ Missing required variables: ${missing.join(', ')}`);
    }
    if (placeholders.length > 0) {
      logger.warn(`⚠️  Variables with placeholder values: ${placeholders.join(', ')}`);
      if (placeholders.some(p => p.includes('JWT'))) {
        logger.info('');
        logger.info('💡 Quick fix for JWT secrets:');
        logger.info('   Run: npm run generate-secrets');
        logger.info('   Then copy the generated values to your .env file');
        logger.info('   See: backend/QUICK_FIX_JWT.md for detailed instructions');
        logger.info('');
      }
    }
    logger.error('Please configure your .env file with valid values');
  } else {
    logger.info('✅ All environment variables are properly configured');
  }
}

// Run check if this file is executed directly
if (require.main === module) {
  logEnvironmentStatus();
  const { allSet } = checkEnvironmentVariables();
  process.exit(allSet ? 0 : 1);
}



















