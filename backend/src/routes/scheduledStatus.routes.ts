import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { apiLimiter } from '../middleware/rateLimit.middleware';
import * as scheduledStatusController from '../controllers/scheduledStatus.controller';

const router = Router();

// All routes require authentication
router.use(protect);

// Scheduled status routes
router.get('/', apiLimiter, scheduledStatusController.getScheduledStatuses);
router.post('/', apiLimiter, scheduledStatusController.createScheduledStatus);
router.put('/:id', apiLimiter, scheduledStatusController.updateScheduledStatus);
router.delete('/:id', apiLimiter, scheduledStatusController.deleteScheduledStatus);

export default router;





