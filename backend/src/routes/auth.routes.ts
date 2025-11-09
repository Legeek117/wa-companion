import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';
import { apiLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Public routes with rate limiting
router.post('/register', apiLimiter, authController.register);
router.post('/login', apiLimiter, authController.login);

// Protected routes
router.get('/me', protect, authController.getMe);
router.post('/logout', protect, authController.logout);
router.post('/refresh', protect, authController.refreshToken);

export default router;

