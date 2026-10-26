import {drawPlot,renderTable,colors} from './view.js';
const $=id=>document.getElementById(id),storageKey='structural-code-drafts-v1';
let state=null,mode=null,recipes=null,codeInputs=null,editor=null,worker=null,loadTimer=null,runTimer=null,result=null,busy=false,revision=0;
let records={},storageOK=true;
try{const raw=JSON.parse(localStorage.getItem(storageKey)||'{}');if(raw&&typeof raw==='object'&&!Array.isArray(raw))records=raw;}catch{storageOK=false;}
const siteRoot=new URL('/structural-bioinformatics/',location.href).href;
const fallback={getValue:()=>$('python-source').value,setValue:value=>{$('python-source').value=value;changed();},focus:()=>$('python-source').focus(),error:()=>{}};
function value(){return(editor||fallback).getValue();}
function setSource(source){(editor||fallback).setValue(source);}
function storage(){
 if(!mode)return;
 const entry=records[mode]||{};entry.source=value().slice(0,30000);entry.updated_at_utc=new Date().toISOString();records[mode]=entry;
 try{localStorage.setItem(storageKey,JSON.stringify(records));}catch{storageOK=false;}
 $('code-save-status').textContent=storageOK?'پیش‌نویس این آزمایش در همین مرورگر ذخیره شد.':'ذخیرهٔ پیش‌نویس ممکن نیست؛ کد یا پروندهٔ آزمایش را دریافت کن.';
}
function clearResult(){
 result=null;delete window.structuralCodeResult;$('code-download-result').disabled=true;
 $('code-output').textContent='';$('code-error').textContent='';$('code-comparison').replaceChildren();$('code-table').replaceChildren();$('code-legend').replaceChildren();
 $('code-result-area').hidden=true;(editor||fallback).error(null,'');
}
function changed(){if(busy)stop('کد تغییر کرد و اجرای قبلی متوقف شد.');storage();clearResult();if(!busy)$('code-status').textContent='کد تغییر کرده است؛ برای دیدن نتیجه، آن را اجرا کن.';}
function template(){return '# PARAMETERS BEGIN\nparameters = '+JSON.stringify(state.config,null,4)+'\n# PARAMETERS END\n\n'+recipes[mode].body;}
function parameterTable(){
 const last=result?.parameters;
 renderTable($('code-parameters'),['نام در کد','نوع / واحد','مقدار کنترل‌ها','آخرین اجرای کد','معنی'],recipes[mode].parameters.map(([name,type,meaning])=>[name,type,state.config[name]??'—',last?.[name]??'—',meaning]));
}
function histories(){
 const select=$('code-history');select.replaceChildren();
 const list=records[mode]?.history||[];
 for(let i=0;i<list.length;i++){const option=document.createElement('option');option.value=String(i);option.textContent=`${list[i].at} · ${list[i].ok?'اجرا شد':'خطای کد'}`;select.append(option);}
 $('code-history-load').disabled=!list.length;select.disabled=!list.length;
}
function finish(){
 clearTimeout(loadTimer);clearTimeout(runTimer);worker?.terminate();worker=null;busy=false;
 $('code-run').disabled=!state||Boolean(state.error);$('code-stop').disabled=true;
}
function stop(message='اجرای کد متوقف شد؛ می‌توانی آن را اصلاح و دوباره اجرا کنی.'){
 revision++;finish();$('code-status').textContent=message;
}
function show(data,source,started,controls){
 result={...data,source,mode,source_controls:controls,started_at_utc:started,finished_at_utc:new Date().toISOString()};
 window.structuralCodeResult=result;$('code-result-area').hidden=false;$('code-download-result').disabled=false;
 $('code-output').textContent=(data.stdout||'چیزی با print چاپ نشده است.')+(data.stdout_truncated?'\n… خروجی کنسول به ۲۰هزار نویسه محدود شد.':'');
 $('code-error').textContent=data.error?.traceback||data.stderr||'';
 if(data.ok){
  const metrics=data.result.metrics||{},reference=data.reference?.metrics||{};
  renderTable($('code-comparison'),['کمیت','کد شما','مرجع با همان پارامترها','اختلاف مطلق'],Object.entries(metrics).map(([name,number])=>[name,number,reference[name]??'—',typeof reference[name]==='number'?Math.abs(number-reference[name]):'—']));
  if(!data.reference){const note=document.createElement('p');note.textContent='برای این اجرا مرجع قابل مقایسه نیست؛ بلوک parameters و محدودهٔ مرجع را بررسی کن.';$('code-comparison').append(note);}
  if(data.result.table)renderTable($('code-table'),data.result.table.columns,data.result.table.rows);
  $('code-plot').hidden=!data.result.plot;
  if(data.result.plot){drawPlot($('code-plot'),data.result.plot);(data.result.plot.series||[]).forEach((item,index)=>{const label=document.createElement('span');label.textContent=item.name||'Series';label.style.setProperty('--series-color',colors[index]);label.dataset.dashed=String(index%2===1);$('code-legend').append(label);});}
  $('code-status').textContent='کد اجرا شد. جدول، خروجی شما را با محاسبهٔ مستقل مرجع در همین پارامترها مقایسه می‌کند.';
 }else{
  $('code-plot').hidden=true;(editor||fallback).error(data.error?.line,data.error?.message||'');
  $('code-status').textContent=`${data.error?.type||'Error'}${data.error?.line?' در خط '+data.error.line:''}؛ کد را اصلاح کن و دوباره اجرا کن.`;
 }
 const entry=records[mode]||{};const history=Array.isArray(entry.history)?entry.history:[];
 entry.history=[{source,at:result.finished_at_utc,ok:data.ok,parameters:data.parameters,metrics:data.result?.metrics||{}} ,...history].slice(0,3);records[mode]=entry;storage();histories();parameterTable();
}
function run(){
 if(busy||!state||state.error||!recipes)return;
 const source=value();if(source.length>30000){$('code-status').textContent='کد باید کمتر از ۳۰هزار نویسه باشد.';return;}
 clearResult();busy=true;const controls=structuredClone(state.config);$('code-run').disabled=true;$('code-stop').disabled=false;
 $('code-status').textContent='محیط مستقل Python برای این اجرا آماده می‌شود…';const ticket=++revision,started=new Date().toISOString();
 try{
  // Shinylive's virtual app document cannot fetch this worker entry consistently.
  // Use the same-origin exported host's Worker realm; computation stays in a worker.
  let HostWorker=Worker;try{HostWorker=window.parent.Worker;}catch{}
  worker=new HostWorker(new URL('worker.mjs',import.meta.url),{type:'module'});
 }catch(error){finish();$('code-status').textContent='ساخت محیط اجرای مرورگری ممکن نشد؛ می‌توانی کد را دریافت کنی.';return;}
 loadTimer=setTimeout(()=>stop('دریافت محیط طول کشید؛ اتصال را بررسی و دوباره اجرا کن.'),90000);
 worker.onmessage=({data})=>{
  if(ticket!==revision)return;
  if(data.type==='running'){clearTimeout(loadTimer);$('code-status').textContent='کد در حال اجراست؛ برای متوقف‌کردن از دکمهٔ توقف استفاده کن.';runTimer=setTimeout(()=>stop('اجرا پس از ۵ ثانیه متوقف شد؛ اندازهٔ مسئله یا حلقه را کاهش بده.'),5000);}
  if(data.type==='result'){finish();show(data.value,source,started,controls);}
  if(data.type==='fatal'){finish();$('code-status').textContent='محیط اجرا آماده نشد: '+data.message;}
 };
 worker.onerror=event=>{if(ticket!==revision)return;finish();$('code-status').textContent='اجرای مرورگری به مشکل برخورد: '+(event.message||'دریافت فایل پردازش ممکن نشد');};
 worker.postMessage({siteRoot,source,mode});
}
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function receive(next){
 if(!recipes)return;
 if(next.error){$('code-sync').disabled=true;$('code-run').disabled=busy||mode!==next.mode;$('code-status').textContent='کنترل‌های آزمایش ورودی معتبر ندارند؛ کد قبلی حفظ شده است.';return;}
 if(mode!==next.mode){
  if(mode)storage();if(busy)stop();state=next;mode=next.mode;
  const saved=records[mode]?.source;setSource(typeof saved==='string'&&saved.length<=30000?saved:template());
  $('code-challenge').replaceChildren(...recipes[mode].challenge.split(/(`[^`]+`)/).filter(Boolean).map(part=>{if(part.startsWith('`')){const code=document.createElement('code');code.dir='ltr';code.textContent=part.slice(1,-1);return code;}return document.createTextNode(part);}));histories();clearResult();
 }else state=next;
 $('code-run').disabled=busy||Boolean(state.error);$('code-sync').disabled=Boolean(state.error);$('code-reset').disabled=false;$('code-download-source').disabled=false;parameterTable();
}
export async function setupCodeWorkbench(){
 try{
  const response=await fetch(new URL('assets/course/code-recipes.json',siteRoot));if(!response.ok)throw Error('recipes');recipes=await response.json();
  const inputResponse=await fetch(new URL('assets/course/code-inputs.json',siteRoot));if(!inputResponse.ok)throw Error('inputs');codeInputs=await inputResponse.json();
  $('python-source').addEventListener('input',changed);
  $('code-run').addEventListener('click',run);$('code-stop').addEventListener('click',()=>stop());
  $('code-sync').addEventListener('click',()=>{
   const pattern=/# PARAMETERS BEGIN\n[\s\S]*?\n# PARAMETERS END/;
   if(!pattern.test(value())){$('code-status').textContent='نشانگرهای بلوک parameters پیدا نشد؛ نمونهٔ مرجع را بازگردان یا بلوک را دستی اصلاح کن.';return;}
   setSource(value().replace(pattern,'# PARAMETERS BEGIN\nparameters = '+JSON.stringify(state.config,null,4)+'\n# PARAMETERS END'));
  });
  $('code-reset').addEventListener('click',()=>{if(busy)stop();setSource(template());});
  $('code-history-load').addEventListener('click',()=>{const record=records[mode]?.history?.[Number($('code-history').value)];if(record){if(busy)stop();setSource(record.source);}});
  $('code-download-result').addEventListener('click',()=>{if(result)download(`structural-${mode}-code-experiment.json`,JSON.stringify({...result,notes:{prediction:$('prediction').value,reflection:$('reflection').value}},null,2),'application/json');});
  $('code-download-source').addEventListener('click',()=>{
   const inputs=result?.inputs||codeInputs;
   if(!inputs){$('code-status').textContent='برای دریافت فایل مستقل همراه دادهٔ ورودی، یک بار کد را اجرا کن.';return;}
   const prefix='# Requires Python 3.12+ and NumPy 2.x. Input: curated 1UBQ C-alpha coordinates.\nimport json\ninputs = json.loads('+JSON.stringify(JSON.stringify(inputs))+')\n\n';
   const suffix='\n\nif __name__ == "__main__":\n    print(json.dumps(globals().get("result"), indent=2, default=lambda v: v.tolist()))\n';
   download(`structural-${mode}-experiment.py`,prefix+value()+suffix,'text/x-python');
  });
  const script=document.createElement('script');script.src=new URL('assets/vendor/code-editor/editor.js',siteRoot);script.onload=()=>{editor=window.StructuralCodeEditor.create($('code-editor'),$('python-source').value,{onChange:changed,onRun:run});$('python-source').hidden=true;};script.onerror=()=>{$('code-editor-help').textContent='ویرایشگر ساده فعال است؛ کد و اجرای آن همچنان در دسترس‌اند.';};document.head.append(script);
  const queued=window.structuralLabState;if(queued)await receive(queued);
  try{if(window.parent.location.hash==='#code-workbench')$('code-workbench').scrollIntoView({block:'start'});}catch{}
  addEventListener('structural-experiment',event=>void receive(event.detail));
  new ResizeObserver(()=>{if(result?.ok&&result.result.plot)drawPlot($('code-plot'),result.result.plot);}).observe($('code-workbench'));
  window.structuralCodeWorkbench={run,stop,getSource:value,setSource};
 }catch(error){$('code-status').textContent='دریافت کد نمونه ممکن نشد؛ صفحه را دوباره بارگذاری کن.';}
}
