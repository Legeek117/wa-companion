import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { openSync, readSync, closeSync } from 'fs';
import { env } from './config/env';
import { apiLimiter } from './middleware/rateLimit.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { logger } from './config/logger';

// Import routes
import authRoutes from './routes/auth.routes';
import messagesRoutes from './routes/messages.routes';
import whatsappRoutes from './routes/whatsapp.routes';
import statusRoutes from './routes/status.routes';
import viewOnceRoutes from './routes/viewOnce.routes';
import e2eRoutes from './routes/e2e.routes';
import deletedMessagesRoutes from './routes/deletedMessages.routes';
import autoresponderRoutes from './routes/autoresponder.routes';
// Scheduled statuses feature is DISABLED
// import scheduledStatusRoutes from './routes/scheduledStatus.routes';
import subscriptionRoutes from './routes/subscription.routes';
import analyticsRoutes from './routes/analytics.routes';
import quotaRoutes from './routes/quota.routes';
import mediaRoutes from './routes/media.routes';
import notificationsRoutes from './routes/notifications.routes';
import versionRoutes from './routes/version.routes';
import pushRoutes from './routes/push.routes';
import logsRoutes from './routes/logs.routes';

const app: Application = express();

// When running behind a proxy (Render, Netlify, etc.), Express must trust it
// so that rate limiting & IP detection can use the X-Forwarded-For header
// On Render, we trust the first proxy (the Render load balancer)
app.set('trust proxy', 1);

// CORS MUST be before Helmet to avoid blocking CORS headers
app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const additionalOrigins = env.ALLOWED_ORIGINS || [];

      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        logger.info('[CORS] Allowing request with no origin');
        return callback(null, true);
      }
      
      logger.info(`[CORS] Checking origin: ${origin}, NODE_ENV: ${env.NODE_ENV}`);
      
      // In development, allow localhost on any port
      if (env.NODE_ENV === 'development') {
        // Allow any localhost origin in development
        if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
          logger.info(`[CORS] ✅ Allowing development origin: ${origin}`);
          return callback(null, true);
        }
        
        // Also check specific allowed origins
        const allowedOrigins = [
          'http://localhost:8080',
          'http://localhost:8081',
          'http://localhost:5173',
          env.FRONTEND_URL,
          ...additionalOrigins,
        ].filter(Boolean); // Remove undefined values
        
        if (allowedOrigins.includes(origin)) {
          logger.info(`[CORS] ✅ Allowing origin from allowed list: ${origin}`);
          return callback(null, true);
        }
      }
      
      // In production, only allow the configured frontend URL
      if (env.NODE_ENV === 'production') {
        const allowedOrigins = [
          env.FRONTEND_URL,
          'https://amdabot.netlify.app',
          ...additionalOrigins
        ].filter(Boolean);
        if (allowedOrigins.includes(origin)) {
          logger.info(`[CORS] ✅ Allowing production origin: ${origin}`);
          return callback(null, true);
        }
      }
      
      logger.warn(`[CORS] ❌ Blocking origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Security middleware (after CORS)
// In development, disable some Helmet features that might interfere with CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  // Disable crossOriginOpenerPolicy in development to avoid CORS issues
  crossOriginOpenerPolicy: env.NODE_ENV === 'production' ? { policy: 'same-origin' } : false,
  contentSecurityPolicy: env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "http://localhost:*", "https:"],
      mediaSrc: ["'self'", "blob:", "http://localhost:*", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  } : false, // Disable CSP in development
}));

// Body parsing middleware
// The `verify` callback stores the raw body so signatures (e.g. FedaPay webhooks)
// can be verified against the exact payload received.
app.use(
  express.json({
    limit: '10mb',
    verify: (req: Request, _res: Response, buf: Buffer) => {
      (req as any).rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static media files (deleted messages media)
// Must be before rate limiting to avoid CORS issues

// Sniff the content type of a file by reading its magic bytes.
// Used as a fallback for files with an unknown/".bin" extension so they are
// served (and played) correctly (ex: Ogg voice notes captured with "audio/ogg; codecs=opus").
const sniffMediaContentType = (filePath: string): string | null => {
  try {
    const fd = openSync(filePath, 'r');
    const buf = Buffer.alloc(16);
    let bytesRead = 0;
    try {
      bytesRead = readSync(fd, buf, 0, 16, 0);
    } finally {
      closeSync(fd);
    }
    const head = buf.subarray(0, bytesRead);
    if (head.length < 4) return null;

    if (head[0] === 0xFF && head[1] === 0xD8 && head[2] === 0xFF) return 'image/jpeg';
    if (head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return 'image/png';
    if (head.subarray(0, 6).toString('latin1') === 'GIF87a' || head.subarray(0, 6).toString('latin1') === 'GIF89a') return 'image/gif';
    if (head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
    if (head.subarray(0, 2).toString('latin1') === 'BM') return 'image/bmp';
    if (head.subarray(0, 4).toString('latin1') === 'OggS') return 'audio/ogg';
    if (head.subarray(0, 4).equals(Buffer.from([0x1A, 0x45, 0xDF, 0xA3]))) return 'video/webm';
    if (head.subarray(0, 3).toString('latin1') === 'ID3' || (head[0] === 0xFF && (head[1] & 0xE0) === 0xE0)) return 'audio/mpeg';
    if (head.subarray(0, 4).toString('latin1') === 'ftyp') {
      const brand = head.subarray(8, 12).toString('latin1');
      return brand.includes('M4A') ? 'audio/x-m4a' : brand.includes('qt') ? 'video/quicktime' : 'video/mp4';
    }
    if (head.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
    if (head.subarray(0, 4).toString('latin1') === 'PK\x03\x04') return 'application/zip';
    return null;
  } catch {
    return null;
  }
};

app.use('/api/media/deleted-messages', (req, res, next): void => {
  // Set CORS headers first
  const origin = req.headers.origin;
  if (origin && (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin === env.FRONTEND_URL
  )) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
}, express.static(path.join(process.cwd(), 'uploads', 'deleted-messages'), {
  setHeaders: (res, filePath) => {
    // Set appropriate content type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mp3': 'audio/mpeg',
      '.ogg': 'audio/ogg',
      '.wav': 'audio/wav',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
    };
    
    const contentType = mimeTypes[ext] || sniffMediaContentType(filePath) || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
  },
}));

// Serve static media files (view once captures)
app.use('/api/media/view-once', (req, res, next): void => {
  const origin = req.headers.origin;
  if (origin && (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin === env.FRONTEND_URL ||
    (env.ALLOWED_ORIGINS || []).includes(origin)
  )) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
}, express.static(path.join(process.cwd(), 'uploads', 'view-once'), {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mp3': 'audio/mpeg',
      '.ogg': 'audio/ogg',
      '.wav': 'audio/wav',
    };

    const contentType = mimeTypes[ext] || sniffMediaContentType(filePath) || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
  },
}));

// Serve static media files for conversations media
app.use('/api/media/conversations', (req, res, next): void => {
  const origin = req.headers.origin;
  if (origin && (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin === env.FRONTEND_URL ||
    (env.ALLOWED_ORIGINS || []).includes(origin)
  )) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
}, express.static(path.join(process.cwd(), 'uploads', 'conversations'), {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mp3': 'audio/mpeg',
      '.ogg': 'audio/ogg',
      '.wav': 'audio/wav',
    };

    const contentType = mimeTypes[ext] || sniffMediaContentType(filePath) || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
  },
}));

// Serve static media files (generic uploads — statuses, etc.)
app.use('/uploads', (req, res, next): void => {
  const origin = req.headers.origin;
  if (origin && (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin === env.FRONTEND_URL ||
    (env.ALLOWED_ORIGINS || []).includes(origin)
  )) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
}, express.static(env.UPLOADS_PATH, {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mp3': 'audio/mpeg',
      '.ogg': 'audio/ogg',
      '.wav': 'audio/wav',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
    };

    const contentType = mimeTypes[ext] || sniffMediaContentType(filePath) || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
  },
}));

// Scheduled statuses feature is DISABLED
// Scheduled statuses feature is DISABLED
// app.use('/api/media/scheduled-status', (req, res, next): void => {
//   // Set CORS headers first
//   const origin = req.headers.origin;
//   if (origin && (
//     origin.startsWith('http://localhost:') ||
//     origin.startsWith('http://127.0.0.1:') ||
//     origin === env.FRONTEND_URL
//   )) {
//     res.setHeader('Access-Control-Allow-Origin', origin);
//   } else {
//     res.setHeader('Access-Control-Allow-Origin', '*');
//   }
//   res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
//   res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
//   res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
//   
//   if (req.method === 'OPTIONS') {
//     res.sendStatus(200);
//     return;
//   }
//   next();
// }, express.static(path.join(process.cwd(), 'uploads', 'scheduled-status'), {
//   setHeaders: (res, filePath) => {
//     // Set appropriate content type based on file extension
//     const ext = path.extname(filePath).toLowerCase();
//     const mimeTypes: Record<string, string> = {
//       '.jpg': 'image/jpeg',
//       '.jpeg': 'image/jpeg',
//       '.png': 'image/png',
//       '.gif': 'image/gif',
//       '.webp': 'image/webp',
//       '.mp4': 'video/mp4',
//       '.mov': 'video/quicktime',
//       '.avi': 'video/x-msvideo',
//       '.mp3': 'audio/mpeg',
//       '.ogg': 'audio/ogg',
//       '.wav': 'audio/wav',
//       '.pdf': 'application/pdf',
//       '.doc': 'application/msword',
//       '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//       '.xls': 'application/vnd.ms-excel',
//       '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
//       '.zip': 'application/zip',
//       '.rar': 'application/x-rar-compressed',
//     };
//     
//     const contentType = mimeTypes[ext] || 'application/octet-stream';
//     res.setHeader('Content-Type', contentType);
//   },
// }));

// Rate limiting (after static files to avoid blocking media)
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
app.use('/api/messages', messagesRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/view-once', viewOnceRoutes);
app.use('/api/e2e', e2eRoutes);
app.use('/api/deleted-messages', deletedMessagesRoutes);
app.use('/api/autoresponder', autoresponderRoutes);
// Scheduled statuses feature is DISABLED
// app.use('/api/scheduled-status', scheduledStatusRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/quota', quotaRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api', versionRoutes);
app.use('/api/push', pushRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;

