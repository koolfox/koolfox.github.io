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

test('session 3 network question heading fits its slide', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=15');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready && sourceSlideReader.page===15);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const title=page.locator('#persian-page .reader-slide-text[data-source-lines="0"]');
 expect(await title.evaluate(node=>node.getClientRects().length && node.scrollHeight<=node.clientHeight)).toBeTruthy();
 await expect(title).toContainText('Multi-Layer Network');
});

test('session 3 perceptron diagram keeps both figures and source labels', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=16');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready && sourceSlideReader.page===16);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 const labels=page.locator('#persian-page .reader-slide-text');
 await expect(labels.filter({hasText:'وزن‌های آموختنی'})).toHaveCSS('color','rgb(255, 0, 0)');
 await expect(labels.filter({hasText:'بایاس (Bias)'})).toHaveCSS('color','rgb(255, 0, 0)');
 await expect(page.locator('#persian-page .reader-slide-background')).toBeVisible();
});

test('session 3 preserves each highlighted perceptron step', async ({page}) => {
 for (const number of [17,18,19,20,21,22]) {
  await page.goto(`/deep-learning/terms/spring-2026/s03/slides/#page=${number}`);
  await page.waitForFunction(expected=>window.sourceSlideReader?.ready && sourceSlideReader.page===expected,number);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
  await expect(page.locator('#persian-page .reader-slide-text').filter({hasText:'وزن‌های آموختنی'})).toBeVisible();
 }
});

test('session 3 parameter count retains the network and color coded labels', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=23');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready && sourceSlideReader.page===23);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const labels=page.locator('#persian-page .reader-slide-text');
 await expect(labels.filter({hasText:'وزن‌های ورودی'})).toHaveCSS('color','rgb(243, 0, 242)');
 await expect(labels.filter({hasText:'بایاس‌ها'})).toHaveCSS('color','rgb(0, 176, 240)');
 await expect(page.locator('#persian-page .reader-slide-background')).toBeVisible();
});

test('session 3 retains network structure and the highlighted historical obstacle', async ({page}) => {
 for (const number of [24,25]) {
  await page.goto(`/deep-learning/terms/spring-2026/s03/slides/#page=${number}`);
  await page.waitForFunction(expected=>window.sourceSlideReader?.ready && sourceSlideReader.page===expected,number);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const accents=page.locator('#persian-page .reader-slide-text .reader-emphasis');
  expect(await accents.count()).toBeGreaterThan(1);
  await expect(accents.first()).toHaveCSS('color','rgb(255, 192, 0)');
 }
});

test('session 3 historical training slide retains all three accounts', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=26');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready && sourceSlideReader.page===26);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const labels=page.locator('#persian-page .reader-slide-text');
 for (const name of ['Rosenblatt','Werbos','LeCun and Parker']) await expect(labels.filter({hasText:name})).toBeVisible();
 await expect(labels.filter({hasText:'روش تصحیح خطای پس‌انتشاری'}).locator('.reader-emphasis').first()).toHaveCSS('color','rgb(255, 192, 0)');
});

test('session 3 agenda and backpropagation references retain source emphasis', async ({page}) => {
 for (const [number,layout] of [[27,'source-canvas'],[28,'source-canvas-figure-companion']]) {
  await page.goto(`/deep-learning/terms/spring-2026/s03/slides/#page=${number}`);
  await page.waitForFunction(expected=>window.sourceSlideReader?.ready && sourceSlideReader.page===expected,number);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout',layout);
  await expect(page.locator('#persian-page .reader-slide-background')).toBeVisible();
 }
 await expect(page.locator('#persian-page .reader-slide-text .reader-emphasis')).toHaveCSS('color','rgb(255, 192, 0)');
});

test('session 3 linear-composition heading does not cover the example', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=30');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready && sourceSlideReader.page===30);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const intro=page.locator('#persian-page .reader-slide-text[data-source-lines="2"]');
 const question=page.locator('#persian-page .reader-slide-text[data-source-lines="14"]');
 const [a,b]=await Promise.all([intro.boundingBox(),question.boundingBox()]);
 expect(a.y+a.height).toBeLessThanOrEqual(b.y);
});

test('session 3 linear function example preserves diagram and separate questions', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=31');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready && sourceSlideReader.page===31);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const labels=page.locator('#persian-page .reader-slide-text');
 for (const term of ['تابع h1','تابع h2','تابع o1']) await expect(labels.filter({hasText:term})).toBeVisible();
});

test('session 3 optimization slide keeps the plot and separated labels', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=32');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready && sourceSlideReader.page===32);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const labels=page.locator('#persian-page .reader-slide-text');
 await expect(labels.filter({hasText:'چرا مشتق‌پذیر'})).toHaveCSS('color','rgb(255, 255, 255)');
 await expect(labels.filter({hasText:'سطح خطا'}).locator('.reader-emphasis')).toHaveCSS('color','rgb(255, 192, 0)');
 await expect(labels.filter({hasText:'نزول گرادیان'})).toBeVisible();
});

test('session 3 descent analogy keeps the mountain image and endpoints', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=33');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready && sourceSlideReader.page===33);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const labels=page.locator('#persian-page .reader-slide-text');
 await expect(labels.filter({hasText:'آغاز (ارتفاع زیاد)'})).toHaveCSS('color','rgb(243, 0, 242)');
 await expect(labels.filter({hasText:'نقطهٔ پایان'})).toHaveCSS('color','rgb(243, 0, 242)');
 await expect(page.locator('#persian-page .reader-slide-background')).toBeVisible();
});

test('session 3 step-function diagram preserves the question and source answer', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=34');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready && sourceSlideReader.page===34);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 const labels=page.locator('#persian-page .reader-slide-text');
 await expect(labels.filter({hasText:'مشتق تابع پله‌ای چیست'})).toHaveCSS('color','rgb(4, 50, 255)');
 await expect(labels.filter({hasText:'بی‌نهایت/تعریف‌نشده'})).toBeVisible();
});

test('session 3 activation function slide retains diagrams and sigmoid formula', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=35');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready && sourceSlideReader.page===35);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas-figure-companion');
 await expect(page.locator('#persian-page .reader-slide-text').filter({hasText:'تابع فعال‌سازی'})).toHaveCSS('color','rgb(4, 50, 255)');
 await expect(page.locator('#persian-page .reader-slide-background')).toBeVisible();
});

test('session 3 gradient descent steps retain the source illustration', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=36');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready && sourceSlideReader.page===36);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const labels=page.locator('#persian-page .reader-slide-text');
 for (const term of ['1.','2.','3.','4.']) await expect(labels.filter({hasText:term})).toBeVisible();
 await expect(labels.filter({hasText:'باورپذیر نیست'})).toHaveCSS('color','rgb(255, 192, 0)');
});

test('session 3 first two descent examples preserve source regions', async ({page}) => {
 for (const number of [37,38]) {
  await page.goto(`/deep-learning/terms/spring-2026/s03/slides/#page=${number}`);
  await page.waitForFunction(expected=>window.sourceSlideReader?.ready && sourceSlideReader.page===expected,number);
  await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
  const labels=page.locator('#persian-page .reader-slide-text');
  await expect(labels.filter({hasText:'حدس'}).first()).toBeVisible();
  await expect(labels.filter({hasText:'محاسبه خطا'})).toBeVisible();
 }
});

test('session 3 loss monitoring slide keeps its graph and axis labels', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=43');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready && sourceSlideReader.page===43);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const labels=page.locator('#persian-page .reader-slide-text');
 await expect(labels.filter({hasText:'تعداد حدس‌ها'})).toBeVisible();
 await expect(labels.filter({hasText:'این گام را زیر نظر'})).toHaveCSS('color','rgb(255, 192, 0)');
});

test('session 3 slope question keeps the graph and native formula', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=45');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready && sourceSlideReader.page===45);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 await expect(page.locator('#persian-page .reader-slide-text').filter({hasText:'h اندک و مثبت'})).toBeVisible();
 await expect(page.locator('#persian-page .reader-slide-background')).toBeVisible();
 await expect(page.locator('#persian-page .reader-figure-labels')).toBeAttached();
});

test('session 3 finite difference example retains the source graph and values', async ({page}) => {
 await page.goto('/deep-learning/terms/spring-2026/s03/slides/#page=46');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready && sourceSlideReader.page===46);
 await expect(page.locator('#persian-page')).toHaveAttribute('data-layout','source-canvas');
 const example=page.locator('#persian-page .reader-slide-text').filter({hasText:'12.1304'});
 await expect(example).toContainText('13.04');
 await expect(example).toContainText('0.01');
 await expect(page.locator('#persian-page .reader-slide-background')).toBeVisible();
});
