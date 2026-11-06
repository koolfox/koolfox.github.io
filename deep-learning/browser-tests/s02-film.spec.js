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
