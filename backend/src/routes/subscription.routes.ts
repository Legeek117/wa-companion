import { Router } from 'express';
import express from 'express';
import { protect } from '../middleware/auth.middleware';
import { apiLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Public route for webhook (no auth required)
router.post('/webhook', express.raw({ type: 'application/json' }), (_req, res) => {
  res.status(501).json({
    success: false,
    message: 'Stripe webhook not implemented yet',
  });
});

// Protected routes
router.use(protect);

router.post('/create-checkout', apiLimiter, (_req, res) => {
  res.status(501).json({
    success: false,
    message: 'Create checkout session not implemented yet',
  });
});

router.get('/status', (_req, res) => {
  res.status(501).json({
    success: false,
    message: 'Get subscription status not implemented yet',
  });
});

router.post('/cancel', apiLimiter, (_req, res) => {
  res.status(501).json({
    success: false,
    message: 'Cancel subscription not implemented yet',
  });
});

export default router;
