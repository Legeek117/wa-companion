import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { apiLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// All routes require authentication
router.use(protect);

// Placeholder routes - will be implemented
router.get('/', apiLimiter, (_req, res) => {
  res.status(501).json({
    success: false,
    message: 'Deleted Messages routes not implemented yet',
  });
});

router.get('/:id', apiLimiter, (_req, res) => {
  res.status(501).json({
    success: false,
    message: 'Get deleted message not implemented yet',
  });
});

router.get('/export', apiLimiter, (_req, res) => {
  res.status(501).json({
    success: false,
    message: 'Export deleted messages not implemented yet',
  });
});

export default router;
