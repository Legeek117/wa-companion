import { Router } from 'express';
import * as whatsappController from '../controllers/whatsapp.controller';
import { protect } from '../middleware/auth.middleware';
import { apiLimiter, looseLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// All routes require authentication
router.use(protect);

// Routes
router.get('/qr', apiLimiter, whatsappController.getQRCode);
router.get('/pairing-code', apiLimiter, whatsappController.getPairingCode);
// /status is called frequently to check connection status, use loose limiter
router.get('/status', looseLimiter, whatsappController.getStatus);
router.post('/disconnect', apiLimiter, whatsappController.disconnect);

export default router;

