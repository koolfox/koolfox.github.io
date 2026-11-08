import {test,expect} from '@playwright/test';

const deck='/deep-learning/terms/spring-2026/s03/slides/';
const ready=page=>page.waitForFunction(()=>window.sourceSlideReader?.ready);

test('backpropagation basics retains figures, accents and complete Persian text',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto(deck+'#page=61');await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 const result=await page.evaluate(async()=>{
  const config=JSON.parse(document.querySelector('#source-reader-config').textContent),record=(await(await fetch(config.translationUrl)).json()).pages[60],{sourceLayoutPlan}=await import('/deep-learning/assets/slide-content.js'),plan=sourceLayoutPlan(record,config);
  const intersects=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1],collisions=plan.regions.flatMap(region=>record.source_layout.images.filter(image=>intersects(region.slot,image.rect)));
  const nodes=[...document.querySelectorAll('.reader-slide-text')],stress=nodes.map((node,index)=>{const probe=node.cloneNode(true);probe.style.visibility='hidden';probe.style.width=(node.clientWidth*(index===0?.9:.85))+'px';probe.style.lineHeight='1.25';node.parentElement.append(probe);const value={text:node.textContent,width:probe.clientWidth,scrollWidth:probe.scrollWidth,height:probe.clientHeight,scrollHeight:probe.scrollHeight,color:getComputedStyle(node).color};probe.remove();return value});
  return {collisions,images:record.source_layout.images.length,stress,fonts:plan.regions.map(region=>region.font),accents:[...document.querySelectorAll('.reader-slide-text .reader-emphasis')].map(node=>({text:node.textContent,color:getComputedStyle(node).color}))};
 });
 expect(result.images).toBe(5);expect(result.collisions).toEqual([]);
 expect(result.fonts.slice(1,4)).toEqual([17.18,17.18,17.18]);
 for(const item of result.stress){expect(item.scrollWidth,item.text).toBeLessThanOrEqual(item.width+2);expect(item.scrollHeight,item.text).toBeLessThanOrEqual(item.height+2);}
 expect(result.stress.at(-1).color).toBe('rgb(255, 192, 0)');
 for(const term of ['تابعی ریاضی','زنجیره','مشتق‌های جزئی نسبت به متغیرهای تابع','قاعدهٔ زنجیره‌ای (Chain Rule) حساب دیفرانسیل'])expect(result.accents).toContainEqual({text:term,color:'rgb(255, 192, 0)'});
 await expect(page.locator('.reader-slide-text').filter({hasText:'تنها بر مشتق‌های محلی تکیه دارد'})).toBeVisible();
});

test('backpropagation basics remains available in the mobile Persian view',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto(deck+'#page=61');await ready(page);
 await page.locator('[data-view-translation]').click();await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 await expect(page.locator('.reader-slide-background')).toBeVisible();
 await expect(page.locator('.reader-slide-text').filter({hasText:'مشتق‌های محلی'})).toBeVisible();
});

test('gradient definition slide retains the source plot and faithful definitions',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto(deck+'#page=44');await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const result=await page.evaluate(async()=>{
  const config=JSON.parse(document.querySelector('#source-reader-config').textContent),record=(await(await fetch(config.translationUrl)).json()).pages[43],{sourceLayoutPlan}=await import('/deep-learning/assets/slide-content.js'),plan=sourceLayoutPlan(record,config);
  const owned=new Set(plan.regions.flatMap(region=>region.lines.map(line=>line.index))),intersects=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
  const collisions=plan.regions.flatMap(region=>record.source_layout.lines.filter(line=>!owned.has(line.index)&&intersects(region.slot,line.rect)).map(line=>line.index));
  const imageCollisions=plan.regions.flatMap(region=>record.source_layout.images.filter(image=>intersects(region.slot,image.rect)));
  const nodes=[...document.querySelectorAll('.reader-slide-text')],stress=nodes.map((node,index)=>{const probe=node.cloneNode(true);probe.style.visibility='hidden';probe.style.width=(node.clientWidth*(index===0?.90:.85))+'px';probe.style.lineHeight='1.25';node.parentElement.append(probe);const r={text:node.textContent,width:probe.clientWidth,scrollWidth:probe.scrollWidth,height:probe.clientHeight,scrollHeight:probe.scrollHeight,actual:parseFloat(node.style.fontSize),expected:plan.regions[index].font/plan.layout.width*960};probe.remove();return r});
  return {collisions,imageCollisions,owned:[...owned],stress,lines:record.lines,accents:[...document.querySelectorAll('.reader-slide-text .reader-emphasis')].map(node=>({text:node.textContent,color:getComputedStyle(node).color})),bidi:[...document.querySelectorAll('.reader-slide-text bdi')].map(node=>({text:node.textContent,dir:node.dir,whiteSpace:getComputedStyle(node).whiteSpace}))};
 });
 expect(result.collisions).toEqual([]);expect(result.imageCollisions).toEqual([]);
 for(const index of [8,9,10,11])expect(result.owned).not.toContain(index);
 for(const node of result.stress){expect(Math.abs(node.actual-node.expected)).toBeLessThan(.05);expect(node.scrollWidth,node.text).toBeLessThanOrEqual(node.width+2);expect(node.scrollHeight,node.text).toBeLessThanOrEqual(node.height+2);}
 const text=result.stress.map(node=>node.text).join(' ');
 for(const phrase of ['هر متغیر تابع در','چگونه خروجی','مشتق‌های جزئی برای چند متغیر','تغییر عمودی/تغییر افقی','در هر نقطه نشان می‌دهد'])expect(text).toContain(phrase);
 for(const term of ['گرادیان (Gradient)','مشتق‌های جزئی برای چند متغیر','مشتق (Derivative)'])expect(result.accents).toContainEqual({text:term,color:'rgb(255, 192, 0)'});
 expect(result.bidi.some(item=>item.text==='f(x)'&&item.dir==='ltr')).toBe(true);
 expect(result.bidi.some(item=>item.text==='(Non-convex)'&&item.whiteSpace==='nowrap')).toBe(true);
});

test('gradient definition remains available in the mobile Persian view',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto(deck+'#page=44');await ready(page);
 await page.locator('[data-view-translation]').click();await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 await expect(page.locator('.reader-slide-background')).toBeVisible();
 await expect(page.locator('.reader-slide-text').filter({hasText:'مشتق‌های جزئی برای چند متغیر'})).toBeVisible();
});

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
 await page.goto('/deep-learning/terms/spring-2026/s14/slides/#page=25');await ready(page);
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
 for(const number of [86,87,88,89,90,91,92,93,94,95,96]){
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

test('XOR example preserves source image and two distinct caption colors and sizes',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=99');await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const evidence=await page.evaluate(async()=>{
  const config=JSON.parse(document.querySelector('#source-reader-config').textContent),record=(await(await fetch(config.translationUrl)).json()).pages[98],lines=record.source_layout.lines;
  const nodes=[...document.querySelectorAll('.reader-slide-text')],first=nodes.find(node=>node.textContent.startsWith('برای مثال، وزن‌ها')),second=nodes.find(node=>node.textContent.startsWith('(و مسئله‌های'));
  const image=record.source_layout.images[0].rect,source=document.querySelector('#source-canvas'),target=document.querySelector('.reader-slide-background');
  function crop(canvas){const temp=document.createElement('canvas');temp.width=64;temp.height=64;const [x0,y0,x1,y1]=image;temp.getContext('2d').drawImage(canvas,x0*canvas.width,y0*canvas.height,(x1-x0)*canvas.width,(y1-y0)*canvas.height,0,0,64,64);return temp.getContext('2d').getImageData(0,0,64,64).data;}
  const a=crop(source),b=crop(target);let delta=0;for(let i=0;i<a.length;i+=4)delta+=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
  const fields=node=>({size:parseFloat(node.style.fontSize),color:getComputedStyle(node).color,white:[...node.querySelectorAll('.reader-emphasis')].some(el=>getComputedStyle(el).color==='rgb(255, 255, 255)'),fits:node.scrollWidth<=node.clientWidth+2&&node.scrollHeight<=node.clientHeight+2});
  return {a:fields(first),b:fields(second),expected:lines.filter(line=>line.index<2).sort((a,b)=>a.index-b.index).map(line=>line.font_size/record.source_layout.width*960),delta:delta/(64*64*3)};
 });
 expect(evidence.a.color).toBe('rgb(255, 192, 0)');expect(evidence.a.white).toBe(true);
 expect(evidence.b.color).toBe('rgb(255, 255, 255)');expect(evidence.a.fits&&evidence.b.fits).toBe(true);
 expect(Math.abs(evidence.a.size-evidence.expected[0])).toBeLessThan(.05);expect(Math.abs(evidence.b.size-evidence.expected[1])).toBeLessThan(.05);
 expect(evidence.delta).toBeLessThan(3);
});

test('computational graphs preserve their source diagrams, formulas and colored labels',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=105');await ready(page);
 const state=await page.locator('#persian-page').getAttribute('data-layout');
 if(state!=='source-canvas'){
  const diagnostic=await page.evaluate(async()=>{
   const config=JSON.parse(document.querySelector('#source-reader-config').textContent),record=(await(await fetch(config.translationUrl)).json()).pages[104];
   const {sourceLayoutPlan,createSourceLayout}=await import('/deep-learning/assets/slide-content.js');
   const plan=sourceLayoutPlan(record,config);if(plan.reason)return {reason:plan.reason};
   const slide=createSourceLayout(record,plan);document.body.append(slide.holder);await document.fonts.ready;
   const overflows=[...slide.stage.querySelectorAll('.reader-slide-text')].filter(n=>n.scrollHeight>n.clientHeight+2||n.scrollWidth>n.clientWidth+2).map(n=>({text:n.textContent,font:getComputedStyle(n).font,width:n.clientWidth,scrollWidth:n.scrollWidth,height:n.clientHeight,scrollHeight:n.scrollHeight}));
   const fonts=[...document.fonts].filter(f=>f.family==='Arad').map(f=>({family:f.family,status:f.status}));slide.holder.remove();return {state:document.querySelector('#persian-page').dataset.layout,fonts,overflows};
  });
  console.error('Source layout diagnostics:',JSON.stringify(diagnostic));
 }
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const evidence=await page.evaluate(async()=>{
  const config=JSON.parse(document.querySelector('#source-reader-config').textContent),record=(await(await fetch(config.translationUrl)).json()).pages[104];
  const nodes=[...document.querySelectorAll('.reader-slide-text')],labels=nodes.map(node=>({text:node.textContent,color:getComputedStyle(node).color,overflow:node.scrollHeight>node.clientHeight+2||node.scrollWidth>node.clientWidth+2,yellow:[...node.querySelectorAll('.reader-emphasis')].some(el=>getComputedStyle(el).color==='rgb(255, 192, 0)')}));
  const alternative=nodes.find(node=>node.textContent==='یا');
  const crop=canvas=>{const temp=document.createElement('canvas');temp.width=64;temp.height=64;temp.getContext('2d').drawImage(canvas,.20*canvas.width,.61*canvas.height,.22*canvas.width,.22*canvas.height,0,0,64,64);return temp.getContext('2d').getImageData(0,0,64,64).data};
  const source=document.querySelector('#source-canvas'),background=document.querySelector('.reader-slide-background');
  const a=crop(source),b=crop(background);let delta=0;for(let i=0;i<a.length;i+=4)delta+=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
  const rightCrop=canvas=>{const temp=document.createElement('canvas');temp.width=64;temp.height=64;temp.getContext('2d').drawImage(canvas,.53*canvas.width,.55*canvas.height,.065*canvas.width,.10*canvas.height,0,0,64,64);return temp.getContext('2d').getImageData(0,0,64,64).data};
  const c=rightCrop(source),d=rightCrop(background);let redSource=0,redTarget=0,redDifference=0;for(let i=0;i<c.length;i+=4){const original=c[i]>150&&c[i]>c[i+1]*1.5&&c[i]>c[i+2]*1.5,painted=d[i]>150&&d[i]>d[i+1]*1.5&&d[i]>d[i+2]*1.5;redSource+=original;redTarget+=painted;redDifference+=original!==painted;}
  const original=nodes.find(node=>node.textContent.includes('مقدار میانی')),probe=original.cloneNode(true);
  probe.style.visibility='hidden';probe.style.width=(original.clientWidth*.85)+'px';probe.style.lineHeight='1.25';original.parentElement.append(probe);
  const stress={width:probe.clientWidth,scrollWidth:probe.scrollWidth,height:probe.clientHeight,scrollHeight:probe.scrollHeight,fontSize:getComputedStyle(probe).fontSize};probe.remove();
  return {labels,alternative:Boolean(alternative)&&!alternative.querySelector('.katex'),delta:delta/(64*64*3),redSource,redTarget,redDifference: redDifference/(64*64),stress,formula:record.blocks.find(block=>block.kind==='math').fa};
 });
 expect(evidence.alternative).toBe(true);expect(evidence.formula).toBe('a = b + c یا a = d*(b + c)');
 await page.locator('.reader-figure-labels summary').click();await expect(page.locator('.reader-figure-content .katex-mathml')).toBeAttached();
 expect(evidence.labels.some(item=>item.text.includes('گرافی جهت‌دار')&&item.yellow)).toBe(true);
 expect(evidence.labels.some(item=>item.text.includes('گره‌ها')&&item.yellow)).toBe(true);
 expect(evidence.labels.some(item=>item.text.includes('یال‌ها')&&item.yellow)).toBe(true);
 expect(evidence.labels.some(item=>item.text.includes('مقدار میانی')&&item.color==='rgb(0, 253, 255)')).toBe(true);
 expect(evidence.labels.every(item=>!item.overflow)).toBe(true);expect(evidence.delta).toBeLessThan(3);expect(evidence.redSource).toBeGreaterThan(100);expect(evidence.redTarget).toBeGreaterThan(100);expect(evidence.redDifference).toBeLessThan(.05);
 expect(evidence.stress.scrollWidth).toBeLessThanOrEqual(evidence.stress.width+2);
 expect(evidence.stress.scrollHeight).toBeLessThanOrEqual(evidence.stress.height+2);
});

test('forward and backward pass diagram keeps source colors and exact example values',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=106');await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const values=await page.evaluate(()=>{
  const nodes=[...document.querySelectorAll('.reader-slide-text')];
  const mapped=nodes.map(n=>({text:n.textContent,colors:[...n.querySelectorAll('.reader-emphasis')].map(x=>getComputedStyle(x).color),overflow:n.scrollHeight>n.clientHeight+2||n.scrollWidth>n.clientWidth+2}));
  const crop=canvas=>{const t=document.createElement('canvas');t.width=64;t.height=64;t.getContext('2d').drawImage(canvas,.14*canvas.width,.70*canvas.height,.19*canvas.width,.22*canvas.height,0,0,64,64);return t.getContext('2d').getImageData(0,0,64,64).data};
  const a=crop(document.querySelector('#source-canvas')),b=crop(document.querySelector('.reader-slide-background'));let delta=0;for(let i=0;i<a.length;i+=4)delta+=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
  return {mapped,delta:delta/(64*64*3)};
 });
 expect(values.mapped.some(x=>x.text.includes('گذر رو به جلو')&&x.colors.includes('rgb(0, 176, 80)'))).toBe(true);
 expect(values.mapped.some(x=>x.text.includes('گذر رو به عقب')&&x.colors.includes('rgb(255, 192, 0)'))).toBe(true);
 expect(values.mapped.some(x=>x.text.includes('برای مثال')&&x.colors.includes('rgb(4, 50, 255)'))).toBe(true);
 expect(values.mapped.every(x=>!x.overflow)).toBe(true);expect(values.delta).toBeLessThan(3);
 await page.locator('.reader-figure-labels summary').click();
 await expect(page.locator('.reader-figure-content')).toContainText('f');await expect(page.locator('.reader-figure-content .katex-mathml').first()).toBeAttached();
});

test('source derivative correction appears beside the untouched source slide',async({page})=>{
 await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=107');await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 await expect(page.locator('#source-canvas')).toBeVisible();
 const note=page.locator('#persian-page .reader-editorial');await expect(note).toBeVisible();
 await expect(note).toContainText('مشتق محلی');
 await expect(note.locator('.katex-mathml')).toHaveCount(4);
 const data=await page.evaluate(async()=>{const c=JSON.parse(document.querySelector('#source-reader-config').textContent);return (await(await fetch(c.translationUrl)).json()).pages[106]});
 expect(data.lines[10]).toContain('df/dc = 1');
 expect(data.editorial_notes).toHaveLength(1);
 const integrity=await page.evaluate(async record=>{
  const config=JSON.parse(document.querySelector('#source-reader-config').textContent),{sourceLayoutPlan}=await import('/deep-learning/assets/slide-content.js'),plan=sourceLayoutPlan(record,config);
  const translatedLines=plan.regions.flatMap(region=>region.lines.map(line=>line.index));
  const nodes=[...document.querySelectorAll('.reader-slide-text')];
  const sizes=nodes.map((node,index)=>({actual:parseFloat(node.style.fontSize),expected:plan.regions[index].font/plan.layout.width*960}));
  const stress=nodes.map(node=>{const probe=node.cloneNode(true);probe.style.visibility='hidden';probe.style.width=(node.clientWidth*.85)+'px';probe.style.lineHeight='1.25';node.parentElement.append(probe);const result={width:probe.clientWidth,scrollWidth:probe.scrollWidth,height:probe.clientHeight,scrollHeight:probe.scrollHeight};probe.remove();return result});
  return {translatedLines,stress,sizes};
 },data);
 for(const originalMathLine of [7,8,9,10,13])expect(integrity.translatedLines).not.toContain(originalMathLine);
 for(const size of integrity.sizes)expect(Math.abs(size.actual-size.expected)).toBeLessThan(.05);
 for(const node of integrity.stress){expect(node.scrollWidth).toBeLessThanOrEqual(node.width+2);expect(node.scrollHeight).toBeLessThanOrEqual(node.height+2);}
});

test('bias derivative correction is visible separately from the source slide',async({page})=>{
 await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=78');await ready(page);
 await expect(page.locator('#source-canvas')).toBeVisible();
 const note=page.locator('#persian-page .reader-editorial');await expect(note).toBeVisible();
 await expect(note).toContainText('برای بایاس');await expect(note.locator('.katex-mathml')).toHaveCount(2);
 const data=await page.evaluate(async()=>{const c=JSON.parse(document.querySelector('#source-reader-config').textContent);return (await(await fetch(c.translationUrl)).json()).pages[77]});
 expect(data.lines[40]).toBe('𝜕wi,6');expect(data.lines[45]).toContain('= 1');expect(data.editorial_notes).toHaveLength(1);
});
test('node-four gradient slide preserves source equations and the existing correction',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=82');await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const evidence=await page.evaluate(async()=>{
  const config=JSON.parse(document.querySelector('#source-reader-config').textContent),record=(await(await fetch(config.translationUrl)).json()).pages[81],{sourceLayoutPlan}=await import('/deep-learning/assets/slide-content.js'),plan=sourceLayoutPlan(record,config);
  const translatedLines=plan.regions.flatMap(region=>region.lines.map(line=>line.index)),mathLines=record.blocks.filter(block=>block.kind==='math').flatMap(block=>block.source_lines),annotation=plan.regions.find(region=>region.block.fa.startsWith('به‌طور مشابه'));
  const intersects=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
  const overlap=record.source_layout.lines.some(line=>mathLines.includes(line.index)&&intersects(annotation.slot,line.rect));
  const nodes=[...document.querySelectorAll('.reader-slide-text')],stress=nodes.map((node,index)=>{const probe=node.cloneNode(true);probe.style.visibility='hidden';probe.style.width=(node.clientWidth*(index===0?.90:.85))+'px';probe.style.lineHeight='1.25';node.parentElement.append(probe);const result={width:probe.clientWidth,scrollWidth:probe.scrollWidth,height:probe.clientHeight,scrollHeight:probe.scrollHeight,actual:parseFloat(node.style.fontSize),expected:plan.regions[index].font/plan.layout.width*960};probe.remove();return result});
  return {translatedLines,mathLines,overlap,stress,noteCount:record.editorial_notes?.length};
 });
 expect(evidence.noteCount).toBe(1);expect(evidence.overlap).toBe(false);
 for(const index of evidence.mathLines)expect(evidence.translatedLines).not.toContain(index);
 for(const node of evidence.stress){expect(Math.abs(node.actual-node.expected)).toBeLessThan(.05);expect(node.scrollWidth).toBeLessThanOrEqual(node.width+2);expect(node.scrollHeight).toBeLessThanOrEqual(node.height+2);}
 await expect(page.locator('.reader-editorial')).toContainText('∂o₆/∂z₆');
 await page.locator('.reader-figure-labels summary').click();await expect(page.locator('.reader-figure-content .katex-mathml').first()).toBeAttached();
});

test('backward-pass weight and bias slides keep formulas and correction separate',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 for(const number of [77,78,83,84]){
  await page.goto(`/deep-learning/terms/spring-2026/s03/slides/#page=${number}`);await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const evidence=await page.evaluate(async()=>{
   const config=JSON.parse(document.querySelector('#source-reader-config').textContent),record=(await(await fetch(config.translationUrl)).json()).pages[window.sourceSlideReader.page-1],{sourceLayoutPlan}=await import('/deep-learning/assets/slide-content.js'),plan=sourceLayoutPlan(record,config);
   const node=document.querySelector('.reader-slide-text'),titleLine=record.source_layout.lines.find(line=>line.index===0),probe=node.cloneNode(true);
   probe.style.visibility='hidden';probe.style.width=(node.clientWidth*.90)+'px';probe.style.lineHeight='1.25';node.parentElement.append(probe);
   const stress={width:probe.clientWidth,scrollWidth:probe.scrollWidth,height:probe.clientHeight,scrollHeight:probe.scrollHeight};probe.remove();
   const translatedLines=plan.regions.flatMap(region=>region.lines.map(line=>line.index)),mathLines=record.blocks.filter(block=>block.kind==='math').flatMap(block=>block.source_lines);
   const intersects=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1],collisions=plan.regions.flatMap(region=>record.source_layout.lines.filter(line=>!translatedLines.includes(line.index)&&intersects(region.slot,line.rect)).map(line=>line.index));
   const canvas=document.querySelector('.reader-slide-background'),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let purple=0;
   for(let i=0;i<pixels.length;i+=4)if(pixels[i]>55&&pixels[i+2]>75&&pixels[i+2]>pixels[i+1]*1.25&&pixels[i]>pixels[i+1]*1.25)purple++;
   return {actual:parseFloat(node.style.fontSize),expected:titleLine.font_size/record.source_layout.width*960,color:getComputedStyle(node).color,stress,translatedLines,mathLines,purple,collisions};
  });
  expect(Math.abs(evidence.actual-evidence.expected)).toBeLessThan(.05);expect(evidence.color).toBe('rgb(255, 255, 255)');
  expect(evidence.stress.scrollWidth).toBeLessThanOrEqual(evidence.stress.width+2);expect(evidence.stress.scrollHeight).toBeLessThanOrEqual(evidence.stress.height+2);
  expect(evidence.collisions).toEqual([]);
  for(const line of evidence.mathLines)expect(evidence.translatedLines).not.toContain(line);
  expect(evidence.purple).toBeGreaterThan(50);
  await page.locator('.reader-figure-labels summary').click();await expect(page.locator('.reader-figure-content .katex-mathml').first()).toBeAttached();
  if(number===78){const note=page.locator('.reader-editorial');await expect(note).toBeVisible();await expect(note).toContainText('برای بایاس');}
 }
});

test('standardization source correction is visible beside the unchanged slide',async({page})=>{
 await page.goto('/deep-learning/terms/spring-2026/s06/slides/#page=19');await ready(page);
 await expect(page.locator('#source-canvas')).toBeVisible();
 const note=page.locator('#persian-page .reader-editorial');await expect(note).toBeVisible();
 await expect(note).toContainText('[5,24]');await expect(note).toContainText('0.9');
 await expect(note.locator('.katex-mathml')).toHaveCount(1);
 const data=await page.evaluate(async()=>{const c=JSON.parse(document.querySelector('#source-reader-config').textContent);return (await(await fetch(c.translationUrl)).json()).pages[18]});
 expect(data.editorial_notes).toHaveLength(1);expect(data.editorial_notes[0].fa).toContain('2.9');
});

test('loss and backward-pass examples preserve source formulas and avoid graphic labels',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 for(const number of [73,74]){
  await page.goto(`/deep-learning/terms/spring-2026/s03/slides/#page=${number}`);await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const result=await page.evaluate(async()=>{
   const config=JSON.parse(document.querySelector('#source-reader-config').textContent),record=(await(await fetch(config.translationUrl)).json()).pages[window.sourceSlideReader.page-1],{sourceLayoutPlan}=await import('/deep-learning/assets/slide-content.js'),plan=sourceLayoutPlan(record,config);
   const owned=new Set(plan.regions.flatMap(region=>region.lines.map(line=>line.index))),intersects=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
   const collisions=plan.regions.flatMap(region=>record.source_layout.lines.filter(line=>!owned.has(line.index)&&intersects(region.slot,line.rect)).map(line=>line.index));
   const nodes=[...document.querySelectorAll('.reader-slide-text')],stress=nodes.map((node,index)=>{const probe=node.cloneNode(true);probe.style.visibility='hidden';probe.style.width=(node.clientWidth*(index===0?.90:.85))+'px';probe.style.lineHeight='1.25';node.parentElement.append(probe);const r={text:node.textContent,width:probe.clientWidth,scrollWidth:probe.scrollWidth,height:probe.clientHeight,scrollHeight:probe.scrollHeight,actual:parseFloat(node.style.fontSize),expected:plan.regions[index].font/plan.layout.width*960};probe.remove();return r});
   const mathLines=record.blocks.filter(block=>block.kind==='math').flatMap(block=>block.source_lines),accents=[...document.querySelectorAll('.reader-slide-text .reader-emphasis')].map(node=>({text:node.textContent,color:getComputedStyle(node).color}));
   return {collisions,mathLines,translated:[...owned],stress,accents,formulas:record.blocks.filter(block=>block.kind==='math').map(block=>block.latex)};
  });
  expect(result.collisions).toEqual([]);
  if(number===73){const occupied=await page.locator('#source-canvas').evaluate(canvas=>{const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let count=0;for(let y=.52;y<.58;y+=.001)for(let x=.60;x<.68;x+=.001){const i=(Math.floor(y*canvas.height)*canvas.width+Math.floor(x*canvas.width))*4;if(Math.max(pixels[i],pixels[i+1],pixels[i+2])>30)count++;}return count;});expect(occupied).toBe(0);}
  for(const line of result.mathLines)expect(result.translated).not.toContain(line);
  for(const node of result.stress){expect(Math.abs(node.actual-node.expected)).toBeLessThan(.05);expect(node.scrollWidth,`page ${number}: ${node.text}`).toBeLessThanOrEqual(node.width+2);expect(node.scrollHeight,`page ${number}: ${node.text}`).toBeLessThanOrEqual(node.height+2);}
  if(number===73){expect(result.formulas).toContain('(1-0.474)^2=0.277');for(const term of ['افزایش','کاهش'])expect(result.accents).toContainEqual({text:term,color:'rgb(255, 192, 0)'});}
  if(number===74){expect(result.formulas).toContain('z_j=\\sum_{i=1}^n w_{ij}x_i+b_j');expect(result.formulas).toContain('o_j=\\frac1{1+e^{-z}}');}
  await page.locator('.reader-figure-labels summary').click();await expect(page.locator('.reader-figure-content .katex-mathml').first()).toBeAttached();
 }
});

test('backward-pass example is readable in the mobile slide view',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=74');await ready(page);
 await page.locator('[data-view-translation]').click();await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');await expect(page.locator('.reader-slide-background')).toBeVisible();
 await expect(page.locator('.reader-slide-text').filter({hasText:'تابع فعال‌سازی'})).toBeVisible();
});

test('session 1 title keeps its centered source structure and readable bilingual credit', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=1'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout', 'source-canvas');
 const regions = page.locator('#persian-page .reader-slide-text');
 await expect(regions).toHaveCount(4);
 await expect(regions.nth(0)).toContainText('Neural Networks and Deep Learning');
 await expect(regions.nth(1)).toContainText('Danna Gurari');
 await expect(regions.nth(2)).toContainText('University of Colorado Boulder');
 await expect(regions.nth(3)).toContainText('2026');
 expect(await regions.evaluateAll(nodes => nodes.every(node => getComputedStyle(node).textAlign === 'center' && node.scrollHeight <= node.clientHeight + 2 && node.scrollWidth <= node.clientWidth + 2))).toBeTruthy();
});

test('session 1 opening topics and motivation retain source colors', async ({page}) => {
 const s01='/deep-learning/terms/spring-2026/s01/slides/';
 for (const number of [2,3,27]) {
  await page.goto(s01+'#page='+number); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text'); await expect(regions).toHaveCount(5);
  for(let i=1;i<=4;i++) await expect(regions.nth(i)).toHaveCSS('color',((number===3&&i>1)||(number===27&&i!==2))?'rgb(127, 127, 127)':'rgb(255, 255, 255)');
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
 }
 await page.goto(s01+'#page=4'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const regions=page.locator('#persian-page .reader-slide-text');await expect(regions).toHaveCount(4);
 await expect(regions.nth(2)).toHaveCSS('color','rgb(255, 192, 0)');
 await expect(regions.nth(3).locator('span')).toHaveCSS('color','rgb(255, 255, 255)');
 expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 meeting summary slide keeps the source image beneath the title', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=13'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 await expect(page.locator('#persian-page .reader-slide-background')).toBeVisible();
 const title=page.locator('#persian-page .reader-slide-text');
 await expect(title).toContainText('Zoom');
 expect(await title.evaluate(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2)).toBeTruthy();
});

test('session 1 image titles fit without covering their figures', async ({page}) => {
 for (const number of [14,19]) {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page='+number); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
  const title=page.locator('#persian-page .reader-slide-text:not(.reader-image-translation)');
  expect(await title.evaluate(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2)).toBeTruthy();
  await expect(page.locator('#persian-page .reader-slide-background')).toBeVisible();
 }
});

test('session 1 personal assistants show translated image text in place', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=5'); await ready(page);
 const translated=page.locator('#persian-page .reader-image-translation');
 await expect(translated).toHaveCount(4);
 await expect(translated.nth(0)).toContainText('دستیار هوش مصنوعی شخصی');
 await expect(translated.nth(1)).toContainText('اطلاعات مکان شما');
 await expect(translated.nth(2)).toContainText('Gemini');
 await expect(translated.nth(3)).toContainText('Copilot');
 expect(await translated.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
 await page.setViewportSize({width:390,height:844});
 await expect(translated).toHaveCount(4);
 expect(await translated.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 Gamma example preserves its figure and translated outline', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=22'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 await expect(page.locator('#persian-page .reader-slide-background')).toBeVisible();
 const regions=page.locator('#persian-page .reader-slide-text'); await expect(regions).toHaveCount(7);
 await expect(regions.nth(1)).toContainText('مبانی شبکه‌های عصبی');
 await expect(regions.nth(6)).toContainText('نتیجهٔ پرامپت');
 expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 video examples keep their two figures and readable captions', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=21'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const regions=page.locator('#persian-page .reader-slide-text'); await expect(regions).toHaveCount(5);
 await expect(regions.nth(1)).toHaveCSS('color','rgb(255, 192, 0)');
 await expect(regions.nth(2)).toHaveCSS('color','rgb(255, 255, 255)');
 await expect(regions.nth(3)).toHaveCSS('color','rgb(255, 192, 0)');
 await expect(regions.nth(4)).toHaveCSS('color','rgb(255, 255, 255)');
 expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 podcast slide keeps the source picture and structured prompt', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=24'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const regions=page.locator('#persian-page .reader-slide-text'); await expect(regions).toHaveCount(6);
 await expect(regions.nth(1).locator('span')).toHaveCSS('color','rgb(255, 192, 0)');
 await expect(regions.nth(4)).toContainText('ماشین چگونه یاد می‌گیرد');
 expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 neural-network motivation keeps the four emphasized statements', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=26'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const regions=page.locator('#persian-page .reader-slide-text'); await expect(regions).toHaveCount(4);
 for(let i=0;i<4;i++) await expect(regions.nth(i).locator('span')).toHaveCSS('color','rgb(255, 192, 0)');
 expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 computer history keeps both photos and original timeline', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=28'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const regions=page.locator('#persian-page .reader-slide-text'); await expect(regions).toHaveCount(4);
 await expect(regions.nth(1)).toHaveCSS('color','rgb(255, 192, 0)');
 await expect(regions.nth(2)).toContainText('5,000');
 await expect(regions.nth(3)).toContainText('برنامه‌نویسان');
 expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 Turing test history preserves the timeline and both illustrations', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=29'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 const regions=page.locator('#persian-page .reader-slide-text'); await expect(regions).toHaveCount(5);
 await expect(regions.nth(1)).toHaveCSS('color','rgb(255, 192, 0)');
 await expect(regions.nth(3)).toContainText('پاسخ‌های متنی');
 await expect(regions.nth(4)).toContainText('Alan Turing');
 expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 AI origins retain the plaque and separate timeline labels', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=30'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const regions=page.locator('#persian-page .reader-slide-text'); await expect(regions).toHaveCount(5);
 await expect(regions.filter({hasText:'تولد هوش مصنوعی'})).toHaveCSS('color','rgb(255, 192, 0)');
 await expect(regions.filter({hasText:'نخستین ماشین'})).toHaveCSS('color','rgb(255, 255, 255)');
 expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 Dartmouth proposal keeps the complete quotation and source frame', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=31'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const regions=page.locator('#persian-page .reader-slide-text'); await expect(regions).toHaveCount(6);
 const quote=regions.filter({hasText:'پیشنهاد کارگاه:'});
 await expect(quote).toContainText('کالج دارتموث');
 await expect(quote).toContainText('پیشرفتی چشمگیر');
 expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 human intelligence question retains its timeline and senses image', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=32'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const regions=page.locator('#persian-page .reader-slide-text'); await expect(regions).toHaveCount(5);
 await expect(regions.filter({hasText:'کدام هوش انسانی'})).toBeVisible();
 await expect(regions.filter({hasText:'تولد هوش مصنوعی'})).toHaveCSS('color','rgb(255, 192, 0)');
 expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 learning origins preserves definition and diagram', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=33'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const regions=page.locator('#persian-page .reader-slide-text');
 await expect(regions).toHaveCount(8);
 await expect(regions.filter({hasText:'آرتور ساموئل'})).toBeVisible();
 await expect(regions.filter({hasText:'توانایی یادگیری'})).toBeVisible();
 expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 writing assistant keeps image with translated text in place', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=7'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 const overlay=page.locator('#persian-page .reader-image-translation');
 await expect(overlay).toHaveCount(4);
 await expect(overlay.nth(0)).toContainText('هوش مصنوعی');
 await expect(overlay.nth(1)).toContainText('بدون قضاوت');
 await expect(overlay.nth(2)).toContainText('رایگان');
 expect(await overlay.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 legal research slide keeps the figure and Persian description', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=8'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 const overlay=page.locator('#persian-page .reader-image-translation');
 await expect(overlay).toHaveCount(3);
 await expect(overlay.nth(1)).toContainText('پژوهش حقوقی');
 await expect(overlay.nth(2)).toContainText('قوانین ایالتی');
 expect(await overlay.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 developer assistant preserves and translates the prompt', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=9'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 const overlay=page.locator('#persian-page .reader-image-translation');
 await expect(overlay).toHaveCount(4);
 await expect(overlay.nth(0)).toContainText('ایده‌هایتان');
 await expect(overlay.nth(2)).toContainText('علاقه‌مندان تاریخ');
 expect(await overlay.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 tutor screenshot retains translated headline and explanation', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=11'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 const overlay=page.locator('#persian-page .reader-image-translation');
 await expect(overlay).toHaveCount(4);
 await expect(overlay.nth(0)).toContainText('۳۰ روز');
 await expect(overlay.nth(3)).toContainText('توضیح گام‌به‌گام');
 expect(await overlay.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 clinical documentation screenshot retains its example', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=14'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 const overlay=page.locator('#persian-page .reader-image-translation');
 await expect(overlay).toHaveCount(4);
 await expect(overlay.nth(0)).toContainText('مستندسازی بالینی');
 await expect(overlay.nth(1)).toContainText('DeepScribe');
 expect(await overlay.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 appearance editor translates screenshot while keeping poster grid', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=16'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 const overlay=page.locator('#persian-page .reader-image-translation');
 await expect(overlay).toHaveCount(3);
 await expect(overlay.nth(1)).toContainText('جلوه‌های بصری هالیوود');
 await expect(overlay.nth(2)).toContainText('300 برابر');
 expect(await overlay.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 accent example preserves image and translates the visible claim', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=17'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 const overlay=page.locator('#persian-page .reader-image-translation');
 await expect(overlay).toHaveCount(4);
 await expect(overlay.nth(0)).toContainText('لهجه');
 await expect(overlay.nth(1)).toContainText('CSAT');
 expect(await overlay.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 companion slide translates quote and keeps attribution', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=19'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 const overlay=page.locator('#persian-page .reader-image-translation');
 await expect(overlay).toHaveCount(4);
 await expect(overlay.nth(0)).toContainText('Replika');
 await expect(overlay.nth(2)).toContainText('خلق‌وخو');
 await expect(overlay.nth(3)).toContainText('Denise Valenciano');
 expect(await overlay.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 coloring example translates headline and keeps source figures', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=20'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 const overlay=page.locator('#persian-page .reader-image-translation');
 await expect(overlay).toHaveCount(1);
 await expect(overlay.first()).toContainText('صفحه رنگ‌آمیزی');
 expect(await overlay.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 coding assistant translates headline without covering code', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=6'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 const overlay=page.locator('#persian-page .reader-image-translation');
 await expect(overlay).toHaveCount(2);
 await expect(overlay.nth(0)).toContainText('توسعه‌دهندگان');
 await expect(overlay.nth(1)).toContainText('Copilot');
 expect(await overlay.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 medical assistant image retains interface and translated labels', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=10'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 const overlay=page.locator('#persian-page .reader-image-translation');
 await expect(overlay).toHaveCount(2);
 await expect(overlay.nth(0)).toContainText('پرسش پزشکی');
 await expect(overlay.nth(1)).toContainText('اطلاعات پزشکی');
 expect(await overlay.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 hand-written rules restores the flowchart and its Persian labels', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=34'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 const overlay=page.locator('#persian-page .reader-image-translation');
 await expect(overlay).toHaveCount(5);
 await expect(overlay.nth(0)).toContainText('مطالعه مسئله');
 await expect(overlay.nth(2)).toContainText('ارزیابی');
 await expect(overlay.nth(3)).toContainText('تحلیل خطاها');
 expect(await overlay.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 perception examples preserve the source images and questions', async ({page}) => {
 for(const number of [35,36,37]){
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page='+number); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text'); await expect(regions).toHaveCount(2);
  if(number===35)await expect(regions.nth(1)).toContainText('شخصی در تصویر');
  else {await expect(regions.nth(1)).toContainText('خط‌های افقی');await expect(regions.nth(1)).toHaveCSS('color','rgb(255, 192, 0)');}
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
 }
});

test('session 1 limits of manual rules preserve separated points', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=38'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const regions=page.locator('#persian-page .reader-slide-text'); await expect(regions).toHaveCount(3);
 await expect(regions.nth(1)).toContainText('مجموعه‌ای کامل');
 await expect(regions.nth(2)).toContainText('ناخودآگاه');
 expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 data selection keeps each translated label under its example', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=39'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const regions=page.locator('#persian-page .reader-slide-text'); await expect(regions).toHaveCount(8);
 await expect(regions.nth(1).locator('span')).toHaveCSS('color','rgb(255, 192, 0)');
 const labels=await regions.evaluateAll(nodes=>nodes.slice(4).map(node=>node.textContent));
 expect(labels).toEqual(['مودار','مودار','بی‌مو','مودار']);
 expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 training and test split retains labeled examples and colors', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=40'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const regions=page.locator('#persian-page .reader-slide-text'); await expect(regions).toHaveCount(10);
 await expect(regions.filter({hasText:'داده آموزش'})).toHaveCSS('color','rgb(255, 0, 0)');
 await expect(regions.filter({hasText:'داده آزمون'})).toHaveCSS('color','rgb(0, 253, 255)');
 const labels=await regions.evaluateAll(nodes=>nodes.map(node=>node.textContent).filter(text=>text==='مودار'||text==='بی‌مو'));
 expect(labels).toEqual(['مودار','مودار','بی‌مو','مودار']);
 expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 training and generalization examples retain their source diagrams', async ({page}) => {
 for(const number of [41,42,43]){
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page='+number); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:number===41?'داده آموزش':'داده آزمون'})).toBeVisible();
  await expect(regions.filter({hasText:number===41?'خطای پیش‌بینی':'خطای تعمیم'}).locator('span')).toHaveCSS('color','rgb(255, 192, 0)');
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
 }
});

test('session 1 1986 origins restores the nested networks diagram', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=44'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const regions=page.locator('#persian-page .reader-slide-text');
 await expect(regions.filter({hasText:'راهبرد یادگیری'})).toHaveCSS('color','rgb(255, 192, 0)');
 await expect(regions.filter({hasText:'Neural Networks'})).toBeVisible();
 await expect(regions.filter({hasText:'Artificial Intelligence'})).toBeVisible();
 expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 hand-crafted feature diagram retains separated Persian labels', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=45'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const regions=page.locator('#persian-page .reader-slide-text');
 await expect(regions.filter({hasText:'Feature Extraction'})).toBeVisible();
 await expect(regions.filter({hasText:'Prediction'})).toBeVisible();
 await expect(regions.filter({hasText:'ویژگی‌های دست‌ساز'})).toBeVisible();
 expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 feature engineering limitation keeps source diagram and emphasis', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=46'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const regions=page.locator('#persian-page .reader-slide-text');
 await expect(regions.filter({hasText:'Feature Extraction'})).toBeVisible();
 await expect(regions.filter({hasText:'ویژگی‌های دست‌ساز'})).toBeVisible();
 await expect(regions.filter({hasText:'چالش‌برانگیز'})).toHaveCSS('color','rgb(255, 192, 0)');
 expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 representation-learning diagram retains both paths and scope', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=47'); await ready(page);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const regions=page.locator('#persian-page .reader-slide-text');
 await expect(regions.filter({hasText:'Representation Learning'})).toBeVisible();
 await expect(regions.filter({hasText:'محدوده درس'})).toHaveCSS('color','rgb(255, 192, 0)');
 await expect(regions.filter({hasText:'Feature Extraction'})).toHaveCount(2);
 expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 neural network timeline retains its graph and translated labels', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=48'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'موج ۳'})).toHaveCSS('color','rgb(255, 192, 0)');
  await expect(regions.filter({hasText:'آزمون تورینگ'})).toBeVisible();
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 popularity question fits the source slide', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=49'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const text=page.locator('#persian-page .reader-slide-text');
  await expect(text).toContainText('Deep Learning');
  expect(await text.evaluate(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2)).toBeTruthy();
});

test('session 1 agenda highlights the current topic', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=50'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'ماشین چگونه یاد می‌گیرد'})).toHaveCSS('color','rgb(255, 255, 255)');
  await expect(regions.filter({hasText:'کاربردها'})).toHaveCSS('color','rgb(127, 127, 127)');
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 neural network ingredients retain the image and colored terms', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=51'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'داستان عاشقانه'})).toBeVisible();
  await expect(regions.filter({hasText:'پردازنده'})).toBeVisible();
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 architecture emphasis follows the next source slide', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=52'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'پردازنده'})).toBeVisible();
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 model design exercise preserves the class prompts', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=53'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'سهمی'})).toHaveCSS('color','rgb(255, 64, 255)');
  await expect(regions.filter({hasText:'منحنی دلخواه'})).toHaveCSS('color','rgb(255, 255, 0)');
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 architecture scope preserves its timeline', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=54'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'پیشرفت انباشتی'})).toBeVisible();
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 data emphasis retains the original illustration', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=55'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'داستان عاشقانه'})).toBeVisible();
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 audio example keeps its waveform and topic highlight', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=56'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'صوت'})).toHaveCSS('color','rgb(255, 192, 0)');
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 image example keeps both input prompts and pixel diagram', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=57'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'تصویر'})).toHaveCSS('color','rgb(255, 192, 0)');
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 video data example retains temporal diagrams', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=58'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'ویدیو'})).toHaveCSS('color','rgb(255, 192, 0)');
  await expect(regions.filter({hasText:'۱ ساعت'})).toBeVisible();
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 text input example preserves its reference image', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=59'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'متن (Text)'})).toHaveCSS('color','rgb(255, 192, 0)');
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 multimodal overview keeps all data types and images', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=60'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'چندوجهی'})).toBeVisible();
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 dataset sources retain the complete nested list', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=61'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'Opendatamonitor.eu'})).toBeVisible();
  await expect(regions.filter({hasText:'Google Dataset Search'})).toBeVisible();
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 processor emphasis retains the original illustration', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=62'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'پردازنده'})).toBeVisible();
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 GPU comparison retains its three illustrations', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=63'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'GPU'})).toHaveCSS('color','rgb(255, 192, 0)');
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 summary preserves the image and key ingredients', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=64'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'جمع‌بندی'})).toBeVisible();
  await expect(regions.filter({hasText:'پردازنده'})).toBeVisible();
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 challenge retains its source images and quotation', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=65'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'کسی پلک زد'})).toBeVisible();
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 agenda highlights course logistics', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=66'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'امور اجرایی درس'})).toHaveCSS('color','rgb(255, 255, 255)');
  await expect(regions.filter({hasText:'ماشین چگونه'})).toHaveCSS('color','rgb(127, 127, 127)');
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 course resources keep the source screenshot and callouts', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=67'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'سرفصل درس'})).toHaveCSS('color','rgb(255, 192, 0)');
  await expect(regions.filter({hasText:'ضبط سخنرانی‌ها'})).toBeVisible();
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 first objective preserves source emphasis and hierarchy', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=68'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'شناخت و تحلیل'})).toHaveCSS('color','rgb(255, 192, 0)');
  await expect(regions.filter({hasText:'Transformer'})).toBeVisible();
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 second objective restores source canvas and training topics', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=69'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'LoRA'})).toBeVisible();
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 third objective restores practical learning hierarchy', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=70'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'PyTorch'})).toBeVisible();
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 fourth objective preserves responsible AI emphasis', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=71'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'Responsible AI'})).toBeVisible();
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 fifth objective preserves project activities', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=72'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'بازخورد سازنده'})).toBeVisible();
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 course schedule retains all four source columns', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=73'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text');
  for(const label of ['نورون‌های مصنوعی','نزول گرادیان','ترنسفورمرها','دیدگاه‌های صنعت']) await expect(regions.filter({hasText:label})).toBeVisible();
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 course comparison keeps source hierarchy and emphasis', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=74'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'Reinforcement Learning'})).toBeVisible();
  await expect(regions.filter({hasText:'مبانی'})).toBeVisible();
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 prerequisites retain the source slide hierarchy', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=75'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'برنامه‌نویسی'})).toBeVisible();
  await expect(regions.filter({hasText:'Machine Learning'})).toBeVisible();
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 textbooks retain covers and separate availability notes', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=76'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'VPN'})).toBeVisible();
  await expect(regions.filter({hasText:'به رایگان'})).toHaveCount(2);
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 assignments retain nested project items and reading emphasis', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=77'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'گزارش نهایی'})).toBeVisible();
  await expect(regions.filter({hasText:'مطالب خواندنی'})).toHaveCSS('color','rgb(255, 192, 0)');
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 grading table shows Persian row labels on source table', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=78'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'تکلیف‌های آزمایشگاهی'})).toBeVisible();
  await expect(regions.filter({hasText:'پروژه نهایی'})).toBeVisible();
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 grading policies retain source emphasis and numerical details', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=79'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'48 ساعت'})).toBeVisible();
  await expect(regions.filter({hasText:'بازبینی نمره'})).toBeVisible();
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('session 1 grading table exposes exact semantic values', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=78'); await ready(page);
  const table=page.locator('#persian-page table');
  await expect(table).toBeVisible();
  await expect(table.locator('tbody tr')).toHaveCount(3);
  await expect(table.locator('tbody tr').nth(0)).toContainText('25%');
  await expect(table.locator('tbody tr').nth(1)).toContainText('45%');
  await expect(table.locator('tbody tr').nth(2)).toContainText('30%');
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
});

test('session 1 experience timeline preserves the four eras and source images', async ({page}) => {
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=83'); await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const regions=page.locator('#persian-page .reader-slide-text');
  await expect(regions.filter({hasText:'دانشجوی دکتری'})).toBeVisible();
  await expect(regions.filter({hasText:'پژوهشگر پسادکتری'})).toBeVisible();
  await expect(regions.filter({hasText:'استادیار'})).toBeVisible();
  expect(await regions.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2&&node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

test('overflow retry preserves source obstacles and does not mutate the original plan',async({page})=>{
 await page.goto(deck+'#page=2');await ready(page);
 const result=await page.evaluate(async()=>{
  const {expandSourceLayout}=await import('/deep-learning/assets/slide-content.js');
  const block={source_lines:[0],fa:'نمونه'},region={block,slot:[.5,.2,.7,.3]};
  const plan={reason:null,regions:[region],layout:{images:[{rect:[.32,.2,.4,.3]}],graphics:[],lines:[]},imageTranslations:[]};
  const expanded=expandSourceLayout(plan);
  return {original:region.slot,slot:expanded.regions[0].slot};
 });
 expect(result.original).toEqual([.5,.2,.7,.3]);
 expect(result.slot[0]).toBeGreaterThanOrEqual(.404);
 expect(result.slot[0]).toBeLessThan(.5);
});

test('overflow retry retains the source slide on representative pages',async({page},testInfo)=>{
 await page.setViewportSize({width:390,height:844});
 for(const [session,number] of [['s03',15],['s09',1]]){
  await page.goto(`/deep-learning/terms/spring-2026/${session}/slides/#page=${number}`);await ready(page);
  await page.locator('[data-view-translation]').click();
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout',/^source-canvas/);
  const overflow=await page.locator('#persian-page .reader-slide-text').evaluateAll(nodes=>nodes.some(node=>node.scrollWidth>node.clientWidth+2||node.scrollHeight>node.clientHeight+2));
  expect(overflow).toBeFalsy();
  await testInfo.attach(`${session}-${number}-mobile`,{body:await page.screenshot(),contentType:'image/png'});
 }
});
