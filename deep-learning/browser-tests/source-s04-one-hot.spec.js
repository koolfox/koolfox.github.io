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
