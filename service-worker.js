const CACHE_NAME = 'kawaii-tasks-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://cdn.tailwindcss.com',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js'
];

// Install service worker and cache all files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell and external resources...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ All files cached successfully!');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('❌ Cache failed:', error);
      })
  );
});

// Activate new service worker immediately
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activated!');
      return self.clients.claim(); // Take control immediately
    })
  );
});

// Fetch strategy: Network first, fall back to cache
self.addEventListener('fetch', (event) => {
  // Skip Chrome extension requests
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If we got a valid response, clone it and update the cache
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('📦 Serving from cache:', event.request.url);
            return cachedResponse;
          }
          
          // If not in cache and it's an HTML request, return the main page
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('./index.html');
          }
          
          return new Response('Offline - resource not available', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});