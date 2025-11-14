// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";
import { getAnalytics, Analytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA24-Lt2kTG-EBZTSuabL8YxMAsP7gSSIU",
  authDomain: "amda-dcf4a.firebaseapp.com",
  projectId: "amda-dcf4a",
  storageBucket: "amda-dcf4a.firebasestorage.app",
  messagingSenderId: "880354249320",
  appId: "1:880354249320:web:e7d490661a0edb228389dd",
  measurementId: "G-BDK3Y3FZWD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (only in browser)
let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

// Initialize Messaging (only in browser and if service worker is supported)
let messaging: Messaging | null = null;
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.warn("Firebase Messaging initialization failed:", error);
  }
}

export { app, analytics, messaging };
export { getToken, onMessage };

