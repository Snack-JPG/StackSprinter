/**
 * ArbitrageMarkets Backend Server
 *
 * Real-time arbitrage detection platform between Kalshi and Polymarket.
 * Features:
 * - REST API for market data and arbitrage opportunities
 * - WebSocket/Socket.io for real-time updates
 * - Redis caching
 * - PostgreSQL persistence
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { env, logConfig, isProduction } from './config/env';
import { logger } from './utils/logger';
import { apiRouter } from './routes/api';

/**
 * Express application
 */
const app = express();

/**
 * HTTP server (for both Express and Socket.io)
 */
const httpServer = createServer(app);

/**
 * Socket.io server for real-time updates
 */
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

/**
 * Middleware
 */

// CORS
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.path}`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });

  next();
});

/**
 * Routes
 */

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  });
});

// API routes
app.use('/api', apiRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'ArbitrageMarkets API',
    version: '1.0.0',
    description: 'Real-time arbitrage detection between Kalshi and Polymarket',
    endpoints: {
      health: '/health',
      api: '/api',
      websocket: 'ws://localhost:' + env.PORT,
    },
  });
});

/**
 * Error handling middleware
 */

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: isProduction ? 'An error occurred' : err.message,
    timestamp: new Date().toISOString(),
  });
});

/**
 * WebSocket/Socket.io event handlers
 */

io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });

  // Send welcome message
  socket.emit('welcome', {
    message: 'Connected to ArbitrageMarkets',
    socketId: socket.id,
    timestamp: new Date().toISOString(),
  });

  // Handle client subscription to arbitrage updates
  socket.on('subscribe:arbitrage', () => {
    logger.info('Client subscribed to arbitrage updates', { socketId: socket.id });
    socket.join('arbitrage');
    socket.emit('subscribed', { channel: 'arbitrage' });
  });

  // Handle client subscription to market updates
  socket.on('subscribe:markets', (data: { platform?: string }) => {
    const channel = data?.platform ? `markets:${data.platform}` : 'markets';
    logger.info('Client subscribed to market updates', {
      socketId: socket.id,
      channel,
    });
    socket.join(channel);
    socket.emit('subscribed', { channel });
  });

  // Handle unsubscribe
  socket.on('unsubscribe', (data: { channel: string }) => {
    logger.info('Client unsubscribed', {
      socketId: socket.id,
      channel: data.channel,
    });
    socket.leave(data.channel);
    socket.emit('unsubscribed', { channel: data.channel });
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    logger.info('Client disconnected', {
      socketId: socket.id,
      reason,
    });
  });

  // Handle errors
  socket.on('error', (error) => {
    logger.error('Socket error', {
      socketId: socket.id,
      error: error.message,
    });
  });
});

/**
 * Graceful shutdown
 */
const shutdown = async () => {
  logger.info('Received shutdown signal, closing server gracefully...');

  // Close HTTP server
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  // Close Socket.io
  io.close(() => {
    logger.info('Socket.io server closed');
  });

  // TODO: Close database connections
  // TODO: Close Redis connection
  // TODO: Stop market fetcher

  // Give processes time to finish
  setTimeout(() => {
    logger.info('Shutdown complete');
    process.exit(0);
  }, 5000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

/**
 * Start server
 */
const startServer = async () => {
  try {
    // Log configuration
    logConfig();

    // TODO: Initialize database connection
    // TODO: Initialize Redis connection
    // TODO: Start market fetcher service
    // TODO: Start arbitrage detection service

    // Start listening
    httpServer.listen(env.PORT, () => {
      logger.info(`Server started successfully`, {
        port: env.PORT,
        environment: env.NODE_ENV,
        pid: process.pid,
      });

      logger.info(`REST API available at http://localhost:${env.PORT}`);
      logger.info(`WebSocket available at ws://localhost:${env.PORT}`);
      logger.info(`Health check at http://localhost:${env.PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

// Export for testing
export { app, httpServer, io };

// Start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}
