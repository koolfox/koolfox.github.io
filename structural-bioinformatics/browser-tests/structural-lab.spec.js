import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const root='/structural-bioinformatics/';

async function ready(page,mode='geometry',topic=8){
 await page.goto(`${root}runtime/concepts/?experiment=${mode}&topic=${topic}`);
 await expect(page.locator('iframe')).toHaveCount(1,{timeout:90000});
 const frame=page.frames().find(f=>f!==page.mainFrame());
 await frame.waitForFunction(mode=>window.structuralLabState?.mode===mode&&!window.structuralLabState.error,mode,{timeout:90000});
 await expect(page.locator('#runtime-loading')).toBeHidden();
 return frame;
}
async function choose(frame,mode){
 await frame.locator('#experiment').selectOption(mode);
 await expect.poll(()=>frame.evaluate(()=>window.structuralLabState?.mode)).toBe(mode);
}
async function set(frame,key,value){
 const field=frame.locator('#'+key);
 if(await field.evaluate(el=>el.tagName==='SELECT'))await field.selectOption(String(value));
 else {await field.fill(String(value));await field.press('Tab');}
}
function close(actual,expected){
 if(typeof expected==='number'){expect(actual).toBeCloseTo(expected,8);return;}
 if(Array.isArray(expected)){expect(actual.length).toBe(expected.length);expected.forEach((v,i)=>close(actual[i],v));return;}
 expect(actual).toEqual(expected);
}

test('course experiment is visible, follows its topic and returns to the same lesson',async({page})=>{
 test.setTimeout(120000);
 await page.goto(`${root}course.html?topic=8`);
 await expect(page.locator('#course-lab-open')).toHaveAttribute('href',/experiment=geometry&topic=8/);
 await page.locator('#lesson-outline a').filter({hasText:'آزمایش تعاملی'}).click();
 await page.locator('#course-lab-open').click();
 await expect(page.locator('iframe')).toHaveCount(1,{timeout:90000});
 const frame=page.frames().find(f=>f!==page.mainFrame());
 await frame.waitForFunction(()=>window.structuralLabState?.mode==='geometry',null,{timeout:90000});
 await frame.locator('#course-return').click();
 await expect(page).toHaveURL(/course\.html\?topic=8#interactive-lab/);
 await expect(page.locator('#section-nav a')).toHaveCount(2);
 await expect(page.locator('#interactive-lab')).toBeInViewport();
});

test('six live browser Python experiments reproduce native control calculations',async({page,request})=>{
 test.setTimeout(180000);
 const controls=await (await request.get(`${root}data/processed/interactive-lab-controls.json`)).json();
 const source=await (await request.get(`${root}assets/course/interactive_lab.py`)).body();
 expect(createHash('sha256').update(source).digest('hex')).toBe(controls.engine_sha256);
 const frame=await ready(page);
 for(const example of controls.cases){
  await choose(frame,example.mode);
  for(const [key,value]of Object.entries(example.inputs))await set(frame,key,value);
  await expect.poll(async()=>{
   const s=await frame.evaluate(()=>window.structuralLabState);
   if(s?.mode!==example.mode||s.error)return false;
   try{for(const[key,value]of Object.entries(example.expected))close(s[key],value);return true;}catch{return false;}
  },{timeout:15000}).toBe(true);
  const result=await frame.evaluate(()=>window.structuralLabState);
  for(const [key,value]of Object.entries(example.expected))close(result[key],value);
  expect(result.runtime.python).toMatch(/^3\./);
  expect(result.runtime.numpy).toMatch(/^2\./);
  await expect(frame.locator('#experiment-plot')).toHaveAttribute('data-mode',example.mode);
 }
});

test('notes, node inspection, reset, invalid-input recovery and downloads work',async({page})=>{
 test.setTimeout(120000);
 const frame=await ready(page,'graph',29);
 await frame.locator('#prediction').fill('سه یال؛ با افزایش آستانه پنج یال می‌شود.');
 await set(frame,'cutoff',5);
 await expect.poll(()=>frame.evaluate(()=>window.structuralLabState.edges.length)).toBe(5);
 await frame.locator('#reset').click();
 await expect.poll(()=>frame.evaluate(()=>window.structuralLabState.edges.length)).toBe(3);
 const canvas=frame.locator('#experiment-plot'),box=await canvas.boundingBox();
 const plot=await frame.evaluate(()=>window.structuralLabPlot),target=plot.hitTargets.find(t=>t.label==='A');
 await canvas.click({position:{x:target.screen[0]/plot.width*box.width,y:target.screen[1]/plot.height*box.height}});
 await expect(frame.locator('#node')).toHaveValue('A');
 await expect.poll(()=>frame.evaluate(()=>window.structuralLabState.config.selected)).toBe('A');
 await choose(frame,'sequence');await frame.locator('#prediction').fill('مکمل باید معکوس هم بشود.');
 await set(frame,'dna','ACNT');await expect(frame.locator('#calculation-status')).toContainText('ورودی معتبر نیست');
 await expect(frame.locator('#download')).toBeDisabled();
 await expect(frame.locator('#readout')).not.toContainText('درصد GC');
 await set(frame,'dna','AACGT');await expect(frame.locator('#download')).toBeEnabled();
 await choose(frame,'graph');await expect(frame.locator('#prediction')).toHaveValue('سه یال؛ با افزایش آستانه پنج یال می‌شود.');
 await frame.locator('#reflection').fill('آستانه تعریف یال را عوض کرد؛ مختصات ثابت بود.');
 const pending=page.waitForEvent('download');await frame.locator('#download').click();const download=await pending;
 const saved=JSON.parse(await readFile(await download.path(),'utf8'));
 expect(saved.calculated.mode).toBe('graph');expect(saved.notes.reflection).toContain('مختصات ثابت بود');
 await page.reload();await expect(page.locator('iframe')).toHaveCount(1,{timeout:90000});
 const restored=page.frames().find(f=>f!==page.mainFrame());
 await restored.waitForFunction(()=>window.structuralLabState?.mode==='graph',null,{timeout:90000});
 await expect(restored.locator('#reflection')).toHaveValue(saved.notes.reflection);
});

test('mobile laboratory has usable controls and storage failure keeps download available',async({page})=>{
 test.setTimeout(120000);
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('blocked');}}));
 const frame=await ready(page,'energy',14);
 await frame.locator('#reflection').fill('با افزایش انرژی، احتمال کمتر شد.');
 await expect(frame.locator('#note-status')).toContainText('ذخیره در مرورگر ممکن نیست');
 await expect(frame.locator('#download')).toBeEnabled();
 for(const mode of ['sequence','geometry','minimization','sampling','graph']){
  await choose(frame,mode);
  expect(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await frame.locator('#node').focus();await expect(frame.locator('#node')).toBeFocused();
});


test('a blocked Python runtime retains a visible route back to the lesson',async({page})=>{
 await page.route('**/*.wasm',r=>r.abort());
 await page.goto(`${root}runtime/concepts/?experiment=geometry&topic=8`);
 await expect(page.locator('#runtime-loading')).toBeVisible();
 await expect(page.locator('#runtime-back')).toHaveAttribute('href',/course\.html\?topic=8#interactive-lab/);
 await page.locator('#runtime-back').click();
 await expect(page.locator('#lesson')).toContainText('RMSD');
});
