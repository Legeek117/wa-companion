import { Router } from 'express';
import { NextFunction, Request, Response } from 'express';
import * as versionController from '../controllers/version.controller';
import { env } from '../config/env';

const router = Router();

// Public: latest published app version
router.get('/version', versionController.getLatestVersion);

// Shared-secret guard (replaces the old admin account):
// requires "Authorization: Bearer <ADMIN_SECRET>"
const requirePublishSecret = (req: Request, res: Response, next: NextFunction): void => {
  const expected = env.ADMIN_SECRET;
  if (!expected) {
    res.status(503).json({
      success: false,
      error: { message: 'Publication de version désactivée (ADMIN_SECRET non configuré)' },
    });
    return;
  }
  const provided = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (provided !== expected) {
    res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    return;
  }
  next();
};

// Publish a new version after an APK release (protected by shared secret)
router.post('/version', requirePublishSecret, versionController.setVersion);

export default router;