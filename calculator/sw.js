const CACHE_NAME = 'calc-v5';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    '../js/pdf-helper.js',
    '../js/jspdf.umd.min.js',
    '../js/jspdf.plugin.autotable.min.js',
    '../capacitor.js',
    '../capacitor-handler.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});
