const CACHE_NAME = 'nithara-main-v17';
const CACHE_PREFIX = 'nithara-main-';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './icon-maskable.png',
    // Core JS Libraries
    './js/pdf-helper.js',
    './js/jspdf.umd.min.js',
    './js/jspdf.plugin.autotable.min.js',
    // Cache entry points for sub-apps
    './calculator/index.html',
    './calculator/style.css',
    './calculator/script.js',
    './dcrg/index.html',
    './dcrg/style.css',
    './dcrg/script.js',
    './emi/index.html',
    './emi/style.css',
    './emi/script.js',
    './salary/index.html',
    './salary/style.css',
    './salary/script.js',
    './pay-revision/index.html',
    './pay-revision/style.css',
    './pay-revision/script.js',
    './housing/index.html',
    './housing/style.css',
    './housing/script.js',
    './sip/index.html',
    './sip/style.css',
    './sip/script.js',
    // Library and Helper scripts
    './capacitor-handler.js'
];

// Install Event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Only delete caches that belong to this module (nithara-main-)
                    // but are not the current versions
                    if (cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME) {
                        console.log('Main SW: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event - Stale-While-Revalidate Strategy
// This allows the app to work offline immediately (from cache)
// and update the cache in the background when online.
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Return cached response if network fails
                return cachedResponse;
            });

            return cachedResponse || fetchPromise;
        })
    );
});
