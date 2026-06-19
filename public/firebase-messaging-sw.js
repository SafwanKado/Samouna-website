// Service Worker for Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// We'll try to fetch the config from the server or assume standard fields
// NOTE: Ideally this would be dynamic, but service workers are static assets.
// AIS environment provides firebase-applet-config.json which we can try to fetch.

async function initMessaging() {
  try {
    const response = await fetch('/firebase-applet-config.json');
    const config = await response.json();
    
    firebase.initializeApp(config);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Received background message ', payload);
      
      const notificationTitle = payload.notification.title;
      const notificationOptions = {
        body: payload.notification.body,
        icon: '/favicon.ico'
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  } catch (error) {
    console.error('Failed to initialize messaging in SW:', error);
  }
}

initMessaging();
