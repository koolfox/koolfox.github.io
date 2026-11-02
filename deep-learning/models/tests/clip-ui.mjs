import{chromium}from'../../browser-tests/node_modules/playwright/index.mjs';
import assert from'node:assert/strict';import{writeFile,mkdir}from'node:fs/promises';
const base=process.env.MODEL_VALIDATION_URL||'http://127.0.0.1:8876',entry='/deep-learning/results/model-validation/clip-ui-build/models/clip-vit-base-patch32/',dir=new URL('../../results/model-validation/clip-ui/',import.meta.url);await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=metal']});
try{
 const page=await browser.newPage({viewport:{width:1000,height:800}}),errors=[];let downloads=0;
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://huggingface.co/openai/clip-vit-base-patch32/**/pytorch_model.bin',async route=>{downloads++;await route.fulfill({status:302,headers:{location:base+'/deep-learning/results/model-validation/cache/clip/pytorch_model.bin','access-control-allow-origin':'*'}});});
 await page.goto(base+entry);await page.waitForSelector('body[data-ready=true]');assert.equal(downloads,0);
 const prompts=page.getByLabel('متن‌های مقایسه',{exact:true}),original=await prompts.inputValue();
 await prompts.fill('Only one candidate.');assert.ok(await page.locator('[data-run]').isDisabled());assert.equal(downloads,0);
 await prompts.fill([Array(90).fill('dog').join(' '),'car','plane','bird'].join('\n'));assert.ok(await page.locator('[data-run]').isDisabled());assert.match(await page.locator('[data-input-note]').textContent(),/۷۷/);
 await prompts.fill(original);await page.locator('[data-run]').click();await page.waitForSelector('[data-agreement]:not([hidden])',{timeout:120000});
 assert.match(await page.locator('[data-agreement]').textContent(),/۲٬۵۶۸/);assert.equal(await page.locator('.model-predictions li').count(),4);
 assert.match(await page.locator('.model-predictions li').nth(0).textContent(),/plane/);assert.match(await page.locator('.model-predictions li').nth(2).textContent(),/۹۹٫۷۳۹/);assert.equal(await page.locator('.model-cosine').count(),4);assert.equal(downloads,1);
 await page.screenshot({path:new URL('clip-desktop.png',dir).pathname});
 await prompts.fill(original.replace('A photo of a dog.','A photo of a cat.'));await page.locator('[data-run]').click();await page.waitForSelector('.model-predictions li');assert.equal(await page.locator('[data-agreement]').isVisible(),false);assert.match(await page.locator('.model-predictions li').nth(2).textContent(),/cat/);
 await prompts.fill(original);await page.getByLabel('تصویر من',{exact:true}).check();await page.getByLabel('تصویر ورودی',{exact:true}).setInputFiles(new URL('../references/clip-source-dog.png',import.meta.url).pathname);await page.waitForSelector('[data-preview]:not([hidden])');await page.locator('[data-run]').click();await page.waitForSelector('.model-predictions li');assert.match(await page.locator('.model-predictions li').nth(2).textContent(),/۹۹٫۷۳۹/);assert.equal(await page.locator('[data-agreement]').isVisible(),false);
 await page.setViewportSize({width:390,height:760});await page.screenshot({path:new URL('clip-mobile.png',dir).pathname});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 await writeFile(new URL('results.json',dir),JSON.stringify({passed:true,downloads,errors,checks:['no automatic checkpoint download','exact source dog and four prompts','all2568 values match independent PyTorch','source-order cosines and relative probabilities','edited prompts have no reference claim','uploaded source photo reproduces inference without reference claim','77token and4candidate validation','mobile no overflow']},null,2)+'\n');console.log('PASS full CLIP WebGPU UI, source image/text, editable prompts and image, all2568 reference outputs.');
}finally{await browser.close();}
