import {test, expect} from '@playwright/test';

for(const width of [1440,390]){
  test(`RNN parameters and memory retain their source diagrams at ${width}px`,async({page},testInfo)=>{
    await page.setViewportSize({width,height:850});
    for(const number of [20,21,22,23,24]){
      await page.goto(`/deep-learning/terms/spring-2026/s04/slides/#page=${number}`);
      await page.waitForFunction(n=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===n,number);
      if(width===390){
        const previous=await page.locator('#persian-page .reader-slide-stage').elementHandle();
        await page.locator('[data-view-translation]').click();
        if(previous)await page.waitForFunction(node=>!node.isConnected,previous);
        await page.waitForFunction(()=>window.sourceSlideReader?.ready);
      }
      const slide=page.locator('#persian-page');
      await expect(slide).toHaveAttribute('data-layout',number<22?'source-canvas':'source-canvas-figure-companion');
      await expect(slide.locator('.reader-slide-background')).toBeVisible();
      if(number<22){
        for(const label of ['حالت جدید','حالت قبلی','ورودی در گام زمانی','پارامترهای مدل'])
          await expect(slide.locator('.reader-slide-text').filter({hasText:label})).toBeVisible();
        await expect(slide.locator('.reader-slide-text').filter({hasText:'حالت قبلی'})).toHaveCSS('color','rgb(112, 48, 160)');
      }
      if(number===23){
        await expect(slide.locator('.reader-emphasis').filter({hasText:'بین لایه‌ها متفاوت است'})).toHaveCSS('color','rgb(255, 192, 0)');
        await page.screenshot({path:testInfo.outputPath(`rnn-shared-weights-${width}.png`)});
      }
      if(number===24)await expect(slide.locator('.reader-slide-text').filter({hasText:'ورودی‌های گذشته'})).toBeVisible();
    }
  });
}
