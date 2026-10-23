import { test, expect } from '@playwright/test';
const route='/structural-bioinformatics/learn.html';
test('default entry leads to the syllabus course, preserving explicit workspace links',async({page})=>{
  await page.goto('/structural-bioinformatics/');
  await expect(page).toHaveURL(/learn\.html/);
  await expect(page.locator('#lesson')).toContainText('سلول کوچک‌ترین');
  await expect(page.locator('#sessions a')).toHaveCount(30);
  await page.getByRole('link',{name:'کارگاه مولکولی و اسناد پژوهش',exact:true}).click();
  await expect(page).toHaveURL(/workspace=1#lab/);
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
    await expect(page.locator('#sessions [aria-current=page]')).toHaveAttribute('href',`?topic=${n}&part=lesson`);
    await expect(page.locator('#lesson p').first()).not.toBeEmpty();
    for(const part of ['practice','research','presentation']) {
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
  await expect(page.locator('#sessions a')).toHaveCount(30);
  await page.locator('#sessions > details').last().locator('summary').click();
  await page.locator('#sessions a').last().click();
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
  await page.locator('#sessions a').last().click();
  await expect(page.locator('#position')).toContainText('فصل ۹ از ۹');
});
test('unavailable quiz does not prevent reading and can be fetched again',async({page})=>{
  let failed=true;
  await page.route('**/course-quizzes.json',r=>failed?r.abort():r.continue());
  await page.goto(`${route}?session=8&part=presentation`);
  await expect(page.locator('#lesson')).toContainText('جابه‌جایی');
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
