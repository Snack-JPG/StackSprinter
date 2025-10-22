/**
 * Logger Utility
 *
 * Winston-based logger with custom formatting and multiple transports.
 * Provides structured logging with timestamps, levels, and metadata.
 */

import winston from 'winston';
import path from 'path';

// Import env if available, otherwise use default
let logLevel = 'info';
try {
  const { env } = require('../config/env');
  logLevel = env.LOG_LEVEL;
} catch {
  // Env not yet loaded, use default
  logLevel = process.env.LOG_LEVEL || 'info';
}

/**
 * Custom format for console output
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    const metaKeys = Object.keys(metadata);
    if (metaKeys.length > 0) {
      // Filter out symbol keys and internal winston properties
      const filteredMeta = Object.entries(metadata)
        .filter(([key]) => !key.startsWith('Symbol('))
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {} as Record<string, any>);

      if (Object.keys(filteredMeta).length > 0) {
        msg += ` ${JSON.stringify(filteredMeta)}`;
      }
    }

    return msg;
  })
);

/**
 * Format for file output (JSON)
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Create transports based on environment
 */
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  const logDir = path.join(__dirname, '../../logs');

  transports.push(
    // Error log file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Combined log file
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

/**
 * Create Winston logger instance
 */
export const logger = winston.createLogger({
  level: logLevel,
  levels: winston.config.npm.levels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.metadata()
  ),
  transports,
  // Don't exit on uncaught exceptions
  exitOnError: false,
});

/**
 * Create child logger with default metadata
 */
export function createLogger(defaultMeta: Record<string, any>) {
  return logger.child(defaultMeta);
}

/**
 * Stream for Morgan HTTP logging
 */
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

/**
 * Log unhandled rejections and exceptions
 */
if (process.env.NODE_ENV !== 'test') {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise,
    });
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {
      message: error.message,
      stack: error.stack,
    });

    // Give logger time to write before exiting
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
}

export default logger;
