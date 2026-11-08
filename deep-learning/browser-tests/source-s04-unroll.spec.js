import {test, expect} from '@playwright/test';

test('unrolled diagrams place the Persian label over the source word', async ({page},testInfo) => {
  for (const number of [15,16,17,18,19,22,23,24,25,28]) {
    await page.goto(`/deep-learning/terms/spring-2026/s04/slides/#page=${number}`);
    await page.waitForFunction(n => window.sourceSlideReader?.ready && window.sourceSlideReader.page === n, number);
    const label=page.locator('#persian-page .reader-image-translation').filter({hasText:'بازکردن'});
    await expect(label).toHaveCount(1);
    await expect(label).toBeVisible();
    if (number===15 || number===28) await page.screenshot({path:testInfo.outputPath(`unfold-${number}.png`)});
  }
});

for (const number of [26,27]) test(`activation plot labels stay on the figure on page ${number}`, async ({page},testInfo) => {
  await page.goto(`/deep-learning/terms/spring-2026/s04/slides/#page=${number}`);
  await page.waitForFunction(n => window.sourceSlideReader?.ready && window.sourceSlideReader.page === n, number);
  const labels=page.locator('#persian-page .reader-image-translation');
  await expect(labels.filter({hasText:'تابع های فعال سازی'})).toHaveCount(1);
  if(number===26)await expect(labels.filter({hasText:'مشتق ها'})).toHaveCount(1);
  await page.screenshot({path:testInfo.outputPath(`activation-labels-${number}.png`)});
});

test('sequence examples translate their visible image captions', async ({page},testInfo) => {
  await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=9');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 9);
  const labels=page.locator('#persian-page .reader-image-translation');
  for(const text of ['هواداران دوآتشه','امروز سرگرم کننده است','چینی (سنتی)'])await expect(labels.filter({hasText:text})).toBeVisible();
  expect(await labels.evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+2 && node.scrollWidth<=node.clientWidth+2))).toBeTruthy();
  await page.screenshot({path:testInfo.outputPath('sequence-image-captions-9.png')});
});

test('text analysis example places its Persian review inside the image', async ({page},testInfo) => {
  await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=8');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 8);
  const review=page.locator('#persian-page .reader-image-translation').filter({hasText:'بازگشت لوک'});
  await expect(review).toBeVisible();
  expect(await review.evaluate(node=>node.scrollHeight<=node.clientHeight+2 && node.scrollWidth<=node.clientWidth+2)).toBeTruthy();
  await page.screenshot({path:testInfo.outputPath('text-analysis-image-8.png')});
});

test('historical diagram translates the corresponding weights label', async ({page},testInfo) => {
  await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=11');
  await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 11);
  const label=page.locator('#persian-page .reader-image-translation').filter({hasText:'مجموعه وزن های متناظر'});
  await expect(label).toBeVisible();
  expect(await label.evaluate(node=>node.scrollHeight<=node.clientHeight+2 && node.scrollWidth<=node.clientWidth+2)).toBeTruthy();
  await page.screenshot({path:testInfo.outputPath('corresponding-weights-11.png')});
});

for(const width of [1440,390]){
  test(`RNN unfolding retains each step and emphasis at ${width}px`,async({page},testInfo)=>{
    await page.setViewportSize({width,height:850});
    for(const number of [15,16,17,18,19]){
      await page.goto(`/deep-learning/terms/spring-2026/s04/slides/#page=${number}`);
      await page.waitForFunction(n=>window.sourceSlideReader?.ready && window.sourceSlideReader.page===n,number);
      if(width===390){
        const previous=await page.locator('#persian-page .reader-slide-stage').elementHandle();
        await page.locator('[data-view-translation]').click();
        if(previous)await page.waitForFunction(node=>!node.isConnected,previous);
        await page.waitForFunction(()=>window.sourceSlideReader?.ready);
      }
      const slide=page.locator('#persian-page');
      await expect(slide).toHaveAttribute('data-layout','source-canvas-figure-companion');
      await expect(slide.locator('.reader-slide-background')).toBeVisible();
      if(number<19){
        await expect(slide.locator('.reader-emphasis').filter({hasText:'افزودن حالت پنهان'})).toHaveCSS('color','rgb(255, 192, 0)');
        const caption=slide.locator('.reader-slide-text').filter({hasText:'ایده اصلی'});
        const geometry=await caption.evaluate(node=>({bottom:parseFloat(node.style.top)+parseFloat(node.style.height),fits:node.scrollHeight<=node.clientHeight+2 && node.scrollWidth<=node.clientWidth+2}));
        expect(geometry.fits).toBe(true);
        expect(geometry.bottom).toBeLessThanOrEqual(.35*540+1);
      }
      if(number===18){
        await expect(slide.locator('.reader-slide-text').filter({hasText:'گراف محاسباتی'})).toBeVisible();
        await page.screenshot({path:testInfo.outputPath(`unrolled-rnn-${width}.png`)});
      }
      if(number===19)await expect(slide.locator('.reader-slide-text').filter({hasText:'از نظر نظری'})).toBeVisible();
    }
  });
}
