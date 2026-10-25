(() => {
  'use strict';
  const blue = '#2563eb', ink = '#172134', muted = '#566174';
  function forward(state, values) {
    let a = values;
    for (let l = 0; l < state.weights.length; l++) {
      a = state.weights[l].map((weights,j) => {
        const z = weights.reduce((sum,w,k) => sum+w*a[k], state.biases[l][j]);
        return state.activation === 'hard_threshold' ? Number(z >= 0) :
          z >= 0 ? 1/(1+Math.exp(-z)) : Math.exp(z)/(1+Math.exp(z));
      });
    }
    return a[0];
  }
  function context(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.direction='ltr';ctx.font='14px system-ui';
    return [ctx,canvas.width,canvas.height];
  }
  function surface(state) {
    const pair=context('decision');if(!pair)return;
    const [c,W,H]=pair, x0=65,y0=32,size=Math.min(W-110,H-90),n=48;
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const px=-.25+(x+.5)/n*1.5,py=1.25-(y+.5)/n*1.5,p=forward(state,[px,py]);
      c.fillStyle=`rgb(${Math.round(242-205*p)},${Math.round(245-146*p)},${Math.round(251-16*p)})`;
      c.fillRect(x0+x/n*size,y0+y/n*size,size/n+1,size/n+1);
    }
    c.strokeStyle='#8b98aa';c.lineWidth=1;c.strokeRect(x0,y0,size,size);
    state.inputs.forEach((point,i)=>{
      const x=x0+(point[0]+.25)/1.5*size,y=y0+(1.25-point[1])/1.5*size;
      c.beginPath();c.arc(x,y,13,0,Math.PI*2);c.fillStyle=state.targets[i]?ink:'#fff';c.fill();
      c.strokeStyle=ink;c.lineWidth=2;c.stroke();c.fillStyle=state.targets[i]?'#fff':ink;
      c.textAlign='center';c.textBaseline='middle';c.fillText(String(state.targets[i]),x,y);
    });
    c.fillStyle=muted;c.textAlign='center';c.textBaseline='alphabetic';
    for(const v of [0,1]){c.fillText(String(v),x0+(v+.25)/1.5*size,y0+size+24);
      c.fillText(String(v),x0-24,y0+(1.25-v)/1.5*size+5);}
    c.fillText('x₁',x0+size/2,H-14);c.fillText('x₂',26,y0+size/2);
  }
  function loss(state){
    const pair=context('loss-chart');if(!pair)return;const[c,W,H]=pair,left=58,top=24,w=W-80,h=H-66;
    const max=Math.max(.001,...state.history.map(p=>p.loss)),end=Math.max(1,state.epoch);
    c.strokeStyle='#dce2eb';c.lineWidth=1;c.beginPath();c.moveTo(left,top);c.lineTo(left,top+h);c.lineTo(left+w,top+h);c.stroke();
    c.fillStyle=muted;c.textAlign='right';c.fillText(max.toFixed(2),left-9,top+5);c.fillText('0',left-9,top+h+4);
    c.textAlign='center';c.fillText('0',left,H-14);c.fillText(String(state.epoch),left+w,H-14);
    c.strokeStyle=blue;c.lineWidth=2;c.beginPath();
    state.history.forEach((p,i)=>{const x=left+p.epoch/end*w,y=top+h-p.loss/max*h;i?c.lineTo(x,y):c.moveTo(x,y)});c.stroke();
    const last=state.history.at(-1);c.beginPath();c.arc(left+last.epoch/end*w,top+h-last.loss/max*h,3,0,Math.PI*2);c.fillStyle=blue;c.fill();
  }
  function network(state){
    const pair=context('network');if(!pair)return;const[c,W,H]=pair;
    const sizes=[2,...state.weights.map(layer=>layer.length)];
    const visible=sizes.map(n=>Math.min(n,8));
    const pos=(l,i)=>[70+l*(W-140)/(sizes.length-1),H/2+(i-(visible[l]-1)/2)*40];
    const maximum=Math.max(.01,...state.weights.flat(2).map(Math.abs));
    for(let l=0;l<state.weights.length;l++)for(let j=0;j<visible[l+1];j++)for(let k=0;k<visible[l];k++){
      const w=state.weights[l][j][k],a=pos(l,k),b=pos(l+1,j);
      c.strokeStyle=w>=0?blue:muted;c.lineWidth=.5+3*Math.abs(w)/maximum;c.setLineDash(w<0?[5,4]:[]);
      c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();
    }
    c.setLineDash([]);
    sizes.forEach((n,l)=>{
      for(let i=0;i<visible[l];i++){
        const[x,y]=pos(l,i);c.fillStyle='#fff';c.strokeStyle=blue;c.lineWidth=1.5;
        c.beginPath();c.arc(x,y,16,0,Math.PI*2);c.fill();c.stroke();c.fillStyle=ink;c.textAlign='center';c.textBaseline='middle';c.fillText(String(i+1),x,y);
      }
      c.fillStyle=muted;c.font='13px system-ui';c.fillText(n>8?`${n} units (8 shown)`:`${n} units`,pos(l,0)[0],H-20);
    });
  }
  function draw(state){
    if(!state){delete window.dannaLab;for(const id of ['decision','loss-chart','network'])context(id);return;}
    window.dannaLab={state,forward:(inputs)=>forward(state,inputs)};surface(state);loss(state);network(state);
  }
  function setup(){
    if(!window.Shiny){setTimeout(setup,50);return;}
    window.Shiny.addCustomMessageHandler('danna_training',draw);
    window.Shiny.initializedPromise.then(()=>window.Shiny.setInputValue('plot_ready',Date.now(),{priority:'event'}));
    document.addEventListener('visibilitychange',()=>window.Shiny.setInputValue('tab_hidden',document.hidden,{priority:'event'}));
    document.querySelector('details')?.addEventListener('toggle',()=>{if(window.dannaLab)network(window.dannaLab.state)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();
