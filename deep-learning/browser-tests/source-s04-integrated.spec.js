import {test,expect} from '@playwright/test';

test('RNN comparison retains each caption and both diagrams', async ({page}) => {
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:850});
    await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=12');
    await page.waitForFunction(()=>window.sourceSlideReader?.ready && window.sourceSlideReader.page===12);
    if(width===390){
      const previous=await page.locator('#persian-page .reader-slide-stage').elementHandle();
      await page.locator('[data-view-translation]').click();
      if(previous)await page.waitForFunction(node=>!node.isConnected,previous);
      await page.waitForFunction(()=>window.sourceSlideReader?.ready);
    }
    const slide=page.locator('#persian-page');
    await expect(slide).toHaveAttribute('data-layout','source-canvas-figure-companion');
    await expect(slide.locator('.reader-slide-background')).toBeVisible();
    await expect(slide.locator('.reader-slide-text')).toHaveCount(7);
    for(const text of ['Feedforward Network','Recurrent Network','اتصال های دارای تاخیر زمانی'])
      await expect(slide.locator('.reader-slide-text').filter({hasText:text}).first()).toBeVisible();
    await expect(slide.locator('.reader-emphasis').filter({hasText:'افزودن حالت پنهان'})).toHaveCSS('color','rgb(255, 192, 0)');
    await expect(slide.locator('.reader-slide-text').filter({hasText:'اتصال های دارای تاخیر زمانی'})).toHaveCSS('color','rgb(255, 192, 0)');
  }
});

test('RNN state equation keeps the diagram and its separate colored labels', async ({page}) => {
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:850});
    await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=13');
    await page.waitForFunction(()=>window.sourceSlideReader?.ready && window.sourceSlideReader.page===13);
    if(width===390){
      const previous=await page.locator('#persian-page .reader-slide-stage').elementHandle();
      await page.locator('[data-view-translation]').click();
      if(previous)await page.waitForFunction(node=>!node.isConnected,previous);
      await page.waitForFunction(()=>window.sourceSlideReader?.ready);
    }
    const slide=page.locator('#persian-page');
    await expect(slide).toHaveAttribute('data-layout','source-canvas');
    await expect(slide.locator('.reader-slide-background')).toBeVisible();
    for(const text of ['حالت جدید','حالت قبلی','ورودی در گام زمانی','پارامترهای مدل'])
      await expect(slide.locator('.reader-slide-text').filter({hasText:text})).toBeVisible();
    await expect(slide.locator('.reader-slide-text').filter({hasText:'حالت جدید'})).toHaveCSS('color','rgb(255, 192, 0)');
    await expect(slide.locator('.reader-slide-text').filter({hasText:'ورودی در گام زمانی'})).toHaveCSS('color','rgb(0, 176, 240)');
    await expect(slide.locator('.reader-slide-text').filter({hasText:'پارامترهای مدل'})).toHaveCSS('color','rgb(255, 0, 0)');
    await expect(slide.locator('.reader-figure-content')).toContainText('s');
  }
});

test('first RNN time step keeps its diagram and highlighted hidden state', async ({page}) => {
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:850});
    await page.goto('/deep-learning/terms/spring-2026/s04/slides/#page=14');
    await page.waitForFunction(()=>window.sourceSlideReader?.ready && window.sourceSlideReader.page===14);
    if(width===390){
      const previous=await page.locator('#persian-page .reader-slide-stage').elementHandle();
      await page.locator('[data-view-translation]').click();
      if(previous)await page.waitForFunction(node=>!node.isConnected,previous);
      await page.waitForFunction(()=>window.sourceSlideReader?.ready);
    }
    const slide=page.locator('#persian-page');
    await expect(slide).toHaveAttribute('data-layout','source-canvas-figure-companion');
    await expect(slide.locator('.reader-slide-background')).toBeVisible();
    await expect(slide.locator('.reader-emphasis').filter({hasText:'افزودن حالت پنهان'})).toHaveCSS('color','rgb(255, 192, 0)');
    const caption=slide.locator('.reader-slide-text').filter({hasText:'ایده اصلی'});
    const fit=await caption.evaluate(node=>({bottom:parseFloat(node.style.top)+parseFloat(node.style.height),fits:node.scrollHeight<=node.clientHeight+2 && node.scrollWidth<=node.clientWidth+2}));
    expect(fit.fits).toBe(true);
    expect(fit.bottom).toBeLessThanOrEqual(.35*540+1);
  }
});
