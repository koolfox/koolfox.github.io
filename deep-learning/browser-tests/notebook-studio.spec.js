import {test, expect, chromium} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

async function openBook(page, lab='network-playground') {
  await page.goto(`/deep-learning/runtime/${lab}/`);
  await page.waitForFunction(()=>window.labWorkspace?.liveState()&&window.labNotebook,null,{timeout:90000});
  await page.locator('[data-code-toggle]').click();
  await expect(page.locator('[data-notebook-mode]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('[data-notebook-code]').first()).toBeVisible();
  return page.frames().find(frame=>frame!==page.mainFrame());
}
async function run(page) {
  await page.locator('[data-notebook-run-all]').click();
  await page.waitForFunction(()=>window.labNotebook.record,null,{timeout:30000});
  const record=await page.evaluate(()=>window.labNotebook.record);
  expect(record.ok,JSON.stringify(record)).toBe(true);
  return record;
}

test('all three notebooks compute the actual plotted model with short commented cells',async({page})=>{
  test.setTimeout(180000);
  for(const lab of ['neuron-xor','network-playground','convolution']) {
    const frame=await openBook(page,lab);
    expect(await page.evaluate(()=>window.labNotebook.cells.every(cell=>cell.source.includes('#')))).toBe(true);
    const record=await run(page);expect(record.applied_to_lab).toBe(true);
    const result=record.outputs.at(-1).result;
    if(lab==='convolution') {
      await expect.poll(()=>frame.evaluate(()=>window.dannaConvolution?.activated[0])).toEqual(result.first_row);
    } else {
      await expect.poll(()=>page.evaluate(()=>window.labWorkspace.liveState()?.epoch)).toBe(5);
      const state=await page.evaluate(()=>window.labWorkspace.liveState());
      if(lab==='network-playground') {
        expect(result.train_loss).toBeCloseTo(state.train.loss,12);
        expect(result.validation_loss).toBeCloseTo(state.validation.loss,12);
        await expect(frame.locator('#activation input[type=radio]')).toHaveCount(3);
      } else expect(result.predictions).toEqual(state.predictions);
    }
    await page.getByRole('tab',{name:'آزمون تستی',exact:true}).click();
    await expect(page.locator('[data-notebook-question]')).toHaveCount(3);
    await expect(page.locator('.nb-quiz textarea')).toHaveCount(0);
    const correct=await page.evaluate(()=>fetch('./notebook.json').then(r=>r.json()).then(d=>d.questions[0].correct));
    const quiz=page.locator('[data-notebook-question]').first();await quiz.locator(`input[value="${correct}"]`).check();await quiz.locator('button[type=submit]').click();
    await expect(quiz.locator('.feedback')).toHaveAttribute('data-state','correct');
  }
});

test('earlier-cell edits drive controls, failed prefixes preserve the plot, and saved versions export to real Jupyter',async({page})=>{
  test.setTimeout(150000);await openBook(page);
  const editor=page.locator('[data-notebook-code]').first();
  await editor.fill((await page.evaluate(()=>window.labNotebook.cells[0].source)).replace('"learning_rate": 0.03','"learning_rate": 0.07'));
  await page.locator('.nb-tools:not(.nb-packages) summary').click();await page.getByLabel('نام نسخه',{exact:true}).fill('نرخ ۰٫۰۷');await page.locator('[data-notebook-save]').click();
  await run(page);await expect.poll(()=>page.evaluate(()=>window.labWorkspace.liveState()?.config.learning_rate)).toBe(.07);
  const before=await page.evaluate(()=>window.labWorkspace.liveState().weights);
  await page.locator('[data-notebook-code]').nth(3).fill('raise ValueError("check cell four")\n');
  await page.locator('[data-notebook-run-all]').click();await expect(page.locator('[data-notebook-output="3"]')).toContainText('cell_4.py');
  expect(await page.evaluate(()=>window.labWorkspace.liveState().weights)).toEqual(before);
  await page.getByLabel('نسخه‌های ذخیره‌شده',{exact:true}).selectOption('0');await run(page);
  const pending=page.waitForEvent('download');await page.locator('[data-notebook-download]').click();const zip=await(await pending).path();
  const reproduction=JSON.parse(execFileSync('python3',['-I','-c',`
import sys,json,zipfile,tempfile,hashlib
from pathlib import Path
with tempfile.TemporaryDirectory() as folder:
    with zipfile.ZipFile(sys.argv[1]) as archive:
        assert archive.testzip() is None
        assert 'MIT License' in archive.read('LICENSE.txt').decode()
        archive.extractall(folder)
    root=Path(folder)
    record=json.loads((root/'notebook-execution.json').read_text())
    for name,digest in record['source_files_sha256'].items():
        assert hashlib.sha256((root/name).read_bytes()).hexdigest()==digest
    book=json.loads((root/'network-playground.ipynb').read_text())
    assert book['nbformat']==4 and len(book['cells'])==4
    sys.path.insert(0,folder)
    scope={}
    for cell in book['cells']:
        exec(compile(''.join(cell['source']),'exported-cell.py','exec'),scope)
    print(json.dumps(scope['result']))
`,zip],{encoding:'utf8'}).trim().split('\n').at(-1));
  const plotted=await page.evaluate(()=>window.labWorkspace.liveState());
  expect(reproduction.epoch).toBe(plotted.epoch);expect(reproduction.train_loss).toBeCloseTo(plotted.train.loss,10);
});

test('notebook stop preserves a phone draft and restart never repeats an infinite cell automatically',async({page})=>{
  test.setTimeout(150000);await page.setViewportSize({width:390,height:844});await openBook(page,'neuron-xor');
  await expect(page.locator('.host-view')).toBeHidden();
  await page.locator('[data-notebook-code]').nth(3).fill('while True:\n    pass\n');
  await page.locator('[data-notebook-run-all]').click();await page.getByRole('button',{name:'توقف پایتون',exact:true}).click();
  await expect(page.getByRole('button',{name:'راه‌اندازی پایتون',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>window.labNotebook.cells[3].source)).toBe('while True:\n    pass\n');
  await page.getByRole('button',{name:'راه‌اندازی پایتون',exact:true}).click();await page.waitForFunction(()=>window.labWorkspace?.liveState(),null,{timeout:90000});
  expect(await page.evaluate(()=>window.labWorkspace.liveState().epoch)).toBe(0);
  await page.getByRole('button',{name:'بازگرداندن سلول ۴',exact:true}).click();
  await run(page);await expect.poll(()=>page.evaluate(()=>window.labWorkspace.liveState().epoch)).toBe(5);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
});

test('knowledge lookup and a question source reference keep the original slide in context',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto('/deep-learning/terms/spring-2026/s13/slides/#page=28');
  await page.waitForFunction(()=>window.sourceSlideReader?.renderedPage===28);
  await page.locator('.reader-sections [data-reader-section=knowledge]').click();
  const tools=page.frameLocator('[data-reader-tools-frame]');await tools.getByLabel('جست‌وجوی واژه یا رابطه').fill('softmax');
  await expect(tools.locator('[data-knowledge-entry]:visible')).not.toHaveCount(0);
  expect(await page.evaluate(()=>window.sourceSlideReader.page)).toBe(28);await expect(page.locator('#source-canvas')).toBeVisible();
  await page.locator('.reader-sections [data-reader-section=questions]').click();
  await tools.locator('[data-notebook-question]').first().getByRole('button',{name:/اسلاید مرتبط/}).click();
  const expected=await tools.locator('#practice-config').evaluate(node=>JSON.parse(node.textContent).questions[0].source_page);
  await expect.poll(()=>page.evaluate(()=>window.sourceSlideReader.page)).toBe(expected);await expect(tools.locator('.nb-quiz')).toBeVisible();
});

test('presentation mode fits the whole original slide in a shorter desktop viewport',async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await page.goto('/deep-learning/terms/spring-2026/s13/slides/#page=28');
  await page.locator('[data-source-only-toggle]').click();
  await expect(page.locator('#translation-panel')).toBeHidden();
  await expect.poll(()=>page.evaluate(()=>{
    const canvas=document.querySelector('#source-canvas').getBoundingClientRect();
    const pane=document.querySelector('#original-panel').getBoundingClientRect();
    return window.sourceSlideReader.ready&&canvas.width>500&&canvas.bottom<=pane.bottom+1;
  })).toBe(true);
  await page.locator('[data-source-only-toggle]').click();
  await expect(page.locator('#translation-panel')).toBeVisible();
});

test('presentation keeps language selection and the page notebook accessible',async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await page.goto('/deep-learning/terms/spring-2026/s13/slides/#page=28');
  await page.waitForFunction(()=>window.sourceSlideReader?.ready);
  await page.locator('[data-source-only-toggle]').click();
  await page.locator('[data-view-translation]').click();
  await expect(page.locator('#translation-panel')).toBeVisible();
  await expect(page.locator('#original-panel')).toBeHidden();
  await expect(page.locator('[data-page-experiment]')).toBeVisible();
  await page.locator('[data-page-experiment]').click();
  await expect(page.locator('#translation-panel')).toBeVisible();
  await expect(page.frameLocator('[data-reader-tools-frame]').locator('[data-notebook-run-all]')).toBeVisible();
  await page.locator('[data-view-source]').click();
  await expect(page.locator('#original-panel')).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-presenting','true');
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-view-translation]').click();
  await expect(page.locator('#translation-panel')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('source tables retain their column order, blank cells, merged costs and numerical precision',async({page})=>{
  await page.goto('/deep-learning/terms/spring-2026/s13/slides/#page=56');
  await page.waitForFunction(()=>window.sourceSlideReader?.ready);
  const table=page.locator('.reader-table');
  await expect(table.locator('tbody tr')).toHaveCount(10);
  await expect(table.locator('tbody tr').first().locator('td').nth(1)).toHaveText('');
  await expect(table.locator('tbody tr').nth(8).locator('td[colspan="2"]')).toHaveCount(1);
  await expect(table.locator('.katex')).toHaveCount(14);
  await page.goto('/deep-learning/terms/spring-2026/s11/slides/#page=49');
  await page.waitForFunction(()=>window.sourceSlideReader?.ready);
  await expect(page.locator('.reader-table tbody tr')).toHaveCount(6);
  await expect(page.locator('.reader-table tbody tr').first()).toContainText('00.39');
  await expect(page.locator('.reader-table tbody tr').last()).toContainText('57.75');
});

test('mixed visual tables retain the actual photos and handwriting from their source page',async({page})=>{
  await page.goto('/deep-learning/terms/spring-2026/s17/slides/#page=44');
  await page.waitForFunction(()=>window.sourceSlideReader?.ready);
  const photos=page.locator('.reader-table [data-source-crop]');
  await expect(photos).toHaveCount(9);
  expect(await photos.evaluateAll(items=>items.every(canvas=>{
    if(canvas.dataset.cropReady!=='true'||canvas.width<20||canvas.height<20)return false;
    const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    return pixels.some((value,index)=>index%4===3&&value!==0);
  }))).toBe(true);
  await page.locator('[data-page-select]').selectOption('45');
  await page.waitForFunction(()=>window.sourceSlideReader.renderedPage===45);
  await expect(photos).toHaveCount(9);
  await expect(page.locator('.reader-table thead th').first()).toHaveAttribute('colspan','6');
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-view-translation]').click();
  await expect.poll(()=>page.locator('.reader-table').evaluate(t=>t.getBoundingClientRect().width)).toBeGreaterThanOrEqual(1050);
  expect(await photos.first().evaluate(c=>c.getBoundingClientRect().width)).toBeGreaterThan(100);
  await page.waitForFunction(()=>window.sourceSlideReader?.ready);
  expect(await photos.evaluateAll(items=>items.every(canvas=>canvas.width>=canvas.getBoundingClientRect().width))).toBe(true);
  const viewport=page.locator('.reader-table-viewport');
  await viewport.focus();await viewport.press('ArrowRight');
  await expect.poll(()=>viewport.evaluate(node=>node.scrollLeft)).toBeGreaterThan(0);
  expect(await page.evaluate(()=>window.sourceSlideReader.page)).toBe(45);
});

test('the migrated attention citation is checked and unresolved citations remain plain text',async({page})=>{
  await page.goto('/deep-learning/terms/spring-2026/s13/slides/#page=28');
  await page.waitForFunction(()=>window.sourceSlideReader?.ready);
  await expect(page.locator('a[href*="towardsdatascience.com/illustrated-self-attention"]')).toHaveCount(0);
  await expect(page.locator('#persian-page a[href="https://medium.com/data-science/illustrated-self-attention-2d627e33b20a"]')).toHaveCount(1);
  const contract=await page.evaluate(()=>fetch(JSON.parse(document.querySelector('#source-reader-config').textContent).translationUrl).then(r=>r.json()));
  const targets=new Set(Object.values(contract.reference_targets).map(url=>new URL(url).href));
  for(const href of await page.locator('#source-links a[href^="http"],#persian-page .reader-reference').evaluateAll(items=>items.map(a=>a.href)))expect(targets.has(href)).toBe(true);
});

test('WebGPU executes the source attention values and compares the edited Python notebook',async({baseURL})=>{
  test.setTimeout(90000);
  const browser=await chromium.launch({args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-dawn-features=allow_unsafe_apis']});
  try{
    const page=await browser.newPage();await page.goto(baseURL+'/deep-learning/terms/spring-2026/s13/practice/');
    const available=await page.evaluate(async()=>!!(await navigator.gpu?.requestAdapter()));
    test.skip(!available,'This browser does not provide a WebGPU adapter.');
    await page.locator('[data-notebook-run-all]').click();
    await page.waitForFunction(()=>window.studentNotebook?.record?.ok,null,{timeout:60000});
    await page.locator('[data-run-attention-gpu]').click();
    await page.waitForFunction(()=>window.attentionGPUResult);
    const result=await page.evaluate(()=>window.attentionGPUResult);
    expect(result.scores).toEqual([2,4,4]);expect(result.matched_python).toBe(true);
    expect(result.maximum_absolute_error).toBeLessThan(1e-5);
    const editor=page.locator('[data-notebook-code]').first();
    await editor.fill((await page.evaluate(()=>window.studentNotebook.cells[0].source)).replace('selected_query = 0','selected_query = 1'));
    await expect(page.locator('[data-run-attention-gpu]')).toHaveCount(0);
    await page.locator('[data-notebook-run-all]').click();
    await page.waitForFunction(()=>window.studentNotebook?.record?.ok,null,{timeout:30000});
    await page.locator('[data-run-attention-gpu]').click();await page.waitForFunction(()=>window.attentionGPUResult);
    expect(await page.evaluate(()=>window.attentionGPUResult.scores)).toEqual([4,16,12]);
    expect(await page.evaluate(()=>window.attentionGPUResult.matched_python)).toBe(true);
  }finally{await browser.close();}
});

test('unsupported WebGPU reports the missing backend without inventing GPU output',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(navigator,'gpu',{value:undefined}));
  await page.goto('/deep-learning/terms/spring-2026/s13/practice/');
  const error=await page.evaluate(async()=>{const {runAttentionGPU}=await import('/deep-learning/assets/webgpu-attention.js');try{await runAttentionGPU({query:[1],keys:[[1]],values:[[1]],scaled:false});return null;}catch(error){return error.message;}});
  expect(error).toContain('WebGPU در این مرورگر در دسترس نیست');
  expect(await page.evaluate(()=>window.attentionGPUResult??null)).toBeNull();
  const rejected=await page.evaluate(async()=>{
    const {runAttentionGPU}=await import('/deep-learning/assets/webgpu-attention.js');
    const valid={query:[1],keys:[[1]],values:[[1]],scaled:false};
    const inputs=[{...valid,query:Array(1)},{...valid,keys:Array(1)},{...valid,values:[Array(1)]},{...valid,query:[Infinity]}];
    return Promise.all(inputs.map(async input=>{try{await runAttentionGPU(input);return false;}catch(error){return error.message.includes('هم‌اندازه و متناهی');}}));
  });
  expect(rejected).toEqual([true,true,true,true]);
});

test('attention playback uses the actual consecutive source pages and stops on manual navigation',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/deep-learning/terms/spring-2026/s13/slides/#page=21');
  await page.waitForFunction(()=>window.sourceSlideReader?.ready);
  await page.locator('[data-play-slides]').click();
  await expect(page.locator('[data-play-slides]')).toHaveAttribute('aria-pressed','true');
  await page.waitForFunction(()=>window.sourceSlideReader.renderedPage===22);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-page','22');
  await page.locator('[data-next-page]').click();
  await expect(page.locator('[data-play-slides]')).toHaveAttribute('aria-pressed','false');
  await page.locator('[data-page-select]').selectOption('32');
  await expect(page.locator('[data-play-slides]')).toBeHidden();
});

test('source worked pages open their exact Python example and page-matched choices',async({page})=>{
  test.setTimeout(120000);await page.setViewportSize({width:1440,height:1000});
  function compare(actual,expected){
    if(typeof expected==='number'){expect(actual).toBeCloseTo(expected,12);return;}
    if(expected&&typeof expected==='object'){
      expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());
      for(const key of Object.keys(expected))compare(actual[key],expected[key]);
    }else expect(actual).toEqual(expected);
  }
  for(const [session,number,id] of [['s03',75,'backprop'],['s05',27,'source-convolution']]){
    await page.goto(`/deep-learning/terms/spring-2026/${session}/slides/#page=${number}`);
    await page.waitForFunction(()=>window.sourceSlideReader?.ready);
    await page.locator('.reader-sections [data-reader-section=lab]').click();
    await expect(page.frameLocator('[data-reader-tools-frame]').locator('[data-notebook-run-all]')).toBeVisible();
    const frame=page.frames().find(frame=>frame.url().includes('/practice/'));
    await frame.waitForFunction(()=>window.studentNotebook?.cells);
    const cells=await frame.evaluate(()=>window.studentNotebook.cells.map(cell=>cell.source).join(''));
    expect(cells).not.toContain('a, b, c = 1.0, -2.0, 3.0');
    expect(cells).not.toContain('image = [[1, 0, 1, 0]');
    const reference=await frame.evaluate(id=>JSON.parse(document.querySelector('#practice-config').textContent).page_notebooks.find(example=>example.key.endsWith('/'+id)).reference,id);
    await frame.locator('[data-notebook-run-all]').click();
    await frame.waitForFunction(()=>window.studentNotebook.record?.ok,null,{timeout:60000});
    compare(await frame.evaluate(()=>window.studentNotebook.record.outputs.at(-1).result),reference);
    await frame.getByRole('tab',{name:'آزمون تستی',exact:true}).click();
    const questions=await frame.locator('#practice-config').evaluate(node=>JSON.parse(node.textContent).questions);
    expect(questions.length).toBeGreaterThan(0);
    const pageBank=await frame.locator('#practice-config').evaluate((node,n)=>JSON.parse(node.textContent).page_questions.find(item=>item.pages.includes(n)).questions,number);
    expect(questions).toEqual(pageBank);
    await expect(frame.locator('[data-notebook-question]')).toHaveCount(questions.length);
    await frame.locator('[data-return-slide]').click();
    await expect(page.locator('body')).toHaveAttribute('data-reader-section','slides');
    expect(await page.evaluate(()=>window.sourceSlideReader.page)).toBe(number);
  }
});

test('notebook cells stack in document order with highlighted Python and working local completion',async({page})=>{
  await page.goto('/deep-learning/terms/spring-2026/s01/practice/');
  const cells=page.locator('[data-notebook-cell]');
  await expect(cells).toHaveCount(3);
  await expect(page.getByLabel('انتخاب سلول',{exact:true})).toHaveCount(0);
  const positions=await cells.evaluateAll(items=>items.map(item=>item.getBoundingClientRect().top));
  expect(positions.every((top,index)=>index===0||top>positions[index-1])).toBe(true);
  const tokens=page.locator('.cm-line span');expect(await tokens.count()).toBeGreaterThan(0);
  const colors=await tokens.evaluateAll(items=>[...new Set(items.map(item=>getComputedStyle(item).color))]);
  expect(colors.length).toBeGreaterThan(1);
  await page.locator('[data-notebook-add]').click();
  const editor=page.locator('[data-notebook-code]').last();await editor.fill('');
  await editor.pressSequentially('pri');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.getByRole('option').filter({hasText:/^print/}).first().click();
  expect((await page.evaluate(()=>window.studentNotebook.cells)).at(-1).source).toBe('print');
  await page.reload();
  expect((await page.evaluate(()=>window.studentNotebook?.cells)).at(-1).source).toBe('print');
});

test('automatic Python analysis completes standard library attributes and types defined in earlier cells without running them',async({page})=>{
  test.setTimeout(90000);
  await page.goto('/deep-learning/terms/spring-2026/s01/practice/');
  await page.locator('[data-notebook-add]').click();
  let editor=page.locator('[data-notebook-code]').last();
  await editor.fill('import math\nmath.');await editor.pressSequentially('sq');
  await expect(page.getByRole('option').filter({hasText:/^sqrt/}).first()).toBeVisible({timeout:60000});
  await editor.press('Escape');
  await editor.fill('class Learner:\n    def predict(self):\n        return 1\nlearner = Learner()\n');
  await page.locator('[data-notebook-add]').click();editor=page.locator('[data-notebook-code]').last();
  await editor.fill('learner.');await editor.pressSequentially('pre');
  await expect(page.getByRole('option').filter({hasText:/^predict/}).first()).toBeVisible({timeout:20000});
  expect(await page.evaluate(()=>window.studentNotebook.record)).toBeNull();
});

test('optional packages install in practice and the actual laboratory and export pinned requirements',async({page})=>{
  test.skip(process.env.CHECK_PYTHON_PACKAGES!=='1','Optional online Pyodide package installation is verified separately.');
  test.setTimeout(240000);
  for(const laboratory of [false,true]) {
    if(laboratory)await openBook(page);
    else await page.goto('/deep-learning/terms/spring-2026/s01/practice/');
    await page.locator('.nb-packages summary').click();await page.getByLabel('بسته‌های مورد نیاز').fill('numpy');
    await page.locator('[data-notebook-install]').click();await expect(page.locator('.nb-packages')).toContainText('numpy==2.0.2',{timeout:120000});
    await page.locator('[data-notebook-add]').click();
    await page.locator('[data-notebook-code]').last().fill('import numpy as np\nresult = {"sum": int(np.array([1, 2, 3]).sum())}\n');
    await page.locator('[data-notebook-run-all]').click();
    await page.waitForFunction(native=>(native?window.labNotebook:window.studentNotebook)?.record?.ok,laboratory,{timeout:30000});
    const result=await page.evaluate(native=>(native?window.labNotebook:window.studentNotebook).record.outputs.at(-1).result,laboratory);
    expect(result.sum).toBe(6);
    await page.locator('.nb-tools:not(.nb-packages) summary').click();
    const pending=page.waitForEvent('download');await page.locator('[data-notebook-download]').click();const zip=await(await pending).path();
    expect(execFileSync('python3',['-c','import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); print(z.read("requirements.txt").decode())',zip],{encoding:'utf8'})).toContain('numpy==2.0.2');
  }
});

test('only mapped slide pages offer exploration, and plotted weights respond to the actual notebook code',async({page})=>{
  test.setTimeout(90000);await page.setViewportSize({width:1440,height:1000});
  await page.goto('/deep-learning/terms/spring-2026/s13/slides/#page=28');
  await page.waitForFunction(()=>window.sourceSlideReader?.ready);
  await page.locator('[data-page-experiment]').click();
  await expect(page.locator('#source-canvas')).toBeVisible();
  const tools=page.frameLocator('[data-reader-tools-frame]');
  await tools.locator('[data-notebook-run-all]').click();
  const frame=page.frames().find(f=>f.url().includes('/practice/'));
  await frame.waitForFunction(()=>window.studentNotebook?.record?.ok,null,{timeout:65000});
  await tools.getByRole('button',{name:'وزن‌ها (weights)',exact:true}).click();
  await tools.getByRole('button',{name:/^weights\[0\]/}).click();
  await expect(tools.locator('.nb-result-readout').last()).toContainText('0.063378938333');
  const editor=tools.locator('[data-notebook-code]').first();
  const original=await frame.evaluate(()=>window.studentNotebook.cells[0].source);
  await editor.fill(original.replace('query_weights = [[1, 0, 1], [1, 0, 0], [0, 0, 1], [0, 1, 1]]','query_weights = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]'));
  await tools.locator('[data-notebook-run-all]').click();
  await frame.waitForFunction(()=>window.studentNotebook?.record?.ok,null,{timeout:10000});
  await tools.getByRole('button',{name:'وزن‌ها (weights)',exact:true}).click();
  await tools.getByRole('button',{name:/^weights\[0\]/}).click();
  await expect(tools.locator('.nb-result-readout').last()).toContainText('0.333333333333');
  await page.locator('[data-page-select]').selectOption('1');
  await expect(page.locator('body')).toHaveAttribute('data-reader-section','slides');
  await expect(page.locator('[data-page-experiment]')).toBeHidden();
});

test('code tips highlight actual Python while preserving every source character',async({page})=>{
  await page.goto('/deep-learning/terms/spring-2026/s01/practice/#questions');
  await page.locator('.nb-code-tip summary').click();
  const code=page.locator('.nb-code-tip pre');
  await expect(code.locator('.tok-keyword').first()).toBeVisible();
  expect(await code.textContent()).toBe(await page.locator('#practice-config').evaluate(node=>JSON.parse(node.textContent).tip.code));
  await expect(page.locator('.nb-quiz textarea')).toHaveCount(0);
});

test('code size controls stay usable and preserve notebook content on desktop and mobile',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.goto('/deep-learning/terms/spring-2026/s01/practice/');
  const editor=page.locator('[data-notebook-code]').first();
  await expect(editor).toBeVisible();
  const source=await page.evaluate(()=>window.studentNotebook.cells[0].source);
  const size=page.locator('[data-notebook-font-size]');
  await expect(size).toHaveText('14px');
  expect(await editor.evaluate(node=>parseFloat(getComputedStyle(node).fontSize))).toBe(14);
  await page.getByRole('button',{name:'بزرگ کردن کد'}).click();
  await expect(size).toHaveText('16px');
  expect(await editor.evaluate(node=>parseFloat(getComputedStyle(node).fontSize))).toBe(16);
  await page.reload();
  await expect(size).toHaveText('16px');
  expect(await page.evaluate(()=>window.studentNotebook.cells[0].source)).toBe(source);
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'کوچک کردن کد'}).click();
  await expect(size).toHaveText('14px');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.locator('[data-notebook-add]').click();
  await expect(page.locator('[data-notebook-code]').last()).toBeVisible();
});

test('notebook interface text keeps shortcuts readable without changing questions or code',async({page})=>{
  await page.goto('/deep-learning/terms/spring-2026/s01/practice/');
  const original=await page.locator('#practice-config').evaluate(node=>JSON.parse(node.textContent));
  const cells=await page.evaluate(()=>window.studentNotebook.cells.map(cell=>cell.source));
  await expect(page.locator('[data-notebook-run-all]')).toHaveText('اجرای همه سلول‌ها');
  const shortcuts=page.locator('.nb-editor-help bdi');
  await expect(shortcuts).toHaveCount(3);
  expect(await shortcuts.allTextContents()).toEqual(['Ctrl+Space','Ctrl+Enter','Shift+Enter']);
  expect(await shortcuts.evaluateAll(nodes=>nodes.every(node=>getComputedStyle(node).direction==='ltr'))).toBe(true);
  await page.getByRole('tab',{name:'آزمون تستی'}).click();
  const first=page.locator('[data-notebook-question]').first();
  await expect(first.locator('legend')).toHaveText(original.questions[0].prompt);
  expect(await first.locator('label span').allTextContents()).toEqual(original.questions[0].options);
  await first.locator('input').first().check();await first.getByRole('button',{name:'بررسی پاسخ'}).click();
  await expect(first.locator('.feedback')).toContainText(original.questions[0].explanation);
  expect(await page.evaluate(()=>window.studentNotebook.cells.map(cell=>cell.source))).toEqual(cells);
});
