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
