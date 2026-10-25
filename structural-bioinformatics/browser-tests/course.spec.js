import { test, expect } from '@playwright/test';
const root='/structural-bioinformatics/';
const sections=['course','research','library','papers','structures','datasets','docking','exercises','presentations'];

test('the directory links to two primary paths with independently usable research resources',async({page,request})=>{
 await page.goto(root);
 await expect(page.locator('#section-nav a')).toHaveCount(2);
 await expect(page.locator('.section-directory article')).toHaveCount(2);
 await expect(page.locator('#lesson,#quiz-form,#molecular-stage,#chapter-context,[role=tab]')).toHaveCount(0);
 for(const section of sections) {
  const response=await request.get(`${root}${section}.html`);expect(response.ok()).toBe(true);
  expect(await response.text()).toContain(`data-section="${section}"`);
 }
 await page.getByRole('navigation',{name:'مسیرهای اصلی'}).getByRole('link',{name:'پژوهش',exact:true}).click();
 await page.locator('#research-nav').getByRole('link',{name:'دیتاست‌ها',exact:true}).click();
 await expect(page).toHaveURL(/datasets\.html/);
 await expect(page.locator('#section-nav [aria-current=page]')).toHaveText('پژوهش');
 await expect(page.locator('#research-nav [aria-current=page]')).toHaveText('دیتاست‌ها');
 await expect(page.locator('#sessions,#parts,#chapter-context')).toHaveCount(0);
});

test('the course shows only lessons with nine chapters and thirty topic links',async({page})=>{
 await page.goto(`${root}course.html?topic=8`);
 await expect(page.locator('#lesson')).toContainText('اتم‌های متناظر');
 await expect(page.locator('#sessions > details')).toHaveCount(9);
 await expect(page.locator('#sessions a[data-topic]')).toHaveCount(30);
 await expect(page.locator('#parts,#quiz-form,#research-outcome,#dataset-workflow')).toHaveCount(0);
 await expect(page.locator('#lesson')).not.toContainText('کار این فصل در مقاله');
 await page.locator('#next').click();
 await expect(page.locator('#session-title')).toContainText('شعاع');
 await page.goBack();await expect(page.locator('#session-title')).toContainText('RMSD');
 await page.locator('#topic-links').getByRole('link',{name:'کاربرد این آموخته در پژوهش'}).click();
 await expect(page).toHaveURL(/research\.html\?unit=3/);
 await expect(page.locator('#learning-application-3')).toHaveAttribute('open','');
});

test('separate lesson, exercise, research and speaker files remain accessible',async({request})=>{
 const response=await request.get(`${root}data/metadata/learning-course.json`);const data=await response.json();
 for(const topic of data.sessions) {
  const results=await Promise.all(['path','exercise_path','research_path','presentation_path'].map(async key=>{
   const result=await request.get(root+topic[key]);expect(result.ok()).toBe(true);return result.text();
  }));
  for(const body of results)expect(body).not.toContain('<!-- course:');
 }
});

test('quiz responses and notes survive reload and clearing remains topic-specific',async({page})=>{
 await page.goto(`${root}exercises.html?topic=1`);
 await expect(page.locator('#quiz-options input')).toHaveCount(3);
 await page.locator('#quiz-options input[value="1"]').check();await page.locator('#quiz-form button').click();
 await expect(page.locator('#quiz-feedback')).toHaveAttribute('data-result','incorrect');
 await page.locator('#quiz-options input[value="0"]').check();await page.locator('#quiz-form button').click();
 await expect(page.locator('#quiz-feedback')).toHaveAttribute('data-result','correct');
 await page.locator('#own-answer').fill('تفاوت RNA و مختصات را توضیح می‌دهم.');
 await page.reload();await expect(page.locator('#own-answer')).toHaveValue('تفاوت RNA و مختصات را توضیح می‌دهم.');
 await expect(page.locator('#quiz-feedback')).toHaveAttribute('data-result','correct');
 await expect(page.locator('#quiz-history')).toContainText('۲');
 await page.locator('#clear-answer').click();await expect(page.locator('#own-answer')).toHaveValue('');
 await expect(page.locator('#quiz-history')).toContainText('هنوز پاسخی');
});

test('existing browser quiz records migrate without losing notes and changed revisions reset',async({page,request})=>{
 const bank=await (await request.get(`${root}data/metadata/course-quizzes.json`)).json();const quiz=bank.quizzes[0];
 await page.addInitScript(({id,revision})=>{if(!localStorage.getItem('tnf-course-quizzes-v1'))localStorage.setItem('tnf-course-quizzes-v1',JSON.stringify({'1':{id,revision,choice:0,notes:'یادداشت قبلی',attempts:[{choice:0,at:'2026-10-24T00:00:00Z'}]}}));},{id:quiz.id,revision:quiz.revision});
 await page.goto(`${root}exercises.html?topic=1`);await expect(page.locator('#own-answer')).toHaveValue('یادداشت قبلی');
 await page.evaluate(()=>localStorage.setItem('tnf-course-quizzes-v1',JSON.stringify({'1':{revision:'outdated',choice:0,notes:'منسوخ',attempts:[]}})));
 await page.reload();await expect(page.locator('#own-answer')).toHaveValue('');
});

test('course progress stays separate from exercise answers',async({page})=>{
 await page.goto(`${root}course.html?topic=1`);await expect(page.locator('#lesson')).toContainText('سلول');
 await page.locator('#progress').selectOption('read');
 await page.goto(`${root}exercises.html?topic=1`);await expect(page.locator('#quiz-form')).toBeVisible();
 await page.locator('#own-answer').fill('پاسخ تمرین');
 await page.goto(`${root}course.html?topic=1`);await expect(page.locator('#progress')).toHaveValue('read');
});

test('lesson failures can retry and quiz failures do not erase exercise instructions',async({page})=>{
 await page.route('**/docs/course/session-01.fa.md',r=>r.abort());
 await page.goto(`${root}course.html`);await expect(page.locator('#retry')).toBeVisible();
 await page.unroute('**/docs/course/session-01.fa.md');await page.locator('#retry').click();await expect(page.locator('#lesson')).toContainText('سلول');
 await page.route('**/data/metadata/course-quizzes.json',r=>r.abort());
 await page.goto(`${root}exercises.html`);await expect(page.locator('#quiz-retry')).toBeVisible();await expect(page.locator('#lesson')).toContainText('دفتر یادگیری');
 await page.unroute('**/data/metadata/course-quizzes.json');await page.locator('#quiz-retry').click();await expect(page.locator('#quiz-options input')).toHaveCount(3);
});

test('blocked storage has a clear fallback while exercise and download still work',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}}));
 await page.goto(`${root}exercises.html?topic=10`);
 await page.locator('#dataset-notes').fill('یادداشت موقت');
 await expect(page.locator('#dataset-workflow [role=status]')).toContainText('اجازهٔ ذخیره نداد');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'دریافت یادداشت‌های تمرین‌ها'}).click();expect((await download).suggestedFilename()).toBe('dataset-notebook.fa.txt');
 await page.locator('#quiz-options input').first().check();await page.locator('#quiz-form button').click();await expect(page.locator('#quiz-feedback')).not.toBeEmpty();
});

test('the exercise notebook retains measured RNA summaries and independent chapter notes',async({page})=>{
 await page.goto(`${root}exercises.html?topic=10`);
 await expect(page.locator('#workflow-gene-result')).toContainText('0.754');
 await page.locator('#workflow-gene').selectOption('TNF');await expect(page.locator('#workflow-gene-result')).toContainText('1.103');
 await page.locator('#dataset-notes').fill('چهار اهداکننده؛ نتیجه توصیفی است.');await page.reload();await expect(page.locator('#dataset-notes')).toHaveValue('چهار اهداکننده؛ نتیجه توصیفی است.');
 await page.goto(`${root}exercises.html?topic=8`);await expect(page.locator('#dataset-notes')).toHaveValue('');
});

test('library search and full documents do not require a chapter selection',async({page})=>{
 await page.goto(`${root}library.html`);await expect(page.locator('#library-catalog article')).not.toHaveCount(0);
 await page.locator('#library-search').fill('واژه');await expect(page.locator('#library-catalog')).toContainText('واژه‌نامه');
 await page.locator('#library-search').fill('not-a-real-topic-999');await expect(page.locator('#library-status')).toContainText('پیدا نشد');
 await page.goto(`${root}library.html?document=software-workbook.fa.md&chapter=all#reading`);await expect(page.locator('#reading-status')).toHaveAttribute('data-document','software-workbook.fa.md');
 await expect(page.locator('#sessions,#chapter-context')).toHaveCount(0);
});

test('research, paper reviews, datasets and docking have separate primary content',async({page})=>{
 await page.goto(`${root}research.html`);await expect(page.locator('.research-summary')).toContainText('تغییر بیان TOP2A');await expect(page.locator('#molecular-stage,#quiz-form,#datasets-table')).toHaveCount(0);
 await page.goto(`${root}papers.html`);await expect(page.locator('#paper-list')).toHaveAttribute('data-state','ready');await expect(page.locator('#sessions,#quiz-form')).toHaveCount(0);
 await page.goto(`${root}datasets.html`);await expect(page.locator('#dataset-search')).toBeEnabled();await page.locator('#dataset-search').fill('GSE339038');await expect(page.locator('#datasets-table')).toContainText('GSE339038');
 await page.goto(`${root}docking.html`);await expect(page.locator('#docking-validation')).toHaveAttribute('data-state','ready');await expect(page.locator('#molecular-stage,#datasets-table')).toHaveCount(0);
});

test('presentations offer chapter decks and speaker notes independently of lessons',async({page})=>{
 await page.goto(`${root}presentations.html`);await expect(page.locator('#presentation-catalog article')).toHaveCount(9);
 await page.goto(`${root}presentations.html?topic=10`);await expect(page.locator('#speaker-notes')).toBeVisible();await expect(page.locator('#speaker-body')).toContainText('چهار اهداکننده');
 await page.locator('#topic-slides').click();await expect(page.locator('#deck')).toHaveAttribute('data-topic','10');
 await page.locator('#notebook-link').click();await expect(page).toHaveURL(/presentations\.html/);
});

test('older links resolve to the corresponding independent section',async({page})=>{
 for(const [old,target] of [['?topic=8','course.html'],['?unit=4&part=research','exercises.html'],['?tool=lab','structures.html'],['?tool=docking','docking.html'],['?document=survey-draft.fa.md','research.html'],['?document=paper-explanations.fa.md','papers.html'],['#sequences','structures.html'],['?document=glossary.fa.md','library.html']]) {
  await page.goto(root+old);await expect(page).toHaveURL(new RegExp(target.replace('.','\\.')));
 }
});

test('all sections stay readable on mobile with native keyboard navigation',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 for(const section of sections) {
  await page.goto(`${root}${section}.html`);await expect(page.locator('#section-nav')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#section-nav a').first().focus();await expect(page.locator('#section-nav a').first()).toBeFocused();
 }
});

test('general lessons do not need research metadata and docking belongs to education',async({page})=>{
 const requests=[];page.on('request',r=>requests.push(r.url()));
 await page.route('**/data/metadata/research-thread.json',r=>r.abort());
 await page.goto(`${root}course.html?topic=18`);
 await expect(page.locator('#lesson')).toContainText('برهم‌کنش');
 await expect(page.locator('#lesson')).not.toContainText('Hu');
 expect(requests.some(url=>url.endsWith('/research-thread.json'))).toBe(false);
 await expect(page.locator('#section-nav a')).toHaveCount(2);
 await expect(page.locator('#section-nav [aria-current=page]')).toHaveText('سرفصل آموزشی');
 await page.goto(`${root}docking.html`);
 await expect(page.locator('#section-nav [aria-current=page]')).toHaveText('سرفصل آموزشی');
 await expect(page.locator('#research-nav')).toHaveCount(0);
 await expect(page.locator('#docking-validation')).not.toContainText('TOP2A');
 await expect(page.locator('#docking-validation')).not.toContainText('آدالیموماب');
});


test('the continuous general textbook stays in education through links, history and reload',async({page})=>{
 await page.goto(`${root}course.html?topic=8`);
 await page.getByRole('link',{name:'متن پیوستهٔ درسنامه',exact:true}).click();
 await expect(page).toHaveURL(/course\.html\?document=course-sessions\.fa\.md/);
 await expect(page.locator('#course-topics')).toBeHidden();
 await expect(page.locator('#markdown-content')).toContainText('اتم‌های متناظر');
 await expect(page.locator('#section-nav [aria-current=page]')).toHaveText('سرفصل آموزشی');
 await expect(page.locator('#document-select option')).toHaveCount(1);
 await expect(page.locator('#markdown-content a.term-link')).toHaveCount(0);
 await page.locator('#chapter-select').selectOption('chapter-2');
 await expect(page).toHaveURL(/chapter=chapter-2/);
 await page.reload();
 await expect(page.locator('#chapter-select')).toHaveValue('chapter-2');
 await page.locator('#chapter-select').selectOption('chapter-3');
 await page.goBack();
 await expect(page.locator('#chapter-select')).toHaveValue('chapter-2');
 await expect(page.locator('#course-topics')).toBeHidden();
 await page.getByRole('link',{name:'بازگشت به مباحث درس',exact:true}).click();
 await expect(page.locator('#lesson')).toContainText('توالی');
 await expect(page.locator('#course-reading')).toBeHidden();
 await page.goto(`${root}index.html?document=course-sessions.fa.md&chapter=chapter-2#reading`);
 await expect(page).toHaveURL(/course\.html\?document=course-sessions\.fa\.md/);
 await expect(page.locator('#chapter-select')).toHaveValue('chapter-2');
});
