import { initializeBindingExplainer } from "./binding-explainer.js";
import { linkGlossaryTerms } from "./glossary-terms.js";

const $ = (id) => document.getElementById(id);
const faNumber = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 });
const numeric = (value) => faNumber.format(value);
let viewer = null;
let structures = [];
let datasets = [];
let interfaceLoaded = false;
let labHasFitted = false;
let sequenceRecords = [];
let selectedSequence = null;
let sequenceText = "";
let sequenceRequest = 0;
let markdownReaderPromise = null;
let referenceRequest = 0;
let referenceTimer = null;
const readerDocuments = new Set(["weekly-plan.fa.md", "top2a-cancer-comparison.fa.md", "md-training-workshop.fa.md", "binding-mechanism.fa.md", "dataset-catalog.fa.md", "structural-method.fa.md", "learning-redesign-review.fa.md", "docking-protocol.fa.md", "manuscript-draft.fa.md", "third-party-notices.md", "academic-study-plan.fa.md", "full-epitope-results.fa.md", "software-workbook.fa.md", "chapter-presentation.fa.md", "literature-review.fa.md", "glossary.fa.md", "paper-writing-guide.fa.md", "presentation-rehearsal.fa.md", "preparation-guide.fa.md", "learning-path.fa.md", "course-guide.fa.md", "top2a-primer.fa.md", "structural-feasibility-results.fa.md", "top2a-count-inspection.fa.md", "literature-selection-audit.fa.md", "product-roadmap.fa.md", "manuscript-outline.fa.md", "paper-design-setup.fa.md", "top2a-inhibition-feasibility.fa.md", "course-sessions.fa.md", "scientific-claim-audit.fa.md", "research-questions.fa.md", "class-presentation.fa.md", "visualization-tools.fa.md", "codons-primer.fa.md", "paper-explanations.fa.md", "comprehensive-review.fa.md", "survey-protocol.fa.md", "scientific-context.fa.md", "connection-evidence.fa.md", "agent-workflow.md", "molecular-display-audit.fa.md", "sequences-primer.fa.md", "anatomy-evaluation.fa.md", "research-protocol.fa.md", "top2a-hypothesis.fa.md", "data-access-guide.fa.md", "survey-draft.fa.md", "rnaseq-research-plan.fa.md"]);
const controls = ["structure-select", "representation-select", "spin-button", "reset-button", "zoom-in", "zoom-out", "residue-select"];

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = String(text);
  if (className) node.className = className;
  return node;
}

function latin(text, className) {
  const node = element("bdi", text, className);
  node.dir = "ltr";
  return node;
}

function sourceLink(text, url) {
  const link = element("a", text);
  const parsed = new URL(url, window.location.href);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new TypeError("Unsupported source URL");
  link.href = parsed.href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

async function loadJSON(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(path, { signal: controller.signal });
    if (!response.ok) throw new Error("HTTP " + response.status);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function showError(target, text) {
  target.replaceChildren(element("span", text));
  target.classList.add("inline-error");
  const retry = element("button", "بارگذاری دوباره");
  retry.type = "button";
  retry.addEventListener("click", () => window.location.reload());
  target.append(" ", retry);
}

function fitVisibleLaboratory() {
  if (!viewer || !$("molecular-stage").getClientRects().length) return;
  requestAnimationFrame(() => {
    if (!viewer || !$("molecular-stage").getClientRects().length) return;
    viewer.resize();
    if (!labHasFitted) {
      viewer.resetView();
      labHasFitted = true;
    }
  });
}

async function loadReadingDocument(filename = null, chapter = null) {
  try {
    if (!markdownReaderPromise) {
      markdownReaderPromise = import("./markdown-reader.js?v=20261024-workspace").then(({ createMarkdownReader }) => createMarkdownReader());
    }
    const reader = await markdownReaderPromise;
    await reader.open(filename, chapter);
  } catch {
    markdownReaderPromise = null;
    $("reading-status").dataset.state = "error";
    showError($("reading-status"), "کتابچه بارگذاری نشد؛ مدل‌ها و توالی‌ها مستقل از آن در دسترس‌اند. متن اصلی از پیوند GitHub قابل خواندن است.");
  }
}

function readerFilename(href) {
  let url;
  try { url = new URL(href, window.location.href); }
  catch { return null; }
  const localDocs = new URL("docs/", window.location.href);
  const githubPrefix = "/koolfox/koolfox.github.io/blob/main/structural-bioinformatics/docs/";
  let filename = null;
  if (url.origin === localDocs.origin && url.pathname.startsWith(localDocs.pathname)) filename = url.pathname.slice(localDocs.pathname.length);
  if (url.origin === "https://github.com" && url.pathname.startsWith(githubPrefix)) filename = url.pathname.slice(githubPrefix.length);
  return readerDocuments.has(filename) ? filename : null;
}

function initializeTabs() {
  const tabs = [...$("research-tabs").querySelectorAll('[role="tab"]')];
  const sizeTabs=()=>document.documentElement.style.setProperty("--research-tabs-height",$("research-tabs").getBoundingClientRect().height+"px");
  sizeTabs();new ResizeObserver(sizeTabs).observe($("research-tabs"));
  const names = tabs.map((tab) => tab.dataset.tab);
  function activate(name, { focus = false, updateHash = false } = {}) {
    if (!names.includes(name)) name = "basics";
    for (const tab of tabs) {
      const active = tab.dataset.tab === name;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      $(tab.getAttribute("aria-controls")).hidden = !active;
    }
    document.documentElement.dataset.activeTab = name;
    const tab = $("tab-" + name);
    if (focus) tab.focus({ preventScroll: true });
    tab.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
    if (updateHash && window.location.hash !== "#" + name) {
      window.history.pushState(null, "", "#" + name);
    }
    if (name === "lab") fitVisibleLaboratory();
    else if (viewer?.spinning) viewer.setSpinning(false);
    if (name === "reading") void loadReadingDocument();
    for (const video of document.querySelectorAll("video")) {
      if (video.closest('[role="tabpanel"]')?.hidden) video.pause();
    }
  }
  function followHash() {
    let target;
    try { target = decodeURIComponent(window.location.hash.slice(1)); }
    catch { target = ""; }
    if (!target) { activate("basics"); return; }
    if (names.includes(target)) { activate(target); return; }
    const node = $(target);
    const panel = node?.closest('[role="tabpanel"]');
    if (!panel) { activate("basics"); return; }
    activate(panel.id.replace("panel-", ""));
    if (node.tagName === "DETAILS") node.open = true;
    requestAnimationFrame(() => node.scrollIntoView({ block: "start", behavior: "instant" }));
  }
  for (const tab of tabs) {
    tab.addEventListener("click", () => activate(tab.dataset.tab, { updateHash: true }));
    tab.addEventListener("keydown", (event) => {
      let index = tabs.indexOf(tab);
      // RTL visual order runs from right to left.
      if (event.key === "ArrowLeft") index = (index + 1) % tabs.length;
      else if (event.key === "ArrowRight") index = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") index = 0;
      else if (event.key === "End") index = tabs.length - 1;
      else return;
      event.preventDefault();
      activate(tabs[index].dataset.tab, { focus: true, updateHash: true });
    });
  }
  window.addEventListener("hashchange", followHash);
  window.addEventListener("popstate", followHash);
  for (const link of document.querySelectorAll('a[href]')) {
    const filename = readerFilename(link.href);
    if (!filename || link.id === "document-source" || link.id === "document-download") continue;
    const chapter = new URL(link.href).searchParams.get("chapter");
    link.dataset.document = filename;
    const destination = new URL("?document=" + encodeURIComponent(filename) + "#reading", window.location.href);
    if (/^(intro|all|chapter-\d+)$/.test(chapter || "")) destination.searchParams.set("chapter", chapter);
    const lesson = new URL(link.href).searchParams.get("lesson");
    if (/^[1-9]$/.test(lesson || "")) {
      destination.searchParams.set("lesson", lesson);
      destination.hash = "lesson-guide";
    }
    link.href = destination.href;
    link.removeAttribute("target");
  }
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest("a[href]");
    if (!link || link.id === "document-source" || link.id === "document-download") return;
    const filename = link.dataset.document || readerFilename(link.href);
    if (!readerDocuments.has(filename)) return;
    event.preventDefault();
    const url = new URL(window.location.href);
    url.searchParams.set("document", filename);
    url.searchParams.delete("chapter");
    const chapter = new URL(link.href).searchParams.get("chapter");
    if (/^(intro|all|chapter-\d+)$/.test(chapter || "")) url.searchParams.set("chapter", chapter);
    const lesson = new URL(link.href).searchParams.get("lesson");
    if (/^[1-9]$/.test(lesson || "")) url.searchParams.set("lesson", lesson);
    if (link.id === "start-presentation") {
      url.searchParams.set("chapter", "chapter-1");
      url.searchParams.delete("lesson");
    }
    url.hash = /^[1-9]$/.test(lesson || "") ? "lesson-guide" : "reading";
    window.history.pushState(null, "", url);
    activate("reading");
    $("tab-reading").focus({ preventScroll: true });
  });
  const toolTargets={binding:["basics","binding-explainer"],lab:["lab","structures"],epitope:["lab","epitope-lab"],sequences:["sequences","sequences"],comparison:["basics","molecular-roles"],datasets:["methods","datasets"],rna:["methods","rnaseq-groups"],docking:["methods","docking-validation"],papers:["literature","literature"],method:["methods","methods"],evidence:["basics","evidence-bridge"]};
  window.researchWorkspace={
    showLesson(){activate("basics");},
    openTool(name){const target=toolTargets[name];if(!target)return;activate(target[0],{updateHash:true});const node=$(target[1]);for(let parent=node;parent;parent=parent.parentElement)if(parent.tagName==="DETAILS")parent.open=true;requestAnimationFrame(()=>node?.scrollIntoView({block:"start"}));},
    async openDocument(name,chapter){activate("reading",{updateHash:true});await loadReadingDocument(name,chapter);}
  };
  followHash();
}

const modelCopy = {
  "3WD5": {
    label: "یک زیرواحد TNF و قطعهٔ Fab آدالیموماب",
    caption: "trace اتم‌های Cα با occupancy مثبت؛ A: TNF، H: زنجیرهٔ سنگین و L: زنجیرهٔ سبک Fab. این نما شامل یک زیرواحد TNF است؛ آنتی‌بادی کامل و همسایه‌های تقارن بلوریِ مؤثر در اپی‌توپ نمایش داده نمی‌شوند.",
    roles: { A: "TNF", H: "Fab سنگین", L: "Fab سبک" },
  },
  "1TNF": {
    label: "TNF آزاد؛ سه زیرواحد A، B و C",
    caption: "trace اتم‌های Cα سه زنجیرهٔ A/B/C در ساختار مرجع TNF آزاد. شکل مرجع، ساختار اختصاصی بیمار یا آزمایش پیش و پس از درمان نیست.",
    roles: { A: "TNF", B: "TNF", C: "TNF" },
  },
  "1B09": {
    label: "CRP؛ پنج زنجیرهٔ پروتئینی",
    caption: "trace اتم‌های Cα پنج زنجیرهٔ CRP از ساختار CRP–phosphocholine؛ لیگاندها و یون‌ها در این نمایش نیستند. CRP نشانگر التهاب است؛ هدف مستقیم آدالیموماب TNF است.",
    roles: { A: "CRP", B: "CRP", C: "CRP", D: "CRP", E: "CRP" },
  },
  "4FM9": {
    label: "هستهٔ برش DNA از TOP2A، همراه DNA",
    caption: "مقایسهٔ اختیاری: واحد نامتقارنِ بخشی از هستهٔ TOP2A و نقاط فسفات DNA در زنجیره‌های C/D. پروتئین و دایمر کامل در این فایل نیستند. تحلیل اتصال آدالیموماب در این پروژه مربوط به TNF است، نه TOP2A.",
    roles: { A: "هستهٔ TOP2A", C: "DNA فسفات", D: "DNA فسفات" },
  },
};

function setBilingualText(node, text) {
  node.replaceChildren();
  if (!/[\u0600-\u06ff]/.test(String(text))) {
    node.dir = "ltr";
    node.textContent = String(text);
    return;
  }
  node.dir = "rtl";
  const fragments = String(text).split(/([A-Za-z][A-Za-z0-9αβ/–-]*(?:\s+[A-Za-z][A-Za-z0-9αβ/–-]*)*)/g);
  for (const part of fragments) {
    if (/^[A-Za-z][A-Za-z0-9αβ/–\s-]*$/.test(part)) node.append(latin(part));
    else node.append(part);
  }
}

function renderModelControls(structure) {
  const copy = modelCopy[structure.id] || { label: structure.title, caption: "مختصات آزمایشگاهی؛ trace با مقیاس آنگستروم.", roles: {} };
  setBilingualText($("model-description"), copy.label);
  setBilingualText($("model-caption"), copy.caption + " لوله‌ها مسیر ستون اصلی را بین نقاط مشاهده‌شده روشن‌تر می‌کنند.");
  $("model-source").href = structure.source_url;
  $("model-source").replaceChildren(latin(structure.id), " در ", latin("RCSB PDB"));
  const legend = $("chain-legend");
  legend.replaceChildren();
  for (const chain of viewer.getState().chains) {
    const item = element("div", null, "chain-control");
    const label = element("label");
    const checkbox = element("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.dataset.chain = chain.id;
    checkbox.addEventListener("change", () => viewer.setChainVisible(chain.id, checkbox.checked));
    const name = element("span");
    name.append(latin(chain.id), " · ");
    setBilingualText(name, chain.id + " · " + (copy.roles[chain.id] || chain.kind));
    label.append(checkbox, name);
    const color = element("input");
    color.type = "color";
    color.value = chain.color;
    color.setAttribute("aria-label", "رنگ زنجیرهٔ " + chain.id);
    color.addEventListener("input", () => viewer.setChainColor(chain.id, color.value));
    item.append(label, color, element("span", numeric(chain.pointCount) + " نقطه", "chain-count"));
    legend.append(item);
  }
  const residueSelect = $("residue-select");
  residueSelect.replaceChildren(element("option", "یک نقطه انتخاب کنید"));
  residueSelect.firstElementChild.value = "";
  for (const chain of structure.chains) {
    const group = element("optgroup");
    group.label = chain.id + " · " + (copy.roles[chain.id] || chain.kind);
    group.dataset.chain = chain.id;
    for (const residue of chain.residues) {
      const option = element("option", chain.id + " · " + residue.name + " " + residue.number + (residue.insertion || ""));
      option.value = JSON.stringify([chain.id, residue.number, residue.insertion || ""]);
      option.dir = "ltr";
      group.append(option);
    }
    residueSelect.append(group);
  }
  $("interface-button").setAttribute("aria-pressed", "false");
  $("interface-button").textContent = "نمایش نقاط رابط روی TNF";
  $("interface-button").disabled = structure.id !== "3WD5" || !interfaceLoaded;
  $("residue-readout").textContent = "مختصات هر نقطه در واحد آنگستروم گزارش می‌شود.";
  syncRepresentation();
}

function referenceCommand(command, extra = {}) {
  $("reference-frame")?.contentWindow?.postMessage({ type: "molecular-command", command, ...extra }, window.location.origin);
}

function syncRepresentation() {
  const cartoon = $("representation-select").value === "cartoon";
  $("molecular-stage").hidden = cartoon;
  $("reference-stage").hidden = !cartoon;
  $("chain-legend").hidden = cartoon;
  $("residue-select").closest(".residue-inspection").hidden = cartoon;
  $("residue-readout").hidden = cartoon;
  $("spin-button").disabled = cartoon || !viewer || viewer.failed;
  if (cartoon) {
    viewer?.setSpinning(false);
    $("interface-button").disabled = true;
    const id = $("structure-select").value;
    setBilingualText($("model-caption"), "نمای نواری با Mol* از مدل اول ثبت‌شدهٔ " + id + ". رنگ‌ها زنجیره‌ها را جدا می‌کنند؛ نوارها سطح اتمی نیستند. فقط پروتئین و DNA نمایش داده می‌شوند؛ آب‌ها و لیگاندها پنهان‌اند. تقارن بلوری افزوده نشده است.");
    if (id === "3WD5") $("model-caption").append(" این نما مختصات ثبت‌شدهٔ شش Cα با occupancy صفر را هم بارگذاری می‌کند؛ آن‌ها از مسیر و محاسبات تحلیلی کنار گذاشته شده‌اند.");
    const frame = $("reference-frame");
    if (frame?.dataset.pdb === id) return;
    frame?.remove();
    clearTimeout(referenceTimer);
    const request = String(++referenceRequest);
    const next = element("iframe", null, "reference-frame");
    next.id = "reference-frame";
    next.title = "نمای نواری ساختار " + id;
    next.dataset.pdb = id;
    next.src = "assets/reference-viewer.html?pdb=" + id + "&request=" + request;
    $("reference-stage").dataset.state = "loading";
    $("reference-stage").setAttribute("aria-busy", "true");
    $("reference-load-status").hidden = false;
    $("reference-load-status").textContent = "در حال بارگذاری نمای نواری " + id + "…";
    for (const button of ["reset-button", "zoom-in", "zoom-out"]) $(button).disabled = true;
    $("reference-stage").prepend(next);
    referenceTimer = setTimeout(() => {
      if ($("reference-stage").dataset.state !== "loading") return;
      $("reference-stage").dataset.state = "error";
      $("reference-stage").setAttribute("aria-busy", "false");
      $("reference-load-status").textContent = "نمای نواری بارگذاری نشد. مسیر Cα را انتخاب کنید و برای تلاش دوباره به نمای نواری برگردید.";
      $("reference-frame")?.remove();
    }, 60000);
  } else {
    clearTimeout(referenceTimer);
    $("reference-frame")?.remove();
    if (viewer?.structure) {
      setBilingualText($("model-caption"), modelCopy[viewer.structure.id].caption + " لوله‌ها مسیر بین نقاط مشاهده‌شده‌اند؛ نوار و سطح اتمی نیستند.");
      $("interface-button").disabled = viewer.structure.id !== "3WD5" || !interfaceLoaded;
      for (const button of ["reset-button", "zoom-in", "zoom-out"]) $(button).disabled = viewer.failed;
      viewer.resize();
    }
  }
}

window.addEventListener("message", (event) => {
  const frame = $("reference-frame");
  if (!frame || event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
  const data = event.data;
  if (data?.type !== "molecular-reference" || data.token !== String(referenceRequest) || data.id !== frame.dataset.pdb) return;
  clearTimeout(referenceTimer);
  $("reference-stage").dataset.state = data.state;
  $("reference-stage").setAttribute("aria-busy", "false");
  $("reference-load-status").hidden = data.state === "ready";
  for (const button of ["reset-button", "zoom-in", "zoom-out"]) $(button).disabled = data.state !== "ready";
  if (data.state === "error") $("reference-load-status").textContent = "نمای نواری در دسترس نیست. مسیر Cα را انتخاب کنید؛ برای تلاش دوباره به نمای نواری برگردید.";
});

function showModel(id) {
  const structure = structures.find((item) => item.id === id);
  if (!structure || !viewer) return;
  viewer.setStructure(structure);
  renderModelControls(structure);
}

function failViewer(message) {
  $("molecular-stage").dataset.state = "error";
  $("molecular-stage").setAttribute("aria-busy", "false");
  $("model-fallback").hidden = false;
  $("stage-status").hidden = false;
  $("stage-status").textContent = message;
  $("molecular-stage").dataset.fallbackStructureId = "3WD5";
  delete $("molecular-stage").dataset.structureId;
  $("structure-select").value = "3WD5";
  setBilingualText($("model-description"), "نسخهٔ ثابت TNF و Fab آدالیموماب");
  $("model-source").href = "https://www.rcsb.org/structure/3WD5";
  $("model-source").replaceChildren(latin("3WD5"), " در ", latin("RCSB PDB"));
  if (viewer) {
    viewer.setSpinning(false);
    viewer.controls.enabled = false;
  }
  for (const id of controls) $(id).disabled = true;
  $("interface-button").disabled = true;
  for (const input of $("chain-legend").querySelectorAll("input")) input.disabled = true;
  $("model-caption").textContent = "تصویر ثابت فقط 3WD5، یک زیرواحد TNF و قطعهٔ Fab، را نشان می‌دهد. چرخش و انتخاب زنجیره در این وضعیت در دسترس نیست. برای تلاش دوباره صفحه را بارگذاری کنید.";
}

async function loadStructures() {
  try {
    const data = await loadJSON("data/processed/structures-view.json");
    if (data.coordinate_units !== "angstrom" || !Array.isArray(data.structures)) throw new Error("Unexpected structure schema");
    structures = data.structures;
    const { MolecularScene } = await import("./molecular-scene.js");
    viewer = new MolecularScene($("molecular-stage"));
    window.molecularViewer = viewer;
    viewer.addEventListener("viewererror", (event) => failViewer(event.detail));
    viewer.addEventListener("spinningchange", (event) => {
      $("spin-button").setAttribute("aria-pressed", String(event.detail));
      $("spin-button").textContent = event.detail ? "توقف چرخش" : "چرخش آرام";
    });
    viewer.addEventListener("visibilitychange", (event) => {
      const visible = new Set(event.detail.visibleChains);
      for (const group of $("residue-select").querySelectorAll("optgroup")) group.disabled = !visible.has(group.dataset.chain);
      $("residue-readout").textContent = event.detail.visiblePointCount
        ? numeric(event.detail.visiblePointCount) + " نقطه در زنجیره‌های فعال نمایش داده می‌شود."
        : "همهٔ زنجیره‌ها پنهان‌اند. برای دیدن ساختار، یک زنجیره را فعال کنید.";
    });
    viewer.addEventListener("inspect", (event) => {
      const point = event.detail;
      if (!point) return;
      const readout = $("residue-readout");
      readout.replaceChildren(
        "زنجیرهٔ ", latin(point.chain), " · ", latin(point.name + " " + point.number + (point.insertion || "")),
        " · مختصات ", latin("(" + point.xyz.map((n) => n.toFixed(3)).join(", ") + ") Å", "coordinate-data"),
        point.kind === "dna_phosphate" ? " · فسفات DNA" : " · اتم Cα",
      );
      $("residue-select").value = JSON.stringify([point.chain, point.number, point.insertion || ""]);
    });
    showModel("3WD5");
    fitVisibleLaboratory();
    $("model-fallback").hidden = true;
    $("stage-status").hidden = true;
    $("molecular-stage").setAttribute("aria-busy", "false");
    for (const id of controls) $(id).disabled = false;
    $("structure-select").addEventListener("change", (event) => {
      try { showModel(event.target.value); }
      catch { failViewer("نمای ساختار بارگذاری نشد. تصویر ثابت 3WD5 نمایش داده می‌شود؛ صفحه را دوباره بارگذاری کنید."); }
    });
    $("representation-select").addEventListener("change", syncRepresentation);
    $("spin-button").addEventListener("click", () => viewer.setSpinning(!viewer.spinning));
    $("reset-button").addEventListener("click", () => $("representation-select").value === "cartoon" ? referenceCommand("reset") : viewer.resetView());
    $("zoom-in").addEventListener("click", () => $("representation-select").value === "cartoon" ? referenceCommand("zoom", { factor: 0.83 }) : viewer.zoomBy(0.83));
    $("zoom-out").addEventListener("click", () => $("representation-select").value === "cartoon" ? referenceCommand("zoom", { factor: 1.2 }) : viewer.zoomBy(1.2));
    $("residue-select").addEventListener("change", (event) => {
      if (event.target.value) viewer.selectResidue(...JSON.parse(event.target.value));
    });
    $("interface-button").addEventListener("click", () => {
      const next = $("interface-button").getAttribute("aria-pressed") !== "true";
      viewer.setInterfaceHighlight(next);
      $("interface-button").setAttribute("aria-pressed", String(next));
      $("interface-button").textContent = next ? "پنهان کردن نقاط رابط" : "نمایش نقاط رابط روی TNF";
      if (next) {
        $("structures").scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
      }
    });
  } catch {
    failViewer("نمای تعاملی بارگذاری نشد؛ WebGL یا فایل مختصات در دسترس نیست. تصویر ثابت 3WD5 را می‌بینید. با مرورگر دارای WebGL دوباره تلاش کنید.");
    throw new Error("Molecular viewer unavailable");
  }
}

async function loadInterface() {
  try {
    const data = await loadJSON("data/processed/interface-summary.json");
    if (data.pdb_id !== "3WD5" || !Array.isArray(data.target_interface_residues)) throw new Error("Unexpected interface schema");
    for (const key of ["residue_pair_count", "heavy_atom_contact_count", "cutoff_angstrom"]) {
      if (!Number.isFinite(data[key])) throw new Error("Invalid measured value");
    }
    $("stat-residue-pairs").textContent = numeric(data.residue_pair_count);
    $("stat-atom-contacts").textContent = numeric(data.heavy_atom_contact_count);
    $("stat-interface-residues").textContent = numeric(data.target_interface_residues.length);
    $("stat-cutoff").textContent = numeric(data.cutoff_angstrom);
    $("interface-status").replaceChildren(
      "محاسبه در واحد نامتقارن ", latin(data.pdb_id), "؛ تماس‌های همسایه‌های تقارن بلوری در این نتیجه نیستند.",
    );
    $("interface-status").dataset.state = "ready";
    interfaceLoaded = true;
    if (viewer?.structure?.id === "3WD5" && $("representation-select").value === "trace") $("interface-button").disabled = false;
  } catch {
    showError($("interface-status"), "خلاصهٔ محاسبه خوانده نشد؛ عددی جایگزین نشده است.");
    $("interface-status").dataset.state = "error";
    throw new Error("Interface summary unavailable");
  }
}

async function loadLiterature() {
  try {
    const data = await loadJSON("data/metadata/literature.json");
    if (!Array.isArray(data.papers) || !data.papers.length) throw new Error("No paper records");
    const papers = data.papers.filter((paper) =>
      Boolean(paper.project_role_fa) ||
      !["shi_2025_top2a_ra_ipf", "bhamidipati_2026_spatial_ra"].includes(paper.id),
    );
    const list = $("paper-list");
    list.replaceChildren();
    for (const paper of papers) {
      const copy = {
        title: paper.project_role_fa || paper.title,
        evidence: paper.summary_fa || paper.findings?.interpretation || paper.study_design,
        rationale: paper.rationale_fa || "",
        limit: paper.critique_fa || paper.evidence_limits?.[0] || "",
      };
      const row = element("article", null, "paper-row");
      const heading = element("div");
      const title = element("h3");
      setBilingualText(title, copy.title);
      const meta = element("p", null, "paper-meta");
      meta.append(latin(paper.first_author), " · ", latin(String(paper.year)), " · ", latin(paper.journal));
      const original = element("p", paper.title, "paper-original");
      original.dir = "ltr";
      original.lang = "en";
      heading.append(title, meta, original);
      const evidence = element("div", null, "paper-evidence");
      const finding = element("p");
      const rationale = element("p", null, "paper-rationale");
      const limit = element("p", null, "paper-limit");
      setBilingualText(finding, copy.evidence);
      finding.prepend(element("strong", "خلاصهٔ یافته: "));
      if (copy.rationale) setBilingualText(rationale, copy.rationale);
      rationale.prepend(element("strong", "علت انتخاب: "));
      setBilingualText(limit, copy.limit);
      limit.prepend(element("strong", "نقد و مرز نتیجه‌گیری: "));
      const links = element("div", null, "paper-source-links");
      links.append(sourceLink("متن مقاله", "https://doi.org/" + paper.doi));
      if (paper.pmid) links.append(sourceLink("PubMed", "https://pubmed.ncbi.nlm.nih.gov/" + paper.pmid + "/"));
      evidence.append(finding);
      if (copy.rationale) evidence.append(rationale);
      if (copy.limit) evidence.append(limit);
      evidence.append(links);
      row.append(heading, evidence);
      list.append(row);
    }
    if (papers.length < 3) {
      list.append(element("p", "مرور مقاله‌های ساختاری برای موضوع اصلی در حال تکمیل است.", "section-status"));
    }
    list.dataset.state = "ready";
    list.dataset.paperCount = String(papers.length);
  } catch {
    $("paper-list").dataset.state = "error";
    showError($("paper-list"), "فهرست مقاله‌ها بارگذاری نشد. بررسی کامل مقاله‌ها از پیوند بالای این بخش قابل دریافت است.");
    throw new Error("Literature unavailable");
  }
}

const kindLabels = {
  experimental_structure: "ساختار آزمایشگاهی",
  protein_sequence: "توالی پروتئین",
  reference_sequence: "توالی مرجع",
  gene_expression: "بیان ژن",
  transcriptomics: "بیان ژن",
  spatial_transcriptomics: "بیان فضایی",
  clinical_trial: "کارآزمایی",
  clinical_trial_registry: "ثبت کارآزمایی",
  expression_dataset: "دادهٔ بیان ژن",
  omics: "دادهٔ اُمیک",
  protein_sequence_annotation: "توالی و annotation پروتئین",
  human_disease_comparator_omics: "اُمیک بیماری و گروه شاهد",
  human_response_omics: "اُمیک پاسخ به درمان",
  human_treatment_omics: "اُمیک در مسیر درمان",
  human_treatment_single_cell_omics: "اُمیک تک‌سلولی در درمان",
  human_treatment_spatial_omics: "اُمیک فضایی در درمان",
  in_vitro_cytokine_expression: "بیان ژن پس از تحریک سایتوکاین",
};
const accessLabels = {
  open_structure: "ساختار آزاد",
  open_sequence: "توالی آزاد",
  open_omics: "دادهٔ اُمیک آزاد",
  public_processed_only: "دادهٔ پردازش‌شدهٔ عمومی",
  public_processed_controlled_raw: "پردازش‌شده عمومی؛ خام با درخواست",
  open_spatial_large: "آرشیو فضایی آزاد و حجیم",
  aggregate_only: "نتایج تجمیعی",
  registry_only: "رکورد ثبت",
  on_request: "با درخواست پژوهشگر",
};
function kindLabel(kind = "") {
  if (kindLabels[kind]) return kindLabels[kind];
  if (/structure/.test(kind)) return "ساختار آزمایشگاهی";
  if (/sequence/.test(kind)) return "توالی مرجع";
  if (/spatial/.test(kind)) return "بیان فضایی";
  if (/trial|registry/.test(kind)) return "ثبت کارآزمایی";
  if (/methyl/.test(kind)) return "متیلاسیون";
  if (/expression|transcript|rna|omics|microarray/i.test(kind)) return "بیان / اُمیک";
  return kind.replaceAll("_", " ") || "منبع داده";
}
function diseaseLabel(record) {
  const value = Array.isArray(record.disease) ? record.disease.join(", ") : String(record.disease || "");
  if (/rheumatoid|RA\b/i.test(value)) return "آرتریت روماتوئید / بافت مفصلی";
  if (/psoria/i.test(value)) return "پسوریازیس / پوست";
  if (/lupus/i.test(value)) return "لوپوس / کلیه";
  if (/ankylosing/i.test(value)) return "اسپوندیلیت آنکیلوزان";
  if (/fibrosis|IPF|ILD/i.test(value)) return "فیبروز / بافت ریوی";
  if (record.kind === "experimental_structure" || /sequence/.test(record.kind || "")) return "ساختار یا توالی مرجع";
  return value || "مرجع مولکولی";
}

function renderDatasets() {
  const query = $("dataset-search").value.trim().toLocaleLowerCase();
  const kind = $("dataset-kind").value;
  const filtered = datasets.filter((record) => {
    const text = [record.id, record.title, record.disease, record.source, record.kind, diseaseLabel(record), kindLabel(record.kind)].join(" ").toLocaleLowerCase();
    return (kind === "all" || record.kind === kind) && text.includes(query);
  });
  const body = $("datasets-body");
  body.replaceChildren();
  for (const record of filtered) {
    const row = element("tr");
    const titleCell = element("td");
    titleCell.append(latin(record.id, "dataset-id"));
    const title = element("span", record.title, "dataset-title");
    title.lang = "en";
    title.dir = "ltr";
    titleCell.append(title);
    const context = element("td", diseaseLabel(record), "dataset-context");
    const access = record.access?.classification || "unverified";
    const accessCell = element("td", accessLabels[access] || access.replaceAll("_", " "), "dataset-access");
    const source = element("td");
    if (record.source_url) source.append(sourceLink("باز کردن منبع", record.source_url));
    row.append(titleCell, element("td", kindLabel(record.kind)), context, accessCell, source);
    body.append(row);
  }
  if (!filtered.length) {
    const row = element("tr", null, "empty-row");
    const cell = element("td", "منبعی با این جست‌وجو و نوع شواهد پیدا نشد. فیلترها را پاک کنید.");
    cell.colSpan = 5;
    row.append(cell);
    body.append(row);
  }
  $("dataset-status").textContent = numeric(filtered.length) + " منبع از " + numeric(datasets.length) + " منبع ثبت‌شده";
  $("datasets-table").dataset.rowCount = String(filtered.length);
}

async function loadDatasets() {
  try {
    const data = await loadJSON("data/metadata/datasets.json");
    if (!Array.isArray(data.datasets)) throw new Error("No dataset records");
    datasets = data.datasets;
    const kindSelect = $("dataset-kind");
    for (const kind of new Set(datasets.map((record) => record.kind))) {
      const option = element("option", kindLabel(kind));
      option.value = kind;
      kindSelect.append(option);
    }
    for (const id of ["dataset-search", "dataset-kind", "clear-filters"]) $(id).disabled = false;
    $("dataset-search").addEventListener("input", renderDatasets);
    kindSelect.addEventListener("change", renderDatasets);
    $("clear-filters").addEventListener("click", () => {
      $("dataset-search").value = "";
      kindSelect.value = "all";
      renderDatasets();
      $("dataset-search").focus();
    });
    renderDatasets();
    $("datasets-table").dataset.state = "ready";
  } catch {
    $("datasets-table").dataset.state = "error";
    $("datasets-body").replaceChildren();
    const row = element("tr");
    const cell = element("td", "فهرست JSON از پیوند بالای جدول قابل بررسی است.");
    cell.colSpan = 5;
    row.append(cell);
    $("datasets-body").append(row);
    showError($("dataset-status"), "فهرست منابع بارگذاری نشد؛ تعداد یا ردیف جایگزین نشده است.");
    throw new Error("Dataset catalog unavailable");
  }
}

const sequenceCategoryLabels = {
  refseq_mrna: "رونوشت مرجع mRNA",
  refseq_protein: "پروتئین مرجع",
  pdb_declared_polymer: "توالی اعلام‌شدهٔ سازهٔ 3WD5",
  pdb_resolved_fragment: "آمینواسیدهای دارای مختصات پذیرفته‌شده",
};

function sequenceOptionLabel(record) {
  if (record.accession_version) return record.gene + " · " + record.accession_version;
  const role = { A: "TNF", H: "Fab سنگین", L: "Fab سبک" }[record.auth_chain_id] || "";
  return record.pdb_id + " · " + record.auth_chain_id + " · " + role;
}

function sequenceMetadataRow(label, content, id) {
  const row = element("div");
  const value = element("dd");
  if (id) value.id = id;
  if (content instanceof Node) value.append(content);
  else setBilingualText(value, content);
  row.append(element("dt", label), value);
  $("sequence-metadata").append(row);
}

function displaySequence() {
  if (!selectedSequence || !sequenceText) return;
  const converted = selectedSequence.molecule === "mRNA" && $("rna-display").checked;
  const shown = converted ? sequenceText.replaceAll("T", "U") : sequenceText;
  const preview = shown.slice(0, 300);
  $("sequence-preview").textContent = preview.match(/.{1,60}/g).join("\n");
  $("sequence-preview").dataset.alphabet = converted ? "RNA" : selectedSequence.alphabet;
  $("sequence-preview-label").textContent = numeric(preview.length) + " حرف نخست از " + numeric(shown.length) + "؛ فایل اصلی کامل است.";
  setBilingualText($("sequence-display-note"), selectedSequence.molecule === "mRNA"
    ? (converted ? "نمایش RNA با U: فقط تبدیل حرف T به U است؛ فایل مرجع FASTA تغییر نکرده و این نمایش ساختار تاخوردهٔ RNA نیست."
      : "فایل مرجع mRNA با حروف A/C/G/T ذخیره شده است. تبدیل اختیاری T به U فقط نمایش را عوض می‌کند؛ فایل دریافت‌شده همان مرجع اصلی است.")
    : "حروف، آمینواسیدهای این رکورد را نشان می‌دهند؛ توالی به‌تنهایی مختصات سه‌بعدی یا میزان بیان پروتئین را مشخص نمی‌کند.");
}

function renderSequenceRecord(record) {
  const meta = $("sequence-metadata");
  meta.replaceChildren();
  sequenceMetadataRow("شناسهٔ رکورد", latin(record.accession_version || record.pdb_id + " / " + record.auth_chain_id), "sequence-accession");
  sequenceMetadataRow("نوع داده", sequenceCategoryLabels[record.category] || record.molecule);
  sequenceMetadataRow("ژن / سازه", record.gene ? latin(record.gene) : "قطعهٔ آنتی‌بادیِ دارویی؛ ژن انسانی به نام آدالیموماب ندارد");
  sequenceMetadataRow("طول توالی", numeric(record.length) + (record.molecule === "mRNA" ? " نوکلئوتید" : " آمینواسید"), "sequence-length");
  if (record.cds) {
    const cds = element("span");
    cds.append(latin(record.cds.start_1based + "–" + record.cds.end_1based), "؛ شماره‌گذاری از ۱، دو سر شامل؛ کدون پایان در این بازه است");
    sequenceMetadataRow("بخش کدکننده CDS", cds, "sequence-cds");
    const protein = element("span");
    protein.append(latin(record.cds.protein_accession_version), " · ", numeric(record.cds.translated_length_aa), " آمینواسید");
    sequenceMetadataRow("پروتئین ترجمه‌شده", protein);
  }
  if (Number.isInteger(record.positive_occupancy_ca_count)) {
    sequenceMetadataRow("نقاط مدل Cα", numeric(record.positive_occupancy_ca_count) + " نقطه با اشغال‌پذیری مثبت؛ برابر طول FASTA فرض نمی‌شود");
  }
  sequenceMetadataRow("رکورد اصلی", sourceLink("باز کردن منبع اصلی", record.source_page || record.source_url));
  $("sequence-download").href = record.path;
  $("sequence-download").download = record.path.split("/").at(-1);
  $("rna-display").checked = false;
  $("rna-display").disabled = record.molecule !== "mRNA";
  const limitations = $("sequence-limitations");
  limitations.replaceChildren();
  const notes = [];
  if (record.category === "refseq_mrna") notes.push("این رونوشتِ مرجعِ نسخه‌دار است؛ RNA بیمار، مقدار بیان ژن یا اندازه‌گیریِ شکل RNA نیست.");
  if (record.category === "refseq_protein") notes.push("مرجع کامل پروتئین با سازهٔ کوتاه‌شدهٔ آزمایشگاهی یا بخش دارای مختصات یکسان فرض نمی‌شود.");
  if (record.category === "pdb_declared_polymer") notes.push("توالی اعلام‌شدهٔ سازه است؛ وجود هر آمینواسید در این فایل به معنی داشتن مختصات پذیرفته‌شده برای همهٔ اتم‌های آن نیست.");
  if (record.category === "pdb_resolved_fragment") notes.push("این FASTA هویت آمینواسیدهای دارای حداقل یک اتم سنگینِ پذیرفته‌شده را کنار هم می‌آورد؛ شکاف ساختار اتصال پپتیدی جدید ایجاد نمی‌کند. بعضی از این آمینواسیدها Cα با اشغال‌پذیری مثبت ندارند.");
  if (record.auth_chain_id && ["H", "L"].includes(record.auth_chain_id)) notes.push("این زنجیره متعلق به سازهٔ Fab است؛ آنتی‌بادی کامل یا توالی RNA یکتای دارو نیست. از توالی آمینواسیدی، mRNA مهندسی‌شدهٔ یکتا تعیین نمی‌شود.");
  if (record.related_refseq_protein?.mismatches?.length) notes.push("این سازه با مرجع TNF تطابق کامل ندارد: D در جایگاه ۳۱ سازه، در برابر R در جایگاه مرتبط ۱۰۷ مرجع. شمارهٔ سازه و شمارهٔ پروتئین کامل را جدا گزارش کنید.");
  const list = element("ul", null, "sequence-notes");
  for (const note of notes) {
    const item = element("li");
    setBilingualText(item, note);
    list.append(item);
  }
  limitations.append(list, sourceLink("محدودیت‌ها و SHA-256 در فایل متاداده", "data/metadata/sequences.json"));
  displaySequence();
}

async function selectSequence(id) {
  const request = ++sequenceRequest;
  const record = sequenceRecords.find((item) => item.id === id);
  const status = $("sequence-status");
  status.dataset.state = "loading";
  status.classList.remove("inline-error");
  status.textContent = "در حال خواندن فایل واقعی FASTA…";
  $("sequence-record").hidden = true;
  $("sequence-record").setAttribute("aria-busy", "true");
  $("sequence-copy").disabled = true;
  selectedSequence = null;
  sequenceText = "";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    if (!record || !/^data\/sequences\/[A-Za-z0-9_.-]+\.fasta$/.test(record.path)) throw new Error("Invalid FASTA path");
    const response = await fetch(record.path, { signal: controller.signal });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const bytes = await response.arrayBuffer();
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const lines = text.trim().split(/\r?\n/);
    if (!lines[0]?.startsWith(">") || lines.slice(1).some((line) => line.startsWith(">"))) throw new Error("Expected one FASTA record");
    const sequence = lines.slice(1).join("").replace(/\s/g, "").toUpperCase();
    const alphabet = record.molecule === "mRNA" ? /^[ACGTRYSWKMBDHVN]+$/ : /^[ACDEFGHIKLMNPQRSTVWYBXZJUO]+$/;
    if (!alphabet.test(sequence) || sequence.length !== record.length) throw new Error("FASTA alphabet or length mismatch");
    let hashVerified = false;
    if (globalThis.crypto?.subtle && record.sha256) {
      const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
      const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
      if (hash !== record.sha256) throw new Error("FASTA provenance checksum mismatch");
      hashVerified = true;
    }
    if (request !== sequenceRequest) return;
    selectedSequence = record;
    sequenceText = sequence;
    renderSequenceRecord(record);
    $("sequence-record").hidden = false;
    $("sequence-record").setAttribute("aria-busy", "false");
    $("sequence-copy").disabled = false;
    status.dataset.state = "ready";
    status.dataset.sequenceId = record.id;
    status.dataset.sequenceLength = String(sequence.length);
    status.dataset.hashVerified = String(hashVerified);
    status.textContent = hashVerified ? "فایل اصلی خوانده شد؛ طول و SHA-256 با متاداده تطبیق دارند." : "فایل اصلی خوانده شد؛ طول و حروف با متاداده تطبیق دارند.";
  } catch {
    if (request !== sequenceRequest) return;
    status.dataset.state = "error";
    delete status.dataset.sequenceId;
    delete status.dataset.sequenceLength;
    status.classList.add("inline-error");
    status.replaceChildren(element("span", "فایل FASTA این رکورد خوانده یا تأیید نشد. رکورد دیگری را انتخاب کنید یا دوباره تلاش کنید."));
    const retry = element("button", "تلاش دوباره برای همین توالی");
    retry.type = "button";
    retry.addEventListener("click", () => selectSequence(id));
    status.append(" ", retry);
    $("sequence-record").setAttribute("aria-busy", "false");
  } finally {
    clearTimeout(timeout);
  }
}

async function loadSequences() {
  try {
    const data = await loadJSON("data/metadata/sequences.json");
    if (!Array.isArray(data.sequences) || !data.sequences.length) throw new Error("No sequence records");
    sequenceRecords = data.sequences;
    const select = $("sequence-select");
    select.replaceChildren();
    for (const [category, label] of Object.entries(sequenceCategoryLabels)) {
      const records = sequenceRecords.filter((record) => record.category === category);
      if (!records.length) continue;
      const group = element("optgroup");
      group.label = label;
      for (const record of records) {
        const option = element("option", sequenceOptionLabel(record));
        option.value = record.id;
        option.dir = "ltr";
        group.append(option);
      }
      select.append(group);
    }
    select.disabled = false;
    select.addEventListener("change", () => selectSequence(select.value));
    $("rna-display").addEventListener("change", displaySequence);
    $("sequence-copy").addEventListener("click", async () => {
      if (!selectedSequence || !sequenceText) return;
      const text = selectedSequence.molecule === "mRNA" && $("rna-display").checked ? sequenceText.replaceAll("T", "U") : sequenceText;
      try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(text);
        $("sequence-status").textContent = "توالیِ کامل با حروف نمایشِ انتخاب‌شده کپی شد؛ فایل اصلی بدون تغییر است.";
      } catch {
        $("sequence-status").textContent = "کپی خودکار در این مرورگر در دسترس نیست. فایل FASTA را دریافت کنید.";
      }
    });
    const initial = sequenceRecords.find((record) => record.id === "TNF_NM_000594.4") || sequenceRecords[0];
    select.value = initial.id;
    await selectSequence(initial.id);
  } catch {
    $("sequence-status").dataset.state = "error";
    showError($("sequence-status"), "فهرست توالی‌ها بارگذاری نشد؛ آزمایشگاه سه‌بعدی و مقاله‌ها مستقل از این بخش در دسترس‌اند.");
    throw new Error("Sequence metadata unavailable");
  }
}

initializeBindingExplainer();
initializeTabs();
for (const section of document.querySelectorAll('#panel-basics .reading-section')) linkGlossaryTerms(section);
const results = await Promise.allSettled([
  loadStructures(), loadInterface(), loadLiterature(), loadDatasets(), loadSequences(),
]);
document.documentElement.dataset.researchState = results.every((result) => result.status === "fulfilled") ? "ready" : "partial";
