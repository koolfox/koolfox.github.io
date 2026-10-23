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
test('self-report persists, written self-check answers do not',async({page})=>{
  await page.goto(`${route}?session=3&part=presentation`);
  await expect(page.locator('#check')).toBeVisible();
  await page.locator('#own-answer').fill('پاسخ خصوصی تمرین');
  await page.locator('#progress').selectOption('practiced');
  await page.reload();
  await expect(page.locator('#progress')).toHaveValue('practiced');
  await expect(page.locator('#own-answer')).toHaveValue('');
  await expect(page.locator('#sessions [aria-current=page]')).toContainText('تمرین کردم');
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
    await expect(page.locator('#sessions [aria-current=page]')).toHaveAttribute('href',`?session=${n}&part=lesson`);
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
  await page.locator('#contents summary').click();
  await expect(page.locator('#sessions a')).toHaveCount(30);
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
