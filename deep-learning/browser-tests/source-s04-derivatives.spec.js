import {test, expect} from '@playwright/test';

test('derivative notebook opens from pages 51 and 52 and executes', async ({page}) => {
  test.setTimeout(120000);
  for (const number of [51, 52]) {
    await page.goto(`/deep-learning/terms/spring-2026/s04/slides/#page=${number}`);
    await page.getByRole('button', {name: 'کاوش این اسلاید'}).click();
    const tools = page.frameLocator('[data-reader-tools-frame]');
    await expect(tools.getByRole('heading', {name: 'کاوش مشتقها و محوشدن گرادیان'})).toBeVisible();
  }
  const tools = page.frameLocator('[data-reader-tools-frame]');
  await tools.locator('[data-notebook-run-all]').click();
  const frame = page.frames().find(item => item.url().includes('/s04/practice/?source-page=52'));
  expect(frame).toBeTruthy();
  await frame.waitForFunction(() => window.studentNotebook.record?.ok, null, {timeout: 90000});
  const result = await frame.evaluate(() => window.studentNotebook.record.outputs.at(-1).result);
  expect(result.final).toBe(0.00390625);
  expect(result.rounded_source).toBe(0.004);
  expect(result.sigmoid_derivative[4]).toBe(0.25);
  expect(result.tanh_derivative[4]).toBe(1);
});
