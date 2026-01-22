const CACHE_NAME = 'ssb-pedidos-v3';

// Static assets to cache (images and fonts only - not critical files)
const STATIC_ASSETS = [
  '/icon.png',
  '/logo.svg',
];

// Critical files that should always be fetched from network first
const NETWORK_FIRST_FILES = [
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'products.json',
  'combos.json',
];

// Check if a request is for a critical file
function isNetworkFirstFile(url) {
  return NETWORK_FIRST_FILES.some(file => 
    url.pathname.endsWith(file) || url.pathname === '/'
  );
}

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

// Fetch event - network first for critical files, cache first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network first strategy for critical files (HTML, CSS, JS, JSON)
  if (isNetworkFirstFile(url)) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          // Cache the fresh response for offline fallback
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try cache as fallback
          return caches.match(event.request, { ignoreSearch: true });
        })
    );
    return;
  }

  // Cache first strategy for static assets (images, fonts)
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
