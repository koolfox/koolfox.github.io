import { chromium, devices } from '@playwright/test';
import { createHash } from 'node:crypto';
import { copyFile, readFile, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve, join } from 'node:path';

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
  await navigator.serviceWorker.register('/deep-learning/offline-prototype-worker.js',{scope:'/deep-learning/terms/spring-2026/s01/'});
  await navigator.serviceWorker.ready;
  if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
 });
 const entries=[];
 for(const url of urls){
  const path=new URL(url).pathname;
  const file=join(site,decodeURIComponent(path),path.endsWith('/')?'index.html':'');
  entries.push({url,sha256:createHash('sha256').update(await readFile(file)).digest('hex')});
 }
 const snapshot=async (id,items)=>page.evaluate(({id,entries})=>new Promise(resolve=>{
  const channel=new MessageChannel();channel.port1.onmessage=event=>resolve(event.data);
  navigator.serviceWorker.controller.postMessage({type:'snapshot',id,entries},[channel.port2]);
 }),{id,entries:items});
 const first=await snapshot('a'.repeat(64),entries);
 if(!first.ok)throw Error('valid snapshot failed: '+JSON.stringify(first));
 const duplicate=await snapshot('a'.repeat(64),entries);
 if(duplicate.ok)throw Error('active snapshot must not be replaced');
 const broken=entries.map((x,i)=>i?x:{...x,sha256:'0'.repeat(64)});
 const second=await snapshot('b'.repeat(64),broken);
 if(second.ok)throw Error('corrupt snapshot unexpectedly accepted');
 await context.setOffline(true);
 await page.reload();
 await page.waitForFunction(()=>window.sourceSlideReader?.ready && window.sourceSlideReader.page===40,null,{timeout:30000});
 console.log(JSON.stringify({snapshot:first.ok,corruptRejected:!second.ok,activePreserved:!duplicate.ok,offlineReload:true,entries:entries.length,page:40}));
 await context.close();
}finally{await browser.close();server.kill();await unlink(worker).catch(()=>{});}
