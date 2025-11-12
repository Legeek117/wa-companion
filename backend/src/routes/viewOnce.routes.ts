import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { apiLimiter } from '../middleware/rateLimit.middleware';
import {
  listViewOnceCaptures,
  getViewOnceCaptureById,
  downloadViewOnceCapture,
  getViewOnceStats,
} from '../controllers/viewOnce.controller';

const router = Router();

// All routes require authentication
router.use(protect);

// View Once routes
router.get('/', apiLimiter, listViewOnceCaptures);
router.get('/stats', apiLimiter, getViewOnceStats);
router.get('/:id', apiLimiter, getViewOnceCaptureById);
router.get('/:id/download', apiLimiter, downloadViewOnceCapture);

export default router;





