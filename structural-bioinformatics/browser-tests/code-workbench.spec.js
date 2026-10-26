import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const route='/structural-bioinformatics/runtime/concepts/';
async function ready(page,mode='energy'){
 await page.goto(`${route}?experiment=${mode}&topic=14`);
 await expect(page.locator('iframe')).toHaveCount(1,{timeout:90000});
 const frame=page.frames().find(f=>f!==page.mainFrame());
 await frame.waitForFunction(mode=>window.structuralCodeWorkbench&&window.structuralLabState?.mode===mode&&!document.querySelector('#code-run').disabled,mode,{timeout:90000});
 return frame;
}
async function run(frame){
 await frame.locator('#code-run').click();
 await frame.waitForFunction(()=>window.structuralCodeResult,null,{timeout:90000});
 return frame.evaluate(()=>window.structuralCodeResult);
}
async function source(frame,text){await frame.evaluate(text=>window.structuralCodeWorkbench.setSource(text),text);}

test('all six editable algorithms execute in real browser Python and match independent references',async({page})=>{
 test.setTimeout(180000);
 const frame=await ready(page);
 for(const mode of ['energy','sequence','geometry','minimization','sampling','graph']){
  await frame.locator('#experiment').selectOption(mode);
  await expect.poll(()=>frame.evaluate(()=>window.structuralLabState.mode)).toBe(mode);
  await frame.locator('#code-reset').click();const result=await run(frame);
  expect(result.ok,JSON.stringify(result.error)).toBe(true);expect(result.reference).not.toBeNull();
  for(const[name,value]of Object.entries(result.result.metrics))expect(value).toBeCloseTo(result.reference.metrics[name],8);
  expect(result.source).toContain('# PARAMETERS BEGIN');expect(result.inputs.points).toHaveLength(76);
  await expect(frame.locator('#code-comparison table')).toBeVisible();
 }
});

test('algorithm edits, exact parameters, keyboard execution and notebook downloads reflect actual code',async({page})=>{
 test.setTimeout(120000);const frame=await ready(page,'minimization');
 await frame.locator('.cm-content').waitFor();
 const original=await frame.evaluate(()=>window.structuralCodeWorkbench.getSource());
 await source(frame,original.replace('return 2 * x','return x'));
 await frame.locator('.cm-content').focus();await page.keyboard.press('ControlOrMeta+End');await page.keyboard.insertText('\nprint("edited derivative")\n');
 await page.keyboard.press('ControlOrMeta+Enter');await frame.waitForFunction(()=>window.structuralCodeResult,null,{timeout:90000});
 let result=await frame.evaluate(()=>window.structuralCodeResult);
 expect(result.result.metrics.final_x).toBeCloseTo(4*0.75**6,10);expect(result.reference.metrics.final_x).toBe(0.0625);
 expect(result.stdout).toContain('edited derivative');
 await frame.locator('#rate').fill('0.12345678912345');await frame.locator('#rate').press('Tab');
 await expect.poll(()=>frame.evaluate(()=>window.structuralLabState.config.rate)).toBe(0.12345678912345);
 expect(await frame.evaluate(()=>window.structuralCodeWorkbench.getSource())).toContain('"rate": 0.25');
 await frame.locator('#code-sync').click();
 expect(await frame.evaluate(()=>window.structuralCodeWorkbench.getSource())).toContain('return x');
 result=await run(frame);expect(result.parameters.rate).toBe(0.12345678912345);
 await expect(frame.locator('#code-parameters')).toContainText('0.12345678912345');
 const pending=page.waitForEvent('download');await frame.locator('#code-download-result').click();const download=await pending;
 const saved=JSON.parse(await readFile(await download.path(),'utf8'));
 expect(saved.source).toContain('return x');expect(saved.parameters.rate).toBe(0.12345678912345);expect(saved.reference.metrics).toEqual(result.reference.metrics);
 await page.reload();await expect(page.locator('iframe')).toHaveCount(1,{timeout:90000});const restored=page.frames().find(f=>f!==page.mainFrame());
 await restored.waitForFunction(()=>window.structuralCodeWorkbench,null,{timeout:90000});
 await expect.poll(()=>restored.evaluate(()=>window.structuralCodeWorkbench.getSource())).toContain('return x');
 await expect(restored.locator('#code-history option')).toHaveCount(2);
});

test('code errors, manual stop and automatic timeout recover without stale numerical output',async({page})=>{
 test.setTimeout(180000);const frame=await ready(page);const original=await frame.evaluate(()=>window.structuralCodeWorkbench.getSource());
 await source(frame,'print("captured")\nraise ValueError("intentional exercise")');let result=await run(frame);
 expect(result.ok).toBe(false);expect(result.error.line).toBe(2);await expect(frame.locator('#code-output')).toContainText('captured');await expect(frame.locator('#code-status')).toContainText('خط 2');
 await expect(frame.locator('#code-comparison table')).toHaveCount(0);await expect(frame.locator('.cm-lintRange-error')).not.toHaveCount(0);
 await source(frame,'while True:\n    pass');await frame.locator('#code-run').click();
 await expect(frame.locator('#code-status')).toContainText('کد در حال اجراست',{timeout:90000});await frame.locator('#code-stop').click();
 await expect(frame.locator('#code-status')).toContainText('متوقف شد');await expect(frame.locator('#code-run')).toBeEnabled();
 await source(frame,'while True:\n    pass');await frame.locator('#code-run').click();
 await expect(frame.locator('#code-status')).toContainText('۵ ثانیه',{timeout:90000});
 await source(frame,original);result=await run(frame);expect(result.ok).toBe(true);
});

test('saved drafts remain independent per experiment and exported Python runs independently',async({page})=>{
 test.setTimeout(120000);const frame=await ready(page);
 await frame.locator('#code-reset').click();const text=await frame.evaluate(()=>window.structuralCodeWorkbench.getSource());
 await source(frame,text+'\n# saved energy draft\n');await run(frame);
 const pending=page.waitForEvent('download');await frame.locator('#code-download-source').click();const file=await pending;
 const code=await readFile(await file.path(),'utf8');const executed=spawnSync('python3',['-c',code],{encoding:'utf8'});
 expect(executed.status,executed.stderr).toBe(0);expect(JSON.parse(executed.stdout.slice(executed.stdout.indexOf('{'))).metrics.probability_b).toBeCloseTo(0.11920292202211755,12);
 await frame.locator('#experiment').selectOption('sequence');await expect.poll(()=>frame.evaluate(()=>window.structuralLabState.mode)).toBe('sequence');
 expect(await frame.evaluate(()=>window.structuralCodeWorkbench.getSource())).not.toContain('saved energy draft');
 await frame.locator('#experiment').selectOption('energy');await expect.poll(()=>frame.evaluate(()=>window.structuralLabState.mode)).toBe('energy');
 await expect.poll(()=>frame.evaluate(()=>window.structuralCodeWorkbench.getSource())).toContain('saved energy draft');
});

test('mobile editor is readable, keyboard accessible and falls back when rich editing or storage fails',async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('blocked');}}));
 await page.route('**/vendor/code-editor/editor.js',r=>r.abort());
 const frame=await ready(page);await expect(frame.locator('#python-source')).toBeVisible();
 const code=await frame.locator('#python-source').inputValue();await frame.locator('#python-source').fill(code+'\nprint("fallback")\n');
 await expect(frame.locator('#code-save-status')).toContainText('ذخیرهٔ پیش‌نویس ممکن نیست');
 const result=await run(frame);expect(result.stdout).toContain('fallback');
 expect(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(frame.locator('#code-download-result')).toBeEnabled();
});
