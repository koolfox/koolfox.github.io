import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = '/structural-bioinformatics/assets/';
const viewer = assets + 'docked-pose-viewer.html';
const savedVq = viewer + '?demo=39&sequence=VQ&batch=1';

test('shows recorded poses and reads matching user files locally', async ({ page }) => {
  await page.goto(viewer);
  await expect(page.locator('#pose-stage')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#sample-description')).toContainText('AC');
  await expect(page.locator('#pose-status')).toContainText('حالت 1 از 3');
  const sdf = page.getByRole('link', {name: 'دریافت حالت 1 از AC (SDF)'});
  await expect(sdf).toHaveAttribute('href', 'docked-ac-visualization/pose-1.sdf');
  await page.locator('#pose-select').selectOption('1');
  await expect(page.locator('#pose-status')).toContainText('حالت 2 از 3');
  await expect(page.getByRole('link', {name: 'دریافت حالت 2 از AC (SDF)'})).toHaveAttribute('href', 'docked-ac-visualization/pose-2.sdf');
  await page.locator('#load-files').click();
  await expect(page.locator('#pose-status')).toContainText('هر دو فایل');
  await expect(page.locator('#pose-stage')).toBeHidden();
  await expect(page.locator('a[download][href]')).toHaveCount(0);
  await page.locator('#target-file').setInputFiles(path.join(root, 'assets/docked-ac-visualization/receptor.pdb'));
  await page.locator('#pose-file').setInputFiles(path.join(root, 'assets/general-docking-demo/AC/poses.pdbqt'));
  await page.locator('#load-files').click();
  await expect(page.locator('#pose-stage')).toBeVisible();
  await expect(page.locator('#pose-status')).toContainText('حالت 1 از 3');
  await expect(page.locator('#sample-description')).toContainText('فایل‌های انتخابی شما');
  await expect(page.locator('a[download][href]')).toHaveCount(0);
});

test('viewer remains usable on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(viewer);
  await expect(page.locator('#pose-stage')).toHaveAttribute('data-state', 'ready');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.locator('#load-files')).toBeVisible();
});

test('recorded workflow links each of 39 variants to its own pose', async ({ page }) => {
  await page.setViewportSize({width: 320, height: 780});
  await page.goto(assets + 'peptide-workflow.html');
  await expect(page.locator('#results-status')).toContainText('39');
  await expect(page.locator('#results tr')).toHaveCount(39);
  await expect(page.locator('#results').getByRole('link', {name: /^نمایش سه‌بعدی [A-Z]{2}$/})).toHaveCount(39);
  await page.locator('.table-wrap').focus();
  await page.keyboard.press('Tab');
  const vq = page.getByRole('link', {name: 'نمایش سه‌بعدی VQ'});
  await expect(vq).toBeFocused();
  await expect(vq).toBeInViewport();
  await expect(page.getByRole('link', {name: 'نمایش سه‌بعدی VA'})).toHaveAttribute('href', /sequence=VA&batch=2$/);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(savedVq);
  await expect(page.locator('#sample-description')).toContainText('VQ');
  await expect(page.locator('#pose-stage')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#pose-status')).toContainText('حالت 1 از 2');
  await expect(page.locator('#download-target')).toHaveAttribute('href', /batch-000001\/docking\/selected-chain\.pdb$/);
  const poses = page.getByRole('link', {name: 'دریافت همهٔ حالت‌های VQ (PDBQT)'});
  const vqPath = 'peptide-ops-39-demo/docking/batch-000001/docking/VQ/poses.pdbqt';
  await expect(poses).toHaveAttribute('href', vqPath);
  const [download] = await Promise.all([page.waitForEvent('download'), poses.click()]);
  expect(download.suggestedFilename()).toBe('VQ-poses.pdbqt');
  expect(await readFile(await download.path())).toEqual(await readFile(path.join(root, 'assets', vqPath)));
  await expect(page.locator('#download-sdf')).toBeHidden();
  await expect(page.locator('#download-status')).toContainText('PDBQT');
});

test('WebGL fallback preserves VQ and exposes AC files only after choosing AC', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (type.includes('webgl')) return null;
      return getContext.call(this, type, ...args);
    };
  });
  await page.goto(savedVq);
  await expect(page.locator('#pose-status')).toContainText('نمای سه‌بعدی در این مرورگر در دسترس نیست');
  await expect(page.locator('#sample-description')).toContainText('VQ');
  await expect(page.locator('#download-poses')).toHaveAttribute('href', /\/VQ\/poses\.pdbqt$/);
  await expect(page.locator('#download-sdf')).toBeHidden();
  await expect(page.locator('a[download][href*="AC"], a[download][href*="docked-ac-visualization"]')).toHaveCount(0);

  await page.locator('#load-sample').click();
  await expect(page).toHaveURL(viewer);
  await expect(page.locator('#sample-description')).toContainText('AC');
  await expect(page.locator('#download-poses')).toHaveAttribute('href', /\/AC\/poses\.pdbqt$/);
  await page.locator('#pose-select').selectOption('2');
  await expect(page.getByRole('link', {name: 'دریافت حالت 3 از AC (SDF)'})).toHaveAttribute('href', 'docked-ac-visualization/pose-3.sdf');
});

test('a mismatched saved pose file yields recovery guidance and no downloads', async ({ page }) => {
  await page.route('**/VQ/poses.pdbqt', route => route.fulfill({body: 'different pose data'}));
  await page.goto(savedVq);
  await expect(page.locator('#sample-description')).toContainText('VQ');
  await expect(page.locator('#pose-status')).toContainText('هش فایل با گزارش این نتیجه همخوان نیست');
  await expect(page.locator('#download-status')).toContainText('دوباره بارگذاری کنید');
  await expect(page.locator('a[download][href]')).toHaveCount(0);
  await expect(page.getByRole('link', {name: 'بازگشت به فهرست نامزدها'})).toHaveAttribute('href', 'peptide-workflow.html');
});

test('a saved result requested from the wrong batch never opens the AC example', async ({ page }) => {
  await page.goto(viewer + '?demo=39&sequence=VQ&batch=2');
  await expect(page.locator('#sample-description')).toContainText('VQ');
  await expect(page.locator('#pose-status')).toContainText('در گزارش دسته پیدا نشد');
  await expect(page.locator('a[download][href]')).toHaveCount(0);
  await expect(page.locator('#pose-select')).toBeDisabled();
});

test('a missing AC SDF only disables the affected pose download', async ({ page }) => {
  await page.route('**/docked-ac-visualization/pose-2.sdf', route => route.fulfill({status: 404}));
  await page.goto(viewer);
  await expect(page.locator('#download-sdf')).toHaveAttribute('href', 'docked-ac-visualization/pose-1.sdf');
  await page.locator('#pose-select').selectOption('1');
  await expect(page.locator('#download-sdf')).toBeHidden();
  await expect(page.locator('#download-status')).toContainText('از فایل PDBQT همین اجرا استفاده کنید');
  await expect(page.locator('#download-poses')).toHaveAttribute('href', /\/AC\/poses\.pdbqt$/);
});
