/**
 * Epitope mini-experiments on the crystal-symmetry TNF trimer of 3WD5.
 * Reads precomputed heavy-atom pairs (≤ 6 Å) from data/processed/epitope-lab.json and
 * re-filters them in the browser: contact threshold, residue partners and virtual alanine.
 * Geometry only; nothing here estimates affinity, ΔΔG or clinical effect.
 */

const faNumber = new Intl.NumberFormat("fa-IR");
const faPercent = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });
const FLAG = { hbond: 1, salt: 2, apolar: 4 };
const TYPE_LABELS = [
  [FLAG.hbond, "پیوند هیدروژنی احتمالی"],
  [FLAG.salt, "پل نمکی احتمالی"],
  [FLAG.apolar, "تماس کربنی زنجیرهٔ جانبی"],
];
const COLORS = {
  A: "#087b73", B: "#8a97a8", C: "#8a97a8",
  H: "#a95015", L: "#245cb7",
  I: "#e2c3a6", J: "#e2c3a6", M: "#b9c9e6", N: "#b9c9e6",
};
const OTHER_FABS = ["I", "M", "J", "N"];
const DEFAULT_RESIDUE = "A:21:";

const $ = (id) => document.getElementById(id);
const residueId = (r) => r.chain + ":" + r.number + ":" + (r.insertion || "");
const residueLabel = (r) => r.chain + ":" + r.name + r.number + (r.insertion || "");

function latin(text) {
  const node = document.createElement("bdi");
  node.dir = "ltr";
  node.textContent = text;
  return node;
}

/** Contact statistics for one threshold, optionally with one residue truncated to alanine. */
export function contactSummary(data, cutoff, truncated = null) {
  const kept = new Set(data.alanine_kept_atoms);
  const residues = data.residues;
  const active = [];
  for (const pair of data.pairs) {
    if (pair[4] > cutoff) continue;
    if (truncated !== null) {
      if (pair[0] === truncated && !kept.has(pair[1])) continue;
      if (pair[2] === truncated && !kept.has(pair[3])) continue;
    }
    active.push(pair);
  }
  const own = active.filter((p) => residues[p[0]].chain === "A").length;
  const typed = (bit) => new Set(active.filter((p) => p[5] & bit).map((p) => p[0] + "-" + p[2])).size;
  return {
    pairs: active,
    atoms: active.length,
    own,
    neighbour: active.length - own,
    tnfResidues: new Set(active.map((p) => p[0])).size,
    residuePairs: new Set(active.map((p) => p[0] + "-" + p[2])).size,
    hbond: typed(FLAG.hbond),
    salt: typed(FLAG.salt),
    apolar: typed(FLAG.apolar),
  };
}

/** Partners of one residue: grouped by partner residue, nearest first. */
export function partnersOf(data, pairs, index) {
  const groups = new Map();
  for (const pair of pairs) {
    let other;
    if (pair[0] === index) other = pair[2];
    else if (pair[2] === index) other = pair[0];
    else continue;
    const entry = groups.get(other) || { index: other, count: 0, minimum: Infinity, flags: 0 };
    entry.count += 1;
    entry.minimum = Math.min(entry.minimum, pair[4]);
    entry.flags |= pair[5];
    groups.set(other, entry);
  }
  return [...groups.values()].sort((a, b) => a.minimum - b.minimum);
}

function regionText(residue) {
  if (residue.region === "TNF") {
    return residue.chain === "A" ? "TNF، زیرواحد A" : "TNF، زیرواحد همسایه " + residue.chain;
  }
  return residue.region === "framework" ? "چارچوب Fab" : residue.region;
}

function typeText(flags) {
  const names = TYPE_LABELS.filter(([bit]) => flags & bit).map(([, name]) => name);
  return names.length ? names.join("، ") : "فقط نزدیکی";
}

class EpitopeLab {
  constructor(data, surface) {
    this.data = data;
    this.surface = surface;
    this.cutoff = data.default_cutoff_angstrom;
    this.selected = data.residues.findIndex((r) => residueId(r) === DEFAULT_RESIDUE);
    this.alanine = false;
    this.scene = null;
  }

  start() {
    this._fillResidueSelect();
    $("epitope-cutoff").value = String(this.cutoff);
    $("epitope-cutoff").addEventListener("input", (event) => {
      this.cutoff = Number(event.target.value);
      this.render();
    });
    $("epitope-residue").addEventListener("change", (event) => {
      const index = event.target.value === "" ? -1 : Number(event.target.value);
      this.select(index, true);
    });
    $("epitope-alanine").addEventListener("click", () => {
      this.alanine = !this.alanine;
      this.render();
    });
    for (const id of ["epitope-cutoff", "epitope-residue", "epitope-alanine"]) $(id).disabled = false;
    this.render();
  }

  select(index, fromList = false) {
    if (index !== this.selected) this.alanine = false;
    this.selected = index;
    if (!fromList) $("epitope-residue").value = index >= 0 ? String(index) : "";
    if (fromList && this.scene && index >= 0) {
      const r = this.data.residues[index];
      this.scene.selectResidue(r.chain, r.number, r.insertion || "");
    }
    this.render();
  }

  _fillResidueSelect() {
    const select = $("epitope-residue");
    const groups = [
      ["TNF (اپی‌توپ)", (r) => r.region === "TNF"],
      ["Fab (پاراتوپ)", (r) => r.region !== "TNF"],
    ];
    for (const [title, keep] of groups) {
      const group = document.createElement("optgroup");
      group.label = title;
      this.data.residues
        .map((r, index) => ({ r, index }))
        .filter(({ r }) => keep(r))
        .sort((a, b) => a.r.chain.localeCompare(b.r.chain) || a.r.number - b.r.number)
        .forEach(({ r, index }) => {
          const option = document.createElement("option");
          option.value = String(index);
          option.textContent = residueLabel(r) + (r.region !== "TNF" ? " · " + r.region : "");
          group.append(option);
        });
      select.append(group);
    }
    select.value = this.selected >= 0 ? String(this.selected) : "";
  }

  render() {
    const cutoff = this.cutoff;
    $("epitope-cutoff-value").textContent = cutoff.toFixed(1) + " Å";
    const truncated = this.alanine && this.selected >= 0 ? this.selected : null;
    const summary = contactSummary(this.data, cutoff, truncated);
    $("epitope-stat-atoms").textContent = faNumber.format(summary.atoms);
    $("epitope-stat-own").textContent = faNumber.format(summary.own);
    $("epitope-stat-neighbour").textContent = faNumber.format(summary.neighbour);
    $("epitope-stat-share").textContent = summary.atoms
      ? faPercent.format((100 * summary.neighbour) / summary.atoms) + "٪"
      : "—";
    $("epitope-stat-tnf").textContent = faNumber.format(summary.tnfResidues);
    $("epitope-stat-pairs").textContent = faNumber.format(summary.residuePairs);
    const isDefault = Math.abs(cutoff - this.data.default_cutoff_angstrom) < 1e-9 && truncated === null;
    $("epitope-types").textContent =
      "جفت آمینواسیدهای دارای نوع احتمالی: پیوند هیدروژنی " + faNumber.format(summary.hbond) +
      "، پل نمکی " + faNumber.format(summary.salt) +
      "، تماس کربنی " + faNumber.format(summary.apolar) +
      ". قواعد نوع، آستانهٔ خود را دارند (۳٫۵ و ۴ Å)؛ آستانهٔ بالاتر آن‌ها را بیشتر نمی‌کند." +
      (isDefault ? " این همان اعداد گزارش‌شده در تحلیل اصلی است." : "");
    this._renderResidue(summary, truncated);
    this._renderScene(summary);
    $("epitope-lab").dataset.contacts = String(summary.atoms);
    $("epitope-lab").dataset.neighbourContacts = String(summary.neighbour);
  }

  _renderResidue(summary, truncated) {
    const body = $("epitope-partners");
    const result = $("epitope-alanine-result");
    const button = $("epitope-alanine");
    button.setAttribute("aria-pressed", String(this.alanine));
    button.textContent = this.alanine ? "برگرداندن زنجیرهٔ جانبی" : "حذف مجازی زنجیرهٔ جانبی";
    if (this.selected < 0) {
      body.replaceChildren();
      $("epitope-residue-summary").textContent = "یک آمینواسید را از فهرست یا با کلیک روی نمای سه‌بعدی انتخاب کنید.";
      button.disabled = true;
      result.textContent = "";
      return;
    }
    const residue = this.data.residues[this.selected];
    const full = contactSummary(this.data, this.cutoff);
    const before = partnersOf(this.data, full.pairs, this.selected);
    const after = partnersOf(this.data, summary.pairs, this.selected);
    const afterByIndex = new Map(after.map((p) => [p.index, p]));
    const atomsBefore = before.reduce((sum, p) => sum + p.count, 0);
    const atomsAfter = after.reduce((sum, p) => sum + p.count, 0);
    const area = [...this.surface.tnf_residues, ...this.surface.fab_residues]
      .find((row) => row.residue === residueLabel(residue));
    $("epitope-residue-summary").replaceChildren(
      latin(residueLabel(residue)), " · " + regionText(residue) + " · ",
      faNumber.format(atomsBefore) + " جفت اتم با " + faNumber.format(before.length) + " آمینواسید در آستانهٔ ",
      latin(this.cutoff.toFixed(1) + " Å"),
      area ? "؛ سطح پوشیده (ΔSASA، آستانهٔ ثابت تحلیل اصلی): " : "؛ سطح پوشیدهٔ ثبت‌شده ندارد.",
      ...(area ? [latin(area.delta_sasa_angstrom2.toFixed(1) + " Å²")] : []),
    );
    body.replaceChildren(...before.map((partner) => {
      const other = this.data.residues[partner.index];
      const remaining = afterByIndex.get(partner.index);
      const row = document.createElement("tr");
      if (truncated !== null && !remaining) row.className = "lost-contact";
      const cells = [
        residueLabel(other),
        regionText(other),
        partner.minimum.toFixed(2),
        truncated !== null
          ? faNumber.format(remaining?.count || 0) + " از " + faNumber.format(partner.count)
          : faNumber.format(partner.count),
        remaining || truncated === null
          ? typeText((remaining || partner).flags)
          : "از دست رفت؛ پیش‌تر: " + typeText(partner.flags),
      ];
      for (const text of cells) {
        const cell = document.createElement("td");
        cell.textContent = text;
        row.append(cell);
      }
      return row;
    }));
    if (!before.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.textContent = "در این آستانه هیچ اتمی از این آمینواسید در تماس نیست. آستانه را بیشتر کنید.";
      row.append(cell);
      body.append(row);
    }
    const noSideChain = residue.name === "GLY" || residue.name === "ALA";
    button.disabled = noSideChain;
    if (noSideChain) {
      result.textContent = residue.name === "GLY"
        ? "گلیسین زنجیرهٔ جانبی ندارد؛ جهش آن به آلانین چیزی حذف نمی‌کند (در واقع یک گروه متیل اضافه می‌کند)."
        : "این آمینواسید خودش آلانین است.";
      return;
    }
    if (truncated === null) {
      result.textContent = "دکمه را بزنید تا اتم‌های پس از Cβ این آمینواسید از شمارش حذف شوند.";
      return;
    }
    const lostPartners = before.filter((p) => !afterByIndex.has(p.index)).map((p) => residueLabel(this.data.residues[p.index]));
    const lostTyped = (bit) => before.filter((p) => (p.flags & bit) && !((afterByIndex.get(p.index)?.flags || 0) & bit)).length;
    const parts = [
      faNumber.format(atomsBefore - atomsAfter) + " از " + faNumber.format(atomsBefore) + " جفت اتم حذف شد",
      lostPartners.length ? "شریک‌هایی که کاملاً از دست رفتند: " + lostPartners.join("، ") : "هیچ شریکی کاملاً از دست نرفت؛ ستون اصلی و Cβ هنوز تماس دارند",
      "پیوند هیدروژنی احتمالیِ از دست‌رفته با " + faNumber.format(lostTyped(FLAG.hbond)) + " شریک",
      "پل نمکی احتمالیِ از دست‌رفته با " + faNumber.format(lostTyped(FLAG.salt)) + " شریک",
    ];
    let text = parts.join("؛ ") + ". این شمارش هندسی است؛ ساختار شل نشده و انرژی محاسبه نشده است.";
    if (residueId(residue) === DEFAULT_RESIDUE) {
      text += " مقایسه: در Hu 2013 جهش Q21A مقدار KD را حدود ۲۰۰ برابر بیشتر کرد؛ هندسه فقط توضیح می‌دهد چرا این جایگاه کاندید است.";
    }
    result.textContent = text;
  }

  attachScene(scene) {
    this.scene = scene;
    scene.addEventListener("inspect", (event) => {
      const point = event.detail;
      if (!point) return;
      const index = this.data.residues.findIndex((r) => residueId(r) === residueId(point));
      if (index >= 0) {
        if (index !== this.selected) this.select(index);
      } else {
        $("epitope-residue-summary").replaceChildren(
          latin(point.chain + ":" + point.name + point.number + (point.insertion || "")),
          " تا ۶ Å از رابط محاسبه‌شده فاصله دارد و در فهرست آزمایش نیست.",
        );
      }
    });
    if (this.selected >= 0) {
      const r = this.data.residues[this.selected];
      scene.selectResidue(r.chain, r.number, r.insertion || "");
    }
    this.render();
  }

  _renderScene(summary) {
    if (!this.scene?.setInterfaceResidues) return;
    const indices = new Set();
    for (const pair of summary.pairs) {
      indices.add(pair[0]);
      indices.add(pair[2]);
    }
    this.scene.setInterfaceResidues([...indices].map((i) => this.data.residues[i]));
    this.scene.setInterfaceHighlight(true);
  }
}

async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("HTTP " + response.status);
  return response.json();
}

function validate(data) {
  if (data.pdb_id !== "3WD5" || data.coordinate_units !== "angstrom") throw new Error("Unexpected schema");
  if (!Array.isArray(data.pairs) || !Array.isArray(data.residues) || !Array.isArray(data.trace)) {
    throw new Error("Missing arrays");
  }
  for (const pair of data.pairs) {
    if (pair.length !== 6 || !Number.isFinite(pair[4]) || !data.residues[pair[0]] || !data.residues[pair[2]]) {
      throw new Error("Malformed pair");
    }
  }
}

async function startScene(lab) {
  const stage = $("epitope-stage");
  try {
    const { MolecularScene } = await import("./molecular-scene.js?v=20261017-epitope");
    const scene = new MolecularScene(stage, { descriptionIds: "epitope-lab-title" });
    scene.addEventListener("viewererror", () => {
      $("epitope-fallback").hidden = false;
      stage.dataset.state = "error";
    });
    scene.setStructure({ id: "3WD5-TRIMER-3FAB", chains: lab.data.trace });
    for (const [chain, color] of Object.entries(COLORS)) scene.setChainColor(chain, color);
    $("epitope-fallback").hidden = true;
    $("epitope-stage-status").hidden = true;
    stage.setAttribute("aria-busy", "false");
    $("epitope-other-fabs").disabled = false;
    $("epitope-reset").disabled = false;
    $("epitope-other-fabs").addEventListener("change", (event) => {
      for (const chain of OTHER_FABS) scene.setChainVisible(chain, event.target.checked);
    });
    $("epitope-reset").addEventListener("click", () => scene.resetView());
    lab.attachScene(scene);
    window.epitopeScene = scene;
  } catch {
    stage.dataset.state = "error";
    stage.setAttribute("aria-busy", "false");
    $("epitope-stage-status").textContent = "نمای سه‌بعدی در این مرورگر در دسترس نیست (WebGL). نمودار ثابت را می‌بینید؛ آزمایش‌های زیر بدون آن هم کار می‌کنند.";
  }
}

async function initialize() {
  const section = $("epitope-lab");
  section.dataset.state = "loading";
  $("epitope-lab-status").textContent = "در حال خواندن داده‌های تماس…";
  try {
    const [data, full] = await Promise.all([
      loadJSON("data/processed/epitope-lab.json"),
      loadJSON("data/processed/full-epitope.json"),
    ]);
    validate(data);
    const lab = new EpitopeLab(data, full.buried_surface);
    lab.start();
    section.dataset.state = "ready";
    $("epitope-lab-status").textContent =
      faNumber.format(data.pairs.length) + " جفت اتم تا ۶ Å از ساختار 3WD5 خوانده شد. داده و قواعد در فایل JSON بالای بخش آمده است.";
    await startScene(lab);
  } catch {
    section.dataset.state = "error";
    $("epitope-lab-status").textContent = "داده‌های آزمایش بارگذاری نشد. صفحه را دوباره بارگذاری کنید؛ نتایج ثابت در «روش و نتایج کامل» هست.";
  }
}

const section = $("epitope-lab");
if (section) {
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    initialize();
  }, { rootMargin: "300px 0px" });
  observer.observe(section);
}
