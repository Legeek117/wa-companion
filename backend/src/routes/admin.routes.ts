import { Router } from 'express';
import { protect, requireAdmin } from '../middleware/auth.middleware';
import { getAdminDashboard } from '../controllers/admin.controller';

const router = Router();

router.get('/dashboard', protect, requireAdmin, getAdminDashboard);

export default router;