// Every displayed value comes from the executed Python record, never a sample series.
function element(tag, className, text) {
  const item = document.createElement(tag);if(className)item.className=className;
  if(text!==undefined)item.textContent=text;return item;
}
const labels = {scores:'امتیازها (scores)',weights:'وزن‌ها (weights)',output:'خروجی (output)',
  gradient:'گرادیان (gradient)',updated:'پارامترهای تازه (updated)',predictions:'پیش‌بینی‌ها (predictions)'};
const isVector = value => Array.isArray(value)&&value.length>0&&value.every(x=>typeof x==='number'&&Number.isFinite(x));
const isMatrix = value => Array.isArray(value)&&value.length>0&&value.every(isVector)&&value.every(row=>row.length===value[0].length);
const format = value => typeof value==='number' ? Number(value.toPrecision(8)).toString() : String(value);

export function renderNotebookResult(root, result) {
  root.replaceChildren();root.hidden=result===undefined||result===null;if(root.hidden)return;
  root.append(element('h4','','خروجی محاسبهٔ پایتون'));
  const scalars=[],series=[];
  function collect(value,name='',depth=0) {
    if(isVector(value)||isMatrix(value)){series.push({name:name||'result',value});return;}
    if(value&&typeof value==='object'&&!Array.isArray(value)&&depth<3){
      for(const [key,item] of Object.entries(value))collect(item,name?name+'.'+key:key,depth+1);
    }else if(value===null||['number','string','boolean'].includes(typeof value))scalars.push([name||'result',value]);
  }
  collect(result);
  if(scalars.length){
    const table=element('table','nb-scalar-table');table.setAttribute('aria-label','مقدارهای محاسبه‌شده');
    for(const [name,value] of scalars.slice(0,32)){
      const row=element('tr'),key=element('th','',name),data=element('td','',format(value));key.scope='row';key.dir=data.dir='auto';row.append(key,data);table.append(row);
    }
    root.append(table);
  }
  if(series.length){
    const tabs=element('div','nb-result-fields'),plot=element('div','nb-result-plot'),readout=element('p','nb-result-readout','روی یک مقدار بزن تا عدد دقیق آن را ببینی.');
    tabs.setAttribute('role','group');tabs.setAttribute('aria-label','دادهٔ خروجی');readout.setAttribute('role','status');
    function choose(index){
      const {name,value}=series[index];plot.replaceChildren();
      [...tabs.children].forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
      readout.textContent='روی یک مقدار بزن تا عدد دقیق آن را ببینی.';readout.dir='rtl';
      if(isMatrix(value)){
        const table=element('table','nb-result-matrix');table.dir='ltr';table.setAttribute('aria-label',name);
        const maximum=Math.max(1,...value.slice(0,32).flatMap(row=>row.slice(0,32).map(Math.abs)));
        value.slice(0,32).forEach((row,i)=>{
          const tr=element('tr');row.slice(0,32).forEach((number,j)=>{
            const td=element('td'),button=element('button','',format(number));button.type='button';
            button.style.backgroundColor=`rgba(37,99,235,${.04+.22*Math.abs(number)/maximum})`;
            button.setAttribute('aria-label',`${name}[${i}][${j}] = ${number}`);
            button.addEventListener('click',()=>{readout.textContent=`${name}[${i}][${j}] = ${number}`;readout.dir='ltr';});td.append(button);tr.append(td);
          });table.append(tr);
        });plot.append(table);
        if(value.length>32||value[0].length>32)plot.append(element('p','nb-status','نمایش ۳۲ سطر و ستون نخست؛ همهٔ مقدارها در دادهٔ خام هستند.'));
      }else{
        const chart=element('div','nb-result-bars');chart.dir='ltr';chart.setAttribute('aria-label',name);
        const sample=value.slice(0,32),maximum=Math.max(1e-15,...sample.map(Math.abs));
        sample.forEach((number,i)=>{
          const button=element('button','nb-result-bar');button.type='button';button.setAttribute('aria-label',`${name}[${i}] = ${number}`);
          const track=element('span','nb-bar-track'),bar=element('span','nb-bar-fill');bar.style.width=Math.abs(number)/maximum*100+'%';bar.dataset.negative=String(number<0);track.append(bar);
          button.append(element('span','nb-bar-index',String(i)),track,element('bdi','',format(number)));
          button.addEventListener('click',()=>{readout.textContent=`${name}[${i}] = ${number}`;readout.dir='ltr';});chart.append(button);
        });plot.append(chart);
        if(sample.some(number=>number<0))plot.append(element('p','nb-status','طول میله قدر مطلق عدد است؛ علامت در مقدار نوشته شده و میلهٔ منفی قرمز است.'));
        if(value.length>32)plot.append(element('p','nb-status','نمایش ۳۲ مقدار نخست؛ بردار کامل در دادهٔ خام است.'));
      }
    }
    series.slice(0,24).forEach(({name},i)=>{const button=element('button','',labels[name]||name);button.type='button';button.addEventListener('click',()=>choose(i));tabs.append(button);});
    root.append(tabs,plot,readout);choose(0);
  }
  const raw=element('details','nb-result-raw'),summary=element('summary','','دادهٔ خام (JSON)'),pre=element('pre','',JSON.stringify(result,null,2));pre.dir='ltr';raw.append(summary,pre);root.append(raw);
  if(!scalars.length&&!series.length)raw.open=true;
}
