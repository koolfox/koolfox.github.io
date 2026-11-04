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
 await page.reload();await expect(divider).toBeVisible();
 expect(Number(await divider.getAttribute('aria-valuenow'))).toBeGreaterThan(52);
});

test('single-pane mobile view does not show a divider',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto(deck);
 await expect(page.locator('.reader-divider')).toBeHidden();
 await page.locator('[data-view-translation]').click();await expect(page.locator('.reader-divider')).toBeHidden();
});
