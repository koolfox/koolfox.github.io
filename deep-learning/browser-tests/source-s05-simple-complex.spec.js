import {test, expect} from '@playwright/test';

for (const width of [390, 1440]) test(`simple and complex cell slides stay readable at ${width}px`, async ({page}) => {
  await page.setViewportSize({width, height: 850});
  page.on('console', msg => { if (msg.text().startsWith('FIT_DIAGNOSTIC')) console.log(msg.text()); });
  await page.addInitScript(() => {
    const descriptor=Object.getOwnPropertyDescriptor(Element.prototype,'scrollHeight');
    Object.defineProperty(Element.prototype,'scrollHeight',{...descriptor,get(){
      const h=descriptor.get.call(this);
      if(this.classList?.contains('reader-slide-text')&&(h>this.clientHeight+2||this.scrollWidth>this.clientWidth+2))
        console.log('FIT_DIAGNOSTIC',JSON.stringify({text:this.textContent?.slice(0,140),h,ch:this.clientHeight,w:this.scrollWidth,cw:this.clientWidth,font:this.style.fontSize,style:this.getAttribute('style')}));
      return h;
    }});
  });
  for (const number of [15, 16, 17]) {
    await page.goto(`/deep-learning/terms/spring-2026/s05/slides/#page=${number}`);
    await page.waitForFunction(n => window.sourceSlideReader?.ready && window.sourceSlideReader.page === n, number);
    if (width === 390) await page.locator('[data-view-translation]').click();
    const slide = page.locator('#persian-page');
    await expect(slide).toHaveAttribute('data-layout', 'source-canvas');
    await expect(slide.locator('.reader-slide-background')).toBeVisible();
    const reading = slide.locator('.reader-desktop-transcript');
    await expect(reading).toBeVisible();
    await reading.locator('summary').click();
    await expect(reading.locator('.reader-mobile-transcript-content')).toContainText('معماری');
    await expect(reading.locator('.reader-copy').nth(1)).toHaveCSS('font-size', '16px');
    expect(await slide.locator('.reader-slide-text').evaluateAll(nodes => nodes.every(node =>
      node.scrollHeight <= node.clientHeight + 2 && node.scrollWidth <= node.clientWidth + 2))).toBeTruthy();
  }
});
