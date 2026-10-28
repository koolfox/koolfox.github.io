import {test,expect} from '@playwright/test';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
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
    await expect(page.locator('.cover-people')).toContainText('خانم دکتر نگار مجمع');
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
  const form=page.locator('#slide-6 form');await form.locator('input').fill('۰٫۹');await form.locator('button').click();
  await expect(form.locator('.feedback')).toHaveAttribute('data-state','correct');
  await page.reload();await expect(form.locator('input')).toHaveValue('۰٫۹');
  await page.locator('body').click({position:{x:5,y:5}});await page.keyboard.press('Home');
  await expect(page).toHaveURL(/#slide-1$/);await page.keyboard.press('ArrowLeft');await expect(page).toHaveURL(/#slide-2$/);
  await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));await page.emulateMedia({media:'print'});
  await expect(page.locator('.dl-slide:visible')).toHaveCount(9);
  await expect(page.locator('.slide-print-code')).toBeVisible();
  await expect(page.locator('.solution[open]')).toHaveCount(3);
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
