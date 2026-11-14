import {test, expect} from '@playwright/test';
for (const width of [390, 1440]) test(`LeNet slides retain source layouts at ${width}px`, async ({page}, testInfo) => {
  await page.setViewportSize({width, height: 850});
  for (let number = 61; number <= 76; number++) {
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
    await page.screenshot({path:testInfo.outputPath(`s05-lenet-${number}-${width}.png`)});
  }
});

for (const [width,height] of [[1280,720],[1920,1080],[1024,768]]) test(`LeNet training graph has Persian labels at ${width}x${height}`, async ({page}) => {
  await page.setViewportSize({width,height});
  await page.goto('/deep-learning/terms/spring-2026/s05/slides/#page=71');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.renderedPage === 71);
  const slide=page.locator('#persian-page');
  await expect(slide).toHaveAttribute('data-layout','source-canvas-figure-companion');
  const labels=slide.locator('.reader-image-translation');
  await expect(labels).toHaveCount(4);
  for(const label of ['نرخ خطا','آزمون','آموزش','تکرارهای مجموعه آموزش']) await expect(labels.filter({hasText:label}).first()).toBeVisible();
  expect(await labels.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2 && node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
  await expect(slide.locator('.reader-slide-background')).toBeVisible();
});
