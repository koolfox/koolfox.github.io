import {test, expect} from '@playwright/test';

for(const width of [390, 1440]) test(`paper titles and diagram labels fit at ${width}px`,async({page},testInfo)=>{
  await page.setViewportSize({width,height:850});
  for(const number of [51,52,53,54]){
    await page.goto(`/deep-learning/terms/spring-2026/s04/slides/#page=${number}`);
    await page.waitForFunction(n=>window.sourceSlideReader?.ready && window.sourceSlideReader.page===n,number);
    if(width===390){
      const old=await page.locator('#persian-page .reader-slide-stage').elementHandle();
      await page.locator('[data-view-translation]').click();
      if(old)await page.waitForFunction(node=>!node.isConnected,old);
      await page.waitForFunction(()=>window.sourceSlideReader?.ready);
    }
    const slide=page.locator('#persian-page');
    await expect(slide).toHaveAttribute('data-layout','source-canvas-figure-companion');
    const labels=slide.locator('.reader-image-translation');
    if(number===54) await expect(labels.filter({hasText:'حافظه بلند کوتاه مدت'})).toBeVisible();
    else await expect(labels.filter({hasText:'بلندمدت'})).toBeVisible();
    if(number===52)for(const label of ['ورودی','پنهان 1','پنهان 2','خروجی','خطا'])await expect(labels.filter({hasText:label})).toBeVisible();
    expect(await labels.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2 && node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
    await page.screenshot({path:testInfo.outputPath(`paper-${number}-${width}.png`)});
  }
});
