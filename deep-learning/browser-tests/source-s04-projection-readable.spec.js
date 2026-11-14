import {test, expect} from '@playwright/test';
for (const [width, height] of [[1024, 768], [1280, 720], [1920, 1080]]) {
  for (const [number, lines, size] of [[31, '2,3', 17], [38, '0,2', 17]]) {
    test(`lesson four slide ${number} label fits ${width}x${height}`, async ({page}, testInfo) => {
      await page.setViewportSize({width, height});
      await page.goto(`/deep-learning/terms/spring-2026/s04/slides/#page=${number}`);
      await page.waitForFunction(n => window.sourceSlideReader?.ready && window.sourceSlideReader.page === n, number);
      const root = page.locator('#persian-page');
      await expect(root).toHaveAttribute('data-layout', /source-canvas/);
      const label = root.locator(`.reader-slide-text[data-source-lines="${lines}"]`);
      await expect(label).toBeVisible();
      expect(await label.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeCloseTo(size, 1);
      expect(await label.evaluate(el => el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await root.locator('.reader-slide-holder').screenshot({path:testInfo.outputPath(`slide-${number}-${width}.png`)});
    });
  }
}
