const CACHE_NAME = 'emi-calc-v3';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './icon-1024.jpg',
    './icon-512.png',
    './icon-192.png',
    './manifest.json',
    './screenshot.png',
    '../js/pdf-helper.js',
    '../js/jspdf.umd.min.js',
    '../js/jspdf.plugin.autotable.min.js',
    '../capacitor.js',
    '../capacitor-handler.js'
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
