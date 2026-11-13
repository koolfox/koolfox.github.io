import {test, expect} from '@playwright/test';

test('GRU exploration opens on slide 58 and executes its diagram convention', async ({page}) => {
  test.setTimeout(120000);
  await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=58');
  await page.getByRole('button', {name: 'کاوش این اسلاید'}).click();
  const tools = page.frameLocator('[data-reader-tools-frame]');
  await expect(tools.getByRole('heading', {name: 'کاوش دروازه های GRU'})).toBeVisible();
  await tools.locator('[data-notebook-run-all]').click();
  const frame = page.frames().find(item => item.url().includes('/s04/practice/?source-page=58'));
  expect(frame).toBeTruthy();
  await frame.waitForFunction(() => window.studentNotebook.record?.ok, null, {timeout: 90000});
  const result = await frame.evaluate(() => window.studentNotebook.record.outputs.at(-1).result);
  const candidate = Math.tanh(0.8 * 0.4 + 0.5 * 0.5 * 0.6 + 0.1);
  expect(result.reset_state).toBeCloseTo(0.3, 12);
  expect(result.candidate).toBeCloseTo(candidate, 12);
  expect(result.hidden).toBeCloseTo(0.75 * 0.6 + 0.25 * candidate, 12);
});
