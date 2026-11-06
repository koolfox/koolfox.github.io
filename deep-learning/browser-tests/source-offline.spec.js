import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'] });

test('visited pages load separately and remain available during an offline session', async ({ page, context }) => {
 const pdfs = [];
 page.on('response', response => { if (/\.pdf\?sha=/.test(response.url())) pdfs.push({url: response.url(), size: Number(response.headers()['content-length'])}); });
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=40');
 await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 40);
 expect(pdfs).toHaveLength(1);
 expect(pdfs[0].url).toContain('/s01-pages/040.pdf');
 expect(pdfs[0].size).toBeLessThan(400000);
 await page.reload();
 await page.waitForFunction(() => window.sourceSlideReader?.ready);
 expect(pdfs).toHaveLength(1);
 await page.locator('[data-next-page]').click();
 await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 41);
 expect(pdfs).toHaveLength(2);
 expect(pdfs[1].url).toContain('/s01-pages/041.pdf');
 await context.setOffline(true);
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
 await context.setOffline(true);
 await page.locator('[data-next-page]').click();
 await page.locator('[data-prev-page]').click();
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

test('rapid reader unload settles in-flight PDF renders and restores history', async ({page}) => {
 const errors = [];
 page.on('pageerror', error => errors.push(error.message));
 const deck = '/deep-learning/terms/spring-2026/s01/slides/';
 for (let i = 0; i < 5; i++) {
  await page.goto(deck + '#page=40');
  await page.waitForFunction(() => window.sourceSlideReader?.ready);
  await page.locator('[data-next-page]').click();
  await page.goto('/deep-learning/');
 }
 await page.goBack();
 await page.waitForFunction(() => window.sourceSlideReader?.ready);
 expect(await page.locator('#persian-page').getAttribute('data-page')).toBeTruthy();
 expect(errors).toEqual([]);
});

test('mobile fullscreen and Persian view remain usable offline', async ({ page, context }) => {
 await page.addInitScript(() => { Object.defineProperty(Element.prototype, 'requestFullscreen', { value: undefined, configurable: true }); });
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=40');
 await page.waitForFunction(() => window.sourceSlideReader?.ready);
 await context.setOffline(true);
 const fullscreen = page.locator('[data-fullscreen]');
 await fullscreen.click();
 await expect(fullscreen).toHaveAttribute('aria-pressed', 'true');
 await page.locator('[data-view-translation]').click();
 await expect(page.locator('#translation-panel')).toBeVisible();
 await fullscreen.click();
 await expect(fullscreen).toHaveAttribute('aria-pressed', 'false');
});
