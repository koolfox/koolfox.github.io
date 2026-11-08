import {test,expect} from '@playwright/test';

const deck='/deep-learning/terms/spring-2026/s03/slides/';
const index='**/source-pages/spring-2026/s03/manifest.json*';
const record='**/source-pages/spring-2026/s03/*.json';
const ready=async(page,number)=>page.waitForFunction(n=>window.sourceSlideReader?.ready&&sourceSlideReader.page===n,number);

test('reader fetches only the current Persian page and fetches the next on demand',async({page})=>{
 const fetched=[];page.on('request',r=>{if(r.url().includes('/source-pages/')||r.url().includes('/source-translations/'))fetched.push(r.url());});
 await page.goto(deck+'#page=2');await ready(page,2);
 expect(fetched.filter(url=>/\/00\d-[a-f0-9]+\.json/.test(url))).toHaveLength(1);
 expect(fetched.some(url=>url.includes('/source-translations/'))).toBeFalsy();
 await expect(page.locator('[data-page-select] option[value="3"]')).toContainText('موضوع');
 await page.locator('[data-next-page]').click();await ready(page,3);
 expect(fetched.filter(url=>/\/00\d-[a-f0-9]+\.json/.test(url))).toHaveLength(2);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-page','3');
});

test('missing page index falls back to the session translation',async({page})=>{
 let legacy=false;page.on('request',r=>{if(r.url().includes('/source-translations/'))legacy=true});
 await page.route(index,route=>route.fulfill({status:404,body:'missing'}));
 await page.goto(deck+'#page=2');await ready(page,2);expect(legacy).toBeTruthy();
 await expect(page.locator('#persian-page')).toHaveAttribute('data-page','2');
});

test('corrupt page bytes trigger legacy translation rather than rendering corrupt content',async({page})=>{
 let legacy=false;page.on('request',r=>{if(r.url().includes('/source-translations/'))legacy=true});
 await page.route(record,route=>route.request().url().includes('manifest.json')?route.continue():route.fulfill({status:200,contentType:'application/json',body:'{"bad":true}'}));
 await page.goto(deck+'#page=2');await ready(page,2);expect(legacy).toBeTruthy();
 await expect(page.locator('#persian-page')).toHaveAttribute('data-page','2');
});

test('rapid page navigation cannot display a delayed previous translation',async({page})=>{
 await page.route('**/source-pages/spring-2026/s03/002-*.json',async route=>{await new Promise(resolve=>setTimeout(resolve,700));await route.continue().catch(()=>{});});
 await page.goto(deck+'#page=1');await ready(page,1);
 await page.locator('[data-next-page]').click();
 await page.locator('[data-next-page]').click();await ready(page,3);
 await page.waitForTimeout(800);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-page','3');
 expect(await page.evaluate(()=>sourceSlideReader.renderedPage)).toBe(3);
});

test('reader requests session translation when SHA-256 is unavailable',async({page})=>{
 let legacy=false;page.on('request',r=>{if(r.url().includes('/source-translations/'))legacy=true});
 await page.addInitScript(()=>Object.defineProperty(crypto,'subtle',{value:undefined,configurable:true}));
 // The PDF cache independently requires SHA-256; this only checks which translation is requested.
 await page.route('**/source-pages/spring-2026/s03/manifest.json*',route=>route.abort());
 await page.goto(deck+'#page=2');
 await page.waitForFunction(()=>document.querySelector('[data-reader-status]')?.dataset.error==='true',{timeout:30000});
 expect(legacy).toBeTruthy();
});


test('index with a different source hash falls back safely',async({page})=>{
 let legacy=false;page.on('request',r=>{if(r.url().includes('/source-translations/'))legacy=true});
 await page.route(index,async route=>{const response=await route.fetch();const data=await response.json();data.source.sha256='0'.repeat(64);await route.fulfill({response,json:data});});
 await page.goto(deck+'#page=2');await ready(page,2);expect(legacy).toBeTruthy();
 await expect(page.locator('#persian-page')).toHaveAttribute('data-page','2');
});


test('older index without optional titles remains usable',async({page})=>{
 await page.route(index,async route=>{const response=await route.fetch();const data=await response.json();for(const entry of data.pages)delete entry.title;await route.fulfill({response,json:data});});
 await page.goto(deck+'#page=2');await ready(page,2);
 await expect(page.locator('[data-page-select] option[value="2"]')).toContainText('مرور');
 await expect(page.locator('#persian-page')).toHaveAttribute('data-page','2');
});

test('a visited page reloads when translation requests are offline',async({page})=>{
 let legacy=false;page.on('request',r=>{if(r.url().includes('/source-translations/'))legacy=true});
 await page.goto(deck+'#page=2');await ready(page,2);expect(legacy).toBeFalsy();
 await page.route('**/source-pages/spring-2026/s03/**',route=>route.abort('internetdisconnected'));
 await page.reload();await ready(page,2);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-page','2');expect(legacy).toBeFalsy();
});

test('a corrupt cached translation page is re-fetched and checked',async({page})=>{
 let downloads=0;page.on('request',r=>{if(/\/002-[a-f0-9]+\.json/.test(r.url()))downloads++});
 await page.goto(deck+'#page=2');await ready(page,2);expect(downloads).toBe(1);
 await page.evaluate(async()=>{const cache=await caches.open('danna-persian-page-data-v1');const keys=await cache.keys();const key=keys.find(r=>/\/002-[a-f0-9]+\.json/.test(r.url));await cache.put(key,new Response('corrupt'));});
 await page.reload();await ready(page,2);expect(downloads).toBe(2);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-page','2');
});

test('leaving during a pending translation fetch does not install a stale page',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/source-pages/spring-2026/s03/002-*.json',async route=>{await new Promise(resolve=>setTimeout(resolve,700));await route.continue().catch(()=>{});});
 await page.goto(deck+'#page=1');await ready(page,1);
 await page.locator('[data-next-page]').click();
 await page.goto('/deep-learning/');await page.waitForTimeout(800);
 expect(errors).toEqual([]);
});
