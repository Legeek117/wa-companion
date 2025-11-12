import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { apiLimiter } from '../middleware/rateLimit.middleware';
import {
  listDeletedMessages,
  getDeletedMessageById,
  exportDeletedMessages,
  getDeletedMessagesStats,
  deleteDeletedMessage,
} from '../controllers/deletedMessages.controller';

const router = Router();

// All routes require authentication
router.use(protect);

// Deleted Messages routes
router.get('/', apiLimiter, listDeletedMessages);
router.get('/stats', apiLimiter, getDeletedMessagesStats);
router.get('/export', apiLimiter, exportDeletedMessages);
router.get('/:id', apiLimiter, getDeletedMessageById);
router.delete('/:id', apiLimiter, deleteDeletedMessage);

export default router;





