import { test, expect } from '@playwright/test';

test('pooling film is linked only to the source example slide', async ({ page }) => {
  await page.goto('/deep-learning/terms/spring-2026/s05/slides/#page=48');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 48);
  const button = page.locator('[data-source-interactive="pooling-s05p48"]');
  await expect(button).toBeVisible();
  await button.click();
  const frame = page.frameLocator('[data-reader-tools-frame]');
  await expect(frame.locator('video source')).toHaveAttribute('src', /pooling-s05p48\.mp4/);
  await expect(frame.locator('video track')).toHaveAttribute('src', /pooling-s05p48\.fa\.vtt/);
  await page.goto('/deep-learning/terms/spring-2026/s05/slides/#page=49');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 49);
  await expect(page.locator('[data-source-interactive="pooling-s05p48"]')).toHaveCount(0);
});
