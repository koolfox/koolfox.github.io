import { DOCUMENTS, createMarkdownReader, configureDocumentRoutes } from './markdown-reader.js';
import { documentAddress, documentSection } from './section-routes.js';
const $=id=>document.getElementById(id);
const current=document.body.dataset.section;
let sections, reader;
const textNode=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;return node;};
try {
  const response=await fetch('data/metadata/site-sections.json');
  if(!response.ok)throw Error('section metadata');
  sections=(await response.json()).sections;
  configureDocumentRoutes(sections);
  const section=sections.find(s=>s.id===current);
  if($('reading')) {
    reader=createMarkdownReader();
    const params=new URLSearchParams(location.search);
    const requested=params.get('document');
    const registered=new Set(DOCUMENTS.map(row=>row[0]));
    if(requested&&registered.has(requested)&&current!=='library'&&documentSection(requested,sections).id!==current) {
      location.replace(documentAddress(requested,sections,params.get('chapter')||'all'));
    } else {
      if(current!=='library')reader.filterDocuments(section.documents.map(d=>d.file));
      await reader.open(registered.has(requested)?requested:section.documents[0].file,params.get('chapter')||'all');
      if(current!=='library')reader.filterDocuments(section.documents.map(d=>d.file));
    }
    addEventListener('popstate',()=>{
      const params=new URLSearchParams(location.search);
      void reader.open(params.get('document')||section.documents[0].file,params.get('chapter')||'all');
    });
  }
  if($('library-catalog')) {
    const render=()=>{
      const query=$('library-search').value.trim().toLocaleLowerCase();
      const catalog=$('library-catalog');catalog.replaceChildren();
      const rows=DOCUMENTS.filter(row=>row.join(' ').toLocaleLowerCase().includes(query));
      for(const [file,title] of rows) {
        const item=document.createElement('article'), a=textNode('a',title);
        a.href=`library.html?${new URLSearchParams({document:file,chapter:'all'})}#reading`;
        item.append(a,textNode('p',documentSection(file,sections).title));catalog.append(item);
      }
      $('library-status').textContent=rows.length?`${rows.length.toLocaleString('fa-IR')} متن پیدا شد.`:'متنی با این عبارت پیدا نشد؛ عبارت کوتاه‌تری را امتحان کنید.';
    };
    $('library-search').addEventListener('input',render);render();
  }
  if(current==='research') {
    const unit=Number(new URLSearchParams(location.search).get('unit'));
    const application=$('learning-application-'+unit);
    if(application){application.open=true;application.scrollIntoView({block:'start'});}
  }
  if(current==='research'&&new URLSearchParams(location.search).has('topic')) {
    const n=Number(new URLSearchParams(location.search).get('topic'));
    const course=await fetch('data/metadata/learning-course.json').then(r=>r.json());
    const topic=course.sessions.find(t=>t.session===n);
    if(topic) {
      const response=await fetch(new URLSearchParams(location.search).get('context')==='lesson'?topic.case_lesson_path:topic.research_path);if(!response.ok)throw Error('research note');
      const text=(await response.text()).split('\n').slice(1).join('\n');
      $('research-topic-title').textContent=topic.title;
      $('research-topic-body').innerHTML=window.markdownit({html:false}).render(text);
      const caseLink=textNode('a',new URLSearchParams(location.search).get('context')==='lesson'?'یادداشت پژوهشی این مبحث':'مثال کاربردی این مطالعه');
      caseLink.href=`research.html?topic=${n}${new URLSearchParams(location.search).get('context')==='lesson'?'':'&context=lesson'}#research-topic-note`;
      $('research-topic-body').append(caseLink);
      $('research-topic-note').hidden=false;
      $('research-topic-note').scrollIntoView({block:'start'});
    }
  }
  if(current==='presentations'&&new URLSearchParams(location.search).has('topic')) {
    const n=Number(new URLSearchParams(location.search).get('topic'));
    const course=await fetch('data/metadata/learning-course.json').then(r=>r.json());
    const topic=course.sessions.find(t=>t.session===n);
    if(topic) {
      const response=await fetch(topic.presentation_path);if(!response.ok)throw Error('speaker notes');
      const source=(await response.text()).split('\n').slice(1).join('\n');
      $('speaker-notes').hidden=false;$('speaker-title').textContent=topic.title;
      $('speaker-body').innerHTML=window.markdownit({html:false}).render(source);
      $('topic-slides').href=`presentation.html?topic=${n}#slide-1`;
      $('speaker-notes').scrollIntoView({block:'start'});
    }
  }
  document.documentElement.dataset.siteState='ready';
} catch {
  const status=textNode('p','متن یا فهرست دریافت نشد. صفحه را دوباره بارگذاری کنید؛ پیوند بخش‌ها و فایل‌های اصلی همچنان در دسترس‌اند.');status.className='inline-error';status.setAttribute('role','status');$('main').prepend(status);
  document.documentElement.dataset.siteState='partial';
}
// Document links navigate to their actual section. In the library they remain in the library.
document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||!sections)return;
  const a=event.target.closest('a[href]');if(!a||a.hasAttribute('download')||['document-source','document-download'].includes(a.id))return;
  const url=new URL(a.href), isGithub=url.origin==='https://github.com'&&url.pathname.includes('/structural-bioinformatics/docs/');
  if(url.origin!==location.origin&&!isGithub)return;
  const anchors={lab:'structures.html',literature:'papers.html',methods:'research.html',datasets:'datasets.html',sequences:'structures.html#sequences','epitope-lab':'exercises.html#epitope-lab',basics:'course.html'};
  if(url.origin===location.origin&&url.pathname===location.pathname&&url.hash&&!document.getElementById(url.hash.slice(1))&&anchors[url.hash.slice(1)]) {event.preventDefault();location.assign(anchors[url.hash.slice(1)]);return;}
  const file=url.pathname.match(/\/docs\/([^/]+\.md)$/)?.[1]||url.searchParams.get('document');
  if(!DOCUMENTS.some(row=>row[0]===file))return;
  const chapter=url.searchParams.get('chapter')||'all';
  const destination=current==='library'?`library.html?${new URLSearchParams({document:file,chapter})}#reading`:documentAddress(file,sections,chapter);
  if(new URL(destination,location.href).href===a.href)return;
  event.preventDefault();location.assign(destination);
});
