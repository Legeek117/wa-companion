import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { apiLimiter } from '../middleware/rateLimit.middleware';
import * as quotaController from '../controllers/quota.controller';

const router = Router();

// All routes require authentication
router.use(protect);

// Quota routes
router.get('/', apiLimiter, quotaController.getUserQuotaController);

export default router;






