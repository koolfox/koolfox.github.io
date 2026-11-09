import {test, expect} from '@playwright/test';

for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
  test(`slide 39 opens and runs its schematic notebook on ${name}`, async ({page}) => {
    test.setTimeout(120000);
    await page.setViewportSize({width, height});
    await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=39');
    await page.getByRole('button', {name: 'کاوش این اسلاید'}).click();
    const tools = page.frameLocator('[data-reader-tools-frame]');
    await expect(tools.getByRole('heading', {name: 'کاوش شماتیک آرایش ورودی و خروجی'})).toBeVisible();
    await tools.locator('[data-notebook-run-all]').click();
    const frame = page.frames().find(item => item.url().includes('/s04/practice/?source-page=39'));
    expect(frame).toBeTruthy();
    await frame.waitForFunction(() => window.studentNotebook.record?.ok, null, {timeout: 90000});
    const record = await frame.evaluate(() => window.studentNotebook.record);
    expect(record.outputs.at(-1).result).toEqual({
      variant: 'many-to-many-delayed', input_steps: 3, output_steps: 3,
      timeline_steps: 5, input_positions: [1, 1, 1, 0, 0], output_positions: [0, 0, 1, 1, 1],
    });
    await expect(tools.locator('[data-notebook-output="2"]')).toContainText('مدلی آموزش داده یا اجرا نشده است');
    await tools.getByRole('tab', {name: 'آزمون تستی'}).click();
    await expect(tools.locator('[data-notebook-question]')).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
