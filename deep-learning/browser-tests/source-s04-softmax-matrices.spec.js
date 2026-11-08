import {test,expect} from '@playwright/test';
for(const width of [1440,390])test(`softmax and matrix slides retain source structure at ${width}px`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:850});
 for(const number of [30,31,32,33,34]){
  await page.goto(`/deep-learning/terms/spring-2026/s04/slides/#page=${number}`);
  await page.waitForFunction(n=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===n,number);
  if(width===390){const old=await page.locator('#persian-page .reader-slide-stage').elementHandle();await page.locator('[data-view-translation]').click();if(old)await page.waitForFunction(node=>!node.isConnected,old);await page.waitForFunction(()=>window.sourceSlideReader?.ready);}
  const slide=page.locator('#persian-page');
  await expect(slide).toHaveAttribute('data-layout',number===31||number===32?'source-canvas':'source-canvas-figure-companion');
  await expect(slide.locator('.reader-slide-background')).toBeVisible();
  if(number<=32)await expect(slide.locator('.reader-slide-text').filter({hasText:'سافت مکس'})).toBeVisible();
  if(number>=33){await expect(slide.locator('.reader-slide-text').filter({hasText:'0.567001'})).toBeVisible();await expect(slide.locator('.reader-slide-text').filter({hasText:'مقدار اولیه'})).toBeVisible();}
  if(number===31||number===34)await slide.locator('.reader-slide-holder').screenshot({path:testInfo.outputPath(`s04-page${number}-${width}.png`)});
 }
});
