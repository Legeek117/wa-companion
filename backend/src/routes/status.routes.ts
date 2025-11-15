import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { apiLimiter, looseLimiter } from '../middleware/rateLimit.middleware';
import {
  getStatusConfig,
  updateStatusConfig,
  getStatusLikes,
  likeStatusController,
  getStatusStats,
  getStatusContacts,
  getAvailableStatuses,
} from '../controllers/status.controller';

const router = Router();

// All routes require authentication
router.use(protect);

// Status routes
router.get('/', apiLimiter, getStatusLikes);
router.get('/available', apiLimiter, getAvailableStatuses);
router.get('/stats', apiLimiter, getStatusStats);
router.get('/contacts', apiLimiter, getStatusContacts);
router.post('/like', apiLimiter, likeStatusController);
// /config is called frequently to sync state, use loose limiter
router.get('/config', looseLimiter, getStatusConfig);
router.put('/config', apiLimiter, updateStatusConfig);

export default router;





