import {test,expect} from '@playwright/test';

test('convolution film and matching notebook chapters navigate without executing or editing code',async({page})=>{
 await page.goto('/deep-learning/terms/spring-2026/s05/practice/?source-page=27#code');
 const cells=page.locator('[data-notebook-cell]');await expect(cells).toHaveCount(3);
 const before=await page.evaluate(()=>({cells:studentNotebook.cells,record:studentNotebook.record}));
 expect(before.record).toBeNull();
 const first=page.locator('[data-film-jump="1"]');await first.click();
 const frame=page.frameLocator('[data-notebook-film]'),video=frame.locator('video');
 await expect(video).toBeVisible();
 await expect.poll(()=>video.evaluate(node=>node.currentTime)).toBeCloseTo(6.8,1);
 expect(await video.evaluate(node=>node.paused)).toBe(true);
 expect(await page.evaluate(()=>studentNotebook.cells)).toEqual(before.cells);
 expect(await page.evaluate(()=>studentNotebook.record)).toBeNull();
 for(const [label,index] of [['ورودی',0],['فیلتر',0],['حلقه ها',1],['ضرب و جمع',1],['خروجی',2]]){
  await frame.getByRole('button',{name:label,exact:true}).click();
  await expect(cells.nth(index)).toHaveAttribute('data-film-related','');
  expect(await frame.getByRole('button',{name:label,exact:true}).evaluate(node=>document.activeElement===node)).toBe(true);
 }
 expect(await video.evaluate(node=>node.paused)).toBe(true);
 for(const [index,time] of [[0,.1],[1,6.8],[2,13.5]]){
  await page.locator(`[data-film-jump="${index}"]`).click();
  await expect.poll(()=>video.evaluate(node=>node.currentTime)).toBeCloseTo(time,1);
  expect(await video.evaluate(node=>node.paused)).toBe(true);
 }
 await video.evaluate(node=>node.play());
 await frame.getByRole('button',{name:'فیلتر',exact:true}).click();
 expect(await video.evaluate(node=>node.paused)).toBe(false);
 await video.evaluate(node=>node.pause());
 expect(await page.evaluate(()=>studentNotebook.cells)).toEqual(before.cells);
 expect(await page.evaluate(()=>studentNotebook.record)).toBeNull();
 await page.evaluate(()=>window.dispatchEvent(new MessageEvent('message',{origin:location.origin,data:{type:'danna-film-chapter',film:'convolution-code',chapter:4}})));
 await expect(cells.nth(0)).toHaveAttribute('data-film-related','');
 await cells.first().locator('.cm-content').click();await page.keyboard.insertText('# edit\n');
 await expect(page.locator('[data-film-jump="1"]')).toBeDisabled();
 await expect(page.locator('.nb-film-note')).toContainText('کد تغییر کرده');
 expect(await video.evaluate(node=>node.paused)).toBe(true);
 await cells.first().getByRole('button',{name:'بازگرداندن سلول ۱'}).click();
 await expect(page.locator('[data-film-jump="1"]')).toBeEnabled();
 await page.locator('[data-notebook-add]').click();
 await expect(page.locator('[data-film-jump="1"]')).toBeDisabled();
});

test('convolution notebook keeps film and cells usable on a phone',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/deep-learning/terms/spring-2026/s05/practice/?source-page=27#code');
 await page.locator('[data-film-jump="0"]').click();
 const frame=page.frameLocator('[data-notebook-film]');
 await expect(frame.locator('video')).toBeVisible();
 await frame.getByRole('button',{name:'حلقه ها'}).click();
 await expect(page.locator('[data-notebook-cell="1"]')).toHaveAttribute('data-film-related','');
 const list=page.locator('.nb-cells');expect((await list.boundingBox()).height).toBeGreaterThan(60);
});

test('source attention film plays in place without loading a model or changing the slide',async({page})=>{
 const weights=[];page.on('request',request=>{if(/\.onnx(?:\?|$)/.test(request.url()))weights.push(request.url());});
 await page.goto('/deep-learning/terms/spring-2026/s13/slides/#page=27');
 const play=page.locator('[data-source-interactive="attention"]');await expect(play).toBeVisible();
 await play.click();
 const tool=page.frameLocator('[data-reader-tools-frame]');
 await expect(tool.getByRole('heading',{name:'محاسبه توجه (Self-attention)'})).toBeVisible();
 const video=tool.locator('video');await expect(video).toHaveAttribute('controls','');
 await expect(video).not.toHaveAttribute('autoplay');
 await video.evaluate(async node=>{await node.play();});
 await expect.poll(()=>video.evaluate(node=>node.currentTime)).toBeGreaterThan(0);
 await expect(tool.locator('track')).toHaveAttribute('srclang','fa');
 await tool.getByRole('button',{name:'وزن‌ها',exact:true}).click();
 await expect.poll(()=>video.evaluate(node=>node.currentTime)).toBeCloseTo(5.8,1);
 expect(await video.evaluate(node=>node.paused)).toBe(true);
 await page.getByRole('button',{name:'اسلاید',exact:true}).click();
 await expect(page.locator('[data-reader-tools-frame]')).toHaveAttribute('src','about:blank');
 expect(await page.evaluate(()=>sourceSlideReader.page)).toBe(27);
 expect(weights).toEqual([]);
});

test('film chapters explain a failed download and allow retry',async({page})=>{
 await page.goto('/deep-learning/animations/attention/');
 const film='**/assets/media/attention.mp4*';
 await page.route(film,route=>route.abort());
 const chapter=page.getByRole('button',{name:'وزن‌ها',exact:true});
 await chapter.focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('status')).toContainText('دوباره تلاش کنید');
 await page.unroute(film);
 await chapter.click();
 await expect(page.locator('.film-status')).toBeEmpty();
 await expect.poll(()=>page.locator('video').evaluate(node=>node.currentTime)).toBeCloseTo(5.8,1);
});

test('film chapters show loading while a slow download is in progress',async({page})=>{
 await page.goto('/deep-learning/animations/attention/');
 await page.route('**/assets/media/attention.mp4*',async route=>{
  await new Promise(resolve=>setTimeout(resolve,1000));
  await route.continue();
 });
 await page.getByRole('button',{name:'وزن‌ها',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('در حال بارگیری فیلم');
 await expect(page.locator('.film-status')).toBeEmpty({timeout:30000});
});

test('convolution code film is available only on the matching source pages',async({page})=>{
 await page.goto('/deep-learning/terms/spring-2026/s05/slides/#page=27');
 const button=page.getByRole('button',{name:'فیلم کد کانولوشن'});
 await expect(button).toBeVisible();
 await button.click();
 const film=page.frameLocator('[data-reader-tools-frame]');
 await expect(film.getByRole('heading',{name:'کد کانولوشن (Convolution)'})).toBeVisible();
 await expect(film.locator('track')).toHaveAttribute('srclang','fa');
 await film.getByRole('button',{name:'ضرب و جمع'}).click();
 await expect.poll(()=>film.locator('video').evaluate(node=>node.currentTime)).toBeCloseTo(9.4,1);
 await page.locator('[data-page-select]').selectOption('38');
 await expect(button).toHaveCount(0);
});

test('full model entry is source-bound and does not download weights on entry',async({page})=>{
 const weights=[];page.on('request',request=>{if(/\.onnx(?:\?|$)/.test(request.url()))weights.push(request.url());});
 await page.goto('/deep-learning/terms/spring-2026/s08/slides/#page=36');
 await page.locator('[data-source-interactive="resnet152-v1"]').click();
 const tool=page.frameLocator('[data-reader-tools-frame]');
 await expect(tool.getByRole('heading',{name:'شبکهٔ کامل ResNet152-v1'})).toBeVisible();
 await expect(tool.locator('[data-download-size]')).toContainText(/241|230|MB|مگابایت/);
 expect(weights).toEqual([]);
 await page.locator('[data-next-page]').click();
 await expect(page.locator('[data-source-interactive="resnet152-v1"]')).toHaveCount(0);
 await expect(page.locator('[data-reader-tools-frame]')).toHaveAttribute('src','about:blank');
});

test('MNIST trains a real batch on explicit CPU and exposes the authentic images',async({page})=>{
 test.setTimeout(90000);
 let pixelRequests=0;page.on('request',request=>{if(request.url().endsWith('/pixels.bin'))pixelRequests++;});
 await page.goto('/deep-learning/playgrounds/cnn-mnist/train/');
 expect(pixelRequests).toBe(0);
 await page.locator('[name=backend]').selectOption('cpu');
 await page.locator('[data-load]').click();
 await page.waitForFunction(()=>window.mnistLab?.state?.step===0&&!document.querySelector('[data-step]').disabled,null,{timeout:60000});
 await expect(page.locator('[name=epochs]')).toHaveAttribute('max','100');
 await page.locator('[name=epochs]').fill('101');
 await page.locator('[data-start]').click();
 await expect(page.locator('[data-error]')).toContainText('۱۰۰');
 await page.locator('[name=epochs]').fill('21');
 await page.locator('[data-start]').click();
 await expect(page.locator('[data-error]')).toBeHidden();
 await page.waitForFunction(()=>window.mnistLab.state.step>=1);
 await page.locator('[data-pause]').click();
 await expect(page.locator('[data-start]')).toBeEnabled();
 const pausedStep=await page.evaluate(()=>mnistLab.state.step);
 await page.locator('[name=epochs]').fill('100');
 await page.locator('[data-start]').click();
 await page.waitForFunction(step=>window.mnistLab.state.step>step,pausedStep);
 await page.locator('[data-pause]').click();
 await expect(page.locator('[data-start]')).toBeEnabled();
 await page.locator('[data-reset]').click();
 await page.waitForFunction(()=>window.mnistLab?.state?.step===0&&!document.querySelector('[data-step]').disabled);
 const before=await page.evaluate(()=>mnistLab.snapshot());
 await page.locator('[data-step]').click();
 await page.waitForFunction(()=>window.mnistLab.state.step===1&&!document.querySelector('[data-step]').disabled);
 const after=await page.evaluate(()=>mnistLab.snapshot());
 expect(after.state.batchIndices).toHaveLength(32);
 expect(after.state.batchIndices.every(index=>index>=0&&index<2000)).toBe(true);
 expect(after.weights[0].values.some((value,index)=>Math.abs(value-before.weights[0].values[index])>1e-7)).toBe(true);
 await page.getByRole('button',{name:'داده‌ها',exact:true}).click();
 await expect(page.locator('[data-training-digits] canvas')).toHaveCount(32);
 await expect(page.locator('[data-validation-digits] canvas')).toHaveCount(20);
 expect(await page.locator('[data-training-digits] canvas').first().evaluate(canvas=>{
  const pixels=canvas.getContext('2d').getImageData(0,0,28,28).data;
  return pixels.some((value,index)=>index%4!==3&&value>0);
 })).toBe(true);
 expect(pixelRequests).toBe(1);
});

test('MNIST selects every digit and validates current weights on held-out data',async({page})=>{
 test.setTimeout(120000);
 await page.goto('/deep-learning/playgrounds/cnn-mnist/train/');
 await page.locator('[name=backend]').selectOption('cpu');
 await page.locator('[data-load]').click();
 await page.waitForFunction(()=>window.mnistLab?.state?.step===0&&!document.querySelector('[data-step]').disabled,null,{timeout:60000});
 const digits=page.locator('[data-strip] button');await expect(digits).toHaveCount(10);
 expect(await digits.evaluateAll(items=>items.map(item=>Number(item.dataset.label)).sort((a,b)=>a-b))).toEqual([0,1,2,3,4,5,6,7,8,9]);
 let previousFeatures;for(let number=0;number<10;number++){
  const digit=page.locator(`[data-strip] button[data-label="${number}"]`);await digit.click();
  await expect(digit).toHaveAttribute('aria-pressed','true');
  const view=await page.evaluate(()=>mnistLab.view);expect(view.selectedPrediction).toHaveLength(10);expect(view.features).toHaveLength(28*28*8);if(previousFeatures)expect(view.features.some((x,i)=>Math.abs(x-previousFeatures[i])>1e-7)).toBe(true);previousFeatures=view.features;
 }
 await page.locator('[data-step]').click();await page.waitForFunction(()=>mnistLab.state.step===1&&!document.querySelector('[data-step]').disabled);
 const before=await page.evaluate(()=>mnistLab.snapshot());await page.locator('[data-validate]').click();
 await expect(page.locator('[data-validation-summary]')).toContainText('۵۰۰');await expect(page.locator('[data-validation-classes] tr')).toHaveCount(10);
 const counts=await page.locator('[data-validation-classes] tr').evaluateAll(rows=>rows.map(row=>row.children[2].textContent));
 const persian='۰۱۲۳۴۵۶۷۸۹';expect(counts.map(v=>Number([...v].map(c=>persian.includes(c)?persian.indexOf(c):c).join(''))).reduce((a,b)=>a+b,0)).toBe(500);
 const after=await page.evaluate(()=>mnistLab.snapshot());expect(after.weights).toEqual(before.weights);await expect(page.locator('[data-validation-summary]')).toContainText('دسته ۱');await page.locator('[data-step]').click();await page.waitForFunction(()=>mnistLab.state.step===2&&!document.querySelector('[data-step]').disabled);await expect(page.locator('[data-validation-summary]')).toContainText('دوباره اعتبارسنجی');
 await page.getByRole('button',{name:'داده‌ها',exact:true}).click();await page.locator('[data-browse-split]').selectOption('validation');
 await page.locator('[data-browse-label]').selectOption('3');expect(await page.locator('[data-browse-digits] button').count()).toBeGreaterThan(0);expect(await page.locator('[data-browse-digits] button').evaluateAll(items=>items.every(item=>item.dataset.label==='3'))).toBe(true);await page.locator('[data-browse-label]').selectOption('all');
 const outside=await page.evaluate(()=>{const gallery=mnistLab.view.gallery;return [...document.querySelectorAll('[data-browse-digits] button')].find(el=>!gallery.includes(Number(el.dataset.validationIndex)))?.dataset.validationIndex});
 expect(outside).toBeDefined();await page.locator(`[data-browse-digits] button[data-validation-index="${outside}"]`).click();
 await expect(page.locator('[data-tab-button=train]')).toHaveAttribute('aria-pressed','true');expect(await page.evaluate(()=>mnistLab.view.selected)).toBe(Number(outside));
 await expect(page.locator('[data-selected-caption]')).not.toContainText('−۱');
});

test('page quizzes preserve symbolic and vector options with isolated left-to-right text',async({page})=>{
 await page.goto('/deep-learning/terms/spring-2026/s03/practice/?source-page=85#questions');
 await expect(page.locator('.nb-question').first()).toBeVisible();
 const values=await page.locator('.nb-question label.choice span').evaluateAll(items=>items.map(item=>({text:item.textContent,isolated:[...item.querySelectorAll('bdi')].map(part=>({text:part.textContent,dir:part.dir}))})));
 expect(values.length).toBeGreaterThan(0);
 const symbolic=values.filter(item=>/[=η∂\[\]]/.test(item.text));expect(symbolic.length).toBeGreaterThan(0);
 expect(symbolic.every(item=>item.isolated.some(part=>part.dir==='ltr'))).toBe(true);
});

test('MNIST mobile controls expose real training and the browsable dataset',async({baseURL})=>{
 test.setTimeout(120000);
 const {execFile}=await import('node:child_process');
 const {promisify}=await import('node:util');
 const {stdout}=await promisify(execFile)(process.execPath,['mnist-readability.mjs'],{
  cwd:import.meta.dirname,env:{...process.env,SITE_BASE_URL:baseURL},timeout:110000,
 });
 expect(stdout).toContain('PASS real CPU MNIST batch');
});

test('lesson one activity draws on the source figure with pointer and keyboard',async({browser})=>{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  const page=await context.newPage();
  await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=53');
  await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===53);
  const toggle=page.locator('[data-capacity-toggle]');await expect(toggle).toBeVisible();await toggle.click();
  const area=page.locator('.capacity-overlay rect[role=application]');await expect(area).toBeVisible();
  const box=await area.boundingBox();expect(box).not.toBeNull();
  for(const mode of ['line','parabola','curve']){
   await page.locator(`[data-capacity-mode="${mode}"]`).click();
   await page.mouse.move(box.x+box.width*.25,box.y+box.height*.3);await page.mouse.down();
   await page.mouse.move(box.x+box.width*.7,box.y+box.height*.7,{steps:6});await page.mouse.up();
   await expect(page.locator(`[data-boundary="${mode}"]`)).toHaveAttribute('d',/^M .+/);
  }
  await page.getByRole('button',{name:'پاک کردن',exact:true}).click();
  await expect(page.locator('[data-boundary=line]')).toHaveAttribute('d','');
  await page.locator('[data-capacity-mode=line]').click();await area.focus();await page.keyboard.press('Enter');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  await expect(page.locator('[data-boundary=line]')).toHaveAttribute('d',/^M .+ L .+/);
  await page.locator('[data-next-page]').click();await expect(toggle).toBeHidden();await expect(page.locator('.capacity-overlay')).toBeHidden();
  await context.close();
 }
});

test('lesson one page 53 notebook runs its editable boundary equations',async({page})=>{
 test.setTimeout(120000);
 await page.goto('/deep-learning/terms/spring-2026/s01/practice/?source-page=53#code');
 await page.locator('[data-notebook-run-all]').click();
 await expect.poll(()=>page.evaluate(()=>window.studentNotebook?.record?.ok),{timeout:90000}).toBe(true);
 const result=await page.evaluate(()=>studentNotebook.record.outputs.at(-1).result);
 expect(result).toEqual({x:[-2,-1,0,1,2],line:[-2,-1,0,1,2],parabola:[4,1,0,1,4]});
});

test('lesson one source questions open on their matching pages',async({page})=>{
 for(const [number,expected] of [[32,'دیدن'],[35,'قاعده'],[36,'موازی'],[37,'موازی'],[42,'برچسب'],[43,'ضربدر'],[49,'محبوبیت'],[53,'نمادهای'],[57,'خاکستری'],[65,'ارزیابی'],[83,'خوراکی یا سمی'],[84,'خوراکی یا سمی']]){
  await page.goto(`/deep-learning/terms/spring-2026/s01/practice/?source-page=${number}#questions`);
  const questions=page.locator('[data-notebook-question]');await expect(questions.first()).toBeVisible();
  await expect(questions.filter({hasText:expected}).first()).toBeVisible();
  expect(await questions.locator('input[type=radio]').count()).toBeGreaterThanOrEqual(2);
 }
});
