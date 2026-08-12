import prisma from '../config/database';
import { logger } from '../config/logger';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin (will be done in a separate file)
let firebaseAdmin: admin.app.App | null = null;

export interface NotificationSettings {
  enabled: boolean;
  viewOnce: boolean;
  statusLiked: boolean;
  deletedMessage: boolean;
}

export interface NotificationPayload {
  title: string;
  body: string;
  image?: string;
  data?: {
    type: 'view_once' | 'status_liked' | 'deleted_message';
    id?: string;
    [key: string]: any;
  };
}

/**
 * Initialize Firebase Admin SDK
 */
export const initializeFirebaseAdmin = (): void => {
  if (firebaseAdmin) {
    return;
  }

  try {
    // Firebase Admin will be initialized with service account credentials
    // You need to download the service account key from Firebase Console
    // and set it as an environment variable or in a config file
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!serviceAccount) {
      logger.warn('[NotificationsService] Firebase service account not configured. Push notifications will be disabled.');
      return;
    }

    const serviceAccountJson = JSON.parse(serviceAccount);
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountJson),
    });

    logger.info('[NotificationsService] Firebase Admin initialized successfully');
  } catch (error) {
    logger.error('[NotificationsService] Error initializing Firebase Admin:', error);
  }
};

/**
 * Save FCM token for a user
 */
export const saveFCMToken = async (userId: string, token: string, deviceInfo?: any): Promise<void> => {
  try {
    // Use upsert to handle duplicate token gracefully
    await prisma.fcmToken.upsert({
      where: { token },
      create: {
        userId,
        token,
        deviceInfo: deviceInfo || null,
      },
      update: {
        userId,
        deviceInfo: deviceInfo || null,
        updatedAt: new Date(),
      },
    });

    logger.info(`[NotificationsService] FCM token saved for user ${userId}`);
  } catch (error) {
    logger.error('[NotificationsService] Error saving FCM token:', error);
    throw error;
  }
};

/**
 * Delete FCM token for a user
 */
export const deleteFCMToken = async (userId: string): Promise<void> => {
  try {
    await prisma.fcmToken.deleteMany({
      where: { userId },
    });

    logger.info(`[NotificationsService] FCM token deleted for user ${userId}`);
  } catch (error) {
    logger.error('[NotificationsService] Error deleting FCM token:', error);
    throw error;
  }
};

/**
 * Get notification settings for a user
 */
export const getNotificationSettings = async (userId: string): Promise<NotificationSettings> => {
  try {
    let settings = await prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (settings) {
      // Ensure statusLiked is always false
      if (settings.statusLiked !== false) {
        await prisma.notificationSettings.update({
          where: { userId },
          data: {
            statusLiked: false,
          },
        });
      }

      return {
        enabled: settings.enabled !== false,
        viewOnce: settings.viewOnce !== false,
        statusLiked: false,
        deletedMessage: settings.deletedMessage !== false,
      };
    }

    // Default settings
    return {
      enabled: true,
      viewOnce: true,
      statusLiked: false,
      deletedMessage: true,
    };
  } catch (error) {
    logger.error('[NotificationsService] Error getting notification settings:', error);
    throw error;
  }
};

/**
 * Update notification settings for a user
 */
export const updateNotificationSettings = async (
  userId: string,
  settings: Partial<NotificationSettings>
): Promise<NotificationSettings> => {
  try {
    const updated = await prisma.notificationSettings.upsert({
      where: { userId },
      create: {
        userId,
        enabled: settings.enabled !== undefined ? settings.enabled : true,
        viewOnce: settings.viewOnce !== undefined ? settings.viewOnce : true,
        statusLiked: false,
        deletedMessage: settings.deletedMessage !== undefined ? settings.deletedMessage : true,
      },
      update: {
        enabled: settings.enabled !== undefined ? settings.enabled : undefined,
        viewOnce: settings.viewOnce !== undefined ? settings.viewOnce : undefined,
        statusLiked: false,
        deletedMessage: settings.deletedMessage !== undefined ? settings.deletedMessage : undefined,
      },
    });

    return {
      enabled: updated.enabled !== false,
      viewOnce: updated.viewOnce !== false,
      statusLiked: false,
      deletedMessage: updated.deletedMessage !== false,
    };
  } catch (error) {
    logger.error('[NotificationsService] Error updating notification settings:', error);
    throw error;
  }
};

/**
 * Get FCM tokens for a user
 */
export const getUserFCMTokens = async (userId: string): Promise<string[]> => {
  try {
    const tokens = await prisma.fcmToken.findMany({
      where: { userId },
      select: { token: true },
    });

    return tokens.map((row) => row.token);
  } catch (error) {
    logger.error('[NotificationsService] Error getting FCM tokens:', error);
    return [];
  }
};

/**
 * Send push notification to a user
 */
export const sendPushNotification = async (
  userId: string,
  payload: NotificationPayload
): Promise<boolean> => {
  try {
    // Check if notifications are enabled for this user
    const settings = await getNotificationSettings(userId);
    if (!settings.enabled) {
      logger.info(`[NotificationsService] Notifications disabled for user ${userId}`);
      return false;
    }

    // Check if this notification type is enabled
    if (payload.data?.type === 'view_once' && !settings.viewOnce) {
      return false;
    }
    if (payload.data?.type === 'status_liked') {
      logger.debug('[NotificationsService] Status liked notifications disabled globally');
      return false;
    }
    if (payload.data?.type === 'deleted_message' && !settings.deletedMessage) {
      return false;
    }

    // Get user's FCM tokens
    const tokens = await getUserFCMTokens(userId);
    if (tokens.length === 0) {
      logger.info(`[NotificationsService] No FCM tokens found for user ${userId}`);
      return false;
    }

    if (!firebaseAdmin) {
      logger.warn('[NotificationsService] Firebase Admin not initialized. Cannot send notifications.');
      return false;
    }

    // Send notification to all user's devices
    const message: admin.messaging.MulticastMessage = {
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.image,
      },
      data: payload.data
        ? Object.entries(payload.data).reduce((acc, [key, value]) => {
            acc[key] = String(value);
            return acc;
          }, {} as Record<string, string>)
        : {},
      tokens,
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'amda_notifications',
        },
      },
      webpush: {
        notification: {
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    logger.info(`[NotificationsService] Notification sent to ${response.successCount} devices for user ${userId}`);

    // Remove invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          if (
            resp.error.code === 'messaging/invalid-registration-token' ||
            resp.error.code === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        await prisma.fcmToken.deleteMany({
          where: { token: { in: invalidTokens } },
        });
        logger.info(`[NotificationsService] Removed ${invalidTokens.length} invalid FCM tokens`);
      }
    }

    return response.successCount > 0;
  } catch (error) {
    logger.error('[NotificationsService] Error sending push notification:', error);
    return false;
  }
};

/**
 * Create a notification in the database
 */
export const createNotification = async (
  userId: string,
  type: 'view_once' | 'status_liked' | 'deleted_message',
  title: string,
  body: string,
  imageUrl?: string,
  data?: any
): Promise<string | null> => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        imageUrl: imageUrl || null,
        data: data || null,
        read: false,
      },
      select: { id: true },
    });

    logger.info(`[NotificationsService] Created notification ${notification.id} for user ${userId}`);
    return notification.id;
  } catch (error) {
    logger.error('[NotificationsService] Error creating notification:', error);
    return null;
  }
};

/**
 * Get notifications for a user
 */
export const getNotifications = async (
  userId: string,
  limit: number = 50,
  unreadOnly: boolean = false
): Promise<Array<{
  id: string;
  type: string;
  title: string;
  body: string;
  imageUrl?: string;
  data?: any;
  read: boolean;
  createdAt: string;
}>> => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { read: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      imageUrl: n.imageUrl || undefined,
      data: n.data,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    }));
  } catch (error: any) {
    // Catch any unexpected errors and return empty array
    logger.warn('[NotificationsService] Unexpected error fetching notifications:', {
      message: error?.message || error,
      stack: error?.stack,
    });
    return [];
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (userId: string, notificationId: string): Promise<boolean> => {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: { read: true },
    });

    return result.count > 0;
  } catch (error) {
    logger.error('[NotificationsService] Error marking notification as read:', error);
    return false;
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<boolean> => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: { read: true },
    });

    return true;
  } catch (error) {
    logger.error('[NotificationsService] Error marking all notifications as read:', error);
    return false;
  }
};

/**
 * Get unread notification count
 */
export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  try {
    const count = await prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });

    return count;
  } catch (error) {
    logger.error('[NotificationsService] Error getting unread count:', error);
    return 0;
  }
};
