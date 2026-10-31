import {getDocument,GlobalWorkerOptions} from './vendor/pdfjs/pdf.min.mjs';
import katex from './vendor/katex/katex.mjs';

const $=s=>document.querySelector(s),config=JSON.parse($('#source-reader-config').textContent);
const canvas=$('#source-canvas'),links=$('#source-links'),persian=$('#persian-page'),status=$('[data-reader-status]');
const picker=$('[data-page-select]'),progress=$('[data-pdf-progress]');
GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.min.mjs',import.meta.url).href;
let pdf=null,payload=null,page=1,renderedPage=0,zoom=1,serial=0,task=null,closed=false,lastWidth=720;
const fa=n=>new Intl.NumberFormat('fa-IR',{useGrouping:false}).format(n);
const clamp=n=>Math.max(1,Math.min(config.pageCount,n));
function fromHash(){const match=location.hash.match(/^#page=(\d+)$/);return match?clamp(Number(match[1])):1;}
page=fromHash();
function element(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;}
function message(text,error=false){status.textContent=text;status.dataset.error=String(error);}
function visibleEnglish(record){
 const lines=[];
 for(const block of record.blocks){
  if(block.kind==='not_visible')continue;
  lines.push(block.visible_en??block.source_lines.map(i=>record.lines[i]).join('\n'));
 }
 for(const item of record.image_text||[])if(item.en)lines.push(item.en);
 return lines.join('\n');
}
function addText(parent,text){
 const pattern=/https?:\/\/[^\s<>"\u0600-\u06ff]+|\([^\u0600-\u06ff()\n]*\)|[A-Za-z0-9α-ωΑ-Ω∂∇Σ∑√σŷ][A-Za-z0-9α-ωΑ-Ω∂∇Σ∑√σŷ₀-₉⁰-⁹_+−=<>≤≥×*/.,:;\[\]{}^% \t\-]*/g;
 let end=0;
 for(const match of text.matchAll(pattern)){
  parent.append(document.createTextNode(text.slice(end,match.index)));
  const token=match[0];
  if(/^https?:/.test(token)){
   let url=token;while(/[.,;،؛]$/.test(url)||(/\)$/.test(url)&&(url.match(/\)/g)||[]).length>(url.match(/\(/g)||[]).length))url=url.slice(0,-1);
   try{const parsed=new URL(url);if(!['http:','https:'].includes(parsed.protocol))throw Error();const a=element('a','reader-reference',url);a.href=parsed.href;a.target='_blank';a.rel='noopener noreferrer';a.dir='ltr';parent.append(a,document.createTextNode(token.slice(url.length)));}catch{parent.append(document.createTextNode(token));}
  }else{const bdi=element('bdi','',token.trimEnd());bdi.dir='ltr';parent.append(bdi,document.createTextNode(token.slice(token.trimEnd().length)));}
  end=match.index+token.length;
 }
 parent.append(document.createTextNode(text.slice(end)));
}
function math(parent,item){
 const div=element('div','reader-math');div.dir='ltr';
 if(item.latex){try{katex.render(item.latex,div,{displayMode:true,throwOnError:true,trust:false,strict:'error'});div.dataset.typeset='true';}catch{div.textContent=item.fa;div.dataset.mathError='true';}}
 else div.textContent=item.fa;
 parent.append(div);
}
function renderTranslation(){
 if(!payload)return;
 const record=payload.pages[page-1],fragment=document.createDocumentFragment();
 for(const block of record.blocks){
  if(block.kind==='not_visible')continue;
  if(block.latex||block.kind==='math'){math(fragment,block);continue;}
  const node=element(block.kind==='heading'?'h3':'p','reader-copy '+block.kind);addText(node,block.fa);fragment.append(node);
 }
 if(record.image_text?.length){
  const section=element('section','reader-image-labels');section.setAttribute('aria-label','ترجمهٔ نوشته‌ها و برچسب‌های تصویر');
  for(const item of record.image_text){
   if(item.latex){math(section,item);continue;}
   const p=element('p','reader-image-text');addText(p,item.fa);section.append(p);
  }
  fragment.append(section);
 }
 if(record.image_text_limits){
  const values=Array.isArray(record.image_text_limits)?record.image_text_limits:[record.image_text_limits];
  const note=element('aside','reader-limits');note.append(element('h3','','یادداشت تصویر مرجع'));
  for(const value of values){const text=typeof value==='string'?value:value.reason_fa||value.reason;if(text)note.append(element('p','',text));}
  fragment.append(note);
 }
 for(const correction of record.editorial_notes||[]){
  const aside=element('aside','reader-limits reader-editorial');
  aside.append(element('h3','','یادداشت اصلاحی این مجموعه'));
  const text=element('p');addText(text,correction.fa);aside.append(text);fragment.append(aside);
 }
 if(!fragment.childNodes.length)fragment.append(element('p','reader-visual-only','این صفحه فقط تصویر دارد؛ اصل تصویر بدون تغییر در کنار آن نمایش داده می‌شود.'));
 persian.replaceChildren(fragment);persian.dataset.page=String(page);$('[data-source-text]').textContent=visibleEnglish(record);
 document.querySelector('.reader-translation').scrollTop=0;
}
function controls(){
 picker.value=String(page);$('[data-prev-page]').disabled=page===1;$('[data-next-page]').disabled=page===config.pageCount;
 $('[data-page-count]').textContent=fa(config.pageCount);$('[data-zoom-out]').disabled=zoom<=1;$('[data-zoom-in]').disabled=zoom>=3;
 canvas.setAttribute('aria-label',`صفحهٔ ${fa(page)} از ${fa(config.pageCount)}، اصل اسلایدهای دانا گوراری`);
 $('[data-print]').disabled=renderedPage!==page;
}
function safeExternal(raw){try{const url=new URL(raw,new URL(config.pdfUrl,location.href));return ['http:','https:'].includes(url.protocol)?url.href:null;}catch{return null;}}
async function destination(dest){
 const value=typeof dest==='string'?await pdf.getDestination(dest):dest;if(!Array.isArray(value))return;
 const first=value[0];const index=typeof first==='number'?first:await pdf.getPageIndex(first);go(index+1);
}
async function renderOriginal(){
 if(!pdf||!payload||closed)return;
 const id=++serial,selected=page;
 if(task){task.cancel();try{await task.promise;}catch{}task=null;}
 if(id!==serial||closed)return;
 renderedPage=0;controls();links.replaceChildren();canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
 message(`در حال نمایش صفحهٔ ${fa(selected)} از ${fa(config.pageCount)}…`);
 try{
  const source=await pdf.getPage(selected);if(id!==serial||closed)return;
  const pane=document.querySelector('.reader-original'),base=source.getViewport({scale:1});
  const available=pane.clientWidth?Math.max(250,pane.clientWidth-32):lastWidth;lastWidth=available;
  const width=available*zoom,viewport=source.getViewport({scale:width/base.width}),ratio=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.ceil(viewport.width*ratio);canvas.height=Math.ceil(viewport.height*ratio);
  canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';
  const holder=canvas.parentElement;holder.style.width=viewport.width+'px';holder.style.height=viewport.height+'px';
  const current=source.render({canvasContext:canvas.getContext('2d'),viewport,transform:ratio===1?null:[ratio,0,0,ratio,0,0],background:'#ffffff'});task=current;
  await current.promise;if(id!==serial||closed)return;
  const annotations=await source.getAnnotations({intent:'display'});if(id!==serial||closed)return;
  for(const annotation of annotations){
   const url=annotation.url?safeExternal(annotation.url):null;if(!url&&!annotation.dest)continue;
   const rect=viewport.convertToViewportRectangle(annotation.rect);const a=element('a','source-link-overlay');
   a.style.left=Math.min(rect[0],rect[2])+'px';a.style.top=Math.min(rect[1],rect[3])+'px';a.style.width=Math.abs(rect[2]-rect[0])+'px';a.style.height=Math.abs(rect[3]-rect[1])+'px';
   a.setAttribute('aria-label',url?'پیوند اصلی: '+url:'رفتن به صفحهٔ ارجاع‌شده در اصل اسلاید');
   if(url){a.href=url;a.target='_blank';a.rel='noopener noreferrer';}else{a.href='#';a.addEventListener('click',event=>{event.preventDefault();destination(annotation.dest).catch(()=>message('این ارجاع داخلی در PDF قابل نمایش نیست؛ اصل فایل در دسترس است.',true));});}
   links.append(a);
  }
  renderedPage=selected;task=null;document.documentElement.dataset.readerReady='true';controls();
  const record=payload.pages[page-1],reviewed=record.text_reviewed&&record.image_text_reviewed;
  message(`صفحهٔ ${fa(page)} از ${fa(config.pageCount)} · اصل و ترجمهٔ همین صفحه${reviewed?'':' · ترجمه در بازبینی'}`);
 }catch(error){if(error?.name==='RenderingCancelledException'||closed||id!==serial)return;task=null;message('نمایش این صفحه کامل نشد. اصل PDF از پیوند بالای صفحه در دسترس است؛ صفحه را دوباره انتخاب کن.',true);}
}
function go(number,update=true){
 if(!Number.isInteger(number))return;page=clamp(number);renderedPage=0;controls();renderTranslation();
 if(update)history.replaceState(null,'',`#page=${page}`);renderOriginal();
}
function setView(view){document.body.dataset.mobileView=view;$('[data-view-source]').setAttribute('aria-pressed',String(view==='source'));$('[data-view-translation]').setAttribute('aria-pressed',String(view==='translation'));if(view==='source')renderOriginal();}
$('[data-prev-page]').addEventListener('click',()=>go(page-1));$('[data-next-page]').addEventListener('click',()=>go(page+1));picker.addEventListener('change',()=>go(Number(picker.value)));
$('[data-zoom-in]').addEventListener('click',()=>{zoom=Math.min(3,zoom+.25);controls();renderOriginal();});$('[data-zoom-out]').addEventListener('click',()=>{zoom=Math.max(1,zoom-.25);controls();renderOriginal();});
$('[data-view-source]').addEventListener('click',()=>setView('source'));$('[data-view-translation]').addEventListener('click',()=>setView('translation'));
$('[data-fullscreen]').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{message('مرورگر تمام‌صفحه را اجازه نداد؛ مطالعه در همین نما در دسترس است.',true);}});
$('[data-print]').addEventListener('click',async()=>{if(renderedPage!==page)return;await document.fonts.ready;window.print();});
document.addEventListener('keydown',event=>{if(event.altKey||event.ctrlKey||event.metaKey||/INPUT|TEXTAREA|SELECT|BUTTON|A/.test(event.target.tagName))return;const action={ArrowLeft:()=>go(page+1),PageDown:()=>go(page+1),ArrowRight:()=>go(page-1),PageUp:()=>go(page-1),Home:()=>go(1),End:()=>go(config.pageCount)}[event.key];if(action){event.preventDefault();action();}});
window.addEventListener('hashchange',()=>go(fromHash(),false));
let resizeTimer;new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>renderOriginal(),150);}).observe(document.querySelector('.reader-original'));
const loading=getDocument({url:config.pdfUrl+'?sha='+config.sourceSha256,cMapUrl:new URL('./vendor/pdfjs/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/pdfjs/standard_fonts/',import.meta.url).href,wasmUrl:new URL('./vendor/pdfjs/wasm/',import.meta.url).href,isEvalSupported:false,enableXfa:false,disableAutoFetch:true,disableStream:true,rangeChunkSize:262144});
loading.onProgress=event=>{if(event.total){progress.value=Math.min(100,event.loaded/event.total*100);progress.setAttribute('aria-valuetext',`${fa(Math.round(progress.value))} درصد`);}};
Promise.all([loading.promise,fetch(config.translationUrl).then(response=>{if(!response.ok)throw Error('translation unavailable');return response.json();})]).then(([document,data])=>{
 if(data.source?.sha256!==config.sourceSha256||document.numPages!==config.pageCount||data.pages?.length!==config.pageCount)throw Error('source/translation identity mismatch');
 pdf=document;payload=data;progress.hidden=true;
 for(const option of picker.options){const record=data.pages[Number(option.value)-1];const heading=record.blocks.find(b=>b.kind==='heading')?.fa||record.blocks.find(b=>b.kind!=='not_visible'&&b.fa)?.fa?.split('\n').find(s=>!/^https?:/.test(s))||'';option.textContent=fa(Number(option.value))+(heading?' · '+heading.slice(0,100):'');}
 go(page,false);
}).catch(()=>{progress.hidden=true;message('اصل و ترجمهٔ تطبیق‌داده‌شده بارگیری نشدند؛ پیوند دریافت PDF اصلی همچنان در دسترس است.',true);});
window.addEventListener('pagehide',event=>{if(event.persisted)return;closed=true;serial++;clearTimeout(resizeTimer);task?.cancel();loading.destroy().catch(()=>{});});
window.sourceSlideReader={get page(){return page;},get renderedPage(){return renderedPage;},get pageCount(){return config.pageCount;},get sourceSha256(){return config.sourceSha256;},get ready(){return Boolean(pdf&&payload&&renderedPage===page);}};
controls();
