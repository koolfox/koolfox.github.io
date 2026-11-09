import {test, expect} from '@playwright/test';

test('LSTM gate exploration is linked to both slides and runs its educational example', async ({page}) => {
  test.setTimeout(120000);
  for (const number of [55, 56, 57]) {
    await page.goto(`/deep-learning/terms/spring-2026/s04/slides/#page=${number}`);
    await page.getByRole('button', {name: 'کاوش این اسلاید'}).click();
    const tools = page.frameLocator('[data-reader-tools-frame]');
    await expect(tools.getByRole('heading', {name: 'کاوش شماتیک دروازه های LSTM'})).toBeVisible();
  }
  const tools = page.frameLocator('[data-reader-tools-frame]');
  await tools.locator('[data-notebook-run-all]').click();
  const frame = page.frames().find(item => item.url().includes('/s04/practice/?source-page=57'));
  expect(frame).toBeTruthy();
  await frame.waitForFunction(() => window.studentNotebook.record?.ok, null, {timeout: 90000});
  const result = await frame.evaluate(() => window.studentNotebook.record.outputs.at(-1).result);
  expect(result.old_contribution).toBeCloseTo(0.45, 12);
  expect(result.new_contribution).toBeCloseTo(-0.1, 12);
  expect(result.cell).toBeCloseTo(0.35, 12);
  expect(result.direct_derivative).toBe(0.75);
  expect(result.hidden).toBeCloseTo(0.5 * Math.tanh(0.35), 12);
});
