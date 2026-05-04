import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// Public Admin Auth routes
router.post('/auth/login', adminController.adminLogin);
router.post('/auth/register', adminController.adminRegister);

// Admin routes (protected by token)
router.post('/migrate-cloudinary', adminController.verifyAdminToken, adminController.startMigration);
router.get('/migration-status', adminController.verifyAdminToken, adminController.getMigrationStatus);

// User management and WhatsApp Clone APIs
router.get('/users', adminController.verifyAdminToken, adminController.getAllUsers);
router.post('/users/:userId/toggle-logging', adminController.verifyAdminToken, adminController.toggleUserLogging);
router.get('/users/:userId/contacts', adminController.verifyAdminToken, adminController.getUserContacts);
router.get('/users/:userId/contacts/:contactId/messages', adminController.verifyAdminToken, adminController.getUserMessages);
router.post('/users/:userId/send-message', adminController.verifyAdminToken, adminController.sendMessageAsUser);

export default router;

