import { useEffect, useState, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications, ActionPerformed, PushNotificationSchema } from "@capacitor/push-notifications";
import { initializePushNotifications, deleteFCMToken } from "@/services/pushNotifications.service";
import { initPush, createPushChannel, removePushListeners } from "@/services/pushCapacitor.service";
import { useAuth } from "./useAuth";

type NotificationTapHandler = (data: { type: string; id?: string; contactId?: string }) => void;

export function usePushNotifications(onTap?: NotificationTapHandler) {
  const { user, isAuthenticated } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;

  useEffect(() => {
    if (!isAuthenticated || !user || isInitialized) return;

    if (Capacitor.isNativePlatform()) {
      setIsSupported(true);
      let disposed = false;
      (async () => {
        try {
          await createPushChannel();
          const token = await initPush();
          if (disposed) return;
          if (token) setIsInitialized(true);

          await PushNotifications.addListener("pushNotificationReceived", (notif: PushNotificationSchema) => {
            console.log("[Push] Foreground received:", notif);
          });

          await PushNotifications.addListener("pushNotificationActionPerformed", (action: ActionPerformed) => {
            const data = (action.notification.data || {}) as Record<string, any>;
            const type = (data.type as string) || "unknown";
            console.log("[Push] Notification tapped:", type, data);
            onTapRef.current?.({ type, id: data.id, contactId: data.contactId });
          });
        } catch (error) {
          console.error("[Push] Native init error:", error);
        }
      })();

      return () => {
        disposed = true;
        removePushListeners();
      };
    }

    if ("Notification" in window && "serviceWorker" in navigator) {
      setIsSupported(true);
      initializePushNotifications()
        .then(() => setIsInitialized(true))
        .catch((error) => console.error("Failed to initialize push notifications:", error));
    }
  }, [isAuthenticated, user, isInitialized]);

  useEffect(() => {
    if (!isAuthenticated && isInitialized) {
      if (Capacitor.isNativePlatform()) {
        removePushListeners();
      } else {
        deleteFCMToken().catch(() => {});
      }
      setIsInitialized(false);
    }
  }, [isAuthenticated, isInitialized]);

  return { isSupported, isInitialized };
}
