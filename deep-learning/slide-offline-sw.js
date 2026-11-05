const CACHE = 'danna-slide-reader-v1';
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
 const request = event.request, url = new URL(request.url);
 if (request.method !== 'GET' || url.origin !== location.origin || !(url.pathname.startsWith('/deep-learning/') || url.pathname.startsWith('/assets/fonts/')) || request.headers.has('range')) return;
 event.respondWith(fetch(request).catch(async () => (await caches.open(CACHE)).match(request) || Response.error()));
});
