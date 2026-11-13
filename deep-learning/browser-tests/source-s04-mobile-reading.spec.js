import {test, expect} from '@playwright/test';

for (const number of [6, 7, 8, 9]) {
  test(`large text follows lesson four slide ${number}`, async ({page}) => {
    await page.setViewportSize({width:390,height:844});
    await page.goto(`/deep-learning/terms/spring-2026/s04/slides/#page=${number}`);
    await page.waitForFunction(n => window.sourceSlideReader?.ready && window.sourceSlideReader.page === n, number);
    await page.locator('[data-view-translation]').click();
    const holder=page.locator('#persian-page .reader-slide-holder');
    const transcript=page.locator('#persian-page .reader-mobile-transcript');
    await expect(holder).toBeVisible();
    await expect(transcript).toBeVisible();
    await expect.poll(() => holder.evaluate(el => el.nextElementSibling?.classList.contains('reader-mobile-transcript'))).toBe(true);
    await transcript.locator('summary').click();
    await expect(transcript).toHaveAttribute('open', '');
    await expect(holder).toBeVisible();
  });
}

test('mobile can expand the same slide text without replacing the diagram', async ({page}, testInfo) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=9');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 9);
  await page.locator('[data-view-translation]').click();
  await expect(page.locator('#persian-page .reader-slide-holder')).toBeVisible();
  const reading=page.locator('.reader-mobile-transcript');
  await expect(reading).toBeVisible();
  await reading.locator('summary').click();
  await expect(reading).toHaveAttribute('open','');
  await expect(reading).toContainText('دماسنج');
  await expect(reading.locator('.reader-copy').first()).toHaveCSS('font-size','19px');
  await expect(page.locator('#persian-page .reader-slide-holder')).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('s04-mobile-expanded.png')});
});

test('desktop keeps the original side-by-side slide view', async ({page}, testInfo) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=9');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 9);
  await expect(page.locator('#original-panel')).toBeVisible();
  await expect(page.locator('#translation-panel .reader-slide-holder')).toBeVisible();
  await expect(page.locator('.reader-mobile-transcript')).toBeHidden();
  await page.screenshot({path:testInfo.outputPath('s04-desktop.png')});
});

test('mobile fullscreen zoom enlarges the original slide and its diagram', async ({page}, testInfo) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=9');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 9);
  await page.locator('[data-view-translation]').click();
  await page.evaluate(()=>Object.defineProperty(document.documentElement,'requestFullscreen',{value:undefined,configurable:true}));
  await page.locator('[data-fullscreen]').click();
  const holder=page.locator('#persian-page .reader-slide-holder');
  await expect(holder).toBeVisible();
  const panelBox=await page.locator('#translation-panel').boundingBox();
  const controlsBox=await page.locator('.reader-focus-languages').boundingBox();
  expect(panelBox.y+panelBox.height).toBeLessThanOrEqual(controlsBox.y+2);
  const initial=(await holder.boundingBox()).width;
  await page.locator('[data-focus-zoom-in]').click();
  await expect.poll(async()=> (await holder.boundingBox())?.width || 0).toBeGreaterThan(initial*1.2);
  const panel=page.locator('#translation-panel');
  expect(await panel.evaluate(e=>e.scrollWidth>e.clientWidth)).toBeTruthy();
  await page.screenshot({path:testInfo.outputPath('s04-mobile-fullscreen-zoom.png')});
  await page.locator('[data-focus-zoom-fit]').click();
  await expect.poll(async()=> (await holder.boundingBox())?.width || 0).toBeLessThan(initial*1.05);
});

test('mobile transcript preserves LTR math and is reachable in fullscreen', async ({page}, testInfo) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=36');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 36);
  await page.locator('[data-view-translation]').click();
  await page.evaluate(()=>Object.defineProperty(document.documentElement,'requestFullscreen',{value:undefined,configurable:true}));
  await page.locator('[data-fullscreen]').click();
  const summary=page.locator('.reader-mobile-transcript summary');
  await summary.scrollIntoViewIfNeeded();
  await summary.click();
  const formula=page.locator('.reader-mobile-transcript .reader-math').first();
  await expect(formula).toBeVisible();
  await expect(formula).toHaveCSS('direction','ltr');
  await expect(formula).toContainText('y');
  const values=page.locator('.reader-mobile-transcript .reader-image-text[dir=ltr]');
  await expect(values).toHaveText('0.419748; 0.194682; 0.162429; 0.223141');
  const order=await values.evaluate(node=>{
    const text=node.firstChild,starts=['0.419748','0.194682','0.162429','0.223141'].map(value=>text.textContent.indexOf(value));
    return starts.map(start=>{const range=document.createRange();range.setStart(text,start);range.setEnd(text,start+8);const box=range.getBoundingClientRect();return {top:box.top,left:box.left};});
  });
  expect(order).toEqual([...order].sort((a,b)=>a.top-b.top||a.left-b.left));
  await formula.scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath('s04-mobile-formula.png')});
});
