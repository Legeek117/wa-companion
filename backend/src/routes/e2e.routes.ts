import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { apiLimiter } from '../middleware/rateLimit.middleware';
import {
  registerPublicKey,
  getPublicKeyStatus,
  saveKeyBackup,
  getKeyBackup,
  deleteKeyBackup,
} from '../controllers/e2e.controller';

const router = Router();

// All routes require authentication
router.use(protect);

router.get('/key', apiLimiter, getPublicKeyStatus);
router.put('/key', apiLimiter, registerPublicKey);

router.get('/key-backup', apiLimiter, getKeyBackup);
router.put('/key-backup', apiLimiter, saveKeyBackup);
router.delete('/key-backup', apiLimiter, deleteKeyBackup);

export default router;