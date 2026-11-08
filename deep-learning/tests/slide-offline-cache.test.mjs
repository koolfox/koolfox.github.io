import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Load the browser module without changing how the repository treats .js files.
const moduleText = await readFile(new URL('../assets/slide-offline-cache.js', import.meta.url), 'utf8');
const { readPdfManifest } = await import(`data:text/javascript;base64,${Buffer.from(moduleText).toString('base64')}`);

const source = 'a'.repeat(64);
const url = 'https://example.test/manifest.json?sha=' + source;
const manifest = {source_sha256: source, page_count: 2, pages: ['b'.repeat(64), null]};
const originalFetch = globalThis.fetch;
const originalCaches = globalThis.caches;

afterEach(() => { globalThis.fetch = originalFetch; globalThis.caches = originalCaches; });

test('offline reload uses a validated previously fetched PDF index', async () => {
 const entries = new Map();
 globalThis.caches = {open: async () => ({
  put: async (key, value) => entries.set(key, value),
  match: async key => entries.get(key)?.clone(),
 })};
 globalThis.fetch = async () => new Response(JSON.stringify(manifest));
 assert.deepEqual(await readPdfManifest(url, source, 2), manifest);
 globalThis.fetch = async () => { throw new TypeError('offline'); };
 assert.deepEqual(await readPdfManifest(url, source, 2), manifest);
 entries.set(url, new Response(JSON.stringify({...manifest, source_sha256: 'wrong'})));
 await assert.rejects(readPdfManifest(url, source, 2), /cached page identity mismatch/);
});

test('does not hide aborts or a changed missing index behind cached data', async () => {
 const cache = {match: async () => new Response(JSON.stringify(manifest))};
 globalThis.caches = {open: async () => cache};
 globalThis.fetch = async () => new Response('', {status: 404});
 await assert.rejects(readPdfManifest(url, source, 2), /page index unavailable/);
 const signal = AbortSignal.abort();
 globalThis.fetch = async () => { throw new DOMException('Aborted', 'AbortError'); };
 await assert.rejects(readPdfManifest(url, source, 2, signal), {name: 'AbortError'});
});

test('works without storage online and falls back on a server failure', async () => {
 globalThis.caches = {open: async () => { throw new Error('quota'); }};
 globalThis.fetch = async () => new Response(JSON.stringify(manifest));
 assert.deepEqual(await readPdfManifest(url, source, 2), manifest);
 globalThis.caches = {open: async () => ({match: async () => new Response(JSON.stringify(manifest))})};
 globalThis.fetch = async () => new Response('', {status: 503});
 assert.deepEqual(await readPdfManifest(url, source, 2), manifest);
});
