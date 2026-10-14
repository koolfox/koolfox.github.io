// Export the same repository Markdown reader used by the website; no duplicate text.
// Start a local site server, then: node structural-bioinformatics/scripts/export_preparation_guide.mjs
import { chromium } from '../browser-tests/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'node:url';

const base = process.env.RESEARCH_BASE_URL || 'http://127.0.0.1:8000';
const output = fileURLToPath(new URL('../assets/preparation-guide.fa.pdf', import.meta.url));
const url = new URL('/structural-bioinformatics/', base);
url.search = '?document=preparation-guide.fa.md&chapter=all';
url.hash = 'reading';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  await page.goto(url.href);
  await page.waitForFunction(() => document.querySelector('#reading-status').dataset.state === 'ready');
  await page.evaluate(() => document.fonts.ready);
  const ready = await page.locator('#markdown-content').evaluate(content => ({
    diagrams: content.querySelectorAll('.mermaid-diagram[data-state="ready"] svg').length,
    formula: content.querySelectorAll('.reader-math[data-state="ready"]').length,
    errors: content.querySelectorAll('[data-state="error"]').length,
  }));
  if (ready.diagrams !== 2 || ready.formula !== 1 || ready.errors) {
    throw new Error('Handout diagrams or formula did not render: ' + JSON.stringify(ready));
  }
  await page.evaluate(async () => {
    const content = document.querySelector('#markdown-content');
    for (const link of content.querySelectorAll('a[href]')) {
      const target = new URL(link.href);
      if (target.origin === location.origin) {
        target.protocol = 'https:';
        target.host = 'koolfox.github.io';
        link.href = target.href;
      }
    }
    content.querySelectorAll('.diagram-source').forEach(node => node.remove());
    document.body.replaceChildren(content);
    document.body.className = 'guide-print';
    content.removeAttribute('tabindex');
    content.className = 'guide-body';
    for (const img of content.querySelectorAll('img')) img.loading = 'eager';
    await Promise.all([...content.querySelectorAll('img')].map(img => img.decode()));
  });
  await page.addStyleTag({ content: `
@page { size:A4; margin:17mm 17mm 19mm; }
html,body { background:white!important; color:#162536!important; width:auto!important; min-width:0!important; max-width:none!important; margin:0!important; padding:0!important; direction:rtl; font-family:Arad,sans-serif; font-size:12pt; line-height:1.9; }
.guide-body { max-width:none!important; padding:0!important; background:white!important; }
h1 { font-size:23pt; line-height:1.6; color:#123658; margin:0 0 7mm; }
h2 { font-size:16pt; line-height:1.65; margin:8mm 0 3mm; color:#123658; break-after:avoid; }
h3,strong { font-weight:700; }
p { margin:0 0 3.5mm; orphans:3; widows:3; }
a { color:#185576; text-decoration:none; overflow-wrap:anywhere; }
a.term-link { color:inherit; text-decoration:underline; }
img { display:block; margin:4mm auto; max-width:100%; max-height:62mm; object-fit:contain; break-inside:avoid; }
.table-scroll { overflow:visible!important; width:auto!important; margin:4mm 0!important; }
table { width:100%!important; min-width:0!important; border-collapse:collapse; font-size:10.5pt; margin:0; break-inside:avoid; }
th,td { border:1px solid #cbd5df; padding:2mm 2.5mm; text-align:right; overflow-wrap:anywhere; }
th { background:#eef3f7; color:#123658; }
tr { break-inside:avoid; }
.reader-diagram { break-inside:avoid; margin:4mm 0; }
.reader-diagram svg { max-width:100%; height:auto; max-height:40mm; }
.reader-diagram .reader-render-note { display:none; }
.reader-math { font-size:11pt; break-inside:avoid; }
code { font-size:10pt; direction:ltr; unicode-bidi:isolate; }
pre { white-space:pre-wrap; }
bdi,[dir=ltr] { direction:ltr; unicode-bidi:isolate; }
` });
  await page.pdf({
    path: output, format: 'A4', printBackground: true, displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size:9px;width:100%;text-align:center;color:#657080;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    preferCSSPageSize: true,
  });
  console.log(JSON.stringify({ output, browser: browser.version(), ...ready }));
} finally {
  await browser.close();
}
