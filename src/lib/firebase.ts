/**
 * Firebase FCM Push Notification Service
 * Bidzaro Catering Platform — Vendor UI
 *
 * Handles:
 *  - Firebase app initialization
 *  - FCM token acquisition & refresh
 *  - Foreground message listening
 *  - Browser notification permission requests
 *  - Token registration with backend (PUT /users/me/fcm-token)
 */

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  Messaging,
  MessagePayload,
} from "firebase/messaging";
import * as api from "./api";

// ======================================================================
// FIREBASE CONFIG — replace with real values from Firebase Console
// (Project Settings → Your apps → Web → Firebase config)
// Store actual values in VITE_ environment variables for security.
// ======================================================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "bidzaro-catering",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// VAPID key from Firebase Console → Cloud Messaging → Web Push certificates
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let currentFcmToken: string | null = null;

/**
 * Whether Firebase is properly configured.
 * We check for the minimum required fields.
 */
function isFirebaseConfigured(): boolean {
  return !!(firebaseConfig.projectId && firebaseConfig.apiKey && firebaseConfig.appId);
}

/**
 * Initialize Firebase app and Messaging.
 * Safe to call multiple times — idempotent.
 */
export function initFirebase(): Messaging | null {
  if (!isFirebaseConfigured()) {
    return null;
  }

  try {
    // Reuse existing app if already initialized
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    messaging = getMessaging(app);
    return messaging;
  } catch (err) {

    return null;
  }
}

/**
 * Request notification permission and get the FCM registration token.
 * Automatically registers the token with the backend.
 *
 * @returns FCM token string, or null if unavailable/denied.
 */
export async function requestFcmToken(): Promise<string | null> {
  if (!("Notification" in window)) {
    return null;
  }

  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return null;
  }

  const m = messaging ?? initFirebase();
  if (!m) return null;

  try {
    const token = await getToken(m, { vapidKey: VAPID_KEY || undefined });
    if (!token) {
      return null;
    }

    currentFcmToken = token;


    // Register with backend
    await registerTokenWithBackend(token);

    return token;
  } catch (err) {

    return null;
  }
}

/**
 * Register or refresh FCM token with Bidzaro backend.
 * PUT /api/v1/users/me/fcm-token
 */
async function registerTokenWithBackend(token: string): Promise<void> {
  try {
    await api.registerFcmToken(token);
    localStorage.setItem("fcmToken", token);

  } catch (err) {
    // Non-fatal — push will still work via WebSocket
  }
}

/**
 * Handle foreground messages (app is open and focused).
 * Shows a browser notification manually (FCM doesn't auto-show when app is in foreground).
 *
 * @param onNotification Optional callback for custom UI (e.g., toast).
 * @returns Unsubscribe function.
 */
export function onForegroundMessage(
  onNotification?: (payload: MessagePayload) => void
): () => void {
  const m = messaging ?? initFirebase();
  if (!m) return () => {};

  const unsubscribe = onMessage(m, (payload) => {


    const title = payload.notification?.title || "Bidzaro";
    const body = payload.notification?.body || "";
    const data = payload.data || {};

    // Show browser notification when tab is focused
    if (Notification.permission === "granted") {
      try {
        const notif = new Notification(title, {
          body,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: data.notificationType || "bidzaro-notification",
          data,
        });

        notif.onclick = () => {
          window.focus();
          const deepLink = data.deepLink;
          if (deepLink) {
            window.location.href = deepLink;
          }
          notif.close();
        };
      } catch (e) {
        // Some browsers restrict Notification in certain contexts
      }
    }

    // Call custom handler (e.g., show toast, update badge)
    onNotification?.(payload);
  });

  return unsubscribe;
}

/**
 * Set up FCM token refresh handler.
 * FCM tokens can expire — call this once on app init.
 * On token refresh, automatically re-registers with backend.
 */
export async function setupTokenRefresh(): Promise<void> {
  // Re-request token — if it changed, re-register
  const newToken = await requestFcmToken();
  if (newToken && newToken !== currentFcmToken) {

    currentFcmToken = newToken;
    await registerTokenWithBackend(newToken);
  }
}

/**
 * Get the current FCM token (or null if not yet obtained).
 */
export function getCurrentFcmToken(): string | null {
  return currentFcmToken ?? localStorage.getItem("fcmToken");
}

/**
 * Full initialization sequence:
 *  1. Initialize Firebase
 *  2. Request notification permission & get FCM token
 *  3. Set up foreground message handler
 *
 * @param onNotification Callback for foreground notifications (show toast, update badge etc.)
 * @returns Unsubscribe function for foreground messages.
 */
export async function initializePushNotifications(
  onNotification?: (payload: MessagePayload) => void
): Promise<() => void> {
  initFirebase();

  if (!isFirebaseConfigured()) {
    return () => {};
  }

  // Get/refresh token asynchronously (non-blocking)
  requestFcmToken().catch((err) => {
    // Token acquisition error
  });

  // Set up foreground message handler
  return onForegroundMessage(onNotification);
}
