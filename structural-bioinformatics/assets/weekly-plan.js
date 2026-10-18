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

function block(number, heading) {
  const wrapper = node("div", "", "week-block");
  wrapper.append(node("h4", number + ". " + heading));
  return wrapper;
}

function list(items, render) {
  const element = node("ul");
  for (const item of items) element.append(render(item));
  return element;
}

function paperBlock(papers) {
  const wrapper = block("۳", "مقالهٔ این هفته");
  if (!papers.length) {
    wrapper.append(node("p", "این هفته مقالهٔ تازه‌ای معرفی نمی‌شود؛ تمرکز روی کمیت‌های اندازه‌گیری و تحلیل اجراشدهٔ خودمان است."));
    return wrapper;
  }
  for (const paper of papers) {
    const heading = node("p", "", "week-paper-title");
    heading.append(node("strong", paper.label + " — " + paper.focus));
    const rows = [
      ["پرسش مقاله", paper.question],
      ["روش", paper.method],
      ["نتیجهٔ خودِ مقاله", paper.result],
      ["محدودیت", paper.limit],
      ["چرا ما به آن نیاز داریم", paper.our_use],
    ];
    wrapper.append(heading, list(rows, ([label, value]) => {
      const entry = node("li");
      entry.append(node("strong", label + ": "), value);
      return entry;
    }));
  }
  return wrapper;
}

function questionBlock(questions) {
  const wrapper = block("۷", "پرسش‌هایی که احتمالاً می‌پرسند");
  for (const item of questions) {
    const entry = node("div", "", "week-qa");
    const question = node("p");
    question.append(node("strong", "پرسش: "), item.q);
    const answer = node("p");
    answer.append(node("strong", "پاسخ کوتاه: "), item.a);
    entry.append(question, answer);
    wrapper.append(entry);
  }
  return wrapper;
}

function renderWeek(plan, titles, week) {
  const card = $("week-card");
  const total = plan.weeks.length;
  card.dataset.week = String(week.week);
  const heading = node("h3", "هفتهٔ " + fa(week.week) + " از " + fa(total) + ": " + week.title);
  const question = node("p", "", "week-question");
  question.append(node("strong", "پرسش این هفته: "), week.question);

  const course = node("p", "", "week-course");
  course.id = "week-course";
  course.append(node("strong", "جای این هفته در درس: "), "بخش «" + week.course.block_title + "»، " + week.course.sessions + ". " + week.course.uses);
  if (week.course.ahead) {
    const ahead = node("p", "", "week-ahead");
    ahead.append(node("strong", "جلوتر از کلاس: "), week.course.ahead);
    course.append(ahead);
  }

  const slides = block("۱", "ارائهٔ این هفته");
  slides.append(list(week.chapters, (chapter) => node("li", "اسلاید " + fa(chapter + 1) + ": " + (titles[chapter - 1] || ""))));
  const open = link("باز کردن فقط اسلایدهای هفتهٔ " + fa(week.week), "presentation.html?week=" + week.week + "#slide-1");
  open.className = "week-primary";
  open.id = "week-slides-link";
  slides.append(open);

  const reading = block("۲", "پیش از کلاس بخوانید");
  reading.append(list(week.reading, (item) => {
    const entry = node("li");
    entry.append(link(item.label, readerHref(item)));
    return entry;
  }));

  const concepts = block("۴", "واژه‌های کلاسی که این هفته به کار می‌بریم");
  concepts.append(list(week.concepts, (concept) => {
    const entry = node("li");
    entry.append(node("strong", concept.term + ": "), concept.meaning);
    return entry;
  }));

  const talk = block("۵", "ترتیب گفتن مطلب در کلاس");
  const beats = node("ol");
  for (const beat of week.talk) beats.append(node("li", beat));
  talk.append(beats);

  const experiment = block("۶", "خرده‌آزمایش");
  const run = link(week.experiment.label, week.experiment.href);
  run.id = "week-experiment-link";
  const expect = node("p", "", "week-expect");
  expect.append(node("strong", "آنچه باید ببینید: "), week.experiment.expect);
  const runLine = node("p");
  runLine.append(run);
  experiment.append(runLine, expect);
  if (week.experiment.ahead_note) {
    const ahead = node("p", "", "week-expect");
    ahead.append(node("strong", "همان کار با ابزار کلاس: "), week.experiment.ahead_note);
    experiment.append(ahead);
  }

  const deliverable = block("۸", "تحویلی ارائه");
  deliverable.append(node("p", week.deliverable));

  const paper = node("div", "", "week-block week-paper");
  paper.id = "week-paper";
  const sectionLink = link(week.manuscript.section, readerHref(week.manuscript));
  sectionLink.id = "week-paper-link";
  const paperTitle = node("h4", "۹. گام مقاله: ");
  paperTitle.append(sectionLink);
  const paperList = node("ul");
  paperList.append(node("li", "خروجی: " + week.manuscript.output), node("li", "وقتی تمام است که: " + week.manuscript.done_when));
  paper.append(paperTitle, node("p", week.manuscript.task), paperList);

  const navigation = node("p", "", "week-nav");
  navigation.append(link("شرح کامل این هفته در کتابچه", readerHref({ document: plan.document, chapter: "chapter-" + week.week })));
  if (plan.appendix) {
    const appendix = link(plan.appendix.title, readerHref({ document: plan.document, chapter: "chapter-" + (plan.weeks.length + 1) }));
    appendix.id = "week-appendix-link";
    navigation.append(appendix);
  }
  card.replaceChildren(heading, question, course, slides, reading, paperBlock(week.papers), concepts, talk, experiment, questionBlock(week.expect_questions), deliverable, paper, navigation);
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
    const goal = $("weekly-goal");
    if (goal && plan.paper_goal) {
      const manuscript = link("پیش‌نویس مقاله", readerHref({ document: plan.paper_goal.document, chapter: "intro" }));
      goal.replaceChildren(node("strong", "مقصد هفتهٔ " + fa(plan.weeks.length) + ": "), plan.paper_goal.title + ". ", plan.paper_goal.claim + " ", manuscript);
    }
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
