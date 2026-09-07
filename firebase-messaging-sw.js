// firebase-messaging-sw.js
// ВАЖНО: этот файл должен лежать в ТОЙ ЖЕ папке, что и MyDesk.html, на реальном хостинге (не локально).
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDnF2zAxyOXk1T9We7cEbHW_81re1xRX8A",
  authDomain: "mydesk-f83cc.firebaseapp.com",
  databaseURL: "https://mydesk-f83cc-default-rtdb.firebaseio.com",
  projectId: "mydesk-f83cc",
  storageBucket: "mydesk-f83cc.firebasestorage.app",
  messagingSenderId: "438550019588",
  appId: "1:438550019588:web:1f2de4372e9f356bb87f51"
});

const messaging = firebase.messaging();

// Показываем уведомление, когда приложение полностью закрыто или свёрнуто
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || 'MyDesk';
  const body = (payload.notification && payload.notification.body) || 'У вас напоминание';
  self.registration.showNotification(title, {
    body,
    icon: 'https://i.ibb.co/bM92wtTZ/editing-result-b354bffda85a11f1893972bf94faac54-1.jpg',
    badge: 'https://i.ibb.co/LDGqYG69/Rocket.webp',
    tag: 'mydesk-reminder'
  });
});

// Клик по уведомлению — открыть или переключиться на вкладку с приложением
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});
