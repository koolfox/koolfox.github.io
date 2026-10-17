/**
 * Week-by-week class plan on the first tab. Reads data/metadata/weekly-plan.json, the same
 * source as docs/weekly-plan.fa.md and the per-week slide filter (presentation.html?week=N).
 * The chosen week is remembered per browser only as a convenience.
 */

const fa = (value) => new Intl.NumberFormat("fa-IR").format(value);
const $ = (id) => document.getElementById(id);
const storageKey = "tnf-weekly-plan-week-v1";

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function link(text, href) {
  const anchor = node("a", text);
  anchor.href = href;
  return anchor;
}

function readerHref(item) {
  return "?document=" + encodeURIComponent(item.document) + "&chapter=" + encodeURIComponent(item.chapter) + "#reading";
}

function remembered() {
  try { return localStorage.getItem(storageKey); } catch { return null; }
}

function remember(week) {
  try { localStorage.setItem(storageKey, String(week)); } catch { /* storage unavailable */ }
}

function renderWeek(plan, titles, week) {
  const card = $("week-card");
  const total = plan.weeks.length;
  card.dataset.week = String(week.week);
  const heading = node("h3", "هفتهٔ " + fa(week.week) + " از " + fa(total) + ": " + week.title);
  const question = node("p", "", "week-question");
  question.append(node("strong", "پرسش این هفته: "), week.question);

  const slides = node("div", "", "week-block");
  slides.append(node("h4", "۱. ارائهٔ این هفته"));
  const list = node("ul");
  for (const chapter of week.chapters) {
    list.append(node("li", "اسلاید " + fa(chapter + 1) + ": " + (titles[chapter - 1] || "")));
  }
  const open = link("باز کردن فقط اسلایدهای هفتهٔ " + fa(week.week), "presentation.html?week=" + week.week + "#slide-1");
  open.className = "week-primary";
  open.id = "week-slides-link";
  slides.append(list, open);

  const reading = node("div", "", "week-block");
  reading.append(node("h4", "۲. پیش از کلاس بخوانید"));
  const readingList = node("ul");
  for (const item of week.reading) {
    const entry = node("li");
    entry.append(link(item.label, readerHref(item)));
    readingList.append(entry);
  }
  reading.append(readingList);

  const experiment = node("div", "", "week-block");
  experiment.append(node("h4", "۳. خرده‌آزمایش"));
  const run = link(week.experiment.label, week.experiment.href);
  run.id = "week-experiment-link";
  const expect = node("p", "", "week-expect");
  expect.append(node("strong", "آنچه باید ببینید: "), week.experiment.expect);
  const runLine = node("p");
  runLine.append(run);
  experiment.append(runLine, expect);

  const deliverable = node("div", "", "week-block");
  deliverable.append(node("h4", "۴. تحویلی این هفته"), node("p", week.deliverable));

  const navigation = node("p", "", "week-nav");
  navigation.append(link("شرح کامل این هفته در کتابچه", readerHref({ document: plan.document, chapter: "chapter-" + week.week })));
  card.replaceChildren(heading, question, slides, reading, experiment, deliverable, navigation);
}

function select(plan, titles, number, store = true) {
  const week = plan.weeks.find((entry) => entry.week === number) || plan.weeks[0];
  for (const button of $("week-buttons").querySelectorAll("button")) {
    const active = Number(button.dataset.week) === week.week;
    button.setAttribute("aria-pressed", String(active));
    button.dataset.state = week.week > Number(button.dataset.week) ? "done" : active ? "current" : "later";
  }
  renderWeek(plan, titles, week);
  if (store) remember(week.week);
}

async function initialize() {
  const section = $("weekly-plan");
  if (!section) return;
  try {
    const [planResponse, deckResponse] = await Promise.all([
      fetch("data/metadata/weekly-plan.json", { cache: "no-cache" }),
      fetch("docs/class-presentation.fa.md"),
    ]);
    if (!planResponse.ok) throw new Error("plan unavailable");
    const plan = await planResponse.json();
    if (plan.version !== 1 || !Array.isArray(plan.weeks) || !plan.weeks.length) throw new Error("Unexpected plan");
    const titles = deckResponse.ok
      ? (await deckResponse.text()).split("\n").filter((line) => line.startsWith("## ")).map((line) => line.slice(3).replace(/^[\d۰-۹]+\.\s*/, ""))
      : [];
    const buttons = $("week-buttons");
    for (const week of plan.weeks) {
      const button = node("button", "هفتهٔ " + fa(week.week));
      button.type = "button";
      button.dataset.week = String(week.week);
      button.title = week.title;
      button.addEventListener("click", () => select(plan, titles, week.week));
      buttons.append(button);
    }
    const fromURL = Number(new URLSearchParams(location.search).get("week"));
    const fromStorage = Number(remembered());
    select(plan, titles, fromURL || fromStorage || 1, Boolean(fromURL));
    section.dataset.state = "ready";
    $("weekly-status").textContent = "هفته‌های قبل با رنگ کم‌رنگ‌تر علامت خورده‌اند. انتخاب شما فقط در همین مرورگر ذخیره می‌شود.";
  } catch {
    section.dataset.state = "error";
    $("weekly-status").textContent = "برنامهٔ هفتگی بارگذاری نشد. همان برنامه را در «همهٔ هفته‌ها در یک صفحه» بخوانید.";
  }
}

initialize();
