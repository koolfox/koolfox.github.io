import {test,expect} from '@playwright/test';
for(const width of [1440,390])test(`LSTM and GRU slides retain their labeled diagrams at ${width}px`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:850});
 for(const number of [55,56,57,58]){
  await page.goto(`/deep-learning/terms/spring-2026/s04/slides/#page=${number}`);await page.waitForFunction(n=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===n,number);
  if(width===390){const old=await page.locator('#persian-page .reader-slide-stage').elementHandle();await page.locator('[data-view-translation]').click();if(old)await page.waitForFunction(node=>!node.isConnected,old);await page.waitForFunction(()=>window.sourceSlideReader?.ready);}
  const slide=page.locator('#persian-page');await expect(slide).toHaveAttribute('data-layout','source-canvas-figure-companion');await expect(slide.locator('.reader-slide-background')).toBeVisible();
  const labels=number===55?['دروازه ورودی','اطلاعات تازه']:number===56?['دروازه فراموشی','اطلاعات قدیمی']:number===57?['دروازه فراموشی','تضمین نمی کنند']:['Update Gate','حالت پنهان'];
  for(const label of labels)await expect(slide.locator('.reader-slide-text').filter({hasText:label}).first()).toBeVisible();
  if(number===55||number===57)await slide.locator('.reader-slide-holder').screenshot({path:testInfo.outputPath(`s04-page${number}-${width}.png`)});
 }
});
