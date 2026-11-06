import { chromium, devices } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

if(!process.env.PROTOTYPE_SITE||!process.env.PROTOTYPE_MANIFEST)throw Error('Set PROTOTYPE_SITE and PROTOTYPE_MANIFEST');
const site=resolve(process.env.PROTOTYPE_SITE),origin='http://127.0.0.1:18766';
const server=spawn('python3',['-m','http.server','18766','--bind','127.0.0.1','--directory',site],{stdio:'ignore'});
const browser=await chromium.launch();
try{
 const manifest=JSON.parse(await readFile(resolve(process.env.PROTOTYPE_MANIFEST),'utf8'));
 const included=new Set(manifest.entries.map(item=>new URL(item.url,origin).href));
 const context=await browser.newContext({...devices['iPhone 13']}),page=await context.newPage(),urls=new Set();
 page.on('response',response=>{if(response.ok())urls.add(response.url());});
 for(let i=0;i<50;i++){try{await fetch(origin);break;}catch{await new Promise(resolve=>setTimeout(resolve,100));}}
 await page.goto(origin+'/deep-learning/terms/spring-2026/s05/slides/#page=27');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready,null,{timeout:60000});
 await page.locator('[data-page-experiment]').click();
 const frame=page.frameLocator('[data-reader-tools-frame]');
 await frame.locator('[data-notebook-run-cell="0"]').click();
 await frame.locator('[data-notebook-cell="0"] .nb-execution').getByText('اجرا شد').waitFor({timeout:60000});
 const missing=[...urls].filter(url=>url.startsWith(origin)&&!new URL(url).pathname.endsWith('.pdf')&&!included.has(url));
 const external=[...urls].filter(url=>!url.startsWith(origin));
 if(missing.length)throw Error('Observed notebook dependencies missing: '+missing.join(', '));
 console.log(JSON.stringify({cellExecuted:true,missing:missing.map(url=>new URL(url).pathname),external}));
 await context.close();
}finally{await browser.close();server.kill();}
