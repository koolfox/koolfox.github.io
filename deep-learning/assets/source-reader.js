import {getDocument,GlobalWorkerOptions,OPS} from './vendor/pdfjs/pdf.min.mjs';
import {addText, math, renderBlocks, renderTable, configureReferences, referenceTarget, sourceLayoutPlan, createSourceLayout, fitSourceLayout} from './slide-content.js';

const $=s=>document.querySelector(s),config=JSON.parse($('#source-reader-config').textContent);
const canvas=$('#source-canvas'),links=$('#source-links'),persian=$('#persian-page'),status=$('[data-reader-status]');
const picker=$('[data-page-select]'),progress=$('[data-pdf-progress]');
GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.min.mjs',import.meta.url).href;
let pdf=null,canonicalPdf=null,payload=null,page=1,renderedPage=0,zoom=1,serial=0,task=null,closed=false,lastWidth=720,references=false;
let presenting=false,view=matchMedia('(max-width:760px)').matches?'source':'both',readingView=view;
let playing=false,playSequence=null,playTimer=null,layoutTask=null,customTool=false;
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
 persian.replaceChildren(fragment);persian.dataset.page=String(page);$('[data-source-text]').textContent=visibleEnglish(record);
 document.querySelector('.reader-translation').scrollTop=0;
}
async function paintPersianLayout(source,canonicalSource,id,selected){
 const record=payload.pages[selected-1],plan=sourceLayoutPlan(record);
 persian.dataset.layout=plan.reason||'pending';
 if(plan.reason)return;
 const fallback=[...persian.childNodes],slide=createSourceLayout(record,plan);
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
 if(!fitSourceLayout(slide.stage)){install(...fallback);persian.dataset.layout='text-overflow';return;}
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
  const x=(boxes.minX(index)+boxes.maxX(index))/2,y=(boxes.minY(index)+boxes.maxY(index))/2;
  targets.forEach((target,number)=>{const [l,t,r,b]=target.line.rect;if(x>=l-.004&&x<=r+.004&&y>=t-.004&&y<=b+.004){selectedOps.add(index);covered.add(number);}});
 }
 // Missing browser-font ink bounds can still be proved by a unique complete glyph sequence.
 const key=value=>value.normalize('NFKC').replace(/[\s\u0000]/g,'');
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
  if(numbers.length===region.block.source_lines.length)prove(region.block.source_lines.map(index=>record.lines[index]).join(''),numbers);
 }
 if(covered.size!==targets.length){install(...fallback);persian.dataset.layout='unmatched-operators';return;}
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
async function renderOriginal(){
 if(!pdf||!payload||closed||references)return;
 const id=++serial,selected=page;lastObservedSize=readerSize();clearTimeout(resizeTimer);
 if(layoutTask){layoutTask.cancel();try{await layoutTask.promise;}catch{}layoutTask=null;}
 if(task){task.cancel();try{await task.promise;}catch{}task=null;}
 if(id!==serial||closed)return;
 renderedPage=0;controls();links.replaceChildren();canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
 message(`در حال نمایش صفحهٔ ${fa(selected)} از ${fa(config.pageCount)}…`);
 try{
  const layoutSource=await pdf.getPage(selected),source=await canonicalPdf.getPage(selected);if(id!==serial||closed)return;
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
  const annotations=await source.getAnnotations({intent:'display'});if(id!==serial||closed)return;
  for(const annotation of annotations){
   const url=annotation.url?referenceTarget(safeExternal(annotation.url)):null;if(!url&&!annotation.dest)continue;
   const rect=viewport.convertToViewportRectangle(annotation.rect);const a=element('a','source-link-overlay');
   a.style.left=Math.min(rect[0],rect[2])+'px';a.style.top=Math.min(rect[1],rect[3])+'px';a.style.width=Math.abs(rect[2]-rect[0])+'px';a.style.height=Math.abs(rect[3]-rect[1])+'px';
   a.setAttribute('aria-label',url?'پیوند: '+url:'رفتن به صفحهٔ ارجاع‌شده');
   if(url){a.href=url;a.target='_blank';a.rel='noopener noreferrer';}else{a.href='#';a.addEventListener('click',event=>{event.preventDefault();destination(annotation.dest).catch(()=>message('این ارجاع داخلی در PDF قابل نمایش نیست؛ اصل فایل در دسترس است.',true));});}
   links.append(a);
  }
  paintSourceCrops();await paintPersianLayout(layoutSource,source,id,selected);if(id!==serial||closed)return;renderedPage=selected;task=null;document.documentElement.dataset.readerReady='true';controls();
  const record=payload.pages[page-1],reviewed=record.text_reviewed&&record.image_text_reviewed;
  message(`صفحهٔ ${fa(page)} از ${fa(config.pageCount)}${reviewed?'':' · ترجمه در بازبینی'}`);
  schedulePlayback();
 }catch(error){if(error?.name==='RenderingCancelledException'||closed||id!==serial)return;task=null;stopPlayback();message('نمایش این صفحه کامل نشد؛ صفحه را دوباره انتخاب کن.',true);}
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
$('[data-fullscreen]').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{message('مرورگر تمام‌صفحه را اجازه نداد؛ مطالعه در همین نما در دسترس است.',true);}});
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
const loading=getDocument({...documentOptions,disableFontFace:config.term!=='spring-2026'}),canonicalLoading=config.term==='spring-2026'?getDocument({...documentOptions,disableFontFace:true}):loading;
loading.onProgress=event=>{if(event.total){progress.value=Math.min(100,event.loaded/event.total*100);progress.setAttribute('aria-valuetext',`${fa(Math.round(progress.value))} درصد`);}};
Promise.all([loading.promise,canonicalLoading.promise,fetch(config.translationUrl).then(response=>{if(!response.ok)throw Error('translation unavailable');return response.json();})]).then(([document,canonicalDocument,data])=>{
 if(data.source?.sha256!==config.sourceSha256||document.numPages!==config.pageCount||data.pages?.length!==config.pageCount)throw Error('source/translation identity mismatch');
 pdf=document;canonicalPdf=canonicalDocument;payload=data;configureReferences(data.reference_targets);progress.hidden=true;
 for(const option of picker.options){if(option.value==='sources')continue;const record=data.pages[Number(option.value)-1];const heading=record.blocks.find(b=>b.kind==='heading')?.fa||record.blocks.find(b=>b.kind!=='not_visible'&&b.fa)?.fa?.split('\n').find(s=>!/^https?:/.test(s))||'';option.textContent=fa(Number(option.value))+(heading?' · '+heading.slice(0,100):'');}
 if(location.hash==='#sources')showReferences(false);else go(page,false);
}).catch(()=>{progress.hidden=true;message('بارگیری اسلایدها انجام نشد؛ دوباره تلاش کن.',true);$('[data-retry-load]').hidden=false;});
window.addEventListener('pagehide',event=>{stopPlayback();if(event.persisted)return;closed=true;serial++;clearTimeout(resizeTimer);task?.cancel();layoutTask?.cancel();loading.destroy().catch(()=>{});if(canonicalLoading!==loading)canonicalLoading.destroy().catch(()=>{});});
window.sourceSlideReader={openTool(raw,section='lab'){const url=new URL(raw,location.href);if(url.origin!==location.origin||!['http:','https:'].includes(url.protocol)||!['lab','explore','questions','knowledge'].includes(section))throw Error('Invalid slide tool');selectSection(section,url.href);},get page(){return page;},get renderedPage(){return renderedPage;},get pageCount(){return config.pageCount;},get sourceSha256(){return config.sourceSha256;},get ready(){return Boolean(pdf&&payload&&(references||renderedPage===page));}};
controls();
syncPanels();
if(location.hash==='#sources')showReferences(false);
