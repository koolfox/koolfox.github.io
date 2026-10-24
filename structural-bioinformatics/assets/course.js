import { gradeQuiz, restoredRecord } from "./course-quiz.js";
const $ = (selector) => document.querySelector(selector);
const phases = ["lesson", "research", "presentation"];
const names = {new:"", read:"مطالعه کردم", practiced:"تمرین کردم", skipped:"رد کردم"};
let course, syllabus, active, quizBank, activeQuiz, revision = 0;
let quizRecords = {};
let quizReady = false;
try { quizRecords = JSON.parse(localStorage.getItem("tnf-course-quizzes-v1") || "{}"); if (!quizRecords || typeof quizRecords !== "object" || Array.isArray(quizRecords)) quizRecords = {}; } catch { quizRecords = {}; }
let progress = {};
let storageAvailable = true;
try { progress = JSON.parse(localStorage.getItem("tnf-course-progress-v1") || "{}"); if (!progress || typeof progress !== "object" || Array.isArray(progress)) progress = {}; } catch { storageAvailable = false; }

let courseMap, reader, toolModule, researchThread;
const phaseNames={lesson:"درس",research:"پژوهش",presentation:"ارائه"};
const canonical = (unit,topic,part="lesson",extra={}) => {
  const params=new URLSearchParams({unit:String(unit),topic:String(topic),part,...extra});
  return "?"+params;
};
const ownerOfTopic = n => courseMap.chapters.find(c=>c.block===course.sessions[n-1]?.block);
const firstTopic = unit => course.sessions.find(s=>s.block===unit.block).session;
function url(n,part="lesson") { return canonical(ownerOfTopic(n).unit,n,part); }
function ownerOfDocument(name,current=null) {
  return (current?.documents.includes(name) ? current : null) || courseMap.chapters.find(c=>c.documents.includes(name));
}
function state() {
  const params=new URLSearchParams(location.search);
  const requestedTopic=params.get("topic") ?? params.get("session");
  let n=Number(requestedTopic ?? 1), part=params.get("part") || "lesson";
  if(part==="practice")part="research";
  let unit=courseMap.chapters.find(c=>c.unit===Number(params.get("unit")));
  let tool=params.get("tool");
  let document=params.get("document");
  let chapter=params.get("chapter");
  const hash=decodeURIComponent(location.hash.slice(1));
  if (!document && ["reading","weekly-plan","study-path","lesson-guide"].includes(hash)) document="course-guide.fa.md";
  if (!tool && !document) tool=courseMap.legacy_tools[hash] || courseMap.legacy_tools[params.get("tab")];
  if (document === "class-presentation.fa.md") {
    const slideNumber=Number(chapter?.replace("chapter-",""));
    const slideOwner=courseMap.chapters.find(c=>[...c.slides,...c.supplementary_slides].includes(slideNumber));
    unit=unit || slideOwner; chapter="chapter-"+(unit?.unit || 1);
  }
  if (courseMap.document_aliases[document]) {
    if (courseMap.document_aliases[document] === "@chapter") {
      unit=unit || courseMap.chapters.find(c=>c.unit===Number(chapter?.replace("chapter-","")));
      document=null; part="lesson";
    } else document=courseMap.document_aliases[document];
  }
  if (document) {
    unit=ownerOfDocument(document,unit);
    if (unit) part="research"; else document=null;
  }
  if (tool) {
    const entry=courseMap.tools.find(t=>t.id===tool);
    if (entry) { unit=courseMap.chapters.find(c=>c.unit===entry.unit); part="research"; }
    else tool=null;
  }
  let invalid=false;
  if (requestedTopic !== null && (!Number.isInteger(n)||!ownerOfTopic(n))) invalid=true;
  if (!phases.includes(part)) invalid=true;
  if (invalid) {n=1;unit=courseMap.chapters[0];part="lesson";tool=null;document=null;chapter=null;}
  else if (unit && (!requestedTopic || ownerOfTopic(n)?.unit !== unit.unit)) n=firstTopic(unit);
  else unit=ownerOfTopic(n);
  return {n,part,unit,tool,document,chapter,invalid};
}
function drawContents(n) {
  const nav=$("#sessions");nav.replaceChildren();
  for(const unit of courseMap.chapters) {
    const group=document.createElement("details"); group.open=ownerOfTopic(n).unit===unit.unit;
    const heading=document.createElement("summary");heading.textContent=`فصل ${unit.unit.toLocaleString("fa-IR")}: ${unit.title}`;group.append(heading);
    const topics=course.sessions.filter(s=>s.block===unit.block);
    for (const [i,topic] of topics.entries()) {
      const a=document.createElement("a");a.href=url(topic.session);a.textContent=`${(i+1).toLocaleString("fa-IR")}. ${topic.title}`;
      if(topic.session===n)a.setAttribute("aria-current","page");
      const note=document.createElement("span");note.className="state";note.textContent=names[progress[topic.session]]||"";a.append(note);group.append(a);
    }
    const shortcuts=document.createElement("div");shortcuts.className="chapter-shortcuts";
    for(const part of ["research","presentation"]) {
      const a=document.createElement("a");a.href=canonical(unit.unit,firstTopic(unit),part);a.textContent=phaseNames[part]+" این فصل";shortcuts.append(a);
    }
    group.append(shortcuts);nav.append(group);
  }
}
async function getJSON(path) {const r=await fetch(path,{cache:"no-cache"});if(!r.ok)throw Error("HTTP "+r.status);return r.json();}
function documentURL(name,chapter=null,current=null) {
  name=courseMap.document_aliases[name] || name;
  if(name==="@chapter")return url(firstTopic(current||courseMap.chapters[0]));
  const unit=ownerOfDocument(name,current);
  if(!unit)return null;
  return canonical(unit.unit,ownerOfTopic(active?.session)?.unit===unit.unit?active.session:firstTopic(unit),"research",{document:name,...(chapter?{chapter}:{})});
}
function link(label,href) {const a=document.createElement("a");a.textContent=label;a.href=href;return a;}
function documentName(filename) {
  return filename.replace(/\.fa\.md$|\.md$/g,"").replaceAll("-"," ");
}
async function renderResources(ctx,ticket) {
  const {unit,n,part}=ctx;
  const step=researchThread.steps.find(s=>s.topic===n);
  const nav=$("#resource-links");nav.replaceChildren();$("#resource-status").textContent="";
  $("#resources-title").textContent=part==="research"?"منابع و ابزارها":"اسلایدها و یادداشت ارائه";
  if(part==="lesson") {$("#chapter-resources").hidden=true;return;}
  $("#chapter-resources").hidden=false;
  if(part==="research") {
    if(step.tool) {
      const tool=courseMap.tools.find(t=>t.id===step.tool);
      nav.append(link(tool.title,canonical(unit.unit,n,"research",{tool:tool.id})));
    }
    for(const name of step.documents)nav.append(link(courseMap.document_titles[name]||documentName(name),documentURL(name,unit.document_sections?.[name]||null,unit)));
    const extras=document.createElement("details");extras.className="step-extra-resources";
    const summary=document.createElement("summary");summary.textContent="مطالعهٔ بیشتر";extras.append(summary);
    for(const id of unit.tools.filter(id=>id!==step.tool)) {
      const tool=courseMap.tools.find(t=>t.id===id);extras.append(link(tool.title,canonical(unit.unit,n,"research",{tool:id})));
    }
    for(const name of unit.documents.filter(name=>!step.documents.includes(name)))extras.append(link(courseMap.document_titles[name]||documentName(name),documentURL(name,unit.document_sections?.[name]||null,unit)));
    nav.append(extras);
    const selected=window.researchWorkspace?ctx.tool:(ctx.tool || (!ctx.document?step.tool:null));
    if(window.researchWorkspace){
      if(selected)window.researchWorkspace.openTool(selected);
      else if(ctx.document)await window.researchWorkspace.openDocument(ctx.document,ctx.chapter||"intro");
      return;
    }
    if(selected) {
      $("#chapter-tools").hidden=false;const group=$("#tool-"+selected);group.hidden=false;
      if(selected==="datasets")group.querySelectorAll("details").forEach(d=>d.open=true);
      $("#resource-status").textContent="در حال بارگذاری ابزار…";
      try {
        if(!toolModule)toolModule=await import("./app.js?v=20261024-unified");
        if(ticket!==revision)return;await toolModule.activateTool(selected);
        if(ticket===revision)$("#resource-status").textContent="";
      }catch{if(ticket===revision)$("#resource-status").textContent="ابزار آماده نشد؛ دستورکار و نتیجهٔ ثبت‌شده را بخوانید و اجرای ناموفق خود را ثبت کنید.";}
    }
    if(ctx.document) {
      $("#panel-reading").hidden=false;
      try {
        if(!reader) {const module=await import("./markdown-reader.js?v=20261024-unified");if(ticket!==revision)return;reader=module.createMarkdownReader({chapterScope:name=>name==="chapter-presentation.fa.md"?"chapter-"+state().unit.unit:null});}
        reader.filterDocuments(unit.documents);await reader.open(ctx.document,ctx.chapter||"intro");if(ticket===revision)reader.filterDocuments(unit.documents);
      }catch{if(ticket===revision)$("#resource-status").textContent="متن دریافت نشد؛ دوباره آن را انتخاب کنید. توضیح قدم پژوهش همچنان در صفحه هست.";}
    }
  } else {
    nav.append(link("اسلایدهای این مبحث",`presentation.html?unit=${unit.unit}&topic=${n}#slide-1`));
    nav.append(link("اسلایدهای فصل",`presentation.html?unit=${unit.unit}#slide-1`),link("متن ارائهٔ فصل",documentURL("chapter-presentation.fa.md","chapter-"+unit.unit,unit)));
  }
}
function showThread(step,part) {
  $("#step-thread").hidden=part!=="lesson";
  $("#main-research-question").textContent=researchThread.question;
  $("#plain-research-question").textContent=researchThread.plain_question;
  $("#step-before").textContent=step.previous_gain;$("#step-before").hidden=true;
  $("#step-question").textContent=step.question;
  $("#step-output").textContent=step.output;$("#step-output").hidden=true;
  $("#foundations").hidden=part!=="lesson";
  if($("#foundations").dataset.topic!==String(step.topic)){$("#foundations").open=true;$("#foundations").dataset.topic=String(step.topic);}
  const terms=$("#topic-terms");terms.replaceChildren();
  for(const item of step.terms) {
    const dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=item.term;dd.textContent=item.meaning;terms.append(dt,dd);
  }
  $("#topic-example").textContent=step.example;
  $("#research-outcome").hidden=part!=="research";
  $("#evidence-status").textContent=researchThread.status_labels[step.evidence_status];
  $("#research-result").textContent=step.result;
  $("#research-deliverable").textContent="گزارش تمرین: "+step.output;
  $("#next-research-step").textContent=step.next_step;
}

async function waitForWorkspace() {
  if(!$("#research-tabs")||window.researchWorkspace)return;
  await new Promise((resolve,reject)=>{
    const ready=()=>{clearTimeout(timer);resolve();};
    const timer=setTimeout(()=>{document.removeEventListener("research-workspace-ready",ready);reject(Error("Workspace unavailable"));},15000);
    document.addEventListener("research-workspace-ready",ready,{once:true});
  });
}

async function render(focus=false) {
  const ticket=++revision;quizReady=false;
  toolModule?.pauseTools();
  $("#status").textContent="در حال بارگذاری…";$("#retry").hidden=true;
  $("#check").hidden=true;$("#study-state").hidden=true;$("#chapter-resources").hidden=true;
  $("#chapter-tools").hidden=true;if(!window.researchWorkspace)$("#panel-reading").hidden=true;
  if(!window.researchWorkspace)document.querySelectorAll('[data-course-tool]').forEach(el=>el.hidden=true);
  $("#lesson").replaceChildren();
  try {
    await waitForWorkspace();
    if(ticket!==revision)return;
    if(!course || !courseMap || !researchThread) [course,syllabus,courseMap,researchThread]=await Promise.all([getJSON("data/metadata/learning-course.json"),getJSON("data/metadata/course-syllabus.json"),getJSON("data/metadata/course-map.json"),getJSON("data/metadata/research-thread.json")]);
    if(ticket!==revision)return;
    const ctx=state(); const {n,part,unit,invalid}=ctx;active=course.sessions[n-1];drawContents(n);
    const extras={...(ctx.tool?{tool:ctx.tool}:{}),...(ctx.document?{document:ctx.document}:{}),...(ctx.chapter&&ctx.document?{chapter:ctx.chapter}:{})};
    history.replaceState(null,"",canonical(unit.unit,n,part,extras));
    $("#position").textContent=`فصل ${unit.unit.toLocaleString("fa-IR")} از ۹ · ${unit.title}`;
    $("#workspace-lesson").href=url(n,part);
    $("#session-title").textContent=active.title;document.title=active.title+" | بیوانفورماتیک ساختاری";
    const pre=$("#prerequisites");pre.replaceChildren(document.createTextNode(n===1?"مفاهیم از پایه توضیح داده می‌شوند.":"پیشنهاد پیش‌نیاز: "));
    for(const id of active.prerequisites)pre.append(link(course.sessions[id-1].title,url(id)));
    document.querySelectorAll("#parts a").forEach(a=>{a.href=url(n,a.dataset.part);if(a.dataset.part===part)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");});
    const response=await fetch(active.path,{cache:"no-cache"});if(!response.ok)throw Error("Missing topic");
    const text=await response.text();if(ticket!==revision)return;
    const sections=text.split(/<!-- course:(lesson|practice|research|presentation) -->/);const i=sections.indexOf(part);
    if(i<0||!window.markdownit)throw Error("Missing phase");
    const step=researchThread.steps.find(s=>s.topic===n);if(!step)throw Error("Missing research step");
    if(!ctx.tool&&!ctx.document&&(!location.hash||location.hash==="#basics"))window.researchWorkspace?.showLesson();
    showThread(step,part);
    const body=sections[i+1]+(part==="research"?"\n\n## تمرین عملی\n\n"+sections[sections.indexOf("practice")+1]:"");
    $("#lesson").innerHTML=window.markdownit({html:false,linkify:false}).render(body);
    $("#next-phase").href=part==="lesson"?url(n,"research"):part==="research"?url(n,"presentation"):n<course.sessions.length?url(n+1):url(n);
    $("#next-phase").textContent=part==="lesson"?"بررسی و تمرین":part==="research"?"آماده‌سازی ارائه":"مبحث بعد";
    $("#lesson").querySelectorAll("a[href],img[src]").forEach(el=>{
      const attr=el.tagName==="IMG"?"src":"href";
      const resolved=new URL(el.getAttribute(attr),new URL(active.path,location.href));
      if(!["http:","https:"].includes(resolved.protocol)){el.removeAttribute(attr);return;}
      const match=resolved.pathname.match(/\/docs\/([^/]+\.md)$/);
      const destination=attr==="href"&&resolved.origin===location.origin&&match?documentURL(match[1],resolved.searchParams.get("chapter"),unit):null;
      el.setAttribute(attr,destination||resolved.href);
    });
    $("#status").textContent=invalid?"نشانی مبحث معتبر نبود؛ مبحث اول نمایش داده شد.":"";
    $("#study-state").hidden=false;$("#progress").value=names[progress[n]]?progress[n]:"new";storageNote();
    for(const [id,target] of [["previous",n-1],["next",n+1]]){const a=$("#"+id);a.hidden=target<1||target>course.sessions.length;if(!a.hidden)a.href=url(target);}
    if(part==="presentation"){$("#check").hidden=false;await renderQuiz(n,ticket);}
    if(ticket!==revision)return;
    await renderResources(ctx,ticket);
    if(focus&&ticket===revision){$("#lesson").focus({preventScroll:true});$("#session-title").scrollIntoView({block:"start"});}
  }catch{if(ticket!==revision)return;$("#status").textContent="بارگذاری کامل نشد؛ دوباره تلاش کنید.";$("#retry").hidden=false;}
}
document.addEventListener("click",event=>{
  const a=event.target.closest("a[href]");if(event.defaultPrevented||!a||a.hasAttribute("download")||["document-source","document-download"].includes(a.id)||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;
  const destination=new URL(a.href);
  const githubDocument=destination.origin==="https://github.com" && destination.pathname.startsWith("/koolfox/koolfox.github.io/blob/main/structural-bioinformatics/docs/");
  if(destination.origin!==location.origin && !githubDocument)return;
  const file=destination.pathname.match(/\/docs\/([^/]+\.md)$/)?.[1] || destination.searchParams.get("document");
  let href=file&&courseMap?documentURL(file,destination.searchParams.get("chapter"),state().unit):null;
  if(!href && /\/(index\.html|learn\.html)?$/.test(destination.pathname) && destination.pathname.startsWith(location.pathname.replace(/index\.html$/,""))) {
    if(destination.searchParams.has("topic")||destination.searchParams.has("session")||destination.searchParams.has("unit")||destination.searchParams.has("tool"))href=destination.search+destination.hash;
    else if(courseMap?.legacy_tools[destination.hash.slice(1)])href=destination.search+destination.hash;
  }
  if(!href)return;
  event.preventDefault();history.pushState(null,"",href);render(true);
});
$("#progress").addEventListener("change",()=>{const n=state().n;progress[n]=$("#progress").value;try{localStorage.setItem("tnf-course-progress-v1",JSON.stringify(progress));}catch{storageAvailable=false;}storageNote();drawContents(n);});
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
$("#show-contents").addEventListener("click",()=>{window.researchWorkspace?.showLesson();$("#contents").open=true;$("#contents").scrollIntoView({block:"start"});$("#contents > summary").focus();});
$("#retry").addEventListener("click",()=>render());
window.addEventListener("popstate",()=>render(true));
if(matchMedia("(max-width:850px)").matches) $("#contents").open=false;
render();
