import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';
import { apiLimiter, authLimiter, looseLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Public routes with rate limiting
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);

// Protected routes
// /me is called very frequently (every 30s) for token refresh, use loose limiter
router.get('/me', protect, looseLimiter, authController.getMe);
// Logout doesn't need strict rate limiting, use loose limiter
router.post('/logout', protect, looseLimiter, authController.logout);
router.post('/refresh', protect, apiLimiter, authController.refreshToken);

export default router;

