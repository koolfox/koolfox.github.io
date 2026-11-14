import {test, expect} from '@playwright/test';
for(const width of [1440,390]){
  test(`one-hot example keeps steps and source vectors at ${width}px`,async({page},testInfo)=>{
    await page.setViewportSize({width,height:850});
    await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=29');
    await page.waitForFunction(()=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===29);
    if(width===390){
      const previous=await page.locator('#persian-page .reader-slide-stage').elementHandle();
      await page.locator('[data-view-translation]').click();
      if(previous)await page.waitForFunction(node=>!node.isConnected,previous);
      await page.waitForFunction(()=>window.sourceSlideReader?.ready);
    }
    const slide=page.locator('#persian-page');
    await expect(slide).toHaveAttribute('data-layout','source-canvas-figure-companion');
    await expect(slide.locator('.reader-slide-background')).toBeVisible();
    for(const text of ['بردار تک داغ','توکن سازی','واژگان','هر گام زمانی'])
      await expect(slide.locator('.reader-slide-text').filter({hasText:text})).toBeVisible();
    await expect(slide.locator('.reader-emphasis').filter({hasText:'بردار تک داغ'})).toHaveCSS('color','rgb(255, 192, 0)');
    await slide.locator('.reader-slide-holder').screenshot({path:testInfo.outputPath(`s04-page29-${width}.png`)});
  });
}

test('hello tokenization preserves left-to-right order in Persian text', async ({page}) => {
  await page.setViewportSize({width:1280,height:720});
  await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=29');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 29);
  await page.locator('[data-view-translation]').click();
  const line = page.locator('#persian-page .reader-slide-text').filter({hasText:'توکن سازی'});
  const sequence = line.locator('bdi[dir=ltr]').filter({hasText:'“hello” → “h”, “e”, “l”, “l”, “o”'});
  await expect(sequence).toHaveCount(1);
  await expect(line).toHaveCSS('direction','rtl');
});

test('slide 40 keeps the English term together inside its RTL heading', async ({page}) => {
  await page.setViewportSize({width:1280,height:720});
  await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=40');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 40);
  await page.locator('[data-view-translation]').click();
  const slide = page.locator('#persian-page');
  await expect(slide).toHaveAttribute('data-layout', 'source-canvas-figure-companion');
  const heading = slide.locator('.reader-slide-text[data-source-lines="0,1"]');
  await expect(heading).toHaveCSS('direction', 'rtl');
  const term = heading.locator('bdi[dir=ltr]').filter({hasText:'(Hidden Layers)'});
  await expect(term).toHaveCount(1);
  await expect(term).toHaveCSS('white-space', 'nowrap');
  expect(await term.evaluate(node => node.getClientRects().length)).toBe(1);
});

test('review slide aligns Persian groups from the right with nested items indented', async ({page}) => {
  await page.setViewportSize({width:1280,height:720});
  await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=2');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 2);
  await page.locator('[data-view-translation]').click();
  const slide = page.locator('#persian-page');
  await expect(slide).toHaveAttribute('data-layout','source-canvas');
  const title = slide.locator('.reader-slide-text[data-source-lines="0"]');
  const parent = slide.locator('.reader-slide-text[data-source-lines="1"]');
  const child = slide.locator('.reader-slide-text[data-source-lines="2"]');
  for (const node of [title,parent,child]) {
    await expect(node).toHaveCSS('direction','rtl');
    await expect(node).toHaveCSS('text-align','right');
  }
  const bounds = await Promise.all([title,parent,child].map(node=>node.boundingBox()));
  expect(Math.abs((bounds[0].x+bounds[0].width)-(bounds[1].x+bounds[1].width))).toBeLessThan(2);
  expect(bounds[2].x+bounds[2].width).toBeLessThan(bounds[1].x+bounds[1].width-5);
});

for (const number of [3,14,24,26]) test(`slide ${number} aligns its Persian heading right`, async ({page}) => {
  await page.setViewportSize({width:1280,height:720});
  await page.goto(`/deep-learning/terms/spring-2026/s04/slides/#page=${number}`);
  await page.waitForFunction(n=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===n,number);
  await page.locator('[data-view-translation]').click();
  const slide=page.locator('#persian-page'), heading=slide.locator('.reader-slide-text[data-source-lines="0"]');
  await expect(heading).toHaveCSS('direction','rtl');
  await expect(heading).toHaveCSS('text-align','right');
  const [outer,box]=await Promise.all([slide.locator('.reader-slide-stage').boundingBox(),heading.boundingBox()]);
  expect(box.x+box.width).toBeGreaterThan(outer.x+outer.width*.9);
});

for (const number of [41,43,45]) test(`slide ${number} aligns the four RTL training steps`, async ({page}) => {
  await page.setViewportSize({width:1280,height:720});
  await page.goto(`/deep-learning/terms/spring-2026/s04/slides/#page=${number}`);
  await page.waitForFunction(n=>window.sourceSlideReader?.ready&&window.sourceSlideReader.page===n,number);
  await page.locator('[data-view-translation]').click();
  const slide=page.locator('#persian-page');
  await expect(slide).toHaveAttribute('data-layout','source-canvas');
  const steps=slide.locator('.reader-slide-stage > .reader-slide-text').filter({hasText:/^[1-4]\. /});
  await expect(steps).toHaveCount(4);
  const info=await steps.evaluateAll(nodes=>nodes.map(node=>({direction:getComputedStyle(node).direction,align:getComputedStyle(node).textAlign,right:node.getBoundingClientRect().right})));
  for(const item of info){expect(item.direction).toBe('rtl');expect(item.align).toBe('right');}
  expect(Math.max(...info.map(x=>x.right))-Math.min(...info.map(x=>x.right))).toBeLessThan(2);
});
