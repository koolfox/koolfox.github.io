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
