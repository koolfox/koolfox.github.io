(() => {
  'use strict';
  const blue='#245dc4',orange='#a74418',ink='#172339',muted='#536179';
  const noteKey='structural-learning-lab-notes-v1',modes=['sequence','geometry','energy','minimization','sampling','graph'];
  let state=null,currentMode=null,notes={},storageOK=true,hitTargets=[],plotWidth=0;
  try {const saved=JSON.parse(localStorage.getItem(noteKey)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))notes=saved;}catch{storageOK=false;}
  function note(id){return document.getElementById(id);}
  function persist(){
    if(!currentMode)return;
    notes[currentMode]={prediction:note('prediction').value.slice(0,6000),reflection:note('reflection').value.slice(0,6000)};
    try{localStorage.setItem(noteKey,JSON.stringify(notes));}catch{storageOK=false;}
    note('note-status').textContent=storageOK?'یادداشت‌های این آزمایش در همین مرورگر ذخیره شد.':'ذخیره در مرورگر ممکن نیست؛ با «دریافت نتیجه و یادداشت‌ها» یک نسخه نگه دار.';
  }
  function restore(mode){
    if(mode===currentMode)return;
    persist();currentMode=mode;
    const saved=notes[mode]||{};
    for(const id of ['prediction','reflection'])note(id).value=typeof saved[id]==='string'?saved[id].slice(0,6000):'';
    note('note-status').textContent=storageOK?'یادداشت‌ها برای هر آزمایش جدا در همین مرورگر ذخیره می‌شوند.':'ذخیره در مرورگر ممکن نیست؛ نتیجه و یادداشت‌ها را دریافت کن.';
  }
  const fmt=v=>Math.abs(v)<1e-8?'0':Number(v.toPrecision(3)).toString();
  function graphCanvas(){
    const canvas=note('experiment-plot'),W=Math.round(canvas.clientWidth),H=Math.max(280,Math.min(400,W*.48)),dpr=devicePixelRatio||1;
    plotWidth=W;canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);canvas.style.height=H+'px';
    const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.direction='ltr';c.font='14px system-ui';
    return {canvas,c,W,H};
  }
  function axes(c,W,H,points,xlabel,ylabel,{zeroY=false,equalAspect=false}={}){
    let xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    let xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);
    if(zeroY)ymin=Math.min(0,ymin);
    const dx=xmax-xmin||1,dy=ymax-ymin||1;xmin-=.06*dx;xmax+=.06*dx;ymin-=.08*dy;ymax+=.08*dy;if(zeroY&&Math.min(...ys)>=0)ymin=0;
    const left=66,right=W-18,top=24,bottom=H-64;
    if(equalAspect){const ratio=(right-left)/(bottom-top),cx=(xmin+xmax)/2,cy=(ymin+ymax)/2;
      if((xmax-xmin)/(ymax-ymin)<ratio){const half=(ymax-ymin)*ratio/2;xmin=cx-half;xmax=cx+half;}else{const half=(xmax-xmin)/ratio/2;ymin=cy-half;ymax=cy+half;}}
    const pos=p=>[left+(p[0]-xmin)/(xmax-xmin)*(right-left),bottom-(p[1]-ymin)/(ymax-ymin)*(bottom-top)];
    c.lineWidth=1;c.strokeStyle='#bec9d9';c.beginPath();c.moveTo(left,top);c.lineTo(left,bottom);c.lineTo(right,bottom);c.stroke();
    c.fillStyle=muted;c.textAlign='center';c.fillText(xlabel,(left+right)/2,H-14);
    c.save();c.translate(19,(top+bottom)/2);c.rotate(-Math.PI/2);c.fillText(ylabel,0,0);c.restore();
    for(let i=0;i<=4;i++){
      const x=xmin+i*(xmax-xmin)/4,y=ymin+i*(ymax-ymin)/4;
      c.textAlign='center';c.fillText(fmt(x),pos([x,ymin])[0],bottom+25);
      c.textAlign='right';c.fillText(fmt(y),left-10,pos([xmin,y])[1]+5);
    }
    return pos;
  }
  function line(c,points,pos,color,dash=[]){
    c.strokeStyle=color;c.lineWidth=2;c.setLineDash(dash);c.beginPath();
    points.forEach((p,i)=>{const v=pos(p);i?c.lineTo(...v):c.moveTo(...v);});c.stroke();c.setLineDash([]);
  }
  function dot(c,p,color,r=5){c.fillStyle=color;c.beginPath();c.arc(...p,r,0,Math.PI*2);c.fill();}
  function draw(s){
    restore(s.mode);state=s;window.structuralLabState=s;hitTargets=[];
    window.parent.postMessage({type:'structural-lab-ready'},'*');
    note('download').disabled=Boolean(s.error);
    const {canvas,c,W,H}=graphCanvas();
    if(s.error){c.fillStyle=muted;c.textAlign='center';c.fillText('Correct the input to calculate a new result.',W/2,H/2);return;}
    if(s.mode==='geometry'){
      const ref=s.fixed.map(p=>p.slice(0,2)),mov=(s.coordinate_view==='fit'?s.fitted:s.moving).map(p=>p.slice(0,2));
      const pos=axes(c,W,H,[...ref,...mov],'x (angstrom)','y (angstrom)',{equalAspect:true});line(c,ref,pos,blue);line(c,mov,pos,orange,[7,4]);
      dot(c,pos(ref[20]),blue,6);dot(c,pos(mov[20]),orange,4);
    }else if(s.mode==='energy'){
      const pos=axes(c,W,H,s.curve,'(G_B - G_A) / kBT','Probability of B',{zeroY:true});
      line(c,s.curve,pos,blue);dot(c,pos([s.config.delta,s.probability_b]),orange,6);
    }else if(s.mode==='minimization'){
      const points=s.positions.map((v,i)=>[i,v]),pos=axes(c,W,H,points,'Optimization step (not time)','x',{zeroY:true});
      line(c,points,pos,blue);points.forEach(p=>dot(c,pos(p),blue,4));
    }else if(s.mode==='sampling'){
      const points=s.series.map((v,i)=>[i+1,v]),pos=axes(c,W,H,points,'Sample index','Synthetic value');line(c,points,pos,blue);
      line(c,[[1,s.mean],[200,s.mean]],pos,ink,[7,4]);
      const blocks=s.block_means.flatMap((v,i)=>[[i*s.config.block+1,v],[(i+1)*s.config.block,v]]);line(c,blocks,pos,orange);
    }else if(s.mode==='sequence'){
      const base=['A','C','G','T'],max=Math.max(...Object.values(s.counts),1),left=82,top=24,bottom=H-64,width=(W-130)/4;
      const pos=axes(c,W,H,[[0,0],[5,max]],'Base','Count',{zeroY:true});
      c.clearRect(left,bottom+5,W-left,H-bottom-5);c.fillStyle=muted;c.textAlign='center';c.fillText('Base',W/2,H-14);
      base.forEach((b,i)=>{const x=left+i*width+20,y=pos([0,s.counts[b]])[1];c.fillStyle=blue;c.fillRect(x,y,width-40,bottom-y);c.fillStyle=ink;c.fillText(b,x+(width-40)/2,bottom+25);c.fillText(String(s.counts[b]),x+(width-40)/2,y-9);});
    }else if(s.mode==='graph'){
      const points=s.points.map(p=>p.slice(0,2)),pos=axes(c,W,H,points,'x (angstrom)','y (angstrom)',{equalAspect:true}),selected=s.labels.indexOf(s.config.selected);
      for(const[i,j]of s.edges){const active=i===selected||j===selected;c.globalAlpha=active?1:.22;line(c,[points[i],points[j]],pos,active?blue:muted);}
      c.globalAlpha=1;const neighbors=new Set(s.neighbors.map(p=>p[0]));
      points.forEach((p,i)=>{const screen=pos(p),color=i===selected?orange:neighbors.has(s.labels[i])?blue:muted;dot(c,screen,color,i===selected?7:5);hitTargets.push({screen,label:s.labels[i]});
        if(s.labels.length<=4||i===selected){c.fillStyle=ink;c.textAlign='center';c.fillText(s.labels[i],screen[0],screen[1]-14);}});
    }
    canvas.dataset.mode=s.mode;window.structuralLabPlot={hitTargets,width:W,height:H};
  }
  function setup(){
    if(!window.Shiny){setTimeout(setup,50);return;}
    window.Shiny.addCustomMessageHandler('structural_experiment',draw);
    for(const id of ['prediction','reflection'])note(id).addEventListener('input',persist);
    note('download').addEventListener('click',()=>{
      if(!state||state.error)return;persist();
      const data={schema_version:1,calculated:state,notes:notes[currentMode],saved_at_utc:new Date().toISOString()};
      const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');
      a.href=url;a.download=`structural-${currentMode}-experiment.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    note('experiment-plot').addEventListener('click',event=>{
      if(!state||state.mode!=='graph')return;
      const canvas=event.currentTarget,box=canvas.getBoundingClientRect(),x=(event.clientX-box.left)*window.structuralLabPlot.width/box.width,y=(event.clientY-box.top)*window.structuralLabPlot.height/box.height;
      const target=hitTargets.map(t=>({...t,d:Math.hypot(t.screen[0]-x,t.screen[1]-y)})).sort((a,b)=>a.d-b.d)[0];
      if(target&&target.d<22)window.Shiny.setInputValue('picked_node',target.label,{priority:'event'});
    });
    new ResizeObserver(()=>{if(state&&Math.abs(note('experiment-plot').clientWidth-plotWidth)>1)draw(state);}).observe(note('experiment-plot'));
    window.Shiny.initializedPromise.then(()=>{
      let search=location.search;
      try{if(!search)search=window.parent.location.search;}catch{}
      const params=new URLSearchParams(search),mode=params.get('experiment');
      const topic=Number(params.get('topic'));
      if(Number.isInteger(topic)&&topic>=1&&topic<=30)note('course-return').href=`/structural-bioinformatics/course.html?topic=${topic}#interactive-lab`;
      window.Shiny.setInputValue('plot_ready',{mode:modes.includes(mode)?mode:'geometry'},{priority:'event'});
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
