import {test,expect} from '@playwright/test';
for(const width of [1440,390])test(`sequence examples have larger labels without clipping at ${width}px`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:850});await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=9');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===9);
 if(width===390){const old=await page.locator('#persian-page .reader-slide-stage').elementHandle();await page.locator('[data-view-translation]').click();if(old)await page.waitForFunction(node=>!node.isConnected,old);await page.waitForFunction(()=>window.sourceSlideReader?.ready);}
 const slide=page.locator('#persian-page');await expect(slide).toHaveAttribute('data-layout','source-canvas-figure-companion');
 for(const text of ['یک به چند','چند به چند','چند به یک','ورودی: اندازه ثابت','خروجی: اندازه ثابت']){
  const node=slide.locator('.reader-slide-text').filter({hasText:text}).first();await expect(node).toBeVisible();
  const fit=await node.evaluate(el=>({size:parseFloat(getComputedStyle(el).fontSize),width:el.scrollWidth<=el.clientWidth+2,height:el.scrollHeight<=el.clientHeight+2}));
  expect(fit.size).toBeGreaterThanOrEqual(16);expect(fit.width&&fit.height).toBe(true);
 }
 await slide.locator('.reader-slide-holder').screenshot({path:testInfo.outputPath(`s04-page9-${width}.png`)});
});
