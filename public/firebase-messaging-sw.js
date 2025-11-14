// Import and configure the Firebase SDK
// These scripts are made available when the app is served or deployed on Firebase Hosting
// Using compat version for service worker compatibility
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
firebase.initializeApp({
  apiKey: "AIzaSyA24-Lt2kTG-EBZTSuabL8YxMAsP7gSSIU",
  authDomain: "amda-dcf4a.firebaseapp.com",
  projectId: "amda-dcf4a",
  storageBucket: "amda-dcf4a.firebasestorage.app",
  messagingSenderId: "880354249320",
  appId: "1:880354249320:web:e7d490661a0edb228389dd",
  measurementId: "G-BDK3Y3FZWD"
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'AMDA';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    image: payload.notification?.image,
    data: payload.data,
    tag: payload.data?.type || 'default',
    requireInteraction: false,
    silent: false,
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');
  
  event.notification.close();

  const data = event.notification.data;
  let urlToOpen = '/dashboard';

  // Determine URL based on notification type
  if (data?.type === 'view_once') {
    urlToOpen = '/dashboard/view-once';
  } else if (data?.type === 'status_liked') {
    urlToOpen = '/dashboard/status/list';
  } else if (data?.type === 'deleted_message') {
    urlToOpen = '/dashboard/deleted-messages';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

