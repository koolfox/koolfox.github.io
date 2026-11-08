// Render the deterministic source-bound XOR film using Playwright and ffmpeg.
import { createRequire } from 'node:module';
const require=createRequire(new URL('../browser-tests/package.json',import.meta.url));
const { chromium }=require('@playwright/test');
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
const folder=await mkdtemp(join(tmpdir(),'xor-boundary-'));
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1.5});
 const url=pathToFileURL(resolve('deep-learning/animations/xor-boundary.html')).href;
 for(let frame=0;frame<84;frame++){
  await page.goto(`${url}?t=${frame/4}`);await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:join(folder,`${String(frame).padStart(3,'0')}.png`)});
 }
 execFileSync('ffmpeg',['-y','-hide_banner','-loglevel','error','-framerate','4','-i',join(folder,'%03d.png'),'-r','24','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','deep-learning/assets/media/xor-boundary.mp4']);
}finally{await browser.close();await rm(folder,{recursive:true,force:true});}
