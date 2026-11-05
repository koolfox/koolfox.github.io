// Additional tools are attached only to their source pages; models load on request.
const courseRoot=new URL('../',import.meta.url);
const config=JSON.parse(document.querySelector('#source-reader-config').textContent);
const films=[
 {id:'train-test',session:'s01',pages:[39,40,41,42,43],title:'فیلم آموزش و آزمون'},
 {id:'backpropagation',session:'s03',pages:Array.from({length:16},(_,i)=>69+i),title:'پخش پس‌انتشار'},
 {id:'convolution',session:'s05',pages:Array.from({length:11},(_,i)=>27+i),title:'پخش کانولوشن'},
 {id:'convolution-code',session:'s05',pages:Array.from({length:11},(_,i)=>27+i),title:'فیلم کد کانولوشن'},
 {id:'attention',session:'s13',pages:Array.from({length:9},(_,i)=>21+i),title:'پخش محاسبه توجه'},
];
// Model source pages are read from the same pinned catalog as the execution UI.
const training=[{id:'mnist-training',session:'s05',pages:[70],title:'آموزش CNN با MNIST',route:'playgrounds/cnn-mnist/train/'}];
let catalog=[];
const host=document.createElement('span');host.className='source-page-tools';
document.querySelector('.reader-toolbar').append(host);
function update(page){
 host.replaceChildren();
 for(const entry of [...films.map(item=>({...item,kind:'animations'})),...catalog.map(item=>({...item,kind:'models'})),...training]){
  if(config.term!=='spring-2026'||entry.session!==config.session||!entry.pages.includes(page))continue;
  const button=document.createElement('button');button.type='button';button.textContent=entry.title;
  button.dataset.sourceInteractive=entry.id;
  button.addEventListener('click',()=>window.sourceSlideReader.openTool(new URL(entry.route||`${entry.kind}/${entry.id}/`,courseRoot).href));
  host.append(button);
 }
}
window.addEventListener('danna:source-page',event=>update(event.detail.page));
update(window.sourceSlideReader?.page||1);
fetch(new URL('models/source-models.json',courseRoot)).then(response=>{
 if(!response.ok)throw Error('Model catalog unavailable');return response.json();
}).then(data=>{
 catalog=data.models.map(model=>({id:model.id,session:model.source.session,pages:model.source.pages,title:model.kind==='image-classification'?'اجرای ResNet152':'اجرای BERT'}));
 update(window.sourceSlideReader?.page||1);
}).catch(()=>{});

// رسم روی شکل خود اسلاید ۵۳: مختصات به بوم اسلاید مربوط‌اند، نه داده عددی.
if(config.term==='spring-2026'&&config.session==='s01'){
 const ns='http://www.w3.org/2000/svg',page=document.querySelector('.source-page');
 const tools=document.createElement('span');tools.className='capacity-tools';tools.hidden=true;
 const toggle=document.createElement('button');toggle.type='button';toggle.textContent='رسم مرز';toggle.dataset.capacityToggle='';toggle.setAttribute('aria-pressed','false');
 const status=document.createElement('span');status.className='capacity-status';status.setAttribute('role','status');
 const overlay=document.createElementNS(ns,'svg');overlay.setAttribute('viewBox','0 0 1600 900');overlay.setAttribute('preserveAspectRatio','none');overlay.classList.add('capacity-overlay');overlay.setAttribute('hidden','');
 const area=document.createElementNS(ns,'rect');for(const [key,value] of Object.entries({x:182,y:362,width:488,height:438,fill:'transparent',tabindex:'0',role:'application','aria-label':'ناحیه رسم مرز: با جهت‌ها حرکت کن و با Enter نقطه بگذار'}))area.setAttribute(key,value);
 const defs=document.createElementNS(ns,'defs'),clip=document.createElementNS(ns,'clipPath'),clipRect=document.createElementNS(ns,'rect');clip.id='capacity-plot-clip';for(const [key,value] of Object.entries({x:182,y:362,width:488,height:438}))clipRect.setAttribute(key,value);clip.append(clipRect);defs.append(clip);overlay.append(defs);
 const paths={};for(const [name,color] of [['line','#00b760'],['parabola','#ea40ed'],['curve','#eab308']]){const path=document.createElementNS(ns,'path');path.setAttribute('fill','none');path.setAttribute('stroke',color);path.setAttribute('stroke-width','5');path.setAttribute('vector-effect','non-scaling-stroke');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');path.setAttribute('pointer-events','none');path.setAttribute('clip-path','url(#capacity-plot-clip)');path.dataset.boundary=name;paths[name]=path;overlay.append(path);}
 overlay.append(area);page.append(overlay);
 let mode='line',start=null,points=[],drawing=false,cursor={x:420,y:570};
 const marker=document.createElementNS(ns,'circle');marker.setAttribute('r','7');marker.setAttribute('fill','#245bdf');marker.setAttribute('stroke','#fff');marker.setAttribute('stroke-width','3');marker.setAttribute('pointer-events','none');marker.style.display='none';overlay.append(marker);
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 function position(event){const box=overlay.getBoundingClientRect();return{x:clamp((event.clientX-box.left)*1600/box.width,182,670),y:clamp((event.clientY-box.top)*900/box.height,362,800)};}
 function describe(){status.textContent=mode==='line'?'خط: از نقطه شروع تا پایان بکش.':mode==='parabola'?'سهمی: از راس تا یک نقطه روی سهمی بکش.':'منحنی: با انگشت یا ماوس رسم کن.';}
 function move(point){cursor=point;marker.setAttribute('cx',point.x);marker.setAttribute('cy',point.y);}
 function paint(end){
  if(!start)return;
  if(mode==='line')paths.line.setAttribute('d',`M ${start.x} ${start.y} L ${end.x} ${end.y}`);
  else if(mode==='parabola'){
   const dx=end.x-start.x;if(Math.abs(dx)<5){paths.parabola.setAttribute('d','');return;}
   const factor=(end.y-start.y)/(dx*dx),vertices=[];
   for(let x=182;x<=670;x+=4){const y=start.y+factor*(x-start.x)**2;vertices.push(`${x} ${clamp(y,-4000,4900)}`);}
   paths.parabola.setAttribute('d','M '+vertices.join(' L '));
  }else{points.push(end);paths.curve.setAttribute('d','M '+points.map(p=>`${p.x} ${p.y}`).join(' L '));}
 }
 function begin(point){start=point;points=[point];drawing=true;paths[mode].setAttribute('d','');move(point);}
 function finish(point){if(!drawing)return;paint(point);drawing=false;if(mode==='parabola'&&Math.abs(point.x-start.x)<5)status.textContent='برای رسم سهمی، نقطه پایان را از راس فاصله بده.';start=null;}
 area.addEventListener('pointerdown',event=>{event.preventDefault();area.setPointerCapture(event.pointerId);begin(position(event));});
 area.addEventListener('pointermove',event=>{if(drawing)paint(position(event));});
 area.addEventListener('pointerup',event=>finish(position(event)));
 area.addEventListener('pointercancel',()=>{drawing=false;start=null;});
 area.addEventListener('focus',()=>{marker.style.display='';move(cursor);});area.addEventListener('blur',()=>{marker.style.display='none';});
 area.addEventListener('keydown',event=>{const step=event.shiftKey?20:5,delta={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[event.key];if(delta){event.preventDefault();move({x:clamp(cursor.x+delta[0],182,670),y:clamp(cursor.y+delta[1],362,800)});if(drawing)paint(cursor);}else if(event.key==='Enter'||event.key===' '){event.preventDefault();if(drawing)finish(cursor);else begin(cursor);}});
 const modes=[['line','خط'],['parabola','سهمی'],['curve','منحنی']];
 for(const [name,label] of modes){const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.capacityMode=name;button.setAttribute('aria-pressed',String(name===mode));button.addEventListener('click',()=>{mode=name;drawing=false;start=null;tools.querySelectorAll('[data-capacity-mode]').forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.capacityMode===name)));describe();});tools.append(button);}
 const clear=document.createElement('button');clear.type='button';clear.textContent='پاک کردن';clear.addEventListener('click',()=>{Object.values(paths).forEach(path=>path.setAttribute('d',''));status.textContent='رسم‌ها پاک شدند.';});tools.append(clear,status);
 toggle.addEventListener('click',()=>{const active=toggle.getAttribute('aria-pressed')!=='true';toggle.setAttribute('aria-pressed',String(active));tools.hidden=!active;overlay.toggleAttribute('hidden',!active);if(active){document.querySelector('[data-view-source]').click();describe();}else{drawing=false;start=null;}});
 function showCapacity(current){const visible=current===53;if(!visible){toggle.setAttribute('aria-pressed','false');overlay.setAttribute('hidden','');tools.hidden=true;drawing=false;start=null;}toggle.hidden=!visible;}
 const capacityHost=document.createElement('span');capacityHost.className='capacity-host';capacityHost.append(toggle,tools);document.querySelector('.reader-toolbar').append(capacityHost);window.addEventListener('danna:source-page',event=>showCapacity(event.detail.page));showCapacity(window.sourceSlideReader?.page||1);
}
