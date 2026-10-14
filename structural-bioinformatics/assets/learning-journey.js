const project = new URL('../', import.meta.url);
const storageKey = 'tnf-learning-progress-v1';
const fa = value => new Intl.NumberFormat('fa-IR').format(value);
const $ = id => document.getElementById(id);

function node(tag, text) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  return element;
}

function destination(resource, lesson) {
  const url = new URL(project);
  const reading = resource.document ? resource : lesson.resources.find(entry => entry.document);
  if (reading) {
    url.searchParams.set('document', reading.document);
    url.searchParams.set('chapter', reading.chapter);
  }
  url.searchParams.set('lesson', lesson.id);
  url.hash = resource.hash || 'lesson-guide';
  return url;
}

function setLink(link, resource, lesson) {
  link.href = destination(resource, lesson).href;
  link.dataset.lesson = lesson.id;
  if (resource.document) link.dataset.document = resource.document;
  else delete link.dataset.document;
}

export async function initializeLearningJourney() {
  if (!$('study-path')) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  let data;
  try {
    const response = await fetch(new URL('data/metadata/learning-journey.json', project), { signal: controller.signal, cache: 'no-cache' });
    if (!response.ok) throw new Error('Course unavailable');
    data = await response.json();
    if (data.version !== 1 || data.lessons?.length !== 9) throw new Error('Unexpected course');
  } catch {
    $('study-status').textContent = 'فهرست مرحله‌ها خوانده نشد؛ دکمهٔ شروع و راهنمای متنی مسیر یادگیری همچنان قابل استفاده‌اند.';
    $('study-status').dataset.state = 'error';
    return;
  } finally { clearTimeout(timeout); }
  const lessons = data.lessons;
  let state = { current: '1', completed: [] };
  let stored = true;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved?.version === 1 && Array.isArray(saved.completed)) {
      state.completed = saved.completed.filter(id => lessons.some(lesson => lesson.id === id));
      if (lessons.some(lesson => lesson.id === saved.current)) state.current = saved.current;
    }
  } catch { stored = false; }

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, ...state })); }
    catch { stored = false; }
  }

  function slidesLink(link) {
    link.href = new URL('presentation.html#slide-1', project).href;
    delete link.dataset.document;
    delete link.dataset.lesson;
  }

  function render() {
    if (!$('study-path')) return;
    const completed = new Set(state.completed);
    const learned = lessons.slice(0, 8).filter(lesson => completed.has(lesson.id)).length;
    const current = lessons.find(lesson => lesson.id === state.current) || lessons[0];
    const suggested = completed.has(current.id)
      ? lessons.find(lesson => !completed.has(lesson.id)) || lessons[8] : current;
    const finished = learned === 8 && completed.has('9');
    const start = $('study-start');
    if (finished) {
      slidesLink(start);
      start.textContent = 'شروع ارائه از اسلاید ۱';
    } else {
      setLink(start, suggested.resources[0], suggested);
      start.textContent = learned === 0 && suggested.id === '1'
        ? 'از اینجا شروع کنید: سلول، ژن و پروتئین'
        : (suggested.phase === 'practice' ? 'گام بعد: تمرین ارائه' : 'ادامهٔ بخش ' + fa(Number(suggested.id)) + ': ' + suggested.title);
    }
    $('study-status').dataset.state = 'ready';
    $('study-status').textContent = learned === 8
      ? (finished ? '۸ بخش یادگیری و تمرین ارائه را علامت زده‌اید؛ اکنون اسلایدها را از ابتدا باز کنید.' : '۸ بخش یادگیری را علامت زده‌اید؛ گام بعدی تمرین بیان مطالب است.')
      : 'پیشرفت مطالعه: ' + fa(learned) + ' از ۸ بخش. هر بار فقط بخش بعدی را بخوانید.';
    const list = $('study-steps');
    list.replaceChildren();
    for (const lesson of lessons) {
      const item = node('li');
      const link = node('a', lesson.phase === 'practice' ? 'پس از یادگیری: تمرین ارائه' : fa(Number(lesson.id)) + '. ' + lesson.title);
      setLink(link, lesson.resources[0], lesson);
      item.append(link, node('span', completed.has(lesson.id) ? 'خوانده شده' : lesson.phase === 'practice' ? 'پس از بخش هشتم' : 'برای مطالعه'));
      list.append(item);
    }
    const query = new URL(location.href).searchParams.get('lesson');
    const selected = lessons.find(lesson => lesson.id === query);
    document.body.dataset.learningMode = String(Boolean(selected));
    $('lesson-guide').hidden = !selected;
    $('lesson-finish').hidden = !selected;
    if (!selected) return;
    $('lesson-title').textContent = selected.phase === 'practice'
      ? 'مرحلهٔ دوم: تمرین ارائه' : 'یادگیری · بخش ' + fa(Number(selected.id)) + ' از ۸: ' + selected.title;
    $('lesson-goal').textContent = selected.goal;
    const resources = $('lesson-resources');
    resources.replaceChildren();
    for (const resource of selected.resources) {
      const link = node('a', resource.label);
      setLink(link, resource, selected);
      resources.append(link);
    }
    $('lesson-check').textContent = selected.check;
    $('lesson-save-note').textContent = stored
      ? 'پس از انجام این تمرین، پایان مطالعه را علامت بزنید. وضعیت روی همین مرورگر نگه داشته می‌شود.'
      : 'پس از انجام تمرین، پایان مطالعه را علامت بزنید. در این مرورگر وضعیت فقط تا پایان همین نوبت نگه داشته می‌شود.';
    const button = $('lesson-complete');
    const done = completed.has(selected.id);
    button.dataset.lesson = selected.id;
    button.setAttribute('aria-pressed', String(done));
    button.textContent = done ? 'این بخش را خوانده‌ام · برداشتن علامت' : selected.phase === 'practice' ? 'تمرین ارائه را انجام دادم' : 'این بخش را خواندم و تمرین را انجام دادم';
    button.disabled = $('reading-status').dataset.state !== 'ready';
    const next = $('lesson-next');
    next.hidden = !done;
    if (selected.id === '9') {
      slidesLink(next);
      next.textContent = 'مرحلهٔ سوم: شروع ارائه از اسلاید ۱';
    } else {
      const following = lessons[Number(selected.id)];
      setLink(next, following.resources[0], following);
      next.textContent = following.phase === 'practice' ? 'پایان یادگیری؛ حالا تمرین ارائه' : 'حالا بخش ' + fa(Number(following.id)) + ': ' + following.title;
    }
  }

  function followURL() {
    if (!$('study-path')) return;
    const selected = new URL(location.href).searchParams.get('lesson');
    if (lessons.some(lesson => lesson.id === selected)) {
      state.current = selected;
      save();
    }
    render();
  }
  $('lesson-complete').addEventListener('click', event => {
    const id = event.currentTarget.dataset.lesson;
    state.completed = state.completed.includes(id) ? state.completed.filter(value => value !== id) : [...state.completed, id];
    save();
    render();
    $('lesson-feedback').textContent = state.completed.includes(id) ? 'پایان مطالعه ثبت شد؛ پیوند گام بعد اکنون در دسترس است.' : 'علامت پایان مطالعه برداشته شد.';
  });
  document.addEventListener('click', event => {
    if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.target.closest('a[href]')) requestAnimationFrame(() => {
      followURL();
      if (location.hash === '#lesson-guide' && !$('lesson-guide')?.hidden) $('lesson-guide')?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  });
  window.addEventListener('popstate', followURL);
  window.addEventListener('hashchange', followURL);
  new MutationObserver(() => {
    followURL();
    if ($('reading-status')?.dataset.state === 'ready' && location.hash === '#lesson-guide' && !$('lesson-guide')?.hidden) $('lesson-guide')?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }).observe($('reading-status'), { attributes: true, attributeFilter: ['data-state', 'data-document', 'data-chapter'] });
  followURL();
  if (location.hash === '#lesson-guide') requestAnimationFrame(() => $('lesson-guide')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
}
