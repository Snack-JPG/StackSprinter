/**
 * Prisma Database Client Singleton
 *
 * This module provides a singleton instance of the Prisma Client
 * to prevent connection pool exhaustion in development with hot reloading.
 *
 * In production, creates a new client instance.
 * In development, reuses the same client across module reloads.
 */

import { PrismaClient } from '@prisma/client';

// Type augmentation for global prisma instance in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Prisma client options with logging and connection pooling
const prismaClientOptions = {
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn'] as const
    : ['error'] as const,
  // Connection pooling configuration
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
};

// Create or reuse Prisma Client instance
export const prisma = global.prisma || new PrismaClient(prismaClientOptions);

// In development, store client on global object to prevent duplicate instances
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

/**
 * Gracefully disconnect from database
 * Call this during application shutdown
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Health check for database connection
 * Returns true if database is accessible, false otherwise
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

export default prisma;
