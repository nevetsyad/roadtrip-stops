// Service worker for Roadtrip Stops PWA
const CACHE_NAME = 'roadtrip-v1';
const PRECACHE_URLS = ['.', 'index.html', 'manifest.json'];

// Install: skip waiting so the new SW takes over immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: claim clients so the new SW handles fetches right away
self.addEventListener('activate', (event) => {
  event.waitUntil(
    clients.claim().then(() => {
      // Clean up old caches
      return caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      );
    })
  );
});

// Fetch: network-first for our own files, cache-first for everything else
self.addEventListener('fetch', (event) => {
  // For our own origin: try network, fall back to cache
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
  // For external resources (Leaflet tiles, etc.): cache-first
  else {
    event.respondWith(
      caches.match(event.request)
        .then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
          }).catch(() => {
            // For tile requests, return a minimal fallback
            if (event.request.url.includes('.png') || event.request.url.includes('.jpg')) {
              return new Response('', { status: 404 });
            }
            return new Response('Offline', { status: 503 });
          });
        })
    );
  }
});

// Handle messages from the app (e.g., cache invalidation)
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
