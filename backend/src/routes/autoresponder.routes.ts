import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { apiLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// All routes require authentication
router.use(protect);

// Placeholder routes - will be implemented
router.get('/config', (_req, res) => {
  res.status(501).json({
    success: false,
    message: 'Get autoresponder config not implemented yet',
  });
});

router.put('/config', apiLimiter, (_req, res) => {
  res.status(501).json({
    success: false,
    message: 'Update autoresponder config not implemented yet',
  });
});

router.get('/contacts', apiLimiter, (_req, res) => {
  res.status(501).json({
    success: false,
    message: 'Get autoresponder contacts not implemented yet',
  });
});

router.put('/contacts/:id', apiLimiter, (_req, res) => {
  res.status(501).json({
    success: false,
    message: 'Update autoresponder contact not implemented yet',
  });
});

export default router;
