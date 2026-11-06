import {test,expect} from '@playwright/test';

for(const size of [{width:1440,height:900},{width:390,height:844}]){
 test(`perceptron film works from slide and notebook ${size.width}`,async({page})=>{
  await page.setViewportSize(size);
  await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=25');
  const button=page.getByRole('button',{name:'فیلم دو گام پرسپترون'});
  await expect(button).toBeVisible();await button.click();
  const frame=page.frameLocator('[data-reader-tools-frame]');
  await expect(frame.locator('video')).toBeVisible();
  await frame.locator('video').evaluate(v=>v.play());
  await expect.poll(()=>frame.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(0);
  await frame.getByRole('button',{name:'نمونه دوم'}).click();
  await expect.poll(()=>frame.locator('video').evaluate(v=>v.currentTime)).toBeCloseTo(8.8,1);
  await page.goto('/deep-learning/terms/spring-2026/s02/practice/?source-page=25#code');
  await page.getByText('فیلم دو گام آموزش').click();
  const embedded=page.frameLocator('[data-perceptron-film]');
  await expect(embedded.locator('video')).toBeVisible();
  await embedded.getByRole('button',{name:'اصلاح دوم'}).click();
  await expect.poll(()=>embedded.locator('video').evaluate(v=>v.currentTime)).toBeCloseTo(10.1,1);
 });
}

test('motivation slide preserves its images and separately positioned questions',async({page})=>{
 await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=5');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===5);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 await expect(page.locator('.reader-slide-text[data-source-lines="8"]')).toContainText('چه چیزی');
 await expect(page.locator('.reader-slide-text[data-source-lines="9"]')).toContainText('چه کسی');
 const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(n=>n.scrollHeight>n.clientHeight+2||n.scrollWidth>n.clientWidth+2).map(n=>n.textContent));
 expect(overflow).toEqual([]);
});

test('neuroscience discovery slide keeps the two portraits and captions apart',async({page})=>{
 await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=6');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===6);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 for(const lines of ['2,3,4','5,6,7','8,9,10','11,12,13'])await expect(page.locator(`.reader-slide-text[data-source-lines="${lines}"]`)).toBeVisible();
 const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(n=>n.scrollHeight>n.clientHeight+2||n.scrollWidth>n.clientWidth+2).map(n=>n.textContent));
 expect(overflow).toEqual([]);
});

test('neuron threshold slide retains the diagram and separated text',async({browser})=>{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  const page=await context.newPage();await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=7');
  await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===7);
  if(width===390){await page.locator('[data-view-translation]').click();await page.waitForFunction(()=>window.sourceSlideReader?.ready);}
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
  await expect(page.locator('.reader-slide-text[data-source-lines="14,15,16"]')).toBeVisible();
  await expect(page.locator('.reader-slide-text[data-source-lines="17"]')).toBeVisible();
  const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(n=>n.scrollHeight>n.clientHeight+2||n.scrollWidth>n.clientWidth+2).map(n=>n.textContent));
  expect(overflow).toEqual([]);await context.close();
 }
});

test('biological neuron video has a short working destination and preserves the figure',async({page})=>{
 await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=8');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===8);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 const link=page.getByRole('link',{name:'ویدیو: از ۰:۰۸ تا ۱:۱۲'});
 await expect(link).toBeVisible();await expect(link).toHaveAttribute('href','https://youtu.be/oa6rvUJlg7o?t=8');
});

test('Rosenblatt slide separates the portrait caption and quotation',async({page})=>{
 await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=10');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===10);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 await expect(page.locator('.reader-slide-text[data-source-lines="0,1,2"]')).toBeVisible();
 const quote=page.locator('.reader-slide-text[data-source-lines="3,4,5"]');await expect(quote).toBeVisible();
 await expect(quote.locator('.reader-emphasis').first()).toHaveCSS('color','rgb(255, 192, 0)');
 const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(n=>n.scrollHeight>n.clientHeight+2||n.scrollWidth>n.clientWidth+2).map(n=>n.textContent));expect(overflow).toEqual([]);
});

test('history slide has separate milestones and a sourced correction',async({page})=>{
 await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=11');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===11);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 await expect(page.locator('.reader-slide-text')).toHaveCount(4);
 await expect(page.locator('.reader-slide-text[data-source-lines="3"] .reader-emphasis')).toHaveCSS('color','rgb(255, 192, 0)');
 const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(n=>n.scrollHeight>n.clientHeight+2||n.scrollWidth>n.clientWidth+2).map(n=>n.textContent));expect(overflow).toEqual([]);
 const note=await page.evaluate(async()=>{const config=JSON.parse(document.querySelector('#source-reader-config').textContent),data=await(await fetch(config.translationUrl)).json();return data.pages[10].editorial_notes[0];});
 expect(note.references[0].url).toBe('https://www.computerhistory.org/tdih/may/12/');expect(note.fa).toContain('۱۹۴۱');
});

test('neuron model slide retains truth tables and a verified resource',async({browser})=>{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  const page=await context.newPage();await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=12');
  await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===12);
  if(width===390){await page.locator('[data-view-translation]').click();await page.waitForFunction(()=>window.sourceSlideReader?.ready);}
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
  await expect(page.getByRole('link',{name:'جدول‌های بیشتر'})).toHaveAttribute('href','https://sites.millersville.edu/bikenaga/math-proof/truth-tables/truth-tables.html');
  await expect(page.locator('.reader-figure-content table')).toHaveCount(2);
  const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(n=>n.scrollHeight>n.clientHeight+2||n.scrollWidth>n.clientWidth+2).map(n=>n.textContent));expect(overflow).toEqual([]);await context.close();
 }
});

test('key ideas slide separates the quotation and four claims',async({browser})=>{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  const page=await context.newPage();await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=13');
  await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===13);
  if(width===390){await page.locator('[data-view-translation]').click();await page.waitForFunction(()=>window.sourceSlideReader?.ready);}
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  for(const line of [9,10,11,12])await expect(page.locator(`.reader-slide-text[data-source-lines="${line}"]`)).toBeVisible();
  const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(n=>n.scrollHeight>n.clientHeight+2||n.scrollWidth>n.clientWidth+2).map(n=>n.textContent));expect(overflow).toEqual([]);await context.close();
 }
});

test('architecture slide preserves images and two distinct statements',async({page})=>{
 await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=14');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===14);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 await expect(page.locator('.reader-slide-text[data-source-lines="1,2"]')).toBeVisible();
 await expect(page.locator('.reader-slide-text[data-source-lines="3,4"]')).toBeVisible();
 const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(n=>n.scrollHeight>n.clientHeight+2||n.scrollWidth>n.clientWidth+2).map(n=>n.textContent));expect(overflow).toEqual([]);
});

test('neuron diagram slide retains the diagram when a source text operator is unmatched',async({browser})=>{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  const page=await context.newPage();await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=15');
  await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===15);
  if(width===390){await page.locator('[data-view-translation]').click();await page.waitForFunction(()=>window.sourceSlideReader?.ready);}
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
  await expect(page.locator('.reader-slide-text[data-source-lines="1,2,3"]')).toBeVisible();
  await expect(page.locator('.reader-slide-text[data-source-lines="5,6,7,8"]')).toBeVisible();
  const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(n=>n.scrollHeight>n.clientHeight+2||n.scrollWidth>n.clientWidth+2).map(n=>n.textContent));expect(overflow).toEqual([]);await context.close();
 }
});

test('perceptron equations preserve the figure and distinguish output labels from threshold',async({browser})=>{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  const page=await context.newPage();await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=16');
  await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===16);
  if(width===390){await page.locator('[data-view-translation]').click();await page.waitForFunction(()=>window.sourceSlideReader?.ready);}
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
  await expect(page.locator('.reader-slide-text[data-source-lines="4"]')).toContainText('بایاس');
  const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(n=>n.scrollHeight>n.clientHeight+2||n.scrollWidth>n.clientWidth+2).map(n=>n.textContent));expect(overflow).toEqual([]);
  const note=await page.evaluate(async()=>{const config=JSON.parse(document.querySelector('#source-reader-config').textContent),data=await(await fetch(config.translationUrl)).json();return data.pages[15].editorial_notes[0];});expect(note.fa).toContain('برچسب‌های خروجی');await context.close();
 }
});

test('decision boundary slide preserves the plot and explains its label',async({browser})=>{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  const page=await context.newPage();await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=17');
  await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===17);
  if(width===390){await page.locator('[data-view-translation]').click();await page.waitForFunction(()=>window.sourceSlideReader?.ready);}
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
  await expect(page.locator('.reader-slide-text[data-source-lines="6"]')).toHaveCSS('transform',/matrix/);
  const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(n=>n.scrollHeight>n.clientHeight+2||n.scrollWidth>n.clientWidth+2).map(n=>n.textContent));expect(overflow).toEqual([]);
  const note=await page.evaluate(async()=>{const config=JSON.parse(document.querySelector('#source-reader-config').textContent),data=await(await fetch(config.translationUrl)).json();return data.pages[16].editorial_notes[0];});expect(note.fa).toContain('مرز تصمیم');await context.close();
 }
});

test('learning motivation slide has a distinct title and statement',async({page})=>{
 await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=18');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===18);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 await expect(page.locator('.reader-slide-text')).toHaveCount(2);
 const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(n=>n.scrollHeight>n.clientHeight+2||n.scrollWidth>n.clientWidth+2).map(n=>n.textContent));expect(overflow).toEqual([]);
});

test('mistake-driven questions open and accept an answer on desktop and mobile',async({browser})=>{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  try{
   const page=await context.newPage();await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=19');
   await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===19);
   await page.locator('[data-reader-section="questions"]').first().click();
   const questions=page.frameLocator('[data-reader-tools-frame]').locator('.nb-question');
   await expect(questions).toHaveCount(2);
   const first=questions.first();await first.locator('input[type="radio"]').first().check();
   await first.getByRole('button',{name:'بررسی پاسخ'}).click();
   await expect(first).toContainText('درست است');
  }finally{await context.close();}
 }
});

test('true model slides retain the source figure and separated Persian text',async({browser})=>{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  try{
   const page=await context.newPage();
   for(const number of [21,22,23,24]){
    await page.goto(`/deep-learning/terms/spring-2026/s02/slides/#page=${number}`);
    await page.waitForFunction(expected=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===expected,number);
    if(width===390)await page.locator('[data-view-translation]').click();
    await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
    await expect(page.locator('.reader-slide-text').first()).toContainText('مثال: مدل واقعی');
    await expect(page.locator('.reader-slide-text').nth(1)).toContainText('3 ورودی');
    await expect(page.locator('.reader-slide-text').nth(1).locator('bdi[dir=ltr]',{hasText:'-1'})).toHaveCount(1);
    const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(node=>node.scrollHeight>node.clientHeight+2||node.scrollWidth>node.clientWidth+2).map(node=>node.textContent));
    expect(overflow).toEqual([]);
    if(number===24){
     const companion=page.locator('.reader-figure-labels');await companion.locator('summary').click();
     const rows=await companion.locator('tbody tr').evaluateAll(items=>items.map(row=>[...row.cells].map(cell=>cell.textContent)));
     expect(rows).toEqual([['1','0','0','-1'],['1','0','1','1'],['1','1','0','1'],['1','1','1','1'],['0','0','1','-1'],['0','1','0','-1'],['0','1','1','1'],['0','0','0','-1']]);
    }
   }
  }finally{await context.close();}
 }
});

test('perceptron update question keeps the source equations and example',async({browser})=>{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  try{
   const page=await context.newPage();await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=26');
   await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===26);
   if(width===390)await page.locator('[data-view-translation]').click();
   await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
   await expect(page.locator('.reader-slide-text').last()).toContainText('آیا پارامترهای مدل');
   await expect(page.locator('.reader-slide-background')).toBeVisible();
   const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(node=>node.scrollHeight>node.clientHeight+2||node.scrollWidth>node.clientWidth+2).map(node=>node.textContent));expect(overflow).toEqual([]);
   const companion=page.locator('.reader-figure-labels');await companion.locator('summary').click();await expect(companion).toContainText('پیش‌بینی‌شده');
   const tables=companion.locator('table');await expect(tables).toHaveCount(2);
   expect(await tables.nth(0).locator('tbody tr').evaluateAll(rows=>rows.map(row=>[...row.cells].map(cell=>cell.textContent)))).toEqual([['1','0','0','-1','1']]);
   expect(await tables.nth(1).locator('tbody tr').evaluateAll(rows=>rows.map(row=>[...row.cells].map(cell=>cell.textContent)))).toEqual([['0','0','0','0']]);
  }finally{await context.close();}
 }
});

test('mistake driven rule preserves both formulas and positioned statements',async({browser})=>{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  try{
   const page=await context.newPage();await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=20');
   await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===20);
   if(width===390)await page.locator('[data-view-translation]').click();
   await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
   const slide=page.locator('#persian-page');await expect(slide).toContainText('معیار توقف');await expect(slide).toContainText('در غیر این صورت');
   const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(node=>node.scrollHeight>node.clientHeight+2||node.scrollWidth>node.clientWidth+2).map(node=>node.textContent));expect(overflow).toEqual([]);
   const details=page.locator('.reader-figure-labels');await details.locator('summary').click();await expect(details.locator('.katex')).toHaveCount(2);
  }finally{await context.close();}
 }
});

test('first prediction slide keeps its example and unknown prediction',async({browser})=>{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  try{
   const page=await context.newPage();await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=25');
   await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===25);
   if(width===390)await page.locator('[data-view-translation]').click();
   await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
   await expect(page.locator('#persian-page')).toContainText('مدل چه چیزی پیش‌بینی می‌کند؟');
   const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(node=>node.scrollHeight>node.clientHeight+2||node.scrollWidth>node.clientWidth+2).map(node=>node.textContent));expect(overflow).toEqual([]);
   const companion=page.locator('.reader-figure-labels');await companion.locator('summary').click();
   await expect(companion.locator('.katex')).toHaveCount(2);
   const tables=companion.locator('table');await expect(tables).toHaveCount(2);
   expect(await tables.nth(0).locator('tbody tr').evaluateAll(rows=>rows.map(row=>[...row.cells].map(cell=>cell.textContent)))).toEqual([['1','0','0','-1','?']]);
   expect(await tables.nth(1).locator('tbody tr').evaluateAll(rows=>rows.map(row=>[...row.cells].map(cell=>cell.textContent)))).toEqual([['0','0','0','0']]);
  }finally{await context.close();}
 }
});

test('first sample update preserves calculations and unanswered weights',async({browser})=>{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  try{
   const page=await context.newPage();await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=27');
   await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===27);
   if(width===390)await page.locator('[data-view-translation]').click();
   await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
   await expect(page.locator('#persian-page')).toContainText('نرخ یادگیری');
   const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(node=>node.scrollHeight>node.clientHeight+2||node.scrollWidth>node.clientWidth+2).map(node=>node.textContent));expect(overflow).toEqual([]);
   const companion=page.locator('.reader-figure-labels');await companion.locator('summary').click();
   await expect(companion.locator('.katex')).toHaveCount(4);
   const tables=companion.locator('table');await expect(tables).toHaveCount(2);
   expect(await tables.nth(1).locator('tbody tr').evaluateAll(rows=>rows.map(row=>[...row.cells].map(cell=>cell.textContent)))).toEqual([['0','0','0','0'],['?','?','?','?']]);
  }finally{await context.close();}
 }
});

test('second sample prediction keeps the reference values',async({browser})=>{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  try{
   const page=await context.newPage();await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=28');
   await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===28);
   if(width===390)await page.locator('[data-view-translation]').click();
   await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
   const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(node=>node.scrollHeight>node.clientHeight+2||node.scrollWidth>node.clientWidth+2).map(node=>node.textContent));expect(overflow).toEqual([]);
   const companion=page.locator('.reader-figure-labels');await companion.locator('summary').click();
   const tables=companion.locator('table');await expect(tables).toHaveCount(2);
   expect(await tables.nth(0).locator('tbody tr').evaluateAll(rows=>rows.map(row=>[...row.cells].map(cell=>cell.textContent)))).toEqual([['1','0','0','-1','1'],['1','0','1','1','?']]);
   expect(await tables.nth(1).locator('tbody tr').evaluateAll(rows=>rows.map(row=>[...row.cells].map(cell=>cell.textContent)))).toEqual([['0','0','0','0'],['-0.2','-0.2','0','0']]);
  }finally{await context.close();}
 }
});

test('second sample update preserves predictions and weights',async({browser})=>{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  try{
   const page=await context.newPage();await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=29');
   await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===29);
   if(width===390)await page.locator('[data-view-translation]').click();
   await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
   await expect(page.locator('#persian-page')).toContainText('آیا پارامترهای مدل');
   const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(node=>node.scrollHeight>node.clientHeight+2||node.scrollWidth>node.clientWidth+2).map(node=>node.textContent));expect(overflow).toEqual([]);
   const companion=page.locator('.reader-figure-labels');await companion.locator('summary').click();
   const tables=companion.locator('table');await expect(tables).toHaveCount(2);
   expect(await tables.nth(0).locator('tbody tr').evaluateAll(rows=>rows.map(row=>[...row.cells].map(cell=>cell.textContent)))).toEqual([['1','0','0','-1','1'],['1','0','1','1','-1']]);
  }finally{await context.close();}
 }
});

test('second sample calculations keep unknown next weights',async({browser})=>{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  try{
   const page=await context.newPage();await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=30');
   await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===30);
   if(width===390)await page.locator('[data-view-translation]').click();
   await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
   const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(node=>node.scrollHeight>node.clientHeight+2||node.scrollWidth>node.clientWidth+2).map(node=>node.textContent));expect(overflow).toEqual([]);
   const companion=page.locator('.reader-figure-labels');await companion.locator('summary').click();
   await expect(companion.locator('.katex')).toHaveCount(4);
   const tables=companion.locator('table');await expect(tables).toHaveCount(2);
   expect(await tables.nth(1).locator('tbody tr').evaluateAll(rows=>rows.map(row=>[...row.cells].map(cell=>cell.textContent)))).toEqual([['0','0','0','0'],['-0.2','-0.2','0','0'],['?','?','?','?']]);
  }finally{await context.close();}
 }
});

test('epoch example retains both source tables and questions',async({browser})=>{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  try{
   const page=await context.newPage();await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=31');
   await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===31);
   if(width===390)await page.locator('[data-view-translation]').click();
   await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
   await expect(page.locator('#persian-page')).toContainText('چرا ممکن است وزن‌ها');
   const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(node=>node.scrollHeight>node.clientHeight+2||node.scrollWidth>node.clientWidth+2).map(node=>node.textContent));expect(overflow).toEqual([]);
   const companion=page.locator('.reader-figure-labels');await companion.locator('summary').click();
   const tables=companion.locator('table');await expect(tables).toHaveCount(2);
   await expect(tables.nth(0).locator('tbody tr')).toHaveCount(8);
   expect(await tables.nth(1).locator('tbody tr').evaluateAll(rows=>rows.map(row=>[...row.cells].map(cell=>cell.textContent)))).toEqual([['0','0','0','0','0'],['1','-0.2','-0.2','0','0'],['2','0','0','0','0.2'],['3','0','0','0','0.2'],['4','0','0','0','0.2'],['5','-0.2','0','0','0'],['6','-0.2','0','0','0'],['7','0','0','0.2','0.2'],['8','-0.2','0','0.2','0.2']]);
  }finally{await context.close();}
 }
});

test('multiple epochs table preserves the reference weights',async({browser})=>{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  try{
   const page=await context.newPage();await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=32');
   await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===32);
   if(width===390)await page.locator('[data-view-translation]').click();
   await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
   const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(node=>node.scrollHeight>node.clientHeight+2||node.scrollWidth>node.clientWidth+2).map(node=>node.textContent));expect(overflow).toEqual([]);
   const companion=page.locator('.reader-figure-labels');await companion.locator('summary').click();
   expect(await companion.locator('table tbody tr').evaluateAll(rows=>rows.map(row=>[...row.cells].map(cell=>cell.textContent)))).toEqual([['0','0','0','0','0'],['1','-0.2','0','0.2','0.2'],['2','-0.2','0','0.4','0.2'],['3','-0.4','0','0.4','0.2'],['4','-0.4','0.2','0.4','0.4'],['5','-0.6','0.2','0.4','0.2'],['6','-0.6','0.4','0.4','0.2']]);
  }finally{await context.close();}
 }
});

test('Rosenblatt experiments retain both figures and their captions',async({browser})=>{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  try{
   const page=await context.newPage();await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=33');
   await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===33);
   if(width===390)await page.locator('[data-view-translation]').click();
   await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
   await expect(page.locator('#persian-page')).toContainText('اسمیتسونین');
   const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(node=>node.scrollHeight>node.clientHeight+2||node.scrollWidth>node.clientWidth+2).map(node=>node.textContent));expect(overflow).toEqual([]);
   const companion=page.locator('.reader-figure-labels');await companion.locator('summary').click();await expect(companion).toContainText('درصد پاسخ درست');
  }finally{await context.close();}
 }
});

test('Rosenblatt motivation quote retains its complete translation',async({browser})=>{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  try{
   const page=await context.newPage();await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=34');
   await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===34);
   if(width===390)await page.locator('[data-view-translation]').click();
   await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
   await expect(page.locator('#persian-page')).toContainText('ساده‌سازی‌های انجام‌شده نسبت به سامانه‌های زیستی');
   const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(node=>node.scrollHeight>node.clientHeight+2||node.scrollWidth>node.clientWidth+2).map(node=>node.textContent));expect(overflow).toEqual([]);
  }finally{await context.close();}
 }
});

test('newspaper slide retains its image and translated headline',async({browser})=>{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  try{
   const page=await context.newPage();await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=35');
   await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===35);
   if(width===390)await page.locator('[data-view-translation]').click();
   await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
   const overflow=await page.locator('.reader-slide-text').evaluateAll(nodes=>nodes.filter(node=>node.scrollHeight>node.clientHeight+2||node.scrollWidth>node.clientWidth+2).map(node=>node.textContent));expect(overflow).toEqual([]);
   const companion=page.locator('.reader-figure-labels');await companion.locator('summary').click();await expect(companion).toContainText('خود را بازتولید کند');
  }finally{await context.close();}
 }
});

test('long historical quotation remains complete in readable fallback',async({browser})=>{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  try{
   const page=await context.newPage();await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=37');
   await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===37);
   if(width===390)await page.locator('[data-view-translation]').click();
   await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','text-overflow');
   await expect(page.locator('#persian-page')).toContainText('به نظر نمی‌رسد بفهمند');
   await expect(page.locator('#persian-page')).toContainText('آفریده‌ای مهارنشدنی');
  }finally{await context.close();}
 }
});
