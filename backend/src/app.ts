import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { apiLimiter } from './middleware/rateLimit.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { logger } from './config/logger';

// Import routes
import authRoutes from './routes/auth.routes';
import whatsappRoutes from './routes/whatsapp.routes';
import statusRoutes from './routes/status.routes';
import viewOnceRoutes from './routes/viewOnce.routes';
import deletedMessagesRoutes from './routes/deletedMessages.routes';
import autoresponderRoutes from './routes/autoresponder.routes';
import scheduledStatusRoutes from './routes/scheduledStatus.routes';
import subscriptionRoutes from './routes/subscription.routes';
import analyticsRoutes from './routes/analytics.routes';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api', apiLimiter);

// Root route
app.get('/', (_req, res) => {
  res.json({
    message: 'AMDA Backend API',
    version: '1.0.0',
    status: 'ok',
    endpoints: {
      health: '/health',
      api: '/api',
    },
  });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// API Routes
app.use('/api', (req, _res, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/view-once', viewOnceRoutes);
app.use('/api/deleted-messages', deletedMessagesRoutes);
app.use('/api/autoresponder', autoresponderRoutes);
app.use('/api/scheduled-status', scheduledStatusRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;

