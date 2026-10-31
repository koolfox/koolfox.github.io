import {runApp} from './shinylive/shinylive.js';
const lab=document.body.dataset.lab,$=s=>document.querySelector(s),editor=$('#source-code'),picker=$('#code-section'),status=$('[data-host-status]');
const key=`deep-learning:workspace:v1:${lab}`;
const topicSets={
 'neuron-xor':[['تنظیمات و چرخهٔ آموزش','experiment.py','CONFIG','مقدار آغازین و تعداد دوره را اینجا عوض کن. برای مقایسه، seed را ثابت نگه دار.'],['عبور نورون','logic_gates.py','def forward','جمع وزن‌دار و سیگموید خروجی را می‌سازند. برای تغییر تابع، مشتق آن در gradients را هم سازگار کن.'],['گرادیان و گام وزن‌ها','logic_gates.py','def gradients','delta = p − y مشتق BCE و سیگموید است. step وزن و بایاس را در خلاف گرادیان جابه‌جا می‌کند.'],['قاعدهٔ پرسپترون','live_training.py','def step','در شاخهٔ else، خطای برچسب برای هر نمونه وزن‌ها را تغییر می‌دهد؛ این بخش لایهٔ پنهان ندارد.']],
 'network-playground':[['تنظیمات و چرخهٔ آموزش','experiment.py','CONFIG','هر کنترل یک ورودی به create_run است. [] در hidden یعنی هیچ لایهٔ پنهانی نداریم.'],['عبور رو به جلو','network_playground.py','def forward','forward مقدار هر لایه و logit را می‌سازد. خروجی آخر سیگموید است؛ توابع پنهان از activation می‌آیند.'],['زیان و گرادیان','network_playground.py','def loss_gradient','زیان BCE پایدار و مشتق‌های پس‌انتشار در همین تابع‌اند. هنگام تغییر فعال‌سازی، مشتقِ شاخهٔ متناظر را هم تغییر بده.'],['گام وزن‌ها؛ SGD و Adam','network_playground.py','def _update','value = parameter − learning_rate × step گام واقعی است. تغییر علامت، جهت حرکت را عوض می‌کند.'],['ساخت داده و ویژگی‌ها','network_playground.py','def features','ویژگی را از مختصات می‌سازیم؛ تغییر بازنمایی می‌تواند بدون لایهٔ پنهان هم مرز تازه‌ای بسازد.']],
 'convolution':[['تنظیمات و ترتیب عملیات','experiment.py','CONFIG','ابتدا فیلتر، سپس ReLU و بعد pooling اجرا می‌شود. عوض‌کردن ترتیب، محاسبه را عوض می‌کند.'],['جمع ضرب‌ها و حاشیه','convolution_lab.py','def correlate','value × weight سهم یک ورودی است؛ جمع سهم‌ها با bias یک خانهٔ خروجی را می‌سازد.'],['بیشینه و میانگین‌گیری','convolution_lab.py','def pool','هر پنجرهٔ ۲×۲ را به بیشینه یا میانگین تبدیل می‌کند؛ پنجرهٔ ناقص انتهایی کنار گذاشته می‌شود.'],['ساخت تصویر مصنوعی','convolution_lab.py','def pattern','این تصویر از عددها ساخته شده؛ دادهٔ واقعی یا شبکهٔ آموزش‌دیده نیست.']]
};
let original=[],files=[],selection='',stored={},ready=false,wasReady=false,deadline,interval;
const topics=topicSets[lab];
function message(text,error=false){status.textContent=text;status.dataset.error=String(error);}
function readStorage(){try{const r=JSON.parse(sessionStorage.getItem(key)||'{}');if(r&&typeof r==='object'&&!Array.isArray(r))return r;}catch{}return {};}
function save(){try{sessionStorage.setItem(key,JSON.stringify(stored));return true;}catch{message('ذخیرهٔ موقت در این مرورگر ممکن نیست؛ پیش از بستن صفحه، فایل کد را دریافت کن.',true);return false;}}
function currentFile(){return files.find(f=>f.name===selection);}
function changedFiles(){return Object.fromEntries(files.filter(f=>f.type==='text'&&f.content!==original.find(o=>o.name===f.name)?.content).map(f=>[f.name,f.content]));}
function persist(){if(currentFile())currentFile().content=editor.value;stored.drafts=changedFiles();stored.topic=picker.value;stored.codeOpen=!$('.code-panel').hidden;stored.scroll=editor.scrollTop;save();}
function lines(){const count=editor.value.split('\n').length;$('[data-lines]').textContent=Array.from({length:count},(_,i)=>i+1).join('\n');$('[data-lines]').scrollTop=editor.scrollTop;}
function showCode(open,focus=true){$('.code-panel').hidden=!open;$('.host-layout').classList.toggle('code-open',open);$('[data-code-toggle]').setAttribute('aria-expanded',String(open));stored.codeOpen=open;save();if(open){try{liveFrame()?.contentDocument.getElementById('pause')?.click();}catch{}}if(open)requestAnimationFrame(()=>{editor.scrollTop=Number(editor.dataset.targetScroll||0);$('[data-lines]').scrollTop=editor.scrollTop;});if(focus&&open&&editor.disabled===false)picker.focus();else if(focus&&!open)$('[data-code-toggle]').focus();}
function selectTopic(scroll=true){
 const t=topics[Number(picker.value)||0];selection=t[1];editor.value=currentFile().content;$('[data-code-file]').textContent=selection;$('[data-code-explanation]').textContent=t[3];lines();
 if(scroll){const pos=editor.value.indexOf(t[2]);const line=editor.value.slice(0,Math.max(0,pos)).split('\n').length;editor.dataset.targetScroll=String(Math.max(0,(line-3)*22));if(!$('.code-panel').hidden){editor.scrollTop=Number(editor.dataset.targetScroll);$('[data-lines]').scrollTop=editor.scrollTop;}}
}
function liveFrame(){return [...document.querySelectorAll('.shinylive-viewer iframe')][0];}
function liveState(){try{const w=liveFrame()?.contentWindow;return w?.dannaLab?.state||w?.dannaNetwork?.state||w?.dannaConvolution||null;}catch{return null;}}
function restart(paused=false){persist();stored.applied=changedFiles();stored.paused=paused;stored.codeOpen=!$('.code-panel').hidden;if(save())location.reload();}
function python(value){if(value===null)return 'None';if(value===true)return 'True';if(value===false)return 'False';if(typeof value==='number'&&Number.isFinite(value))return String(value);if(typeof value==='string')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(python).join(', ')+']';throw Error('مقدار تنظیم قابل تبدیل نیست.');}
function capture(){
 const config=liveState()?.config;if(!config)throw Error('اجرای معتبری برای دریافت تنظیمات نیست؛ ابتدا خطای کد یا ورودی را برطرف کن.');
 persist();const file=files.find(f=>f.name==='experiment.py'),a='# BEGIN CONFIG',b='# END CONFIG';
 if(file.content.split(a).length!==2||file.content.split(b).length!==2||file.content.indexOf(b)<file.content.indexOf(a))throw Error('نشان‌های BEGIN CONFIG و END CONFIG را در experiment.py نگه دار؛ کد تغییر نکرد.');
 const comments=Object.fromEntries(file.content.split('\n').flatMap(line=>{const m=line.match(/^\s*"([a-z_]+)"\s*:.*?,\s*(#.*)$/);return m?[[m[1],m[2]]]:[];}));
 const configCode='CONFIG = {\n'+Object.entries(config).map(([k,v])=>`    ${JSON.stringify(k)}: ${python(v)},${comments[k]?'  '+comments[k]:''}`).join('\n')+'\n}\n';
 file.content=file.content.slice(0,file.content.indexOf(a))+a+'\n'+configCode+file.content.slice(file.content.indexOf(b));picker.value='0';selectTopic();persist();message('تنظیمات فعلی به CONFIG منتقل شد؛ کد توابع دیگر حفظ شد. برای اعمال، اجرای کد را بزن.');
}
function download(){persist();const blob=new Blob([currentFile().content],{type:'text/x-python;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=selection;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function showConsole(){document.body.classList.toggle('show-console');$('[data-console-toggle]').setAttribute('aria-pressed',String(document.body.classList.contains('show-console')));const terminal=$('.shinylive-terminal');if(terminal){terminal.inert=!document.body.classList.contains('show-console');terminal.setAttribute('aria-hidden',String(terminal.inert));}}
$('[data-code-toggle]').addEventListener('click',()=>showCode($('.code-panel').hidden));$('[data-code-close]').addEventListener('click',()=>showCode(false));$('[data-console-toggle]').addEventListener('click',showConsole);
$('[data-stop]').addEventListener('click',()=>restart(true));
$('[data-apply]').addEventListener('click',()=>restart(false));
$('[data-capture]').addEventListener('click',()=>{try{capture();}catch(e){message(e.message,true);}});
$('[data-download]').addEventListener('click',download);
$('[data-reset]').addEventListener('click',()=>{currentFile().content=original.find(f=>f.name===selection).content;editor.value=currentFile().content;lines();persist();message('این فایل به کد اولیه برگشت؛ برای تغییر نتیجه، اجرای کد را بزن.');});
picker.addEventListener('change',()=>{persist();selectTopic();stored.topic=picker.value;save();});
editor.addEventListener('input',()=>{lines();persist();$('[data-code-state]').textContent='کد تغییر کرده؛ هنوز اجرا نشده';});editor.addEventListener('scroll',()=>{$('[data-lines]').scrollTop=editor.scrollTop;if(!$('.code-panel').hidden)editor.dataset.targetScroll=String(editor.scrollTop);});
editor.addEventListener('keydown',event=>{if(event.key==='Tab'){event.preventDefault();editor.setRangeText('    ',editor.selectionStart,editor.selectionEnd,'end');editor.dispatchEvent(new Event('input'));}if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();restart(false);}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('.code-panel').hidden)showCode(false);});
async function boot(){
 const response=await fetch('./app.json');if(!response.ok)throw Error('فایل‌های آزمایشگاه دریافت نشدند؛ اتصال را بررسی و صفحه را دوباره باز کن.');original=await response.json();files=structuredClone(original);stored=readStorage();
 for(const file of files){const draft=stored.drafts?.[file.name];if(file.type==='text'&&typeof draft==='string'&&draft.length<=500000)file.content=draft;}
 topics.forEach((t,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=t[0];picker.append(option);});picker.value=String(Math.min(Number(stored.topic)||0,topics.length-1));selectTopic();
 for(const selector of ['#code-section','#source-code','[data-apply]','[data-download]','[data-reset]'])$(selector).disabled=false;
 showCode(Boolean(stored.codeOpen),false);
 const applied=structuredClone(original);for(const file of applied){const code=stored.applied?.[file.name];if(file.type==='text'&&typeof code==='string'&&code.length<=500000)file.content=code;}
 const customized=applied.some((f,i)=>f.content!==original[i].content);$('[data-code-state]').textContent=customized?'اجرای کد ویرایش‌شده':'اجرای کد اولیه';
 if(stored.paused){$('[data-stop]').disabled=true;$('[data-code-state]').textContent='اجرای پایتون متوقف است';$('#root').replaceChildren();const p=document.createElement('p');p.className='stopped-view';p.textContent='اجرای پایتون متوقف شد. کد را اصلاح کن و «اجرای کد» را بزن؛ با «کد اولیه» می‌توانی فایل انتخابی را برگردانی.';$('#root').append(p);message('محیط اجرا بسته شد؛ کد در پنل کناری حفظ شده است.');showCode(true);return;}
 runApp($('#root'),'editor-terminal-viewer',{startFiles:applied,showHeaderBar:false,setWindowTitle:false},'python');
 deadline=setTimeout(()=>{if(!wasReady){message('راه‌اندازی طول کشید؛ پیام‌های پایتون را ببین. برای بازیابی از خطا یا حلقهٔ بی‌پایان، توقف اجرای پایتون را بزن.',true);}},65000);
 interval=setInterval(()=>{
  ready=Boolean(liveState());$('[data-capture]').disabled=!ready;const terminal=$('.shinylive-terminal');if(terminal){terminal.inert=!document.body.classList.contains('show-console');terminal.setAttribute('aria-hidden',String(terminal.inert));}
  if(!ready && /Traceback|SyntaxError/.test(document.querySelector('.shinylive-terminal')?.textContent||'')){message('پایتون خطا داد؛ شمارهٔ خط را در پیام‌ها ببین، کد را اصلاح و دوباره اجرا کن.',true);document.body.classList.add('show-console');$('[data-console-toggle]').setAttribute('aria-pressed','true');}
  if(ready&&!wasReady){wasReady=true;clearTimeout(deadline);message(customized?'آزمایش از کد ویرایش‌شده اجرا شد؛ تعریف فرمول و زیان را هنگام تغییر سازگار نگه دار.':'پایتون آماده است. یک عامل را تغییر بده، یک گام اجرا کن و نتیجه را مقایسه کن.');}
 },250);
}
window.labWorkspace={liveState,getFiles:()=>{persist();return structuredClone(files);},openCode:()=>showCode(true)};
boot().catch(error=>message(error.message,true));
window.addEventListener('pagehide',()=>{clearInterval(interval);clearTimeout(deadline);});
