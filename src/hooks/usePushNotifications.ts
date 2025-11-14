import { useEffect, useState } from "react";
import { initializePushNotifications, deleteFCMToken } from "@/services/pushNotifications.service";
import { useAuth } from "./useAuth";

export function usePushNotifications() {
  const { user, isAuthenticated } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if browser supports notifications
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    // Initialize push notifications when user is authenticated
    if (isAuthenticated && user && !isInitialized) {
      initializePushNotifications()
        .then(() => {
          setIsInitialized(true);
          console.log("Push notifications initialized");
        })
        .catch((error) => {
          console.error("Failed to initialize push notifications:", error);
        });
    }

    // Cleanup: Delete token when user logs out
    return () => {
      if (!isAuthenticated && isInitialized) {
        deleteFCMToken()
          .then(() => {
            setIsInitialized(false);
            console.log("Push notifications token deleted");
          })
          .catch((error) => {
            console.error("Failed to delete push notifications token:", error);
          });
      }
    };
  }, [isAuthenticated, user, isInitialized]);

  return {
    isSupported,
    isInitialized,
  };
}

