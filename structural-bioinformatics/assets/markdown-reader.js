import { isolateScientificText, scientificDiagramSource, setDiagramDirection } from './text-direction.js';
import { linkGlossaryTerms } from './glossary-terms.js';
// Repository-owned Markdown only; optional rendering libraries load on demand.
const DOCUMENTS = [
  ["learning-path.fa.md", "مسیر یادگیری از پایه و ترتیب مطالعه", "شروع از پایه"],
  ["weekly-plan.fa.md", "برنامهٔ هفته‌به‌هفتهٔ ارائه در کلاس", "شروع از پایه"],
  ["presentation-rehearsal.fa.md", "پس از یادگیری؛ تمرین و آماده‌سازی ارائه", "ارائه و روش پژوهش"],
  ["glossary.fa.md", "واژه‌نامهٔ آموزشی؛ آنتی‌بادی، IgG1 و اصطلاحات پژوهش", "شروع از پایه"],
  ["codons-primer.fa.md", "از باز و کدون به آمینواسید؛ مثال‌های واقعی", "شروع از پایه"],
  ["top2a-primer.fa.md", "آشنایی مستقل و مقدماتی با TOP2A", "آشنایی موازی"],
  ["preparation-guide.fa.md", "جزوهٔ مقدماتی روماتوئید، دارو و RNA-seq", "شروع از پایه"],
  ["top2a-count-inspection.fa.md", "پیوست؛ بررسی توصیفی قبلی RNA ژن TOP2A", "پژوهش پس از مبانی"],
  ["scientific-claim-audit.fa.md", "ممیزی جمله‌به‌جملهٔ ادعاها و منابع", "آموزش و پژوهش"],
  ["top2a-inhibition-feasibility.fa.md", "طرح پیشرفتهٔ مهار TOP2A؛ برای مرحلهٔ بعد", "پژوهش پس از مبانی"],
  ["class-presentation.fa.md", "ارائهٔ گام‌به‌گام برای کلاس", "ارائه و روش پژوهش"],
  ["academic-study-plan.fa.md", "برنامهٔ یادگیری و طرح‌های آکادمیک بعدی", "ارائه و روش پژوهش"],
  ["paper-writing-guide.fa.md", "راهنمای گزارش و مقالهٔ قابل دفاع", "ارائه و روش پژوهش"],
  ["structural-feasibility-results.fa.md", "پیوست اختیاری؛ تحلیل اجراشدهٔ سطح و کنترل", "ارائه و روش پژوهش"],
  ["docking-protocol.fa.md", "پروتکل داکینگ؛ اعتبارسنجی با پاسخ کریستالی معلوم", "ارائه و روش پژوهش"],
  ["manuscript-draft.fa.md", "پیش‌نویس مقاله؛ اپی‌توپ کامل آدالیموماب", "ارائه و روش پژوهش"],
  ["full-epitope-results.fa.md", "محل کامل اتصال آدالیموماب روی TNF سه‌تایی؛ تحلیل اجراشده", "ارائه و روش پژوهش"],
  ["data-access-guide.fa.md", "راهنمای یافتن و دریافت داده‌ها", "ابزارها و منابع"],
  ["research-questions.fa.md", "پرسش پژوهش و فرضیه‌ها", "آموزش و پژوهش"],
  ["course-guide.fa.md", "راهنمای پروژهٔ درسی", "آموزش و پژوهش"],
  ["binding-mechanism.fa.md", "قفل و کلید، اتصال و مهار پیام التهاب", "آموزش و پژوهش"],
  ["molecular-display-audit.fa.md", "تطبیق شکل مولکول با مرجع RCSB", "آموزش و پژوهش"],
  ["paper-explanations.fa.md", "معنی آزمایش‌ها و نتایج سه مقاله", "آموزش و پژوهش"],
  ["structural-method.fa.md", "روش تحلیل ساختاری و فرمول‌ها", "آموزش و پژوهش"],
  ["connection-evidence.fa.md", "نقشهٔ شواهد آدالیموماب، TNF و TOP2A", "پژوهش پس از مبانی"],
  ["sequences-primer.fa.md", "راهنمای RNA، پروتئین و زنجیره‌ها", "آموزش و پژوهش"],
  ["literature-review.fa.md", "مرور و نقد مقاله‌ها", "آموزش و پژوهش"],
  ["top2a-cancer-comparison.fa.md", "مقایسهٔ TOP2A و شواهد سرطان", "پژوهش پس از مبانی"],
  ["visualization-tools.fa.md", "ابزارهای نمایش و بازتولید انیمیشن", "ابزارها و منابع"],
  ["anatomy-evaluation.fa.md", "ارزیابی عملی Anatomy", "ابزارها و منابع"],
  ["dataset-catalog.fa.md", "فهرست منابع داده", "ابزارها و منابع"],
  ["scientific-context.fa.md", "زمینهٔ علمی و بیماری‌ها", "ابزارها و منابع"],
  ["literature-selection-audit.fa.md", "ممیزی انتخاب مقاله‌ها", "ابزارها و منابع"],
  ["third-party-notices.md", "مجوزها و منابع ابزارهای نمایش", "ابزارها و منابع"],
  ["research-protocol.fa.md", "آرشیو پروتکل پژوهش", "توسعهٔ اختیاری و آرشیو"],
  ["top2a-hypothesis.fa.md", "آرشیو فرضیهٔ TOP2A", "توسعهٔ اختیاری و آرشیو"],
  ["manuscript-outline.fa.md", "طرح توسعهٔ مقاله", "توسعهٔ اختیاری و آرشیو"],
  ["product-roadmap.fa.md", "مسیر توسعهٔ پروژه", "توسعهٔ اختیاری و آرشیو"],
  ["paper-design-setup.fa.md", "یادداشت ابزار طراحی", "توسعهٔ اختیاری و آرشیو"],
  ["agent-workflow.md", "روش همکاری در مخزن", "توسعهٔ اختیاری و آرشیو"],
];
const ALLOWED_DOCUMENTS = new Set(DOCUMENTS.map(([filename]) => filename));
const PROJECT_URL = new URL("../", import.meta.url);
const DOCS_URL = new URL("docs/", PROJECT_URL);
const LIBRARIES = {
  markdown: ["assets/vendor/markdown-it/markdown-it.min.js", "markdownit"],
  math: ["assets/vendor/katex/katex.min.js", "katex"],
  mermaid: ["assets/vendor/mermaid/mermaid.min.js", "mermaid"],
  mathCSS: "assets/vendor/katex/katex.min.css",
};
const scripts = new Map();
let mathCssPromise = null;
let diagramNumber = 0;
const $ = (id) => document.getElementById(id);

function node(tag, text, className) {
  const result = document.createElement(tag);
  if (text !== undefined) result.textContent = String(text);
  if (className) result.className = className;
  return result;
}

function loadClassic([path, globalName]) {
  if (window[globalName]) return Promise.resolve(window[globalName]);
  if (scripts.has(path)) return scripts.get(path);
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    let complete = false;
    const finish = (error) => {
      if (complete) return;
      complete = true;
      clearTimeout(timeout);
      script.onload = script.onerror = null;
      if (error) { script.remove(); reject(error); }
      else resolve(window[globalName]);
    };
    const timeout = setTimeout(() => finish(new Error("Rendering library timed out")), 15000);
    script.src = new URL(path, PROJECT_URL).href;
    script.async = true;
    script.onload = () => finish(window[globalName] ? null : new Error("Rendering library has no expected export"));
    script.onerror = () => finish(new Error("Rendering library unavailable"));
    document.head.append(script);
  });
  scripts.set(path, promise);
  promise.catch(() => scripts.delete(path));
  return promise;
}

function loadMathCSS() {
  if (mathCssPromise) return mathCssPromise;
  mathCssPromise = new Promise((resolve, reject) => {
    const link = node("link");
    link.id = "reader-math-css";
    link.rel = "stylesheet";
    link.href = new URL(LIBRARIES.mathCSS, PROJECT_URL).href;
    let complete = false;
    const finish = (error) => {
      if (complete) return;
      complete = true;
      clearTimeout(timeout);
      link.onload = link.onerror = null;
      if (error) { link.remove(); reject(error); }
      else resolve();
    };
    const timeout = setTimeout(() => finish(new Error("Math stylesheet timed out")), 15000);
    link.onload = () => finish(null);
    link.onerror = () => finish(new Error("Math stylesheet unavailable"));
    document.head.append(link);
  });
  mathCssPromise.catch(() => { mathCssPromise = null; });
  return mathCssPromise;
}

async function fetchDocument(filename) {
  if (!ALLOWED_DOCUMENTS.has(filename)) throw new Error("Document is not allowlisted");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(new URL(filename, DOCS_URL), { signal: controller.signal });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const text = await response.text();
    if (!text.trim() || /^\s*<!doctype html>/i.test(text)) throw new Error("Expected Markdown document");
    return text;
  } finally { clearTimeout(timeout); }
}

function addMathRules(markdown) {
  // Tokenize before Markdown escapes/emphasis can alter LaTeX source.
  markdown.inline.ruler.before("escape", "research_math_inline", (state, silent) => {
    const start = state.pos;
    const isParen = state.src.startsWith("\\(", start);
    const opening = isParen ? "\\(" : "$";
    if (!isParen && (state.src[start] !== "$" || state.src[start + 1] === "$")) return false;
    const closing = isParen ? "\\)" : "$";
    const first = start + opening.length;
    if (first >= state.posMax || /\s/.test(state.src[first])) return false;
    let end = state.src.indexOf(closing, first);
    while (end !== -1 && state.src[end - 1] === "\\" && !isParen) end = state.src.indexOf(closing, end + 1);
    if (end === -1 || end >= state.posMax || /\s/.test(state.src[end - 1])) return false;
    if (!silent) {
      const token = state.push("research_math_inline", "span", 0);
      token.content = state.src.slice(first, end);
      token.markup = opening;
    }
    state.pos = end + closing.length;
    return true;
  });
  markdown.block.ruler.before("fence", "research_math_block", (state, startLine, endLine, silent) => {
    const firstLine = state.src.slice(state.bMarks[startLine] + state.tShift[startLine], state.eMarks[startLine]).trim();
    const opening = firstLine.startsWith("$$") ? "$$" : firstLine.startsWith("\\[") ? "\\[" : null;
    if (!opening || state.sCount[startLine] >= 4) return false;
    const closing = opening === "$$" ? "$$" : "\\]";
    const first = firstLine.slice(opening.length);
    const pieces = [];
    let next = startLine + 1;
    let found = first.endsWith(closing);
    if (found) pieces.push(first.slice(0, -closing.length));
    else {
      if (first) pieces.push(first);
      for (; next < endLine; next++) {
        const line = state.src.slice(state.bMarks[next] + state.tShift[next], state.eMarks[next]);
        if (line.trim().endsWith(closing)) {
          pieces.push(line.slice(0, line.lastIndexOf(closing)));
          found = true;
          next++;
          break;
        }
        pieces.push(line);
      }
    }
    if (!found || !pieces.join("\n").trim()) return false;
    if (silent) return true;
    const token = state.push("research_math_block", "div", 0);
    token.content = pieces.join("\n").trim();
    token.markup = opening;
    token.block = true;
    token.map = [startLine, next];
    state.line = next;
    return true;
  });
  function renderMath(tokens, index) {
    const token = tokens[index];
    const display = token.type === "research_math_block";
    const tag = display ? "div" : "span";
    const closing = token.markup === "\\(" ? "\\)" : token.markup === "\\[" ? "\\]" : token.markup;
    return "<" + tag + ' class="reader-math" dir="ltr" data-display="' + display + '" data-latex="' + markdown.utils.escapeHtml(token.content) + '">' + markdown.utils.escapeHtml(token.markup + token.content + closing) + "</" + tag + ">";
  }
  markdown.renderer.rules.research_math_inline = renderMath;
  markdown.renderer.rules.research_math_block = renderMath;
}

function headingsAndChapters(tokens) {
  const chapters = [];
  const headings = [];
  const seen = new Map();
  let title = "";
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.type !== "heading_open") continue;
    const inline = tokens[index + 1];
    const text = (inline.children || []).map((part) => part.content || "").join("") || inline.content;
    let slug = text.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").trim().replace(/\s+/g, "-") || "section";
    const count = seen.get(slug) || 0;
    seen.set(slug, count + 1);
    if (count) slug += "-" + count;
    token.attrSet("id", "reader-" + slug);
    headings.push({ text, id: "reader-" + slug, level: token.tag, index });
    if (token.tag === "h1" && !title) title = text;
    if (token.tag === "h2" && token.level === 0) chapters.push({ id: "chapter-" + (chapters.length + 1), title: text, start: index });
  }
  if (chapters.length && chapters[0].start > 0) chapters.unshift({ id: "intro", title: "عنوان و مقدمه", start: 0 });
  if (!chapters.length) chapters.push({ id: "intro", title: "متن سند", start: 0 });
  for (let index = 0; index < chapters.length; index++) chapters[index].end = chapters[index + 1]?.start ?? tokens.length;
  return { chapters, headings, title };
}

function safeURL(value, base) {
  try {
    const url = new URL(value, base);
    return ["http:", "https:"].includes(url.protocol) ? url : null;
  } catch { return null; }
}

function prepareContent(container, sourceURL) {
  for (const link of container.querySelectorAll("a[href]")) {
    const url = safeURL(link.getAttribute("href"), sourceURL);
    if (!url) { link.removeAttribute("href"); continue; }
    link.href = url.href;
    if (url.origin === PROJECT_URL.origin && url.pathname === new URL("glossary.fa.md", DOCS_URL).pathname) {
      link.classList.add("term-link");
      link.title = "توضیح «" + link.textContent.trim() + "» در واژه‌نامه";
      const destination = new URL(PROJECT_URL);
      destination.searchParams.set("document", "glossary.fa.md");
      const chapter = url.searchParams.get("chapter");
      if (/^(intro|all|chapter-\d+)$/.test(chapter || "")) destination.searchParams.set("chapter", chapter);
      destination.hash = "reading";
      link.href = destination.href;
      link.dataset.document = "glossary.fa.md";
    }
    if (url.origin !== PROJECT_URL.origin) { link.target = "_blank"; link.rel = "noopener noreferrer"; }
  }
  for (const image of container.querySelectorAll("img")) {
    const url = safeURL(image.getAttribute("src"), sourceURL);
    // Teaching images are local; rendering text never contacts image CDNs.
    if (!url || url.origin !== PROJECT_URL.origin || !url.pathname.startsWith(PROJECT_URL.pathname)) {
      image.replaceWith(node("span", image.alt || "تصویر بیرونی در نسخهٔ اصلی قابل بررسی است."));
      continue;
    }
    image.src = url.href;
    image.loading = "lazy";
  }
  for (const table of container.querySelectorAll("table")) {
    const region = node("div", undefined, "table-scroll");
    region.tabIndex = 0;
    region.setAttribute("role", "region");
    region.setAttribute("aria-label", "جدول متن تحقیق؛ در نمایش کوچک می‌توانید افقی حرکت کنید");
    table.before(region);
    region.append(table);
  }
  if (!sourceURL.pathname.endsWith('/glossary.fa.md')) linkGlossaryTerms(container);
  isolateScientificText(container);
}

async function renderMath(container, current) {
  const expressions = [...container.querySelectorAll(".reader-math")];
  if (!expressions.length) return 0;
  const [, katex] = await Promise.all([loadMathCSS(), loadClassic(LIBRARIES.math)]);
  if (!current()) return 0;
  let failures = 0;
  for (const expression of expressions) {
    try {
      katex.render(expression.dataset.latex, expression, {
        displayMode: expression.dataset.display === "true", throwOnError: true,
        trust: false, strict: "error", output: "htmlAndMathml",
      });
      expression.dataset.state = "ready";
    } catch { expression.dataset.state = "error"; failures++; }
  }
  return failures;
}

async function renderDiagrams(container, current) {
  const codes = [...container.querySelectorAll("pre > code.language-mermaid")];
  if (!codes.length) return 0;
  const mermaid = await loadClassic(LIBRARIES.mermaid);
  if (!current()) return 0;
  mermaid.initialize({
    startOnLoad: false, securityLevel: "strict", suppressErrorRendering: true,
    secure: ["securityLevel", "startOnLoad", "suppressErrorRendering"],
    theme: "base", fontFamily: "Arad, system-ui, sans-serif",
    themeVariables: { primaryColor: "#edf2fc", primaryTextColor: "#253957", primaryBorderColor: "#8da7cf", lineColor: "#536179", fontFamily: "Arad, system-ui, sans-serif", fontSize: "15px" },
    flowchart: { htmlLabels: false, useMaxWidth: true },
  });
  await document.fonts.ready;
  let failures = 0;
  for (const code of codes) {
    if (!current()) return failures;
    const source = code.parentElement;
    try {
      const result = await mermaid.render("research-diagram-" + (++diagramNumber), scientificDiagramSource(code.textContent));
      if (!current()) return failures;
      const figure = node("figure", undefined, "reader-diagram");
      const drawing = node("div", undefined, "mermaid-diagram");
      drawing.innerHTML = result.svg;
      const svg = drawing.querySelector("svg");
      if (!svg) throw new Error("Mermaid returned no SVG");
      svg.setAttribute("role", "img");
      setDiagramDirection(svg);
      svg.setAttribute("aria-label", "نمودار مفهومی این فصل؛ توضیح روابط در متن و کد اصلی آمده است");
      drawing.dataset.state = "ready";
      const details = node("details", undefined, "diagram-source");
      details.append(node("summary", "دیدن کد اصلی نمودار"));
      source.before(figure);
      details.append(source);
      figure.append(drawing, node("figcaption", "نمودار از کد همین متن ساخته شده است؛ نوع رابطه و حدود ادعا را همراه توضیح فصل بخوانید."), details);
    } catch { failures++; }
  }
  return failures;
}

export function createMarkdownReader() {
  const select = $("document-select");
  const chapterSelect = $("chapter-select");
  const content = $("markdown-content");
  const status = $("reading-status");
  const previous = $("chapter-prev");
  const next = $("chapter-next");
  const toc = $("document-toc");
  const cache = new Map();
  let markdown = null;
  let documentState = null;
  let chapter = null;
  let generation = 0;
  let presentationFocused = true;
  select.replaceChildren();
  for (const groupName of new Set(DOCUMENTS.map((entry) => entry[2]))) {
    const group = node("optgroup");
    group.label = groupName;
    for (const [filename, title, groupLabel] of DOCUMENTS) {
      if (groupLabel !== groupName) continue;
      const option = node("option", title);
      option.value = filename;
      group.append(option);
    }
    select.append(group);
  }
  select.disabled = false;

  function updateURL(filename, selectedChapter, push = false) {
    if ($("panel-reading").hidden) return;
    const url = new URL(window.location.href);
    url.searchParams.set("document", filename);
    if (selectedChapter) url.searchParams.set("chapter", selectedChapter);
    else url.searchParams.delete("chapter");
    if (url.hash !== "#lesson-guide" || !url.searchParams.has("lesson")) url.hash = "reading";
    window.history[push ? "pushState" : "replaceState"](null, "", url);
  }

  function showLocalError(message, filename, raw = null) {
    status.dataset.state = "error";
    status.classList.add("inline-error");
    status.replaceChildren(node("span", message));
    const retry = node("button", "تلاش دوباره برای همین متن");
    retry.type = "button";
    retry.addEventListener("click", () => open(filename, null, true));
    status.append(" ", retry);
    content.setAttribute("aria-busy", "false");
    if (raw !== null) {
      const pre = node("pre");
      pre.append(node("code", raw));
      content.replaceChildren(pre);
    }
  }

  function refreshNavigation() {
    const presentation = documentState.filename === "class-presentation.fa.md" && !new URLSearchParams(location.search).has("lesson");
    const chapters = presentation ? documentState.chapters.filter(entry => entry.id !== "intro") : documentState.chapters;
    const focused = presentation && presentationFocused && !["all", "intro"].includes(chapter);
    document.body.dataset.presentationMode = String(focused);
    $("presentation-view").hidden = !presentation;
    $("slide-launch").hidden = !presentation;
    $("slide-launch").href = "presentation.html#slide-1";
    $("presentation-view").setAttribute("aria-pressed", String(focused));
    $("presentation-view").textContent = focused ? "نمای مطالعه" : "نمای ارائه";
    status.dataset.presentation = String(presentation);
    $("presentation-help").hidden = !presentation;
    previous.textContent = presentation ? "گام قبلی" : "فصل قبلی";
    next.textContent = presentation ? "گام بعدی" : "فصل بعدی";
    chapterSelect.value = chapter;
    const index = chapters.findIndex((entry) => entry.id === chapter);
    previous.disabled = index <= 0;
    next.disabled = index === chapters.length - 1;
    if (chapter === "all") { previous.disabled = true; next.disabled = !chapters.length; }
    for (const link of toc.querySelectorAll("a[data-chapter]")) {
      if (link.dataset.chapter === chapter) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    }
  }

  function populateChapters() {
    chapterSelect.replaceChildren();
    const all = node("option", "متن کامل");
    all.value = "all";
    chapterSelect.append(all);
    toc.replaceChildren();
    const details = node("details");
    details.append(node("summary", "فهرست فصل‌های این متن"));
    const list = node("ul");
    list.setAttribute("role", "list");
    for (const entry of documentState.chapters) {
      const option = node("option", entry.title);
      option.value = entry.id;
      chapterSelect.append(option);
      const item = node("li");
      const link = node("a", entry.title);
      const url = new URL(window.location.href);
      url.searchParams.set("document", documentState.filename);
      url.searchParams.set("chapter", entry.id);
      url.hash = "reading";
      link.href = url.href;
      link.dataset.chapter = entry.id;
      link.addEventListener("click", (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        chapter = entry.id;
        updateURL(documentState.filename, chapter, true);
        void renderChapter();
      });
      item.append(link);
      list.append(item);
    }
    details.append(list);
    toc.append(details);
    toc.hidden = false;
    chapterSelect.disabled = false;
  }

  async function renderChapter() {
    if (!documentState || !markdown) return;
    const currentGeneration = ++generation;
    let selected = documentState.chapters.find((entry) => entry.id === chapter);
    if (chapter !== "all" && !selected) { selected = documentState.chapters[0]; chapter = selected.id; }
    const tokens = chapter === "all" ? documentState.tokens : documentState.tokens.slice(selected?.start ?? 0, selected?.end ?? documentState.tokens.length);
    status.classList.remove("inline-error");
    status.dataset.state = "loading";
    status.textContent = "در حال نمایش متن و شکل‌های همین فصل…";
    content.setAttribute("aria-busy", "true");
    content.innerHTML = markdown.renderer.render(tokens, markdown.options, {});
    prepareContent(content, new URL(documentState.filename, DOCS_URL));
    content.dataset.document = documentState.filename;
    content.dataset.chapter = chapter;
    refreshNavigation();
    updateURL(documentState.filename, chapter);
    const current = () => currentGeneration === generation;
    const optional = await Promise.allSettled([renderMath(content, current), renderDiagrams(content, current)]);
    if (!current()) return;
    const failures = optional.reduce((total, result) => total + (result.status === "rejected" ? 1 : result.value), 0);
    if (failures) content.append(node("p", "بخشی از فرمول یا نمودار نمایش داده نشد؛ متن LaTeX یا کد اصلی حفظ شده است. فایل منبع را دریافت کنید یا دوباره متن را بارگذاری کنید.", "reader-render-note"));
    status.dataset.state = "ready";
    status.dataset.document = documentState.filename;
    status.dataset.chapter = chapter;
    status.dataset.optionalRender = failures ? "partial" : "ready";
    const steps = documentState.chapters.filter(entry => entry.id !== "intro");
    const stepIndex = steps.findIndex(entry => entry.id === chapter);
    const progress = documentState.filename === "class-presentation.fa.md" && !new URLSearchParams(location.search).has("lesson") && stepIndex >= 0
      ? `گام ${new Intl.NumberFormat("fa-IR").format(stepIndex + 1)} از ${new Intl.NumberFormat("fa-IR").format(steps.length)} · ` : "";
    status.textContent = progress && document.body.dataset.presentationMode === "true"
      ? progress.replace(/ · $/, "")
      : progress + (documentState.title || select.selectedOptions[0].textContent) + " · " + (chapter === "all" ? "متن کامل" : documentState.chapters.find((entry) => entry.id === chapter)?.title);
    content.setAttribute("aria-busy", "false");
  }

  async function open(filename = null, selectedChapter = null, force = false) {
    const params = new URLSearchParams(window.location.search);
    filename = filename || params.get("document") || "research-questions.fa.md";
    selectedChapter = selectedChapter || params.get("chapter");
    if (!ALLOWED_DOCUMENTS.has(filename)) {
      showLocalError("این نام در فهرست متن‌های مجاز پروژه نیست. یکی از راهنماها را از فهرست انتخاب کنید.", "research-questions.fa.md");
      return;
    }
    if (!force && documentState?.filename === filename) {
      if (selectedChapter && selectedChapter !== chapter) {
        chapter = selectedChapter;
        await renderChapter();
      }
      return;
    }
    const currentGeneration = ++generation;
    status.classList.remove("inline-error");
    status.dataset.state = "loading";
    status.textContent = "در حال خواندن متن اصلی راهنما…";
    content.setAttribute("aria-busy", "true");
    content.replaceChildren();
    toc.hidden = true;
    chapterSelect.disabled = previous.disabled = next.disabled = true;
    select.value = filename;
    $("document-source").href = "https://github.com/koolfox/koolfox.github.io/blob/main/structural-bioinformatics/docs/" + filename;
    $("document-download").href = new URL(filename, DOCS_URL).href;
    $("document-download").download = filename;
    const requests = await Promise.allSettled([
      !force && cache.has(filename) ? Promise.resolve(cache.get(filename)) : fetchDocument(filename),
      markdown ? Promise.resolve(markdown) : loadClassic(LIBRARIES.markdown),
    ]);
    if (currentGeneration !== generation) return;
    if (requests[0].status === "rejected") {
      documentState = null;
      showLocalError("متن اصلی این راهنما خوانده نشد. راهنمای دیگری را انتخاب کنید یا دوباره تلاش کنید؛ بخش‌های دیگر صفحه مستقل‌اند.", filename);
      return;
    }
    const raw = requests[0].value;
    cache.set(filename, raw);
    if (requests[1].status === "rejected") {
      documentState = null;
      showLocalError("نمایش Markdown در دسترس نیست؛ متن خام همان فایل را می‌بینید. دوباره تلاش کنید یا نسخهٔ GitHub را باز کنید.", filename, raw);
      return;
    }
    if (!markdown) {
      markdown = requests[1].value({ html: false, linkify: true, typographer: false, breaks: false });
      addMathRules(markdown);
    }
    const tokens = markdown.parse(raw, {});
    documentState = { filename, tokens, ...headingsAndChapters(tokens) };
    chapter = selectedChapter && (selectedChapter === "all" || documentState.chapters.some((entry) => entry.id === selectedChapter))
      ? selectedChapter : (documentState.chapters.find((entry) => entry.id !== "intro") || documentState.chapters[0]).id;
    populateChapters();
    await renderChapter();
  }

  select.addEventListener("change", () => {
    updateURL(select.value, null, true);
    void open(select.value);
  });
  chapterSelect.addEventListener("change", () => {
    chapter = chapterSelect.value;
    updateURL(documentState.filename, chapter, true);
    void renderChapter();
  });
  function moveChapter(direction) {
    if (!documentState) return;
    const chapters = documentState.filename === "class-presentation.fa.md"
      ? documentState.chapters.filter(entry => entry.id !== "intro") : documentState.chapters;
    const index = chapters.findIndex((entry) => entry.id === chapter);
    const selected = chapters[index + direction];
    if (!selected) return;
    chapter = selected.id;
    updateURL(documentState.filename, chapter, true);
    void renderChapter();
    $("reading").scrollIntoView({ block: "start", behavior: "instant" });
  }
  previous.addEventListener("click", () => moveChapter(-1));
  next.addEventListener("click", () => moveChapter(1));
  $("presentation-view").addEventListener("click", () => {
    presentationFocused = !presentationFocused;
    void renderChapter();
  });
  document.addEventListener("keydown", event => {
    if ($("panel-reading").hidden || documentState?.filename !== "class-presentation.fa.md") return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.closest("input, select, textarea, [contenteditable]")) return;
    const direction = event.key === "PageDown" ? 1 : event.key === "PageUp" ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    moveChapter(direction);
  });
  return { open };
}
