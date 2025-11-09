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
    message: 'Status routes not implemented yet',
  });
});

router.post('/like', apiLimiter, (_req, res) => {
  res.status(501).json({
    success: false,
    message: 'Like status not implemented yet',
  });
});

router.get('/config', (_req, res) => {
  res.status(501).json({
    success: false,
    message: 'Get status config not implemented yet',
  });
});

router.put('/config', apiLimiter, (_req, res) => {
  res.status(501).json({
    success: false,
    message: 'Update status config not implemented yet',
  });
});

export default router;
