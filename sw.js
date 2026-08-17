const CACHE_NAME = 'dzikir-najmushshaghir-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './favicon balai najmushshaghir terbaru.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

let notificationTimers = [];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'NEW_SCHEDULE_ADDED') {
    const item = event.data.schedule || {};
    self.registration.showNotification("Jadwal Baru Ditambahkan! 🕌", {
      body: `Jadwal meudike baru di ${item.place || 'lokasi baru'} telah ditambahkan.`,
      icon: './favicon balai najmushshaghir terbaru.png',
      badge: './favicon balai najmushshaghir terbaru.png',
      vibrate: [200, 100, 200],
      tag: 'new-schedule-' + (item.id || Date.now())
    });
    return;
  }

  if (event.data.type === 'TEST_NOTIFICATION') {
    self.registration.showNotification("Tes Notifikasi Dzikir 🕌", {
      body: "Notifikasi pengingat jadwal dzikir berfungsi dengan baik.",
      icon: './favicon balai najmushshaghir terbaru.png',
      badge: './favicon balai najmushshaghir terbaru.png',
      vibrate: [100, 50, 100]
    });
    return;
  }

  if (event.data.type === 'SCHEDULE_UPDATE') {
    notificationTimers.forEach(timer => clearTimeout(timer));
    notificationTimers = [];

    const schedules = event.data.schedules || [];
    const now = new Date().getTime();

    schedules.forEach((item) => {
      if (item.isCompleted || !item.date || !item.exactTime) return;

      const eventDateTimeStr = `${item.date}T${item.exactTime}:00`;
      const eventTime = new Date(eventDateTimeStr).getTime();
      
      if (isNaN(eventTime)) return;

      const reminderTime = eventTime - (2 * 60 * 60 * 1000);
      const delay = reminderTime - now;

      if (delay > 0 && delay < 2147483647) {
        const timerId = setTimeout(() => {
          self.registration.showNotification("Pengingat Jadwal Meudike 🕌", {
            body: `Acara di ${item.place} akan dimulai 2 jam lagi (${item.exactTime} WIB).`,
            icon: './favicon balai najmushshaghir terbaru.png',
            badge: './favicon balai najmushshaghir terbaru.png',
            vibrate: [300, 100, 300],
            tag: 'reminder-' + item.id
          });
        }, delay);

        notificationTimers.push(timerId);
      }
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});
