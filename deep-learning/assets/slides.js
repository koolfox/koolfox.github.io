(() => {
  'use strict';
  const slides=[...document.querySelectorAll('.dl-slide')];if(!slides.length)return;
  const select=document.querySelector('[data-deck-select]'),prev=document.querySelector('[data-deck-prev]'),next=document.querySelector('[data-deck-next]'),progress=document.querySelector('[data-deck-progress]'),status=document.querySelector('[data-deck-status]');
  let current=0;
  const fa=n=>new Intl.NumberFormat('fa-IR',{useGrouping:false}).format(n);
  slides.forEach((slide,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=`${fa(i+1)}. ${slide.dataset.slideTitle}`;select.append(option);});
  function show(index,update=true){
    current=Math.max(0,Math.min(slides.length-1,index));slides.forEach((s,i)=>s.hidden=i!==current);
    prev.disabled=current===0;next.disabled=current===slides.length-1;select.value=String(current);progress.textContent=`${fa(current+1)} / ${fa(slides.length)}`;
    if(update)history.replaceState(null,'',`#slide-${current+1}`);
    window.scrollTo({top:0,behavior:'instant'});document.documentElement.dataset.deckReady='true';
    document.dispatchEvent(new CustomEvent('deck:change'));
  }
  function fromHash(){const n=Number(location.hash.match(/^#slide-(\d+)$/)?.[1]);return Number.isInteger(n)&&n>0&&n<=slides.length?n-1:0;}
  prev.addEventListener('click',()=>show(current-1));next.addEventListener('click',()=>show(current+1));select.addEventListener('change',()=>show(Number(select.value)));select.disabled=false;
  document.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey||/INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target.tagName)||event.target.isContentEditable)return;
    const actions={ArrowLeft:()=>show(current+1),PageDown:()=>show(current+1),ArrowRight:()=>show(current-1),PageUp:()=>show(current-1),Home:()=>show(0),End:()=>show(slides.length-1)};
    if(actions[event.key]){event.preventDefault();actions[event.key]();}
  });
  window.addEventListener('hashchange',()=>show(fromHash(),false));
  document.querySelector('[data-deck-fullscreen]').addEventListener('click',async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
    catch{status.textContent='مرورگر تمام‌صفحه را اجازه نداد؛ اسلایدها در همین اندازه قابل استفاده‌اند.';}
  });
  const print=document.querySelector('[data-deck-print]');document.fonts.ready.then(()=>print.disabled=false);print.addEventListener('click',()=>window.print());
  let printDetails=[];
  window.addEventListener('beforeprint',()=>{printDetails=[...document.querySelectorAll('.dl-slide details')].map(d=>[d,d.open]);printDetails.forEach(([d])=>d.open=true);});
  window.addEventListener('afterprint',()=>printDetails.forEach(([d,open])=>d.open=open));
  progress.dir='ltr';
  document.querySelectorAll('[data-deck-step]').forEach(button=>{
    const points=[...button.closest('.slide-steps').querySelectorAll('[data-deck-point]')];let step=0;
    function draw(){points.forEach((p,i)=>{p.toggleAttribute('data-upcoming',i>step);p.setAttribute('aria-current',String(i===step));});button.textContent=step===points.length-1?'از نکتهٔ اول':'نکتهٔ بعدی';}
    button.addEventListener('click',()=>{step=(step+1)%points.length;draw();});draw();
  });
  show(fromHash());
})();
