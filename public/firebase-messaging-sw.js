// firebase-messaging-sw.js
// Service Worker for Firebase Cloud Messaging background push notifications
// Place this file in the /public directory (served at /firebase-messaging-sw.js)
//
// Background messages arrive here when the app is not in the foreground.
// Foreground messages are handled by onMessage() in src/lib/firebase.ts

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// ======================================================================
// FIREBASE CONFIG — must match the config in src/lib/firebase.ts
// These are public-facing values (safe to expose in the service worker).
// ======================================================================
const firebaseConfig = {
  apiKey: self.__FIREBASE_API_KEY__ || "",
  authDomain: self.__FIREBASE_AUTH_DOMAIN__ || "",
  projectId: self.__FIREBASE_PROJECT_ID__ || "bidzaro-catering",
  storageBucket: self.__FIREBASE_STORAGE_BUCKET__ || "",
  messagingSenderId: self.__FIREBASE_MESSAGING_SENDER_ID__ || "",
  appId: self.__FIREBASE_APP_ID__ || "",
};

// Only initialize if we have the required config
if (firebaseConfig.projectId && firebaseConfig.apiKey && firebaseConfig.appId) {
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || 'Bidzaro Notification';
    const body = payload.notification?.body || '';
    const data = payload.data || {};

    const notificationOptions = {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.notificationType || 'bidzaro',
      data,
      // Show notification actions for bid/order events
      actions: getNotificationActions(data.notificationType),
      requireInteraction: shouldRequireInteraction(data.notificationType),
    };

    self.registration.showNotification(title, notificationOptions);
  });
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const deepLink = data.deepLink;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window/tab open with the app
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (deepLink) {
            client.navigate(deepLink);
          }
          return;
        }
      }
      // No existing window — open a new one
      if (clients.openWindow) {
        return clients.openWindow(deepLink || '/dashboard');
      }
    })
  );
});

// ======================================================================
// Helpers
// ======================================================================

function getNotificationActions(notificationType) {
  switch (notificationType) {
    case 'BID_ACCEPTED':
      return [{ action: 'view_order', title: 'View Order' }];
    case 'NEW_BID_REQUEST':
      return [{ action: 'view_bids', title: 'View Bids' }];
    case 'ORDER_CONFIRMED':
      return [{ action: 'view_order', title: 'View Order' }];
    case 'NEW_MESSAGE':
      return [{ action: 'reply', title: 'Open Chat' }];
    default:
      return [];
  }
}

function shouldRequireInteraction(notificationType) {
  // Require interaction (notification persists) for high-priority events
  return ['BID_ACCEPTED', 'ORDER_CONFIRMED', 'ORDER_CANCELLED'].includes(notificationType);
}
