import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`RNN parameter question keeps the diagram at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=23');
    await page.waitForFunction(() => window.sourceSlideReader?.ready);
    if (width === 390) {
      const previous = await page.locator('#persian-page .reader-slide-stage').elementHandle();
      await page.locator('[data-view-translation]').click();
      await page.waitForFunction(node => !node.isConnected, previous);
      await page.waitForFunction(() => window.sourceSlideReader?.ready);
    }
    await expect(page.locator('#persian-page')).toHaveAttribute('data-layout', 'source-canvas-figure-companion');
    await expect(page.locator('#persian-page .reader-slide-background')).toBeVisible();
    await expect(page.locator('#persian-page .reader-slide-text').filter({hasText:'چه چیزی بین لایه‌ها متفاوت است'})).toBeVisible();
  });
}

test('slide 34 opens and runs the original hidden-state calculation', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=34');
  await page.waitForFunction(() => window.sourceSlideReader?.ready);
  await page.locator('[data-page-experiment]').click();
  const frame = page.frameLocator('[data-reader-tools-frame]');
  await expect(frame.locator('#practice-config')).toHaveCount(1);
  const handle = page.frames().find(item => item.url().includes('/s04/practice/'));
  expect(handle.url()).toContain('source-page=34');
  await frame.locator('[data-notebook-run-all]').click();
  await handle.waitForFunction(() => window.studentNotebook?.record?.ok, null, {timeout:60000});
  const result = await handle.evaluate(() => window.studentNotebook.record.outputs.at(-1).result);
  expect(result.states[0]).toEqual([0.693168, 0.899554, 0.802118]);
  expect(result.states[1]).toEqual([0.936534, 0.949104, 0.762341]);
  expect(result.prediction).toBe('h');
  expect(result.probabilities[0]).toBeCloseTo(0.419748, 5);
});
