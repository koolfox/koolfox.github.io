import {test, expect} from '@playwright/test';

for (const width of [390, 1440]) test(`filter slides keep the source canvas at ${width}px`, async ({page}, testInfo) => {
  await page.setViewportSize({width, height: 850});
  for (let number = 31; number <= 40; number++) {
    await page.goto(`/deep-learning/terms/spring-2026/s05/slides/#page=${number}`);
    await page.waitForFunction(n => window.sourceSlideReader?.ready && window.sourceSlideReader.page === n, number);
    if (width === 390) {
      const previous = await page.locator('#persian-page .reader-slide-stage').elementHandle();
      await page.locator('[data-view-translation]').click();
      if (previous) await page.waitForFunction(node => !node.isConnected, previous);
      await page.waitForFunction(n => window.sourceSlideReader?.ready && window.sourceSlideReader.page === n, number);
    }
    const slide = page.locator('#persian-page');
    await expect(slide).toHaveAttribute('data-layout', /source-canvas/);
    await expect(slide.locator('.reader-slide-background')).toBeVisible();
    expect(await slide.locator('.reader-slide-text').evaluateAll(nodes => nodes.every(node =>
      node.scrollHeight <= node.clientHeight + 2 && node.scrollWidth <= node.clientWidth + 2))).toBeTruthy();
    await page.screenshot({path:testInfo.outputPath(`s05-filter-${number}-${width}.png`)});
  }
});
