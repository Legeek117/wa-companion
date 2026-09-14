import { Router } from 'express';
import * as messagesController from '../controllers/messages.controller';
import { protect } from '../middleware/auth.middleware';
import { apiLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// All routes require authentication
router.use(protect);

// Routes
router.get('/conversations', apiLimiter, messagesController.listConversations);
router.get('/conversations/:contactId', apiLimiter, messagesController.getConversationMessages);
router.get('/profile-picture/:contactId', apiLimiter, messagesController.getProfilePicture);
router.post('/send', apiLimiter, messagesController.sendMessage);

export default router;