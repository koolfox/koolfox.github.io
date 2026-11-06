// Cached documents are keyed by their source hash; incomplete HTTP responses are never stored.
const CACHE = 'danna-slide-reader-v1';
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
