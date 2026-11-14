import {test, expect} from '@playwright/test';
for (const [width, height] of [[390, 844], [1024, 768], [1280, 720], [1920, 1080]]) {
  test(`lesson four slide 36 softmax explanation fits at ${width}`, async ({page}, testInfo) => {
    await page.setViewportSize({width, height});
    await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=36');
    await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 36);
    if (width === 390) await page.locator('[data-view-translation]').click();
    const root = page.locator('#persian-page');
    await expect(root).toHaveAttribute('data-layout', /source-canvas/);
    const label = root.locator('.reader-slide-text[data-source-lines="1,2,3"]');
    await expect(label).toBeVisible();
    expect(await label.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeCloseTo(20, 1);
    expect(await label.evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    await root.screenshot({path:testInfo.outputPath(`softmax-${width}x${height}.png`)});
  });
}
