import { chromium, devices } from '@playwright/test';
import { createHash } from 'node:crypto';
import { copyFile, readFile, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve, join, dirname } from 'node:path';

const site=resolve(process.env.PROTOTYPE_SITE || '');
if(!process.env.PROTOTYPE_SITE)throw Error('Set PROTOTYPE_SITE to a disposable built site');
const worker=join(site,'deep-learning/offline-prototype-worker.js');
await copyFile(new URL('../offline-prototype/worker.js',import.meta.url),worker);
const server=spawn('python3',['-m','http.server','18765','--bind','127.0.0.1','--directory',site],{stdio:'ignore'});
const browser=await chromium.launch();
try{
 const origin='http://127.0.0.1:18765',context=await browser.newContext({...devices['iPhone 13']});
 const page=await context.newPage(), urls=new Set();
 page.on('response',response=>{
  const url=new URL(response.url());
  if(url.origin===origin && response.status()===200 && !url.pathname.endsWith('.pdf'))urls.add(url.href);
 });
 for(let i=0;i<50;i++){try{await fetch(origin);break;}catch{await new Promise(r=>setTimeout(r,100));}}
 await page.goto(origin+'/deep-learning/terms/spring-2026/s01/slides/#page=40');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready,null,{timeout:60000});
 await page.evaluate(async()=>{
  await navigator.serviceWorker.register('/deep-learning/offline-prototype-worker.js',{scope:'/deep-learning/terms/spring-2026/'});
  await navigator.serviceWorker.register('/deep-learning/offline-prototype-worker.js',{scope:'/deep-learning/animations/convolution-code/'});
  await navigator.serviceWorker.ready;
  if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
 });
 const manifest=JSON.parse(await readFile(resolve(process.env.PROTOTYPE_MANIFEST || ''),'utf8'));
 const entries=manifest.entries;
 const included=new Set(entries.map(entry=>new URL(entry.url,origin).href));
 const missing=[...urls].filter(url=>!included.has(url));
 if(missing.length)throw Error('manifest misses observed resources: '+missing.join(', '));
 const manifestId=items=>createHash('sha256').update(JSON.stringify(items.map(({sha256,url})=>({sha256,url})))).digest('hex');
 if(manifestId(entries)!==manifest.version)throw Error('manifest identity mismatch');
 const snapshot=async (id,items,testFailureAfter,testFailureName)=>page.evaluate(({id,entries,testFailureAfter,testFailureName})=>new Promise(resolve=>{
  const channel=new MessageChannel();channel.port1.onmessage=event=>resolve(event.data);
  navigator.serviceWorker.controller.postMessage({type:'snapshot',id,entries,testFailureAfter,testFailureName},[channel.port2]);
 }),{id,entries:items,testFailureAfter,testFailureName});
 const first=await snapshot(manifest.version,entries);
 if(!first.ok)throw Error('valid snapshot failed: '+JSON.stringify(first));
 const duplicate=await snapshot(manifest.version,entries);
 if(duplicate.ok)throw Error('active snapshot must not be replaced');
 const broken=entries.map((x,i)=>i===Math.floor(entries.length/2)?{...x,sha256:'0'.repeat(64)}:x);
 const second=await snapshot(manifestId(broken),broken);
 if(second.ok)throw Error('corrupt snapshot unexpectedly accepted');
 const quotaEntries=entries.map((x,i)=>i===0?{...x,url:x.url+'?fault=quota'}:x);
 const quota=await snapshot(manifestId(quotaEntries),quotaEntries,10);
 if(quota.ok||!quota.error.includes('QuotaExceededError'))throw Error('quota failure not handled');
 const interrupted=await snapshot(manifestId(quotaEntries),quotaEntries,10,'AbortError');
 if(interrupted.ok||!interrupted.error.includes('AbortError'))throw Error('interruption not handled');
 await page.goto(origin+'/deep-learning/terms/spring-2026/s05/slides/#page=27');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready && window.sourceSlideReader.page===27,null,{timeout:60000});
 const manifest05=JSON.parse(await readFile(join(dirname(resolve(process.env.PROTOTYPE_MANIFEST)),'s05.json'),'utf8'));
 const fifth=await snapshot(manifest05.version,manifest05.entries);
 if(!fifth.ok)throw Error('second session snapshot failed: '+JSON.stringify(fifth));
 const cdp=await context.newCDPSession(page);
 await cdp.send('Network.clearBrowserCache');
 await context.setOffline(true);
 await page.goto(origin+'/deep-learning/terms/spring-2026/s05/slides/#page=27');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready && window.sourceSlideReader.page===27,null,{timeout:30000});
 await page.locator('[data-source-interactive="convolution-code"]').click();
 const movie=page.frameLocator('[data-reader-tools-frame]').locator('video');
 await movie.waitFor({state:'visible'});
 await page.frameLocator('[data-reader-tools-frame]').locator('[data-film-time]').first().click();
 const filmController=await movie.evaluate(video=>navigator.serviceWorker.controller?.scriptURL||null);
 if(!filmController?.endsWith('/offline-prototype-worker.js'))throw Error('film is not controlled by prototype worker');
 const filmOffline=await movie.evaluate(video=>Promise.race([
  new Promise(resolve=>{if(video.readyState>=1)return resolve(true);video.addEventListener('loadedmetadata',()=>resolve(true),{once:true});video.addEventListener('error',()=>resolve(false),{once:true});}),
  new Promise(resolve=>setTimeout(()=>resolve(false),5000))]));
 if(!filmOffline)throw Error('film not available offline');
 await movie.evaluate(video=>video.play());
 await page.goto(origin+'/deep-learning/terms/spring-2026/s05/slides/#page=27');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready && window.sourceSlideReader.page===27,null,{timeout:30000});
 await page.locator('[data-page-experiment]').click();
 const notebook=page.frameLocator('[data-reader-tools-frame]');
 await notebook.locator('[data-notebook-run-cell="0"]').click();
 await notebook.locator('[data-notebook-cell="0"] .nb-execution').getByText('اجرا شد').waitFor({timeout:60000});
 await page.goto(origin+'/deep-learning/terms/spring-2026/s01/slides/#page=40');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready && window.sourceSlideReader.page===40,null,{timeout:30000});
 console.log(JSON.stringify({snapshot:first.ok,corruptRejected:!second.ok,activePreserved:!duplicate.ok,simulatedQuotaRejected:!quota.ok,simulatedInterruptionRejected:!interrupted.ok,offlineReload:true,entries:entries.length,sessions:['s01','s05'],filmOffline,notebookFirstCellOffline:true,page:40}));
 await context.close();
}finally{await browser.close();server.kill();await unlink(worker).catch(()=>{});}
