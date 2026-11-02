import {test,expect} from '@playwright/test';

test('source attention film plays in place without loading a model or changing the slide',async({page})=>{
 const weights=[];page.on('request',request=>{if(/\.onnx(?:\?|$)/.test(request.url()))weights.push(request.url());});
 await page.goto('/deep-learning/terms/spring-2026/s13/slides/#page=27');
 const play=page.locator('[data-source-interactive="attention"]');await expect(play).toBeVisible();
 await play.click();
 const tool=page.frameLocator('[data-reader-tools-frame]');
 await expect(tool.getByRole('heading',{name:'محاسبهٔ توجه (Self-attention)'})).toBeVisible();
 const video=tool.locator('video');await expect(video).toHaveAttribute('controls','');
 await expect(video).not.toHaveAttribute('autoplay');
 await video.evaluate(async node=>{await node.play();});
 await expect.poll(()=>video.evaluate(node=>node.currentTime)).toBeGreaterThan(0);
 await expect(tool.locator('track')).toHaveAttribute('srclang','fa');
 await page.getByRole('button',{name:'اسلاید',exact:true}).click();
 await expect(page.locator('[data-reader-tools-frame]')).toHaveAttribute('src','about:blank');
 expect(await page.evaluate(()=>sourceSlideReader.page)).toBe(27);
 expect(weights).toEqual([]);
});

test('full model entry is source-bound and does not download weights on entry',async({page})=>{
 const weights=[];page.on('request',request=>{if(/\.onnx(?:\?|$)/.test(request.url()))weights.push(request.url());});
 await page.goto('/deep-learning/terms/spring-2026/s08/slides/#page=36');
 await page.locator('[data-source-interactive="resnet152-v1"]').click();
 const tool=page.frameLocator('[data-reader-tools-frame]');
 await expect(tool.getByRole('heading',{name:'شبکهٔ کامل ResNet152-v1'})).toBeVisible();
 await expect(tool.locator('[data-download-size]')).toContainText(/241|230|MB|مگابایت/);
 expect(weights).toEqual([]);
 await page.locator('[data-next-page]').click();
 await expect(page.locator('[data-source-interactive="resnet152-v1"]')).toHaveCount(0);
 await expect(page.locator('[data-reader-tools-frame]')).toHaveAttribute('src','about:blank');
});
