import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
async function open(page,lab='network-playground'){
 await page.goto(`/deep-learning/runtime/${lab}/`);await page.waitForFunction(()=>window.labWorkspace?.liveState(),null,{timeout:90000});
 return page.frames().find(f=>f!==page.mainFrame());
}
async function apply(page){await Promise.all([page.waitForEvent('load'),page.locator('[data-apply]').click()]);await page.waitForFunction(()=>window.labWorkspace?.liveState(),null,{timeout:90000});return page.frames().find(f=>f!==page.mainFrame());}

test('all three labs share a compact workspace with commented code beside the live result',async({page})=>{
 test.setTimeout(180000);
 for(const [lab,global] of [['neuron-xor','dannaLab'],['network-playground','dannaNetwork'],['convolution','dannaConvolution']]){
  const frame=await open(page,lab);await expect(frame.locator('main')).toHaveAttribute('data-workspace-ready','true');
  expect(await frame.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBeTruthy();
  await expect(frame.locator('[role=tab]')).toHaveCount(3);
  await page.locator('[data-code-toggle]').click();await expect(page.locator('#source-code')).toBeVisible();
  await expect(page.locator('.host-view')).toBeVisible();expect(await page.locator('#source-code').inputValue()).toContain('# BEGIN CONFIG');
  const before=await page.locator('#source-code').inputValue();await page.locator('#source-code').fill(before+'\n# یادداشت من\n');
  await page.locator('[data-code-close]').click();await page.locator('[data-code-toggle]').click();await expect(page.locator('#source-code')).toHaveValue(before+'\n# یادداشت من\n');
  await expect(page.locator('[data-code-state]')).toContainText('هنوز اجرا نشده');
  await frame.locator('[data-panel=results]').click();
  await expect(frame.locator(lab==='convolution'?'#calculation pre':lab==='neuron-xor'?'#truth_table table':'#metrics_table table')).toBeVisible();
  if(lab==='convolution')await expect(frame.locator('#final_matrix table').first()).toBeVisible();
 }
});

test('GUI settings capture preserves algorithm edits and the downloaded file is the draft',async({page})=>{
 test.setTimeout(120000);const frame=await open(page);
 await frame.getByText('تنظیمات داده و روش یادگیری',{exact:true}).click();
 await frame.locator('#learning_rate').fill('0.07');await frame.locator('#learning_rate').press('Tab');
 await frame.waitForFunction(()=>window.dannaNetwork?.state.config.learning_rate===.07);
 await page.locator('[data-code-toggle]').click();const editor=page.locator('#source-code');
 await editor.fill((await editor.inputValue()).replace('experiment.step(count)','experiment.step(count)  # یادداشت الگوریتم'));
 await expect(page.locator('[data-capture]')).toBeEnabled();await page.locator('[data-capture]').click();
 expect(await editor.inputValue()).toContain('"learning_rate": 0.07');expect(await editor.inputValue()).toContain('# یادداشت الگوریتم');
 const waiting=page.waitForEvent('download');await page.locator('[data-download]').click();expect(readFileSync(await(await waiting).path(),'utf8')).toBe(await editor.inputValue());
 const next=await apply(page);expect(await next.evaluate(()=>window.dannaNetwork.state.config.learning_rate)).toBe(.07);
 const recordDownload=page.waitForEvent('download');await next.getByRole('link',{name:'دریافت آزمایش',exact:true}).click();const record=JSON.parse(readFileSync(await(await recordDownload).path(),'utf8'));expect(record.source_files['experiment.py'].content).toContain('\"learning_rate\": 0.07');expect(record.source_files['network_playground.py'].sha256).toHaveLength(64);
});

test('editing the real optimizer changes training and editing forward changes the actual Python surface',async({page})=>{
 test.setTimeout(180000);let frame=await open(page);await page.locator('[data-code-toggle]').click();await page.locator('#code-section').selectOption('3');
 const editor=page.locator('#source-code');let source=await editor.inputValue();
 source=source.replace('value = self.network.params[i] - lr * step','value = self.network.params[i]  # توقف به‌روزرسانی');await editor.fill(source);frame=await apply(page);
 const before=await frame.evaluate(()=>window.dannaNetwork.state.weights);await frame.locator('#step').click();await frame.waitForFunction(()=>window.dannaNetwork.state.epoch===1);expect(await frame.evaluate(()=>window.dannaNetwork.state.weights)).toEqual(before);
 await page.locator('#code-section').selectOption('1');source=await editor.inputValue();source=source.replace('return activations, logits','activations[-1][0] = 0.25\n        return activations, logits');await editor.fill(source);frame=await apply(page);
 const state=await frame.evaluate(()=>window.dannaNetwork.state);
 expect(state.surface_grid.values.flat().every(x=>x===.25)).toBeTruthy();
 expect(await frame.evaluate(()=>window.deepLearningTopology.current.activations.at(-1)[0])).toBe(.25);
 await expect(page.locator('[data-code-state]')).toHaveText('اجرای کد ویرایش‌شده');
});

test('stopping an infinite user program preserves the editor and allows a clean restart',async({page})=>{
 test.setTimeout(180000);await open(page,'neuron-xor');await page.locator('[data-code-toggle]').click();
 const editor=page.locator('#source-code');await editor.fill('print("LOOP_STARTED", flush=True)\nwhile True:\n    pass\n');await page.locator('[data-apply]').click();await page.locator('[data-console-toggle]').click();await expect(page.locator('.shinylive-terminal')).toContainText('LOOP_STARTED',{timeout:65000});await expect(page.locator('[data-stop]')).toBeVisible();
 await page.locator('[data-stop]').click();await expect(page.locator('.stopped-view')).toBeVisible();await expect(editor).toHaveValue('print("LOOP_STARTED", flush=True)\nwhile True:\n    pass\n');
 await page.locator('[data-reset]').click();await apply(page);await expect(page.locator('[data-code-state]')).toHaveText('اجرای کد اولیه');
});

test('phone switches between code, settings and result without stacking long pages',async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:390,height:844});const frame=await open(page);
 await frame.getByRole('button',{name:'داده و تنظیمات',exact:true}).click();await expect(frame.locator('#layers')).toBeVisible();
 await frame.getByRole('button',{name:'داده و تنظیمات',exact:true}).click();await expect(frame.locator('#network')).toBeVisible();
 expect(await frame.evaluate(()=>innerWidth)).toBeLessThanOrEqual(await page.locator('.host-view').evaluate(e=>e.clientWidth));
 await page.locator('[data-code-toggle]').click();await expect(page.locator('#source-code')).toBeVisible();await expect(page.locator('.host-view')).toBeHidden();
 await page.locator('[data-code-close]').click();await expect(page.locator('.host-view')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1 && document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});

test('a real neuron can be inspected with keyboard and the existing lesson links enter the workspace directly',async({page})=>{
 test.setTimeout(120000);await page.goto('/deep-learning/playgrounds/neuron-xor/');await page.waitForURL('**/runtime/neuron-xor/');await page.waitForFunction(()=>window.labWorkspace?.liveState(),null,{timeout:90000});
 const frame=page.frames().find(f=>f!==page.mainFrame());await frame.locator('#network').focus();await frame.locator('#network').press('ArrowRight');
 await expect(frame.locator('.neuron-inspector')).toContainText('وزن‌های ورودی');await expect(frame.locator('.neuron-inspector')).toContainText('از پایتون');
});

 test('Python syntax errors explain recovery and keep the draft editable',async({page})=>{
 test.setTimeout(120000);await open(page,'convolution');await page.locator('[data-code-toggle]').click();await page.locator('#source-code').fill('def broken(:\n    pass');await page.locator('[data-apply]').click();
 await expect(page.locator('[data-host-status]')).toContainText('خطا داد',{timeout:65000});await expect(page.locator('#source-code')).toBeEditable();
 await expect(page.locator('.shinylive-terminal')).toContainText('SyntaxError');await page.locator('[data-reset]').click();await apply(page);await expect(page.locator('[data-code-state]')).toHaveText('اجرای کد اولیه');
});
