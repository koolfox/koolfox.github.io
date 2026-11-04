import {test,expect} from '@playwright/test';

test('source slide text keeps source size and exact color without shrinking to fit',async({page})=>{
 await page.goto('/deep-learning/terms/spring-2026/s03/slides/');
 const result=await page.evaluate(async()=>{
  const {createSourceLayout,fitSourceLayout}=await import('/deep-learning/assets/slide-content.js');
  const region={block:{fa:'آزمون (test)',kind:'text',source_lines:[0]},rect:[.1,.1,.9,.5],slot:[.1,.1,.9,.5],font:24,color:'#ffffff',lines:[{accents:[{text:'test',color:'#000000'}]}]};
  const plan={layout:{width:480,height:270},regions:[region],figureLabels:[],tables:[],nativeMath:[]};
  const slide=createSourceLayout({},plan);document.body.append(slide.holder);await document.fonts.ready;
  const node=slide.stage.querySelector('.reader-slide-text'),word=node.querySelector('.reader-emphasis'),bdi=node.querySelector('bdi');
  const font=node.style.fontSize,color=node.style.color,accent=word?.style.color;
  const bdiSize=getComputedStyle(bdi).fontSize,nodeSize=getComputedStyle(node).fontSize;
  node.style.width='10px';node.style.height='10px';const fits=fitSourceLayout(slide.stage);
  return {font,color,accent,bdiSize,nodeSize,fits,after:node.style.fontSize};
 });
 expect(result.font).toBe('48px');expect(result.color).toBe('rgb(255, 255, 255)');
 expect(result.accent).toBe('rgb(0, 0, 0)');expect(result.bdiSize).toBe(result.nodeSize);
 expect(result.fits).toBe(false);expect(result.after).toBe(result.font);
});

for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
 test(`Persian and isolated English/numbers keep their reading directions at ${viewport.width}px`,async({page})=>{
  await page.setViewportSize(viewport);await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=70');
  await page.waitForFunction(()=>window.sourceSlideReader?.ready);
  if(viewport.width<761)await page.locator('[data-view-translation]').click();
  const result=await page.evaluate(async()=>{
   const {addText}=await import('/deep-learning/assets/slide-content.js');
   const sample=document.createElement('p');sample.dir='rtl';
   const text='خطا (error) برابر -2.5 است؛ تابع \\(x = -2\\)';addText(sample,text);document.body.append(sample);
   const tokens=[...sample.querySelectorAll('bdi')].map(node=>({text:node.textContent,dir:node.dir}));
   return {dir:getComputedStyle(sample).direction,tokens,math:sample.querySelector('.katex')?.textContent,content:sample.textContent};
  });
  expect(result.dir).toBe('rtl');
  expect(result.tokens).toEqual(expect.arrayContaining([expect.objectContaining({text:'(error)',dir:'ltr'}),expect.objectContaining({text:'-2.5',dir:'ltr'})]));
  expect(result.content).toContain('است؛ تابع');expect(result.math).toContain('−2');
 });
}

test('mobile view changes retain the readable fallback rather than an old slide layout',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/deep-learning/terms/spring-2026/s17/slides/#page=44');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready);
 await page.locator('[data-view-translation]').click();
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','text-overflow');
 await expect(page.locator('#persian-page .reader-slide-stage')).toHaveCount(0);
 await expect(page.locator('#persian-page table')).toBeVisible();
 await page.locator('[data-view-source]').click();await page.locator('[data-view-translation]').click();
 await expect(page.locator('#persian-page .reader-slide-stage')).toHaveCount(0);
 await expect(page.locator('#persian-page table')).toBeVisible();
});
