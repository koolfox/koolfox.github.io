import {test,expect} from '@playwright/test';
for(const width of [1440,390])test(`RNN training steps retain separate source regions at ${width}px`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:850});
 for(const number of [41,42,43,44,45]){
  await page.goto(`/deep-learning/terms/spring-2026/s04/slides/#page=${number}`);
  await page.waitForFunction(n=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===n,number);
  if(width===390){const old=await page.locator('#persian-page .reader-slide-stage').elementHandle();await page.locator('[data-view-translation]').click();if(old)await page.waitForFunction(node=>!node.isConnected,old);await page.waitForFunction(()=>window.sourceSlideReader?.ready);}
  const slide=page.locator('#persian-page');await expect(slide).toHaveAttribute('data-layout',number===42||number===44?'source-canvas-figure-companion':'source-canvas');
  await expect(slide.locator('.reader-slide-background')).toBeVisible();
  const labels=number===42?['اندازه پنجره','دنباله های بلندتر','دنباله های کوتاه تر']:number===44?['زیان','N-to-Many']:['معیار توقف','تابع زیان','گرادیان','پارامتر'];
  for(const label of labels)await expect(slide.locator('.reader-slide-text').filter({hasText:label}).first()).toBeVisible();
  if(number===41||number===42)await slide.locator('.reader-slide-holder').screenshot({path:testInfo.outputPath(`s04-page${number}-${width}.png`)});
 }
});
