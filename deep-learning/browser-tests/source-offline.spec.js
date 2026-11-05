import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'] });

test('a visited slide reloads offline after a single PDF download', async ({ page, context }) => {
 const requests = [];
 page.on('request', request => { if (request.url().includes('/s01.pdf?sha=')) requests.push(request); });
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=40');
 await page.waitForFunction(() => window.sourceSlideReader?.ready);
 await expect(page.locator('html')).toHaveAttribute('data-offline-ready', 'true', { timeout: 30000 });
 expect(requests).toHaveLength(1);
 await page.reload();
 await page.waitForFunction(() => window.sourceSlideReader?.ready);
 expect(requests).toHaveLength(1);
 await expect(page.locator('html')).toHaveAttribute('data-offline-ready', 'true', { timeout: 30000 });
 await context.setOffline(true);
 await page.reload();
 await page.waitForFunction(() => window.sourceSlideReader?.ready);
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
