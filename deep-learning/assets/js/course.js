import { predictCheckpoint } from './engine.js';
const $ = id => document.getElementById(id);
const fmt = n => Number(n).toLocaleString('fa-IR');
let dataset,gate='XOR',model='perceptron',frameIndex=0,timer=null;
const modelNames={
    perceptron:'پرسپترون آستانه‌ای · فصل ۲',linear:'یک نورون سیگموید · پل آموزشی',mlp:'شبکه چندلایه · پل فصل ۳ و ۴'
};
function currentRun(){
    return dataset.gates[gate].models[model]
}
function stop(){
    clearInterval(timer);
    timer=null;
    $('play').textContent='پخش آموزش'
}
function currentFrame(){
    return currentRun().checkpoints[frameIndex]
}
function selectRun(){
    stop();
    const keys=Object.keys(dataset.gates[gate].models);
    if(!keys.includes(model))model=keys[0];
    $('model').replaceChildren(...keys.map(key=>new Option(modelNames[key]||key,key)));
    $('model').value=model;
    frameIndex=0;
    $('frame').max=currentRun().checkpoints.length-1;
    renderFrame()
}
function drawSurface(frame){
    const ctx=$('decision').getContext('2d');
    const W=500,H=400,left=52,top=28,size=320;
    ctx.clearRect(0,0,W,H);
    const n=55,min=-.25,max=1.25;
    for(let row=0;
    row<n;
    row++)for(let col=0;
    col<n;
    col++){
        const x=min+(col+.5)/n*(max-min),y=max-(row+.5)/n*(max-min),p=predictCheckpoint(frame,[x,y],currentRun().config.activation);
        ctx.fillStyle=`rgb(${Math.round(241-204*p)},${Math.round(245-146*p)},${Math.round(253-18*p)})`;
        ctx.fillRect(left+col*size/n,top+row*size/n,size/n+1,size/n+1)
    }
    ctx.strokeStyle='#64748b';
    ctx.strokeRect(left,top,size,size);
    ctx.font='13px monospace';
    ctx.textAlign='center';
    ctx.fillStyle='#111827';
    for(const value of [0,1]){
        const px=left+(value-min)/(max-min)*size,py=top+(max-value)/(max-min)*size;
        ctx.fillText(String(value),px,top+size+20);
        ctx.fillText(String(value),left-18,py+4)
    }
    ctx.fillText('x₁',left+size/2,top+size+42);
    ctx.fillText('x₂',left-34,top+size/2);
    dataset.truth_table_inputs.forEach((point,i)=>{
        const px=left+(point[0]-min)/(max-min)*size,py=top+(max-point[1])/(max-min)*size,target=dataset.gates[gate].targets[i];
        ctx.beginPath();
        ctx.arc(px,py,13,0,Math.PI*2);
        ctx.fillStyle=target?'#111827':'white';
        ctx.fill();
        ctx.strokeStyle='#111827';
        ctx.lineWidth=2;
        ctx.stroke();
        ctx.fillStyle=target?'white':'#111827';
        ctx.fillText(String(target),px,py+5)
    });
    ctx.textAlign='left';
    ctx.fillStyle='#636b78';
    ctx.font='11px monospace';
    ctx.fillText('target',390,45);
    ctx.fillText('0 / 1',390,64)
}
function drawLoss(frame){
    const ctx=$('loss-chart').getContext('2d'),history=currentRun().history,visible=history.filter(h=>h.epoch<=frame.epoch),max=Math.max(...history.map(h=>h.loss),.01),end=history.at(-1).epoch||1;
    ctx.clearRect(0,0,500,180);
    ctx.strokeStyle='#e5e7eb';
    ctx.beginPath();
    ctx.moveTo(48,12);
    ctx.lineTo(48,150);
    ctx.lineTo(480,150);
    ctx.stroke();
    ctx.fillStyle='#636b78';
    ctx.font='11px monospace';
    ctx.textAlign='right';
    ctx.fillText(max.toFixed(2),42,20);
    ctx.fillText('0',42,150);
    ctx.fillText(String(end),480,170);
    ctx.fillText('0',53,170);
    ctx.strokeStyle='#2563eb';
    ctx.lineWidth=2;
    ctx.beginPath();
    visible.forEach((h,i)=>{
        const x=48+h.epoch/end*432,y=150-h.loss/max*132;
        i?ctx.lineTo(x,y):ctx.moveTo(x,y)
    });
    ctx.stroke();
    if(visible.length){
        const last=visible.at(-1);
        ctx.beginPath();
        ctx.arc(48+last.epoch/end*432,150-last.loss/max*132,3,0,Math.PI*2);
        ctx.fillStyle='#2563eb';
        ctx.fill()
    }
}
function drawNetwork(frame){
    const arch=currentRun().architecture,ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 640 280');
    svg.setAttribute('role','img');
    svg.setAttribute('aria-label',`ساختار ${arch.join('، ')} نورون؛ ضخامت اتصال متناسب با اندازه وزن، خط‌چین یعنی وزن منفی`);
    svg.style.maxWidth='640px';
    svg.style.width='100%';
    const position=(l,i)=>[60+l*520/(arch.length-1),140+(i-(arch[l]-1)/2)*58],weights=frame.weights.flat(2),scale=Math.max(...weights.map(Math.abs),1);
    frame.weights.forEach((layer,l)=>layer.forEach((ws,j)=>ws.forEach((w,i)=>{
        const [x1,y1]=position(l,i),[x2,y2]=position(l+1,j),line=document.createElementNS(ns,'line');
        for(const [key,v] of Object.entries({
            x1,y1,x2,y2,stroke:w<0?'#636b78':'#2563eb','stroke-width':1+Math.abs(w)/scale*4
        }))line.setAttribute(key,v);
        if(w<0)line.setAttribute('stroke-dasharray','5 4');
        const title=document.createElementNS(ns,'title');
        title.textContent=`w = ${w.toFixed(5)}`;
        line.append(title);
        svg.append(line)
    })));
    arch.forEach((count,l)=>{
        for(let i=0;
        i<count;
        i++){
            const[x,y]=position(l,i),c=document.createElementNS(ns,'circle');
            for(const[k,v]of Object.entries({
                cx:x,cy:y,r:20,fill:'white',stroke:'#2563eb','stroke-width':1.5
            }))c.setAttribute(k,v);
            svg.append(c);
            const t=document.createElementNS(ns,'text');
            t.setAttribute('x',x);
            t.setAttribute('y',y+4);
            t.setAttribute('text-anchor','middle');
            t.setAttribute('font-family','monospace');
            t.setAttribute('font-size','12');
            t.textContent=l===0?`x${i+1}`:l===arch.length-1?'ŷ':`h${i+1}`;
            svg.append(t)
        }
    });
    $('network').replaceChildren(svg);
    const note=document.createElement('p');
    note.className='caption';
    note.textContent='ضخامت اتصال: اندازه وزن. خط‌چین: وزن منفی. مقدار دقیق وزن‌ها و بایاس‌ها در زیر آمده است.';
    $('network').append(note)
}
function renderFrame(){
    const run=currentRun(),frame=currentFrame(),history=run.history.filter(h=>h.epoch<=frame.epoch),metric=history.at(-1);
    $('frame').value=frameIndex;
    $('epoch').textContent=`${frame.epoch} / ${run.config.epochs}`;
    $('loss').textContent=metric.loss.toFixed(5);
    $('accuracy').textContent=`${Math.round(metric.accuracy*4)} / 4`;
    $('output-label').textContent=model==='perceptron'?'خروجی آستانه‌ای':'احتمال کلاس ۱';
    $('loss-label').textContent=model==='perceptron'?'نسبت خطای طبقه‌بندی':'آنتروپی متقاطع دودویی';
    $('loss-title').textContent=model==='perceptron'?'خطای طبقه‌بندی در هر دور':'مسیر خطای آموزش (BCE)';
    $('truth-body').replaceChildren(...dataset.truth_table_inputs.map((point,i)=>{
        const tr=document.createElement('tr');
        const p=frame.probabilities[i];
        for(const value of [...point,dataset.gates[gate].targets[i],model==='perceptron'?String(p):p.toFixed(4),p>=.5?1:0]){
            const td=document.createElement('td');
            td.textContent=value;
            tr.append(td)
        }
        return tr
    }));
    $('weights').textContent=JSON.stringify({
        epoch:frame.epoch,weights:frame.weights,biases:frame.biases
    },null,2);
    $('model-explanation').textContent=model==='perceptron'?'فصل ۲: نورون با آستانه سخت و به‌روزرسانی نمونه‌به‌نمونه. خروجی ۰ یا ۱ است، نه احتمال. XOR با یک جداکننده خطی حل نمی‌شود.':model==='linear'?'پل آموزشی: یک نورون سیگموید با گرادیان کاهشی و خطای BCE؛ این قانون آموزش با پرسپترون فصل ۲ متفاوت است. مرز تصمیم همچنان خطی است. خروجی‌های بسیار نزدیک ۰٫۵ نشانه تصمیم مطمئن نیستند؛ گرد کردن نمایش می‌تواند تفاوت ریز با آستانه طبقه‌بندی را پنهان کند.':'پل فصل ۳ و ۴: شبکه ۲–۴–۱ با فعال‌سازی سیگموید، گرادیان کاهشی و پس‌انتشار. این مدل، بازسازی مثال وزن‌های ازپیش‌تعیین‌شده ۲–۲–۱ با ReLU در جزوه نیست.';
    $('run-meta').replaceChildren();
    const architecture = document.createElement('bdi');
    architecture.dir='ltr';
    architecture.textContent=run.architecture.join(' → ');
    $('run-meta').append(`بذر: ${run.config.seed} · نرخ یادگیری: ${run.config.learning_rate} · ساختار: `, architecture, ` · ${run.checkpoints.length} گام ذخیره‌شده از ${run.config.epochs} دور`);
    $('step').disabled=frameIndex>=run.checkpoints.length-1;
    drawSurface(frame);
    drawLoss(frame);
    drawNetwork(frame)
}
$('gate').addEventListener('change',e=>{
    gate=e.target.value;
    selectRun()
});
$('model').addEventListener('change',e=>{
    model=e.target.value;
    selectRun()
});
$('frame').addEventListener('input',e=>{
    stop();
    frameIndex=Number(e.target.value);
    renderFrame()
});
$('step').addEventListener('click',()=>{
    stop();
    frameIndex=Math.min(frameIndex+1,currentRun().checkpoints.length-1);
    renderFrame()
});
$('reset').addEventListener('click',()=>{
    stop();
    frameIndex=0;
    renderFrame()
});
$('finish').addEventListener('click',()=>{
    stop();
    frameIndex=currentRun().checkpoints.length-1;
    renderFrame();
    $('run-status').textContent='نتیجه نهایی اجرای ضبط‌شده نمایش داده شد.'
});
$('play').addEventListener('click',()=>{
    if(timer){
        stop();
        return
    }
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){
        frameIndex=currentRun().checkpoints.length-1;
        renderFrame();
        $('run-status').textContent='به دلیل تنظیم کاهش حرکت، نتیجه نهایی بدون پویانمایی نمایش داده شد.';
        return
    }
    if(frameIndex>=currentRun().checkpoints.length-1)frameIndex=0;
    $('play').textContent='توقف پخش';
    timer=setInterval(()=>{
        frameIndex++;
        renderFrame();
        if(frameIndex>=currentRun().checkpoints.length-1){
            stop();
            $('run-status').textContent='بازپخش آموزش به پایان رسید.'
        }
    },450)
});
document.addEventListener('visibilitychange',()=>{
    if(document.hidden)stop()
});
async function loadLab(){
    try{
        const response=await fetch('assets/data/gates.json');
        if(!response.ok)throw new Error('network');
        dataset=await response.json();
        if(dataset.schema_version!==1||!dataset.gates?.XOR||!Array.isArray(dataset.truth_table_inputs))throw new Error('schema');
        for(const g of Object.values(dataset.gates))for(const run of Object.values(g.models)){
            if(!run.checkpoints?.length||!run.history?.length||!run.config||!run.architecture)throw new Error('run');
            for(const f of run.checkpoints)if(f.probabilities.length!==4||f.probabilities.some(x=>!Number.isFinite(x)))throw new Error('values')
        }
        $('gate').replaceChildren(...Object.keys(dataset.gates).map(key=>new Option(key,key)));
        $('gate').value=gate;
        for(const id of ['gate','model','play','step','reset','finish','frame'])$(id).disabled=false;
        selectRun();
        $('python-download').href='python/logic_gates.py';
        $('reproduce').textContent='python3 deep-learning/python/logic_gates.py --output deep-learning/assets/data/gates.json';
    } catch(error){
        stop();
        $('lab-error').hidden=false;
        $('lab-error').textContent='فایل اجرای آموزش بارگذاری نشد یا معتبر نیست. صفحه را از طریق وب‌سرور محلی باز کن و دوباره بارگذاری کن. کد پایتون همچنان قابل دریافت است.';
        for(const id of ['gate','model','play','step','reset','finish','frame'])$(id).disabled=true;
        console.error('Training trace unavailable',error)
    }
}
loadLab();
