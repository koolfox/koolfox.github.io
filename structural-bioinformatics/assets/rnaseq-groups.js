/**
 * Group-level view of baseline PBMC RNA in GSE138746 (adalimumab arm).
 * Reads only aggregates from data/processed/rnaseq-group-summary.json: n, quartiles, median.
 * Descriptive; no test is run and baseline RNA cannot show a drug effect.
 */

const fa = (value, digits = 1) => new Intl.NumberFormat("fa-IR", { maximumFractionDigits: digits }).format(value);
const $ = (id) => document.getElementById(id);
const GROUPS = [
  ["good", "پاسخ خوب"],
  ["moderate", "پاسخ متوسط"],
  ["no", "بدون پاسخ"],
];
const ROLES = {
  TNF: "هدف دارو؛ این mRNA در سلول‌های خون است، نه پروتئین TNF در مفصل.",
  TNFRSF1A: "گیرندهٔ ۱ TNF.",
  TNFRSF1B: "گیرندهٔ ۲ TNF.",
  TOP2A: "مسیر موازی؛ آنزیم تقسیم سلول.",
  ACTB: "ژن مرجع برای حس مقیاس؛ این‌جا برای نرمال‌سازی استفاده نشده است.",
};

function cell(text) {
  const element = document.createElement("td");
  element.textContent = text;
  return element;
}

function render(data, symbol) {
  const gene = data.genes.find((entry) => entry.symbol === symbol) || data.genes[0];
  $("rnaseq-gene-role").textContent = gene.symbol + ": " + (ROLES[gene.symbol] || gene.role);
  const top = Math.max(...GROUPS.map(([key]) => gene.groups[key].q3)) * 1.1;
  const scale = (value) => (100 * value) / top;
  const chart = $("rnaseq-chart");
  chart.setAttribute("aria-label", "میانه و چارک‌های " + gene.symbol + " در سه گروه پاسخ");
  chart.dataset.gene = gene.symbol;
  chart.replaceChildren(...GROUPS.map(([key, label]) => {
    const group = gene.groups[key];
    const row = document.createElement("div");
    row.className = "rnaseq-row";
    const name = document.createElement("span");
    name.className = "rnaseq-label";
    name.textContent = label + " (" + fa(group.n, 0) + " نفر)";
    const track = document.createElement("span");
    track.className = "rnaseq-track";
    track.dir = "ltr";
    const box = document.createElement("span");
    box.className = "rnaseq-box";
    box.style.left = scale(group.q1) + "%";
    box.style.width = Math.max(scale(group.q3) - scale(group.q1), 0.6) + "%";
    const median = document.createElement("span");
    median.className = "rnaseq-median";
    median.style.left = scale(group.median) + "%";
    track.append(box, median);
    row.append(name, track);
    return row;
  }));
  const axis = document.createElement("div");
  axis.className = "rnaseq-axis";
  axis.dir = "ltr";
  axis.append(...[0, 0.5, 1].map((fraction) => {
    const tick = document.createElement("span");
    tick.textContent = fa(top * fraction, 0);
    return tick;
  }));
  chart.append(axis);
  $("rnaseq-body").replaceChildren(...GROUPS.map(([key, label]) => {
    const group = gene.groups[key];
    const row = document.createElement("tr");
    row.append(cell(label), cell(fa(group.n, 0)), cell(fa(group.q1)), cell(fa(group.median)), cell(fa(group.q3)));
    return row;
  }));
}

async function initialize() {
  const section = $("rnaseq-groups");
  section.dataset.state = "loading";
  try {
    const response = await fetch("data/processed/rnaseq-group-summary.json");
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    if (data.accession !== "GSE138746" || !Array.isArray(data.genes) || !data.genes.length) throw new Error("Unexpected schema");
    const select = $("rnaseq-gene");
    select.replaceChildren(...data.genes.map((gene) => new Option(gene.symbol, gene.symbol)));
    select.addEventListener("change", () => render(data, select.value));
    select.disabled = false;
    render(data, "TNF");
    select.value = "TNF";
    section.dataset.state = "ready";
    $("rnaseq-status").textContent = "منبع: فایل‌های GEO با هش ثبت‌شده؛ فقط خلاصهٔ گروه‌ها منتشر شده است. RNA پیش از درمان و پاسخ در ماه ۶، دو اندازه‌گیری جدا هستند.";
  } catch {
    section.dataset.state = "error";
    $("rnaseq-status").textContent = "خلاصهٔ RNA-seq بارگذاری نشد. صفحه را دوباره بارگذاری کنید.";
  }
}

const section = $("rnaseq-groups");
if (section) {
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    initialize();
  }, { rootMargin: "300px 0px" });
  observer.observe(section);
}
