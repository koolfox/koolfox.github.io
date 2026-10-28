(() => {
  'use strict';
  const blue='#2563eb', ink='#172134', muted='#566174';
  const labels={x1:'x₁',x2:'x₂',x1_squared:'x₁²',x2_squared:'x₂²',x1_x2:'x₁x₂',sin_x1:'sin(πx₁)',sin_x2:'sin(πx₂)'};
  function sigmoid(z){return z>=0?1/(1+Math.exp(-z)):Math.exp(z)/(1+Math.exp(z));}
  function forward(state,point){
    const[x,y]=point, f={x1:x,x2:y,x1_squared:x*x,x2_squared:y*y,x1_x2:x*y,sin_x1:Math.sin(Math.PI*x),sin_x2:Math.sin(Math.PI*y)};
    let a=state.config.feature_names.map(n=>f[n]);
    state.weights.forEach((layer,l)=>{
      a=layer.map((weights,j)=>{
        const z=weights.reduce((s,w,k)=>s+w*a[k],state.biases[l][j]);
        return l===state.weights.length-1?sigmoid(z):state.config.activation==='tanh'?Math.tanh(z):state.config.activation==='relu'?Math.max(0,z):sigmoid(z);
      });
    });
    return a[0];
  }
  function context(id){
    const canvas=document.getElementById(id);if(!canvas)return null;
    const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);
    c.direction='ltr';c.font='13px system-ui';return[c,canvas.width,canvas.height];
  }
  function surface(state){
    const pair=context('decision');if(!pair)return;const[c,W,H]=pair,left=65,top=28,size=Math.min(W-100,H-90),n=48;
    const bound=Math.max(1.15,...state.points.flatMap(p=>p.x.map(v=>Math.abs(v)*1.05)));
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const p=forward(state,[-bound+(x+.5)/n*2*bound,bound-(y+.5)/n*2*bound]);
      c.fillStyle=`rgb(${Math.round(242-205*p)},${Math.round(245-146*p)},${Math.round(251-16*p)})`;
      c.fillRect(left+x/n*size,top+y/n*size,size/n+1,size/n+1);
    }
    c.strokeStyle='#8b98aa';c.lineWidth=1;c.strokeRect(left,top,size,size);
    for(const row of state.points){
      const x=left+(row.x[0]+bound)/(2*bound)*size,y=top+(bound-row.x[1])/(2*bound)*size,r=4;
      c.beginPath();
      if(row.split==='train')c.arc(x,y,r,0,Math.PI*2);
      else if(row.split==='validation')c.rect(x-r,y-r,2*r,2*r);
      else{c.moveTo(x,y-r-1);c.lineTo(x+r+1,y+r);c.lineTo(x-r-1,y+r);c.closePath();}
      c.fillStyle=row.y?blue:'#fff';c.strokeStyle=ink;c.lineWidth=1;c.fill();c.stroke();
    }
    c.fillStyle=muted;c.textAlign='center';
    for(const v of [-1,0,1]){c.fillText(String(v),left+(v+bound)/(2*bound)*size,top+size+23);c.fillText(String(v),left-22,top+(bound-v)/(2*bound)*size+4);}
    c.fillText('x₁',left+size/2,H-12);c.fillText('x₂',22,top+size/2);
  }
  function loss(state){
    const pair=context('loss-chart');if(!pair)return;const[c,W,H]=pair,left=58,top=24,w=W-80,h=H-66;
    const max=Math.max(.001,...state.history.flatMap(p=>[p.train_loss,p.validation_loss])),end=Math.max(1,state.epoch);
    c.strokeStyle='#dce2eb';c.lineWidth=1;c.beginPath();c.moveTo(left,top);c.lineTo(left,top+h);c.lineTo(left+w,top+h);c.stroke();
    c.fillStyle=muted;c.textAlign='right';c.fillText(max.toFixed(2),left-9,top+5);c.fillText('0',left-9,top+h+4);
    c.textAlign='center';c.fillText('0',left,H-14);c.fillText(String(state.epoch),left+w,H-14);
    for(const[key,color,dash]of[['train_loss',blue,[]],['validation_loss',ink,[6,4]]]){
      c.strokeStyle=color;c.lineWidth=2;c.setLineDash(dash);c.beginPath();
      state.history.forEach((p,i)=>{const x=left+p.epoch/end*w,y=top+h-p[key]/max*h;i?c.lineTo(x,y):c.moveTo(x,y)});c.stroke();
      const last=state.history.at(-1);c.beginPath();c.arc(left+last.epoch/end*w,top+h-last[key]/max*h,3,0,Math.PI*2);c.fillStyle=color;c.fill();
    }
    c.setLineDash([]);
  }
  function draw(state){
    if(!state){window.deepLearningTopology?.update(null,null);delete window.dannaNetwork;for(const id of ['decision','loss-chart','network'])context(id);return;}
    window.dannaNetwork={state,forward:point=>forward(state,point)};surface(state);loss(state);window.deepLearningTopology?.update(state,{points:state.points.map(p=>p.x),features:point=>{const[x,y]=point,f={x1:x,x2:y,x1_squared:x*x,x2_squared:y*y,x1_x2:x*y,sin_x1:Math.sin(Math.PI*x),sin_x2:Math.sin(Math.PI*y)};return state.config.feature_names.map(n=>f[n]);},hidden:state.config.activation,output:'sigmoid'});
  }
  function setup(){
    if(!window.Shiny){setTimeout(setup,50);return;}
    window.Shiny.addCustomMessageHandler('danna_network',draw);
    window.Shiny.initializedPromise.then(()=>window.Shiny.setInputValue('plot_ready',Date.now(),{priority:'event'}));
    document.addEventListener('visibilitychange',()=>window.Shiny.setInputValue('tab_hidden',document.hidden,{priority:'event'}));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
