import {test, expect} from '@playwright/test';

test('cross entropy exploration is linked to slides 46 through 48 and executes', async ({page}) => {
  test.setTimeout(120000);
  for (const number of [46, 47, 48]) {
    await page.goto(`/deep-learning/terms/spring-2026/s04/slides/#page=${number}`);
    await page.getByRole('button', {name: 'کاوش این اسلاید'}).click();
    const tools = page.frameLocator('[data-reader-tools-frame]');
    await expect(tools.getByRole('heading', {name: 'کاوش آنتروپی متقاطع و احتمال کلاس درست'})).toBeVisible();
  }
  const tools = page.frameLocator('[data-reader-tools-frame]');
  await tools.locator('[data-notebook-run-all]').click();
  const frame = page.frames().find(item => item.url().includes('/s04/practice/?source-page=48'));
  expect(frame).toBeTruthy();
  await frame.waitForFunction(() => window.studentNotebook.record?.ok, null, {timeout: 90000});
  const result = await frame.evaluate(() => window.studentNotebook.record.outputs.at(-1).result);
  expect(result.target).toBe('e');
  expect(result.probability).toBe(0.1);
  expect(result.loss_ln).toBeCloseTo(Math.log(10), 12);
  expect(result.loss_log10).toBeCloseTo(1, 12);
  expect(result.curve_loss.at(-1)).toBeCloseTo(0, 12);
});
