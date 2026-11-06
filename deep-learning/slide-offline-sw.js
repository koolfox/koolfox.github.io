const CACHE = 'danna-slide-reader-v1';
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
 const request = event.request, url = new URL(request.url);
 if (request.method !== 'GET' || url.origin !== location.origin || !(url.pathname.startsWith('/deep-learning/') || url.pathname.startsWith('/assets/fonts/')) || request.headers.has('range')) return;
 event.respondWith((async () => {
  let cache = null;
  try { cache = await caches.open(CACHE); } catch {}
  if (cache && (url.searchParams.has('v') || url.searchParams.has('sha'))) {
   const cached = await cache.match(request);
   if (cached) return cached;
  }
  try { return await fetch(request); }
  catch { return await cache?.match(request) || Response.error(); }
 })());
});
