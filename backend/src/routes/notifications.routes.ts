import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { apiLimiter } from '../middleware/rateLimit.middleware';
import {
  saveFCMToken,
  deleteFCMToken,
  getNotificationSettings,
  updateNotificationSettings,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
} from '../controllers/notifications.controller';

const router = Router();

// All routes require authentication
router.use(protect);

// FCM Token management
router.post('/token', apiLimiter, saveFCMToken);
router.delete('/token', apiLimiter, deleteFCMToken);

// Notification settings
router.get('/settings', apiLimiter, getNotificationSettings);
router.put('/settings', apiLimiter, updateNotificationSettings);

// Notifications history
router.get('/', apiLimiter, getNotifications);
router.get('/unread-count', apiLimiter, getUnreadNotificationCount);
router.put('/:id/read', apiLimiter, markNotificationAsRead);
router.put('/read-all', apiLimiter, markAllNotificationsAsRead);

export default router;

