import {test, expect} from '@playwright/test';

for (const width of [390, 1440]) test(`lesson 5 opening retains the source layout at ${width}px`, async ({page}, testInfo) => {
  await page.setViewportSize({width, height: 850});
  for (let number = 3; number <= 10; number++) {
    await page.goto(`/deep-learning/terms/spring-2026/s05/slides/#page=${number}`);
    await page.waitForFunction(n => window.sourceSlideReader?.ready && window.sourceSlideReader.page === n, number);
    if (width === 390) {
      const previous = await page.locator('#persian-page .reader-slide-stage').elementHandle();
      await page.locator('[data-view-translation]').click();
      if (previous) await page.waitForFunction(node => !node.isConnected, previous);
      await page.waitForFunction(n => window.sourceSlideReader?.ready && window.sourceSlideReader.page === n, number);
    }
    const slide = page.locator('#persian-page');
    await expect(slide).toHaveAttribute('data-layout', /source-canvas/);
    await expect(slide.locator('.reader-slide-background')).toBeVisible();
    if (number <= 4) {
      await expect(slide.locator('.reader-slide-text').filter({hasText:'مساله:'})).toBeVisible();
      await expect(slide.locator('.reader-slide-text').filter({hasText:'ناوردایی'})).toBeVisible();
    }
    if (number >= 6 && number <= 8) await expect(slide.locator('.reader-image-translation')).toHaveCount(4);
    if (number === 9) await expect(slide.locator('.reader-image-translation')).toHaveCount(6);
    if (number === 10) {
      await expect(slide.locator('.reader-slide-text').filter({hasText:'دو ورودی کاملا متفاوت'})).toBeVisible();
      await expect(slide.locator('.reader-slide-text').filter({hasText:'افزایش داده آموزش'})).toBeVisible();
    }
    expect(await slide.locator('.reader-slide-text').evaluateAll(nodes => nodes.every(node =>
      node.scrollHeight <= node.clientHeight + 2 && node.scrollWidth <= node.clientWidth + 2))).toBeTruthy();
    await page.screenshot({path:testInfo.outputPath(`s05-page-${number}-${width}.png`)});
  }
});

for (const width of [390, 1440]) test(`CNN review retains its source canvas at ${width}px`, async ({page}, testInfo) => {
  await page.setViewportSize({width, height:850});
  await page.goto('/deep-learning/terms/spring-2026/s05/slides/#page=2');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 2);
  if(width===390) await page.locator('[data-view-translation]').click();
  const slide=page.locator('#persian-page');
  await expect(slide).toHaveAttribute('data-layout','source-canvas');
  await expect(slide.locator('.reader-slide-text')).toHaveCount(10);
  const reading=slide.locator('.reader-mobile-transcript');
  if(width===390){
    await expect(reading).toBeVisible();
    await reading.locator('summary').click();
    await expect(reading.locator('.reader-mobile-transcript-content')).toContainText('مجموعه مساله');
    await expect(reading.locator('.reader-copy').first()).toHaveCSS('font-size', /^(16|19)px$/);
  }else await expect(reading).toBeHidden();
  for(const text of ['مجموعه مساله', 'داده دنباله ای', 'PyTorch']) await expect(slide.locator('.reader-slide-text').filter({hasText:text})).toBeVisible();
  expect(await slide.locator('.reader-slide-text').evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2))).toBeTruthy();
  await page.screenshot({path:testInfo.outputPath(`s05-review-${width}.png`)});
});

for (const width of [390, 1440]) test(`CNN opening slide retains readable centered attribution at ${width}px`, async ({page}, testInfo) => {
  await page.setViewportSize({width, height: 850});
  await page.goto('/deep-learning/terms/spring-2026/s05/slides/#page=1');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 1);
  if (width === 390) await page.locator('[data-view-translation]').click();
  const slide = page.locator('#persian-page');
  await expect(slide).toHaveAttribute('data-layout', 'source-canvas');
  const heading = slide.locator('.reader-slide-text').filter({hasText: 'Convolutional Neural Networks; CNNs'});
  await expect(heading).toBeVisible();
  await expect(heading.locator('bdi').filter({hasText:'Convolutional Neural Networks; CNNs'})).toHaveCSS('white-space', 'nowrap');
  for (const text of ['Danna Gurari', 'University of Colorado Boulder', '2026']) await expect(slide.locator('.reader-slide-text').filter({hasText:text})).toBeVisible();
  expect(await slide.locator('.reader-slide-text').evaluateAll(nodes => nodes.every(node => node.scrollHeight <= node.clientHeight + 2))).toBeTruthy();
  await page.screenshot({path:testInfo.outputPath(`s05-opening-${width}.png`)});
});

for (const [width,height] of [[1280,720],[1920,1080],[1024,768]]) test(`visual-cortex figure labels remain readable at ${width}x${height}`, async ({page}) => {
  await page.setViewportSize({width,height});
  for (const number of [6,7,8]) {
    await page.goto(`/deep-learning/terms/spring-2026/s05/slides/#page=${number}`);
    await page.waitForFunction(n => window.sourceSlideReader?.ready && window.sourceSlideReader.renderedPage === n, number);
    await page.locator('[data-view-translation]').click();
    const slide=page.locator('#persian-page');
    await expect(slide).toHaveAttribute('data-layout','source-canvas-figure-companion');
    const labels=slide.locator('.reader-image-translation');
    await expect(labels).toHaveCount(4);
    await expect.poll(async () => labels.evaluateAll(nodes => nodes.every(node => {
      const rect=node.getBoundingClientRect();
      const scale=node.offsetWidth ? rect.width/node.offsetWidth : 0;
      return parseFloat(getComputedStyle(node).fontSize)*scale>=11.5 &&
        node.scrollHeight<=node.clientHeight+2 && node.scrollWidth<=node.clientWidth+2;
    }))).toBe(true);
  }
});

for (const [width,height] of [[1280,720],[1920,1080],[1024,768]]) test(`CNN review preserves section grouping at ${width}x${height}`, async ({page}) => {
  await page.setViewportSize({width,height});
  await page.goto('/deep-learning/terms/spring-2026/s05/slides/#page=2');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.renderedPage === 2);
  const slide=page.locator('#persian-page');
  await expect(slide).toHaveAttribute('data-layout','source-canvas');
  const boxes=await slide.locator('.reader-slide-text').evaluateAll(nodes=>Object.fromEntries(nodes.map(node=>{
    const rect=node.getBoundingClientRect();return [node.dataset.sourceLines,{top:rect.top,bottom:rect.bottom,right:rect.right}];
  })));
  expect(boxes['6'].top-boxes['5'].bottom).toBeGreaterThan(10);
  expect(boxes['9'].top-boxes['8'].bottom).toBeGreaterThan(10);
  expect(boxes['1'].right-boxes['2'].right).toBeGreaterThan(5);
  expect(boxes['6'].right-boxes['7'].right).toBeGreaterThan(5);
  expect(await slide.locator('.reader-slide-text').evaluateAll(nodes=>nodes.every(node=>
    node.scrollHeight<=node.clientHeight+2 && node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
});

for (const [width,height] of [[1280,720],[1920,1080],[1024,768]]) test(`CNN figure labels and text regions fit at ${width}x${height}`, async ({page}) => {
  await page.setViewportSize({width,height});
  for (const [number,count] of [[39,4],[46,3],[47,6],[53,3]]) {
    await page.goto(`/deep-learning/terms/spring-2026/s05/slides/#page=${number}`);
    await page.waitForFunction(n=>window.sourceSlideReader?.ready && window.sourceSlideReader.renderedPage===n,number);
    const labels=page.locator('#persian-page .reader-image-translation');
    await expect(labels).toHaveCount(count);
    expect(await labels.evaluateAll(nodes=>nodes.every(node=>node.scrollWidth<=node.clientWidth+2 && node.scrollHeight<=node.clientHeight+2))).toBeTruthy();
  }
  for (const [number,a,b] of [[57,'1,2,3','5,6,7'],[62,'7','9,10,11']]) {
    await page.goto(`/deep-learning/terms/spring-2026/s05/slides/#page=${number}`);
    await page.waitForFunction(n=>window.sourceSlideReader?.ready && window.sourceSlideReader.renderedPage===n,number);
    const rect=async lines=>page.locator(`#persian-page .reader-slide-text[data-source-lines="${lines}"]`).evaluate(el=>el.getBoundingClientRect().toJSON());
    const first=await rect(a), second=await rect(b);
    expect(first.right<=second.left+2 || second.right<=first.left+2 || first.bottom<=second.top+2 || second.bottom<=first.top+2).toBeTruthy();
  }
});

for (const [width,height] of [[1280,720],[1920,1080],[1024,768]]) test(`CNN example labels remain clear at ${width}x${height}`, async ({page}) => {
  await page.setViewportSize({width,height});
  await page.goto('/deep-learning/terms/spring-2026/s05/slides/#page=10');
  await page.waitForFunction(()=>window.sourceSlideReader?.ready && window.sourceSlideReader.renderedPage===10);
  const slide=page.locator('#persian-page .reader-slide-stage');
  const label=slide.locator('.reader-slide-text[data-source-lines="12"]');
  const outer=await slide.boundingBox(), inner=await label.boundingBox();
  expect((inner.x+inner.width-outer.x)/outer.width).toBeLessThan(.38);
  await page.goto('/deep-learning/terms/spring-2026/s05/slides/#page=27');
  await page.waitForFunction(()=>window.sourceSlideReader?.ready && window.sourceSlideReader.renderedPage===27);
  const labels=page.locator('#persian-page .reader-image-translation');
  await expect(labels).toHaveCount(2);
  await expect(labels.nth(0)).toHaveText('پاسخ');
  await expect(labels.nth(1)).toHaveText('پاسخ');
});
