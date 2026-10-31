(() => {
  'use strict';
  let state=null, options=null, timer=null, stage=Infinity, current=null;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const byId=id=>document.getElementById(id);
  const fa=n=>new Intl.NumberFormat('fa-IR',{useGrouping:false}).format(n);
  function stop(){clearTimeout(timer);timer=null;}
  function draw(){
    const canvas=byId('network');if(!canvas)return;
    canvas.width=Math.max(360,Math.round(canvas.parentElement.clientWidth));canvas.height=Math.max(240,Math.min(8,Math.max(2,...(state?.probe_traces?.[0]?.activations||[]).map(a=>a.length)))*36+68);
    const c=canvas.getContext('2d'),W=canvas.width,H=canvas.height;c.clearRect(0,0,W,H);
    if(!state||!options||!options.points.length){current=null;window.deepLearningTopology.current=null;byId('network-trace')?.replaceChildren();return;}
    const index=Math.min(Number(byId('network-probe').value)||0,options.points.length-1);
    const point=options.points[index];current={...state.probe_traces[index],point:point.slice(),index,epoch:state.epoch};
    const sizes=current.activations.map(a=>a.length),shown=sizes.map(n=>Math.min(n,8));
    const position=(l,i)=>[44+l*(W-88)/(sizes.length-1),H/2+(i-(shown[l]-1)/2)*Math.min(38,(H-90)/Math.max(1,shown[l]-1))];
    const max=Math.max(.01,...state.weights.flat(2).map(Math.abs));
    c.direction='ltr';c.textAlign='center';c.textBaseline='middle';c.font='13px system-ui';
    for(let l=0;l<state.weights.length;l++)for(let j=0;j<shown[l+1];j++)for(let k=0;k<shown[l];k++){
      const weight=state.weights[l][j][k],a=position(l,k),b=position(l+1,j),active=l+1<=stage;
      c.strokeStyle=active?(weight>=0?'#245bdf':'#526075'):'#dce3ed';c.lineWidth=.5+2.6*Math.abs(weight)/max;c.setLineDash(weight<0?[5,4]:[]);
      c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();
    }
    c.setLineDash([]);
    sizes.forEach((n,l)=>{
      c.fillStyle='#172134';c.font='16px arad, sans-serif';
      c.fillText(l===0?'ورودی':l===sizes.length-1?'خروجی':`پنهان ${l}`,position(l,0)[0],26);
      c.font='13px arad, sans-serif';
      c.fillText(n>8?`${fa(n)} واحد · هشت مورد اول`:`${fa(n)} واحد`,position(l,0)[0],H-30);
      for(let i=0;i<shown[l];i++){
        const[x,y]=position(l,i),active=l<=stage;
        c.fillStyle=active?'#edf3ff':'#fff';c.strokeStyle=active?'#245bdf':'#aab7c9';c.lineWidth=l===stage?3:1.5;if(window.deepLearningTopology.selected?.[0]===l&&window.deepLearningTopology.selected?.[1]===i){c.lineWidth=3;c.strokeStyle='#172134';}
        c.beginPath();c.arc(x,y,17,0,Math.PI*2);c.fill();c.stroke();
        c.fillStyle='#172134';c.font='11px ui-monospace, monospace';
        c.fillText(active?current.activations[l][i].toFixed(2):'…',x,y);
      }
    });
    byId('network-architecture').textContent=sizes.map((n,l)=>`${l===0?'ورودی':l===sizes.length-1?'خروجی':'پنهان '+fa(l)}: ${fa(n)} واحد`).join(' · ')+` · خروجی ${options.output==='hard_threshold'?'آستانه‌ای':'سیگموید'}`;
    const table=document.createElement('table'),head=document.createElement('thead'),tr=document.createElement('tr');
    for(const label of ['لایه','مقدارهای واقعی']){const th=document.createElement('th');th.scope='col';th.textContent=label;tr.append(th);}head.append(tr);table.append(head);
    const body=document.createElement('tbody');
    current.activations.forEach((values,l)=>{
      const row=document.createElement('tr'),label=document.createElement('th'),cell=document.createElement('td');label.scope='row';label.textContent=l===0?'ورودی':l===sizes.length-1?'خروجی':'پنهان '+l;
      cell.dir='ltr';cell.textContent=l<=stage?values.map(v=>v.toPrecision(12)).join(', '):'هنوز محاسبه نمایش داده نشده';row.append(label,cell);body.append(row);
    });
    table.append(body);byId('network-trace').replaceChildren(table);
    window.deepLearningTopology.current=current;
    window.deepLearningTopology.positions=sizes.map((n,l)=>Array.from({length:shown[l]},(_,i)=>position(l,i)));
  }
  function update(next,config){
    stop();state=next;options=config;stage=Infinity;
    const select=byId('network-probe');if(!select)return;
    const previous=Number(select.value)||0;select.replaceChildren();
    if(next)config.points.forEach((point,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=`${i+1}: (${point.map(v=>Number(v).toPrecision(3)).join(', ')})`;select.append(option);});
    select.value=String(Math.min(previous,Math.max(0,(config?.points.length||1)-1)));
    byId('network-forward').disabled=!next;byId('network-reveal').disabled=!next;select.disabled=!next;
    byId('network-flow-status').textContent=next?'یک ورودی انتخاب کن؛ سپس عبور از لایه‌ها را ببین.':'برای دیدن شبکه، تنظیمات را اصلاح کن.';draw();
  }
  function show(){stop();stage=Infinity;draw();byId('network-flow-status').textContent='تمام مقدارهای عبور رو به جلو نمایش داده شد.';}
  function play(){
    if(!state)return;stop();stage=0;draw();
    if(reduced.matches){show();return;}
    const next=()=>{stage+=1;draw();const canvas=byId('network'),scroll=canvas.parentElement;if(scroll.scrollWidth>scroll.clientWidth){const x=(75+stage*(canvas.width-150)/state.weights.length)*canvas.clientWidth/canvas.width;scroll.scrollTo({left:Math.max(0,x-scroll.clientWidth/2),behavior:'smooth'});}byId('network-flow-status').textContent=stage>=state.weights.length?'عبور کامل شد؛ خروجی را با جدول پیش‌بینی مقایسه کن.':`خروجی لایهٔ ${stage} محاسبه و نمایش داده شد.`;if(stage<state.weights.length)timer=setTimeout(next,240);};
    timer=setTimeout(next,240);
  }
  function setup(){
    byId('network-probe')?.addEventListener('change',show);byId('network-forward')?.addEventListener('click',play);byId('network-reveal')?.addEventListener('click',show);
    new ResizeObserver(()=>{if(state)draw();}).observe(byId('network').parentElement);
    document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();stage=Infinity;draw();}});reduced.addEventListener('change',()=>{if(reduced.matches&&state)show();});
  }
  window.deepLearningTopology={update,current:null,redraw:draw};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
