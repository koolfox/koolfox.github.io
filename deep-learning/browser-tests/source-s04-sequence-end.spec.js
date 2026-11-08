import {test,expect} from '@playwright/test';
for(const width of [1440,390])test(`sequence example retains distinct source regions at ${width}px`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:850});
 for(const number of [35,38,39]){
  await page.goto(`/deep-learning/terms/spring-2026/s04/slides/#page=${number}`);
  await page.waitForFunction(n=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===n,number);
  if(width===390){const old=await page.locator('#persian-page .reader-slide-stage').elementHandle();await page.locator('[data-view-translation]').click();if(old)await page.waitForFunction(node=>!node.isConnected,old);await page.waitForFunction(()=>window.sourceSlideReader?.ready);}
  const slide=page.locator('#persian-page');
  await expect(slide).toHaveAttribute('data-layout',number===38?'source-canvas':'source-canvas-figure-companion');
  await expect(slide.locator('.reader-slide-background')).toBeVisible();
  const labels=number===35?['0.427043','0.567001','خروجی گام زمانی قبل']:number===38?['پیش بینی قبلی','متوقف کنیم','نماد خروجی']:['پرسش های بحث گروهی','طبقه بندی متن','گونه نخست'];
  for(const label of labels)await expect(slide.locator('.reader-slide-text').filter({hasText:label}).first()).toBeVisible();
  await slide.locator('.reader-slide-holder').screenshot({path:testInfo.outputPath(`s04-page${number}-${width}.png`)});
 }
});
