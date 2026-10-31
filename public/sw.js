// Service Worker for LC Boutique PWA (WebAPK Installability + Push Notifications)
const CACHE_NAME = 'lc-store-cache-v6';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      })
    ])
  );
});

// Required fetch handler for Android Chrome WebAPK compilation & Xiaomi native launcher animations
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Skip cross-origin requests (Firestore, Google Fonts, external CDNs) and backend API routes
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request).then((cached) => {
        if (cached) return cached;
        if (request.mode === 'navigate') {
          return caches.match('/');
        }
        return Response.error();
      });
    })
  );
});

// Listen to message events from the main window to trigger notifications directly through SW
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, {
      ...options,
      renotify: true,
      requireInteraction: false
    });
  }
});

// Handle incoming Web Push
self.addEventListener('push', (event) => {
  let data = { title: 'متجر LC', body: 'تحديث جديد لطلبك' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'لديك تنبيه جديد من متجر LC',
    icon: data.icon || '/pwa-192x192.png?v=white2',
    badge: '/icon.svg?v=white2',
    vibrate: [200, 100, 200],
    data: data.data || { url: '/' },
    renotify: true,
    tag: data.tag || `lc-push-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'متجر LC', options)
  );
});

// Handle Notification Click (Focus or Open App Window)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
