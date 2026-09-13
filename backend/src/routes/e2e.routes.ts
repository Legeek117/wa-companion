import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { apiLimiter } from '../middleware/rateLimit.middleware';
import { registerPublicKey, getPublicKeyStatus } from '../controllers/e2e.controller';

const router = Router();

// All routes require authentication
router.use(protect);

router.get('/key', apiLimiter, getPublicKeyStatus);
router.put('/key', apiLimiter, registerPublicKey);

export default router;