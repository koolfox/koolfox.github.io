import { isolateScientificText } from './text-direction.js';
/** Audience slides and the research reader share one Markdown source. */
const source = new URL('../docs/class-presentation.fa.md', import.meta.url);
const project = new URL('../', import.meta.url);
const deck = document.getElementById('deck');
const status = document.getElementById('deck-status');
const select = document.getElementById('slide-select');
const previous = document.getElementById('slide-prev');
const next = document.getElementById('slide-next');
let slides = [];
let current = 0;
let diagramLibrary;
const fa = number => new Intl.NumberFormat('fa-IR').format(number);

function textElement(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function addSlideIdentity(slide, details) {
  const header = document.createElement('header');
  header.className = 'slide-header';
  const university = document.createElement('div');
  university.append(
    textElement('p', details.institution, 'slide-institution'),
    textElement('p', 'درس ' + details.course, 'slide-course'),
  );
  const logo = document.createElement('img');
  logo.className = 'university-logo';
  logo.src = new URL(details.logo.path, project).href;
  logo.alt = 'نشان ' + details.institution;
  logo.width = details.logo.width;
  logo.height = details.logo.height;
  header.append(university, logo);
  const content = document.createElement('div');
  content.className = 'slide-content';
  content.append(...slide.childNodes);
  const footer = document.createElement('footer');
  footer.className = 'slide-footer';
  footer.append(textElement('p', details.short_title), textElement('p', details.season));
  slide.append(header, content, footer);
}

function createCover(details) {
  const cover = document.createElement('section');
  cover.className = 'slide cover';
  cover.hidden = true;
  cover.append(textElement('h1', details.title), textElement('p', details.subtitle, 'cover-subtitle'));
  const identity = document.createElement('div');
  identity.className = 'cover-details';
  const supervisor = document.createElement('p');
  const profile = document.createElement('a');
  profile.className = 'supervisor-profile';
  profile.href = details.supervisor_profile_url;
  profile.textContent = 'استاد راهنما: ' + details.supervisor;
  supervisor.append(profile);
  identity.append(
    textElement('p', details.program),
    textElement('p', 'ارائه‌دهنده: ' + details.presenter),
    supervisor,
    textElement('p', 'زمان ارائه: ' + details.season),
  );
  cover.append(identity);
  return cover;
}

function loadDiagrams() {
  if (!diagramLibrary) diagramLibrary = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('vendor/mermaid/mermaid.min.js', import.meta.url);
    script.onload = () => {
      window.mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral', fontFamily: 'arad', flowchart: { htmlLabels: false } });
      resolve(window.mermaid);
    };
    script.onerror = () => reject(new Error('diagram unavailable'));
    document.head.append(script);
  });
  return diagramLibrary;
}

async function renderDiagrams() {
  const diagrams = [...deck.querySelectorAll('pre code.language-mermaid')];
  if (!diagrams.length) return;
  try {
    const mermaid = await loadDiagrams();
    await document.fonts.ready;
    for (const [index, code] of diagrams.entries()) {
      const { svg } = await mermaid.render('slide-diagram-' + index, code.textContent);
      const figure = document.createElement('figure');
      figure.className = 'slide-diagram';
      figure.innerHTML = svg;
      const graphic = figure.querySelector('svg');
      graphic.setAttribute('role', 'img');
      graphic.setAttribute('aria-label', 'طرح مفهومی پیام‌رسانی TNF و مهار آن؛ مقیاس اتمی ندارد');
      code.parentElement.replaceWith(figure);
    }
  } catch {
    for (const code of deck.querySelectorAll('pre code.language-mermaid')) {
      const note = document.createElement('p');
      note.textContent = 'طرح مفهومی: اتصال TNF به گیرنده، پیام درون سلول را آغاز می‌کند. آدالیموماب با اتصال به TNF این تعامل را محدود می‌کند.';
      code.parentElement.replaceWith(note);
    }
    deck.dataset.diagram = 'fallback';
  }
}

function hashIndex() {
  const number = Number(location.hash.match(/^#slide-(\d+)$/)?.[1]);
  return Number.isInteger(number) && number >= 1 && number <= slides.length ? number - 1 : 0;
}

function show(index, focus = false) {
  if (!slides.length) return;
  current = Math.max(0, Math.min(slides.length - 1, index));
  for (const [number, slide] of slides.entries()) slide.hidden = number !== current;
  select.value = String(current);
  previous.disabled = current === 0;
  next.disabled = current === slides.length - 1;
  document.getElementById('slide-progress').textContent = `${fa(current + 1)} / ${fa(slides.length)}`;
  document.getElementById('notebook-link').href = `index.html?document=class-presentation.fa.md&chapter=chapter-${slides[current].dataset.chapter || 1}#reading`;
  history.replaceState(null, '', '#slide-' + (current + 1));
  document.title = slides[current].querySelector('h1').textContent + ' · ارائهٔ کلاسی';
  if (focus) { deck.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
}

async function load() {
  deck.setAttribute('aria-busy', 'true');
  document.getElementById('retry-deck').hidden = true;
  status.textContent = 'در حال آماده‌سازی اسلایدها…';
  try {
    const [response, metadata] = await Promise.all([
      fetch(source, { signal: AbortSignal.timeout(15000) }),
      fetch(new URL('data/metadata/presentation.json', project), { signal: AbortSignal.timeout(15000) }),
    ]);
    if (!response.ok || !metadata.ok) throw new Error('source unavailable');
    const details = await metadata.json();
    const markdown = window.markdownit({ html: false, linkify: false });
    const documentRoot = document.createElement('div');
    documentRoot.innerHTML = markdown.render(await response.text());
    deck.replaceChildren(createCover(details));
    let section;
    let body;
    let chapter = 0;
    for (const child of [...documentRoot.children]) {
      if (child.tagName === 'H2') {
        section = document.createElement('section'); section.className = 'slide'; section.hidden = true;
        section.dataset.chapter = String(++chapter);
        const title = document.createElement('h1'); title.textContent = child.textContent.replace(/^[\d۰-۹]+[.ـ\s]+/, '');
        body = document.createElement('div'); body.className = 'slide-body';
        section.append(title, body); deck.append(section);
      } else if (body) body.append(child);
    }
    slides = [...deck.children];
    if (!slides.length) throw new Error('no slides');
    for (const link of deck.querySelectorAll('a[href]')) link.href = new URL(link.getAttribute('href'), source).href;
    for (const img of deck.querySelectorAll('img')) {
      img.src = new URL(img.getAttribute('src'), source).href;
      const figure = document.createElement('figure');
      const caption = document.createElement('figcaption'); caption.textContent = img.alt;
      const paragraph = img.parentElement;
      figure.append(img, caption);
      if (paragraph.tagName === 'P' && !paragraph.textContent.trim()) paragraph.replaceWith(figure);
      else paragraph.after(figure);
      img.addEventListener('error', () => { img.hidden = true; caption.textContent = 'شکل در دسترس نیست: ' + img.alt; });
    }
    await renderDiagrams();
    for (const slide of slides) {
      const body = slide.querySelector('.slide-body');
      const figure = body?.querySelector(':scope > figure');
      if (figure) {
        slide.classList.add('has-media');
        const copy = document.createElement('div'); copy.className = 'slide-copy';
        for (const child of [...body.childNodes]) if (child !== figure) copy.append(child);
        body.replaceChildren(copy, figure);
      }
      addSlideIdentity(slide, details);
      isolateScientificText(slide);
    }
    slides.at(-1).classList.add('sources');
    select.replaceChildren(...slides.map((slide, index) => new Option(`${fa(index + 1)}. ${slide.querySelector('h1').textContent}`, String(index))));
    select.disabled = false;
    document.getElementById('print-slides').disabled = false;
    document.getElementById('sources-link').href = '#slide-' + slides.length;
    status.textContent = '';
    deck.dataset.state = 'ready';
    show(hashIndex());
  } catch {
    status.textContent = 'اسلایدها بارگذاری نشدند. دوباره تلاش کنید یا متن ارائه را در کتابچه باز کنید.';
    deck.dataset.state = 'error';
    document.getElementById('retry-deck').hidden = false;
  } finally { deck.setAttribute('aria-busy', 'false'); }
}
previous.addEventListener('click', () => show(current - 1, true));
next.addEventListener('click', () => show(current + 1, true));
select.addEventListener('change', () => show(Number(select.value), true));
addEventListener('hashchange', () => show(hashIndex(), true));
addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('select, input, textarea, [contenteditable]')) return;
  const changes = { ArrowLeft: 1, ArrowRight: -1, PageDown: 1, PageUp: -1 };
  if (event.key in changes) { event.preventDefault(); show(current + changes[event.key], true); }
  if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); show(event.key === 'Home' ? 0 : slides.length - 1, true); }
});
document.getElementById('fullscreen').hidden = !document.fullscreenEnabled;
document.getElementById('fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { status.textContent = 'مرورگر اجازهٔ تمام‌صفحه نداد؛ نمایش معمولی همچنان در دسترس است.'; }
});
addEventListener('fullscreenchange', () => { document.getElementById('fullscreen').textContent = document.fullscreenElement ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'; });
document.getElementById('print-slides').addEventListener('click', () => window.print());
document.getElementById('retry-deck').addEventListener('click', load);
load();
