import { gradeQuiz, restoredRecord } from "./course-quiz.js";
const $ = (selector) => document.querySelector(selector);
const phases = ["lesson", "practice", "research", "presentation"];
const names = {new:"", read:"مطالعه کردم", practiced:"تمرین کردم", skipped:"رد کردم"};
let course, syllabus, active, quizBank, activeQuiz, revision = 0;
let quizRecords = {};
let quizReady = false;
try { quizRecords = JSON.parse(localStorage.getItem("tnf-course-quizzes-v1") || "{}"); if (!quizRecords || typeof quizRecords !== "object" || Array.isArray(quizRecords)) quizRecords = {}; } catch { quizRecords = {}; }
let progress = {};
let storageAvailable = true;
try { progress = JSON.parse(localStorage.getItem("tnf-course-progress-v1") || "{}"); if (!progress || typeof progress !== "object" || Array.isArray(progress)) progress = {}; } catch { storageAvailable = false; }
const url = (n, part="lesson") => `?topic=${n}&part=${part}`;
function state() {
  const params = new URLSearchParams(location.search);
  const n = Number(params.get("topic") ?? params.get("session") ?? 1);
  const invalid = !Number.isInteger(n) || n < 1 || n > course.sessions.length || (params.has("part") && !phases.includes(params.get("part")));
  return {n: invalid ? 1 : n, part:invalid ? "lesson" : params.get("part") || "lesson", invalid};
}
function drawContents(n) {
  const nav = $("#sessions"); nav.replaceChildren();
  for (const [index,block] of syllabus.blocks.entries()) {
    const topics = course.sessions.filter(s => s.block === block.id);
    const group = document.createElement("details");
    group.open = topics.some(s => s.session === n);
    const heading = document.createElement("summary");
    heading.textContent = `فصل ${(index+1).toLocaleString("fa-IR")}: ${block.title}`;
    group.append(heading);
    for (const [topicIndex,session] of topics.entries()) {
      const link = document.createElement("a"); link.href = url(session.session);
      link.textContent = `${(topicIndex+1).toLocaleString("fa-IR")}. ${session.title}`;
      if (session.session === n) link.setAttribute("aria-current", "page");
      const note = document.createElement("span"); note.className = "state";
      note.textContent = names[progress[session.session]] || "";
      link.append(note); group.append(link);
    }
    nav.append(group);
  }
}
async function getJSON(path) { const r = await fetch(path); if (!r.ok) throw Error("HTTP " + r.status); return r.json(); }
async function render(focus=false) {
  const ticket = ++revision;
  $("#status").textContent = "در حال بارگذاری…"; $("#retry").hidden = true;
  $("#check").hidden = true; $("#study-state").hidden = true; $("#lesson").replaceChildren();
  try {
    if (!course) {
      [course, syllabus] = await Promise.all([getJSON("data/metadata/learning-course.json"), getJSON("data/metadata/course-syllabus.json")]);
    }
    if (ticket !== revision) return;
    const {n,part,invalid} = state(); active = course.sessions[n-1]; drawContents(n);
    $("#position").textContent = `فصل ${(syllabus.blocks.findIndex(b => b.id === active.block)+1).toLocaleString("fa-IR")} از ${syllabus.blocks.length.toLocaleString("fa-IR")} · مبحث ${(course.sessions.filter(s => s.block === active.block).findIndex(s => s.session === n)+1).toLocaleString("fa-IR")}`;
    $("#session-title").textContent = active.title;
    document.title = active.title + " | بیوانفورماتیک ساختاری";
    const pre = $("#prerequisites"); pre.replaceChildren(document.createTextNode(n === 1 ? "از پایه شروع می‌کنیم؛ پیش‌نیاز زیستی لازم نیست." : "پیشنهاد پیش از این جلسه: "));
    for (const p of active.prerequisites) { const link = document.createElement("a"); link.href=url(p); link.textContent=course.sessions[p-1].title; pre.append(link); }
    document.querySelectorAll("#parts a").forEach(a => { a.href = url(n,a.dataset.part); if(a.dataset.part === part) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current"); });
    const response = await fetch(active.path); if (!response.ok) throw Error("درس دریافت نشد");
    const text = await response.text(); if (ticket !== revision) return;
    const sections = text.split(/<!-- course:(lesson|practice|research|presentation) -->/);
    const i = sections.indexOf(part); if (i < 0 || !window.markdownit) throw Error("درس یا نمایشگر آماده نیست");
    const md = window.markdownit({html:false,linkify:false});
    $("#lesson").innerHTML = md.render(sections[i+1]);
    // Markdown paths are relative to the lesson file, not this HTML surface.
    $("#lesson").querySelectorAll("a[href],img[src]").forEach(el => {
      const attr = el.tagName === "IMG" ? "src" : "href";
      const resolved = new URL(el.getAttribute(attr),new URL(active.path,location.href));
      if (!["http:","https:"].includes(resolved.protocol)) { el.removeAttribute(attr); return; }
      if (attr === "href" && resolved.origin === location.origin && /\/docs\/[^/]+\.fa\.md$/.test(resolved.pathname)) {
        const reader = new URL("index.html", location.href);
        reader.searchParams.set("document", resolved.pathname.split("/").pop()); reader.hash="reading";
        el.setAttribute(attr,reader.href);
      } else el.setAttribute(attr,resolved.href);
    });
    $("#status").textContent = invalid ? "نشانی مبحث معتبر نبود؛ مبحث اول نمایش داده شد." : "";
    $("#check").hidden = part !== "presentation";
    $("#study-state").hidden = false; $("#progress").value = names[progress[n]] ? progress[n] : "new";
    storageNote();
    if (part === "presentation") await renderQuiz(n,ticket);
    if (ticket !== revision) return;
    for (const [id,target] of [["previous",n-1],["next",n+1]]) { const link=$("#"+id); link.hidden=target<1||target>course.sessions.length; link.href=url(target); }
    if (focus) { $("#lesson").focus({preventScroll:true}); $("#session-title").scrollIntoView({block:"start"}); }
  } catch {
    if (ticket !== revision) return;
    $("#status").textContent = "بارگذاری کامل نشد. اتصال یا فایل‌های محلی را بررسی کنید و دوباره تلاش کنید.";
    $("#retry").hidden = false;
  }
}
document.addEventListener("click",event => {
  const link=event.target.closest("a[href]"); if(!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
  const destination = new URL(link.href);
  if(destination.origin !== location.origin || destination.pathname !== location.pathname || (!destination.searchParams.has("topic") && !destination.searchParams.has("session"))) return;
  event.preventDefault(); history.pushState(null,"",destination); render(true);
});
$("#progress").addEventListener("change",() => {
  const n=state().n; progress[n]=$("#progress").value;
  try { localStorage.setItem("tnf-course-progress-v1",JSON.stringify(progress)); } catch { storageAvailable=false; }
  storageNote(); drawContents(n);
});
function storageNote() {
  $("#storage-note").textContent = storageAvailable
    ? "وضعیت مطالعه، پاسخ آزمون و یادداشت در همین مرورگر ذخیره می‌شوند؛ به سرور ارسال نمی‌شوند."
    : "ذخیره‌سازی در دسترس نیست یا ممکن نشد؛ داده‌ها فقط تا بستن این صفحه می‌مانند.";
}
function saveQuizzes() {
  try { localStorage.setItem("tnf-course-quizzes-v1",JSON.stringify(quizRecords)); }
  catch { storageAvailable=false; }
  storageNote();
}
function recordFor(n) {
  return quizRecords[n] = restoredRecord(quizRecords[n],activeQuiz);
}
function showResult(record) {
  const feedback=$("#quiz-feedback");
  const last=record.attempts.at(-1);
  if (last && last.choice === record.choice) {
    const result=gradeQuiz(activeQuiz,last.choice);
    feedback.textContent=(result.correct ? "پاسخ درست است. " : "این گزینه درست نیست. ")+result.explanation;
    feedback.dataset.result=result.correct ? "correct" : "incorrect";
  } else {
    feedback.textContent=last ? "گزینه تغییر کرده است؛ برای دیدن نتیجه دوباره پاسخ را بررسی کنید." : "یک گزینه انتخاب کنید و پاسخ را بررسی کنید.";
    delete feedback.dataset.result;
  }
  $("#quiz-history").textContent=record.attempts.length
    ? `بررسی‌های ذخیره‌شدهٔ این پرسش: ${record.attempts.length.toLocaleString("fa-IR")} (حداکثر ۲۰ تلاش اخیر)` : "هنوز پاسخی بررسی نشده است.";
}
async function renderQuiz(n,ticket) {
  quizReady=false; activeQuiz=null;
  $("#own-answer").value=""; delete $("#quiz-feedback").dataset.result;
  $("#quiz-form").hidden=true; $("#quiz-retry").hidden=true;
  $("#own-answer").disabled=true; $("#clear-answer").disabled=true;
  $("#quiz-feedback").textContent="در حال بارگذاری آزمون…";
  $("#quiz-history").textContent="";
  try {
    if (!quizBank) quizBank=await getJSON("data/metadata/course-quizzes.json");
    if (ticket !== revision) return;
    activeQuiz=quizBank.quizzes.find(q => q.topic === n);
    if (!activeQuiz) throw Error("Missing quiz");
    const record=recordFor(n);
    $("#quiz-question").textContent=activeQuiz.question;
    const options=$("#quiz-options"); options.replaceChildren();
    activeQuiz.options.forEach((text,index) => {
      const label=document.createElement("label");
      const radio=document.createElement("input"); radio.type="radio"; radio.name="choice"; radio.value=String(index); radio.checked=record.choice === index;
      label.append(radio,document.createTextNode(text)); options.append(label);
    });
    $("#quiz-form").hidden=false; $("#own-answer").disabled=false; $("#clear-answer").disabled=false;
    $("#own-answer").value=record.notes;
    quizReady=true; showResult(record);
  } catch {
    if (ticket !== revision) return;
    $("#quiz-feedback").textContent="آزمون دریافت نشد؛ متن مبحث همچنان قابل مطالعه است.";
    $("#quiz-retry").hidden=false;
  }
}
$("#quiz-form").addEventListener("change",event => {
  if (!quizReady || event.target.name !== "choice") return;
  const record=recordFor(state().n); record.choice=Number(event.target.value); saveQuizzes(); showResult(record);
});
$("#quiz-form").addEventListener("submit",event => {
  event.preventDefault(); if (!quizReady) return;
  const record=recordFor(state().n);
  if (record.choice === null) { $("#quiz-feedback").textContent="ابتدا یکی از گزینه‌ها را انتخاب کنید."; return; }
  gradeQuiz(activeQuiz,record.choice);
  record.attempts.push({choice:record.choice,at:new Date().toISOString()});
  record.attempts=record.attempts.slice(-20); saveQuizzes(); showResult(record);
});
$("#own-answer").addEventListener("input",() => {
  if (!quizReady) return;
  recordFor(state().n).notes=$("#own-answer").value; saveQuizzes();
});
$("#clear-answer").addEventListener("click",() => {
  if (!quizReady) return;
  delete quizRecords[state().n]; saveQuizzes(); renderQuiz(state().n,revision);
});
$("#quiz-retry").addEventListener("click",()=>renderQuiz(state().n,revision));
$("#retry").addEventListener("click",()=>render());
window.addEventListener("popstate",()=>render(true));
if(matchMedia("(max-width:850px)").matches) $("#contents").open=false;
render();
