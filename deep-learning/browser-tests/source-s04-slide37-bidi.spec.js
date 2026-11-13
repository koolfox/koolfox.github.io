import {test, expect} from '@playwright/test';

test('lesson four slide 37 keeps the vocabulary braces inside the LTR span', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=37');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 37);
  await page.locator('[data-view-translation]').click();
  const text = page.locator('#persian-page .reader-slide-stage bdi[dir=ltr]', {hasText: '{h, e, l, o}'});
  await expect(text).toHaveCount(1);
  await expect(text).toHaveText('{h, e, l, o}');
  await expect(text).toBeVisible();
});
