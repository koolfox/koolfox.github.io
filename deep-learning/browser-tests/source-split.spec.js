import {test,expect} from '@playwright/test';

const deck='/deep-learning/terms/spring-2026/s03/slides/';

test('slide divider changes both pane sizes with keyboard and pointer',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto(deck);
 const divider=page.getByRole('separator',{name:'تنظیم اندازه دو بخش'}),left=page.locator('#original-panel');
 await expect(divider).toBeVisible();
 const before=(await left.boundingBox()).width;
 await divider.focus();await page.keyboard.press('ArrowRight');
 await expect(divider).toHaveAttribute('aria-valuenow','52');
 expect((await left.boundingBox()).width).toBeGreaterThan(before);
 const box=await divider.boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
 await page.mouse.move(box.x+100,box.y+box.height/2,{steps:5});await page.mouse.up();
 expect(Number(await divider.getAttribute('aria-valuenow'))).toBeGreaterThan(52);
 await page.locator('[data-view-source]').click();await expect(divider).toBeHidden();
 await page.locator('[data-view-both]').click();await expect(divider).toBeVisible();
 await page.evaluate(()=>window.sourceSlideReader.openTool(location.origin+'/deep-learning/knowledge/'));
 await expect(divider).toBeVisible();
 const tool=page.locator('.reader-tools-panel');
 expect((await tool.boundingBox()).width).toBeGreaterThan(250);
 await page.reload();await expect(divider).toBeVisible();
 expect(Number(await divider.getAttribute('aria-valuenow'))).toBeGreaterThan(52);
});

test('single-pane mobile view does not show a divider',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto(deck);
 await expect(page.locator('.reader-divider')).toBeHidden();
 await page.locator('[data-view-translation]').click();await expect(page.locator('.reader-divider')).toBeHidden();
});

test('phone can enter and leave the in-page fullscreen when the browser has no API',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.addInitScript(()=>{Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined,configurable:true});});
 const page=await context.newPage();await page.goto(deck+'#page=44');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready);
 const button=page.locator('[data-fullscreen]');
 await button.click();await expect(button).toHaveAttribute('aria-pressed','true');
 await expect(button).toHaveText('خروج از تمام‌صفحه');
 await expect(page.locator('body')).toHaveAttribute('data-immersive','true');
 await expect(page.locator('.reader-header')).toBeHidden();
 await page.locator('[data-focus-view=translation]').click();await expect(page.locator('#translation-panel')).toBeVisible();
 await page.locator('[data-focus-experiment]').click();
 await expect(page.locator('.reader-tools-panel')).toBeVisible();
 await page.locator('.reader-sections [data-reader-section=slides]').click();
 await expect(page.locator('#translation-panel')).toBeVisible();
 await page.setViewportSize({width:844,height:390});
 await expect(page.locator('[data-focus-exit]')).toBeVisible();
 await expect(page.locator('[data-focus-experiment]')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
 await page.setViewportSize({width:390,height:844});
 await page.locator('[data-focus-exit]').click();await expect(button).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('.reader-heading')).toBeVisible();
 await expect(page.locator('#translation-panel')).toBeVisible();
 await context.close();
});

test('phone falls back when fullscreen is rejected and Escape restores the view',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.addInitScript(()=>{Object.defineProperty(Element.prototype,'requestFullscreen',{value:()=>Promise.reject(new TypeError('unavailable')),configurable:true});});
 const page=await context.newPage();await page.goto(deck+'#page=44');
 await page.waitForFunction(()=>window.sourceSlideReader?.ready);
 const button=page.locator('[data-fullscreen]');await button.click();
 await expect(button).toHaveAttribute('aria-pressed','true');
 await page.keyboard.press('Escape');await expect(button).toHaveAttribute('aria-pressed','false');
 await expect(button).toBeFocused();
 await context.close();
});

test('native fullscreen changes keep the control in sync on entry and exit',async({page})=>{
 await page.goto(deck+'#page=44');await page.waitForFunction(()=>window.sourceSlideReader?.ready);
 const button=page.locator('[data-fullscreen]');await button.click();
 await expect(button).toHaveAttribute('aria-pressed','true');
 expect(await page.evaluate(()=>Boolean(document.fullscreenElement))).toBeTruthy();
 await page.evaluate(()=>document.exitFullscreen());
 await expect(button).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('body')).toHaveAttribute('data-immersive','false');
});
