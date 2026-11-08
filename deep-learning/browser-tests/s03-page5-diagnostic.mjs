import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true });
const source = await readFile('deep-learning/assets/slide-content.js', 'utf8');
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    const page = await browser.newPage({ viewport });
    await page.route('**/deep-learning/assets/slide-content.js*', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: source }));
    await page.goto('https://koolfox.github.io/deep-learning/terms/spring-2026/s03/slides/#page=5');
    await page.waitForFunction(() => window.sourceSlideReader?.ready && window.sourceSlideReader.page === 5);
    if (viewport.width < 500) await page.locator('[data-view-translation]').click();
    await page.locator('#persian-page .reader-image-translation').first().waitFor();
    if (await page.locator('#persian-page .reader-image-translation').count() !== 5) throw new Error('Expected five translated figure labels');
    await page.screenshot({ path: `/tmp/s03-page5-${viewport.width}.png` });
    await page.close();
  }
} finally {
  await browser.close();
}
