import { test, expect } from '@playwright/test';

test('session 1 closing agenda keeps the source colors and Persian layout', async ({ page }) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=86');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 86);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout', 'source-canvas');
  await expect(page.locator('.reader-slide-text')).toHaveCount(5);
  await expect(page.locator('.reader-slide-text').nth(1)).toHaveCSS('color', 'rgb(127, 127, 127)');
});

test('session 1 introductions use the source canvas', async ({ page }) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=80');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 80);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout', 'source-canvas');
  await expect(page.locator('.reader-slide-text')).toHaveCount(3);
  await expect(page.locator('.reader-slide-text').nth(1)).toContainText('دانا گوراری');
});
