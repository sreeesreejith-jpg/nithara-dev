const CACHE_NAME = 'sip-calc-v2';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './icon-1024.jpg',
    './icon-512.png',
    './icon-192.png',
    './manifest.json',
    './screenshot.png'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
