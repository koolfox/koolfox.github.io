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

test('only overflowing prose shrinks in bounded steps and failure restores sizes',async({page})=>{
 await page.goto('/deep-learning/terms/spring-2026/s03/slides/');
 const result=await page.evaluate(async()=>{
  const {fitSourceLayout}=await import('/deep-learning/assets/slide-content.js');await document.fonts.ready;
  const stage=document.createElement('div');stage.style.cssText='width:960px;position:absolute;top:0';document.body.append(stage);
  function node(text,color){const n=document.createElement('div');n.className='reader-slide-text';n.style.cssText=`position:relative;width:900px;height:35px;white-space:nowrap;font-size:24px;color:${color}`;n.textContent=text;stage.append(n);return n;}
  const normal=node('متن کوتاه','#ffffff'),long=node('این متن برای بررسی کوچک سازی کنترل شده است','#ffc000');
  const range=document.createRange();range.selectNodeContents(long);long.style.width=Math.floor(range.getBoundingClientRect().width*.92)+'px';
  const fit=fitSourceLayout(stage),after=[normal.style.fontSize,long.style.fontSize],colors=[normal.style.color,long.style.color];
  long.style.fontSize='24px';stage.style.transform='scale(.3)';const small=fitSourceLayout(stage),restored=long.style.fontSize;
  stage.style.transform='';const math=node('equation must not shrink','#ffffff');math.classList.add('reader-word-math');math.style.width='10px';
  const protectedMath=fitSourceLayout(stage),afterFailure=[normal.style.fontSize,long.style.fontSize,math.style.fontSize];stage.remove();
  return {fit,after,colors,small,restored,protectedMath,afterFailure};
 });
 expect(result.fit).toBe(true);expect(result.after[0]).toBe('24px');expect(['22.8px','21.6px','20.4px']).toContain(result.after[1]);
 expect(result.colors).toEqual(['rgb(255, 255, 255)','rgb(255, 192, 0)']);
 expect(result.small).toBe(false);expect(result.restored).toBe('24px');
 expect(result.protectedMath).toBe(false);expect(result.afterFailure).toEqual(['24px','24px','24px']);
});

for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
 test(`source diagram keeps white and yellow text after bounded fit at ${viewport.width}px`,async({page})=>{
  await page.setViewportSize(viewport);await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=30');await page.waitForFunction(()=>window.sourceSlideReader?.ready);
  if(viewport.width<761){await page.locator('[data-view-translation]').click();await page.waitForFunction(()=>window.sourceSlideReader?.ready);}
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const result=await page.evaluate(async()=>{
   const config=JSON.parse(document.querySelector('#source-reader-config').textContent),record=(await(await fetch(config.translationUrl)).json()).pages[29],{sourceLayoutPlan}=await import('/deep-learning/assets/slide-content.js'),plan=sourceLayoutPlan(record,config),nodes=[...document.querySelectorAll('.reader-slide-text')];
   const source=document.querySelector('#source-canvas'),target=document.querySelector('.reader-slide-background');
   function crop(canvas){const temp=document.createElement('canvas');temp.width=64;temp.height=64;const ctx=temp.getContext('2d');ctx.drawImage(canvas,canvas.width*.05,canvas.height*.42,canvas.width*.38,canvas.height*.36,0,0,64,64);return ctx.getImageData(0,0,64,64).data;}
   const a=crop(source),b=crop(target);let delta=0;for(let i=0;i<a.length;i+=4)delta+=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
   return {nodes:nodes.map((node,index)=>({text:node.textContent,size:parseFloat(node.style.fontSize),source:plan.regions[index].font/plan.layout.width*960,screen:parseFloat(node.style.fontSize)*node.closest('.reader-slide-stage').getBoundingClientRect().width/960,color:getComputedStyle(node).color,overflow:node.scrollHeight>node.clientHeight+2||node.scrollWidth>node.clientWidth+2})),delta:delta/(64*64*3)};
  });
  expect(result.nodes.some(node=>node.size/node.source<.99)).toBe(true);expect(result.nodes.some(node=>node.color==='rgb(255, 192, 0)')).toBe(true);expect(result.nodes.some(node=>node.color==='rgb(255, 255, 255)')).toBe(true);
  for(const node of result.nodes){expect(node.overflow,node.text).toBe(false);if(node.size/node.source<.99){expect(node.size/node.source).toBeGreaterThanOrEqual(.8499);expect(node.screen).toBeGreaterThanOrEqual(12);}}
  if(viewport.width>761)expect(result.delta).toBeLessThan(3);
  await expect(page.locator('.reader-slide-background')).toBeVisible();
 });
}

test('source operator protection still rejects an unsafe placement after fitting',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=26');await page.waitForFunction(()=>window.sourceSlideReader?.ready);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','unmatched-operators');
 await expect(page.locator('#source-canvas')).toBeVisible();await expect(page.locator('#persian-page .reader-slide-stage')).toHaveCount(0);
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

test('measurable source text in fallback retains native color, background and scaled size',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/deep-learning/terms/spring-2026/s17/slides/#page=44');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready);
 const result=await page.evaluate(async()=>{
  const config=JSON.parse(document.querySelector('#source-reader-config').textContent);
  const record=(await(await fetch(config.translationUrl)).json()).pages[43];
  const line=record.source_layout.lines.find(line=>line.index===0);
  const title=document.querySelector('#persian-page .reader-copy.heading'),style=getComputedStyle(title);
  const original=parseFloat(document.querySelector('#source-canvas').style.width);
  return {matched:title.dataset.sourceFallback,color:style.color,background:style.backgroundColor,size:parseFloat(style.fontSize),expected:line.font_size/record.source_layout.width*original};
 });
 expect(result.matched).toBe('measured');expect(result.color).toBe('rgb(255, 255, 255)');expect(result.background).toBe('rgb(0, 0, 0)');
 expect(Math.abs(result.size-result.expected)).toBeLessThan(.05);
 const table=page.locator('.reader-table-viewport').first();await table.focus();
 expect(await table.evaluate(node=>node.scrollWidth>node.clientWidth)).toBe(true);
 await expect(table).toBeFocused();
});

test('ambiguous multicolor source remains legible rather than inventing a color mapping',async({page})=>{
 await page.goto('/deep-learning/terms/spring-2026/s07/slides/#page=18');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready);
 await expect(page.locator('#persian-page .reader-copy.heading')).toHaveAttribute('data-source-fallback','measured');
 const ordinary=page.locator('#persian-page .reader-copy').filter({hasText:'نامهٔ مشهور'}).first();
 await expect(ordinary).not.toHaveAttribute('data-source-fallback','measured');
 await expect(ordinary).toBeVisible();
});
