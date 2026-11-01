import {test,expect} from '@playwright/test';
import {readFileSync,mkdtempSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn,execFileSync} from 'node:child_process';

const units=JSON.parse(readFileSync(new URL('../content/workshops/spring-2022.json',import.meta.url))).sessions;
const lesson=id=>`/deep-learning/terms/spring-2022/${id}/`;
const deck=id=>lesson(id)+'slides/';
async function run(page){await page.locator('[data-workshop-run]').click();await expect(page.locator('[data-workshop-record]')).toBeEnabled({timeout:65000});}
async function result(page){return page.locator('.workshop-output tbody tr').evaluateAll(rows=>Object.fromEntries(rows.map(r=>[r.querySelector('th').textContent,JSON.parse(r.querySelector('pre').textContent)])));}

test('all 23 local decks have their own cover, editor and questions without external requests',async({page})=>{
  test.setTimeout(90000);const external=[];const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==new URL(page.url()).origin && page.url()!=='about:blank'){external.push(u.href);return route.abort();}return route.continue();});
  for(const unit of units){
    await page.goto(deck(unit.session_id));
    await expect(page.locator('html')).toHaveAttribute('data-deck-ready','true');
    await expect(page.locator('.dl-slide')).toHaveCount(9);
    await expect(page.locator('.dl-slide:visible')).toHaveAttribute('id','slide-1');
    await expect(page.locator('.cover-people')).toContainText('استاد: دکتر نگار مجمع');
    await expect(page.locator('#slide-1 .deck-logo')).toHaveAttribute('src','/deep-learning/assets/university-logo.png');
    expect(await page.locator('#slide-1 .deck-logo').evaluate(img=>img.complete && img.naturalWidth===100 && img.naturalHeight===104)).toBeTruthy();
    await expect(page.locator('[data-deck-select] option')).toHaveCount(9);
    await page.locator('[data-deck-select]').selectOption('4');
    await expect(page.locator('[data-workshop-code]')).toBeVisible();
    await expect(page.locator('[data-workshop-result]')).toBeEmpty();
    expect(await page.locator('[data-workshop-code]').inputValue()).toContain('result');
    await page.locator('[data-deck-select]').selectOption('5');
    await expect(page.locator('#slide-6 form[data-exercise]')).toBeVisible();
    await expect(page.locator('[data-deck-back]')).toHaveAttribute('href',lesson(unit.session_id));
  }
  expect(external).toEqual([]);expect(errors).toEqual([]);
});

test('local slide preview stays on the same origin and original PDFs are optional references',async({page})=>{
  await page.route('**/*colorado.edu/**',route=>route.abort());
  await page.goto(lesson('s19'));
  await expect(page.locator('.local-slide-link')).toHaveAttribute('href',deck('s19'));
  await expect(page.locator('.original-source')).not.toHaveAttribute('open','');
  await expect(page.locator('.local-slide-preview')).toHaveCount(0);
  await page.locator('[data-source-kind=local]').click();
  const frame=page.frameLocator('.local-slide-preview');
  await expect(frame.locator('html')).toHaveAttribute('data-deck-ready','true');
  await expect(frame.locator('.dl-slide:visible')).toHaveAttribute('id','slide-1');
  await frame.locator('[data-deck-next]').click();
  await expect(frame.locator('.dl-slide:visible')).toHaveAttribute('id','slide-2');
  await page.locator('[data-source-kind=local]').click();
  await expect(page.locator('.local-slide-preview')).toHaveCount(0);
});

test('deck code, keyboard navigation, question feedback and print fallback work together',async({page})=>{
  test.setTimeout(90000);await page.goto(deck('s19')+'#slide-5');
  const editor=page.locator('[data-workshop-code]');await editor.focus();
  await page.keyboard.press('ArrowLeft');await expect(page).toHaveURL(/#slide-5$/);
  await run(page);expect((await result(page)).vqa_score).toBeCloseTo(.9,12);
  await editor.fill('while True:\n    pass');await page.locator('[data-workshop-run]').click();
  await page.locator('[data-deck-next]').click();
  await expect(page.locator('[data-workshop-status]')).toContainText('تغییر اسلاید');
  const form=page.locator('#slide-6 form');const answer=JSON.parse(await form.getAttribute('data-answer'));await form.locator(`input[value="${answer.correct_index}"]`).check();await form.locator('button').click();
  await expect(form.locator('.feedback')).toHaveAttribute('data-state','correct');
  await page.reload();await expect(form.locator('input:checked')).toHaveCount(1);
  await page.locator('body').click({position:{x:5,y:5}});await page.keyboard.press('Home');
  await expect(page).toHaveURL(/#slide-1$/);await page.keyboard.press('ArrowLeft');await expect(page).toHaveURL(/#slide-2$/);
  await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));await page.emulateMedia({media:'print'});
  await expect(page.locator('.dl-slide:visible')).toHaveCount(9);
  await expect(page.locator('.slide-print-code')).toBeVisible();
  await expect(page.locator('.solution[open]')).toHaveCount(2);
  await expect(page.locator('[data-deck-print]')).toBeHidden();
});

test('downloaded bundle runs representative Python without any external network',async({page,request})=>{
  test.setTimeout(180000);const directory=mkdtempSync(join(tmpdir(),'dl-deck-'));
  const archive=join(directory,'slides.zip');let server;
  try{
    const response=await request.get('/deep-learning/slides/spring-2022.zip');expect(response.ok()).toBeTruthy();
    writeFileSync(archive,await response.body());
    execFileSync('python3',['-m','zipfile','-e',archive,directory]);
    server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1','--directory',directory],{stdio:['ignore','pipe','pipe']});
    // Drain access logs: Linux's stderr pipe otherwise fills during the 21-reader sweep.
    server.stderr.resume();
    const port=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Bundle server did not start')),10000);server.once('error',reject);server.stdout.on('data',d=>{const n=d.toString().match(/port (\d+)/);if(n){clearTimeout(timeout);resolve(n[1]);}});});
    const origin=`http://127.0.0.1:${port}`;const external=[];
    await page.route('**/*',route=>{if(new URL(route.request().url()).origin!==origin){external.push(route.request().url());return route.abort();}return route.continue();});
    await page.goto(origin);await expect(page.locator('h1')).toHaveText('کارگاه آموزشی دیپ لرنینگ');
    for(const [id,key,value] of [['s05','max_difference',0],['s19','vqa_score',.9],['s28','ctc_probability_a',.51]]){
      await page.goto(origin+deck(id)+'#slide-5');await run(page);expect((await result(page))[key]).toBeCloseTo(value,8);
      expect(await page.evaluate(()=>document.fonts.check('17px Arad'))).toBeTruthy();
    }
    await page.locator('[data-deck-next]').click();
    await expect(page.locator('.dl-slide:visible')).toHaveAttribute('id','slide-6');
    expect(external).toEqual([]);
  }finally{if(server){server.kill();await new Promise(resolve=>server.once('exit',resolve));}rmSync(directory,{recursive:true,force:true});}
});

const readerTerm='spring-2026';
const readerRegistry=JSON.parse(readFileSync(new URL('../data/metadata/source-readers.json',import.meta.url)));
const readerSessions=readerRegistry.terms[readerTerm]||[];
const sourceTerm=JSON.parse(readFileSync(new URL(`../data/metadata/${readerTerm}.json`,import.meta.url))).term;
const sourceRows=sourceTerm.schedule.filter(row=>row.slides.length);
const sourceLesson=id=>`/deep-learning/terms/${readerTerm}/${id}/`;
const sourceDeck=id=>sourceLesson(id)+'slides/';
const sha256=data=>createHash('sha256').update(data).digest('hex');
function expectReference(actual,reference){
  if(typeof actual==='number'&&typeof reference==='number')expect(Math.abs(actual-reference)).toBeLessThanOrEqual(Math.max(1e-12,Math.abs(reference)*1e-10));
  else if(Array.isArray(reference)){expect(actual).toHaveLength(reference.length);reference.forEach((value,i)=>expectReference(actual[i],value));}
  else if(reference&&typeof reference==='object'){expect(Object.keys(actual).sort()).toEqual(Object.keys(reference).sort());for(const key of Object.keys(reference))expectReference(actual[key],reference[key]);}
  else expect(actual).toEqual(reference);
}
async function readerReady(page,number=1){
  // A ResizeObserver may start another render between two browser evaluations.
  // Read readiness and page identity together, including during zoom/navigation.
  await expect.poll(()=>page.evaluate(()=>{
    const reader=window.sourceSlideReader;
    return [reader?.ready,reader?.page,reader?.renderedPage];
  }),{timeout:45000}).toEqual([true,number,number]);
  await expect(page.locator('[data-page-select]')).toHaveValue(String(number));
  await expect(page.locator('#persian-page')).toHaveAttribute('data-page',String(number));
}
function readerErrors(page){
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&message.text().includes('Math.sumPrecise'))errors.push(message.text());});
  return errors;
}

test('2026 catalog preserves all21originals and1303pages, registry names actual sessions',async()=>{
  expect(sourceRows).toHaveLength(21);
  expect(sourceRows.reduce((sum,row)=>sum+row.slides.reduce((n,source)=>n+source.page_count,0),0)).toBe(1303);
  expect(new Set(readerSessions).size).toBe(readerSessions.length);
  expect(readerSessions.every(id=>sourceRows.some(row=>row.id===id))).toBeTruthy();
});

test('registered2026readers align original and Persian pages, math, a single source citation and keyboard',async({page,request})=>{
  test.skip(!readerSessions.length,'No complete2026translation is registered yet.');
  test.setTimeout(Math.max(90000,readerSessions.length*50000));
  const errors=readerErrors(page);
  for(const id of readerSessions){
    await page.goto(sourceDeck(id));await readerReady(page);
    const config=await page.locator('#source-reader-config').evaluate(node=>JSON.parse(node.textContent));
    const response=await request.get(config.translationUrl);expect(response.ok()).toBeTruthy();
    const payload=await response.json();
    expect(config.pageCount).toBe(payload.pages.length);
    expect(config.sourceSha256).toBe(payload.source.sha256);
    await expect(page.locator('[data-page-select] option')).toHaveCount(payload.pages.length+1);
    await expect(page.locator('[data-source-citation]')).toHaveAttribute('href',payload.source.url);
    const pdf=await request.get(payload.source.local_url);expect(pdf.ok()).toBeTruthy();
    const bytes=await pdf.body();expect(bytes.subarray(0,5).toString()).toBe('%PDF-');expect(sha256(bytes)).toBe(payload.source.sha256);
    const target=Math.min(4,payload.pages.length);
    await page.locator('[data-page-select]').evaluate((select,last)=>{for(let n=2;n<=last;n++){select.value=String(n);select.dispatchEvent(new Event('change',{bubbles:true}));}},target);
    await readerReady(page,target);
    const record=payload.pages[target-1];
    const copy=record.blocks.find(block=>block.kind!=='not_visible'&&!block.latex&&block.fa.trim());
    if(copy)await expect(page.locator('#persian-page')).toContainText(copy.fa.replace(/\s+/g,' '),{useInnerText:true});
    const mathPage=payload.pages.findIndex(record=>record.blocks.some(block=>block.latex)||record.image_text.some(item=>item.latex));
    if(mathPage>=0){await page.locator('[data-page-select]').selectOption(String(mathPage+1));await readerReady(page,mathPage+1);await expect(page.locator('#persian-page .katex').first()).toBeVisible();await expect(page.locator('[data-math-error]')).toHaveCount(0);}
    expect(payload.pages.some(record=>record.blocks.some(block=>/[\u0600-\u06ff].*\([A-Za-z]/s.test(block.fa))||record.image_text.some(item=>/[\u0600-\u06ff].*\([A-Za-z]/s.test(item.fa)))).toBeTruthy();
    await page.locator('body').click({position:{x:5,y:5}});await page.keyboard.press('Home');await readerReady(page,1);
    await page.keyboard.press('ArrowLeft');await readerReady(page,Math.min(2,payload.pages.length));
    await page.keyboard.press('End');await readerReady(page,payload.pages.length);
    await page.evaluate(()=>{window.__printCalls=0;window.print=()=>window.__printCalls++;});
    await page.locator('[data-print]').click();expect(await page.evaluate(()=>window.__printCalls)).toBe(1);
    await page.emulateMedia({media:'print'});await expect(page.locator('#source-canvas')).toBeVisible();await expect(page.locator('#persian-page')).toBeVisible();await expect(page.locator('[data-print]')).toBeHidden();
    await page.emulateMedia({media:'screen'});
    await page.locator('[data-next-page]').click();await expect(page.locator('#reader-references')).toBeVisible();
    await expect(page.locator('#source-canvas')).toBeHidden();
    await expect(page.locator('#reader-references a')).toHaveCount(1);
    await page.locator('[data-prev-page]').click();await readerReady(page,payload.pages.length);
    const workshop=page.locator('[data-session-workshop]');
    if(await workshop.count()){await expect(workshop).toHaveAttribute('href',sourceLesson(id)+'practice/#code');await workshop.click();await expect(page.frameLocator('[data-reader-tools-frame]').locator('[data-notebook-code]').first()).toBeVisible();}
  }
  expect(errors).toEqual([]);
});

test('2026reader phone view keeps the selected original and translation together',async({page})=>{
  test.skip(!readerSessions.length,'No complete2026translation is registered yet.');
  await page.setViewportSize({width:390,height:844});const errors=readerErrors(page);
  await page.goto(sourceDeck(readerSessions[0])+'#page=2');await readerReady(page,2);
  await expect(page.locator('#original-panel')).toBeVisible();await expect(page.locator('#translation-panel')).toBeHidden();
  await page.locator('[data-view-translation]').click();await expect(page.locator('#translation-panel')).toBeVisible();
  await expect(page.locator('#original-panel')).toBeHidden();
  await expect(page.locator('#persian-page')).toHaveAttribute('data-page','2');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  await page.locator('[data-view-source]').click();await readerReady(page,2);expect(errors).toEqual([]);
});

test('downloaded2026bundle serves readers and every authored workshop under a prefix with external network blocked',async({page,request})=>{
  test.skip(!readerSessions.length,'No complete2026translation is registered yet.');
  test.setTimeout(600000);const directory=mkdtempSync(join(tmpdir(),'dl-source-bundle-'));
  const prefix=join(directory,'portable');mkdirSync(prefix);const archive=join(directory,'source.zip');let server;
  try{
    const response=await request.get(`/deep-learning/slides/${readerTerm}.zip`);expect(response.ok()).toBeTruthy();
    writeFileSync(archive,await response.body());execFileSync('python3',['-m','zipfile','-e',archive,prefix]);
    const manifest=JSON.parse(readFileSync(join(prefix,'bundle-manifest.json')));
    expect(manifest.original_pdfs).toBe(21);expect(manifest.original_pages).toBe(1303);
    expect(manifest.sessions).toEqual(readerSessions);
    expect(manifest.pages).toBe(sourceRows.filter(row=>readerSessions.includes(row.id)).reduce((n,row)=>n+row.slides[0].page_count,0));
    for(const record of manifest.files){const bytes=readFileSync(join(prefix,record.path));expect(bytes.length).toBe(record.bytes);expect(sha256(bytes)).toBe(record.sha256);}
    server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1','--directory',directory],{stdio:['ignore','pipe','pipe']});
    // A full source/workshop sweep emits enough access logs to fill an unread pipe.
    server.stderr.resume();
    const port=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Bundle server did not start')),10000);server.once('error',reject);server.stdout.on('data',data=>{const match=data.toString().match(/port (\d+)/);if(match){clearTimeout(timeout);resolve(match[1]);}});});
    const origin=`http://127.0.0.1:${port}`,base=origin+'/portable';const external=[],errors=readerErrors(page);
    await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.protocol==='http:'||url.protocol==='https:'){if(url.origin!==origin||!url.pathname.startsWith('/portable/')){external.push(url.href);return route.abort();}}return route.continue();});
    await page.goto(base+'/');await expect(page.locator('h1')).toContainText('اسلاید و ترجمه');
    for(const id of manifest.sessions){
      await page.goto(base+sourceDeck(id));await readerReady(page);
      const config=await page.locator('#source-reader-config').evaluate(node=>JSON.parse(node.textContent));
      expect(config.pdfUrl.startsWith('/')).toBeFalsy();expect(config.translationUrl.startsWith('/')).toBeFalsy();
      await page.locator('[data-page-select]').selectOption('2');await readerReady(page,2);
    }
    for(const id of manifest.workshop_sessions){
      await page.goto(base+sourceLesson(id)+'practice/#code');await expect(page.locator('[data-notebook-code]').first()).toBeVisible();
      await page.locator('[data-notebook-run-all]').click();
      await page.waitForFunction(()=>window.studentNotebook?.record||document.querySelector('.nb-status[data-error="true"]'),{},{timeout:65000});
      const record=await page.evaluate(()=>window.studentNotebook.record);
      expect(record?.ok,id+': '+await page.locator('.nb-status').first().textContent()).toBe(true);
      const actual=record.outputs.at(-1).result;
      const reference=await page.locator('#practice-config').evaluate(node=>JSON.parse(node.textContent).reference);
      expectReference(actual,reference);expect(await page.evaluate(()=>document.fonts.check('17px Arad'))).toBeTruthy();
    }
    expect(external).toEqual([]);expect(errors).toEqual([]);
  }finally{if(server){server.kill();await new Promise(resolve=>server.once('exit',resolve));}rmSync(directory,{recursive:true,force:true});}
});


test('source links appear only once in the end sources slide, including direct phone entry and print',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(sourceDeck(readerSessions[0])+'#sources');
  await expect(page.locator('#reader-references')).toBeVisible();
  await expect(page.locator('#reader-references a')).toHaveCount(1);
  await expect(page.locator('.reader-attribution,[data-original-download],.source-pdf-fallback')).toHaveCount(0);
  await expect(page.locator('#source-canvas')).toBeHidden();
  await expect(page.locator('[data-next-page]')).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.emulateMedia({media:'print'});await expect(page.locator('#reader-references')).toBeVisible();await expect(page.locator('#source-canvas')).toBeHidden();
  await page.emulateMedia({media:'screen'});await page.locator('[data-page-select]').selectOption('1');await readerReady(page,1);
  await expect(page.locator('#reader-references')).toBeHidden();await expect(page.locator('#source-canvas')).toBeVisible();
});
