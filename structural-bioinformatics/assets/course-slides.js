const $ = id => document.getElementById(id);
const storageKey = 'structural-course-slide-notes-v1';
const labs = new Set(['sequence', 'geometry', 'energy', 'minimization', 'sampling', 'graph']);
let course, syllabus, topic, slides = [], current = 0, revision = 0;

function element(tag, text) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}
function notes() {
  try { const data = JSON.parse(localStorage.getItem(storageKey) || '{}'); return data && typeof data === 'object' && !Array.isArray(data) ? data : {}; }
  catch { return {}; }
}
function show(index, update = true) {
  if (!slides.length) return;
  current = Math.max(0, Math.min(slides.length - 1, index));
  slides.forEach((slide, index) => { slide.hidden = index !== current; });
  $('previous-slide').disabled = current === 0;
  $('next-slide').disabled = current === slides.length - 1;
  $('slide-select').value = String(current);
  $('slide-progress').textContent = `${(current + 1).toLocaleString('fa-IR')} / ${slides.length.toLocaleString('fa-IR')}`;
  if (update) history.replaceState(null, '', `?topic=${topic.session}#slide-${current + 1}`);
}
function blockSlide(headings, content) {
  const section = element('section'); section.dataset.kind = 'lesson';
  for (const heading of headings) section.append(heading.cloneNode(true));
  if (content) section.append(content);
  return section;
}
function makeTextSlides(source, sourceUrl) {
  const container = element('div');
  container.innerHTML = window.markdownit({html:false, linkify:false}).render(source.split('\n').slice(1).join('\n'));
  for (const node of container.querySelectorAll('a[href],img[src]')) {
    const attr = node.tagName === 'IMG' ? 'src' : 'href';
    try { const url = new URL(node.getAttribute(attr), sourceUrl); if (!['http:', 'https:'].includes(url.protocol)) throw Error(); node.setAttribute(attr, url.href); }
    catch { node.removeAttribute(attr); }
  }
  const result = []; let headings = [], pending = false;
  for (const node of [...container.children]) {
    if (/^H[2-6]$/.test(node.tagName)) {
      const level = Number(node.tagName.slice(1));
      headings = headings.filter(heading => Number(heading.tagName.slice(1)) < level);
      headings.push(node); pending = true; continue;
    }
    result.push(blockSlide(headings, node)); pending = false;
  }
  if (pending) result.push(blockSlide(headings));
  return result;
}
function selfCheck(active) {
  const section = element('section'); section.dataset.kind = 'check';
  section.append(element('h2', 'خودآزمایی'), element('p', active.check.question));
  const label = element('label', 'پاسخ خودتان'); label.htmlFor = 'own-slide-answer';
  const textarea = element('textarea'); textarea.id = 'own-slide-answer'; textarea.value = typeof notes()[active.session] === 'string' ? notes()[active.session] : '';
  const hint = element('p', 'پس از نوشتن، پاسخ در همین مرورگر ذخیره می‌شود.'); hint.id = 'save-status'; hint.setAttribute('role', 'status');
  textarea.addEventListener('input', () => { try { const data=notes(); data[active.session]=textarea.value; localStorage.setItem(storageKey, JSON.stringify(data)); hint.textContent='پاسخ در همین مرورگر ذخیره شد.'; } catch { hint.textContent='ذخیره در مرورگر ممکن نشد؛ پاسخ را پیش از خروج نگه دارید.'; } });
  const details = element('details'), summary = element('summary', 'دیدن پاسخ نمونه');
  details.append(summary, element('p', active.check.answer));
  section.append(label, textarea, hint, details); return section;
}
function evidenceExercise() {
  const section = element('section'); section.dataset.kind = 'evidence';
  section.append(element('h2', 'برای این پرسش چه داده‌ای لازم است؟'));
  section.append(element('p', 'برای هر پرسش یک نوع داده انتخاب کنید؛ سپس توضیح هر پاسخ را ببینید.'));
  const items = [
    ['ترتیب اسیدهای آمینهٔ یک زنجیره چیست؟', 'sequence', 'توالی ترتیب واحدها را ثبت می‌کند.'],
    ['فاصلهٔ دو اتم در ساختار ثبت‌شده چند آنگستروم است؟', 'coordinates', 'برای محاسبهٔ فاصله به مختصات اتم‌های انتخاب‌شده نیاز داریم.'],
    ['آیا پروتئین در شرایط مشخص یک کار زیستی را انجام می‌دهد؟', 'experiment', 'برای عملکرد باید آزمایش و شرایط مرتبط را بررسی کنیم؛ تصویر به‌تنهایی کافی نیست.'],
  ];
  const choices = [['', 'انتخاب کنید'], ['sequence', 'توالی اسیدهای آمینه'], ['coordinates', 'مختصات اتم‌ها'], ['experiment', 'آزمایش عملکردی متناسب']];
  const storeKey = 'structural-course-evidence-v1';
  let saved = []; try { const parsed = JSON.parse(localStorage.getItem(storeKey) || '[]'); if (Array.isArray(parsed)) saved = parsed; } catch { /* Continue without saved answers. */ }
  const controls = [], feedbacks = [];
  items.forEach(([question], index) => {
    const group = element('div'); group.className = 'evidence-question';
    const label = element('label', question); label.htmlFor = `evidence-${index}`;
    const select = element('select'); select.id = label.htmlFor;
    choices.forEach(([value, text]) => { const option = element('option', text); option.value = value; select.append(option); });
    if (choices.some(([value]) => value === saved[index])) select.value = saved[index];
    const feedback = element('p'); feedback.setAttribute('aria-live', 'polite'); feedback.hidden = true;
    select.addEventListener('change', () => { feedback.hidden = true; try { localStorage.setItem(storeKey, JSON.stringify(controls.map(control => control.value))); } catch { status.textContent = 'ذخیره در مرورگر ممکن نشد؛ پاسخ‌ها تا زمان بازبودن صفحه باقی می‌مانند.'; } });
    controls.push(select); feedbacks.push(feedback); group.append(label, select, feedback); section.append(group);
  });
  const button = element('button', 'بررسی پاسخ‌ها'); button.type = 'button';
  const status = element('p', 'پاسخ‌ها در همین مرورگر ذخیره می‌شوند.'); status.setAttribute('role', 'status');
  button.addEventListener('click', () => {
    items.forEach(([, answer, explanation], index) => { const value = controls[index].value; feedbacks[index].textContent = value ? (value === answer ? 'درست است. ' : 'دوباره بررسی کنید. ') + explanation : 'ابتدا یک گزینه انتخاب کنید.'; feedbacks[index].hidden = false; });
    status.textContent = 'توضیح پاسخ‌ها زیر هر پرسش نمایش داده شد.';
  });
  section.append(button, status); return section;
}
function structureInterpretationExercise() {
  const section = element('section'); section.dataset.kind = 'structure-interpretation';
  section.append(element('h2', 'کدام مدل برای این پرسش مناسب‌تر است؟'));
  section.append(element('p', 'مثال فرضی: می‌خواهیم فاصله‌ای را در یک حلقه بررسی کنیم. هر دو مدل سازه و حالت مولکولی مناسب دارند. مدل A تفکیک‌پذیری ۱٫۸ آنگستروم دارد، اما حلقه در آن مدل نشده است. مدل B با تفکیک‌پذیری ۲٫۵ آنگستروم، حلقه‌ای با پشتیبانی محلی قابل بررسی دارد.'));
  const label = element('label', 'انتخاب شما برای شروع بررسی حلقه'); label.htmlFor = 'structure-choice';
  const select = element('select'); select.id = label.htmlFor;
  [['', 'انتخاب کنید'], ['a', 'مدل A'], ['b', 'مدل B'], ['either', 'هر دو به یک اندازه']].forEach(([value, text]) => { const option = element('option', text); option.value = value; select.append(option); });
  const button = element('button', 'بررسی انتخاب'); button.type = 'button';
  const feedback = element('p'); feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
  select.addEventListener('change', () => { feedback.textContent = ''; });
  button.addEventListener('click', () => {
    const answers = {
      '': 'ابتدا یک گزینه انتخاب کنید.',
      a: 'دوباره بررسی کنید: در A مختصات حلقه وجود ندارد؛ عدد کلی کوچک‌تر جای اطلاعات محلی را نمی‌گیرد.',
      b: 'انتخاب مناسبی برای شروع است: در B حلقه مدل شده است. پیش از گزارش فاصله، نقشه، حالت‌های جایگزین و اعتبارسنجی همان محل را بررسی کنید؛ وجود مختصات به‌تنهایی کافی نیست.',
      either: 'دوباره بررسی کنید: A برای حلقهٔ مورد نظر مختصاتی ندارد، پس دو مدل برای این پرسش اطلاعات یکسانی ندارند.'
    };
    feedback.textContent = answers[select.value];
  });
  section.append(label, select, button, feedback); return section;
}
function assemblyExercise() {
  const section = element('section'); section.dataset.kind = 'assembly-choice';
  section.append(element('h2', 'کدام فایل برای بررسی رابط مناسب است؟'));
  section.append(element('p', 'در این مثال فرضی، فایل واحد نامتقارن یک زنجیره دارد. رکورد توضیح می‌دهد که مجموعه زیستی پیشنهادی از دو نسخه همین زنجیره با یک تبدیل ساخته می‌شود. هدف، بررسی رابط میان دو نسخه است.'));
  const label = element('label', 'انتخاب شما'); label.htmlFor = 'assembly-choice';
  const select = element('select'); select.id = label.htmlFor;
  [['', 'انتخاب کنید'], ['asu', 'فقط فایل واحد نامتقارن'], ['assembly', 'فایل مجموعه زیستی پیشنهادی'], ['neighbors', 'همه همسایه‌های بلور']].forEach(([value, text]) => { const option = element('option', text); option.value = value; select.append(option); });
  const button = element('button', 'بررسی انتخاب'); button.type = 'button';
  const feedback = element('p'); feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
  select.addEventListener('change', () => { feedback.textContent = ''; });
  button.addEventListener('click', () => {
    const answers = {
      '': 'ابتدا یک گزینه انتخاب کنید.',
      asu: 'دوباره بررسی کنید: در فایل فرضی فقط یک نسخه هست و رابط دو نسخه دیده نمی‌شود.',
      assembly: 'برای شروع مناسب است: دو نسخه در فایل پیشنهادی هستند. شناسه زنجیره‌ها، تبدیل و شواهد مجموعه را بررسی کنید؛ این انتخاب به تنهایی عملکرد را ثابت نمی‌کند.',
      neighbors: 'دوباره بررسی کنید: نزدیک بودن در بلور به تنهایی نشان نمی‌دهد هر همسایه شریک زیستی است.'
    };
    feedback.textContent = answers[select.value];
  });
  section.append(label, select, button, feedback); return section;
}
function reverseComplementExercise() {
  const section = element('section'); section.dataset.kind = 'reverse-complement';
  section.append(element('h2', 'مکمل معکوس را خودتان پیدا کنید'));
  section.append(element('p', 'توالی DNA را از ۵′ به ۳′ بنویسید؛ سپس مکمل آن را نیز از ۵′ به ۳′ وارد کنید. فقط حروف A، C، G و T پذیرفته می‌شوند.'));
  const storeKey = 'structural-course-reverse-complement-v1';
  const sourceLabel = element('label', 'توالی ورودی در جهت ۵′ به ۳′'); sourceLabel.htmlFor = 'dna-input';
  const source = element('input'); source.id = sourceLabel.htmlFor; source.type = 'text'; source.maxLength = 60; source.value = 'AGCTG'; source.dir = 'ltr'; source.autocomplete = 'off'; source.spellcheck = false;
  const answerLabel = element('label', 'پاسخ شما در جهت ۵′ به ۳′'); answerLabel.htmlFor = 'dna-answer';
  const answer = element('input'); answer.id = answerLabel.htmlFor; answer.type = 'text'; answer.maxLength = 60; answer.dir = 'ltr'; answer.autocomplete = 'off'; answer.spellcheck = false;
  try { const saved = JSON.parse(localStorage.getItem(storeKey) || 'null'); if (saved && typeof saved.source === 'string' && typeof saved.answer === 'string') { source.value = saved.source; answer.value = saved.answer; } } catch { /* Keep defaults if storage is unavailable. */ }
  const feedback = element('p'); feedback.setAttribute('role', 'status');
  const save = element('p', 'پس از نوشتن، پاسخ در همین مرورگر ذخیره می‌شود.'); save.setAttribute('role', 'status');
  const persist = () => { feedback.textContent = ''; try { localStorage.setItem(storeKey, JSON.stringify({source:source.value,answer:answer.value})); save.textContent='در همین مرورگر ذخیره شد.'; } catch { save.textContent='ذخیره ممکن نشد؛ تا زمان بازبودن صفحه می‌توانید تمرین کنید.'; } };
  source.addEventListener('input', persist); answer.addEventListener('input', persist);
  const button = element('button', 'بررسی مکمل معکوس'); button.type = 'button';
  button.addEventListener('click', () => {
    const original = source.value.trim().toUpperCase(), supplied = answer.value.trim().toUpperCase();
    if (!/^[ACGT]+$/.test(original) || !/^[ACGT]+$/.test(supplied)) { feedback.textContent='هر دو کادر را فقط با حروف A، C، G و T پر کنید.'; return; }
    const paired = [...original].map(base => ({A:'T',C:'G',G:'C',T:'A'})[base]).join('');
    const expected = [...paired].reverse().join('');
    feedback.textContent = supplied === expected ? `درست است. مکمل روبه‌رو 3′-${paired}-5′ و مکمل معکوس 5′-${expected}-3′ است.` : `پاسخ را دوباره بررسی کنید. مکمل روبه‌رو 3′-${paired}-5′ است؛ برای نوشتن از ۵′ به ۳′ ترتیب آن را وارونه کنید.`;
  });
  section.append(sourceLabel, source, answerLabel, answer, button, feedback, save); return section;
}
function dockingSlide() {
  const section=element('section'); section.dataset.kind='lab';
  section.append(element('h2','کارگاه داکینگ'), element('p','یک نمونهٔ ثبت‌شدهٔ بازداکینگ را با دادهٔ بلوری مقایسه کنید؛ این صفحه داکینگ تازه اجرا نمی‌کند.'));
  const link=element('a','بازکردن کارگاه داکینگ'); link.href='../docking.html'; section.append(link); return section;
}
function labSlide(active) {
  const section = element('section'); section.dataset.kind = 'lab';
  section.append(element('h2', 'آزمایش و کد'), element('p', 'آزمایش همین مبحث را در مرورگر اجرا کنید و پارامترها یا کد آن را تغییر دهید. بارگذاری نخست محیط Python ممکن است زمان ببرد.'));
  const url = new URL('../runtime/concepts/', location.href); url.searchParams.set('experiment', active.laboratory); url.searchParams.set('topic', active.session);
  const button = element('button', 'بارگذاری آزمایشگاه در همین اسلاید'); button.type = 'button';
  const open = element('a', 'بازکردن آزمایشگاه در صفحهٔ جدا'); open.href = url.href;
  const status = element('p'); status.setAttribute('role', 'status');
  button.addEventListener('click', async () => {
    if (section.querySelector('iframe')) return;
    button.disabled = true; status.textContent = 'در حال بررسی دسترسی آزمایشگاه…';
    try {
      let response = await fetch(url.href, {method:'HEAD'});
      if (response.status === 405) response = await fetch(url.href);
      if (!response.ok) throw Error('unavailable');
      const frame = element('iframe'); frame.title = `آزمایشگاه ${active.title}`; frame.src = url.href;
      section.append(frame); status.textContent = 'آزمایشگاه باز شد؛ بارگذاری Python ممکن است زمان ببرد.';
    } catch {
      status.textContent = 'آزمایشگاه در این نشانی در دسترس نیست. برای نسخهٔ محلی از scripts/serve_local.py استفاده کنید و دوباره تلاش کنید.';
      button.disabled = false;
    }
  });
  const openLine=element('p'); openLine.append(open); section.append(button, openLine, status); return section;
}
async function load() {
  const ticket = ++revision; $('lesson-deck').setAttribute('aria-busy','true'); $('lesson-title').textContent='در حال دریافت درس…'; $('chapter-title').textContent=''; $('lesson-slide').replaceChildren(); $('slide-status').textContent='در حال دریافت درس…'; $('retry-lesson').hidden=true;
  $('previous-slide').disabled=true; $('next-slide').disabled=true; $('slide-select').disabled=true; $('print-lesson').disabled=true; slides=[];
  try {
    if (!course || !syllabus) {
      const responses = await Promise.all([fetch('../data/metadata/learning-course.json'), fetch('../data/metadata/course-syllabus.json')]);
      if (responses.some(response => !response.ok)) throw Error('فهرست درس در دسترس نیست.');
      [course, syllabus] = await Promise.all(responses.map(response => response.json()));
    }
    const requested = Number(new URLSearchParams(location.search).get('topic') || 1);
    topic = course.sessions.find(item => item.session === requested) || course.sessions[0];
    if (!topic || !/^docs\/course\/session-\d{2}\.fa\.md$/.test(topic.path)) throw Error('مسیر درس معتبر نیست.');
    const root = new URL('../', location.href), sourceUrl = new URL(topic.path, root);
    const response = await fetch(sourceUrl); if (!response.ok) throw Error('متن درس دریافت نشد.');
    const source = await response.text(); if (ticket !== revision) return;
    if (!window.markdownit || !source.trim()) throw Error('متن درس برای نمایش آماده نیست.');
    const textSlides = makeTextSlides(source, sourceUrl); if (!textSlides.length) throw Error('متن درس خالی است.');
    slides = [...textSlides, ...(topic.session === 1 ? [evidenceExercise()] : []), ...(topic.session === 5 ? [reverseComplementExercise()] : []), ...(topic.session === 11 ? [structureInterpretationExercise()] : []), ...(topic.session === 12 ? [assemblyExercise()] : []), selfCheck(topic)]; if (labs.has(topic.laboratory)) slides.push(labSlide(topic)); else if (topic.block === 'docking') slides.push(dockingSlide());
    $('lesson-slide').replaceChildren(...slides);
    $('lesson-title').textContent=topic.title; document.title=`${topic.title} | اسلاید درس`;
    const block = syllabus.blocks.find(item => item.id === topic.block); $('chapter-title').textContent=block?.title || ''; $('chapter-title').hidden=!block || block.title === topic.title;
    const select=$('lesson-select'); select.replaceChildren();
    for (const chapter of syllabus.blocks) { const group=element('optgroup'); group.label=chapter.title; for (const item of course.sessions.filter(value => value.block === chapter.id)) { const option=element('option',item.title); option.value=String(item.session); group.append(option); } select.append(group); }
    select.value=String(topic.session); select.disabled=false;
    $('back-to-lesson').href=`../course.html?topic=${topic.session}`;
    const slideSelect=$('slide-select'); slideSelect.replaceChildren(); slides.forEach((slide,index) => { const title=slide.querySelector('h2,h3,h4,h5,h6')?.textContent || 'متن درس'; const option=element('option',`${(index+1).toLocaleString('fa-IR')} · ${title}`); option.value=String(index); option.dataset.kind=slide.dataset.kind || 'lesson'; slideSelect.append(option); });
    slideSelect.disabled=false; $('print-lesson').disabled=false; $('slide-status').textContent=''; $('lesson-deck').setAttribute('aria-busy','false');
    const requestedSlide=Number(location.hash.match(/^#slide-(\d+)$/)?.[1] || 1); show(Number.isInteger(requestedSlide) ? requestedSlide-1 : 0);
  } catch (error) { if(ticket!==revision)return; $('lesson-deck').setAttribute('aria-busy','false'); $('lesson-title').textContent='درس در دسترس نیست'; $('slide-status').textContent=`درس نمایش داده نشد: ${error.message}`; $('retry-lesson').hidden=false; }
}
$('previous-slide').addEventListener('click',()=>show(current-1));
$('next-slide').addEventListener('click',()=>show(current+1));
$('slide-select').addEventListener('change',event=>show(Number(event.target.value)));
$('lesson-select').addEventListener('change',event=>{ history.pushState(null,'',`?topic=${event.target.value}#slide-1`); load(); });
$('retry-lesson').addEventListener('click',load);
$('print-lesson').addEventListener('click',()=>window.print());
window.addEventListener('popstate',load);
document.addEventListener('keydown',event=>{ if(event.altKey||event.ctrlKey||event.metaKey||/INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target.tagName)||event.target.isContentEditable)return; const actions={ArrowLeft:()=>show(current+1),ArrowRight:()=>show(current-1),Home:()=>show(0),End:()=>show(slides.length-1)}; if(actions[event.key]){event.preventDefault();actions[event.key](); $('lesson-slide').focus({preventScroll:true});} });
load();
