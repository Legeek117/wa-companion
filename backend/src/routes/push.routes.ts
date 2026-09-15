import { Router, Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import * as broadcastService from '../services/broadcast.service';
import { logger } from '../config/logger';

const router = Router();

// ── Shared-secret guard (same as version routes) ────────────
const requireSecret = (req: Request, res: Response, next: NextFunction): void => {
  const expected = env.ADMIN_SECRET;
  if (!expected) {
    res.status(503).json({ success: false, error: { message: 'ADMIN_SECRET not configured' } });
    return;
  }
  const provided = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (provided !== expected) {
    res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    return;
  }
  next();
};

// ── POST /api/push/broadcast — create + optionally send now ─
router.post('/broadcast', requireSecret, async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, body, imageUrl, type, target, scheduledFor, data } = req.body;

    if (!title || !body) {
      res.status(400).json({ success: false, error: { message: 'title and body are required' } });
      return;
    }

    const broadcast = await broadcastService.createBroadcast({
      title,
      body,
      imageUrl,
      type,
      target,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      data,
    });

    let sent = 0;
    if (!broadcast.scheduledFor) {
      const result = await broadcastService.sendBroadcastById(broadcast.id);
      sent = result.sent;
    }

    res.json({
      success: true,
      data: {
        id: broadcast.id,
        status: broadcast.status,
        sent,
      },
    });
  } catch (error) {
    logger.error('[PushController] Error creating broadcast:', error);
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
});

// ── GET /api/push/broadcasts — list recent broadcasts ───────
router.get('/broadcasts', requireSecret, async (_req: Request, res: Response): Promise<void> => {
  try {
    const broadcasts = await broadcastService.listBroadcasts(100);
    res.json({ success: true, data: broadcasts });
  } catch (error) {
    logger.error('[PushController] Error listing broadcasts:', error);
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
});

// ── POST /api/push/broadcast/:id/send — force-send a pending broadcast
router.post('/broadcast/:id/send', requireSecret, async (req: Request, res: Response): Promise<void> => {
  try {
    const { sent } = await broadcastService.sendBroadcastById(req.params.id);
    res.json({ success: true, data: { sent } });
  } catch (error) {
    logger.error('[PushController] Error sending broadcast:', error);
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
});

export default router;
