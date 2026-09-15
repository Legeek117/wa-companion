import prisma from '../config/database';
import { logger } from '../config/logger';
import * as admin from 'firebase-admin';

export interface CreateBroadcastInput {
  title: string;
  body: string;
  imageUrl?: string;
  type?: 'advertisement' | 'reminder';
  target?: 'all' | 'premium';
  scheduledFor?: Date | null;
  data?: Record<string, any>;
}

const ICON = 'ic_launcher';
const COLOR = '#25D366';

// ── Broadcasts ──────────────────────────────────────────────

export const createBroadcast = async (input: CreateBroadcastInput) =>
  prisma.pushBroadcast.create({
    data: {
      title: input.title,
      body: input.body,
      imageUrl: input.imageUrl ?? null,
      type: input.type ?? 'advertisement',
      target: input.target ?? 'all',
      scheduledFor: input.scheduledFor ?? null,
      data: input.data ?? undefined,
      status: input.scheduledFor ? 'pending' : 'sent',
      sentAt: input.scheduledFor ? null : new Date(),
    },
  });

export const listBroadcasts = (limit = 50) =>
  prisma.pushBroadcast.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      body: true,
      imageUrl: true,
      type: true,
      target: true,
      scheduledFor: true,
      sentAt: true,
      status: true,
      createdAt: true,
    },
  });

// ── Envoi ───────────────────────────────────────────────────

const getAllUserTokens = async (target: 'all' | 'premium') => {
  const where: any = { notificationSettings: { isNot: null, enabled: true } };

  if (target === 'premium') {
    where.plan = 'premium';
  }

  const rows = await prisma.fcmToken.findMany({
    where: { user: where },
    select: { token: true },
    distinct: ['token'],
  });

  return rows.map((r) => r.token);
};

const sendMulticast = async (
  tokens: string[],
  payload: Omit<admin.messaging.MulticastMessage, 'tokens'>
): Promise<{ success: number; invalidTokens: string[] }> => {
  const firebaseApp = admin.apps[0];
  if (!firebaseApp || tokens.length === 0) {
    return { success: 0, invalidTokens: [] };
  }

  const message: admin.messaging.MulticastMessage = { ...payload, tokens };
  const response = await admin.messaging().sendEachForMulticast(message);

  const invalidTokens: string[] = [];
  if (response.failureCount > 0) {
    response.responses.forEach((resp, idx) => {
      if (
        !resp.success &&
        resp.error &&
        (resp.error.code === 'messaging/invalid-registration-token' ||
          resp.error.code === 'messaging/registration-token-not-registered')
      ) {
        invalidTokens.push(tokens[idx]);
      }
    });
    if (invalidTokens.length) {
      await prisma.fcmToken.deleteMany({ where: { token: { in: invalidTokens } } });
    }
  }

  return { success: response.successCount, invalidTokens };
};

export const sendBroadcastById = async (broadcastId: string): Promise<{ sent: number }> => {
  const broadcast = await prisma.pushBroadcast.findUnique({ where: { id: broadcastId } });
  if (!broadcast || broadcast.status !== 'pending') {
    return { sent: 0 };
  }

  const tokens = await getAllUserTokens(broadcast.target as 'all' | 'premium');
  if (tokens.length === 0) {
    await prisma.pushBroadcast.update({
      where: { id: broadcastId },
      data: { status: 'sent', sentAt: new Date() },
    });
    return { sent: 0 };
  }

  const data = (broadcast.data as Record<string, any>) || {};

  const { success } = await sendMulticast(tokens, {
    notification: {
      title: broadcast.title,
      body: broadcast.body,
      imageUrl: broadcast.imageUrl || undefined,
    },
    data: {
      ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      type: 'broadcast',
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'amda_notifications',
        icon: ICON,
        color: COLOR,
      },
    },
    webpush: {
      notification: {
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
      },
    },
  });

  await prisma.pushBroadcast.update({
    where: { id: broadcastId },
    data: { status: 'sent', sentAt: new Date() },
  });

  logger.info(`[Broadcast] ✅ Broadcast ${broadcastId} sent to ${success}/${tokens.length} devices`);
  return { sent: success };
};

// ── Scheduler (appelé toutes les 60 s par server.ts) ────────

const BROADCAST_POLL_MS = 60_000;
let schedulerTimer: ReturnType<typeof setInterval> | null = null;

export const startBroadcastScheduler = (): void => {
  if (schedulerTimer) return;

  const tick = async () => {
    try {
      const now = new Date();
      const due = await prisma.pushBroadcast.findMany({
        where: { status: 'pending', scheduledFor: { not: null, lte: now } },
        orderBy: { scheduledFor: 'asc' },
        take: 10,
      });

      for (const b of due) {
        try {
          await sendBroadcastById(b.id);
        } catch (err) {
          logger.error(`[Broadcast] ❌ Error sending scheduled broadcast ${b.id}:`, err);
          await prisma.pushBroadcast.update({
            where: { id: b.id },
            data: { status: 'failed', sentAt: new Date() },
          });
        }
      }
    } catch (err) {
      logger.error('[Broadcast] ❌ Scheduler tick error:', err);
    }
  };

  schedulerTimer = setInterval(tick, BROADCAST_POLL_MS);
  tick().catch(() => {});
  logger.info('[Broadcast] ⏱️ Scheduler started (60s interval)');
};

export const stopBroadcastScheduler = (): void => {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
};
