import {test, expect} from '@playwright/test';

test('unrolled diagrams place the Persian label over the source word', async ({page},testInfo) => {
  for (const number of [15,16,17,18,19,22,23,24,25,28]) {
    await page.goto(`/deep-learning/terms/spring-2026/s04/slides/#page=${number}`);
    await page.waitForFunction(n => window.sourceSlideReader?.ready && window.sourceSlideReader.page === n, number);
    const label=page.locator('#persian-page .reader-image-translation').filter({hasText:'بازکردن'});
    await expect(label).toHaveCount(1);
    await expect(label).toBeVisible();
    if (number===15 || number===28) await page.screenshot({path:testInfo.outputPath(`unfold-${number}.png`)});
  }
});

for(const width of [1440,390]){
  test(`RNN unfolding retains each step and emphasis at ${width}px`,async({page},testInfo)=>{
    await page.setViewportSize({width,height:850});
    for(const number of [15,16,17,18,19]){
      await page.goto(`/deep-learning/terms/spring-2026/s04/slides/#page=${number}`);
      await page.waitForFunction(n=>window.sourceSlideReader?.ready && window.sourceSlideReader.page===n,number);
      if(width===390){
        const previous=await page.locator('#persian-page .reader-slide-stage').elementHandle();
        await page.locator('[data-view-translation]').click();
        if(previous)await page.waitForFunction(node=>!node.isConnected,previous);
        await page.waitForFunction(()=>window.sourceSlideReader?.ready);
      }
      const slide=page.locator('#persian-page');
      await expect(slide).toHaveAttribute('data-layout','source-canvas-figure-companion');
      await expect(slide.locator('.reader-slide-background')).toBeVisible();
      if(number<19){
        await expect(slide.locator('.reader-emphasis').filter({hasText:'افزودن حالت پنهان'})).toHaveCSS('color','rgb(255, 192, 0)');
        const caption=slide.locator('.reader-slide-text').filter({hasText:'ایده اصلی'});
        const geometry=await caption.evaluate(node=>({bottom:parseFloat(node.style.top)+parseFloat(node.style.height),fits:node.scrollHeight<=node.clientHeight+2 && node.scrollWidth<=node.clientWidth+2}));
        expect(geometry.fits).toBe(true);
        expect(geometry.bottom).toBeLessThanOrEqual(.35*540+1);
      }
      if(number===18){
        await expect(slide.locator('.reader-slide-text').filter({hasText:'گراف محاسباتی'})).toBeVisible();
        await page.screenshot({path:testInfo.outputPath(`unrolled-rnn-${width}.png`)});
      }
      if(number===19)await expect(slide.locator('.reader-slide-text').filter({hasText:'از نظر نظری'})).toBeVisible();
    }
  });
}
