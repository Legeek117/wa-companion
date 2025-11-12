import { Router } from 'express';
import { protect, requirePremium } from '../middleware/auth.middleware';
import { apiLimiter } from '../middleware/rateLimit.middleware';
import * as analyticsController from '../controllers/analytics.controller';

const router = Router();

// All routes require authentication and premium
router.use(protect);
router.use(requirePremium);

// Analytics routes
router.get('/overview', apiLimiter, analyticsController.getAnalyticsOverview);
router.get('/status', apiLimiter, analyticsController.getStatusAnalytics);
router.get('/view-once', apiLimiter, analyticsController.getViewOnceAnalytics);
router.get('/deleted-messages', apiLimiter, analyticsController.getDeletedMessagesAnalytics);

export default router;





