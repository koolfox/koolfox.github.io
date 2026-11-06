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

test('session 1 schedule and experience keep source images on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [number, terms] of [[73, ['نزول گرادیان', 'Gradient Descent']], [83, ['دانشجوی دکتری', 'Image Classification']]]) {
    await page.goto(`/deep-learning/terms/spring-2026/s01/slides/#page=${number}`);
    await page.waitForFunction(expected => window.sourceSlideReader?.ready && window.sourceSlideReader.page === expected, number);
    const previousSlide = await page.locator('#persian-page .reader-slide-stage').elementHandle();
    await page.locator('[data-view-translation]').click();
    await page.waitForFunction(node => !node.isConnected, previousSlide);
    await expect(page.locator('#persian-page')).toHaveAttribute('data-layout', 'source-canvas');
    for (const term of terms) await expect(page.locator('#persian-page .reader-slide-text').filter({ hasText: term })).toBeVisible();
  }
});

test('mobile readers can zoom and pan the dense schedule slide', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=73');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 73);
  let oldStage = await page.locator('#persian-page .reader-slide-stage').elementHandle();
  await page.locator('[data-view-translation]').click();
  await page.waitForFunction(node => !node.isConnected, oldStage);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout', 'source-canvas');
  const initialWidth = (await page.locator('#persian-page .reader-slide-holder').boundingBox()).width;
  oldStage = await page.locator('#persian-page .reader-slide-stage').elementHandle();
  await page.locator('[data-zoom-in]').click();
  await page.locator('[data-zoom-in]').click();
  await page.waitForFunction(node => !node.isConnected, oldStage);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout', 'source-canvas');
  expect((await page.locator('#persian-page .reader-slide-holder').boundingBox()).width).toBeGreaterThan(initialWidth * 1.4);
  const pan = await page.locator('.reader-translation').evaluate(node => {
    const available = node.scrollWidth - node.clientWidth;
    node.scrollLeft = -available;
    return { available, moved: Math.abs(node.scrollLeft) };
  });
  expect(pan.available).toBeGreaterThan(0);
  expect(pan.moved).toBeGreaterThan(0);
});
