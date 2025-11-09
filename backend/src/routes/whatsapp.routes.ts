import { Router } from 'express';
import * as whatsappController from '../controllers/whatsapp.controller';
import { protect } from '../middleware/auth.middleware';
import { apiLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// All routes require authentication
router.use(protect);

// Routes
router.get('/qr', apiLimiter, whatsappController.getQRCode);
router.get('/status', whatsappController.getStatus);
router.post('/disconnect', whatsappController.disconnect);

export default router;

