import {test, expect} from '@playwright/test';

for (const width of [390, 1440]) test(`CNN opening slide retains readable centered attribution at ${width}px`, async ({page}, testInfo) => {
  await page.setViewportSize({width, height: 850});
  await page.goto('/deep-learning/terms/spring-2026/s05/slides/#page=1');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 1);
  if (width === 390) await page.locator('[data-view-translation]').click();
  const slide = page.locator('#persian-page');
  await expect(slide).toHaveAttribute('data-layout', 'source-canvas');
  const heading = slide.locator('.reader-slide-text').filter({hasText: 'Convolutional Neural Networks; CNNs'});
  await expect(heading).toBeVisible();
  await expect(heading.locator('bdi').filter({hasText:'Convolutional Neural Networks; CNNs'})).toHaveCSS('white-space', 'nowrap');
  for (const text of ['Danna Gurari', 'University of Colorado Boulder', '2026']) await expect(slide.locator('.reader-slide-text').filter({hasText:text})).toBeVisible();
  expect(await slide.locator('.reader-slide-text').evaluateAll(nodes => nodes.every(node => node.scrollHeight <= node.clientHeight + 2))).toBeTruthy();
  await page.screenshot({path:testInfo.outputPath(`s05-opening-${width}.png`)});
});
