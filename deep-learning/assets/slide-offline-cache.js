// Cached documents are keyed by their source hash; incomplete HTTP responses are never stored.
const CACHE = 'danna-slide-reader-v1';
const root = '/deep-learning/';

async function cacheStore() {
 try { return await caches.open(CACHE); } catch { return null; }
}

async function validPdf(bytes, expected) {
 const hash = await crypto.subtle.digest('SHA-256', bytes);
 return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('') === expected;
}

export async function readPdf(url, expected, signal) {
 const cache = await cacheStore();
 let response = await cache?.match(url);
 let bytes = response ? await response.arrayBuffer() : null;
 if (bytes && !(await validPdf(bytes, expected))) { await cache.delete(url); bytes = null; }
 if (!bytes) {
  response = await fetch(url, {signal});
  if (!response.ok || response.status !== 200) throw Error('PDF download incomplete');
  bytes = await response.arrayBuffer();
  if (!(await validPdf(bytes, expected))) throw Error('PDF identity mismatch');
  if (cache) {
   try { await cache.put(url, new Response(bytes.slice(0), {headers: {'Content-Type': 'application/pdf'}})); }
   catch { /* Storage can be unavailable or full; reading still works online. */ }
  }
 }
 return bytes;
}

export async function warmSlideOffline(signal) {
 return false; // Diagnostic only: isolate the slide worker.
 if (!('serviceWorker' in navigator) || !('caches' in window)) return false;
 try {
  if (signal?.aborted) return false;
  const script = new URL(`${root}slide-offline-sw.js`, location.href).href;
  const oldScope = new URL(root, location.href).href;
  for (const registration of await navigator.serviceWorker.getRegistrations()) {
   if (signal?.aborted) return false;
   const worker = registration.active || registration.waiting || registration.installing;
   if (registration.scope === oldScope && worker?.scriptURL === script) await registration.unregister();
  }
  await navigator.serviceWorker.register(script, {scope: `${root}terms/`});
  await navigator.serviceWorker.ready;
  await document.fonts.ready;
  if (signal?.aborted) return false;
  const cache = await cacheStore(); if (!cache) return false;
  const urls = new Set([location.href.split('#')[0], ...performance.getEntriesByType('resource').map(item => item.name)]);
  for (const raw of urls) {
   if (signal?.aborted) return false;
   const url = new URL(raw, location.href);
   if (url.origin !== location.origin || !(url.pathname.startsWith(root) || url.pathname.startsWith('/assets/fonts/')) || /\.(?:pdf|mp4|bin)(?:$|\?)/i.test(url.pathname)) continue;
   const response = await fetch(url.href, {signal});
   if (!response.ok || response.status !== 200) return false;
   if (signal?.aborted) return false;
   await cache.put(url.href, response);
  }
  return true;
 } catch { return false; }
}
