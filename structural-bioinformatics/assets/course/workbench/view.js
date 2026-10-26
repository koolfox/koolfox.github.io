export const colors=['#245dc4','#a74418','#536179','#15705c','#7f4196','#804d23'];
export function drawPlot(canvas,plot){
 const width=Math.round(canvas.clientWidth)||400,height=Math.max(280,Math.min(400,width*.55)),dpr=devicePixelRatio||1;
 canvas.width=width*dpr;canvas.height=height*dpr;canvas.style.height=height+'px';
 const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.font='13px system-ui';c.direction='ltr';
 const series=plot?.series||[],points=series.flatMap(s=>s.points);
 if(!points.length){c.fillStyle='#536179';c.textAlign='center';c.fillText('No plot in this result',width/2,height/2);return;}
 const left=66,right=width-18,top=24,bottom=height-62;
 let xmin=Math.min(...points.map(p=>p[0])),xmax=Math.max(...points.map(p=>p[0])),ymin=Math.min(...points.map(p=>p[1])),ymax=Math.max(...points.map(p=>p[1]));
 if(series.some(s=>s.kind==='bar'))ymin=Math.min(0,ymin);
 const dx=xmax-xmin||1,dy=ymax-ymin||1;xmin-=dx*.08;xmax+=dx*.08;ymin-=dy*.08;ymax+=dy*.08;
 if(plot.equal_aspect){const ratio=(right-left)/(bottom-top),cx=(xmin+xmax)/2,cy=(ymin+ymax)/2;if((xmax-xmin)/(ymax-ymin)<ratio){const half=(ymax-ymin)*ratio/2;xmin=cx-half;xmax=cx+half;}else{const half=(xmax-xmin)/ratio/2;ymin=cy-half;ymax=cy+half;}}
 const pos=p=>[left+(p[0]-xmin)/(xmax-xmin)*(right-left),bottom-(p[1]-ymin)/(ymax-ymin)*(bottom-top)];
 c.strokeStyle='#bec9d9';c.beginPath();c.moveTo(left,top);c.lineTo(left,bottom);c.lineTo(right,bottom);c.stroke();c.fillStyle='#536179';c.textAlign='center';
 c.fillText(String(plot.xlabel||'x').slice(0,60),(left+right)/2,height-12);c.save();c.translate(18,(top+bottom)/2);c.rotate(-Math.PI/2);c.fillText(String(plot.ylabel||'y').slice(0,60),0,0);c.restore();
 const fmt=v=>Number(v.toPrecision(3)).toString();
 for(let i=0;i<=4;i++){const x=xmin+(xmax-xmin)*i/4,y=ymin+(ymax-ymin)*i/4;c.textAlign='center';c.fillText(fmt(x),pos([x,ymin])[0],bottom+23);c.textAlign='right';c.fillText(fmt(y),left-9,pos([xmin,y])[1]+4);}
 series.forEach((s,i)=>{
  c.strokeStyle=colors[i];c.fillStyle=colors[i];c.lineWidth=2;c.setLineDash(i%2?[6,4]:[]);c.beginPath();
  s.points.forEach((p,j)=>{const[x,y]=pos(p);if(s.kind==='bar'){const zero=pos([p[0],0])[1];c.fillRect(x-5,Math.min(y,zero),10,Math.abs(zero-y));}else if(s.kind==='scatter'){c.moveTo(x+3,y);c.arc(x,y,3,0,Math.PI*2);}else{j?c.lineTo(x,y):c.moveTo(x,y);}});
  if(s.kind==='scatter')c.fill();else c.stroke();c.setLineDash([]);
 });
}
export function renderTable(target,columns,rows){
 target.replaceChildren();if(!rows?.length){target.textContent='ردیفی برای نمایش وجود ندارد.';return;}
 const table=document.createElement('table'),head=document.createElement('thead'),tr=document.createElement('tr');
 for(const value of columns){const th=document.createElement('th');th.scope='col';th.textContent=value;tr.append(th);}head.append(tr);table.append(head);
 const body=document.createElement('tbody');
 for(const row of rows){const tr=document.createElement('tr');for(const value of row){const td=document.createElement('td');td.textContent=String(value??'—');td.dir=typeof value==='string'&&/[\u0600-\u06ff]/.test(value)?'rtl':'ltr';tr.append(td);}body.append(tr);}
 table.append(body);target.append(table);
}
