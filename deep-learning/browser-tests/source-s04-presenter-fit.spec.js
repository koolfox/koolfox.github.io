import { test, expect } from '@playwright/test';

for (const [width, height] of [[1024, 768], [1280, 720], [1920, 1080]]) {
  test(`Persian presentation fits the viewport at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=57');
    await page.waitForFunction(() => window.sourceSlideReader?.ready);
    await page.locator('[data-source-only-toggle]').click();
    await page.locator('[data-view-translation]').click();
    const holder = page.locator('#persian-page .reader-slide-holder');
    await expect(holder).toBeVisible();
    await expect.poll(async () => holder.evaluate(element => {
      const box = element.getBoundingClientRect();
      return box.top >= 0 && box.left >= 0 && box.right <= innerWidth + 1 && box.bottom <= innerHeight + 1;
    })).toBe(true);
  });
}
