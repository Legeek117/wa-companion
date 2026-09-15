import { Router } from 'express';
import * as versionController from '../controllers/version.controller';
import { verifyAdminToken } from '../controllers/admin.controller';

const router = Router();

// Public: latest published app version
router.get('/version', versionController.getLatestVersion);

// Admin: publish a new version after an APK release
router.post('/version', verifyAdminToken, versionController.setVersion);

export default router;