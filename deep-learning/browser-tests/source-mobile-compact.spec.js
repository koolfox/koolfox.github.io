import {test,expect} from '@playwright/test';

for (const viewport of [{width:320,height:568},{width:390,height:844},{width:568,height:320},{width:844,height:390}]) {
 test(`compact reader remains operable ${viewport.width}x${viewport.height}`,async({browser})=>{
  const context=await browser.newContext({viewport,isMobile:true,hasTouch:true});
  try {
   const page=await context.newPage();await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=25');
   await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===25);
   await expect(page.locator('#source-canvas')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
   const controls=page.locator('.reader-heading>a,.reader-sections [data-reader-section],.reader-toolbar button:visible,.reader-toolbar select:visible');
   for(const control of await controls.all()){
    const box=await control.boundingBox();expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
   }
   const boxes=await page.locator('.reader-toolbar button:visible,.reader-toolbar select:visible').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {name:node.getAttribute('aria-label')||node.textContent,x:r.x,y:r.y,right:r.right,bottom:r.bottom}}));
   for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
    const a=boxes[i],b=boxes[j];expect(a.x<b.right-1&&b.x<a.right-1&&a.y<b.bottom-1&&b.y<a.bottom-1,`${a.name} overlaps ${b.name}`).toBe(false);
   }
   await page.locator('[data-next-page]').click();await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===26);
   await page.locator('[data-prev-page]').click();await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===25);
   const header=page.locator('.reader-header'), initialTop=(await header.boundingBox()).y;
   await page.locator('[data-zoom-in]').click();await page.locator('[data-zoom-in]').click();
   const source=page.locator('.reader-original');await source.evaluate(node=>{node.scrollLeft=node.scrollWidth;node.scrollTop=node.scrollHeight});
   expect((await header.boundingBox()).y).toBe(initialTop);
   await page.locator('[data-view-translation]').click();await expect(page.locator('#translation-panel')).toBeVisible();
   await expect(page.locator('#persian-page')).toHaveAttribute('dir','rtl');
   await page.locator('.reader-sections [data-reader-section=questions]').click();await expect(page.locator('[data-reader-tools-frame]')).toBeVisible();
   await page.locator('.reader-sections [data-reader-section=slides]').click();
   await page.locator('.reader-sections [data-reader-section=lab]').click();await expect(page.locator('[data-reader-tools-frame]')).toBeVisible();
   await page.locator('.reader-sections [data-reader-section=slides]').click();
   const full=page.locator('[data-fullscreen]');await full.click();await expect(full).toHaveAttribute('aria-pressed','true');
   await expect(page.locator('.reader-toolbar')).toBeHidden();await expect(page.locator('[data-focus-exit]')).toBeVisible();await page.locator('[data-focus-exit]').click();await expect(full).toHaveAttribute('aria-pressed','false');
   const back=page.locator('.reader-heading>a');await back.focus();await expect(back).toBeFocused();await page.keyboard.press('Tab');
   expect(await page.evaluate(()=>document.activeElement!==document.body)).toBe(true);
  } finally {await context.close();}
 });
}

test('desktop retains side by side slides and text controls',async({browser})=>{
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 try{
  const page=await context.newPage();await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=25');
  await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===25);
  await expect(page.locator('#original-panel')).toBeVisible();await expect(page.locator('#translation-panel')).toBeVisible();
  expect(await page.locator('[data-fullscreen]').evaluate(node=>getComputedStyle(node).fontSize)).not.toBe('0px');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
 }finally{await context.close();}
});

test('fullscreen fallback keeps mobile controls and exits with Escape',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 try{
  const page=await context.newPage();await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=25');
  await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===25);
  await page.evaluate(()=>Object.defineProperty(document.documentElement,'requestFullscreen',{value:undefined,configurable:true}));
  const full=page.locator('[data-fullscreen]');await full.click();await expect(full).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.reader-toolbar')).toBeHidden();await expect(page.locator('[data-focus-exit]')).toBeVisible();await page.keyboard.press('Escape');
  await expect(full).toHaveAttribute('aria-pressed','false');await expect(full).toBeFocused();
 }finally{await context.close();}
});

test('fullscreen gallery keeps navigation and language controls available',async({page},testInfo)=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=2');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===2);
 await expect(page.locator('.reader-heading h1')).toContainText('۲');
 await page.evaluate(()=>Object.defineProperty(document.documentElement,'requestFullscreen',{value:undefined,configurable:true}));
 await page.locator('[data-fullscreen]').click();
 await expect(page.locator('.reader-header')).toBeHidden();await expect(page.locator('.reader-toolbar')).toBeHidden();
 await expect(page.locator('[data-focus-exit]')).toBeFocused();
 await expect(page.locator('[data-focus-position]')).toContainText('۲');
 await page.locator('[data-focus-view=both]').click();
 await expect(page.locator('[data-focus-view=both]')).toHaveAttribute('aria-pressed','true');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===2);
 await expect(page.locator('#translation-panel')).toBeVisible();await expect(page.locator('#original-panel')).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('fullscreen-gallery-mobile.png')});
 await page.locator('[data-focus-next]').click();await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===3);
 await page.locator('[data-focus-exit]').click();await expect(page.locator('.reader-toolbar')).toBeVisible();
 await expect(page.locator('[data-view-both]')).toHaveAttribute('aria-pressed','true');
});

for(const viewport of [{width:390,height:844},{width:844,height:390}])test(`mobile shows both languages with Persian first at ${viewport.width}x${viewport.height}`,async({page},testInfo)=>{
 await page.setViewportSize(viewport);
 await page.goto('/deep-learning/terms/spring-2026/s08/slides/#page=4');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===4);
 await page.locator('[data-view-both]').click();
 await expect(page.locator('[data-view-both]')).toHaveAttribute('aria-pressed','true');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===4);
 await expect(page.locator('#translation-panel')).toBeVisible();
 await expect(page.locator('#original-panel')).toBeVisible();
 const boxes=await page.evaluate(()=>{
  const fa=document.querySelector('#translation-panel').getBoundingClientRect(),en=document.querySelector('#original-panel').getBoundingClientRect();
  return {faTop:fa.top,faBottom:fa.bottom,enTop:en.top,scroll:document.querySelector('.reader-layout').scrollHeight,client:document.querySelector('.reader-layout').clientHeight};
 });
 expect(boxes.faTop).toBeLessThan(boxes.enTop);expect(boxes.faBottom).toBeLessThanOrEqual(boxes.enTop+1);expect(boxes.scroll).toBeGreaterThan(boxes.client);
 await page.screenshot({path:testInfo.outputPath(`both-languages-${viewport.width}.png`)});
 await page.locator('[data-next-page]').click();await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===5);
 await expect(page.locator('[data-view-both]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-source-only-toggle]').click();await expect(page.locator('[data-view-source]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-source-only-toggle]').click();await expect(page.locator('[data-view-both]')).toHaveAttribute('aria-pressed','true');
});

test('slow page load shows a placeholder and clears it after completion',async({page})=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});let requested;
 const seen=new Promise(resolve=>{requested=resolve;});
 await page.route('**/s06-pages/manifest.json*',async route=>{requested();await gate;await route.continue();});
 try{
  await page.goto('/deep-learning/terms/spring-2026/s06/slides/#page=2',{waitUntil:'domcontentloaded'});
  await seen;
  await expect(page.locator('#original-panel .reader-placeholder')).toBeVisible();
  await expect(page.locator('#original-panel')).toHaveAttribute('aria-busy','true');
  release();
  await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===2);
  await expect(page.locator('#original-panel .reader-placeholder')).toBeHidden();
  await expect(page.locator('#original-panel')).toHaveAttribute('aria-busy','false');
 }finally{release();}
});
