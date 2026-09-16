import { Router } from 'express';
import express from 'express';
import * as subscriptionController from '../controllers/subscription.controller';
import { protect } from '../middleware/auth.middleware';
import { apiLimiter, looseLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Public routes (no auth required)
router.post('/webhook', express.json({ limit: '1mb' }), subscriptionController.webhook);
router.get('/callback', subscriptionController.callback);
router.get('/cb', subscriptionController.callback);

// Protected routes
router.get('/status', protect, looseLimiter, subscriptionController.getStatus);
router.post('/create-checkout', protect, apiLimiter, subscriptionController.createCheckout);
router.post('/cancel', protect, apiLimiter, subscriptionController.cancel);

export default router;