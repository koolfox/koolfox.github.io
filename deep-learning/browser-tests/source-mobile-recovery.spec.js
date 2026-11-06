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
test('a source page failure remains visible and offers retry', async ({page})=>{
 await inject(page,'await pdf.getPage(selected)',"await Promise.reject(new Error('injected page failure'))");
 await page.goto(url);
 await expect(page.locator('[data-reader-status]')).toHaveAttribute('data-error','true');
 await expect(page.locator('[data-retry-load]')).toBeVisible();
 expect(await page.evaluate(()=>window.sourceSlideReader?.ready)).toBe(false);
 await page.unroute('**/source-reader.js*');
 await page.locator('[data-retry-load]').click();
 await expect.poll(()=>page.evaluate(()=>window.sourceSlideReader?.ready)).toBe(true);
 await expect(page.locator('#source-canvas')).toBeVisible();
});
