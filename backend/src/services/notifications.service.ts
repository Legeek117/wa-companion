import { getSupabaseClient } from '../config/database';
import { logger } from '../config/logger';
import * as admin from 'firebase-admin';

const supabase = getSupabaseClient();

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
    const { error } = await supabase
      .from('fcm_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          device_info: deviceInfo || {},
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'token',
        }
      );

    if (error) {
      logger.error('[NotificationsService] Error saving FCM token:', error);
      throw error;
    }

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
    const { error } = await supabase
      .from('fcm_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) {
      logger.error('[NotificationsService] Error deleting FCM token:', error);
      throw error;
    }

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
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('[NotificationsService] Error fetching notification settings:', error);
      throw error;
    }

    if (data) {
      return {
        enabled: data.enabled !== false,
        viewOnce: data.view_once !== false,
        statusLiked: data.status_liked !== false,
        deletedMessage: data.deleted_message !== false,
      };
    }

    // Default settings
    return {
      enabled: true,
      viewOnce: true,
      statusLiked: true,
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
    const { data, error } = await supabase
      .from('notification_settings')
      .upsert(
        {
          user_id: userId,
          enabled: settings.enabled !== undefined ? settings.enabled : true,
          view_once: settings.viewOnce !== undefined ? settings.viewOnce : true,
          status_liked: settings.statusLiked !== undefined ? settings.statusLiked : true,
          deleted_message: settings.deletedMessage !== undefined ? settings.deletedMessage : true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )
      .select('*')
      .single();

    if (error) {
      logger.error('[NotificationsService] Error updating notification settings:', error);
      throw error;
    }

    return {
      enabled: data.enabled !== false,
      viewOnce: data.view_once !== false,
      statusLiked: data.status_liked !== false,
      deletedMessage: data.deleted_message !== false,
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
    const { data, error } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', userId);

    if (error) {
      logger.error('[NotificationsService] Error fetching FCM tokens:', error);
      return [];
    }

    return data?.map((row) => row.token) || [];
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
    if (payload.data?.type === 'status_liked' && !settings.statusLiked) {
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
        await supabase.from('fcm_tokens').delete().in('token', invalidTokens);
        logger.info(`[NotificationsService] Removed ${invalidTokens.length} invalid FCM tokens`);
      }
    }

    return response.successCount > 0;
  } catch (error) {
    logger.error('[NotificationsService] Error sending push notification:', error);
    return false;
  }
};

