import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`RNN parameter question keeps the diagram at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=23');
    await page.waitForFunction(() => window.sourceSlideReader?.ready);
    if (width === 390) {
      const stage = page.locator('#persian-page .reader-slide-stage');
      const previous = await stage.count() ? await stage.elementHandle() : null;
      await page.locator('[data-view-translation]').click();
      if (previous) await page.waitForFunction(node => !node.isConnected, previous);
      await page.waitForFunction(() => window.sourceSlideReader?.ready);
    }
    await expect(page.locator('#persian-page')).toHaveAttribute('data-layout', 'source-canvas-figure-companion');
    await expect(page.locator('#persian-page .reader-slide-background')).toBeVisible();
    await expect(page.locator('#persian-page .reader-slide-text').filter({hasText:'چه چیزی بین لایه‌ها متفاوت است'})).toBeVisible();
  });
}

test('slide 34 opens and runs the original hidden-state calculation', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=34');
  await page.waitForFunction(() => window.sourceSlideReader?.ready);
  await page.locator('[data-page-experiment]').click();
  const frame = page.frameLocator('[data-reader-tools-frame]');
  await expect(frame.locator('#practice-config')).toHaveCount(1);
  const handle = page.frames().find(item => item.url().includes('/s04/practice/'));
  expect(handle.url()).toContain('source-page=34');
  await frame.locator('[data-notebook-run-all]').click();
  await handle.waitForFunction(() => window.studentNotebook?.record?.ok, null, {timeout:60000});
  const result = await handle.evaluate(() => window.studentNotebook.record.outputs.at(-1).result);
  expect(result.states[0]).toEqual([0.693168, 0.899554, 0.802118]);
  expect(result.states[1]).toEqual([0.936534, 0.949104, 0.762341]);
  expect(result.prediction).toBe('h');
  expect(result.probabilities[0]).toBeCloseTo(0.419748, 5);
});

test('RNN agenda pages preserve the source canvas and active topic on both layouts', async ({page}) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height:850});
    for (const number of [3, 4, 10, 50, 59, 60]) {
      await page.goto(`/deep-learning/terms/spring-2026/s04/slides/#page=${number}`);
      await page.waitForFunction(n => window.sourceSlideReader?.ready && window.sourceSlideReader.page === n, number);
      if (width === 390) {
        const stage = page.locator('#persian-page .reader-slide-stage');
        const previous = await stage.count() ? await stage.elementHandle() : null;
        await page.locator('[data-view-translation]').click();
        if (previous) await page.waitForFunction(node => !node.isConnected, previous);
        await page.waitForFunction(() => window.sourceSlideReader?.ready);
      }
      await expect(page.locator('#persian-page')).toHaveAttribute('data-layout', 'source-canvas');
      const regions = page.locator('#persian-page .reader-slide-text');
      await expect(regions).toHaveCount(5);
      const actual = await regions.evaluateAll(nodes => nodes.slice(1).map(node => getComputedStyle(node).color));
      const bright={3:[0,1,2,3],4:[0],10:[1],50:[2],59:[3],60:[]}[number];
      expect(actual).toEqual(actual.map((_,index) => bright.includes(index) ? 'rgb(255, 255, 255)' : 'rgb(127, 127, 127)'));
    }
  }
});

test('parity and unrolling examples retain their source figures on both layouts', async ({page}) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height:850});
    for (const number of [5, 7, 14, 15, 16, 17, 19, 22, 24, 25]) {
      await page.goto(`/deep-learning/terms/spring-2026/s04/slides/#page=${number}`);
      await page.waitForFunction(n => window.sourceSlideReader?.ready && window.sourceSlideReader.page === n, number);
      if (width === 390) {
        const stage = page.locator('#persian-page .reader-slide-stage');
        const previous = await stage.count() ? await stage.elementHandle() : null;
        await page.locator('[data-view-translation]').click();
        if (previous) await page.waitForFunction(node => !node.isConnected, previous);
        await page.waitForFunction(() => window.sourceSlideReader?.ready);
      }
      await expect(page.locator('#persian-page')).toHaveAttribute('data-layout', number < 10 ? 'source-canvas' : 'source-canvas-figure-companion');
      await expect(page.locator('#persian-page .reader-slide-background')).toBeVisible();
    }
  }
});

test('parity film is attached to the source page and plays its worked example', async ({page}) => {
  await page.setViewportSize({width:390, height:850});
  await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=27');
  await page.waitForFunction(() => window.sourceSlideReader?.ready);
  await page.locator('[data-source-interactive="rnn-parity"]').click();
  const film = page.frameLocator('[data-reader-tools-frame]');
  await expect(film.locator('video')).toBeVisible();
  await expect(film.locator('[data-film-time]')).toHaveCount(4);
  await film.locator('[data-film-time]').nth(2).click();
  await expect.poll(() => film.locator('video').evaluate(video => video.currentTime)).toBeCloseTo(5, 0);
  await expect(film.locator('track[kind="captions"]')).toHaveAttribute('srclang', 'fa');
  await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=28');
  await page.waitForFunction(() => window.sourceSlideReader?.ready);
  await expect(page.locator('[data-source-interactive="rnn-parity"]')).toHaveCount(0);
});

test('slide 52 notebook separates the exact gradient from source rounding', async ({page}) => {
  test.setTimeout(120000);
  await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=52');
  await page.waitForFunction(() => window.sourceSlideReader?.ready);
  await page.locator('[data-page-experiment]').click();
  const frame = page.frameLocator('[data-reader-tools-frame]');
  await expect(frame.locator('#practice-config')).toHaveCount(1);
  const handle = page.frames().find(item => item.url().includes('/s04/practice/'));
  expect(handle.url()).toContain('source-page=52');
  await frame.locator('[data-notebook-run-all]').click();
  await handle.waitForFunction(() => window.studentNotebook?.record?.ok, null, {timeout:60000});
  const result = await handle.evaluate(() => window.studentNotebook.record.outputs.at(-1).result);
  expect(result.signals).toEqual([0.25, 0.0625, 0.015625, 0.00390625]);
  expect(result.final).toBe(0.00390625);
  expect(result.rounded_source).toBe(0.004);
  await frame.getByRole('tab',{name:'آزمون تستی',exact:true}).click();
  await expect(frame.locator('[data-notebook-question]')).toHaveCount(1);
});


test('activation plots remain visible with readable source-matched captions on mobile', async ({page}) => {
  await page.setViewportSize({width:390, height:850});
  await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=26');
  await page.waitForFunction(() => window.sourceSlideReader?.ready);
  const previous = await page.locator('#persian-page .reader-slide-stage').elementHandle();
  await page.locator('[data-view-translation]').click();
  await page.waitForFunction(node => !node.isConnected, previous);
  await page.waitForFunction(() => window.sourceSlideReader?.ready);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout', 'source-canvas-figure-companion');
  await expect(page.locator('#persian-page .reader-slide-background')).toBeVisible();
  const captions = page.locator('#persian-page .reader-slide-text');
  await expect(captions.filter({hasText:'Sigmoid'})).toBeVisible();
  await expect(captions.locator('span').filter({hasText:'tanh'}).first()).toHaveCSS('color','rgb(255, 192, 0)');
});

test('sequence-length caption fits above its RNN figure on mobile', async ({page}) => {
  await page.setViewportSize({width:390,height:850});
  await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=19');
  await page.waitForFunction(() => window.sourceSlideReader?.ready);
  await page.locator('[data-view-translation]').click();
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
  const caption=page.locator('#persian-page .reader-slide-text').filter({hasText:'از نظر نظری'});
  await expect(caption).toBeVisible();
  const measured=await caption.evaluate(node=>({bottom:parseFloat(node.style.top)+parseFloat(node.style.height),fits:node.scrollHeight<=node.clientHeight+2 && node.scrollWidth<=node.clientWidth+2}));
  expect(measured.fits).toBe(true);
  expect(measured.bottom).toBeLessThanOrEqual(0.34 * 540 + 1);
});

test('review and parity example retain separate source regions on desktop and mobile', async ({page}) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height:850});
    for (const number of [2, 6]) {
      await page.goto(`/deep-learning/terms/spring-2026/s04/slides/#page=${number}`);
      await page.waitForFunction(n => window.sourceSlideReader?.ready && window.sourceSlideReader.page === n, number);
      if (width === 390) {
        const previous = await page.locator('#persian-page .reader-slide-stage').elementHandle();
        await page.locator('[data-view-translation]').click();
        if (previous) await page.waitForFunction(node => !node.isConnected, previous);
        await page.waitForFunction(n => window.sourceSlideReader?.ready && window.sourceSlideReader.page === n, number);
      }
      const slide=page.locator('#persian-page');
      await page.screenshot({path:test.info().outputPath(`s04-page-${number}-${width}.png`)});
      await expect(slide).toHaveAttribute('data-layout',number===2?'source-canvas':'source-canvas-figure-companion');
      await expect(slide.locator('.reader-slide-text')).toHaveCount(number===2?9:4);
      if(number===6){
        await expect(slide.locator('.reader-slide-background')).toBeVisible();
        const memory=slide.locator('.reader-emphasis').filter({hasText:'حافظه'});
        await expect(memory).toHaveCSS('color','rgb(255, 192, 0)');
      }
    }
  }
});

test('sequential examples keep their four images and separate Persian labels', async ({page}) => {
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:850});
    await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=8');
    await page.waitForFunction(()=>window.sourceSlideReader?.ready);
    if(width===390){
      const previous=await page.locator('#persian-page .reader-slide-stage').elementHandle();
      await page.locator('[data-view-translation]').click();
      if(previous)await page.waitForFunction(node=>!node.isConnected,previous);
      await page.waitForFunction(()=>window.sourceSlideReader?.ready);
    }
    const slide=page.locator('#persian-page');
    await expect(slide).toHaveAttribute('data-layout','source-canvas-figure-companion');
    await expect(slide.locator('.reader-slide-background')).toBeVisible();
    for(const text of ['بازار سهام','پردازش صوت','پیش بینی هوا','تحلیل متن'])
      await expect(slide.locator('.reader-slide-text').filter({hasText:text})).toBeVisible();
  }
});

test('sequence types preserve the three source examples and repeated labels', async ({page}) => {
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:850});
    await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=9');
    await page.waitForFunction(()=>window.sourceSlideReader?.ready);
    if(width===390){
      const previous=await page.locator('#persian-page .reader-slide-stage').elementHandle();
      await page.locator('[data-view-translation]').click();
      if(previous)await page.waitForFunction(node=>!node.isConnected,previous);
      await page.waitForFunction(()=>window.sourceSlideReader?.ready);
    }
    const slide=page.locator('#persian-page');
    await expect(slide).toHaveAttribute('data-layout','source-canvas-figure-companion');
    await expect(slide.locator('.reader-slide-background')).toBeVisible();
    await expect(slide.locator('.reader-slide-text:not(.reader-image-translation)')).toHaveCount(15);
    await expect(slide.locator('.reader-image-translation')).toHaveCount(3);
    for(const text of ['One-to-Many','Many-to-One','Many-to-Many','38.5','مثبت؟ منفی؟ خنثی؟'])
      await expect(slide.locator('.reader-slide-text').filter({hasText:text})).toBeVisible();
    await expect(slide.locator('.reader-slide-text').filter({hasText:'ورودی: دنباله'})).toHaveCount(2);
    await expect(slide.locator('.reader-slide-text').filter({hasText:'خروجی: دنباله'})).toHaveCount(2);
  }
});

test('history slide retains the diagram and source color emphasis', async ({page}) => {
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:850});
    await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=11');
    await page.waitForFunction(()=>window.sourceSlideReader?.ready);
    if(width===390){
      const previous=await page.locator('#persian-page .reader-slide-stage').elementHandle();
      await page.locator('[data-view-translation]').click();
      if(previous)await page.waitForFunction(node=>!node.isConnected,previous);
      await page.waitForFunction(()=>window.sourceSlideReader?.ready);
    }
    const slide=page.locator('#persian-page');
    await expect(slide).toHaveAttribute('data-layout','source-canvas-figure-companion');
    await expect(slide.locator('.reader-slide-background')).toBeVisible();
    await expect(slide.locator('.reader-slide-text:not(.reader-image-translation)')).toHaveCount(5);
    await expect(slide.locator('.reader-image-translation')).toHaveCount(1);
    for(const year of ['1962','1982','1986'])await expect(slide.locator('.reader-slide-text').filter({hasText:year})).toBeVisible();
    await expect(slide.locator('.reader-emphasis').filter({hasText:'اتصال بازگشتی'})).toHaveCSS('color','rgb(255, 192, 0)');
  }
});
