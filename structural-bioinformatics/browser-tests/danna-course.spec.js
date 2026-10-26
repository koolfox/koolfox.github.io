import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const lesson='/deep-learning/terms/spring-2026/s02/';
const terms={'spring-2026':32,'spring-2025':33,'spring-2024':32,'fall-2022':33,'spring-2022':33};

test('five independent calendars preserve all 163 rows and official sources',async({page,request})=>{
  await page.goto('/deep-learning/');
  await expect(page.locator('.term-row')).toHaveCount(5);
  for(const [term,count] of Object.entries(terms)){
    await page.goto(`/deep-learning/terms/${term}/`);
    await expect(page.locator('.session-row')).toHaveCount(count);
    const first=page.locator('.session-row h2 a').first();await first.click();
    await expect(page.locator('.source-link')).toHaveAttribute('href',/colorado.edu/);
    await expect(page.locator('.concept')).not.toHaveCount(0);
    const links=await page.locator('a[href]').evaluateAll(nodes=>nodes.map(a=>a.href));
    for(const href of new Set(links)){
      const url=new URL(href);if(url.origin!==new URL(page.url()).origin)continue;
      if(url.pathname===new URL(page.url()).pathname&&url.hash){expect(await page.locator(url.hash).count(),href).toBe(1);continue;}
      expect((await request.get(href)).ok(),href).toBeTruthy();
    }
  }
});

test('original exercises accept Persian digits and progress is scoped to semester',async({page})=>{
  await page.goto(lesson);
  const form=page.locator('form[data-exercise]').first();
  await form.locator('input[name=answer]').fill('−۰٫۲۵');await form.locator('button').click();
  await expect(form.locator('.feedback')).toHaveAttribute('data-state','correct');
  await page.locator('[data-toggle-complete]').click();await page.reload();
  await expect(page.locator('[data-toggle-complete]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('form[data-exercise]').first().locator('input')).toHaveValue('−۰٫۲۵');
  await page.goto('/deep-learning/terms/spring-2025/s02/');
  await expect(page.locator('[data-toggle-complete]')).toHaveAttribute('aria-pressed','false');
  await page.goto('/deep-learning/terms/spring-2026/');
  await expect(page.locator('[data-session-key="spring-2026/s02"] [data-completion-label]')).toContainText('خوانده');
});

test('malformed progress imports preserve existing work',async({page})=>{
  await page.goto(lesson);await page.locator('[data-toggle-complete]').click();
  await page.goto('/deep-learning/');await page.locator('.progress-tools summary').click();
  await page.locator('[data-import-progress]').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"schema_version":1,"sessions":{"__proto__":{"complete":true}},"answers":{}}')});
  await expect(page.locator('[data-progress-message]')).toContainText('معتبر');
  await page.goto(lesson);await expect(page.locator('[data-toggle-complete]')).toHaveAttribute('aria-pressed','true');
});

test('a progress backup restores a completed lesson without altering legacy progress',async({page})=>{
  await page.goto(lesson);await page.locator('[data-toggle-complete]').click();
  await page.evaluate(()=>localStorage.setItem('koolfox.deep-learning.progress.v1','legacy-sentinel'));
  await page.goto('/deep-learning/');await page.locator('.progress-tools summary').click();
  const pending=page.waitForEvent('download');await page.locator('[data-export-progress]').click();
  const path=await (await pending).path();await page.evaluate(()=>localStorage.removeItem('danna-learning-progress:v1'));
  await page.reload();await page.locator('.progress-tools summary').click();
  await page.locator('[data-import-progress]').setInputFiles(path);
  await expect(page.locator('[data-progress-message]')).toContainText('ترکیب شد');
  await page.goto(lesson);await expect(page.locator('[data-toggle-complete]')).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>localStorage.getItem('koolfox.deep-learning.progress.v1'))).toBe('legacy-sentinel');
});

test('blocked storage keeps local reading and exercise feedback usable',async({page})=>{
  await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('blocked')};Storage.prototype.setItem=()=>{throw Error('blocked')};});
  await page.goto(lesson);await expect(page.locator('.storage-warning')).toBeVisible();
  const form=page.locator('form[data-exercise]').first();await form.locator('input').fill('-0.25');await form.locator('button').click();
  await expect(form.locator('.feedback')).toHaveAttribute('data-state','correct');
});

test('the old Karpathy URL reaches the unchanged supplementary workbench',async({page})=>{
  await page.goto('/karpathy/');await expect(page).toHaveURL(/\/deep-learning\/karpathy\//);
});

test('original source is linked immediately and embedded only on request',async({page})=>{
  await page.goto(lesson);await expect(page.locator('iframe')).toHaveCount(0);
  await page.route('https://home.cs.colorado.edu/**',route=>route.abort());
  await page.locator('[data-show-source]').click();await expect(page.locator('iframe')).toHaveCount(1);
  await expect(page.locator('.source-link')).toBeVisible();await page.locator('[data-show-source]').click();
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('mobile lessons retain readable content and no horizontal overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(lesson);await expect(page.locator('h1')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await page.locator('.exercise textarea').first().fill('یک مرز خطی دو گوشه مقابل را جدا نمی‌کند.');
  await page.screenshot({path:test.info().outputPath('danna-lesson-mobile.png'),fullPage:true});expect(errors).toEqual([]);
});

test('exported Shinylive trains Python and canvas predictions match actual weights',async({page})=>{
  test.setTimeout(150000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/deep-learning/runtime/neuron-xor/');
  await page.waitForFunction(()=>[...document.querySelectorAll('iframe')].some(f=>f.contentWindow?.dannaLab?.state),{},{timeout:90000});
  const frame=page.frames().find(f=>f!==page.mainFrame());
  await frame.locator('#max_epochs').fill('137');await frame.locator('#max_epochs').press('Tab');
  await frame.waitForFunction(()=>window.dannaLab.state.config.max_epochs===137);
  await frame.getByRole('button',{name:'یک دوره جلو',exact:true}).click();
  await frame.waitForFunction(()=>window.dannaLab.state.epoch===1);
  await frame.getByRole('button',{name:'شروع / ادامه',exact:true}).click();
  await frame.waitForFunction(()=>window.dannaLab.state.epoch===137);
  const codeDir=fileURLToPath(new URL('../../deep-learning/python/',import.meta.url));
  const expected=JSON.parse(execFileSync('python3',['-c','import json,sys;sys.path.insert(0,sys.argv[1]);from live_training import TrainingRun;s=TrainingRun(max_epochs=137);s.step(137);print(json.dumps(s.snapshot()))',codeDir],{encoding:'utf8'}));
  const actual=await frame.evaluate(()=>window.dannaLab.state);
  actual.weights.flat(2).forEach((value,i)=>expect(value).toBeCloseTo(expected.weights.flat(2)[i],12));
  expect(actual.loss).toBeCloseTo(expected.loss,12);
  expect(await frame.evaluate(()=>Math.max(...window.dannaLab.state.inputs.map((x,i)=>Math.abs(window.dannaLab.forward(x)-window.dannaLab.state.probabilities[i]))))).toBeLessThan(1e-12);
  await frame.getByRole('button',{name:'از ابتدا',exact:true}).click();await frame.waitForFunction(()=>window.dannaLab.state.epoch===0);
  await frame.locator('#hidden').fill('1.5');await frame.locator('#hidden').press('Tab');
  await expect(frame.locator('#status')).toContainText('تنظیمات معتبر نیست');
  await frame.waitForFunction(()=>!window.dannaLab);
  expect(errors).toEqual([]);
});

test('network playground reproduces Python training and seals final test evaluation',async({page})=>{
  test.setTimeout(150000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/deep-learning/runtime/network-playground/');
  await page.waitForFunction(()=>[...document.querySelectorAll('iframe')].some(f=>f.contentWindow?.dannaNetwork?.state),{},{timeout:90000});
  const frame=page.frames().find(f=>f!==page.mainFrame());
  expect(await frame.evaluate(()=>window.dannaNetwork.state.test)).toBeNull();
  expect(await frame.evaluate(()=>window.dannaNetwork.state.points.some(p=>p.split==='test'))).toBeFalsy();
  await frame.getByText('تنظیمات داده و روش یادگیری',{exact:true}).click();
  await frame.locator('#max_epochs').fill('13');await frame.locator('#max_epochs').press('Tab');
  await frame.waitForFunction(()=>window.dannaNetwork.state.config.max_epochs===13);
  await frame.getByRole('button',{name:'شروع / ادامه',exact:true}).click();
  await frame.waitForFunction(()=>window.dannaNetwork.state.epoch===13);
  const codeDir=fileURLToPath(new URL('../../deep-learning/python/',import.meta.url));
  const expected=JSON.parse(execFileSync('python3',['-c','import json,sys;sys.path.insert(0,sys.argv[1]);from network_playground import NetworkExperiment,features;r=NetworkExperiment(max_epochs=13);r.step(13);s=r.snapshot();s["predictions"]=[r.network.forward(features(p["x"],r.config["feature_names"]))[0][-1][0] for p in s["points"]];s["final_test"]=r.finalize();print(json.dumps(s))',codeDir],{encoding:'utf8'}));
  const actual=await frame.evaluate(()=>window.dannaNetwork.state);
  actual.weights.flat(2).forEach((value,i)=>expect(value).toBeCloseTo(expected.weights.flat(2)[i],11));
  expect(actual.train.loss).toBeCloseTo(expected.train.loss,12);
  expect(actual.validation.loss).toBeCloseTo(expected.validation.loss,12);
  const predictions=await frame.evaluate(()=>window.dannaNetwork.state.points.map(p=>window.dannaNetwork.forward(p.x)));
  predictions.forEach((value,i)=>expect(value).toBeCloseTo(expected.predictions[i],11));
  await frame.getByRole('button',{name:'پایان آموزش و مشاهده آزمون',exact:true}).click();
  await frame.waitForFunction(()=>window.dannaNetwork.state.sealed);
  expect((await frame.evaluate(()=>window.dannaNetwork.state.test)).loss).toBeCloseTo(expected.final_test.loss,12);
  await frame.getByRole('button',{name:'یک دوره جلو',exact:true}).click();
  await expect(frame.locator('#status')).toContainText('اجرای معتبر و باز');
  expect(await frame.evaluate(()=>window.dannaNetwork.state.epoch)).toBe(13);
  const downloadPromise=page.waitForEvent('download');
  await frame.getByRole('link',{name:'دریافت آزمایش',exact:true}).click();
  const download=await downloadPromise;const saved=JSON.parse(readFileSync(await download.path(),'utf8'));
  expect(saved.sealed).toBeTruthy();expect(saved.epoch).toBe(13);expect(saved.points).toHaveLength(200);
  await page.setViewportSize({width:390,height:844});
  expect(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await frame.locator('#decision').scrollIntoViewIfNeeded();
  await page.screenshot({path:test.info().outputPath('network-mobile-results.png')});
  await frame.getByRole('button',{name:'از ابتدا',exact:true}).click();
  await frame.waitForFunction(()=>window.dannaNetwork.state.epoch===0&&!window.dannaNetwork.state.sealed);
  await frame.locator('#layers').fill('1.5');await frame.locator('#layers').press('Tab');
  await expect(frame.locator('#status')).toContainText('تنظیمات معتبر نیست');
  await frame.waitForFunction(()=>!window.dannaNetwork);
  expect(errors).toEqual([]);
});
