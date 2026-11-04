import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('shows recorded poses and reads matching user files locally', async ({ page }) => {
  await page.goto('/structural-bioinformatics/assets/docked-pose-viewer.html');
  await expect(page.locator('#pose-stage')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#pose-status')).toContainText('حالت 1 از 3');
  await page.locator('#pose-select').selectOption('1');
  await expect(page.locator('#pose-status')).toContainText('حالت 2 از 3');
  await page.locator('#load-files').click();
  await expect(page.locator('#pose-status')).toContainText('هر دو فایل');
  await expect(page.locator('#pose-stage')).toBeHidden();
  await page.locator('#target-file').setInputFiles(path.join(root, 'assets/docked-ac-visualization/receptor.pdb'));
  await page.locator('#pose-file').setInputFiles(path.join(root, 'assets/general-docking-demo/AC/poses.pdbqt'));
  await page.locator('#load-files').click();
  await expect(page.locator('#pose-stage')).toBeVisible();
  await expect(page.locator('#pose-status')).toContainText('حالت 1 از 3');
});

test('viewer remains usable on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/structural-bioinformatics/assets/docked-pose-viewer.html');
  await expect(page.locator('#pose-stage')).toHaveAttribute('data-state', 'ready');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.locator('#load-files')).toBeVisible();
});

test('recorded workflow links each of 39 variants to its own pose', async ({ page }) => {
  await page.goto('/structural-bioinformatics/assets/peptide-workflow.html');
  await expect(page.locator('#results-status')).toContainText('39');
  await expect(page.locator('#results tr')).toHaveCount(39);
  await page.locator('#results tr').filter({ has: page.getByRole('cell', { name: 'KQ', exact: true }) }).getByRole('link').click();
  await expect(page.locator('#sample-description')).toContainText('KQ');
  await expect(page.locator('#pose-stage')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#pose-status')).toContainText('حالت 1');
});
