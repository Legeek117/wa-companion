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
    message: 'View Once routes not implemented yet',
  });
});

router.get('/:id', apiLimiter, (_req, res) => {
  res.status(501).json({
    success: false,
    message: 'Get View Once capture not implemented yet',
  });
});

router.get('/:id/download', apiLimiter, (_req, res) => {
  res.status(501).json({
    success: false,
    message: 'Download View Once capture not implemented yet',
  });
});

export default router;
