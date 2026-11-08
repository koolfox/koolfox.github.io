import {setupFullscreen} from './reader-fullscreen.js';
import {getDocument,GlobalWorkerOptions,OPS} from './vendor/pdfjs/pdf.min.mjs';
import {readPdf} from './slide-offline-cache.js';
import {addText, math, renderBlocks, renderTable, configureReferences, referenceTarget, sourceLayoutPlan, createSourceLayout, fitSourceLayout} from './slide-content.js';

const $=s=>document.querySelector(s),config=JSON.parse($('#source-reader-config').textContent);
const canvas=$('#source-canvas'),links=$('#source-links'),persian=$('#persian-page'),status=$('[data-reader-status]');
const picker=$('[data-page-select]'),progress=$('[data-pdf-progress]');
GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.min.mjs',import.meta.url).href;
let pdf=null,canonicalPdf=null,payload=null,page=1,renderedPage=0,zoom=1,serial=0,task=null,closed=false,lastWidth=720,references=false;
let presenting=false,view=matchMedia('(max-width:760px)').matches?'source':'both',readingView=view;
let playing=false,playSequence=null,playTimer=null,layoutTask=null,customTool=false,translationFallback=[];
const fa=n=>new Intl.NumberFormat('fa-IR',{useGrouping:false}).format(n);
const clamp=n=>Math.max(1,Math.min(config.pageCount,n));
function fromHash(){const match=location.hash.match(/^#page=(\d+)$/);return match?clamp(Number(match[1])):1;}
page=fromHash();
function element(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;}
function message(text,error=false){status.textContent=text;status.dataset.error=String(error);}
function stopPlayback(){playing=false;clearTimeout(playTimer);playTimer=null;controls();}
function schedulePlayback(){
 clearTimeout(playTimer);if(!playing)return;
 const next=playSequence?.[playSequence.indexOf(page)+1];
 if(!next){stopPlayback();return;}
 playTimer=setTimeout(()=>go(next,true,true),2400);
}
function visibleEnglish(record){
 const lines=[];
 for(const block of record.blocks){
  if(block.kind==='not_visible')continue;
  lines.push(block.visible_en??block.source_lines.map(i=>record.lines[i]).join('\n'));
 }
 for(const item of record.image_text||[])if(item.en)lines.push(item.en);
 return lines.join('\n');
}
function renderTranslation(){
 if(!payload)return;
 const record=payload.pages[page-1],fragment=document.createDocumentFragment();
 renderBlocks(fragment,record.blocks,record.tables);
 if(record.image_text?.length){
  const section=element('section','reader-image-labels');section.setAttribute('aria-label','ترجمهٔ نوشته‌ها و برچسب‌های تصویر');
  const imageTables=(record.tables||[]).filter(table=>table.image_text_indices?.length);
  const tableAt=new Map(imageTables.map(table=>[table.image_text_indices[0],table]));
  const tableLabels=new Set(imageTables.flatMap(table=>table.image_text_indices));
  for(const [index,item] of record.image_text.entries()){
   if(tableAt.has(index)){renderTable(section,tableAt.get(index));continue;}
   if(tableLabels.has(index))continue;
   if(item.latex){math(section,item);continue;}
   const p=element('p','reader-image-text');addText(p,item.fa);section.append(p);
  }
  fragment.append(section);
 }
 for(const correction of record.editorial_notes||[]){
  const aside=element('aside','reader-limits reader-editorial');
  aside.append(element('h3','','اصلاح'));
  const text=element('p');addText(text,correction.fa);aside.append(text);
  for(const reference of correction.references||[]){const url=safeExternal(reference.url);if(!url)continue;const a=element('a','reader-reference',reference.label_fa);a.href=url;a.target='_blank';a.rel='noopener noreferrer';const p=element('p');p.append(a);aside.append(p);}
  fragment.append(aside);
 }
 persian.replaceChildren(fragment);translationFallback=[...persian.childNodes];persian.dataset.page=String(page);$('[data-source-text]').textContent=visibleEnglish(record);
 document.querySelector('.reader-translation').scrollTop=0;
}
// Use source typography only when native text and a solid background are measurable.
function styleTranslationFallback(record){
 const layout=record.source_layout;if(!layout||!canvas.width||!canvas.height)return;
 const context=canvas.getContext('2d'), pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
 const sourceWidth=document.querySelector('.reader-original').clientWidth
  ? parseFloat(canvas.style.width) : Math.max(250,document.querySelector('.reader-translation').clientWidth-24)*zoom;
 const byIndex=new Map(layout.lines.map(line=>[line.index,line]));
 const luminance=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 const backgrounds=lines=>{
  const samples=[];
  for(const line of lines){const [l,t,r,b]=line.rect;
   for(let y=0;y<7;y++)for(let x=0;x<15;x++){
    const px=Math.min(canvas.width-1,Math.max(0,Math.floor((l+(r-l)*(x+.5)/15)*canvas.width)));
    const py=Math.min(canvas.height-1,Math.max(0,Math.floor((t+(b-t)*(y+.5)/7)*canvas.height)));
    const offset=(py*canvas.width+px)*4;samples.push([pixels[offset],pixels[offset+1],pixels[offset+2]]);
   }
  }
  const bins=new Map();for(const rgb of samples){const key=rgb.map(v=>v>>4).join(',');const entry=bins.get(key)||[];entry.push(rgb);bins.set(key,entry);}
  const dominant=[...bins.values()].sort((a,b)=>b.length-a.length)[0];
  if(!dominant||dominant.length/samples.length<.72)return null;
  const rgb=[0,1,2].map(channel=>dominant.map(value=>value[channel]).sort((a,b)=>a-b)[Math.floor(dominant.length/2)]);
  return rgb;
 };
 for(const root of translationFallback){if(root.nodeType!==1)continue;
  const nodes=[...(root.matches('[data-source-lines]')?[root]:[]),...root.querySelectorAll('[data-source-lines]')];
  for(const node of nodes){
   delete node.dataset.sourceFallback;node.style.removeProperty('--source-fallback-color');node.style.removeProperty('--source-fallback-background');node.style.removeProperty('--source-fallback-size');
   const indices=node.dataset.sourceLines.split(',').filter(Boolean).map(Number),lines=indices.map(index=>byIndex.get(index));
   if(!lines.length||lines.some(line=>!line||!/^#[0-9a-f]{6}$/i.test(line.color||'')||(line.accents||[]).length))continue;
   const first=lines[0];if(lines.some(line=>line.color!==first.color||Math.abs(line.font_size-first.font_size)>.2))continue;
   const measuredSize=first.font_size/layout.width*sourceWidth;if(measuredSize<12)continue;
   const background=backgrounds(lines);if(!background)continue;
   const foreground=first.color.slice(1).match(/../g).map(value=>parseInt(value,16));
   const lum=[luminance(foreground),luminance(background)].sort((a,b)=>a-b);
   if((lum[1]+.05)/(lum[0]+.05)<4.5)continue;
   node.style.setProperty('--source-fallback-color',first.color);
   node.style.setProperty('--source-fallback-background',`rgb(${background.join(' ')})`);
   node.style.setProperty('--source-fallback-size',`${measuredSize}px`);
   node.dataset.sourceFallback='measured';
  }
 }
}
async function paintPersianLayout(source,canonicalSource,id,selected){
 const record=payload.pages[selected-1],plan=sourceLayoutPlan(record,config);
 persian.dataset.layout=plan.reason||'pending';
 if(plan.reason){persian.replaceChildren(...translationFallback);paintSourceCrops();return;}
 const fallback=translationFallback,slide=createSourceLayout(record,plan);
 const tableState=[...persian.querySelectorAll('.reader-table-viewport')].map(node=>({left:node.scrollLeft,top:node.scrollTop,focused:document.activeElement===node}));
 const previousCompanion=persian.querySelector('.reader-figure-labels');
 if(previousCompanion&&slide.companion)slide.companion.open=previousCompanion.open;
 function install(...nodes){
  persian.replaceChildren(...nodes);
  persian.querySelectorAll('.reader-table-viewport').forEach((node,index)=>{const state=tableState[index];if(!state)return;if(state.focused)node.focus({preventScroll:true});node.scrollLeft=state.left;node.scrollTop=state.top;});
 }
 install(slide.holder,...(slide.companion?[slide.companion]:[]),...fallback.filter(node=>node.nodeType===1&&node.matches('.reader-editorial')));
 const available=Math.max(280,document.querySelector('.reader-translation').clientWidth-32)*zoom;
 const scale=available/slide.width;
 slide.holder.style.width=available+'px';slide.holder.style.height=slide.height*scale+'px';
 slide.stage.style.transform=`scale(${scale})`;
 await document.fonts.ready;
 if(id!==serial||page!==selected)return;
 if(!fitSourceLayout(slide.stage)){install(...fallback);paintSourceCrops();persian.dataset.layout='text-overflow';return;}
 const measured=document.createElement('canvas'),measureViewport=source.getViewport({scale:slide.width/source.getViewport({scale:1}).width});
 measured.width=Math.ceil(measureViewport.width);measured.height=Math.ceil(measureViewport.height);
 const measurement=source.render({canvasContext:measured.getContext('2d'),viewport:measureViewport,recordOperations:true});layoutTask=measurement;
 try{await measurement.promise;}finally{if(layoutTask===measurement)layoutTask=null;}
 if(id!==serial||page!==selected)return;
 const list=await source.getOperatorList(),boxes=source.recordedBBoxes;
 if(id!==serial||page!==selected)return;
 const textOps=new Set([OPS.showText,OPS.showSpacedText,OPS.nextLineShowText,OPS.nextLineSetSpacingShowText]);
 const targets=plan.regions.flatMap(region=>region.lines.map(line=>({line,block:region.block}))),selectedOps=new Set(),covered=new Set();
 for(let index=0;index<list.fnArray.length;index++){
  if(!textOps.has(list.fnArray[index])||!boxes||boxes.isEmpty(index))continue;
  const [x0,y0,x1,y1]=[boxes.minX(index),boxes.minY(index),boxes.maxX(index),boxes.maxY(index)];
  targets.forEach((target,number)=>{const [l,t,r,b]=target.line.rect;if(x0>=l-.004&&x1<=r+.004&&y0>=t-.004&&y1<=b+.004){selectedOps.add(index);covered.add(number);}});
 }
 // Missing browser-font ink bounds can still be proved by a unique complete glyph sequence.
 const key=value=>value.normalize('NFKC').replace(/\ufffe/g,'-').replace(/[\s\u0000]/g,'');
 const glyphs=value=>Array.isArray(value)?value.map(glyphs).join(''):(value&&typeof value==='object'&&typeof value.unicode==='string'?value.unicode:'');
 let stream='';const runs=[];
 for(let index=0;index<list.fnArray.length;index++)if(textOps.has(list.fnArray[index])){
  const text=key(glyphs(list.argsArray[index]));if(!text)continue;
  runs.push({index,start:stream.length,end:stream.length+text.length});stream+=text;
 }
 function prove(text,numbers){
  const needle=key(text),start=stream.indexOf(needle);if(needle.length<4||start<0||stream.indexOf(needle,start+1)>=0)return;
  const end=start+needle.length,complete=runs.filter(run=>run.start>=start&&run.end<=end);
  if(!complete.length||complete[0].start!==start||complete.at(-1).end!==end)return;
  complete.forEach(run=>selectedOps.add(run.index));numbers.forEach(number=>covered.add(number));
 }
 targets.forEach((target,number)=>prove(target.line.text??record.lines[target.line.index],[number]));
 const byLine=new Map();targets.forEach((target,number)=>{const index=target.line.index;if(!byLine.has(index))byLine.set(index,[]);byLine.get(index).push(number);});
 for(const [index,numbers]of byLine){
  const text=record.lines[index],parts=numbers.map(number=>targets[number].line).sort((a,b)=>a.rect[0]-b.rect[0]);
  if(parts.every(part=>part.text)&&key(parts.map(part=>part.text).join(''))===key(text))prove(text,numbers);
 }
 for(const region of plan.regions){
  const numbers=targets.map((target,index)=>target.block===region.block?index:-1).filter(index=>index>=0);
  if(numbers.length===region.lines.length)prove(region.lines.map(line=>line.text??record.lines[line.index]).join(''),numbers);
 }
 targets.forEach((target,number)=>{
  if(covered.has(number))return;
  const expected=key(target.line.text??record.lines[target.line.index]),[l,t,r,b]=target.line.rect;
  for(const run of runs){
   if(stream.slice(run.start,run.end)!==expected||!boxes||boxes.isEmpty(run.index))continue;
   const x=(boxes.minX(run.index)+boxes.maxX(run.index))/2,y=(boxes.minY(run.index)+boxes.maxY(run.index))/2;
   if(x>=l-.004&&x<=r+.004&&y>=t-.004&&y<=b+.004){selectedOps.add(run.index);covered.add(number);}
  }
 });
 if(covered.size!==targets.length){install(...fallback);paintSourceCrops();persian.dataset.layout='unmatched-operators';return;}
 const viewport=source.getViewport({scale:slide.width/source.getViewport({scale:1}).width});
 const target=slide.background,ratio=Math.max(1,Math.min(2,(devicePixelRatio||1)*scale));target.width=Math.ceil(viewport.width*ratio);target.height=Math.ceil(viewport.height*ratio);
 const context=target.getContext('2d'),drawing=new Set(['fillText','strokeText','fill','stroke','drawImage']);let suppress=false;
 // Execute text operators to preserve their advances; suppress only their paint calls.
 const proxy=new Proxy(context,{get(object,key){const value=Reflect.get(object,key,object);if(typeof value!=='function')return value;if(drawing.has(key))return(...args)=>{if(!suppress)return value.apply(object,args);};return value.bind(object);},set(object,key,value){return Reflect.set(object,key,value,object);}});
 paintSourceCrops();
 const canonicalOps=await canonicalSource.getOperatorList();
 if(id!==serial||page!==selected)return;
 if(canonicalOps.fnArray.length!==list.fnArray.length||!list.fnArray.every((value,index)=>value===canonicalOps.fnArray[index])){install(...fallback);persian.dataset.layout='operator-mismatch';return;}
 const current=canonicalSource.render({canvas:null,canvasContext:proxy,viewport,transform:ratio===1?null:[ratio,0,0,ratio,0,0],background:'#ffffff',operationsFilter:index=>{suppress=selectedOps.has(index);return true;}});layoutTask=current;
 try{await current.promise;if(id===serial&&page===selected)persian.dataset.layout=(plan.figureLabels?.length||plan.tables?.length)?'source-canvas-figure-companion':'source-canvas';}catch(error){if(id===serial&&page===selected){install(...fallback);persian.dataset.layout='render-fallback';}if(error?.name!=='RenderingCancelledException')console.warn('Slide layout render failed',error);}finally{if(layoutTask===current)layoutTask=null;}
}
function paintSourceCrops(){
 for(const target of persian.querySelectorAll('[data-source-crop]')){
  const [x0,y0,x1,y1]=JSON.parse(target.dataset.sourceCrop),width=(x1-x0)*canvas.width,height=(y1-y0)*canvas.height;
  const scale=Math.min(1,1024/Math.max(width,height));target.width=Math.max(1,Math.round(width*scale));target.height=Math.max(1,Math.round(height*scale));
  target.getContext('2d').drawImage(canvas,x0*canvas.width,y0*canvas.height,width,height,0,0,target.width,target.height);
  target.dataset.cropReady='true';
 }
}
function controls(){
 picker.value=references?'sources':String(page);$('[data-prev-page]').disabled=!references&&page===1;$('[data-next-page]').disabled=references;
 $('[data-next-page]').textContent=!references&&page===config.pageCount?'منابع':'بعدی';
 $('[data-page-total]').hidden=references;$('[data-page-count]').textContent=fa(config.pageCount);$('[data-zoom-out]').disabled=references||zoom<=1;$('[data-zoom-in]').disabled=references||zoom>=3;
 $('[data-source-only-toggle]').disabled=references;document.querySelector('.reader-view-controls').hidden=references;
 status.hidden=references;progress.hidden=references||Boolean(pdf&&payload);
 canvas.setAttribute('aria-label',`صفحهٔ ${fa(page)} از ${fa(config.pageCount)}، اسلاید`);
 $('[data-print]').disabled=!references&&renderedPage!==page;
 $('[data-page-experiment]').hidden=references||!config.interactivePages?.includes(page);
 for(const section of ['lab','questions']){
  const control=document.querySelector(`.reader-sections [data-reader-section="${section}"]`);if(!control)continue;
  const pages=section==='lab'?config.interactivePages:config.questionPages;
  const disabled=Array.isArray(pages)&&!pages.includes(page)&&!(customTool&&section==='lab'&&['lab','explore'].includes(document.body.dataset.readerSection));
  control.setAttribute('aria-disabled',String(disabled));control.tabIndex=disabled?-1:0;
  if(disabled)control.removeAttribute('href');
  else{
   const activeTool=customTool&&section==='lab'&&['lab','explore'].includes(document.body.dataset.readerSection);
   const url=new URL(activeTool?$('[data-reader-tools-frame]').src:config.practiceUrl,location.href);
   if(!activeTool){url.searchParams.set('source-page',String(page));url.hash=section==='questions'?'questions':'code';}
   control.setAttribute('href',url.pathname+url.search+url.hash);
  }
 }
 const playable=config.slideSequences?.some(sequence=>sequence.includes(page));
 $('[data-play-slides]').hidden=references||!playable||document.body.dataset.readerSection!=='slides';
 $('[data-play-slides]').textContent=playing?'توقف پخش':'پخش مراحل';$('[data-play-slides]').setAttribute('aria-pressed',String(playing));
}
function safeExternal(raw){try{const url=new URL(raw,new URL(config.pdfUrl,location.href));return ['http:','https:'].includes(url.protocol)?url.href:null;}catch{return null;}}
async function destination(dest){
 const value=typeof dest==='string'?await pdf.getDestination(dest):dest;if(!Array.isArray(value))return;
 const first=value[0];const index=typeof first==='number'?first:await pdf.getPageIndex(first);go(index+1);
}
function readerSize(){const original=$('#original-panel').getBoundingClientRect(),translated=$('#translation-panel').getBoundingClientRect();return Math.round(original.width)+':'+Math.round(translated.width)+':'+(document.body.dataset.sourceOnly==='true'?Math.round(original.height):'');}
let coverFallback=null;
async function showCoverFallback(id,selected){
 if(config.term!=='spring-2026'||config.session!=='s01'||selected!==1||config.sourceSha256!=='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593')return false;
 const image=element('img','source-cover-fallback');
 image.alt='صفحه ۱ اسلاید';
 const loaded=new Promise(resolve=>{image.onload=()=>resolve(true);image.onerror=()=>resolve(false);});
 image.src=new URL('./s01-first-page-689c5542412903e7.jpg',import.meta.url).href;
 if(!await loaded||closed||id!==serial||page!==selected)return false;
 const width=(document.querySelector('.reader-original').clientWidth?Math.max(250,document.querySelector('.reader-original').clientWidth-32):lastWidth)*zoom;
 const holder=canvas.parentElement;holder.style.width=width+'px';holder.style.height=(width*image.naturalHeight/image.naturalWidth)+'px';
 Object.assign(image.style,{display:'block',width:'100%',height:'auto'});
 canvas.style.display='none';holder.insertBefore(image,links);coverFallback=image;
 return true;
}
async function renderOriginal(){
 if(!pdf||!payload||closed||references)return;
 const id=++serial,selected=page;lastObservedSize=readerSize();clearTimeout(resizeTimer);
 if(layoutTask){layoutTask.cancel();try{await layoutTask.promise;}catch{}layoutTask=null;}
 if(task){task.cancel();try{await task.promise;}catch{}task=null;}
 if(id!==serial||closed)return;
 coverFallback?.remove();coverFallback=null;canvas.style.display='';
 renderedPage=0;controls();links.replaceChildren();
 message(`در حال نمایش صفحهٔ ${fa(selected)} از ${fa(config.pageCount)}…`);
 try{
  const context=canvas.getContext('2d');if(!context)throw Error('Canvas unavailable');
  context.clearRect(0,0,canvas.width,canvas.height);
  const layoutSource=await pdf.getPage(selected);if(id!==serial||closed)return;
  const source=await canonicalPdf.getPage(selected);if(id!==serial||closed)return;
  const pane=document.querySelector('.reader-original'),base=source.getViewport({scale:1});
  let available=pane.clientWidth?Math.max(250,pane.clientWidth-32):lastWidth;
  if(document.body.dataset.sourceOnly==='true'){
   const style=getComputedStyle(pane),padding=parseFloat(style.paddingTop)+parseFloat(style.paddingBottom);
   available=Math.min(available,Math.max(100,pane.clientHeight-padding)*base.width/base.height);
  }
  lastWidth=available;
  const width=available*zoom,viewport=source.getViewport({scale:width/base.width});
  // The table crops need source detail even when the slide preview is narrow or hidden.
  const ratio=Math.max(Math.min(devicePixelRatio||1,2),persian.querySelector('[data-source-crop]')?2048/viewport.width:1);
  canvas.width=Math.ceil(viewport.width*ratio);canvas.height=Math.ceil(viewport.height*ratio);
  canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';
  const holder=canvas.parentElement;holder.style.width=viewport.width+'px';holder.style.height=viewport.height+'px';
  const current=source.render({canvasContext:canvas.getContext('2d'),viewport,transform:ratio===1?null:[ratio,0,0,ratio,0,0],background:'#ffffff'});task=current;
  await current.promise;if(id!==serial||closed)return;
  let annotations=[],linksUnavailable=false,layoutUnavailable=false;
  try{annotations=await source.getAnnotations({intent:'display'});}
  catch(error){linksUnavailable=true;console.warn('Slide links unavailable',error);}
  if(id!==serial||closed)return;
  for(const annotation of annotations){
   const url=annotation.url?referenceTarget(safeExternal(annotation.url)):null;if(!url&&!annotation.dest)continue;
   if(!Array.isArray(annotation.rect)||annotation.rect.length!==4||!annotation.rect.every(Number.isFinite)){linksUnavailable=true;console.warn('Invalid slide link geometry');continue;}
   const [x1,y1]=viewport.convertToViewportPoint(annotation.rect[0],annotation.rect[1]),[x2,y2]=viewport.convertToViewportPoint(annotation.rect[2],annotation.rect[3]);
   const rect=[x1,y1,x2,y2],a=element('a','source-link-overlay');
   a.style.left=Math.min(rect[0],rect[2])+'px';a.style.top=Math.min(rect[1],rect[3])+'px';a.style.width=Math.abs(rect[2]-rect[0])+'px';a.style.height=Math.abs(rect[3]-rect[1])+'px';
   a.setAttribute('aria-label',url?'پیوند: '+url:'رفتن به صفحهٔ ارجاع‌شده');
   if(url){a.href=url;a.target='_blank';a.rel='noopener noreferrer';}else{a.href='#';a.addEventListener('click',event=>{event.preventDefault();destination(annotation.dest).catch(()=>message('این ارجاع داخلی در PDF قابل نمایش نیست؛ اصل فایل در دسترس است.',true));});}
   links.append(a);
  }
  try{paintSourceCrops();styleTranslationFallback(payload.pages[selected-1]);await paintPersianLayout(layoutSource,source,id,selected);}
  catch(error){if(error?.name==='RenderingCancelledException'||closed||id!==serial)return;layoutUnavailable=true;console.warn('Persian slide layout unavailable',error);persian.replaceChildren(...translationFallback);persian.dataset.layout='layout-error-fallback';}
  if(id!==serial||closed)return;renderedPage=selected;task=null;document.documentElement.dataset.readerReady='true';$('[data-retry-load]').hidden=true;controls();
  const record=payload.pages[page-1],reviewed=record.text_reviewed&&record.image_text_reviewed;
  message(`صفحهٔ ${fa(page)} از ${fa(config.pageCount)}${reviewed?'':' · ترجمه در بازبینی'}${usesFullPdf(page)?' · این صفحه از فایل کامل جلسه بارگیری می‌شود':''}${linksUnavailable?' · پیوندهای اسلاید در دسترس نیستند':''}${layoutUnavailable?' · نمایش ساده ترجمه':''}`);
  schedulePlayback();
 }catch(error){if(error?.name==='RenderingCancelledException'||closed||id!==serial)return;console.warn('Slide render failed',error);task=null;stopPlayback();
  const shown=await showCoverFallback(id,selected);if(id!==serial||closed)return;
  if(shown){renderedPage=selected;document.documentElement.dataset.readerReady='true';controls();message('صفحه ۱ · نمایش تصویری');}
  else message('نمایش این صفحه کامل نشد؛ دوباره تلاش کن.',true);
  $('[data-retry-load]').hidden=false;
 }
}
function leaveReferences(){references=false;document.querySelector('.reader-layout').hidden=false;$('#reader-references').hidden=true;}
function showReferences(update=true){
 selectSection('slides');references=true;serial++;task?.cancel();task=null;
 document.querySelector('.reader-layout').hidden=true;$('#reader-references').hidden=false;
 controls();message('منابع');if(update)history.replaceState(null,'','#sources');
}
function nextPage(){if(references)return;if(page===config.pageCount)showReferences();else go(page+1);}
function previousPage(){go(references?config.pageCount:page-1);}
function go(number,update=true,fromPlayback=false){
 if(!fromPlayback)stopPlayback();
 if(!Number.isInteger(number))return;leaveReferences();
 const previousSection=document.body.dataset.readerSection,changed=clamp(number)!==page;
 const closeTool=changed&&(customTool||previousSection==='explore');
 page=clamp(number);
 if(closeTool)selectSection('slides');
 else if(changed&&['lab','questions'].includes(previousSection)){
  const available=previousSection==='lab'?config.interactivePages:config.questionPages;
  selectSection(!Array.isArray(available)||available.includes(page)?previousSection:'slides');
 }
 renderedPage=0;controls();renderTranslation();
 try{localStorage.setItem('danna-slide-position:v1',JSON.stringify({term:config.term,session:config.session,page}));}catch{}
 if(update)history.replaceState(null,'',`#page=${page}`);window.dispatchEvent(new CustomEvent('danna:source-page',{detail:{term:config.term,session:config.session,page}}));renderOriginal();
}
function syncPanels(){
 const slides=document.body.dataset.readerSection==='slides',translated=view==='translation';
 document.body.dataset.readerView=view;document.body.dataset.mobileView=translated?'translation':'source';
 document.body.dataset.sourceOnly=String(presenting&&slides&&view==='source');
 document.body.dataset.presenting=String(presenting);
 $('#original-panel').hidden=slides?translated:translated;
 $('#translation-panel').hidden=slides?view==='source':!translated;
 document.querySelector('.reader-tools-panel').hidden=slides;
 for(const [selector,value] of [['[data-view-source]','source'],['[data-view-translation]','translation'],['[data-view-both]','both']])$(selector).setAttribute('aria-pressed',String(view===value));
 $('[data-source-only-toggle]').setAttribute('aria-pressed',String(presenting));
}
function setView(value){clearTimeout(resizeTimer);view=value;if(matchMedia('(max-width:760px)').matches&&document.body.dataset.readerSection!=='slides')selectSection('slides');syncPanels();renderOriginal();}
function selectSection(section,toolUrl=null){
 if(!toolUrl&&((['lab','explore'].includes(section)&&Array.isArray(config.interactivePages)&&!config.interactivePages.includes(page))||(section==='questions'&&Array.isArray(config.questionPages)&&!config.questionPages.includes(page))))return;
 const releaseTool=customTool&&section==='slides';customTool=Boolean(toolUrl);
 if(releaseTool)$('[data-reader-tools-frame]').src='about:blank';
 stopPlayback();
 leaveReferences();
 const slides=section==='slides',translation=$('#translation-panel'),tools=document.querySelector('.reader-tools-panel'),frame=$('[data-reader-tools-frame]');
 document.body.dataset.readerSection=section;syncPanels();
 document.querySelectorAll('[data-reader-section]').forEach(item=>{if(item!==document.body)item.setAttribute('aria-pressed',String(item.dataset.readerSection===(section==='explore'?'lab':section)));});
 if(!slides){const next=toolUrl||(section==='knowledge'?config.knowledgeUrl:config.practiceUrl+((section==='questions'||config.interactivePages?.includes(page))?'?source-page='+page:'')+(section==='questions'?'#questions':'#code'));if(frame.getAttribute('src')!==next)frame.src=next;}
 renderOriginal();
}
document.querySelectorAll('.reader-sections [data-reader-section]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();selectSection(button.dataset.readerSection);}));
document.querySelectorAll('.reader-sections a[role=button]').forEach(button=>button.addEventListener('keydown',event=>{if(event.key===' '){event.preventDefault();button.click();}}));
$('[data-page-experiment]').addEventListener('click',()=>selectSection('explore'));
$('[data-play-slides]').addEventListener('click',()=>{
 if(playing){stopPlayback();return;}
 playSequence=config.slideSequences?.find(sequence=>sequence.includes(page));if(!playSequence)return;
 playing=true;controls();
 if(page===playSequence.at(-1))go(playSequence[0],true,true);else if(renderedPage===page)schedulePlayback();else renderOriginal();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPlayback();});
$('[data-source-only-toggle]').addEventListener('click',()=>{presenting=!presenting;if(presenting){readingView=view;view='source';zoom=1;}else view=readingView;syncPanels();renderOriginal();});
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==$('[data-reader-tools-frame]').contentWindow||event.data?.type!=='danna-source-page'||!Number.isInteger(event.data.page))return;go(event.data.page);if(event.data.showSlides===true||matchMedia('(max-width:760px)').matches)selectSection('slides');});
$('[data-prev-page]').addEventListener('click',previousPage);$('[data-next-page]').addEventListener('click',nextPage);picker.addEventListener('change',()=>picker.value==='sources'?showReferences():go(Number(picker.value)));
$('[data-retry-load]').addEventListener('click',()=>location.reload());
$('[data-zoom-in]').addEventListener('click',()=>{zoom=Math.min(3,zoom+.25);controls();renderOriginal();});$('[data-zoom-out]').addEventListener('click',()=>{zoom=Math.max(1,zoom-.25);controls();renderOriginal();});
$('[data-view-source]').addEventListener('click',()=>setView('source'));$('[data-view-translation]').addEventListener('click',()=>setView('translation'));
$('[data-view-both]').addEventListener('click',()=>setView('both'));
setupFullscreen($('[data-fullscreen]'));
$('[data-print]').addEventListener('click',async()=>{if(!references&&renderedPage!==page)return;await document.fonts.ready;window.print();});
document.addEventListener('keydown',event=>{if(event.defaultPrevented||event.shiftKey||event.altKey||event.ctrlKey||event.metaKey||event.target.closest('.reader-table-viewport')||/INPUT|TEXTAREA|SELECT|BUTTON|A/.test(event.target.tagName))return;const action={ArrowLeft:nextPage,PageDown:nextPage,ArrowRight:previousPage,PageUp:previousPage,Home:()=>go(1),End:()=>go(config.pageCount)}[event.key];if(action){event.preventDefault();action();}});
window.addEventListener('hashchange',()=>location.hash==='#sources'?showReferences(false):go(fromHash(),false));
let resizeTimer,lastObservedSize=readerSize();
const resizeObserver=new ResizeObserver(()=>{
 const size=readerSize();if(size===lastObservedSize)return;lastObservedSize=size;
 clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>renderOriginal(),150);
});
resizeObserver.observe(document.querySelector('.reader-original'));
resizeObserver.observe(document.querySelector('.reader-translation'));

const documentOptions={url:config.pdfUrl+'?sha='+config.sourceSha256,cMapUrl:new URL('./vendor/pdfjs/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/pdfjs/standard_fonts/',import.meta.url).href,wasmUrl:new URL('./vendor/pdfjs/wasm/',import.meta.url).href,isEvalSupported:false,enableXfa:false,disableAutoFetch:true,disableStream:true,rangeChunkSize:262144};
let loading,canonicalLoading;
const loadingController=new AbortController();
progress.removeAttribute('value');
let pageLoad=null,usesFullPdf=()=>false;
function releasePage(){
 const old=pageLoad;pageLoad=null;if(!old)return;
 old.controller.abort();
 old.promise.then(value=>Promise.all(value.tasks.map(item=>item.destroy()))).catch(()=>{});
}
async function loadSources(){
 const paged=config.term==='spring-2026'&&config.pageFiles!==false;
 const pageRoot=`/deep-learning/assets/danna/spring-2026/${config.session}-pages/`;
 const translation=fetch(config.translationUrl,{signal:loadingController.signal}).then(response=>{if(!response.ok)throw Error('translation unavailable');return response.json();});
 const {url,...options}=documentOptions;
 // The downloaded package already contains every PDF locally. Its reader keeps
 // the original URL/range path and does not duplicate those files in browser storage.
 if(config.pageFiles===false){
  loading=getDocument({...documentOptions,disableFontFace:config.term!=='spring-2026'});
  canonicalLoading=config.term==='spring-2026'?getDocument({...documentOptions,disableFontFace:true}):loading;
  const [document,canonicalDocument,data]=await Promise.all([loading.promise,canonicalLoading.promise,translation]);
  return [document,canonicalDocument,data];
 }
 if(paged){
  const [manifest,data]=await Promise.all([fetch(pageRoot+'manifest.json?sha='+config.sourceSha256,{signal:loadingController.signal}).then(response=>{if(!response.ok)throw Error('page index unavailable');return response.json();}),translation]);
  if(manifest.source_sha256!==config.sourceSha256||manifest.page_count!==config.pageCount||manifest.pages?.length!==config.pageCount||!manifest.pages.every(value=>value===null||/^[0-9a-f]{64}$/.test(value)))throw Error('page identity mismatch');
  async function loadPage(number){
   if(!Number.isInteger(number)||number<1||number>config.pageCount)throw Error('invalid page');
   if(!pageLoad||pageLoad.number!==number){
    releasePage();const controller=new AbortController();
    const promise=(async()=>{
     const pageHash=manifest.pages[number-1],fallback=pageHash===null,hash=pageHash||config.sourceSha256,name=String(number).padStart(3,'0')+'.pdf';
     const bytes=await readPdf(fallback?documentOptions.url:pageRoot+name+'?sha='+hash,hash,controller.signal);
     if(controller.signal.aborted||closed)throw Error('page closed');
     const tasks=[getDocument({...options,data:new Uint8Array(bytes.slice(0)),disableFontFace:false}),getDocument({...options,data:new Uint8Array(bytes.slice(0)),disableFontFace:true})];
     try{return {documents:await Promise.all(tasks.map(item=>item.promise)),tasks,pageNumber:fallback?number:1};}
     catch(error){await Promise.all(tasks.map(item=>item.destroy().catch(()=>{})));throw error;}
    })();
    pageLoad={number,controller,promise};
   }
   return pageLoad.promise;
  }
  const document={numPages:config.pageCount,getPage:async number=>{const item=await loadPage(number);return item.documents[0].getPage(item.pageNumber);}};
  const canonicalDocument={getPage:async number=>{const item=await loadPage(number);return item.documents[1].getPage(item.pageNumber);}};
  usesFullPdf=number=>manifest.pages[number-1]===null;
  return [document,canonicalDocument,data];
 }
 const [bytes,data]=await Promise.all([readPdf(documentOptions.url,config.sourceSha256,loadingController.signal),translation]);
 if(closed)throw Error('reader closed');
 loading=getDocument({...options,data:new Uint8Array(bytes.slice(0)),disableFontFace:config.term!=='spring-2026'});
 canonicalLoading=config.term==='spring-2026'?getDocument({...options,data:new Uint8Array(bytes.slice(0)),disableFontFace:true}):loading;
 const [document,canonicalDocument]=await Promise.all([loading.promise,canonicalLoading.promise]);
 return [document,canonicalDocument,data];
}
loadSources().then(([document,canonicalDocument,data])=>{
 if(data.source?.sha256!==config.sourceSha256||document.numPages!==config.pageCount||data.pages?.length!==config.pageCount)throw Error('source/translation identity mismatch');
 pdf=document;canonicalPdf=canonicalDocument;payload=data;configureReferences(data.reference_targets);progress.hidden=true;
 for(const option of picker.options){if(option.value==='sources')continue;const record=data.pages[Number(option.value)-1];const heading=record.blocks.find(b=>b.kind==='heading')?.fa||record.blocks.find(b=>b.kind!=='not_visible'&&b.fa)?.fa?.split('\n').find(s=>!/^https?:/.test(s))||'';option.textContent=fa(Number(option.value))+(heading?' · '+heading.slice(0,100):'');}
 if(location.hash==='#sources')showReferences(false);else go(page,false);
}).catch(()=>{progress.hidden=true;message('بارگیری اسلایدها انجام نشد؛ دوباره تلاش کن.',true);$('[data-retry-load]').hidden=false;});
window.addEventListener('pagehide',event=>{
 stopPlayback();if(event.persisted)return;
 closed=true;loadingController.abort();serial++;clearTimeout(resizeTimer);
 // PDF.js render cancellation settles asynchronously. Destroying its workers
 // first can race the canvas task during rapid navigation or window close.
 const renders=[task,layoutTask].filter(Boolean);
 for(const render of renders)render.cancel();
 Promise.allSettled(renders.map(render=>render.promise)).then(()=>{
  releasePage();
  loading?.destroy().catch(()=>{});
  if(canonicalLoading&&canonicalLoading!==loading)canonicalLoading.destroy().catch(()=>{});
 });
});
window.sourceSlideReader={openTool(raw,section='lab'){const url=new URL(raw,location.href);if(url.origin!==location.origin||!['http:','https:'].includes(url.protocol)||!['lab','explore','questions','knowledge'].includes(section))throw Error('Invalid slide tool');selectSection(section,url.href);},get page(){return page;},get renderedPage(){return renderedPage;},get pageCount(){return config.pageCount;},get sourceSha256(){return config.sourceSha256;},get ready(){return Boolean(pdf&&payload&&(references||renderedPage===page));}};
controls();
syncPanels();
if(location.hash==='#sources')showReferences(false);

// The divider changes available space only; each slide keeps its own scale and content.
{
 const layout=document.querySelector('.reader-layout');
 const divider=document.createElement('div');
 divider.className='reader-divider';
 divider.setAttribute('role','separator');
 divider.setAttribute('aria-orientation','vertical');
 divider.setAttribute('aria-label','تنظیم اندازه دو بخش');
 divider.setAttribute('aria-valuemin','25');
 divider.setAttribute('aria-valuemax','75');
 divider.title='برای تنظیم اندازه بکشید یا از کلیدهای جهت استفاده کنید';
 let fraction=.5,dragging=false;
 try{const saved=Number(localStorage.getItem('danna-reader-split'));if(saved>=.25&&saved<=.75)fraction=saved;}catch{}
 const setFraction=value=>{
  fraction=Math.max(.25,Math.min(.75,value));
  layout.style.setProperty('--reader-split',String(fraction));
  divider.setAttribute('aria-valuenow',String(Math.round(fraction*100)));
  divider.setAttribute('aria-valuetext',`${Math.round(fraction*100)} درصد برای بخش چپ`);
 };
 const sync=()=>{
  const panes=[...layout.children].filter(node=>node!==divider&&!node.hidden);
  const active=matchMedia('(min-width:761px)').matches&&!layout.hidden&&panes.length===2;
  document.body.dataset.splitActive=String(active);
  divider.hidden=!active;divider.tabIndex=active?0:-1;
  if(active){layout.insertBefore(divider,panes[1]);divider.setAttribute('aria-controls',panes[0].id||'reader');}
 };
 const save=()=>{try{localStorage.setItem('danna-reader-split',String(fraction));}catch{}};
 divider.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;
  dragging=true;divider.setPointerCapture(event.pointerId);document.body.classList.add('reader-resizing');event.preventDefault();
 });
 divider.addEventListener('pointermove',event=>{
  if(!dragging)return;
  const bounds=layout.getBoundingClientRect();setFraction((event.clientX-bounds.left)/bounds.width);
 });
 const endDrag=()=>{if(!dragging)return;dragging=false;document.body.classList.remove('reader-resizing');save();};
 divider.addEventListener('pointerup',endDrag);divider.addEventListener('pointercancel',endDrag);divider.addEventListener('lostpointercapture',endDrag);
 divider.addEventListener('keydown',event=>{
  const next={ArrowLeft:fraction-.02,ArrowRight:fraction+.02,Home:.25,End:.75}[event.key];
  if(next===undefined)return;event.preventDefault();event.stopPropagation();setFraction(next);save();
 });
 layout.append(divider);setFraction(fraction);sync();
 const observer=new MutationObserver(sync);
 for(const node of [layout,...layout.children])if(node!==divider)observer.observe(node,{attributes:true,attributeFilter:['hidden']});
 matchMedia('(min-width:761px)').addEventListener('change',sync);
}
