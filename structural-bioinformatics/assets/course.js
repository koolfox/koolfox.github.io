const $ = (selector) => document.querySelector(selector);
const phases = ["lesson", "practice", "research", "presentation"];
const names = {new:"", read:"مطالعه کردم", practiced:"تمرین کردم", skipped:"رد کردم"};
let course, syllabus, active, revision = 0;
let progress = {};
let storageAvailable = true;
try { progress = JSON.parse(localStorage.getItem("tnf-course-progress-v1") || "{}"); if (!progress || typeof progress !== "object" || Array.isArray(progress)) progress = {}; } catch { storageAvailable = false; }
const url = (n, part="lesson") => `?session=${n}&part=${part}`;
function state() {
  const params = new URLSearchParams(location.search);
  const n = Number(params.get("session") || 1);
  const invalid = !Number.isInteger(n) || n < 1 || n > 30 || (params.has("part") && !phases.includes(params.get("part")));
  return {n: invalid ? 1 : n, part:invalid ? "lesson" : params.get("part") || "lesson", invalid};
}
function drawContents(n) {
  const nav = $("#sessions"); nav.replaceChildren();
  for (const block of syllabus.blocks) {
    const heading = document.createElement("h3"); heading.textContent = block.title; nav.append(heading);
    for (const session of course.sessions.filter(s => s.block === block.id)) {
      const link = document.createElement("a"); link.href = url(session.session);
      link.textContent = `${session.session.toLocaleString("fa-IR")}. ${session.title}`;
      if (session.session === n) link.setAttribute("aria-current", "page");
      const note = document.createElement("span"); note.className = "state"; note.textContent = names[progress[session.session]] || ""; link.append(note); nav.append(link);
    }
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
    $("#position").textContent = `جلسهٔ ${n.toLocaleString("fa-IR")} از ۳۰ · ${syllabus.blocks.find(b => b.id === active.block).title}`;
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
    $("#status").textContent = invalid ? "نشانی جلسه معتبر نبود؛ جلسهٔ اول نمایش داده شد." : "";
    $("#check").hidden = part !== "presentation";
    $("#check-question").textContent = active.check.question;
    $("#check-answer").textContent = active.check.answer;
    $("#own-answer").value = "";
    $("#check details").open = false;
    $("#study-state").hidden = false; $("#progress").value = names[progress[n]] ? progress[n] : "new";
    $("#storage-note").textContent = storageAvailable ? "فقط وضعیت در همین مرورگر نگه داشته می‌شود؛ پاسخ نوشتاری ذخیره نمی‌شود." : "ذخیره‌سازی در دسترس نیست؛ وضعیت فقط تا بستن صفحه حفظ می‌شود.";
    for (const [id,target] of [["previous",n-1],["next",n+1]]) { const link=$("#"+id); link.hidden=target<1||target>30; link.href=url(target); }
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
  if(destination.origin !== location.origin || destination.pathname !== location.pathname || !destination.searchParams.has("session")) return;
  event.preventDefault(); history.pushState(null,"",destination); render(true);
});
$("#progress").addEventListener("change",() => { const n=state().n; progress[n]=$("#progress").value; try { localStorage.setItem("tnf-course-progress-v1",JSON.stringify(progress)); } catch { storageAvailable=false; $("#storage-note").textContent="ذخیره‌سازی ممکن نشد؛ وضعیت فقط در این صفحه می‌ماند."; } drawContents(n); });
$("#retry").addEventListener("click",()=>render());
window.addEventListener("popstate",()=>render(true));
if(matchMedia("(max-width:850px)").matches) $("#contents").open=false;
render();
