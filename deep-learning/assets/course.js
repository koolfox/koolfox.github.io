(() => {
  'use strict';
  const KEY='danna-learning-progress:v1';
  const context=JSON.parse(document.getElementById('course-context')?.textContent || '{}');
  const blank=()=>({schema_version:1,sessions:{},answers:{}});
  let progress=blank(), storageAvailable=true;
  function validRecord(record){
    if(!record || record.schema_version!==1 || !record.sessions || !record.answers)throw Error('format');
    const clean=blank();
    for(const [key,value] of Object.entries(record.sessions)){
      if(!/^(spring|fall)-20\d\d\/s\d{2}$/.test(key) || typeof value?.complete!=='boolean')throw Error('session');
      clean.sessions[key]={complete:value.complete};
    }
    for(const [key,value] of Object.entries(record.answers)){
      if(!/^(spring|fall)-20\d\d\/s\d{2}\/[a-z0-9-]+$/.test(key) || typeof value?.value!=='string' || value.value.length>10000)throw Error('answer');
      clean.answers[key]={value:value.value};
    }
    return clean;
  }
  try{const value=localStorage.getItem(KEY);if(value)progress=validRecord(JSON.parse(value));}
  catch(error){storageAvailable=false;}
  function warn(){
    if(document.querySelector('.storage-warning'))return;
    const p=document.createElement('p');p.className='storage-warning';p.role='status';
    p.textContent='ذخیره محلی در دسترس نیست یا داده قبلی خوانده نشد. پاسخ‌های این بازدید باقی می‌مانند؛ برای نگه‌داشتن آن‌ها نسخه پشتیبان بگیر.';
    document.querySelector('main')?.prepend(p);
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify(progress));}catch(error){storageAvailable=false;warn();}}
  if(!storageAvailable)warn();
  const sessionKey=context.term&&context.session?`${context.term}/${context.session}`:null;
  function drawProgress(){
    document.querySelectorAll('[data-session-key]').forEach(row=>{
      const done=progress.sessions[row.dataset.sessionKey]?.complete;
      row.querySelector('[data-completion-label]').textContent=done?'· خوانده و تمرین شده':'';
    });
    document.querySelectorAll('[data-term-progress]').forEach(el=>{
      const count=Object.entries(progress.sessions).filter(([key,v])=>key.startsWith(`${el.dataset.termProgress}/`)&&v.complete).length;
      el.textContent=count?` · ${count} جلسه را خوانده‌ای`:'';
    });
    const button=document.querySelector('[data-toggle-complete]');
    if(button){const done=!!progress.sessions[sessionKey]?.complete;button.setAttribute('aria-pressed',String(done));
      button.textContent=done?'خوانده و تمرین شده · برداشتن علامت':'این جلسه را خواندم و تمرین کردم';}
  }
  document.querySelector('[data-toggle-complete]')?.addEventListener('click',()=>{
    progress.sessions[sessionKey]={complete:!progress.sessions[sessionKey]?.complete};save();drawProgress();
    document.querySelector('[data-completion-message]').textContent=progress.sessions[sessionKey].complete?'در پیشرفت شخصی این ترم ثبت شد.':'علامت پایان برداشته شد.';
  });
  function normalizeNumber(text){return text.trim().replace(/[۰-۹]/g,n=>String(n.charCodeAt(0)-1776)).replace(/[٠-٩]/g,n=>String(n.charCodeAt(0)-1632)).replace(/٫/g,'.').replace(/−/g,'-');}
  document.querySelectorAll('form[data-exercise]').forEach(form=>{
    const config=JSON.parse(form.dataset.answer),key=`${sessionKey}/${form.dataset.exercise}`,feedback=form.querySelector('.feedback');
    const previous=progress.answers[key]?.value;
    if(previous!==undefined){
      if(config.kind==='choice'){const selected=[...form.querySelectorAll('input[type=radio]')].find(x=>x.value===previous);if(selected)selected.checked=true;}
      else form.elements.answer.value=previous;
    }
    form.addEventListener('submit',event=>{
      event.preventDefault();const value=String(new FormData(form).get('answer')??'').slice(0,10000);
      if(!value.trim()){feedback.textContent='ابتدا پاسخ خودت را وارد کن.';feedback.dataset.state='incorrect';return;}
      progress.answers[key]={value};save();
      if(config.kind==='manual'){feedback.textContent='استدلال ذخیره شد. پاسخ نمونه و معیارها را بخوان و استدلال خودت را مقایسه کن؛ تصحیح خودکار انجام نمی‌شود.';feedback.dataset.state='saved';return;}
      const number=Number(normalizeNumber(value));
      const correct=config.kind==='number'?Number.isFinite(number)&&Math.abs(number-config.value)<=(config.tolerance??0):Number(value)===config.correct_index;
      feedback.dataset.state=correct?'correct':'incorrect';
      feedback.textContent=correct?'درست است. روش رسیدن به پاسخ را هم توضیح بده.':'هنوز درست نیست. راهنمایی را ببین و دوباره امتحان کن.';
    });
  });
  document.querySelectorAll('[data-export-progress]').forEach(button=>button.addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob([JSON.stringify(progress,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='danna-learning-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }));
  document.querySelectorAll('[data-import-progress]').forEach(input=>input.addEventListener('change',async()=>{
    const message=input.closest('details').querySelector('[data-progress-message]');
    try{const file=input.files?.[0];if(!file || file.size>1024*1024)throw Error('size');
      const incoming=validRecord(JSON.parse(await file.text()));
      progress={schema_version:1,sessions:{...progress.sessions,...incoming.sessions},answers:{...progress.answers,...incoming.answers}};
      save();drawProgress();message.textContent='پیشرفت فایل با پیشرفت این مرورگر ترکیب شد. پاسخ‌های بازیابی‌شده در بازدید بعدی جلسه نمایش داده می‌شوند.';
    }catch(error){message.textContent='این فایل، نسخه پشتیبان معتبر این درس نیست؛ پیشرفت قبلی تغییر نکرد.';}
    input.value='';
  }));
  document.querySelectorAll('[data-show-source]').forEach(button=>button.addEventListener('click',()=>{
    let frame=button.parentElement.querySelector('iframe');
    if(frame){frame.remove();button.textContent='نمایش در همین صفحه';button.setAttribute('aria-expanded','false');return;}
    const source=button.dataset.showSource;if(!/^https?:\/\//.test(source))return;
    frame=document.createElement('iframe');frame.src=source;frame.title='اسلاید اصلی از وب‌سایت دانشگاه';frame.className='source-preview';frame.loading='lazy';frame.referrerPolicy='no-referrer';
    button.parentElement.append(frame);button.textContent='بستن نمایش اسلاید';button.setAttribute('aria-expanded','true');
  }));
  if(matchMedia('(max-width:700px)').matches)document.querySelectorAll('.source-panel details').forEach(el=>el.removeAttribute('open')); 
  window.addEventListener('storage',event=>{if(event.key===KEY){try{progress=event.newValue?validRecord(JSON.parse(event.newValue)):blank();drawProgress();}catch(error){warn();}}});
  drawProgress();
})();
