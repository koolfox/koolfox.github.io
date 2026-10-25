import { gradeQuiz, restoredRecord } from "./course-quiz.js";
import { renderDatasetWorkflow } from "./dataset-workflow.js";
const $=selector=>document.querySelector(selector);
const exercise=document.body.dataset.section==='exercises';
const page=exercise?'exercises.html':'course.html';
let course,thread,quizBank,active,activeQuiz,quizReady=false,revision=0;
let storageAvailable=true;
function stored(key) { try {const value=JSON.parse(localStorage.getItem(key)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{storageAvailable=false;return {};}}
const progressKey=exercise?'tnf-course-progress-v1':'structural-education-progress-v1';
let quizRecords=stored('tnf-course-quizzes-v1'), progress=stored(progressKey);
async function getJSON(path) {const response=await fetch(path,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error(path);return response.json();}
function storageNote() {if($('#storage-note'))$('#storage-note').textContent=storageAvailable?'یادداشت و پاسخ در همین مرورگر ذخیره می‌شوند.':'مرورگر اجازهٔ ذخیره نداد؛ یادداشت خود را پیش از خروج نگه دارید.';}
function saveQuizzes() {try{localStorage.setItem('tnf-course-quizzes-v1',JSON.stringify(quizRecords));}catch{storageAvailable=false;}storageNote();}
function link(text,href) {const a=document.createElement('a');a.textContent=text;a.href=href;return a;}
async function render(focus=false) {
 if(!exercise&&new URLSearchParams(location.search).has("document"))return;
 const ticket=++revision;quizReady=false;
 $('#status').textContent='در حال دریافت متن…';$('#retry').hidden=true;
 try {
  if(!course)course=await getJSON('data/metadata/learning-course.json');
  if(exercise&&!thread)thread=await getJSON('data/metadata/research-thread.json');
  if(ticket!==revision)return;
  let n=Number(new URLSearchParams(location.search).get('topic')||1);
  const invalid=!Number.isInteger(n)||n<1||n>course.sessions.length;if(invalid)n=1;
  active=course.sessions[n-1];const blocks=[...new Set(course.sessions.map(t=>t.block))];
  const step=exercise?thread.steps.find(s=>s.topic===n):{unit:blocks.indexOf(active.block)+1};
  history.replaceState(null,'',`${page}?topic=${n}`);
  $('#session-title').textContent=active.title;document.title=active.title+' | '+(exercise?'تمرین‌ها':'درسنامه');
  $('#position').textContent=`فصل ${step.unit.toLocaleString('fa-IR')} · مبحث ${n.toLocaleString('fa-IR')}`;
  $('#prerequisites').replaceChildren(document.createTextNode(n===1?'مفاهیم از پایه توضیح داده می‌شوند.':'پیشنهاد پیش‌نیاز: '));
  active.prerequisites.forEach(id=>$('#prerequisites').append(link(course.sessions[id-1].title,`course.html?topic=${id}`)));
  document.querySelectorAll('#sessions a[data-topic]').forEach(a=>{const selected=Number(a.dataset.topic)===n;if(selected){a.setAttribute('aria-current','page');a.closest('details').open=true;}else a.removeAttribute('aria-current');});
  $('#foundations').hidden=!exercise;
  if(exercise){const terms=$('#topic-terms');terms.replaceChildren();for(const term of step.terms){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=term.term;dd.textContent=term.meaning;terms.append(dt,dd);}$('#topic-example').textContent=step.example;}
  const response=await fetch(exercise?active.exercise_path:active.path,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('lesson');const source=await response.text();if(ticket!==revision)return;
  const body=source.split('\n').slice(1).join('\n');if(!body.trim())throw Error('missing text');
  if(window.markdownit)$('#lesson').innerHTML=window.markdownit({html:false,linkify:false}).render(body);else $('#lesson').textContent=body;
  $('#lesson').querySelectorAll('a[href],img[src]').forEach(node=>{const attr=node.tagName==='IMG'?'src':'href';const url=new URL(node.getAttribute(attr),new URL(exercise?active.exercise_path:active.path,location.href));if(['http:','https:'].includes(url.protocol))node.setAttribute(attr,url.href);else node.removeAttribute(attr);});
  if(exercise)$('#topic-links').replaceChildren(link('مفهوم عمومی این مبحث',`course.html?topic=${n}`),link('ارائهٔ این پژوهش',`presentations.html?topic=${n}`));
  else $('#topic-links').replaceChildren(link('کاربرد این آموخته در پژوهش',`research.html?unit=${step.unit}#learning-application-${step.unit}`));
  if(!exercise&&step.unit===8)$('#topic-links').append(link('کارگاه آموزشی داکینگ','docking.html'));
  for(const [id,target] of [['previous',n-1],['next',n+1]]) {const a=$('#'+id);a.hidden=target<1||target>course.sessions.length;if(!a.hidden)a.href=`${page}?topic=${target}`;}
  if(exercise) {await Promise.all([renderQuiz(n,ticket),renderDatasetWorkflow($('#dataset-workflow'),step.unit).catch(()=>{$('#dataset-workflow').textContent='دستورکار داده دریافت نشد؛ صفحه را دوباره بارگذاری کنید.';})]);}
  else $('#progress').value=['new','read','practiced','skipped'].includes(progress[n])?progress[n]:'new';
  if(ticket!==revision)return;
  $('#status').textContent=invalid?'شمارهٔ مبحث معتبر نبود؛ مبحث اول نمایش داده شد.':'';storageNote();if(focus)$('#session-title').scrollIntoView({block:'start'});
 }catch {$('#status').textContent='متن دریافت نشد؛ دوباره تلاش کنید یا از فهرست فصل‌ها مبحث دیگری را باز کنید.';$('#retry').hidden=false;}
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

if(exercise) {
$("#quiz-form").addEventListener("change",event => {
  if (!quizReady || event.target.name !== "choice") return;
  const record=recordFor(active.session); record.choice=Number(event.target.value); saveQuizzes(); showResult(record);
});
$("#quiz-form").addEventListener("submit",event => {
  event.preventDefault(); if (!quizReady) return;
  const record=recordFor(active.session);
  if (record.choice === null) { $("#quiz-feedback").textContent="ابتدا یکی از گزینه‌ها را انتخاب کنید."; return; }
  gradeQuiz(activeQuiz,record.choice);
  record.attempts.push({choice:record.choice,at:new Date().toISOString()});
  record.attempts=record.attempts.slice(-20); saveQuizzes(); showResult(record);
});
$("#own-answer").addEventListener("input",() => {
  if (!quizReady) return;
  recordFor(active.session).notes=$("#own-answer").value; saveQuizzes();
});
$("#clear-answer").addEventListener("click",() => {
  if (!quizReady) return;
  delete quizRecords[active.session]; saveQuizzes(); renderQuiz(active.session,revision);
});
$("#quiz-retry").addEventListener("click",()=>renderQuiz(active.session,revision));

} else $('#progress').addEventListener('change',()=>{progress[active.session]=$('#progress').value;try{localStorage.setItem(progressKey,JSON.stringify(progress));}catch{storageAvailable=false;}storageNote();});
$('#retry').addEventListener('click',()=>render());
document.addEventListener('click',event=>{
 const a=event.target.closest('a[href]');if(event.defaultPrevented||!a||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
 const url=new URL(a.href);if(url.origin!==location.origin||url.pathname!==location.pathname||!url.searchParams.has('topic'))return;
 event.preventDefault();history.pushState(null,'',url);void render(true);
});
addEventListener('popstate',()=>render(true));
if(matchMedia('(max-width:850px)').matches)$('#contents').open=false;
if(exercise||!new URLSearchParams(location.search).has('document'))void render();
