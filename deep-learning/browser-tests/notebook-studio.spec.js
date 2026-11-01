import {test, expect} from '@playwright/test';
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
  await editor.fill(original.replace('query = [1, 0, 2]','query = [0, 0, 0]'));
  await tools.locator('[data-notebook-run-all]').click();
  await frame.waitForFunction(()=>window.studentNotebook?.record?.ok,null,{timeout:10000});
  await tools.getByRole('button',{name:'وزن‌ها (weights)',exact:true}).click();
  await tools.getByRole('button',{name:/^weights\[0\]/}).click();
  await expect(tools.locator('.nb-result-readout').last()).toContainText('0.333333333333');
  await page.locator('[data-page-select]').selectOption('1');
  await expect(page.locator('body')).toHaveAttribute('data-reader-section','slides');
  await expect(page.locator('[data-page-experiment]')).toBeHidden();
});
