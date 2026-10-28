const STORAGE_KEY = 'structural-reading-preferences-v1';
const sizes = {standard: '', large: '21px', larger: '23px'};

function preferences() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      size: Object.hasOwn(sizes, value?.size) ? value.size : 'standard',
      positions: value?.positions && typeof value.positions === 'object'
        && !Array.isArray(value.positions) ? value.positions : {},
    };
  } catch { return {size: 'standard', positions: {}}; }
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function sidebar(outline) {
  const aside = document.querySelector('.restored-course aside');
  if (!aside) return;
  let map = document.querySelector('#lesson-map');
  if (!map) {
    map = element('details'); map.id = 'lesson-map';
    map.open = !matchMedia('(max-width:850px)').matches;
    map.append(element('summary', 'بخش‌های این مبحث'), outline);
    aside.append(map);
    const reference = element('details'); reference.id = 'course-reference';
    reference.append(element('summary', 'منبع و متن کامل درس'));
    for (const selector of ['.page-heading', '#syllabus-outline']) {
      const node = document.querySelector(selector);
      if (node) reference.append(node);
    }
    aside.append(reference);
    const fullText = document.querySelector('.section-documents');
    if (fullText) aside.append(fullText);
  }
  aside.classList.add('reading-navigator');
}

function organize(article) {
  const lab = article.querySelector('#interactive-lab');
  const example = [...article.querySelectorAll('h2')]
    .find(heading => heading.textContent.trim().startsWith('مثال آموزشی'));
  if (lab && example) {
    let boundary = example.nextElementSibling;
    while (boundary && boundary !== lab && boundary.tagName !== 'H2') {
      boundary = boundary.nextElementSibling;
    }
    if (boundary && boundary !== lab) boundary.before(lab);
  }
  const children = [...article.childNodes];
  const fragment = document.createDocumentFragment();
  let part = element('div', null, 'lesson-introduction');
  fragment.append(part);
  for (const node of children) {
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'H2') {
      part = element('section', null, 'lesson-part');
      part.setAttribute('aria-labelledby', node.id);
      fragment.append(part);
    }
    if (node.nodeType === Node.ELEMENT_NODE && node.id === 'interactive-lab') {
      node.classList.add('lesson-part'); fragment.append(node);
      part = element('div'); fragment.append(part);
    } else part.append(node);
  }
  article.replaceChildren(fragment);
  for (const heading of article.querySelectorAll('h3')) {
    if (heading.textContent.trim() !== 'توضیح پاسخ') continue;
    const answer = element('details', null, 'lesson-answer');
    const summary = element('summary');
    heading.before(answer);
    let next = heading.nextSibling;
    summary.append(heading); answer.append(summary);
    while (next && !(next.nodeType === Node.ELEMENT_NODE && /^H[1-3]$/.test(next.tagName))) {
      const following = next.nextSibling; answer.append(next); next = following;
    }
  }
}

export function enhanceCourseReading(article, topic) {
  const abort = new AbortController(), {signal} = abort;
  const outline = document.querySelector('#lesson-outline');
  const settings = preferences();
  const previouslyOpened = settings.positions[String(topic.session)];
  sidebar(outline);
  organize(article);
  const headings = [...article.querySelectorAll('h2')];
  headings.forEach((heading, index) => {
    if (!heading.id) heading.id = `lesson-${topic.session}-section-${index + 1}`;
    heading.tabIndex = -1;
  });
  const ids = new Set(headings.map(heading => heading.id));
  const list = outline.querySelector('ul');
  document.querySelector('#lesson-map').hidden = outline.hidden;
  if (list) {
    list.replaceChildren();
    for (const heading of headings) {
      const item = element('li'), link = element('a', heading.textContent);
      link.href = '#' + heading.id; item.append(link); list.append(item);
    }
  }

  const toolbar = element('div', null, 'lesson-reading-tools');
  toolbar.id = 'lesson-reading-tools'; toolbar.dataset.readerUi = '';
  const label = element('label', 'اندازهٔ متن '), size = element('select');
  size.id = 'reading-size';
  for (const [value, text] of [['standard', 'معمولی'], ['large', 'درشت'], ['larger', 'درشت‌تر']]) {
    const option = element('option', text); option.value = value; size.append(option);
  }
  label.append(size); toolbar.append(label);
  const resume = element('button', 'ادامه از آخرین بخش');
  resume.id = 'reading-resume'; resume.type = 'button';
  resume.hidden = !ids.has(previouslyOpened) || Boolean(location.hash);
  toolbar.append(resume);
  const labHeading = article.querySelector('#interactive-lab h2');
  if (labHeading) {
    const labLink = element('a', 'رفتن به آزمایش مرتبط');
    labLink.href = '#' + labHeading.id; toolbar.append(labLink);
  }
  const status = element('p', null, 'reader-note');
  status.id = 'reader-status'; status.setAttribute('role', 'status'); status.hidden = true;
  document.querySelector('#prerequisites').after(toolbar, status);
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }
    catch { status.hidden = false; status.textContent = 'مرورگر اجازهٔ ذخیرهٔ تنظیمات خواندن را نداد؛ مطالعه همچنان ممکن است.'; }
  }
  function applySize() {
    size.value = settings.size;
    document.querySelector('.restored-course').style.setProperty('--lesson-font', sizes[settings.size]);
  }
  applySize();
  size.addEventListener('change', () => { settings.size = size.value; applySize(); save(); }, {signal});
  resume.addEventListener('click', () => {
    const target = document.getElementById(previouslyOpened);
    if (!target || !article.contains(target)) return;
    location.hash = previouslyOpened;
    target.focus({preventScroll: true}); target.scrollIntoView({block: 'start'});
    resume.hidden = true;
  }, {signal});
  function remember(event) {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0
        || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname
        || url.search !== location.search || !ids.has(url.hash.slice(1))) return;
    settings.positions[String(topic.session)] = url.hash.slice(1); save();
  }
  document.addEventListener('click', remember, {signal});

  const links = [...outline.querySelectorAll('a')];
  function highlight() {
    let current = headings[0];
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= 160) current = heading;
    }
    for (const link of links) {
      if (link.hash === '#' + current?.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
  let frame = 0;
  addEventListener('scroll', () => {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; highlight(); });
  }, {passive: true, signal});
  frame = requestAnimationFrame(() => { frame = 0; highlight(); });

  for (const pre of article.querySelectorAll('pre')) {
    const wrapper = element('div', null, 'reader-code');
    pre.before(wrapper); wrapper.append(pre);
    const text = pre.querySelector('code')?.textContent ?? pre.textContent;
    const button = element('button', 'کپی کد');
    button.type = 'button'; button.dataset.readerUi = '';
    wrapper.prepend(button);
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(text);
        if (signal.aborted) return;
        button.textContent = 'کپی شد';
      } catch {
        if (signal.aborted) return;
        const range = document.createRange(); range.selectNodeContents(pre);
        const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
        button.textContent = 'کد انتخاب شد؛ آن را کپی کن';
      }
    }, {signal});
  }
  for (const table of article.querySelectorAll('table')) {
    const scroll = element('div', null, 'reader-table-scroll');
    scroll.tabIndex = 0; scroll.setAttribute('role', 'region');
    scroll.setAttribute('aria-label', 'جدول قابل پیمایش');
    table.before(scroll); scroll.append(table);
  }

  let dialog = null, figureOpener = null;
  const figureLinks = [...article.querySelectorAll('a')].filter(link => {
    const image = link.querySelector('img'); return image && link.href === image.src;
  });
  if (figureLinks.length) {
    dialog = element('dialog', null, 'lesson-figure-dialog');
    const close = element('button', 'بازگشت به متن'); close.type = 'button';
    const title = element('p'); title.id = 'lesson-figure-title';
    dialog.setAttribute('aria-labelledby', title.id);
    const image = element('img');
    dialog.append(close, title, image); document.body.append(dialog);
    close.addEventListener('click', () => dialog.close(), {signal});
    dialog.addEventListener('close', () => { if (figureOpener?.isConnected) figureOpener.focus({preventScroll: true}); }, {signal});
    for (const link of figureLinks) {
      link.classList.add('lesson-figure'); link.setAttribute('aria-haspopup', 'dialog');
      const hint = element('span', 'بزرگ‌نمایی', 'figure-expand'); hint.dataset.readerUi = '';
      link.append(hint);
      link.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey
            || event.shiftKey || event.altKey) return;
        event.preventDefault(); figureOpener = link;
        const source = link.querySelector('img');
        image.src = source.src; image.alt = source.alt; title.textContent = source.alt;
        dialog.showModal(); close.focus();
      }, {signal});
    }
  }
  document.body.classList.add('course-reader-ready');
  const printState = new Map();
  addEventListener('beforeprint', () => {
    for (const answer of article.querySelectorAll('.lesson-answer')) {
      printState.set(answer, answer.open); answer.open = true;
    }
  }, {signal});
  addEventListener('afterprint', () => {
    for (const [answer, open] of printState) answer.open = open;
    printState.clear();
  }, {signal});
  return {
    destroy() {
      abort.abort(); cancelAnimationFrame(frame);
      for (const node of [toolbar, status, dialog]) node?.remove();
      document.body.classList.remove('course-reader-ready');
    },
  };
}
