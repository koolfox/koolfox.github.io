import { isolateScientificText, scientificDiagramSource, setDiagramDirection } from './text-direction.js';
import { linkGlossaryTerms } from './glossary-terms.js';
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
      const { svg } = await mermaid.render('slide-diagram-' + index, scientificDiagramSource(code.textContent));
      const figure = document.createElement('figure');
      figure.className = 'slide-diagram';
      figure.innerHTML = svg;
      const graphic = figure.querySelector('svg');
      graphic.setAttribute('role', 'img');
      graphic.setAttribute('aria-label', 'نمودار مفهومی روابط توضیح‌داده‌شده در این اسلاید؛ مقیاس اتمی ندارد');
      setDiagramDirection(graphic);
      code.parentElement.replaceWith(figure);
    }
  } catch {
    for (const code of deck.querySelectorAll('pre code.language-mermaid')) {
      const note = document.createElement('p');
      note.textContent = 'نمودار آماده نشد؛ رابطه‌های آن در متن همین اسلاید توضیح داده شده‌اند.';
      code.parentElement.replaceWith(note);
    }
    deck.dataset.diagram = 'fallback';
  }
}

const mediaDialog = document.getElementById('slide-media-dialog');
const mediaStage = document.getElementById('slide-media-stage');
let mediaTrigger;
let mediaHome;
let activeModel;

function closeMedia() { mediaDialog.close(); }
mediaDialog.addEventListener('close', () => {
  if (activeModel && mediaHome) mediaHome.append(activeModel);
  mediaStage.replaceChildren();
  activeModel = null;
  mediaTrigger?.focus();
});
document.getElementById('close-slide-media').addEventListener('click', closeMedia);

function openMedia(figure, trigger, model = false) {
  mediaTrigger = trigger;
  document.getElementById('slide-media-title').textContent = model ? 'مدل سه‌بعدی؛ مختصات تجربی' : 'نمای بزرگ شکل';
  document.getElementById('slide-media-caption').textContent = figure.querySelector('figcaption')?.textContent || 'نمودار مفهومی همین اسلاید';
  mediaStage.replaceChildren();
  if (model) {
    activeModel = figure.querySelector('iframe');
    mediaHome = figure;
    mediaStage.append(activeModel);
  } else {
    const graphic = figure.querySelector('img, svg').cloneNode(true);
    if (graphic.tagName.toLowerCase() === 'svg') {
      const ids = new Map([...graphic.querySelectorAll('[id]')].map(node => [node.id, node.id + '-enlarged']));
      if (graphic.id) { ids.set(graphic.id, graphic.id + '-enlarged'); graphic.id += '-enlarged'; }
      for (const node of graphic.querySelectorAll('*')) {
        if (node.id) node.id = ids.get(node.id);
        for (const attr of [...node.attributes]) {
          if (attr.name === 'id') continue;
          let value = attr.value;
          for (const [id, replacement] of ids) value = value.replaceAll('#' + id, '#' + replacement);
          if (value !== attr.value) node.setAttribute(attr.name, value);
        }
      }
    }
    mediaStage.append(graphic);
  }
  mediaDialog.showModal();
}

function addMediaControls(figure) {
  const controls = document.createElement('div');
  controls.className = 'slide-media-controls';
  const enlarge = textElement('button', 'بزرگ‌نمایی شکل'); enlarge.type = 'button';
  enlarge.addEventListener('click', () => openMedia(figure, enlarge));
  controls.append(enlarge);
  const image = figure.querySelector('img');
  const modelId = image?.src.endsWith('complex-preview.png') ? '3WD5'
    : image?.src.endsWith('structure-comparison.png') ? '4FM9' : null;
  if (modelId) {
    const model = textElement('button', 'مدل سه‌بعدی ' + modelId); model.type = 'button';
    model.addEventListener('click', () => {
      let frame = figure.querySelector('iframe');
      if (!frame) {
        frame = document.createElement('iframe');
        frame.title = 'مدل سه‌بعدی ' + modelId + '؛ چرخش با ماوس یا کلیدها';
        frame.src = new URL('assets/reference-viewer.html?pdb=' + modelId, project).href;
        figure.append(frame);
      }
      openMedia(figure, model, true);
    });
    controls.append(model);
  }
  figure.append(controls);
}

/** Slide order and chapter exports share the one course-map.json; week is a legacy alias. */
async function applyChapters(details) {
  const response=await fetch(new URL('data/metadata/course-map.json',project),{signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('course map unavailable');
  const map=await response.json();
  const params=new URLSearchParams(location.search);
  const requested=params.get('unit') ?? params.get('week');
  let unit=map.chapters.find(c=>String(c.unit)===requested);
  let step=null, sources=[];
  if(params.has('topic')) {
    const [threadResponse,sourceResponse]=await Promise.all([fetch(new URL('data/metadata/research-thread.json',project)),fetch(new URL('data/metadata/review-sources.json',project))]);
    if(!threadResponse.ok||!sourceResponse.ok)throw Error('research step unavailable');
    const thread=await threadResponse.json();sources=(await sourceResponse.json()).sources;step=thread.steps.find(s=>String(s.topic)===params.get('topic'));
    if(!step)throw Error('unknown research step');
    unit=map.chapters.find(c=>c.unit===step.unit);deck.dataset.topic=String(step.topic);
  }
  const cover=slides[0];
  const bySource=new Map(slides.slice(1).map(s=>[Number(s.dataset.chapter),s]));
  const order=[];
  for(const chapter of map.chapters) {
    for(const number of [...chapter.slides,...chapter.supplementary_slides]) {
      const slide=bySource.get(number);if(!slide)throw Error('slide missing');
      slide.dataset.unit=String(chapter.unit);order.push(slide);
    }
  }
  deck.replaceChildren(cover,...order);slides=[...deck.children];
  if(requested && !unit) {status.dataset.weekError='true';status.textContent='فصل پیدا نشد؛ ارائهٔ کامل به ترتیب فصل‌های درس نمایش داده می‌شود.';}
  if(unit) {
    const keep=new Set(step?step.slides:[...unit.slides,...(params.get('appendix')==='1'?unit.supplementary_slides:[])]);
    for(const slide of slides.slice(1))if(!keep.has(Number(slide.dataset.chapter)))slide.remove();
    if(step) {
      const bridge=document.createElement('section');bridge.className='slide step-intro';bridge.hidden=true;bridge.dataset.unit=String(unit.unit);bridge.dataset.topic=String(step.topic);
      const body=document.createElement('div');body.className='slide-body';
      body.append(textElement('p','درس: '+(step.teaching_point || step.terms[0].term+' یعنی '+step.terms[0].meaning)),textElement('p','پژوهش: '+step.question),textElement('p','تمرین: '+step.output));
      const refs=document.createElement('div');refs.className='slide-references';
      for(const id of step.source_ids) {const source=sources.find(s=>s.id===id);if(!source)continue;const a=document.createElement('a');a.href=source.url||new URL(source.path,project).href;a.textContent=source.title;refs.append(a);}
      bridge.append(textElement('h1',step.title),body,refs);addSlideIdentity(bridge,details);isolateScientificText(bridge);cover.after(bridge);
    }
    slides=[...deck.children];deck.dataset.unit=String(unit.unit);
    const label=textElement('p',`فصل ${fa(unit.unit)}: ${unit.title}`,'cover-week');cover.querySelector('.cover-subtitle').after(label);
    document.getElementById('sources-link').hidden=!keep.has(29);
    const all=document.createElement('a');all.href='presentation.html#slide-1';all.textContent='ارائهٔ کامل به ترتیب فصل‌ها';all.id='all-slides-link';document.getElementById('sources-link').before(all);
  }
  slides.forEach((slide,i)=>slide.id='slide-'+(i+1));
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
  document.getElementById('notebook-link').href = `index.html?unit=${slides[current].dataset.unit || new URLSearchParams(location.search).get("unit") || 1}${deck.dataset.topic ? "&topic="+deck.dataset.topic : ""}&part=presentation`;
  history.replaceState(null, '', '#slide-' + (current + 1));
  document.title = slides[current].querySelector('h1').textContent + ' · ارائهٔ کلاسی';
  if (focus) { deck.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
}

async function load() {
  deck.setAttribute('aria-busy', 'true');
  document.getElementById('retry-deck').hidden = true;
  delete status.dataset.weekError;
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
    // The notebook keeps its lab link; slides offer the same model in place.
    for (const link of deck.querySelectorAll('a[href$="#lab"]')) link.parentElement.remove();
    for (const link of deck.querySelectorAll('a[href]')) {
      const destination = new URL(link.getAttribute('href'), source);
      const documentName = destination.pathname.match(/\/docs\/([a-z0-9.-]+\.md)$/)?.[1];
      const notebookURL = new URL('index.html?document=' + documentName + '#reading', project);
      const chapter = destination.searchParams.get('chapter');
      if (/^(intro|all|chapter-\d+)$/.test(chapter || '')) notebookURL.searchParams.set('chapter', chapter);
      link.href = documentName ? notebookURL.href : destination.href;
      if (documentName === 'glossary.fa.md') {
        link.classList.add('term-link');
        link.title = 'توضیح «' + link.textContent.trim() + '» در واژه‌نامه';
      }
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
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
      const citations = [...(body?.querySelectorAll(':scope > blockquote') || [])];
      const references = document.createElement('aside');
      references.className = 'slide-references';
      references.setAttribute('aria-label', 'منابع و حدود شواهد این اسلاید');
      references.append(...citations);
      const figure = body?.querySelector(':scope > figure');
      if (figure) {
        slide.classList.add('has-media');
        const copy = document.createElement('div'); copy.className = 'slide-copy';
        for (const child of [...body.childNodes]) if (child !== figure) copy.append(child);
        body.replaceChildren(copy, figure);
      }
      if (citations.length) slide.append(references);
      for (const media of slide.querySelectorAll('figure')) addMediaControls(media);
      addSlideIdentity(slide, details);
      if (body) {
        linkGlossaryTerms(body);
        for (const link of body.querySelectorAll('a.term-link')) {
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
        }
      }
      isolateScientificText(slide);
    }
    const sourcesSlide = slides.find((slide) => (slide.querySelector('h1')?.textContent || '').trim().startsWith('منابع')) || slides.at(-1);
    sourcesSlide.classList.add('sources');
    await applyChapters(details);
    select.replaceChildren(...slides.map((slide, index) => new Option(`${fa(index + 1)}. ${slide.querySelector('h1').textContent}`, String(index))));
    select.disabled = false;
    document.getElementById('print-slides').disabled = false;
    document.getElementById('sources-link').href = '#slide-' + (slides.indexOf(sourcesSlide) + 1);
    if (!status.dataset.weekError) status.textContent = '';
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
  if (mediaDialog.open) return;
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
