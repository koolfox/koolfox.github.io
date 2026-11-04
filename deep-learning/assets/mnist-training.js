import{loadMnistSubset,createMnistTrainer}from'./mnist-training-runtime.js';
const $=selector=>document.querySelector(selector),fmt=new Intl.NumberFormat('fa-IR',{maximumFractionDigits:3});
let data,trainer,selected=0,baseline,views,working=false,running=false,leaving=false,controller,codeLoaded=false,browsePage=0;
const axisFmt=new Intl.NumberFormat('fa-IR',{maximumFractionDigits:1});
function node(tag,text,attributes={}){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;for(const[k,v]of Object.entries(attributes))e.setAttribute(k,v);return e;}
function fail(cause){$('[data-error]').hidden=false;$('[data-error]').textContent=cause.name==='AbortError'?'آماده‌سازی لغو شد.':cause.message||'آموزش انجام نشد؛ از نو تلاش کن.';}
function settings(){return{activation:$('[name=activation]').value,learningRate:Number($('[name=learningRate]').value),batchSize:Number($('[name=batchSize]').value),backend:$('[name=backend]').value};}
function updateControls(){
 $('[data-load]').hidden=Boolean(trainer);$('[data-load]').disabled=working;
 for(const key of['start','step','reset','save'])$(`[data-${key}]`).disabled=!trainer||working||running;
 $('[data-pause]').textContent=running||trainer?'مکث':'لغو';$('[data-pause]').hidden=!working&&!running;$('[data-pause]').disabled=working&&!running&&Boolean(trainer);
 $('[data-settings]').disabled=working||running;
 for(const digit of document.querySelectorAll('.mnist-digit'))digit.disabled=working||running||!trainer;
}
function image(canvas,index){const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(28,28),offset=index*784;for(let i=0;i<784;i++){pixels.data[i*4]=pixels.data[i*4+1]=pixels.data[i*4+2]=data.pixels[offset+i];pixels.data[i*4+3]=255;}ctx.putImageData(pixels,0,0);}
function digit(index,label,prediction,validation=false,validationIndex=0){
 const button=node(validation?'button':'figure',undefined,{class:'mnist-digit'}),canvas=node('canvas',undefined,{width:'28',height:'28',role:'img','aria-label':`رقم ${label}`});image(canvas,index);button.append(canvas,node('span',`برچسب ${fmt.format(label)}`));
 if(prediction!==undefined){button.append(node('span',`پیش‌بینی ${fmt.format(prediction)}`,{class:'mnist-prediction'}));button.dataset.correct=String(prediction===label);}
 if(validation){button.setAttribute('aria-pressed',String(validationIndex===selected));button.addEventListener('click',async()=>{selected=validationIndex;if(!working){working=true;updateControls();try{await refresh();}catch(error){fail(error);}finally{working=false;updateControls();}}});}
 return button;
}
function heat(canvas,values,width,height,channels,channel,diverging=false,globalMax=1){
 const context=canvas.getContext('2d'),out=context.createImageData(width,height);let lo=Infinity,hi=-Infinity;for(let i=0;i<width*height;i++){const v=values[i*channels+channel];lo=Math.min(lo,v);hi=Math.max(hi,v);}
 for(let i=0;i<width*height;i++){const value=values[i*channels+channel];let r,g,b;if(diverging){const strength=Math.min(1,Math.abs(value)/Math.max(globalMax,1e-12));[r,g,b]=value>=0?[255-218*strength,255-156*strength,255-20*strength]:[255-80*strength,255-155*strength,255-235*strength];}else r=g=b=255*(value-lo)/Math.max(hi-lo,1e-12);out.data.set([r,g,b,255],i*4);}context.putImageData(out,0,0);canvas.title=`min ${lo.toFixed(4)} / max ${hi.toFixed(4)}`;
}
function chart(target,training,validation,maximum){
 const svg=$(target);svg.replaceChildren();const create=(tag,attributes,text)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attributes))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;svg.append(e);return e;};
 const last=Math.max(1,trainer?.state.step||1),x=value=>34+value/last*274,y=value=>126-value/maximum*112;
 create('path',{d:'M34 10V126H308',fill:'none',stroke:'var(--line)'});
 for(const value of[0,maximum/2,maximum])create('text',{x:29,y:y(value)+3,'text-anchor':'end',fill:'var(--muted)','font-size':10},axisFmt.format(value));
 create('text',{x:34,y:143,'text-anchor':'middle',fill:'var(--muted)','font-size':10},'۰');create('text',{x:300,y:143,'text-anchor':'end',fill:'var(--muted)','font-size':10},`دسته ${fmt.format(last)}`);
 for(const[points,color]of[[training,'var(--accent)'],[validation,'var(--warning)']]){
  if(points.length>1)create('path',{d:points.map((p,i)=>`${i?'L':'M'}${x(p.step).toFixed(2)},${y(p.value).toFixed(2)}`).join(' '),fill:'none',stroke:color,'stroke-width':1.6,'data-points':points.length});
  if(points.length&&(points.length===1||color==='var(--warning)'))for(const p of points)create('circle',{cx:x(p.step),cy:y(p.value),r:2.5,fill:color});
 }
}
function updateHistory(){
 const body=$('[data-history-rows]');if(!trainer||!baseline){body.replaceChildren();return;}
 const state=trainer.state,validations=new Map(state.epochs.map(value=>[value.step,value]));
 const rows=[{step:0,validationLoss:baseline.loss,validationAccuracy:baseline.accuracy},...state.history.map(value=>({...value,...validations.get(value.step)}))];
 if(body.children.length>rows.length)body.replaceChildren();
 for(const row of rows.slice(body.children.length)){const tr=node('tr');for(const value of [row.step,row.loss,row.accuracy,row.validationLoss,row.validationAccuracy]){const cell=node('td',value===undefined?'—':String(value));cell.dir='ltr';tr.append(cell);}body.append(tr);}
}
function updateBrowse(){
 const grid=$('[data-browse-digits]'),split=$('[data-browse-split]').value;
 grid.replaceChildren();if(!data)return;
 const count=split==='train'?data.manifest.train_count:data.manifest.validation_count,offset=split==='train'?0:data.manifest.train_count,pageSize=32;
 const pages=Math.ceil(count/pageSize);browsePage=Math.max(0,Math.min(browsePage,pages-1));
 for(let i=browsePage*pageSize;i<Math.min((browsePage+1)*pageSize,count);i++)grid.append(digit(offset+i,data.labels[offset+i]));
 $('[data-browse-page]').textContent=`صفحه ${fmt.format(browsePage+1)} از ${fmt.format(pages)}`;
 $('[data-browse-previous]').disabled=browsePage===0;$('[data-browse-next]').disabled=browsePage===pages-1;
}
async function refresh(){
 if(!trainer||leaving)return;views=await trainer.view(selected);const state=trainer.state;const latest=state.history.at(-1),validation=state.epochs.at(-1);
 for(const[key,value]of[['batches',state.step],['epochs',state.epoch],['loss',latest?.loss],['accuracy',validation?.validationAccuracy??baseline?.accuracy]]){const out=$(`[data-${key}]`);out.textContent=value===undefined?'—':fmt.format(key==='accuracy'?value*100:value)+(key==='accuracy'?'٪':'');out.dataset.value=value??'';}
 const valLoss=[{step:0,value:baseline.loss},...state.epochs.map(e=>({step:e.step,value:e.validationLoss}))],trainLoss=state.history.map(e=>({step:e.step,value:e.loss}));chart('[data-loss-chart]',trainLoss,valLoss,Math.max(.1,...valLoss.map(p=>p.value),...trainLoss.map(p=>p.value))*1.05);
 chart('[data-accuracy-chart]',state.history.map(e=>({step:e.step,value:e.accuracy*100})),[{step:0,value:baseline.accuracy*100},...state.epochs.map(e=>({step:e.step,value:e.validationAccuracy*100}))],100);
 const strip=$('[data-strip]'),gallery=$('[data-validation-digits]');strip.replaceChildren();gallery.replaceChildren();
 views.gallery.forEach((index,position)=>{const probabilities=views.predictions.slice(position*10,(position+1)*10),prediction=probabilities.indexOf(Math.max(...probabilities)),label=data.labels[2000+index];gallery.append(digit(2000+index,label,prediction,true,index));if(position%2===0&&position<16)strip.append(digit(2000+index,label,prediction,true,index));});
 image($('[data-selected]'),2000+views.selected);const position=views.gallery.indexOf(views.selected),row=views.predictions.slice(position*10,(position+1)*10),pred=row.indexOf(Math.max(...row));$('[data-selected-caption]').textContent=`برچسب: ${fmt.format(data.labels[2000+views.selected])} · پیش‌بینی: ${fmt.format(pred)} · احتمال: ${fmt.format(Math.max(...row)*100)}٪`;
 const features=$('[data-features]'),filters=$('[data-filters]');features.replaceChildren();filters.replaceChildren();const weightMax=Math.max(...views.weights.map(Math.abs));
 for(let channel=0;channel<8;channel++){const canvas=node('canvas',undefined,{width:28,height:28,role:'img','aria-label':`نقشهٔ ویژگی ${channel+1}`});heat(canvas,views.features,28,28,8,channel);features.append(canvas);const filter=node('canvas',undefined,{width:3,height:3,role:'img','aria-label':`فیلتر ${channel+1}`});heat(filter,views.weights,3,3,8,channel,true,weightMax);filters.append(filter);}
 const batch=$('[data-training-digits]');batch.replaceChildren();for(const index of state.batchIndices||[])batch.append(digit(index,data.labels[index]));if(!state.batchIndices)$('[data-batch-info]').textContent='اولین دسته با «یک دسته» یا «شروع» نمایش داده می‌شود.';else $('[data-batch-info]').textContent=`دستهٔ ${fmt.format(state.step)} · ${fmt.format(state.batchIndices.length)} تصویر آموزش`;
 $('[data-backend]').textContent=`${state.backend.backend==='webgpu'?'WebGPU':'CPU (انتخاب‌شده)'} · ${[state.backend.vendor,state.backend.architecture].filter(Boolean).join(' / ')} · ${fmt.format(state.parameters)} پارامتر`;
 if($('[data-history]').open)updateHistory();
}
async function initialize(){
 working=true;controller=new AbortController();$('[data-error]').hidden=true;$('[data-status]').textContent='آماده‌سازی داده و مدل…';updateControls();
 try{if(trainer){trainer.dispose();trainer=null;updateControls();}if(!data)data=await loadMnistSubset({signal:controller.signal});trainer=await createMnistTrainer(data,settings(),{signal:controller.signal});if(leaving){trainer.dispose();trainer=null;return;}selected=trainer.gallery[0];baseline=await trainer.evaluate();$('[data-history-rows]').replaceChildren();updateBrowse();await refresh();$('[data-status]').textContent='آماده است؛ شروع یا یک دسته را انتخاب کن.';}
 catch(error){fail(error);$('[data-status]').textContent='آماده‌سازی کامل نشد.';}
 finally{working=false;updateControls();}
}
async function oneBatch(){working=true;updateControls();try{await trainer.step();await refresh();if(!leaving)$('[data-status]').textContent=trainer.state.epochs.at(-1)?.step===trainer.state.step?`دورهٔ ${fmt.format(trainer.state.epoch)} کامل شد.`:'آموزش در حال اجراست.';}finally{working=false;if(leaving){trainer?.dispose();trainer=null;}updateControls();}}
$('[data-load]').addEventListener('click',initialize);$('[data-reset]').addEventListener('click',initialize);
$('[data-step]').addEventListener('click',async()=>{try{await oneBatch();$('[data-status]').textContent='یک دسته آموزش داده شد.';}catch(error){fail(error);}});
$('[data-start]').addEventListener('click',async()=>{
 const epochs=Number($('[name=epochs]').value);if(!Number.isInteger(epochs)||epochs<1||epochs>100){fail(Error('تعداد دوره باید بین ۱ و ۱۰۰ باشد.'));return;}
 $('[data-error]').hidden=true;
 running=true;updateControls();try{while(running&&!leaving&&trainer.state.epoch<epochs){await oneBatch();await new Promise(resolve=>requestAnimationFrame(resolve));}if(!leaving&&trainer)$('[data-status]').textContent=trainer.state.epoch>=epochs?'آموزش دوره‌های انتخاب‌شده تمام شد.':'آموزش مکث شد.';}catch(error){fail(error);}finally{running=false;updateControls();}
});
$('[data-pause]').addEventListener('click',()=>{if(running){running=false;$('[data-status]').textContent='مکث پس از پایان دستهٔ جاری…';}else controller?.abort();updateControls();});
$('[data-settings]').addEventListener('change',event=>{if(trainer&&event.target.name!=='epochs')void initialize();});
$('[data-save]').addEventListener('click',async()=>{if(!trainer)return;const snapshot=await trainer.snapshot();const blob=new Blob([JSON.stringify({...snapshot,view:views,baseline,dataset:{manifest:data.manifest}},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=node('a',undefined,{href:url,download:'mnist-training.json'});link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
for(const button of document.querySelectorAll('[data-tab-button]'))button.addEventListener('click',async()=>{document.body.dataset.tab=button.dataset.tabButton;for(const other of document.querySelectorAll('[data-tab-button]'))other.setAttribute('aria-pressed',String(other===button));if(button.dataset.tabButton==='code'&&!codeLoaded){try{const response=await fetch(new URL('../labs/cnn-mnist/browser_train.py',import.meta.url));if(!response.ok)throw Error('کد بارگیری نشد.');const code=await response.text(),{highlightPythonCode}=await import('./vendor/python-editor/editor.mjs');const holder=$('[data-python-code]');holder.replaceChildren();const sections=code.split(/^# %% (.+)$/m);const setup=node('details'),summary=node('summary','تنظیم محیط و دریافت داده (پیش از سلول‌ها)'),setupCode=node('pre',undefined,{dir:'ltr'});highlightPythonCode(setupCode,sections[0]);setup.append(summary,setupCode);holder.append(setup);for(let i=1;i<sections.length;i+=2){const section=node('section',undefined,{'data-code-cell':''}),title=node('h3',sections[i]),pre=node('pre',undefined,{dir:'ltr'});highlightPythonCode(pre,sections[i+1].trim());section.append(title,pre);holder.append(section);}codeLoaded=true;}catch(error){fail(error);}}});
$('[data-history]').addEventListener('toggle',()=>{if($('[data-history]').open)updateHistory();});
$('[data-browse-split]').addEventListener('change',()=>{browsePage=0;updateBrowse();});
$('[data-browse-previous]').addEventListener('click',()=>{browsePage--;updateBrowse();});
$('[data-browse-next]').addEventListener('click',()=>{browsePage++;updateBrowse();});
window.addEventListener('pageshow',event=>{if(event.persisted){location.reload();return;}leaving=false;});
window.addEventListener('pagehide',()=>{leaving=true;running=false;controller?.abort();if(!working){trainer?.dispose();trainer=null;}});
window.mnistLab={get state(){return trainer?structuredClone(trainer.state):null;},get view(){return views?structuredClone(views):null;},snapshot:()=>trainer?.snapshot()};
updateControls();
