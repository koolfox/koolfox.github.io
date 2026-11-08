// Cached documents are keyed by their source hash; incomplete HTTP responses are never stored.
const CACHE = 'danna-slide-reader-v1';
async function cacheStore() {
 try { return await caches.open(CACHE); } catch { return null; }
}

async function validPdf(bytes, expected) {
 const hash = await crypto.subtle.digest('SHA-256', bytes);
 return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('') === expected;
}

function validateManifest(manifest, sourceHash, pageCount) {
 return manifest?.source_sha256 === sourceHash && manifest.page_count === pageCount &&
  Array.isArray(manifest.pages) && manifest.pages.length === pageCount &&
  manifest.pages.every(value => value === null || (typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)));
}

// A source hash identifies the cached manifest. Revalidate online, and use the
// last verified copy only when the network is unavailable or the server fails.
export async function readPdfManifest(url, sourceHash, pageCount, signal) {
 const cache = await cacheStore();
 let response;
 try {
  response = await fetch(url, {signal, cache: 'no-cache'});
  if (response.status >= 500) throw Error('page index server error');
 } catch (error) {
  if (signal?.aborted || error?.name === 'AbortError') throw error;
  const cached = await cache?.match(url).catch(() => null);
  if (!cached) throw error;
  const manifest = await cached.json();
  if (!validateManifest(manifest, sourceHash, pageCount)) throw Error('cached page identity mismatch');
  return manifest;
 }
 if (!response.ok || response.status !== 200) throw Error('page index unavailable');
 const manifest = await response.json();
 if (!validateManifest(manifest, sourceHash, pageCount)) throw Error('page identity mismatch');
 try { await cache?.put(url, new Response(JSON.stringify(manifest), {headers: {'Content-Type': 'application/json'}})); }
 catch { /* Continue online when persistent storage is unavailable. */ }
 return manifest;
}

export async function readPdf(url, expected, signal) {
 let cache = await cacheStore(), response, bytes = null;
 try {
  response = await cache?.match(url);
  bytes = response ? await response.arrayBuffer() : null;
 } catch (error) {
  console.warn('Slide cache read failed', error);
  cache = null;
 }
 if (bytes && !(await validPdf(bytes, expected))) {
  try { await cache.delete(url); } catch (error) { console.warn('Slide cache removal failed', error); cache = null; }
  bytes = null;
 }
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
