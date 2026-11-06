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

test('session 1 research question retains source canvas', async ({ page }) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=82');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 82);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout', 'source-canvas');
  await expect(page.locator('.reader-slide-text')).toHaveCount(2);
});

test('session 1 questions slide keeps its source canvas', async ({ page }) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=81');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 81);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout', 'source-canvas');
  await expect(page.locator('.reader-slide-text')).toHaveCount(5);
});

test('session 1 purpose diagram remains visible on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=85');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 85);
  const previousSlide = await page.locator('#persian-page .reader-slide-stage').elementHandle();
  await page.locator('[data-view-translation]').click();
  await page.waitForFunction(node => !node.isConnected, previousSlide);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout', 'source-canvas');
  const text = page.locator('#persian-page .reader-slide-text');
  for (const term of ['چرا؟', 'چگونه؟', 'چه چیزی؟']) await expect(text.filter({ hasText: term })).toBeVisible();
  expect(await text.evaluateAll(nodes => nodes.every(node => node.scrollHeight <= node.clientHeight + 2 && node.scrollWidth <= node.clientWidth + 2))).toBeTruthy();
});

test('session 1 experience overlay keeps its original content order', async ({ page }) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=84');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 84);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout', 'source-canvas');
  await expect(page.locator('#persian-page .reader-slide-text').filter({ hasText: '۴۱ اثر' })).toBeVisible();
  await expect(page.locator('#persian-page .reader-slide-text').filter({ hasText: 'دانشجوی دکتری' })).toBeVisible();
  await expect(page.locator('#persian-page .reader-slide-text').filter({ hasText: 'سمی؟' })).toBeVisible();
});
