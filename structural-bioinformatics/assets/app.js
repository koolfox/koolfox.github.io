const $ = (id) => document.getElementById(id);
const faNumber = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 });
const numeric = (value) => faNumber.format(value);
let viewer = null;
let structures = [];
let datasets = [];
let interfaceLoaded = false;
const controls = ["structure-select", "spin-button", "reset-button", "zoom-in", "zoom-out", "residue-select"];

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
    caption: "واحد نامتقارن: بخشی از هستهٔ TOP2A و نقاط فسفات DNA در زنجیره‌های C/D. این نما پروتئین کامل، دایمر کامل یا بازهای DNA را بازسازی نمی‌کند؛ ارتباط مستقیم با TNF را نیز نشان نمی‌دهد.",
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
  setBilingualText($("model-caption"), copy.caption + " لوله‌ها فقط بین نقاط backbone درون‌یابی می‌شوند؛ سطح مولکولی یا مسیر دینامیکی نیستند.");
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
  residueSelect.replaceChildren(element("option", "یک residue انتخاب کنید"));
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
}

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
    $("model-fallback").hidden = true;
    $("stage-status").hidden = true;
    $("molecular-stage").setAttribute("aria-busy", "false");
    for (const id of controls) $(id).disabled = false;
    $("structure-select").addEventListener("change", (event) => {
      try { showModel(event.target.value); }
      catch { failViewer("نمای ساختار بارگذاری نشد. تصویر ثابت 3WD5 نمایش داده می‌شود؛ صفحه را دوباره بارگذاری کنید."); }
    });
    $("spin-button").addEventListener("click", () => viewer.setSpinning(!viewer.spinning));
    $("reset-button").addEventListener("click", () => viewer.resetView());
    $("zoom-in").addEventListener("click", () => viewer.zoomBy(0.83));
    $("zoom-out").addEventListener("click", () => viewer.zoomBy(1.2));
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
    if (viewer?.structure?.id === "3WD5") $("interface-button").disabled = false;
  } catch {
    showError($("interface-status"), "خلاصهٔ محاسبه خوانده نشد؛ عددی جایگزین نشده است.");
    $("interface-status").dataset.state = "error";
    throw new Error("Interface summary unavailable");
  }
}

const paperCopy = {
  shi_2025_top2a_ra_ipf: {
    title: "TOP2A در زمینهٔ RA و فیبروز ریوی",
    evidence: "بازتحلیل بیان ژن و آزمایش‌های مدل سلولی، TOP2A را برای بررسی بیشتر پیشنهاد می‌کنند. مدل‌های SW982 و A549 منشأ سرطانی دارند.",
    limit: "این مطالعه آدالیموماب را آزمایش نکرده و اتصال مستقیم TNF–TOP2A یا یک آزمون بالینی معتبر را اثبات نمی‌کند.",
  },
  bhamidipati_2026_spatial_ra: {
    title: "بافت و مقاومت به درمان در RA",
    evidence: "بیوپسی‌های جفتی از ۱۷ بیمار؛ ۶ بیمار آدالیموماب دریافت کردند. الگوهای فضایی فیبروبلاست و مسیرهای TGFβ زمینه‌ای برای بررسی پاسخ درمانی فراهم می‌کنند.",
    limit: "نسخهٔ نهایی مقاله از ۲۰۲۶ است. TOP2A نتیجهٔ مکانیکی این مطالعه نیست؛ سلول‌ها جای تکرار مستقل در سطح بیمار را نمی‌گیرند.",
  },
  gehin_2024_admyra: {
    title: "غلظت آدالیموماب، CRP و پیامد درمان",
    evidence: "تحلیل اکتشافی غلظت سرمی و پیامد در داده‌های کارآزمایی ADMYRA؛ ارتباط با CRP پایین‌تر و remission در RA گزارش شده است.",
    limit: "همهٔ بیماران متوترکسات دریافت کردند. ارتباط غلظت و پیامد، سود یک مداخلهٔ تغییر دوز یا یک آستانهٔ عمومی برای چهار بیماری را اثبات نمی‌کند.",
  },
};

async function loadLiterature() {
  try {
    const data = await loadJSON("data/metadata/literature.json");
    if (!Array.isArray(data.papers) || !data.papers.length) throw new Error("No paper records");
    const list = $("paper-list");
    list.replaceChildren();
    for (const paper of data.papers) {
      const copy = paperCopy[paper.id] || { title: paper.title, evidence: paper.findings?.interpretation || paper.study_design, limit: paper.evidence_limits?.[0] || "" };
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
      const limit = element("p", null, "paper-limit");
      setBilingualText(finding, copy.evidence);
      setBilingualText(limit, copy.limit);
      const links = element("div", null, "paper-source-links");
      links.append(sourceLink("متن مقاله", "https://doi.org/" + paper.doi));
      if (paper.pmid) links.append(sourceLink("PubMed", "https://pubmed.ncbi.nlm.nih.gov/" + paper.pmid + "/"));
      evidence.append(finding, limit, links);
      row.append(heading, evidence);
      list.append(row);
    }
    list.dataset.state = "ready";
    list.dataset.paperCount = String(data.papers.length);
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

const results = await Promise.allSettled([
  loadStructures(), loadInterface(), loadLiterature(), loadDatasets(),
]);
document.documentElement.dataset.researchState = results.every((result) => result.status === "fulfilled") ? "ready" : "partial";
