import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

const document = JSON.parse(readFileSync(new URL('../../deep-learning/content/workshops/spring-2022.json',import.meta.url),'utf8'));
const lesson = id => `/deep-learning/terms/spring-2022/${id}/`;
const editor = page => page.locator('[data-workshop-code]');
async function run(page) {
  await page.locator('[data-workshop-run]').click();
  await expect(page.locator('[data-workshop-record]')).toBeEnabled({timeout:65000});
}
async function result(page) {
  return page.locator('.workshop-output tbody tr').evaluateAll(rows => Object.fromEntries(rows.map(row => [row.querySelector('th').textContent,JSON.parse(row.querySelector('pre').textContent)])));
}
function compare(actual, expected) {
  if (typeof expected === 'number') expect(actual).toBeCloseTo(expected,10);
  else if (Array.isArray(expected)) { expect(actual).toHaveLength(expected.length); expected.forEach((v,i)=>compare(actual[i],v)); }
  else if (expected && typeof expected === 'object') { expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort()); Object.keys(expected).forEach(k=>compare(actual[k],expected[k])); }
  else expect(actual).toEqual(expected);
}

test('Spring 2022 has 23 slide lessons and ten small unlinked historical notes',async({page,request})=>{
  await page.goto('/deep-learning/terms/spring-2022/');
  await expect(page.locator('.session-row')).toHaveCount(23);
  await expect(page.locator('.calendar-note')).toHaveCount(10);
  await expect(page.locator('.calendar-note a, .calendar-note button')).toHaveCount(0);
  expect((await request.get(lesson('s03'))).status()).toBe(404);
  expect((await request.get(lesson('s29'))).status()).toBe(404);
  await page.goto(lesson('s02'));
  await expect(page.locator('.lesson-pagination a').last()).toHaveAttribute('href',lesson('s04'));
});

for (const unit of document.sessions) {
  test(`${unit.session_id} workshop executes actual Python and matches its checked reference`,async({page,request})=>{
    test.setTimeout(90000);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const runtimeRequests=[];page.on('request',r=>{if(r.url().includes('/runtime/'))runtimeRequests.push(r.url());});
    await page.goto(lesson(unit.session_id));
    await expect(page.locator('[data-workshop]')).toHaveCount(1);
    await expect(page.locator('#questions form[data-exercise]')).toHaveCount(3);
    await expect(page.locator('[data-workshop-result]')).toBeEmpty();
    expect(runtimeRequests).toEqual([]);
    const source=await request.get(`/deep-learning/workshops/spring-2022/${unit.session_id}.py`);
    expect(source.ok()).toBeTruthy();expect(await source.text()).toBe(await editor(page).inputValue());
    await run(page);compare(await result(page),unit.reference);
    expect(errors).toEqual([]);
  });
}

test('changing the algorithm changes output and the downloaded record contains the executed source',async({page})=>{
  test.setTimeout(90000);await page.goto(lesson('s04'));
  await run(page);expect((await result(page)).outputs).toEqual([0,1,1,0]);
  const changed=(await editor(page).inputValue()).replace('max(0.0, z)','z');
  await editor(page).fill(changed);
  await expect(page.locator('[data-workshop-result]')).toBeEmpty();
  await expect(page.locator('[data-workshop-record]')).toBeDisabled();
  await run(page);expect((await result(page)).outputs).toEqual([2,1,1,0]);
  const waiting=page.waitForEvent('download');await page.locator('[data-workshop-record]').click();
  const saved=JSON.parse(readFileSync(await (await waiting).path(),'utf8'));
  expect(saved.source_code).toBe(changed);expect(saved.result.outputs).toEqual([2,1,1,0]);expect(saved.python).toBe('3.12.7');
  await page.locator('[data-workshop-reset]').click();
  await expect(editor(page)).not.toHaveValue(changed);
  await expect(page.locator('[data-workshop-result]')).toBeEmpty();
});

test('syntax errors, timeout and manual stop clear results and permit recovery',async({page})=>{
  test.setTimeout(150000);await page.goto(lesson('s28'));
  await editor(page).fill('def broken(:\n    return 1');
  await page.locator('[data-workshop-run]').click();
  await expect(page.locator('[data-workshop-console]')).toContainText('SyntaxError',{timeout:65000});
  await expect(page.locator('[data-workshop-record]')).toBeDisabled();
  await editor(page).fill('while True:\n    pass');
  await page.locator('[data-workshop-run]').click();
  await expect(page.locator('[data-workshop-status]')).toContainText('پنج ثانیه',{timeout:65000});
  await expect(editor(page)).toBeEditable();
  await page.locator('[data-workshop-run]').click();
  await page.locator('[data-workshop-stop]').click();
  await expect(page.locator('[data-workshop-status]')).toContainText('متوقف شد');
  await page.locator('[data-workshop-reset]').click();
  await run(page);expect((await result(page)).ctc_probability_a).toBeCloseTo(0.51,12);
});

test('questions give feedback, retain Persian answers and keep source activities available',async({page})=>{
  await page.goto(lesson('s19'));
  const numeric=page.locator('#questions form[data-exercise]').nth(0);
  await numeric.locator('input').fill('۰٫۹');await numeric.locator('button').click();
  await expect(numeric.locator('.feedback')).toHaveAttribute('data-state','correct');
  const choice=page.locator('#questions form[data-exercise]').nth(1);
  await choice.locator('input').first().check();await choice.locator('button').click();
  await expect(choice.locator('.feedback')).toHaveAttribute('data-state','correct');
  const reasoning=page.locator('#questions form[data-exercise]').nth(2);
  await reasoning.locator('textarea').fill('شاهد تصویر و اطمینان را برای هر نمونه جدا ثبت می‌کنم.');
  await reasoning.locator('button').click();
  await expect(reasoning.locator('.feedback')).toContainText('تصحیح خودکار انجام نمی‌شود');
  await page.reload();await expect(numeric.locator('input')).toHaveValue('۰٫۹');
  await expect(reasoning.locator('textarea')).toHaveValue('شاهد تصویر و اطمینان را برای هر نمونه جدا ثبت می‌کنم.');
  await expect(page.locator('#source-activities a[href$="#page=33"]')).toHaveCount(2);
  await expect(page.locator('#source-activities a[href$="#page=35"]')).toHaveCount(2);
});

test('failed runtime loading leaves questions, source and code download usable',async({page})=>{
  test.setTimeout(90000);await page.route('**/pyodide.asm.wasm',route=>route.abort());
  await page.goto(lesson('s02'));await page.locator('[data-workshop-run]').click();
  await expect(page.locator('[data-workshop-status]')).toContainText(/خطا داد|بارگیری نشد/,{timeout:65000});
  await expect(page.locator('[data-workshop-record]')).toBeDisabled();await expect(editor(page)).toBeEditable();
  const pending=page.waitForEvent('download');await page.locator('[data-workshop-download]').click();
  expect(readFileSync(await (await pending).path(),'utf8')).toBe(await editor(page).inputValue());
  const form=page.locator('#questions form[data-exercise]').first();await form.locator('input').fill('-0.4');await form.locator('button').click();
  await expect(form.locator('.feedback')).toHaveAttribute('data-state','correct');
});

test('workshop and calendar retain the incumbent RTL design on desktop and phone',async({page})=>{
  for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
    await page.setViewportSize({width,height});
    await page.goto('/deep-learning/terms/spring-2022/');
    await page.screenshot({path:test.info().outputPath(`calendar-${name}.png`)});
    await page.goto(lesson('s16')+'#workshop');
    await expect(editor(page)).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    await page.screenshot({path:test.info().outputPath(`workshop-${name}.png`)});
  }
});
