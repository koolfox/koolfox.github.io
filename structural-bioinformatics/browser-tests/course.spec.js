import { test, expect } from '@playwright/test';
const route='/structural-bioinformatics/';
test('the restored six-section workspace contains the same nine-chapter course',async({page})=>{
  await page.goto(route);
  await expect(page).not.toHaveURL(/learn\.html/);
  await expect(page.locator('#lesson')).toContainText('سلول کوچک‌ترین');
  await expect(page.locator('#sessions > details')).toHaveCount(9);
  await expect(page.locator('#research-tabs [role=tab]')).toHaveCount(6);
  await expect(page.locator('#study-path,#weekly-plan')).toHaveCount(0);
  await page.locator('#sessions > details').nth(2).locator('summary').click();
  await page.locator('#sessions > details').nth(2).getByRole('link',{name:'پژوهش این فصل',exact:true}).click();
  await expect(page).toHaveURL(/unit=3/);
  await page.locator('#tab-lab').click();
  await expect(page.locator('#molecular-stage')).toBeVisible();
  await page.locator('#tab-basics').click();
  await expect(page.locator('#position')).toContainText('فصل ۳');
});
test('deep linking, reading phases and history keep a single coherent session',async({page})=>{
  await page.goto(`${route}?session=8&part=practice`);
  await expect(page.locator('#lesson')).toContainText('--shift 10');
  await expect(page.locator('#session-title')).toContainText('RMSD');
  await page.locator('[data-part=lesson]').click();
  await expect(page.locator('#lesson')).toContainText('اتم‌های متناظر');
  await page.goBack();
  await expect(page.locator('#lesson')).toContainText('--shift 10');
  await page.locator('#next').click();
  await expect(page.locator('#session-title')).toContainText('SASA');
});
test('quiz answers, notes and study state persist independently and can be retried',async({page})=>{
  await page.goto(`${route}?session=1&part=presentation`);
  await expect(page.locator('#quiz-options input')).toHaveCount(3);
  await page.locator('#quiz-options input[value="1"]').check();
  await page.locator('#quiz-form button').click();
  await expect(page.locator('#quiz-feedback')).toHaveAttribute('data-result','incorrect');
  await page.locator('#quiz-options input[value="0"]').check();
  await page.locator('#quiz-form button').click();
  await expect(page.locator('#quiz-feedback')).toHaveAttribute('data-result','correct');
  await expect(page.locator('#quiz-history')).toContainText('۲');
  await page.locator('#own-answer').fill('نکتهٔ شخصی برای تمرین');
  await page.locator('#progress').selectOption('read');
  await page.reload();
  await expect(page.locator('#own-answer')).toHaveValue('نکتهٔ شخصی برای تمرین');
  await expect(page.locator('#quiz-options input[value="0"]')).toBeChecked();
  await expect(page.locator('#quiz-feedback')).toHaveAttribute('data-result','correct');
  await expect(page.locator('#progress')).toHaveValue('read');
  await page.locator('#clear-answer').click();
  await expect(page.locator('#own-answer')).toHaveValue('');
  await expect(page.locator('#quiz-history')).toContainText('هنوز پاسخی');
  await expect(page.locator('#progress')).toHaveValue('read');
});
test('invalid address and blocked storage have explicit usable fallbacks',async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}});});
  await page.goto(`${route}?session=99&part=unknown`);
  await expect(page.locator('#status')).toContainText('معتبر نبود');
  await expect(page.locator('#lesson')).toContainText('سلول کوچک‌ترین');
  await expect(page.locator('#storage-note')).toContainText('در دسترس نیست');
  await page.locator('#progress').selectOption('read');
  await expect(page.locator('#storage-note')).toContainText('ممکن نشد');
});
test('network failure can be retried without a blank lesson',async({page})=>{
  let failed=true;
  await page.route('**/docs/course/session-01.fa.md',r=>failed?r.abort():r.continue());
  await page.goto(route);
  await expect(page.locator('#retry')).toBeVisible();
  failed=false; await page.locator('#retry').click();
  await expect(page.locator('#lesson')).toContainText('سلول کوچک‌ترین');
  await expect(page.locator('#retry')).toBeHidden();
});
test('all thirty lesson files and phases are available from the actual public routes',async({page})=>{
  test.setTimeout(120000);
  await page.goto(route);
  for(let n=1;n<=30;n++) {
    await page.goto(`${route}?session=${n}&part=lesson`);
    await expect(page.locator('#sessions [aria-current=page]')).toHaveAttribute('href',new RegExp(`topic=${n}&part=lesson$`));
    await expect(page.locator('#lesson p').first()).not.toBeEmpty();
    for(const part of ['research','presentation']) {
      await page.locator(`[data-part=${part}]`).click();
      await expect(page.locator(`#parts [data-part=${part}]`)).toHaveAttribute('aria-current','page');
      await expect(page.locator('#status')).toHaveText('');
      await expect(page.locator('#lesson p').first()).not.toBeEmpty();
    }
  }
});
test('mobile course is readable without horizontal overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(`${route}?session=7&part=practice`);
  await expect(page.locator('#lesson pre')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#contents > summary').click();
  await expect(page.locator('#sessions details > a')).toHaveCount(30);
  await page.locator('#sessions > details').last().locator('summary').click();
  await page.locator('#sessions details > a').last().click();
  await expect(page.locator('#session-title')).toContainText('دفاع');
});

test('the RNA teaching model renders actual local polymer coordinates',async({page})=>{
  await page.goto('/structural-bioinformatics/assets/reference-viewer.html?pdb=1EHZ');
  await expect(page.locator('body')).toHaveAttribute('data-state','ready',{timeout:30000});
  const state=await page.evaluate(()=>window.referenceViewer.state);
  expect(state.structureId).toBe('1EHZ');
  expect(state.polymerResidueCount).toBe(76);
  expect(state.representation).toBe('cartoon');
});

test('nine chapters are independent of the official classroom session allocations',async({page})=>{
  await page.goto(route);
  await expect(page.locator('#sessions > details')).toHaveCount(9);
  await expect(page.locator('#position')).toContainText('فصل ۱ از ۹');
  await expect(page.locator('#position')).not.toContainText('جلسه');
  await page.locator('#sessions > details').last().locator('summary').click();
  await page.locator('#sessions details > a').last().click();
  await expect(page.locator('#position')).toContainText('فصل ۹ از ۹');
});
test('unavailable quiz does not prevent reading and can be fetched again',async({page})=>{
  let failed=true;
  await page.route('**/course-quizzes.json',r=>failed?r.abort():r.continue());
  await page.goto(`${route}?session=8&part=presentation`);
  await expect(page.locator('#lesson')).toContainText('RMSD');
  await expect(page.locator('#quiz-retry')).toBeVisible();
  failed=false; await page.locator('#quiz-retry').click();
  await expect(page.locator('#quiz-options input')).toHaveCount(3);
});
test('changed question revision does not inherit an earlier result',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('tnf-course-quizzes-v1',JSON.stringify({1:{id:'topic-01-concept-1',revision:0,choice:0,notes:'old',attempts:[{choice:0,at:'2026-01-01'}]}})));
  await page.goto(`${route}?session=1&part=presentation`);
  await expect(page.locator('#quiz-history')).toContainText('هنوز پاسخی');
  await expect(page.locator('#own-answer')).toHaveValue('');
});

test('mobile quiz stays within the viewport and remains usable when saving fails',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw Error('quota')};});
  await page.goto(`${route}?session=1&part=presentation`);
  await page.locator('#quiz-options input[value="0"]').check();
  await page.locator('#quiz-form button').click();
  await expect(page.locator('#quiz-feedback')).toHaveAttribute('data-result','correct');
  await expect(page.locator('#storage-note')).toContainText('ممکن نشد');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#own-answer').fill('تا بستن صفحه');
  await page.locator('[data-part=lesson]').click();
  await page.locator('[data-part=presentation]').click();
  await expect(page.locator('#own-answer')).toHaveValue('تا بستن صفحه');
});

test('tools, documents and presentation stay inside the same chapter application',async({page,request})=>{
  const map=await (await request.get('/structural-bioinformatics/data/metadata/course-map.json')).json();
  await page.goto(`${route}?unit=6&part=research&document=paper-explanations.fa.md&chapter=chapter-3`);
  await expect(page.locator('#position')).toContainText('فصل ۶');
  await expect(page.locator('#reading-status')).toHaveAttribute('data-state','ready');
  await expect(page.locator('#markdown-content')).toContainText('Bianchi');
  const names=await page.locator('#document-select option').evaluateAll(options=>options.map(o=>o.value));
  for(const name of map.chapters[5].documents)expect(names).toContain(name);
  await page.locator('#workspace-lesson').click();
  await page.locator('[data-part=presentation]').click();
  await page.getByRole('link',{name:'متن ارائهٔ همین فصل',exact:true}).click();
  await expect(page.locator('#reading-status')).toHaveAttribute('data-document','chapter-presentation.fa.md');
  await expect(page.locator('#reading-status')).toHaveAttribute('data-chapter','chapter-6');
  await expect(page.locator('#chapter-select')).toHaveValue('chapter-6');
  await expect(page.locator('#position')).toContainText('فصل ۶');
  await expect(page.locator('iframe[src*="learn.html"],iframe[src*="index.html"]')).toHaveCount(0);
});
test('legacy learning and weekly links resolve only into the one chapter application',async({page})=>{
  await page.goto('/structural-bioinformatics/learn.html?topic=8&part=presentation');
  await expect(page).toHaveURL(/index\.html\?unit=3/);
  await expect(page.locator('#position')).toContainText('فصل ۳');
  await expect(page.locator('#quiz-form')).toBeVisible();
  await page.goto(`${route}?document=weekly-plan.fa.md#reading`);
  await expect(page.locator('#reading-status')).toHaveAttribute('data-document','weekly-plan.fa.md');
  await expect(page.locator('#weekly-plan,#study-path')).toHaveCount(0);
  await expect(page.locator('#research-tabs [role=tab]')).toHaveCount(6);
});
test('every tool opens in its owning chapter without opening another curriculum',async({page,request})=>{
  test.setTimeout(120000);
  const map=await (await request.get('/structural-bioinformatics/data/metadata/course-map.json')).json();
  for(const tool of map.tools) {
    await page.goto(`${route}?unit=${tool.unit}&part=practice&tool=${tool.id}`);
    await expect(page.locator(`[data-course-tool="${tool.id}"]`)).toBeVisible();
    await expect(page.locator('#research-tabs [aria-selected=true]')).toHaveCount(1);
    await expect(page.locator('#position')).toContainText(`فصل ${tool.unit.toLocaleString('fa-IR')}`);
    await expect(page.locator('#research-tabs [role=tab]')).toHaveCount(6);
  await expect(page.locator('#study-path,#weekly-plan')).toHaveCount(0);
  }
});
test('chapter presentations share the same course map and return to their chapter',async({page,request})=>{
  const map=await (await request.get('/structural-bioinformatics/data/metadata/course-map.json')).json();
  for(const unit of [2,3,6,8,9]) {
    await page.goto(`/structural-bioinformatics/presentation.html?unit=${unit}`);
    await expect(page.locator('#deck')).toHaveAttribute('data-state','ready');
    await expect(page.locator('#deck')).toHaveAttribute('data-unit',String(unit));
    const ids=await page.locator('.slide[data-chapter]').evaluateAll(slides=>slides.map(s=>Number(s.dataset.chapter)));
    expect(ids).toEqual(map.chapters[unit-1].slides);
    await page.locator('#notebook-link').click();
    await expect(page.locator('#position')).toContainText(`فصل ${unit.toLocaleString('fa-IR')}`);
    await expect(page.locator('#check')).toBeVisible();
  }
});

test('the chapter context remains visible while reading on a phone',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(`${route}?unit=6&part=research&document=paper-explanations.fa.md&chapter=chapter-3`);
  await expect(page.locator('#reading-status')).toHaveAttribute('data-state','ready');
  await page.locator('#markdown-content').scrollIntoViewIfNeeded();
  expect((await page.locator('#chapter-context').boundingBox()).y).toBeGreaterThanOrEqual(0);
  const tabs=await page.locator('#research-tabs').boundingBox();
  const context=await page.locator('#chapter-context').boundingBox();
  expect(context.y).toBeGreaterThanOrEqual(tabs.y+tabs.height-1);
  expect(context.y+context.height).toBeLessThan(250);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#show-contents').click();
  await expect(page.locator('#contents')).toHaveJSProperty('open',true);
  await expect(page.locator('#position')).toContainText('فصل ۶');
});

test('one topic advances the same question from lesson through research to its own slides',async({page})=>{
  await page.goto(`${route}?topic=3`);
  await expect(page.locator('#parts a')).toHaveCount(3);
  await expect(page.locator('#main-research-question')).toContainText('آدالیموماب');
  await expect(page.locator('#topic-terms')).toContainText('زیرواحد');
  await expect(page.locator('#topic-example')).toContainText('3WD5');
  await page.locator('#next-phase').click();
  await expect(page.locator('#parts [aria-current=page]')).toHaveAttribute('data-part','research');
  await expect(page.locator('#lesson')).toContainText('دو زیرواحد');
  await expect(page.locator('#research-outcome')).toContainText('انرژی');
  await expect(page.locator('#research-deliverable')).toContainText('دو شکل');
  await page.locator('#next-phase').click();
  await expect(page.locator('#lesson')).toContainText('چهار سطح ساختار');
  await expect(page.locator('#lesson')).toContainText('در پروژهٔ ما');
  await page.getByRole('link',{name:'اسلایدهای این قدم',exact:true}).click();
  await expect(page.locator('#deck')).toHaveAttribute('data-topic','3');
  await expect(page.locator('.step-intro')).toHaveCount(1);
  await expect(page.locator('#deck')).toContainText('خروجی این قدم');
  await page.locator('#notebook-link').click();
  await expect(page).toHaveURL(/topic=3/);
  await expect(page.locator('#parts [aria-current=page]')).toHaveAttribute('data-part','presentation');
});
test('every research step has a usable slide bridge within the desktop height budget',async({page,request})=>{
  test.setTimeout(120000);
  await page.setViewportSize({width:1440,height:900});
  const thread=await (await request.get('/structural-bioinformatics/data/metadata/research-thread.json')).json();
  for(const step of thread.steps) {
    await page.goto(`/structural-bioinformatics/presentation.html?topic=${step.topic}`);
    await expect(page.locator('#deck')).toHaveAttribute('data-state','ready');
    await expect(page.locator('.slide')).toHaveCount(step.slides.length+2);
    await page.selectOption('#slide-select','1');
    await expect(page.locator('.step-intro')).toBeVisible();
    await expect(page.locator('.step-intro')).toContainText(step.question);
    await page.evaluate(()=>document.fonts.ready);
    expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(902);
  }
});
