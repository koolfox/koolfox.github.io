import {test, expect} from '@playwright/test';

for (const [width, height] of [[1024, 768], [1280, 720], [1920, 1080]]) {
  test(`lesson four figure 11 caption is readable at ${width}`, async ({page}, testInfo) => {
    await page.setViewportSize({width, height});
    await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=11');
    await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 11);
    const root = page.locator('#persian-page');
    await expect(root).toHaveAttribute('data-layout', /source-canvas/);
    await expect(root.locator('.reader-slide-holder')).toBeVisible();
    const figure = root.locator('.reader-figure-labels');
    await figure.locator('summary').click();
    await expect(figure).toContainText('شبکه تکرارشونده همگام');
    await expect(figure).not.toContainText('شبکه تکرارشونده ناهمگام');
    await expect(figure.locator('p').first()).toHaveCSS('font-size', '16px');
    await figure.screenshot({path:testInfo.outputPath(`s04-figure11-${width}.png`)});
  });
}
