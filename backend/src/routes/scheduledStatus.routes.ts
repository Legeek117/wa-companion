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
    message: 'Get scheduled statuses not implemented yet',
  });
});

router.post('/', apiLimiter, (_req, res) => {
  res.status(501).json({
    success: false,
    message: 'Create scheduled status not implemented yet',
  });
});

router.put('/:id', apiLimiter, (_req, res) => {
  res.status(501).json({
    success: false,
    message: 'Update scheduled status not implemented yet',
  });
});

router.delete('/:id', apiLimiter, (_req, res) => {
  res.status(501).json({
    success: false,
    message: 'Delete scheduled status not implemented yet',
  });
});

export default router;
