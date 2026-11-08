import {test, expect} from '@playwright/test';

for (const viewport of [{width: 390, height: 844}, {width: 1280, height: 720}]) {
  test(`vector chart and bars remain independently accessible at ${viewport.width}px`, async ({page}) => {
    await page.setViewportSize(viewport);
    await page.goto('/deep-learning/');
    await page.evaluate(async () => {
      const {renderNotebookResult} = await import('/deep-learning/assets/notebook-results.js');
      const root = document.createElement('section');root.id = 'chart-test';document.body.append(root);
      renderNotebookResult(root, {weights: [3, -2, 0.123456789123456]});
    });
    const chart = page.locator('#chart-test');
    const point = chart.getByRole('button', {name: 'نقطه نمودار weights[2] = 0.123456789123456'});
    const bar = chart.getByRole('button', {name: 'weights[0] = 3', exact: true});
    await expect(point).toBeVisible();await expect(bar).toHaveCount(1);
    await point.focus();await expect(chart.locator('.nb-result-readout')).toHaveText('weights[2] = 0.123456789123456');
    await bar.click();await expect(chart.locator('.nb-result-readout')).toHaveText('weights[0] = 3');
    await point.click();await expect(chart.locator('.nb-result-readout')).toHaveText('weights[2] = 0.123456789123456');
  });
}
