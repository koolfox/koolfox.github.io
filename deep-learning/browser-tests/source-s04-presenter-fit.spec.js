import { test, expect } from '@playwright/test';

for (const [width, height] of [[1024, 768], [1280, 720], [1920, 1080]]) {
  for (const number of [55, 57]) test(`Persian slide ${number} fits the viewport at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto(`/deep-learning/terms/spring-2026/s04/slides/#page=${number}`);
    await page.waitForFunction(() => window.sourceSlideReader?.ready);
    await page.locator('[data-source-only-toggle]').click();
    await page.locator('[data-view-translation]').click();
    const holder = page.locator('#persian-page .reader-slide-holder');
    await expect(holder).toBeVisible();
    await expect.poll(async () => holder.evaluate(element => {
      const box = element.getBoundingClientRect();
      const footer = document.querySelector('.reader-presenter').getBoundingClientRect();
      return box.top >= 0 && box.left >= 0 && box.right <= innerWidth + 1 && box.bottom <= footer.top + 1;
    })).toBe(true);
  });
}

test('navigation titles remain meaningful after opening the last slides', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=51');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 51);
  await expect(page.locator('[data-page-select] option[value="51"]')).toContainText('توابع فعال ساز و گرادیان');
  await page.locator('[data-page-select]').selectOption('61');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 61);
  await expect(page.locator('[data-page-select] option[value="61"]')).toContainText('پایان');
});
