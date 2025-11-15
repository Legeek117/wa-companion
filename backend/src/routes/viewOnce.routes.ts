import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { apiLimiter } from '../middleware/rateLimit.middleware';
import {
  listViewOnceCaptures,
  getViewOnceCaptureById,
  downloadViewOnceCapture,
  getViewOnceStats,
  deleteViewOnceCapture,
} from '../controllers/viewOnce.controller';
import {
  getCommandConfig,
  updateCommandConfig,
} from '../controllers/viewOnceCommand.controller';

const router = Router();

// All routes require authentication
router.use(protect);

// View Once command configuration routes
router.get('/command-config', apiLimiter, getCommandConfig);
router.put('/command-config', apiLimiter, updateCommandConfig);

// View Once routes
router.get('/', apiLimiter, listViewOnceCaptures);
router.get('/stats', apiLimiter, getViewOnceStats);
router.get('/:id', apiLimiter, getViewOnceCaptureById);
router.get('/:id/download', apiLimiter, downloadViewOnceCapture);
router.delete('/:id', apiLimiter, deleteViewOnceCapture);

export default router;





