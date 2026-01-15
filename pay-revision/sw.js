const CACHE_NAME = 'pay-rev-v9';
const ASSETS = [
    'index.html',
    'style.css',
    'script.js',
    'manifest.json',
    '../icon-192.png',
    '../js/pdf-helper.js',
    '../js/jspdf.umd.min.js',
    '../js/jspdf.plugin.autotable.min.js',
    '../capacitor.js',
    '../capacitor-handler.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});
