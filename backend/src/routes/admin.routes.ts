import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// Admin routes (protected by token)
router.post('/migrate-cloudinary', adminController.verifyAdminToken, adminController.startMigration);
router.get('/migration-status', adminController.verifyAdminToken, adminController.getMigrationStatus);

export default router;

