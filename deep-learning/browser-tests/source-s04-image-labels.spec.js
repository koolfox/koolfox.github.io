import { test, expect } from '@playwright/test';

for (const [number, labels] of [
  [39, ['یک‌به‌یک', 'یک‌به‌چند', 'چندبه‌یک', 'چندبه‌چند', 'چندبه‌چند']],
  [40, ['عمق', 'زمان']],
  [42, ['داده ها', 'نمونه 1', 'نمونه 2', 'نمونه 3', 'نمونه N-L', 'ورودی', 'خروجی']],
]) {
  test(`lesson 4 slide ${number} keeps translated labels on the source figure`, async ({ page }, testInfo) => {
    await page.goto(`/deep-learning/terms/spring-2026/s04/slides/#page=${number}`);
    await page.waitForFunction(n => window.sourceSlideReader?.ready && window.sourceSlideReader.page === n, number);
    const overlays = page.locator('#persian-page .reader-image-translation');
    await expect(overlays).toHaveCount(labels.length);
    for (let i = 0; i < labels.length; i++) await expect(overlays.nth(i)).toHaveText(labels[i]);
    expect(await overlays.evaluateAll(nodes => nodes.every(node => node.scrollWidth <= node.clientWidth + 1 && node.scrollHeight <= node.clientHeight + 1))).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath(`s04-${number}-labels.png`) });
  });
}
