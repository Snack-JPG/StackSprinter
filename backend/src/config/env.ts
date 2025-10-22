/**
 * Environment Configuration
 *
 * Validates and exposes environment variables with type safety using Zod.
 * Provides helpful error messages if required variables are missing.
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Environment variable schema
 */
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default('3001'),

  // Kalshi API Configuration
  KALSHI_API_BASE_URL: z
    .string()
    .url()
    .default('https://api.elections.kalshi.com/trade-api/v2'),
  KALSHI_EMAIL: z
    .string()
    .email('KALSHI_EMAIL must be a valid email address'),
  KALSHI_PASSWORD: z
    .string()
    .min(1, 'KALSHI_PASSWORD is required'),
  KALSHI_RATE_LIMIT_PER_SECOND: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default('10'),

  // Polymarket API Configuration (optional for now)
  POLYMARKET_API_BASE_URL: z
    .string()
    .url()
    .default('https://clob.polymarket.com'),
  POLYMARKET_API_KEY: z
    .string()
    .optional(),
  POLYMARKET_RATE_LIMIT_PER_SECOND: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default('10'),

  // Redis Configuration
  REDIS_HOST: z
    .string()
    .default('localhost'),
  REDIS_PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default('6379'),
  REDIS_PASSWORD: z
    .string()
    .optional(),
  REDIS_DB: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(0))
    .default('0'),

  // PostgreSQL Configuration
  POSTGRES_HOST: z
    .string()
    .default('localhost'),
  POSTGRES_PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default('5432'),
  POSTGRES_DB: z
    .string()
    .min(1, 'POSTGRES_DB is required'),
  POSTGRES_USER: z
    .string()
    .min(1, 'POSTGRES_USER is required'),
  POSTGRES_PASSWORD: z
    .string()
    .min(1, 'POSTGRES_PASSWORD is required'),

  // Application Settings
  MARKET_FETCH_INTERVAL_MS: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default('30000'),
  ARBITRAGE_MIN_PROFIT_PERCENT: z
    .string()
    .transform(Number)
    .pipe(z.number().positive())
    .default('2.0'),
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
    .default('info'),

  // CORS Settings
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3000'),
});

/**
 * Parsed and validated environment variables
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables
 */
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .filter(err => err.code === 'invalid_type' && err.received === 'undefined')
        .map(err => err.path.join('.'));

      const invalidVars = error.errors
        .filter(err => err.code !== 'invalid_type' || err.received !== 'undefined')
        .map(err => `${err.path.join('.')}: ${err.message}`);

      let errorMessage = '\n🔴 Environment validation failed!\n\n';

      if (missingVars.length > 0) {
        errorMessage += 'Missing required environment variables:\n';
        missingVars.forEach(varName => {
          errorMessage += `  - ${varName}\n`;
        });
        errorMessage += '\n';
      }

      if (invalidVars.length > 0) {
        errorMessage += 'Invalid environment variables:\n';
        invalidVars.forEach(error => {
          errorMessage += `  - ${error}\n`;
        });
        errorMessage += '\n';
      }

      errorMessage += 'Please check your .env file and ensure all required variables are set.\n';
      errorMessage += 'See .env.example for reference.\n';

      console.error(errorMessage);
      process.exit(1);
    }

    throw error;
  }
}

/**
 * Validated environment configuration
 */
export const env = validateEnv();

/**
 * Helper to check if running in production
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Helper to check if running in development
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Helper to check if running in test
 */
export const isTest = env.NODE_ENV === 'test';

/**
 * Database connection string for PostgreSQL
 */
export const databaseUrl = `postgresql://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`;

/**
 * Redis connection configuration
 */
export const redisConfig = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  db: env.REDIS_DB,
};

/**
 * Log configuration summary (for debugging)
 */
export function logConfig(): void {
  console.log('\n📋 Configuration Summary:');
  console.log('  Environment:', env.NODE_ENV);
  console.log('  Server Port:', env.PORT);
  console.log('  Kalshi API:', env.KALSHI_API_BASE_URL);
  console.log('  Polymarket API:', env.POLYMARKET_API_BASE_URL);
  console.log('  Redis:', `${env.REDIS_HOST}:${env.REDIS_PORT}`);
  console.log('  PostgreSQL:', `${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`);
  console.log('  Market Fetch Interval:', `${env.MARKET_FETCH_INTERVAL_MS}ms`);
  console.log('  Min Arbitrage Profit:', `${env.ARBITRAGE_MIN_PROFIT_PERCENT}%`);
  console.log('  Log Level:', env.LOG_LEVEL);
  console.log('  CORS Origin:', env.CORS_ORIGIN);
  console.log('');
}
