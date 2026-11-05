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

test('session one film opens from its relevant slide and plays',async({page})=>{
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=40');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready);
 await page.locator('[data-source-interactive="train-test"]').click();
 const film=page.frameLocator('[data-reader-tools-frame]');
 const video=film.locator('video');
 await film.getByRole('button',{name:'آموزش',exact:true}).click();
 await expect.poll(()=>video.evaluate(element=>element.currentTime)).toBeGreaterThanOrEqual(5.9);
 await video.evaluate(element=>element.play());
 await expect.poll(()=>video.evaluate(element=>element.currentTime)).toBeGreaterThan(6.1);
 expect(await video.evaluate(element=>element.error)).toBeNull();
});
