import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { apiLimiter } from '../middleware/rateLimit.middleware';
import {
  registerPublicKey,
  getPublicKeyStatus,
  saveKeyBackup,
  getKeyBackup,
  getKeyBackupStatus,
  deleteKeyBackup,
} from '../controllers/e2e.controller';

const router = Router();

// All routes require authentication
router.use(protect);

router.get('/key', apiLimiter, getPublicKeyStatus);
router.put('/key', apiLimiter, registerPublicKey);

// Statut du backup : public pour le client (booléen uniquement, pas de ciphertext)
router.get('/key-backup/status', apiLimiter, getKeyBackupStatus);
// Le backup de clé privée n'est servi qu'après re-authentification (mot de passe en body)
router.post('/key-backup', apiLimiter, getKeyBackup);
router.put('/key-backup', apiLimiter, saveKeyBackup);
router.delete('/key-backup', apiLimiter, deleteKeyBackup);

export default router;