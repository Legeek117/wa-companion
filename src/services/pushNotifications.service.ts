import { messaging, getToken, onMessage } from "@/config/firebase";
import { api } from "@/lib/api";

// VAPID Key - À obtenir depuis Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
// Pour l'instant, on va utiliser une variable d'environnement
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";

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
 * Request permission for push notifications
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    console.warn("Notification permission denied");
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
};

/**
 * Wait for service worker to be ready and check for pushManager
 */
const waitForServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  try {
    // Wait for service worker to be ready
    let registration: ServiceWorkerRegistration | null = null;
    
    // Try to get existing registration first
    registration = await navigator.serviceWorker.getRegistration();
    
    // If no registration, wait for ready
    if (!registration) {
      registration = await navigator.serviceWorker.ready;
    }
    
    // Wait a bit more to ensure pushManager is available
    if (registration && !registration.pushManager) {
      console.log("Waiting for pushManager to be available...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check again
      if (!registration.pushManager) {
        console.warn("pushManager still not available after wait");
        return null;
      }
    }
    
    return registration;
  } catch (error) {
    console.warn("Service worker not ready:", error);
    return null;
  }
};

/**
 * Get FCM token for the current user
 */
export const getFCMToken = async (): Promise<string | null> => {
  if (!messaging) {
    console.warn("Firebase Messaging is not available");
    return null;
  }

  try {
    const permission = await requestNotificationPermission();
    if (!permission) {
      return null;
    }

    // Wait for service worker to be ready before getting token
    const registration = await waitForServiceWorker();
    if (!registration) {
      console.warn("Service worker not available, cannot get FCM token");
      return null;
    }

    // Check if pushManager is available
    if (!registration || !registration.pushManager) {
      console.warn("PushManager not available in service worker registration");
      // Try without serviceWorkerRegistration parameter
      try {
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
        });
        if (token) {
          console.log("FCM Token (without serviceWorkerRegistration):", token);
          return token;
        }
      } catch (fallbackError) {
        console.error("Failed to get token even without serviceWorkerRegistration:", fallbackError);
      }
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log("FCM Token:", token);
      return token;
    } else {
      console.warn("No registration token available");
      return null;
    }
  } catch (error) {
    console.error("An error occurred while retrieving token:", error);
    return null;
  }
};

/**
 * Save FCM token to backend
 */
export const saveFCMToken = async (token: string): Promise<boolean> => {
  try {
    const response = await api.notifications.saveToken({ token });
    return response.success;
  } catch (error) {
    console.error("Error saving FCM token:", error);
    return false;
  }
};

/**
 * Initialize push notifications
 */
export const initializePushNotifications = async (): Promise<void> => {
  if (!messaging) {
    console.warn("Firebase Messaging is not available");
    return;
  }

  try {
    // Wait a bit for service worker to be registered
    if ("serviceWorker" in navigator) {
      try {
        await navigator.serviceWorker.ready;
      } catch (error) {
        console.warn("Service worker not ready, waiting...", error);
        // Wait a bit more
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Request permission
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.warn("Notification permission not granted");
      return;
    }

    // Get token (with retry logic)
    let token: string | null = null;
    let retries = 3;
    while (!token && retries > 0) {
      token = await getFCMToken();
      if (!token && retries > 1) {
        console.log(`Retrying FCM token retrieval... (${retries - 1} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      retries--;
    }

    if (!token) {
      console.warn("Failed to get FCM token after retries");
      return;
    }

    // Save token to backend
    await saveFCMToken(token);

    // Listen for foreground messages
    onMessage(messaging, (payload) => {
      console.log("Message received in foreground:", payload);
      
      // Show notification manually in foreground
      if (payload.notification) {
        const notificationOptions: NotificationOptions = {
          body: payload.notification.body,
          icon: "/icon-192x192.png",
          badge: "/icon-192x192.png",
          data: payload.data,
          tag: payload.data?.type || "default",
        };
        
        // Add image if available (some browsers support it)
        if (payload.notification.image) {
          (notificationOptions as any).image = payload.notification.image;
        }
        
        new Notification(payload.notification.title || "AMDA", notificationOptions);
      }
    });
  } catch (error) {
    console.error("Error initializing push notifications:", error);
  }
};

/**
 * Delete FCM token (when user logs out or disables notifications)
 */
export const deleteFCMToken = async (): Promise<boolean> => {
  try {
    const response = await api.notifications.deleteToken();
    return response.success;
  } catch (error) {
    console.error("Error deleting FCM token:", error);
    return false;
  }
};

