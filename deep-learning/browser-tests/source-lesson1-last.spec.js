import { test, expect } from '@playwright/test';

test('session 1 manual-rule flowchart retains its translated steps', async ({ page }, testInfo) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=34');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 34);
  const labels = page.locator('#persian-page .reader-image-translation');
  await expect(labels).toHaveCount(5);
  for (const text of ['بررسی مساله', 'نوشتن قواعد', 'ارزیابی', 'تحلیل خطاها', 'راه اندازی']) {
    await expect(labels.filter({ hasText: text })).toBeVisible();
  }
  await page.screenshot({path: testInfo.outputPath('lesson1-page34.png')});
});

test('clinical note slide keeps its translated figure after a copy update', async ({ page }) => {
  for (const width of [390, 1400]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=14');
    await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 14);
    if (width === 390) await page.locator('[data-view-translation]').click();
    await expect(page.locator('#persian-page')).toHaveAttribute('data-layout', 'source-canvas-figure-companion');
    await expect(page.locator('.reader-image-translation').first()).toContainText('مستندسازی بالینی');
    await expect(page.locator('.reader-figure-content')).toContainText('برنامه من');
  }
});

test('session 1 agenda keeps the bilingual bullet readable without overlap', async ({ page }) => {
  for (const width of [390, 1400]) {
    await page.setViewportSize({ width, height: 850 });
    for (const number of [2, 3]) {
      await page.goto(`/deep-learning/terms/spring-2026/s01/slides/#page=${number}`);
      await page.waitForFunction(n => window.sourceSlideReader?.ready && window.sourceSlideReader.page === n, number);
      if (width === 390) await page.locator('[data-view-translation]').click();
      await expect(page.locator('#persian-page')).toHaveAttribute('data-layout', 'source-canvas');
      const item = page.locator('.reader-slide-text[data-source-lines="2"]');
      await expect(item).toContainText('Neural Networks and Deep Learning');
      const fit = await item.evaluate(element => ({
        lineHeight: parseFloat(getComputedStyle(element).lineHeight),
        fontSize: parseFloat(getComputedStyle(element).fontSize),
        height: element.clientHeight,
        content: element.scrollHeight,
      }));
      expect(fit.lineHeight / fit.fontSize).toBeGreaterThanOrEqual(1.19);
      expect(fit.content).toBeLessThanOrEqual(fit.height + 1);
    }
  }
});

test('session 1 image translations retain their overlays after copy cleanup', async ({ page }) => {
  for (const width of [390, 1400]) {
    await page.setViewportSize({ width, height: 850 });
    for (const [number, count] of [[5, 4], [7, 4], [8, 3], [9, 4], [10, 2], [11, 4]]) {
      await page.goto(`/deep-learning/terms/spring-2026/s01/slides/#page=${number}`);
      await page.waitForFunction(n => window.sourceSlideReader?.ready && window.sourceSlideReader.page === n, number);
      if (width === 390) await page.locator('[data-view-translation]').click();
      await expect(page.locator('#persian-page')).toHaveAttribute('data-layout', 'source-canvas-figure-companion');
      await expect(page.locator('.reader-image-translation')).toHaveCount(count);
      const translated = await page.locator('.reader-image-translation').allTextContents();
      expect(translated.join('')).not.toMatch(/[\u064b-\u065f\u0670\u06c0]/u);
    }
  }
});

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


test('session 1 comparison stays on the source canvas on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=74');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 74);
  const previous = await page.locator('#persian-page .reader-slide-stage').elementHandle();
  await page.locator('[data-view-translation]').click();
  await page.waitForFunction(node => !node.isConnected, previous);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout', 'source-canvas');
  const text = page.locator('#persian-page .reader-slide-text');
  await expect(text.filter({ hasText: 'Deep Learning' })).toBeVisible();
  await expect(text.filter({ hasText: 'مبانی' })).toBeVisible();
  expect(await text.evaluateAll(nodes => nodes.every(node => node.scrollHeight <= node.clientHeight + 2 && node.scrollWidth <= node.clientWidth + 2))).toBeTruthy();
});


test('experience examples fit beside the image at desktop and mobile widths', async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=83');
    await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 83);
    if (width === 390) {
      const previous = await page.locator('#persian-page .reader-slide-stage').elementHandle();
      await page.locator('[data-view-translation]').click();
      await page.waitForFunction(node => !node.isConnected, previous);
      await page.waitForFunction(() => window.sourceSlideReader?.ready);
    }
    await expect(page.locator('#persian-page')).toHaveAttribute('data-layout', 'source-canvas');
    const example = page.locator('#persian-page .reader-slide-text').filter({ hasText: 'Image Classification' });
    await expect(example).toBeVisible();
    expect(await example.evaluate(node => ({font: Math.round(parseFloat(node.style.fontSize)), fits: node.scrollHeight <= node.clientHeight + 2 && node.scrollWidth <= node.clientWidth + 2}))).toEqual({font: 16, fits: true});
    const bounds = await example.evaluate(node => ({left: parseFloat(node.style.left), width: parseFloat(node.style.width)}));
    expect(bounds.left).toBeGreaterThanOrEqual(0.68 * 960 - 1);
    expect(bounds.left + bounds.width).toBeLessThanOrEqual(0.99 * 960 + 1);
  }
});
