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

test('figure labels and semantic tables stay available without erasing source media',async({page})=>{
 await page.goto('/deep-learning/terms/spring-2026/s17/slides/#page=44');await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 await expect(page.locator('.reader-slide-background')).toBeVisible();
 await expect(page.locator('.reader-figure-labels')).toHaveAttribute('open','');
 await expect(page.locator('.reader-figure-content table')).toBeVisible();
 await expect(page.locator('.reader-figure-content table tbody tr')).not.toHaveCount(0);
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
