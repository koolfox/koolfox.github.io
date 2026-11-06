import { test, expect } from '@playwright/test';

for (const viewport of [{width:1440,height:900},{width:390,height:844}]) {
 test(`session 3 opening slides preserve source layout at ${viewport.width}px`, async ({ page }) => {
  await page.setViewportSize(viewport);
  for (const number of [1, 5]) {
   await page.goto(`/deep-learning/terms/spring-2026/s03/slides/#page=${number}`);
   await page.waitForFunction(expected => window.sourceSlideReader?.ready && sourceSlideReader.page===expected, number);
   if (viewport.width<500) {
    const old=await page.locator('#persian-page .reader-slide-stage').elementHandle();
    await page.locator('[data-view-translation]').click();
    await page.waitForFunction(node=>!node.isConnected,old);
   }
   await expect(page.locator('#persian-page')).toHaveAttribute('data-layout', number===1?'source-canvas':'source-canvas-figure-companion');
   const nodes=page.locator('#persian-page .reader-slide-text');
   if(number===1) {
    await expect(nodes.first()).toHaveCSS('text-align','center');
    await expect(nodes.filter({hasText:'دانا گوراری'})).toHaveCSS('text-align','center');
   } else {
    await expect(nodes.filter({hasText:'100,000,000,000'})).toBeVisible();
    await expect(page.locator('#persian-page .reader-slide-background')).toBeVisible();
   }
   expect(await nodes.evaluateAll(items=>items.every(item=>item.scrollWidth<=item.clientWidth+2 && item.scrollHeight<=item.clientHeight+2))).toBeTruthy();
  }
 });
}

test('session 3 source review keeps the image and colored quotation', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=6');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready && sourceSlideReader.page===6);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 const quote=page.locator('#persian-page .reader-slide-text').filter({hasText:'پرسپترون ساده نخست'});
 await expect(quote).toBeVisible();
 await expect(quote).toHaveCSS('color','rgb(255, 255, 255)');
 await expect(quote.locator('.reader-emphasis').first()).toHaveCSS('color','rgb(255, 192, 0)');
 await expect(page.locator('#persian-page .reader-slide-background')).toBeVisible();
});

test('session 3 timeline preserves the source figure and historic labels', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=7');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready && sourceSlideReader.page===7);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 const regions=page.locator('#persian-page .reader-slide-text');
 for (const name of ['روزنبلات','ویدرو','هاوکینز','نیلسون','مینسکی']) await expect(regions.filter({hasText:name})).toBeVisible();
 await expect(regions.filter({hasText:'۲ لایه پنهان'})).toHaveCSS('color','rgb(255, 0, 0)');
});

test('session 3 XOR slide keeps its source diagram and truth table on mobile', async ({page}) => {
 await page.setViewportSize({width:390,height:844});
 await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=8');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready && sourceSlideReader.page===8);
 const old=await page.locator('#persian-page .reader-slide-stage').elementHandle();
 await page.locator('[data-view-translation]').click();
 await page.waitForFunction(node=>!node.isConnected,old);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 await expect(page.locator('#persian-page .reader-slide-background')).toBeVisible();
 await expect(page.locator('#persian-page .reader-slide-text').filter({hasText:'بایاس'})).toHaveCount(3);
 const rows=page.locator('#persian-page table tbody tr');
 await expect(rows).toHaveCount(4);
 expect(await rows.allTextContents()).toEqual(['000','011','101','110']);
});

test('session 3 XOR examples keep each highlighted case and the source layout', async ({page}) => {
 for (const number of [9,10,11,12]) {
  await page.goto(`/deep-learning/terms/spring-2026/s03/slides/#page=${number}`);
  await page.waitForFunction(expected=>window.sourceSlideReader?.ready && sourceSlideReader.page===expected,number);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
  await expect(page.locator('#persian-page .reader-slide-text').filter({hasText:'بایاس'})).toHaveCount(3);
  expect(await page.locator('#persian-page table tbody tr').allTextContents()).toEqual(['000','011','101','110']);
 }
});

test('session 3 terminology retains its source colors and English terms', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=13');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready && sourceSlideReader.page===13);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const body=page.locator('#persian-page .reader-slide-text').filter({hasText:'Artificial Neural Networks'});
 await expect(body).toContainText('Connectionist Networks');
 await expect(body.locator('.reader-emphasis')).toHaveCSS('color','rgb(255, 192, 0)');
});

test('session 3 preserves the multilayer network diagram and labels', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=14');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready && sourceSlideReader.page===14);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const labels=page.locator('#persian-page .reader-slide-text');
 await expect(labels.filter({hasText:'ورودی'}).last()).toHaveCSS('color','rgb(255, 192, 0)');
 await expect(labels.filter({hasText:'پیش‌بینی'}).first()).toHaveCSS('color','rgb(243, 0, 242)');
 await expect(labels.filter({hasText:'ورودی'}).first()).toHaveCSS('color','rgb(0, 176, 240)');
});
