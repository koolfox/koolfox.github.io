import { test, expect } from '@playwright/test';

test('Shinylive review shows real selected poses and matching PyMOL download', async ({ page }) => {
  test.setTimeout(150000);
  await page.goto('/structural-bioinformatics/research.html');
  await page.getByRole('link', { name: 'بازبینی سه بعدی نمونه آدالیموماب و TNF' }).click();
  await expect(page).toHaveURL(/runtime\/bioml-review\//);
  await expect(page.locator('iframe')).toHaveCount(1, { timeout: 90000 });
  const frame = page.frameLocator('iframe');
  const canvas = frame.locator('#molecule-viewer');
  await expect(canvas).toHaveAttribute('data-state', 'ready', { timeout: 90000 });
  await expect(frame.locator('#result-values')).toHaveAttribute('data-candidate', 'TWNSGHID', { timeout: 90000 });
  await expect(frame.locator('#result-values')).toContainText('-2.425');
  await frame.locator('#candidate').selectOption('DIHGNSWT');
  await frame.locator('#pose').selectOption('2');
  await expect(frame.locator('#result-values')).toHaveAttribute('data-candidate', 'DIHGNSWT');
  await expect(frame.locator('#result-values')).toHaveAttribute('data-pose', '2');
  await expect(frame.locator('#result-values')).toContainText('-1.737');
  await expect(canvas).toHaveAttribute('data-candidate', 'DIHGNSWT');
  await expect(canvas).toHaveAttribute('data-pose', '2');
  for (const sequence of ['TWNSGHID', 'DIHGNSWT']) {
    await frame.locator('#candidate').selectOption(sequence);
    for (const pose of ['1', '2', '3']) {
      await frame.locator('#pose').selectOption(pose);
      await expect(canvas).toHaveAttribute('data-state', 'ready');
      await expect(canvas).toHaveAttribute('data-candidate', sequence);
      await expect(canvas).toHaveAttribute('data-pose', pose);
      await expect(canvas).toHaveAttribute('data-receptor-atoms', '1111');
      await expect(canvas).toHaveAttribute('data-peptide-atoms', '66');
    }
  }
  await frame.locator('#candidate').selectOption('DIHGNSWT');
  await frame.locator('#pose').selectOption('2');
  await expect(frame.getByRole('link', { name: /دریافت فایل آماده.*PyMOL/ }))
    .toHaveAttribute('href', 'data/DIHGNSWT-2.pml');
  await expect(frame.getByText(/میل اتصال آزمایشگاهی یا اثر درمانی نیست/)).toBeVisible();
});

test('PyMOL download stays available when WebGL is unavailable', async ({ page }) => {
  test.setTimeout(150000);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return null;
      return original.call(this, type, ...args);
    };
  });
  await page.goto('/structural-bioinformatics/runtime/bioml-review/');
  await expect(page.locator('iframe')).toHaveCount(1, { timeout: 90000 });
  const frame = page.frameLocator('iframe');
  await expect(frame.locator('#molecule-viewer')).toHaveAttribute('data-state', 'error', { timeout: 90000 });
  await expect(frame.getByRole('link', { name: /دریافت فایل آماده.*PyMOL/ }))
    .toHaveAttribute('href', 'data/TWNSGHID-1.pml', { timeout: 90000 });
});
