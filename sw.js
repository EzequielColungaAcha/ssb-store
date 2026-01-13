const CACHE_NAME = 'ssb-pedidos-v2';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/icon.png',
  '/logo.svg',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control immediately
  self.clients.claim();
});

// Fetch event - network first for JSON, cache first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always fetch products.json and combos.json from network (fresh data)
  if (
    url.pathname.endsWith('products.json') ||
    url.pathname.endsWith('combos.json')
  ) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => {
        // If network fails, try cache as fallback (ignore query string for matching)
        return caches.match(event.request, { ignoreSearch: true });
      })
    );
    return;
  }

  // For other requests, try cache first, then network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Don't cache non-successful responses or non-GET requests
        if (
          !response ||
          response.status !== 200 ||
          event.request.method !== 'GET'
        ) {
          return response;
        }
        // Clone and cache the response
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});
