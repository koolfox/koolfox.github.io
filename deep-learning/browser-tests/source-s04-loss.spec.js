import {test,expect} from '@playwright/test';
for(const width of [1440,390])test(`classification loss and gradient slides preserve source regions at ${width}px`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:850});
 for(const number of [46,47,48,49,50,51]){
  await page.goto(`/deep-learning/terms/spring-2026/s04/slides/#page=${number}`);
  await page.waitForFunction(n=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===n,number);
  if(width===390){const old=await page.locator('#persian-page .reader-slide-stage').elementHandle();await page.locator('[data-view-translation]').click();if(old)await page.waitForFunction(node=>!node.isConnected,old);await page.waitForFunction(()=>window.sourceSlideReader?.ready);}
  const slide=page.locator('#persian-page');await expect(slide).toHaveAttribute('data-layout',[47,48,51].includes(number)?'source-canvas-figure-companion':'source-canvas');await expect(slide.locator('.reader-slide-background')).toBeVisible();
  const labels={46:['بردار تک داغ'],47:['تعداد کلاس ها','ضریب ثابت'],48:['حد بالا','صفر میل کند'],49:['معیار توقف','تابع زیان'],50:['موضوع'],51:['مشاهده اصلی','چرا این مشکل است']}[number];
  for(const label of labels)await expect(slide.locator('.reader-slide-text').filter({hasText:label}).first()).toBeVisible();
  if(number===47||number===48)await slide.locator('.reader-slide-holder').screenshot({path:testInfo.outputPath(`s04-page${number}-${width}.png`)});
 }
});
