import {mountNotebook} from './notebook.js';
import {runAttentionGPU} from './webgpu-attention.js';
import {renderNotebookResult} from './notebook-results.js';

const base = JSON.parse(document.querySelector('#practice-config').textContent);
const requestedPage=Number(new URLSearchParams(location.search).get('source-page'));
const returnPage=Number.isInteger(requestedPage)&&requestedPage>0&&requestedPage<=base.source_page_count?requestedPage:base.source_page;
const example=base.page_notebooks?.find(example=>example.pages.includes(returnPage));
const pageQuestions=base.page_questions?.find(item=>item.pages.includes(returnPage));
const pageState=base.page_activity_states?.find(item=>item.number===returnPage);
const config={...base,...example};
if(pageState){
  const questions=requestedPage?(pageQuestions?.questions||[]):config.questions;
  config.questions=questions.filter((question,index)=>questions.findIndex(other=>other.prompt===question.prompt&&JSON.stringify(other.options)===JSON.stringify(question.options))===index);
  config.tip=example?.tip||(!requestedPage?base.tip:null);
  config.codeAvailable=Boolean(example)||!requestedPage;
  if(!example)config.key=base.key+'/page-'+returnPage;
}
document.querySelector('#practice-config').textContent=JSON.stringify(config);
if(config.title)document.querySelector('.practice-page>header h1').textContent=config.title;
let gpuGeneration=0;
const gpuPanel=document.createElement('section');gpuPanel.className='nb-gpu';gpuPanel.hidden=true;
function compareGPU(record){
  const generation=++gpuGeneration;gpuPanel.replaceChildren();gpuPanel.hidden=true;window.attentionGPUResult=null;
  if(!(config.key==='spring-2026/s13'||config.key.startsWith('spring-2026/s13/'))||!record?.ok)return;
  const python=record.outputs?.at(-1)?.result;if(!python?.gpu_inputs)return;
  gpuPanel.hidden=false;
  const button=document.createElement('button'),status=document.createElement('p'),output=document.createElement('div');
  button.type='button';button.textContent='مقابله با WebGPU';button.dataset.runAttentionGpu='';
  status.className='nb-status';status.setAttribute('role','status');
  status.textContent='همین پرس‌وجو، کلیدها و مقدارها با float32 محاسبه و با خروجی پایتون مقایسه می‌شوند.';
  gpuPanel.append(button,status,output);
  button.addEventListener('click',async()=>{
    button.disabled=true;status.textContent='در حال اجرای WebGPU…';
    try{
      const gpu=await runAttentionGPU(python.gpu_inputs);if(generation!==gpuGeneration)return;
      let maximumError=0,matched=true;
      for(const key of ['scores','weights','output']){
        if(!Array.isArray(python[key])||python[key].length!==gpu[key].length)throw Error('شکل خروجی پایتون با مثال توجه سازگار نیست.');
        gpu[key].forEach((value,i)=>{const error=Math.abs(value-python[key][i]);maximumError=Math.max(maximumError,error);if(error>5e-5*(1+Math.abs(python[key][i])))matched=false;});
      }
      const result={...gpu,maximum_absolute_error:maximumError,matched_python:matched};
      window.attentionGPUResult=result;renderNotebookResult(output,result);
      status.textContent=matched?`اجرای WebGPU${gpu.fallback?' با آداپتور نرم‌افزاری':''} با خروجی پایتون در دقت float32 سازگار است.`:'نتیجهٔ WebGPU با خروجی پایتون سازگار نیست؛ مقدارها را بررسی کن.';
      status.dataset.error=String(!matched);
    }catch(error){if(generation===gpuGeneration){status.textContent=error.message;status.dataset.error='true';}}
    finally{if(generation===gpuGeneration)button.disabled=false;}
  });
}
function goToSource(page,showSlides=false) {
  if (parent !== window) parent.postMessage({type: 'danna-source-page', page,showSlides}, location.origin);
  else location.href = config.reader + '#page=' + page;
}
const book = mountNotebook(document.querySelector('#practice-notebook'), {
  ...config, goToSource,
  onExecution:compareGPU,
  getFiles() { return {'starter.py': config.starter, 'source-reference.json': JSON.stringify({source_url: config.source_url, source_sha256: config.source_sha256, starter_sha256: config.starter_sha256,source_page:returnPage,example:config.key}, null, 2)}; },
});
document.querySelector('#practice-notebook .nb-cells').before(gpuPanel);
book.setReady(true); window.studentNotebook = book;
if(config.key==='spring-2026/s05/source-convolution'&&config.starter_sha256==='6b411c2a1e630fb97e8f78a871b7ec0c464417f57db0a5bccfe1164ba262fe7c'&&config.cells.length===3&&config.cells.map(cell=>cell.source).join('')===config.starter){
  // The film illustrates the same calculation with different code; links are by topic.
  const root=document.querySelector('#practice-notebook'),list=root.querySelector('.nb-cells');
  const panel=document.createElement('details'),summary=document.createElement('summary');
  const note=document.createElement('p'),frame=document.createElement('iframe');
  panel.className='nb-film';summary.textContent='فیلم و بخش مرتبط کد';
  note.className='nb-film-note';note.setAttribute('role','status');note.setAttribute('aria-live','polite');
  frame.title='فیلم کد کانولوشن';frame.dataset.notebookFilm='';frame.loading='lazy';frame.allowFullscreen=true;
  panel.append(summary,note,frame);list.before(panel);
  const relatedCells=[0,0,1,1,2],relatedChapters=[0,2,4];
  let pendingChapter=null;
  const unchanged=()=>{const cells=book.cells;return cells.length===config.cells.length&&cells.every((cell,index)=>cell.source===config.cells[index].source);};
  function updateLinks(){
    const enabled=unchanged();
    note.textContent=enabled?'بخش‌های فیلم به سلول‌های مرتبط اشاره می‌کنند.':'کد تغییر کرده؛ پرش به بخش مرتبط تا بازگرداندن کد اولیه غیرفعال است.';
    for(const cell of list.querySelectorAll('[data-notebook-cell]')){
      const index=Number(cell.dataset.notebookCell),bar=cell.querySelector('.nb-cell-bar');
      if(!bar||!Number.isInteger(index)||index>=relatedChapters.length)continue;
      let button=bar.querySelector('[data-film-jump]');
      if(!button){button=document.createElement('button');button.type='button';button.dataset.filmJump=String(index);button.textContent='بخش مرتبط فیلم';
        button.setAttribute('aria-label',`بخش مرتبط فیلم برای سلول ${index+1}`);
        button.addEventListener('click',()=>{if(!unchanged())return;pendingChapter=relatedChapters[index];panel.open=true;loadFilm();sendPending();});bar.append(button);}
      button.disabled=!enabled;
      if(!enabled)cell.removeAttribute('data-film-related');
    }
  }
  function sendPending(){
    if(pendingChapter===null||!frame.dataset.loaded||!unchanged())return;
    frame.contentWindow.postMessage({type:'danna-film-seek',film:'convolution-code',chapter:pendingChapter},location.origin);
    pendingChapter=null;
  }
  function loadFilm(){if(!frame.getAttribute('src')){delete frame.dataset.loaded;frame.src='/deep-learning/animations/convolution-code/?notebook=1';}}
  panel.addEventListener('toggle',()=>{if(panel.open)loadFilm();});
  frame.addEventListener('load',()=>{if(frame.getAttribute('src')){frame.dataset.loaded='true';sendPending();}});
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=='danna-film-chapter'||event.data.film!=='convolution-code'||!Number.isInteger(event.data.chapter)||event.data.chapter<0||event.data.chapter>=relatedCells.length||!unchanged())return;
    const index=relatedCells[event.data.chapter],cell=list.querySelector(`[data-notebook-cell="${index}"]`);if(!cell)return;
    for(const item of list.querySelectorAll('[data-film-related]'))item.removeAttribute('data-film-related');
    cell.dataset.filmRelated='';note.textContent=`بخش مرتبط: سلول ${index+1}`;
    list.scrollTo({top:cell.offsetTop-list.offsetTop,behavior:'auto'});
  });
  new MutationObserver(updateLinks).observe(list,{childList:true});
  list.addEventListener('input',()=>queueMicrotask(updateLinks));
  updateLinks();
}
const lessonOneFilm=config.key==='spring-2026/s01/boundary-functions'?{id:'capacity-boundary',title:'فیلم مرز تصمیم و ظرفیت مدل',summary:'فیلم مرز تصمیم'}:config.key==='spring-2026/s01/training-validation'?{id:'train-test',title:'فیلم آموزش و آزمون',summary:'فیلم آموزش و آزمون'}:null;
if(lessonOneFilm){
  const root=document.querySelector('#practice-notebook'),cells=root.querySelector('.nb-cells');
  const panel=document.createElement('details'),summary=document.createElement('summary');
  const note=document.createElement('p'),frame=document.createElement('iframe');
  panel.className='nb-film';summary.textContent=lessonOneFilm.summary;note.className='nb-film-note';note.setAttribute('role','status');
  frame.title=lessonOneFilm.title;frame.dataset.lessonOneFilm=lessonOneFilm.id;if(lessonOneFilm.id==='capacity-boundary')frame.dataset.capacityFilm='';frame.loading='lazy';frame.allowFullscreen=true;
  const update=()=>{const current=book.cells,unchanged=current.length===config.cells.length&&current.every((cell,index)=>cell.source===config.cells[index].source);note.textContent=lessonOneFilm.id==='train-test'?'فیلم روند آموزش و آزمون را نشان می‌دهد؛ اعداد دفترچه نمونه‌اند.':unchanged?'اعداد فیلم برای ضرایب اولیه دفترچه هستند.':'کد تغییر کرده؛ اعداد فیلم مربوط به ضرایب اولیه‌اند.';};
  panel.append(summary,note,frame);cells.before(panel);panel.addEventListener('toggle',()=>{if(panel.open&&!frame.getAttribute('src'))frame.src=`/deep-learning/animations/${lessonOneFilm.id}/?notebook=1`;});
  cells.addEventListener('input',()=>queueMicrotask(update));new MutationObserver(update).observe(cells,{childList:true});update();
}
const returnLink=document.querySelector('[data-return-slide]');returnLink.href=config.reader+'#page='+returnPage;
const practiceFooter=returnLink.parentElement, utilityTools=document.querySelector('.nb-utility-tools');
function placeReturnLink(quiz) {
  (quiz ? practiceFooter : utilityTools).append(returnLink);
  practiceFooter.hidden = !quiz;
}
function section() {
  const quiz = location.hash === '#questions' || config.codeAvailable === false;
  if (quiz) book.showQuiz(); else book.showCode();
  placeReturnLink(quiz);
}
document.querySelector('[role="tab"][id$="-tab-code"]').addEventListener('click',()=>placeReturnLink(false));
document.querySelector('[role="tab"][id$="-tab-quiz"]').addEventListener('click',()=>placeReturnLink(true));
section(); window.addEventListener('hashchange', section);
returnLink.addEventListener('click', event => { if (parent !== window) { event.preventDefault(); goToSource(returnPage,true); } });
for (const lab of config.related_labs) {
  const link = document.createElement('a'); link.textContent = 'آزمایش زندهٔ مرتبط';
  link.href = lab.url;if(requestedPage>0){const url=new URL(link.href);url.searchParams.set('page',returnPage);link.href=url.href;}
  link.title = lab.goal_fa; link.target = '_top'; document.querySelector('[data-related-labs]').append(link);
}
