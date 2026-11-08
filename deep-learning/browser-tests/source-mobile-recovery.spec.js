import {test, expect} from '@playwright/test';

const url='/deep-learning/terms/spring-2026/s01/slides/#page=1';
async function inject(page, before, after) {
 await page.route('**/source-reader.js*', async route=>{
  const response=await route.fetch(); const source=await response.text();
  if(!source.includes(before)) throw new Error('Recovery test injection did not match');
  await route.fulfill({response, headers:{...response.headers(),'cache-control':'no-store'}, body:source.replace(before,after)});
 });
}
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3});
test('a link annotation failure keeps both slide and translation usable', async ({page})=>{
 const warnings=[], requests=[];page.on('console',msg=>{if(msg.type()==='warning')warnings.push(msg.text());});
 page.on('request',request=>requests.push(request.url()));
 await inject(page,"await source.getAnnotations({intent:'display'})","await Promise.reject(new Error('injected annotation failure'))");
 await page.goto(url);
 await expect.poll(()=>page.evaluate(()=>window.sourceSlideReader?.ready)).toBe(true);
 await expect(page.locator('#source-canvas')).toBeVisible();
 await page.locator('[data-view-translation]').click();
 await expect.poll(()=>page.evaluate(()=>window.sourceSlideReader?.ready)).toBe(true);
 await expect(page.locator('#persian-page')).not.toBeEmpty();
 await expect(page.locator('[data-reader-status]')).toContainText('پیوندهای اسلاید در دسترس نیستند');
 expect(warnings.some(message=>message.includes('Slide links unavailable'))).toBeTruthy();
 expect(requests.some(url=>/s01-pages\/001\.pdf/.test(url))).toBeTruthy();
});
test('a Persian layout failure falls back to the translation', async ({page})=>{
 const warnings=[];page.on('console',msg=>{if(msg.type()==='warning')warnings.push(msg.text());});
 await inject(page,'await paintPersianLayout(layoutSource,source,id,selected)',"await Promise.reject(new Error('injected layout failure'))");
 await page.goto(url);
 await expect.poll(()=>page.evaluate(()=>window.sourceSlideReader?.ready)).toBe(true);
 await page.locator('[data-view-translation]').click();
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','layout-error-fallback');
 await expect(page.locator('#persian-page')).toBeVisible();
 await expect(page.locator('#persian-page')).not.toBeEmpty();
 await expect(page.locator('[data-reader-status]')).toContainText('نمایش ساده ترجمه');
 expect(warnings.some(message=>message.includes('Persian slide layout unavailable'))).toBeTruthy();
});
test('the first page uses an image when the source page fails and can retry', async ({page})=>{
 await inject(page,'await pdf.getPage(selected)',"await Promise.reject(new Error('injected page failure'))");
 await page.goto(url);
 await expect(page.locator('.source-cover-fallback')).toBeVisible();
 await expect(page.locator('[data-reader-status]')).toContainText('نمایش تصویری');
 await expect(page.locator('[data-retry-load]')).toBeVisible();
 expect(await page.evaluate(()=>window.sourceSlideReader?.ready)).toBe(true);
 await page.unroute('**/source-reader.js*');
 await page.locator('[data-retry-load]').click();
 await expect.poll(()=>page.evaluate(()=>window.sourceSlideReader?.ready)).toBe(true);
 await expect(page.locator('#source-canvas')).toBeVisible();
});

test('other source page failures remain visible and offer retry', async ({page})=>{
 await inject(page,'await pdf.getPage(selected)',"await Promise.reject(new Error('injected page failure'))");
 await page.goto('/deep-learning/terms/spring-2026/s01/slides/#page=2');
 await expect(page.locator('[data-reader-status]')).toHaveAttribute('data-error','true');
 await expect(page.locator('#original-panel .reader-placeholder')).toBeHidden();
 await expect(page.locator('#original-panel')).toHaveAttribute('aria-busy','false');
 await expect(page.locator('[data-retry-load]')).toBeVisible();
 await expect(page.locator('.source-cover-fallback')).toHaveCount(0);
});
test('a cache read failure falls back to a verified network page', async ({page})=>{
 await page.addInitScript(()=>{Cache.prototype.match=async()=>{throw new Error('injected cache read failure');};});
 const requests=[];page.on('request',request=>requests.push(request.url()));
 await page.goto(url);
 await expect.poll(()=>page.evaluate(()=>window.sourceSlideReader?.ready)).toBe(true);
 await expect(page.locator('#source-canvas')).toBeVisible();
 expect(requests.some(url=>/s01-pages\/001\.pdf/.test(url))).toBeTruthy();
});
test('a corrupt network PDF is rejected before image fallback', async ({page})=>{
 await page.route('**/s01-pages/001.pdf?*',route=>route.fulfill({status:200,contentType:'application/pdf',body:'not a valid page'}));
 const warnings=[];page.on('console',msg=>{if(msg.type()==='warning')warnings.push(msg.text());});
 await page.goto(url);
 await expect(page.locator('.source-cover-fallback')).toBeVisible();
 expect(warnings.some(message=>message.includes('PDF identity mismatch'))).toBeTruthy();
});
test('a corrupt cached page with unavailable deletion is fetched again', async ({page})=>{
 await page.addInitScript(()=>{
  Cache.prototype.match=async()=>new Response('corrupt cached bytes');
  Cache.prototype.delete=async()=>{throw new Error('injected cache deletion failure');};
 });
 const warnings=[];page.on('console',message=>{if(message.type()==='warning')warnings.push(message.text());});
 await page.goto(url);
 await expect.poll(()=>page.evaluate(()=>window.sourceSlideReader?.ready)).toBe(true);
 await expect(page.locator('#source-canvas')).toBeVisible();
 expect(warnings.some(message=>message.includes('Slide cache removal failed'))).toBeTruthy();
});
test('an unavailable canvas uses the first page image', async ({page})=>{
 await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null;});
 await page.goto(url);
 await expect(page.locator('.source-cover-fallback')).toBeVisible();
 await expect(page.locator('[data-retry-load]')).toBeVisible();
});
