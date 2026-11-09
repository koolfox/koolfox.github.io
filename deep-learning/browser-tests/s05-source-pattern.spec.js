import { test, expect } from '@playwright/test';

test('slide 37 explores the selected source window and its response', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/deep-learning/terms/spring-2026/s05/slides/#page=37');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 37);
  await page.locator('.reader-sections [data-reader-section=lab]').click();
  const frame = page.frameLocator('[data-reader-tools-frame]');
  await expect(frame.locator('[data-notebook-run-all]')).toBeVisible();
  const codeFrame = page.frames().find(item => item.url().includes('/practice/'));
  await codeFrame.waitForFunction(() => window.studentNotebook?.cells);
  for (const [before, after] of [['selected_row = 0', 'selected_row = 1'], ['selected_column = 0', 'selected_column = 2']]) {
    const current = await codeFrame.evaluate(() => window.studentNotebook.cells.map(cell => cell.source));
    const index = current.findIndex(source => source.includes(before));
    expect(index).toBeGreaterThanOrEqual(0);
    await codeFrame.locator('[data-notebook-code]').nth(index).fill(current[index].replace(before, after));
  }
  await codeFrame.locator('[data-notebook-run-all]').click();
  await codeFrame.waitForFunction(() => window.studentNotebook.record?.ok, null, { timeout: 90000 });
  const result = await codeFrame.evaluate(() => window.studentNotebook.record.outputs.at(-1).result);
  expect(result.feature_map).toEqual([[4,3,4],[2,4,3],[2,3,4]]);
  expect(result.window).toEqual([[1,1,0],[1,1,1],[1,1,0]]);
  expect(result.response).toBe(3);
  await codeFrame.getByRole('tab', { name: 'آزمون تستی', exact: true }).click();
  await expect(codeFrame.locator('[data-notebook-question]')).toHaveCount(3);
});
