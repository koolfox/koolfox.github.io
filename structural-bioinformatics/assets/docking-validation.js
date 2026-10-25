/**
 * The redocking validation of 1B09, read from data/processed/docking-redock-1b09.json.
 * Three gates decide whether the docking run means anything: the pose is
 * reproduced, the pose sits in the same pocket, and the score separates the
 * true site from a wrong-site control. A gate that failed is shown as failed.
 */

const fa = (value, digits = 3) => new Intl.NumberFormat("fa-IR", { maximumFractionDigits: digits }).format(value);
const $ = (id) => document.getElementById(id);

const GATES = [
  {
    key: "pose_reproduced",
    label: "بازتولید pose",
    criterion: "RMSD pose اول نسبت به pose کریستال",
    value: (checks) => fa(checks.pose_reproduced.top_pose_rmsd_angstrom) + " Å",
  },
  {
    key: "site_reproduced",
    label: "بازتولید جایگاه",
    criterion: "فاصلهٔ فسفر تا نزدیک‌ترین یون کلسیم",
    value: (checks) =>
      fa(checks.site_reproduced.crystal_phosphorus_to_calcium_angstrom, 2) +
      " Å در کریستال، " +
      fa(checks.site_reproduced.top_pose_phosphorus_to_calcium_angstrom, 2) +
      " Å در pose برگشتی",
  },
  {
    key: "score_separates_sites",
    label: "جدا کردن جایگاه",
    criterion: "امتیاز جایگاه واقعی در برابر جایگاه کنترل",
    value: (checks) =>
      fa(checks.score_separates_sites.native_affinity_kcal_per_mole) +
      " kcal/mol در برابر " +
      fa(checks.score_separates_sites.control_affinity_kcal_per_mole) +
      " kcal/mol در کنترل",
  },
];

function cell(text) {
  const element = document.createElement("td");
  element.textContent = text;
  return element;
}

function render(record) {
  const body = $("docking-gates-body");
  if (!body) return;
  const checks = record.checks;
  const rows = GATES.map((gate) => {
    const row = document.createElement("tr");
    row.dataset.passed = String(checks[gate.key].passed);
    row.append(cell(gate.label), cell(gate.criterion), cell(gate.value(checks)));
    const verdict = document.createElement("td");
    verdict.textContent = checks[gate.key].passed ? "بله" : "خیر";
    row.append(verdict);
    return row;
  });
  const failed = GATES.filter((gate) => !checks[gate.key].passed).map((gate) => gate.label);
  $("docking-status").textContent = failed.length
    ? "دروازهٔ «" + failed.join("، ") + "» قبول نشد؛ نتیجهٔ منفی هم باید گزارش شود."
    : "هر سه دروازه قبول شد.";
  const summary = $("docking-summary");
  if (summary) {
    const spread = record.pose_distribution;
    summary.textContent =
      fa(spread.native_poses_within_2_angstrom, 0) +
      " pose از " +
      fa(spread.native_poses_written, 0) +
      " در حد ۲ آنگستروم pose کریستال هستند. امتیاز موتور تابع رتبه‌بندی است، نه انرژی آزاد اتصال.";
  }
  body.replaceChildren(...rows);
}

async function initialize() {
  const section = $("docking-validation");
  if (!section) return;
  try {
    const response = await fetch("data/processed/docking-redock-1b09.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("record unavailable");
    const record = await response.json();
    render(record);
    section.dataset.state = "ready";
  } catch {
    section.dataset.state = "error";
    $("docking-status").textContent =
      "رکورد داکینگ بارگذاری نشد؛ گزارش و فرمان‌ها از پیوند «پروتکل و فرمان‌ها» در همین صفحه در دسترس‌اند.";
  }
}

initialize();
