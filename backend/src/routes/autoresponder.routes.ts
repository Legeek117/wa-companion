import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { apiLimiter } from '../middleware/rateLimit.middleware';
import {
  getAutoresponderConfigController,
  updateAutoresponderConfig,
  getAutoresponderContacts,
  updateAutoresponderContact,
} from '../controllers/autoresponder.controller';

// Note: getAutoresponderContacts uses the same method as status contacts
// It calls getAllContactsFromSocket to get contacts from all sources

const router = Router();

// All routes require authentication
router.use(protect);

// Autoresponder routes
router.get('/config', getAutoresponderConfigController);
router.put('/config', apiLimiter, updateAutoresponderConfig);
router.get('/contacts', apiLimiter, getAutoresponderContacts);
router.put('/contacts/:id', apiLimiter, updateAutoresponderContact);

export default router;





