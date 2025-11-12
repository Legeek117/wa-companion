import rateLimit from 'express-rate-limit';

// General API limiter - more permissive for development
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased from 100 to 500 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for OPTIONS requests (CORS preflight)
    return req.method === 'OPTIONS';
  },
});

// Loose limiter for frequently called endpoints (like /auth/me, /whatsapp/status)
export const looseLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute (1 per second)
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.method === 'OPTIONS';
  },
});

// Auth limiter for login/register
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Increased from 5 to 10 login requests per windowMs
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
});

// WhatsApp limiter
export const whatsappLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Increased from 10 to 30 requests per minute
  message: 'Too many WhatsApp requests, please try again later.',
});

