import {test,expect} from '@playwright/test';

test('source attention film plays in place without loading a model or changing the slide',async({page})=>{
 const weights=[];page.on('request',request=>{if(/\.onnx(?:\?|$)/.test(request.url()))weights.push(request.url());});
 await page.goto('/deep-learning/terms/spring-2026/s13/slides/#page=27');
 const play=page.locator('[data-source-interactive="attention"]');await expect(play).toBeVisible();
 await play.click();
 const tool=page.frameLocator('[data-reader-tools-frame]');
 await expect(tool.getByRole('heading',{name:'محاسبهٔ توجه (Self-attention)'})).toBeVisible();
 const video=tool.locator('video');await expect(video).toHaveAttribute('controls','');
 await expect(video).not.toHaveAttribute('autoplay');
 await video.evaluate(async node=>{await node.play();});
 await expect.poll(()=>video.evaluate(node=>node.currentTime)).toBeGreaterThan(0);
 await expect(tool.locator('track')).toHaveAttribute('srclang','fa');
 await page.getByRole('button',{name:'اسلاید',exact:true}).click();
 await expect(page.locator('[data-reader-tools-frame]')).toHaveAttribute('src','about:blank');
 expect(await page.evaluate(()=>sourceSlideReader.page)).toBe(27);
 expect(weights).toEqual([]);
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
