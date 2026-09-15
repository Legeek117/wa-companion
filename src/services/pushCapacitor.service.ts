import { Capacitor } from "@capacitor/core";
import { PushNotifications, PermissionStatus, PushNotificationSchema, ActionPerformed, PushNotificationToken } from "@capacitor/push-notifications";
import { api } from "@/lib/api";

export interface IncomingPushData {
  type: 'new_message' | 'view_once' | 'status_liked' | 'deleted_message' | 'unknown';
  id?: string;
  contactId?: string;
  title: string;
  body: string;
  [key: string]: any;
}

/**
 * Create the Android notification channel (required on Android 8+).
 */
export const createPushChannel = async (): Promise<void> => {
  await PushNotifications.createChannel({
    id: 'amda_notifications',
    name: 'Notifications',
    description: 'Alertes de l\'application (nouveaux messages, captures, …)',
    importance: 5, // HIGH
    visibility: 1, // PUBLIC
    sound: 'default',
    vibration: true,
  });
};

/**
 * Register for FCM push notifications (Capacitor / Android).
 * Returns the FCM token or null.
 */
export const requestPushPermission = async (): Promise<PermissionStatus> => {
  return PushNotifications.requestPermissions();
};

export const registerForPush = async (): Promise<string | null> => {
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive === 'denied') {
    console.warn('[PushCapacitor] Notification permission denied');
    return null;
  }
  await PushNotifications.register();
  return await waitForToken(15000);
};

const waitForToken = (timeoutMs = 15000): Promise<string | null> =>
  new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (!settled) {
        settled = true;
        pushTokenListener?.remove();
        pushErrorListener?.remove();
      }
    };

    const pushTokenListener = PushNotifications.addListener(
      'registration',
      (token: PushNotificationToken) => {
        cleanup();
        resolve(token.value || null);
      }
    );

    const pushErrorListener = PushNotifications.addListener(
      'registrationError',
      (err: any) => {
        cleanup();
        console.warn('[PushCapacitor] FCM registration error:', err);
        resolve(null);
      }
    );

    timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);
  });

/**
 * Handle a received notification (foreground).
 */
export const handlePushReceived = (notification: PushNotificationSchema): void => {
  console.log('[PushCapacitor] Received in foreground:', notification);
};

/**
 * Handle a notification tap → navigate to the right screen.
 */
export const handlePushAction = (action: ActionPerformed): IncomingPushData | null => {
  const notif = action.notification;
  const data = (notif.data || {}) as Record<string, any>;
  const type = (data.type as IncomingPushData['type']) || 'unknown';
  console.log('[PushCapacitor] Notification tapped:', notif, data);
  return {
    type,
    id: data.id,
    contactId: data.contactId,
    title: notif.title || '',
    body: notif.body || '',
    ...data,
  };
};

export const initPush = async (): Promise<string | null> => {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    await createPushChannel();
    const token = await registerForPush();
    if (token) {
      const saved = await api.notifications.saveToken({ token, deviceInfo: { platform: Capacitor.getPlatform(), device: navigator.userAgent } });
      console.log('[PushCapacitor] FCM token saved:', saved.success);
      return token;
    }
  } catch (error) {
    console.error('[PushCapacitor] Init error:', error);
  }
  return null;
};

export const removePushListeners = (): void => {
  PushNotifications.removeAllListeners();
};