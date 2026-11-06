import {test,expect} from '@playwright/test';

for(const size of [{width:1440,height:900},{width:390,height:844}]){
 test(`perceptron film works from slide and notebook ${size.width}`,async({page})=>{
  await page.setViewportSize(size);
  await page.goto('/deep-learning/terms/spring-2026/s02/slides/#page=25');
  const button=page.getByRole('button',{name:'فیلم دو گام پرسپترون'});
  await expect(button).toBeVisible();await button.click();
  const frame=page.frameLocator('[data-reader-tools-frame]');
  await expect(frame.locator('video')).toBeVisible();
  await frame.locator('video').evaluate(v=>v.play());
  await expect.poll(()=>frame.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(0);
  await frame.getByRole('button',{name:'نمونه دوم'}).click();
  await expect.poll(()=>frame.locator('video').evaluate(v=>v.currentTime)).toBeCloseTo(8.8,1);
  await page.goto('/deep-learning/terms/spring-2026/s02/practice/?source-page=25#code');
  await page.getByText('فیلم دو گام آموزش').click();
  const embedded=page.frameLocator('[data-perceptron-film]');
  await expect(embedded.locator('video')).toBeVisible();
  await embedded.getByRole('button',{name:'اصلاح دوم'}).click();
  await expect.poll(()=>embedded.locator('video').evaluate(v=>v.currentTime)).toBeCloseTo(10.1,1);
 });
}
