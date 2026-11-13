import {test, expect} from '@playwright/test';

test('lesson four slide 15 translates the unfold label in the figure', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=15');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 15);
  await page.locator('[data-view-translation]').click();
  const overlay = page.locator('#persian-page .reader-image-translation');
  await expect(overlay).toHaveText('بازکردن');
  await expect(overlay).toBeVisible();
  await expect(page.locator('#persian-page .reader-slide-holder')).toBeVisible();
});
