// Service Worker for LC Boutique PWA (Instant App Shell Launch for Native OS Animation + Push Notifications)
const CACHE_NAME = 'lc-store-shell-v8';
const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL_ASSETS).catch(() => {});
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      self.registration.navigationPreload
        ? self.registration.navigationPreload.enable().catch(() => {})
        : Promise.resolve(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      }),
    ])
  );
});

// Instant Stale-While-Revalidate for App Shell so Android/Xiaomi OS Launcher animation never times out
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Skip cross-origin requests (Firestore, Google Fonts, external CDNs) and backend API routes
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  // For HTML navigation requests: respond immediately from cache if available so the OS window animates instantly,
  // while updating the cache in the background
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedIndex = (await cache.match('/index.html')) || (await cache.match('/'));
        const networkFetch = (async () => {
          try {
            const preloadResponse = await event.preloadResponse;
            if (preloadResponse && preloadResponse.ok) {
              cache.put('/index.html', preloadResponse.clone());
              return preloadResponse;
            }
            const freshResponse = await fetch(request);
            if (freshResponse && freshResponse.ok) {
              cache.put('/index.html', freshResponse.clone());
            }
            return freshResponse;
          } catch (err) {
            if (cachedIndex) return cachedIndex;
            throw err;
          }
        })();

        return cachedIndex || networkFetch;
      })
    );
    return;
  }

  // For local static assets (JS, CSS, icons, manifest): Stale-While-Revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => cached || Response.error());

      return cached || fetchPromise;
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
      requireInteraction: false,
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
    icon: data.icon || '/pwa-192x192.png',
    badge: '/icon.svg',
    vibrate: [200, 100, 200],
    data: data.data || { url: '/' },
    renotify: true,
    tag: data.tag || `lc-push-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  };

  event.waitUntil(self.registration.showNotification(data.title || 'متجر LC', options));
});

// Handle Notification Click (Focus or Open App Window)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl =
    event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

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
