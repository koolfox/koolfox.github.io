import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'] });

test('slide worker unregisters its legacy broad scope', async ({ page }) => {
 await page.goto('/deep-learning/');
 await page.evaluate(async () => {
  await navigator.serviceWorker.register('/deep-learning/slide-offline-sw.js', { scope: '/deep-learning/' });
  await navigator.serviceWorker.ready;
 });
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=40');
 await page.waitForFunction(() => window.sourceSlideReader?.ready);
 await expect(page.locator('html')).toHaveAttribute('data-offline-ready', 'true', { timeout: 30000 });
 const scopes = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map(item => new URL(item.scope).pathname));
 expect(scopes).toContain('/deep-learning/terms/');
 expect(scopes).not.toContain('/deep-learning/');
});

test('new slide worker does not control other course pages', async ({ page, context }) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=40');
 await page.waitForFunction(() => window.sourceSlideReader?.ready);
 await expect(page.locator('html')).toHaveAttribute('data-offline-ready', 'true', { timeout: 30000 });
 const otherPage = await context.newPage();
 await otherPage.goto('/deep-learning/playgrounds/cnn-mnist/train/');
 expect(await otherPage.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? null)).toBeNull();
});

test('versioned resources use their matching cache entry while new versions fetch and work offline', async ({ page, context }) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=40');
 await page.waitForFunction(() => window.sourceSlideReader?.ready);
 await expect(page.locator('html')).toHaveAttribute('data-offline-ready', 'true', { timeout: 30000 });
 await page.reload();
 await page.waitForFunction(() => window.sourceSlideReader?.ready && navigator.serviceWorker.controller);
 const result = await page.evaluate(async () => {
  const cache = await caches.open('danna-slide-reader-v1');
  const base = '/deep-learning/assets/course.css';
  await cache.put(`${base}?v=old-test`, new Response('cached-old'));
  await cache.put(`${base}?unversioned=test`, new Response('stale-unversioned'));
  const old = await (await fetch(`${base}?v=old-test`, {cache:'no-store'})).text();
  const nextResponse = await fetch(`${base}?v=new-test`, {cache:'no-store'});
  const next = await nextResponse.clone().text();
  await cache.put(`${base}?v=new-test`, nextResponse);
  const unversioned = await (await fetch(`${base}?unversioned=test`, {cache:'no-store'})).text();
  return {old, next, unversioned};
 });
 expect(result.old).toBe('cached-old');
 expect(result.next).not.toBe('cached-old');
 expect(result.next.length).toBeGreaterThan(100);
 expect(result.unversioned).not.toBe('stale-unversioned');
 await context.setOffline(true);
 const offline = await page.evaluate(async () => (await fetch('/deep-learning/assets/course.css?v=new-test', {cache:'no-store'})).text());
 expect(offline).toBe(result.next);
});

test('stopping the reader aborts an in-flight offline warm-up', async ({ page }) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=40');
 await page.waitForFunction(() => window.sourceSlideReader?.ready);
 await expect(page.locator('html')).toHaveAttribute('data-offline-ready', 'true', { timeout: 30000 });
 const result = await page.evaluate(async () => {
  const {warmSlideOffline} = await import('/deep-learning/assets/slide-offline-cache.js');
  const originalFetch = window.fetch;
  let started = 0, observedAbort = false, notifyStart;
  const startedPromise = new Promise(resolve => { notifyStart = resolve; });
  window.fetch = (_url, options) => new Promise((_resolve, reject) => {
   started++;
   options.signal.addEventListener('abort', () => { observedAbort = true; reject(new DOMException('Aborted', 'AbortError')); }, {once:true});
   notifyStart();
  });
  const controller = new AbortController();
  try {
   const pending = warmSlideOffline(controller.signal);
   await startedPromise;
   controller.abort();
   return {ok:await pending, started, observedAbort};
  } finally { window.fetch = originalFetch; }
 });
 expect(result).toEqual({ok:false, started:1, observedAbort:true});
});

test('visited session one pages load separately and work offline after reload', async ({ page, context }) => {
 const pdfs = [];
 page.on('response', response => { if (/\.pdf\?sha=/.test(response.url())) pdfs.push({url: response.url(), size: Number(response.headers()['content-length'])}); });
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=40');
 await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 40);
 await expect(page.locator('html')).toHaveAttribute('data-offline-ready', 'true', { timeout: 30000 });
 expect(pdfs).toHaveLength(1);
 expect(pdfs[0].url).toContain('/s01-pages/040.pdf');
 expect(pdfs[0].size).toBeLessThan(400000);
 await page.reload();
 await page.waitForFunction(() => window.sourceSlideReader?.ready);
 expect(pdfs).toHaveLength(1);
 await expect(page.locator('html')).toHaveAttribute('data-offline-ready', 'true', { timeout: 30000 });
 await page.locator('[data-next-page]').click();
 await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 41);
 expect(pdfs).toHaveLength(2);
 expect(pdfs[1].url).toContain('/s01-pages/041.pdf');
 await context.setOffline(true);
 await page.reload();
 await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 41);
 await page.locator('[data-prev-page]').click();
 await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 40);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-page', '40');
 expect(await page.evaluate(() => document.fonts.check('16px Arad'))).toBe(true);
 await page.locator('[data-view-translation]').click();
 await expect(page.locator('#persian-page')).toBeVisible();
});

test('the reader still loads online when persistent storage is unavailable', async ({ page }) => {
 await page.addInitScript(() => { window.caches.open = async () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=40');
 await page.waitForFunction(() => window.sourceSlideReader?.ready);
 await expect(page.locator('html')).toHaveAttribute('data-offline-ready', 'false', { timeout: 30000 });
});

test('a corrupted cached page is discarded and fetched again', async ({ page }) => {
 const pdfs = [];
 page.on('response', response => { if (response.url().includes('/s01-pages/040.pdf?sha=')) pdfs.push(response); });
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=40');
 await page.waitForFunction(() => window.sourceSlideReader?.ready);
 expect(pdfs).toHaveLength(1);
 await page.evaluate(async url => {
  const cache = await caches.open('danna-slide-reader-v1');
  await cache.put(url, new Response('incomplete'));
 }, pdfs[0].url());
 await page.reload();
 await page.waitForFunction(() => window.sourceSlideReader?.ready);
 expect(pdfs).toHaveLength(2);
});

test('a guarded slide loads and identifies the complete source PDF', async ({ page, context }) => {
 const pdfs = [];
 page.on('response', response => { if (/\.pdf\?sha=/.test(response.url())) pdfs.push(response.url()); });
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=37');
 await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 37);
 expect(pdfs).toHaveLength(1);
 expect(pdfs[0]).toContain('/s01.pdf?sha=');
 await expect(page.locator('[data-reader-status]')).toContainText('فایل کامل جلسه');
 await expect(page.locator('html')).toHaveAttribute('data-offline-ready', 'true', { timeout: 30000 });
 await context.setOffline(true);
 await page.reload();
 await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 37);
 await expect(page.locator('[data-reader-status]')).toContainText('فایل کامل جلسه');
});

test('another session loads its requested page without the whole PDF', async ({ page }) => {
 const pdfs = [];
 page.on('response', response => { if (/\.pdf\?sha=/.test(response.url())) pdfs.push(response.url()); });
 await page.goto('/deep-learning/terms/spring-2026/s09/slides/#page=17');
 await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 17);
 expect(pdfs).toHaveLength(1);
 expect(pdfs[0]).toContain('/s09-pages/017.pdf?sha=');
});

test('rapid navigation finishes on the latest requested page', async ({ page }) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=1');
 await page.waitForFunction(() => window.sourceSlideReader?.ready);
 await page.evaluate(() => {
  for (const number of [40, 41, 42, 43]) {
   location.hash = `#page=${number}`;
   window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
 });
 await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 43);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-page', '43');
});

test('mobile fullscreen and Persian view remain usable after offline reload', async ({ page, context }) => {
 await page.addInitScript(() => { Object.defineProperty(Element.prototype, 'requestFullscreen', { value: undefined, configurable: true }); });
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=40');
 await page.waitForFunction(() => window.sourceSlideReader?.ready);
 await expect(page.locator('html')).toHaveAttribute('data-offline-ready', 'true', { timeout: 30000 });
 await context.setOffline(true);
 await page.reload();
 await page.waitForFunction(() => window.sourceSlideReader?.ready);
 const fullscreen = page.locator('[data-fullscreen]');
 await fullscreen.click();
 await expect(fullscreen).toHaveAttribute('aria-pressed', 'true');
 await page.locator('[data-view-translation]').click();
 await expect(page.locator('#translation-panel')).toBeVisible();
 await fullscreen.click();
 await expect(fullscreen).toHaveAttribute('aria-pressed', 'false');
});
