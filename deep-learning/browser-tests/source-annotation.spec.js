import { test, expect } from '@playwright/test';

for (const [session, number] of [['s01', 31], ['s09', 17]]) {
 test(`${session} page ${number} displays its slide and annotation links`, async ({ page }) => {
  await page.goto(`/deep-learning/terms/spring-2026/${session}/slides/#page=${number}`);
  await page.waitForFunction(expected => window.sourceSlideReader?.ready && window.sourceSlideReader.page === expected, number);
  await expect(page.locator('[data-reader-status]')).not.toContainText('نمایش این صفحه کامل نشد');
  const links = page.locator('#source-links a');
  expect(await links.count()).toBeGreaterThan(0);
  const link = links.first();
  await expect(link).toHaveAttribute('href', /^https?:\/\//);
  const box = await link.boundingBox();
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);
 });
}
