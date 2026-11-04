import {test,expect} from '@playwright/test';

const deck='/deep-learning/terms/spring-2026/s03/slides/';
const ready=page=>page.waitForFunction(()=>window.sourceSlideReader?.ready);

test('source canvas preserves white native labels, graphics and exact numeric values',async({page})=>{
 await page.goto(deck+'#page=70');await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 await expect(page.locator('.reader-slide-background')).toBeVisible();
 const sourceTitlePixels=await page.locator('#source-canvas').evaluate(canvas=>{const context=canvas.getContext('2d'),pixels=context.getImageData(Math.floor(canvas.width*.08),Math.floor(canvas.height*.11),Math.floor(canvas.width*.58),Math.floor(canvas.height*.085)).data;let count=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>200&&pixels[i+1]>200&&pixels[i+2]>200)count++;return count;});
 expect(sourceTitlePixels).toBeGreaterThan(100);
 const title=page.locator('.reader-slide-text').first();
 await expect(title).toContainText('Forward Pass');
 await expect(title).toHaveCSS('color','rgb(255, 255, 255)');
 expect(await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.every(n=>n.scrollHeight<=n.clientHeight+2&&n.scrollWidth<=n.clientWidth+2))).toBeTruthy();
 await page.locator('[data-view-translation]').click();await ready(page);
 await page.locator('[data-zoom-in]').click();await ready(page);
 await expect(page.locator('.reader-slide-background')).toBeVisible();
});

test('long translation falls back without clipping and keeps its accessible table',async({page})=>{
 await page.goto('/deep-learning/terms/spring-2026/s17/slides/#page=44');await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','text-overflow');
 await expect(page.locator('#source-canvas')).toBeVisible();
 await expect(page.locator('#persian-page table')).toBeVisible();
 await expect(page.locator('#persian-page table tbody tr')).not.toHaveCount(0);
});

test('page-bound custom tools and page-change event do not load a general toy first',async({page})=>{
 await page.goto(deck+'#page=70');await ready(page);
 const result=await page.evaluate(()=>{
  const events=[];window.addEventListener('danna:source-page',e=>events.push(e.detail));window.testPageEvents=events;
  const url=location.origin+'/deep-learning/knowledge/';window.sourceSlideReader.openTool(url);
  return document.querySelector('[data-reader-tools-frame]').src;
 });
 expect(result).toContain('/deep-learning/knowledge/');
 await page.locator('[data-next-page]').click();await ready(page);
 expect(await page.evaluate(()=>document.body.dataset.readerSection)).toBe('slides');
 await expect(page.locator('[data-reader-tools-frame]')).toHaveAttribute('src','about:blank');
 expect(await page.evaluate(()=>window.testPageEvents.at(-1).page)).toBe(71);
 const rejected=await page.evaluate(()=>{try{window.sourceSlideReader.openTool('https://example.com/');return false;}catch{return true;}});
 expect(rejected).toBeTruthy();
});

test('split labels need exact English anchors and whitespace slots avoid source obstacles',async({page})=>{
 await page.goto(deck+'#page=70');await ready(page);
 const result=await page.evaluate(async()=>{
  const {sourceLayoutPlan}=await import('/deep-learning/assets/slide-content.js');
  const parts=[{text:'Input',rect:[.1,.2,.3,.25],font_size:24,color:'#ff0000'},
               {text:'Target',rect:[.34,.2,.54,.25],font_size:24,color:'#00ff00'}];
  const record={blocks:[{source_lines:[0],kind:'text',fa:'ورودی (Input)؛ هدف (Target)'}],image_text:[],
   source_layout:{width:960,height:540,lines:[{index:0,rect:[.1,.2,.54,.25],font_size:24,color:'#ffffff',parts}],
    images:[{rect:[.1,.35,.7,.8]}],graphics:[]}};
  const plan=sourceLayoutPlan(record);record.blocks[0].fa='ورودی (InputLayer)؛ هدف (Target)';
  return {reason:plan.reason,regions:plan.regions.map(r=>({rect:r.rect,slot:r.slot,color:r.color})),unmatched:sourceLayoutPlan(record).reason};
 });
 expect(result.reason).toBeNull();expect(result.regions).toHaveLength(2);
 expect(result.regions[0].slot[2]).toBeLessThan(result.regions[1].rect[0]);
 expect(result.regions[0].slot[3]).toBeLessThan(.35);
 expect(result.regions.map(r=>r.color)).toEqual(['#ff0000','#00ff00']);
 expect(result.unmatched).toBe('split-source-line');
});

test('native source equations retain selectable KaTeX and MathML in their companion',async({page})=>{
 await page.goto(deck+'#page=30');await ready(page);
 expect(await page.locator('#persian-page .katex').count()).toBeGreaterThan(0);
 expect(await page.locator('#persian-page math').count()).toBeGreaterThan(0);
 const companion=page.locator('.reader-figure-labels');
 if(await companion.count()&&!await companion.evaluate(node=>node.open))await companion.locator('summary').click();
 await expect(page.locator('#persian-page .katex').first()).toBeVisible();
});

test('reviewed gradient diagrams retain source size, frames and Persian equation direction',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 for(const number of [39,40,41,42]){
  await page.goto(`/deep-learning/terms/spring-2026/s03/slides/#page=${number}`);await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const details=await page.evaluate(async()=>{
   const config=JSON.parse(document.querySelector('#source-reader-config').textContent),record=(await(await fetch(config.translationUrl)).json()).pages[window.sourceSlideReader.page-1];
   const heading=document.querySelector('.reader-slide-text'),line=record.source_layout.lines.find(line=>line.index===record.blocks[0].source_lines[0]);
   const equations=[...document.querySelectorAll('.reader-word-math')].map(node=>({text:node.textContent,dir:getComputedStyle(node).direction,height:node.scrollHeight,font:parseFloat(node.style.fontSize),width:node.clientWidth,scrollWidth:node.scrollWidth}));
   const canvas=document.querySelector('.reader-slide-background'),data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let red=0;
   for(let i=0;i<data.length;i+=4)if(data[i]>220&&data[i+1]<40&&data[i+2]<40)red++;
   return {actual:parseFloat(heading.style.fontSize),expected:line.font_size/record.source_layout.width*960,color:getComputedStyle(heading).color,equations,red,text:document.querySelector('#persian-page').textContent};
  });
  expect(Math.abs(details.actual-details.expected)).toBeLessThan(.05);
  expect(details.color).toBe('rgb(255, 255, 255)');expect(details.red).toBeGreaterThan(30);
  expect(details.text).not.toMatch(/[\u064b-\u065f\u0670]/);
  for(const equation of details.equations){expect(equation.dir).toBe('rtl');expect(equation.scrollWidth).toBeLessThanOrEqual(equation.width+2);}
  if(number===40||number===42){const error=details.equations.find(equation=>equation.text.includes('مقدار درست'));expect(error).toBeTruthy();expect(error.height).toBeLessThan(error.font*1.5);}
 }
});

test('reviewed gradient diagram remains visible in the mobile Persian view',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=40');await ready(page);
 await page.locator('[data-view-translation]').click();await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 await expect(page.locator('.reader-slide-background')).toBeVisible();
 await expect(page.locator('.reader-word-math').last()).toContainText('خطا = حدس − مقدار درست');
});

test('manual diagram placement is bound to the exact PDF and translation',async({page})=>{
 await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=40');await ready(page);
 const checks=await page.evaluate(async()=>{
  const config=JSON.parse(document.querySelector('#source-reader-config').textContent),record=(await(await fetch(config.translationUrl)).json()).pages[39];
  const {sourceLayoutPlan}=await import('/deep-learning/assets/slide-content.js');
  const slot=(data,identity)=>sourceLayoutPlan(data,identity).regions.find(region=>region.block.kind==='heading').slot;
  const changed=structuredClone(record);changed.source_layout.translation_sha256='0'.repeat(64);
  return {reviewed:slot(record,config),wrongPdf:slot(record,{...config,sourceSha256:'0'.repeat(64)}),wrongText:slot(changed,config)};
 });
 expect(checks.reviewed).not.toEqual(checks.wrongPdf);expect(checks.reviewed).not.toEqual(checks.wrongText);
});

test('weight-update diagrams preserve the source network, equations and measured type',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 for(const number of [86,87,88,89]){
  await page.goto(`/deep-learning/terms/spring-2026/s03/slides/#page=${number}`);await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const evidence=await page.evaluate(async()=>{
   const config=JSON.parse(document.querySelector('#source-reader-config').textContent),record=(await(await fetch(config.translationUrl)).json()).pages[window.sourceSlideReader.page-1];
   const line=record.source_layout.lines.find(line=>line.index===27),red=[...document.querySelectorAll('.reader-slide-text')].find(n=>n.textContent.startsWith('پارامترهای تازه'));
   const canvas=document.querySelector('.reader-slide-background'),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let redCount=0,greenCount=0;
   for(let i=0;i<pixels.length;i+=4){if(pixels[i]>200&&pixels[i+1]<65&&pixels[i+2]<65)redCount++;if(pixels[i+1]>80&&pixels[i+1]>pixels[i]*1.4&&pixels[i+1]>pixels[i+2]*1.3)greenCount++;}
   return {actual:parseFloat(red.style.fontSize),expected:line.font_size/record.source_layout.width*960,color:getComputedStyle(red).color,overflow:red.scrollHeight>red.clientHeight+2,redCount,greenCount,formula:record.blocks.find(block=>block.kind==='math').fa};
  });
  expect(Math.abs(evidence.actual-evidence.expected)).toBeLessThan(.05);
  expect(evidence.color).toBe('rgb(255, 0, 0)');expect(evidence.overflow).toBe(false);
  expect(evidence.redCount).toBeGreaterThan(50);expect(evidence.greenCount).toBeGreaterThan(50);
  expect(evidence.formula).toMatch(/0\.9/);
 }
});

test('weight-update diagram and exact values remain available on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=88');await ready(page);
 await page.locator('[data-view-translation]').click();await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 await expect(page.locator('.reader-slide-background')).toBeVisible();
 await page.locator('.reader-figure-labels summary').click();
 await expect(page.locator('.reader-figure-content')).toContainText('0.218');
});
