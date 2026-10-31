(() => {
 'use strict';
 const $=s=>document.querySelector(s),kind=location.pathname.includes('convolution')?'convolution':null;
 function element(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;}
 function setup(){
  const main=$('main.lab-shell');if(!main)return;
  const convolution=Boolean($('#output_matrix')),old=[...main.children];
  document.documentElement.classList.add('lab-workspace');
  const bar=element('div','workspace-bar'),controls=element('aside','workspace-controls'),stage=element('div','workspace-stage'),layout=element('div','workspace-layout'),tabs=element('div','workspace-tabs');
  controls.setAttribute('aria-label','داده و تنظیمات مدل');controls.append(element('h2','',convolution?'تصویر و فیلتر':'داده و مدل'));
  const settingsButton=element('button','btn settings-toggle','داده و تنظیمات');settingsButton.type='button';settingsButton.setAttribute('aria-expanded','false');bar.append(settingsButton);
  settingsButton.addEventListener('click',()=>{const open=layout.classList.toggle('settings-open');settingsButton.setAttribute('aria-expanded',String(open));});
  const ids=['model','results','guide'],names=convolution?['تصویر و فیلتر','محاسبه و خروجی','راهنما و تمرین']:['شبکه و ورودی','مرز، زیان و مقدارها','راهنما و آزمون'];
  const panels=Object.fromEntries(ids.map(id=>[id,element('section','workspace-panel')]));
  tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','نمای آزمایشگاه');
  function show(id,focus=false){ids.forEach(key=>{const on=key===id;panels[key].hidden=!on;const button=tabs.querySelector(`[data-panel="${key}"]`);button.setAttribute('aria-selected',String(on));button.tabIndex=on?0:-1;});if(focus)tabs.querySelector(`[data-panel="${id}"]`).focus();window.deepLearningTopology?.redraw();}
  ids.forEach((id,i)=>{const button=element('button','',names[i]);button.type='button';button.dataset.panel=id;button.id='tab-'+id;button.setAttribute('role','tab');button.setAttribute('aria-controls','panel-'+id);button.addEventListener('click',()=>show(id));button.addEventListener('keydown',event=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?2:(i+(event.key==='ArrowLeft'?1:2))%3;show(ids[next],true);});panels[id].id='panel-'+id;panels[id].setAttribute('role','tabpanel');panels[id].setAttribute('aria-labelledby',button.id);tabs.append(button);});
  const explanation=element('p','workspace-context',convolution?'روی یک خانهٔ خروجی کلیک کن؛ پنجرهٔ آبی ورودی را نشان می‌دهد. محاسبهٔ دقیق در نمای «محاسبه و خروجی» است.':'دایره‌ها نورون‌اند؛ یک نورون را انتخاب کن تا مقدار و وزن‌های ورودی‌اش را ببینی. «نمایش عبور» ترتیب محاسبه را آشکار می‌کند.');
  panels.model.append(explanation);
  const overview=element('div','workspace-overview');panels.model.append(overview);
  for(const child of old){
   if(child.tagName==='HEADER'){child.classList.add('workspace-original-header');panels.guide.append(child);continue;}
   if(child.matches('.configuration,.feature-options,.operation-options')||(child.tagName==='DETAILS'&&/تنظیمات داده|ویرایش ۹ وزن/.test(child.querySelector('summary')?.textContent||''))){controls.append(child);continue;}
   if(child.matches('.actions,.run-status')||child.id==='readout'||child.querySelector('#status')){bar.append(child);continue;}
   if(child.id==='network-structure'){overview.append(child);continue;}
   if(child.matches('.lab-grid')){child.classList.add('workspace-charts');panels.results.append(child);continue;}
   if(child.matches('.selection-controls')){panels.model.insertBefore(child,overview);continue;}
   if(child.matches('.operation-grid')){child.classList.add('two-matrices');panels.results.append(child.lastElementChild);overview.append(child);continue;}
   if(convolution&&child.tagName==='SECTION'&&child.querySelector('#calculation')){panels.results.prepend(child);continue;}
   if(child.tagName==='DETAILS'&&child.querySelector('#parameters')){panels.results.append(child);continue;}
   panels.guide.append(child);
  }
  const help=element('p','control-help','یک عامل را تغییر بده و نتیجه را مقایسه کن. تغییر تنظیمات، اجرای تازه‌ای از دورهٔ صفر می‌سازد.');help.id='control-help';const fields=element('div','workspace-control-fields');[...controls.children].slice(1).forEach(child=>fields.append(child));controls.append(fields,help);
  const hints={dataset:'شکل داده عوض می‌شود. با بذر ثابت، تغییر معماری داده‌ها و تقسیم آن‌ها را عوض نمی‌کند.',gate:'برچسب هدف چهار ورودی عوض می‌شود. XOR را با AND مقایسه کن.',model:'پرسپترون و نورون سیگموید لایهٔ پنهان ندارند. MLP می‌تواند مرز غیرخطی بسازد.',layers:'صفر یعنی بدون لایهٔ پنهان. لایهٔ بیشتر همیشه تعمیم بهتر نمی‌دهد.',activation:'این تابع فقط برای لایهٔ پنهان است. خروجی طبقه‌بندی همچنان سیگموید است.',learning_rate:'اندازهٔ گام وزن‌هاست. افزایش زیاد ممکن است زیان را ناپایدار کند؛ منحنی را ببین.',seed:'برای مقایسهٔ دو تغییر، بذر را ثابت نگه دار تا وزن و دادهٔ آغازین قابل مقایسه باشند.',max_epochs:'سقف دوره است؛ افزایش آن محدودیت یک مرز خطی را حل نمی‌کند.',features:'مختصات ورودی شبکه را انتخاب می‌کنی. ویژگی‌های مربع می‌توانند جداسازی حلقه‌ها را آسان‌تر کنند.',optimizer:'SGD، مومنتوم و Adam جهت/اندازهٔ گام را از گرادیان می‌سازند؛ قاعدهٔ واقعی در پنل کد باز می‌شود.',regularization:'فقط وزن‌ها جریمه می‌شوند. none یعنی ضریب جریمه غیرفعال است.',regularization_rate:'قدرت جریمهٔ وزن‌ها؛ زیادکردن آن الزاماً خطای اعتبارسنجی را کم نمی‌کند.',noise:'نویز به مختصات افزوده می‌شود؛ برچسب عوض نمی‌شود.',batch_size:'نمونه‌های هر گام وزن؛ با یک دورهٔ کامل داده یکی نیست.',size:'تعداد کل نمونه‌ها پیش از تقسیم آموزش، اعتبارسنجی و آزمون.',pattern:'جدول عددهای تصویر مصنوعی را عوض می‌کند؛ فیلتر ثابت می‌ماند.',filter:'۹ وزن اولیه را پر می‌کند؛ بعد هر وزن را می‌توانی جدا تغییر بدهی.',stride:'فاصلهٔ حرکت پنجره. گام بزرگ‌تر معمولاً خروجی کوچک‌تری می‌سازد.',padding:'صفرهای اطراف تصویر؛ اندازهٔ خروجی تغییر می‌کند، تعداد وزن‌ها ثابت است.',bias:'بعد از جمع ضرب‌ها به هر خانهٔ خروجی اضافه می‌شود.',pooling:'پس از فعال‌سازی، بیشینه یا میانگین پنجرهٔ ۲×۲ گرفته می‌شود.',relu:'منفی‌ها پس از فیلتر صفر می‌شوند؛ محاسبهٔ خام پیش از آن در دسترس است.',flip:'هسته ۱۸۰ درجه می‌چرخد؛ با هستهٔ نامتقارن تفاوت دیده می‌شود.'};
  controls.addEventListener('focusin',event=>{const id=event.target.id||event.target.closest('.shiny-input-container')?.id||'';help.textContent=hints[id]||(/^width|^hidden/.test(id)?'تعداد نورون‌های این لایه؛ اندازهٔ شبکه و تعداد وزن‌ها تغییر می‌کند.':/^w\d/.test(id)?'همین وزن در همهٔ جایگاه‌های تصویر مشترک است؛ سهم آن در جدول ضرب‌ها دیده می‌شود.':'یک عامل را تغییر بده و با بذر ثابت نتیجه را مقایسه کن.');});
  controls.querySelectorAll('input,select').forEach(input=>input.setAttribute('aria-describedby','control-help'));
  stage.append(tabs,...ids.map(id=>panels[id]));layout.append(controls,stage);main.replaceChildren(bar,layout);main.dataset.workspaceReady='true';
  const charts=$('.workspace-charts'),boundary=charts?.children[0],network=$('#network-structure');
  function resize(){const wide=innerWidth>=1180;if(boundary&&network){if(wide)overview.append(boundary);else charts.insertBefore(boundary,charts.firstChild);}overview.classList.toggle('two-up',Boolean(wide&&network));}
  new ResizeObserver(resize).observe(main);resize();
  if(network){
   const info=element('details','network-explanation'),summary=element('summary','','راهنمای خطوط و همهٔ مقدارها');info.append(summary);
   [...network.children].filter(c=>c.matches('p.caption')&&!['network-architecture','network-flow-status'].includes(c.id)).forEach(c=>info.append(c));
   const trace=$('#network-trace');if(trace)info.append(trace);network.append(info);
   const inspector=element('p','neuron-inspector','برای بررسی یک نورون، روی دایرهٔ آن کلیک کن.');inspector.setAttribute('role','status');network.insertBefore(inspector,info);
   const canvas=$('#network');canvas.tabIndex=0;let selected=[0,0];
   function inspect(){
    const api=window.deepLearningTopology,t=api?.current;if(!t)return;
    let[l,j]=selected;l=Math.min(l,t.activations.length-1);j=Math.min(j,t.activations[l].length-1);selected=[l,j];
    const name=l===0?'ورودی':l===t.activations.length-1?'خروجی':'پنهان '+l;
    const number=value=>{const span=element('bdi');span.dir='ltr';span.textContent=typeof value==='number'?value.toPrecision(7):value;return span;};
    inspector.replaceChildren(document.createTextNode(`${name}، واحد ${j+1} · مقدار از پایتون: `),number(t.activations[l][j]));
    if(l){const state=window.dannaNetwork?.state||window.dannaLab?.state;inspector.append(document.createTextNode(' · پیش از فعال‌سازی: '),number(t.logits[l-1][j]),document.createTextNode(' · وزن‌های ورودی: '),number('['+state.weights[l-1][j].map(v=>Number(v).toPrecision(3)).join(', ')+']'),document.createTextNode(' · بایاس: '),number(state.biases[l-1][j]));}
    canvas.setAttribute('aria-label',inspector.textContent+'؛ چپ/راست: لایه، بالا/پایین: نورون');api.selected=selected;api.redraw();
   }
   canvas.addEventListener('click',event=>{const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)*canvas.width/rect.width,y=(event.clientY-rect.top)*canvas.height/rect.height;let best=25;window.deepLearningTopology.positions?.forEach((layer,l)=>layer.forEach(([nx,ny],j)=>{const d=Math.hypot(x-nx,y-ny);if(d<best){best=d;selected=[l,j];}}));inspect();});
   canvas.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const t=window.deepLearningTopology.current;if(!t)return;selected[0]=Math.max(0,Math.min(t.activations.length-1,selected[0]+(event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0)));selected[1]=Math.max(0,Math.min(t.activations[selected[0]].length-1,selected[1]+(event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0)));inspect();});
   document.addEventListener('native-state-updated',inspect);
   $('#decision')?.addEventListener('click',event=>{
    const state=window.dannaNetwork?.state||window.dannaLab?.state;if(!state)return;const canvas=event.currentTarget,rect=canvas.getBoundingClientRect(),px=(event.clientX-rect.left)*canvas.width/rect.width,py=(event.clientY-rect.top)*canvas.height/rect.height,neuron=Boolean(state.inputs),size=Math.min(canvas.width-(neuron?110:100),canvas.height-90),low=state.surface_grid.low,high=state.surface_grid.high,x=low+(px-65)/size*(high-low),y=high-(py-(neuron?32:28))/size*(high-low),points=state.inputs||state.points.map(p=>p.x);let best=Infinity,index=0;points.forEach((p,i)=>{const d=(p[0]-x)**2+(p[1]-y)**2;if(d<best){best=d;index=i;}});const probe=$('#network-probe');probe.value=String(index);probe.dispatchEvent(new Event('change'));inspect();show('model');
   });
  }
  show('model');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
