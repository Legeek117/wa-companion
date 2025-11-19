import { Router } from 'express';
import { logFrontendEvent } from '../controllers/logger.controller';
import { protect } from '../middleware/auth.middleware';
import { logsLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

router.post('/frontend', protect, logsLimiter, logFrontendEvent);

export default router;

