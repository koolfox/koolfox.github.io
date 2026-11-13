import { test, expect } from '@playwright/test';

test('slide 38 notebook compares translation and its boundary case', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/deep-learning/terms/spring-2026/s05/slides/#page=38');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 38);
  await page.locator('.reader-sections [data-reader-section=lab]').click();
  const frame = page.frameLocator('[data-reader-tools-frame]');
  await expect(frame.locator('[data-notebook-run-all]')).toBeVisible();
  const notebook = page.frames().find(item => item.url().includes('/practice/'));
  await notebook.waitForFunction(() => window.studentNotebook?.cells);
  const cells = await notebook.evaluate(() => window.studentNotebook.cells.map(cell => cell.source));
  const index = cells.findIndex(source => source.includes('shift = 1'));
  expect(index).toBeGreaterThanOrEqual(0);
  await notebook.locator('[data-notebook-code]').nth(index).fill(cells[index].replace('shift = 1', 'shift = 2'));
  await notebook.locator('[data-notebook-run-all]').click();
  await notebook.waitForFunction(() => window.studentNotebook.record?.ok, null, { timeout: 90000 });
  const result = await notebook.evaluate(() => window.studentNotebook.record.outputs.at(-1).result);
  expect(result.shifted_image[3][5]).toBe(1);
  expect(result.same_after_shift).toBe(true);
  expect(result.unchanged).toBe(false);
  expect(result.boundary_equal).toBe(false);
  expect(result.boundary_map[2][0]).toBe(1);
  expect(result.boundary_expected[2][0]).toBe(0);
  await notebook.getByRole('tab', { name: 'آزمون تستی', exact: true }).click();
  await expect(notebook.locator('[data-notebook-question]')).toHaveCount(3);
});
