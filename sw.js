const CACHE_NAME = 'anagrammer-v1';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './dictionary.js',
    './manifest.json',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap'
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
