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
 for(const number of [77,78]){
  await page.goto(`/deep-learning/terms/spring-2026/s03/slides/#page=${number}`);await ready(page);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const evidence=await page.evaluate(async()=>{
   const config=JSON.parse(document.querySelector('#source-reader-config').textContent),record=(await(await fetch(config.translationUrl)).json()).pages[window.sourceSlideReader.page-1],{sourceLayoutPlan}=await import('/deep-learning/assets/slide-content.js'),plan=sourceLayoutPlan(record,config);
   const node=document.querySelector('.reader-slide-text'),titleLine=record.source_layout.lines.find(line=>line.index===0),probe=node.cloneNode(true);
   probe.style.visibility='hidden';probe.style.width=(node.clientWidth*.90)+'px';probe.style.lineHeight='1.25';node.parentElement.append(probe);
   const stress={width:probe.clientWidth,scrollWidth:probe.scrollWidth,height:probe.clientHeight,scrollHeight:probe.scrollHeight};probe.remove();
   const translatedLines=plan.regions.flatMap(region=>region.lines.map(line=>line.index)),mathLines=record.blocks.filter(block=>block.kind==='math').flatMap(block=>block.source_lines);
   const canvas=document.querySelector('.reader-slide-background'),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let purple=0;
   for(let i=0;i<pixels.length;i+=4)if(pixels[i]>55&&pixels[i+2]>75&&pixels[i+2]>pixels[i+1]*1.25&&pixels[i]>pixels[i+1]*1.25)purple++;
   return {actual:parseFloat(node.style.fontSize),expected:titleLine.font_size/record.source_layout.width*960,color:getComputedStyle(node).color,stress,translatedLines,mathLines,purple};
  });
  expect(Math.abs(evidence.actual-evidence.expected)).toBeLessThan(.05);expect(evidence.color).toBe('rgb(255, 255, 255)');
  expect(evidence.stress.scrollWidth).toBeLessThanOrEqual(evidence.stress.width+2);expect(evidence.stress.scrollHeight).toBeLessThanOrEqual(evidence.stress.height+2);
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
   const nodes=[...document.querySelectorAll('.reader-slide-text')],stress=nodes.map((node,index)=>{const probe=node.cloneNode(true);probe.style.visibility='hidden';probe.style.width=(node.clientWidth*(index===0?.90:.85))+'px';probe.style.lineHeight='1.25';node.parentElement.append(probe);const r={width:probe.clientWidth,scrollWidth:probe.scrollWidth,height:probe.clientHeight,scrollHeight:probe.scrollHeight,actual:parseFloat(node.style.fontSize),expected:plan.regions[index].font/plan.layout.width*960};probe.remove();return r});
   const mathLines=record.blocks.filter(block=>block.kind==='math').flatMap(block=>block.source_lines),accents=[...document.querySelectorAll('.reader-slide-text .reader-emphasis')].map(node=>({text:node.textContent,color:getComputedStyle(node).color}));
   return {collisions,mathLines,translated:[...owned],stress,accents,formulas:record.blocks.filter(block=>block.kind==='math').map(block=>block.latex)};
  });
  expect(result.collisions).toEqual([]);
  for(const line of result.mathLines)expect(result.translated).not.toContain(line);
  for(const node of result.stress){expect(Math.abs(node.actual-node.expected)).toBeLessThan(.05);expect(node.scrollWidth).toBeLessThanOrEqual(node.width+2);expect(node.scrollHeight).toBeLessThanOrEqual(node.height+2);}
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
