import {test,expect} from '@playwright/test';
for(const width of [1440,390])test(`page 44 keeps the aggregation diagram and Persian text at ${width}px`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:850});await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=44');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===44);
 if(width===390){const old=await page.locator('#persian-page .reader-slide-stage').elementHandle();await page.locator('[data-view-translation]').click();if(old)await page.waitForFunction(node=>!node.isConnected,old);await page.waitForFunction(()=>window.sourceSlideReader?.ready);}
 const slide=page.locator('#persian-page');await expect(slide).toHaveAttribute('data-layout','source-canvas-figure-companion');await expect(slide.locator('.reader-slide-background')).toBeVisible();
 for(const text of ['N-to-Many','زیان']){
  const node=slide.locator('.reader-slide-text').filter({hasText:text});await expect(node).toBeVisible();
  const fit=await node.evaluate(el=>({width:el.scrollWidth<=el.clientWidth+2,height:el.scrollHeight<=el.clientHeight+2}));expect(fit.width&&fit.height).toBe(true);
 }
 await slide.locator('.reader-slide-holder').screenshot({path:testInfo.outputPath(`s04-page44-${width}.png`)});
});
