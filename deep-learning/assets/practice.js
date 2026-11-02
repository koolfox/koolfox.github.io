import {mountNotebook} from './notebook.js';
import {runAttentionGPU} from './webgpu-attention.js';
import {renderNotebookResult} from './notebook-results.js';

const base = JSON.parse(document.querySelector('#practice-config').textContent);
const requestedPage=Number(new URLSearchParams(location.search).get('source-page'));
const returnPage=Number.isInteger(requestedPage)&&requestedPage>0&&requestedPage<=base.source_page_count?requestedPage:base.source_page;
const config={...base,...base.page_notebooks?.find(example=>example.pages.includes(returnPage))};
document.querySelector('#practice-config').textContent=JSON.stringify(config);
if(config.title)document.querySelector('.practice-page>header h1').textContent=config.title;
let gpuGeneration=0;
const gpuPanel=document.createElement('section');gpuPanel.className='nb-gpu';gpuPanel.hidden=true;
function compareGPU(record){
  const generation=++gpuGeneration;gpuPanel.replaceChildren();gpuPanel.hidden=true;window.attentionGPUResult=null;
  if(config.key!=='spring-2026/s13'||!record?.ok)return;
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
function section() { if (location.hash === '#questions') book.showQuiz(); else book.showCode(); }
section(); window.addEventListener('hashchange', section);
const returnLink=document.querySelector('[data-return-slide]');returnLink.href=config.reader+'#page='+returnPage;
returnLink.addEventListener('click', event => { if (parent !== window) { event.preventDefault(); goToSource(returnPage,true); } });
for (const lab of config.related_labs) {
  const link = document.createElement('a'); link.textContent = 'آزمایش زندهٔ مرتبط';
  link.href = lab.url;if(requestedPage>0){const url=new URL(link.href);url.searchParams.set('page',returnPage);link.href=url.href;}
  link.title = lab.goal_fa; link.target = '_top'; document.querySelector('[data-related-labs]').append(link);
}
