// Records reader rendering states; this is not a visual or translation review.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';

function argumentsMap(args) {
 const values = {};
 for (let i = 0; i < args.length; i += 2) {
  if (!args[i]?.startsWith('--') || !args[i + 1] || args[i + 1].startsWith('--')) throw Error('Arguments must be --name value pairs');
  values[args[i].slice(2)] = args[i + 1];
 }
 return values;
}
const args = argumentsMap(process.argv.slice(2));
if (!args['base-url'] || !args.output || !args['target-commit']) throw Error('Required: --base-url URL --output FILE --target-commit COMMIT');
const base = new URL(args['base-url']);
if (!['http:', 'https:'].includes(base.protocol)) throw Error('base-url must use HTTP or HTTPS');
const metadata = JSON.parse(readFileSync(new URL('../data/metadata/spring-2026.json', import.meta.url)));
const sessions = metadata.term.schedule.filter(item => item.slides?.some(slide => slide.page_count > 0));
const requested = args.sessions?.split(',');
if (requested?.some(id => !sessions.some(session => session.id === id))) throw Error('Unknown session');
const chosen = requested ? sessions.filter(session => requested.includes(session.id)) : sessions;
const views = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
const requestedViews = (args.viewports || 'desktop,mobile').split(',');
if (requestedViews.some(view => !views[view])) throw Error('Unknown viewport');
const pages = args.pages?.split(',').map(Number);
if (pages?.some(page => !Number.isInteger(page) || page < 1)) throw Error('Pages must be positive integers');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const dirty = Boolean(execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim());
const record = value => appendFileSync(args.output, JSON.stringify(value) + '\n');
writeFileSync(args.output, '');
record({ type: 'audit', startedAt: new Date().toISOString(), baseUrl: base.href, targetCommit: args['target-commit'], targetCommitVerified: false, auditScriptCommit: commit, trackedChangesPresent: dirty, viewports: requestedViews.map(name => ({ name, ...views[name] })), scope: 'Rendering state only; not visual or translation acceptance.' });
const browser = await chromium.launch({ headless: true, ...(args['chrome-path'] ? { executablePath: args['chrome-path'] } : {}) });
let failures = 0, count = 0;
try {
 for (const name of requestedViews) {
  const context = await browser.newContext({ viewport: views[name] });
  const page = await context.newPage();
  for (const session of chosen) {
   const total = session.slides.reduce((sum, slide) => sum + (slide.page_count || 0), 0);
   for (const number of pages || Array.from({ length: total }, (_, index) => index + 1)) {
    if (number > total) continue;
    const errors = [];
    const onError = error => errors.push({ type: 'pageerror', message: error.message });
    const onConsole = message => { if (message.type() === 'error') errors.push({ type: 'console', message: message.text() }); };
    const onFailed = request => errors.push({ type: 'requestfailed', url: request.url(), message: request.failure()?.errorText });
    const onResponse = response => { if (response.status() >= 400) errors.push({ type: 'http', url: response.url(), status: response.status() }); };
    page.on('pageerror', onError); page.on('console', onConsole); page.on('requestfailed', onFailed); page.on('response', onResponse);
    const url = new URL(`/deep-learning/terms/spring-2026/${session.id}/slides/#page=${number}`, base).href;
    let state = null, failure = null;
    try {
     await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
     await page.waitForFunction(() => window.sourceSlideReader?.ready, null, { timeout: 30000 });
     if (name === 'mobile') await page.locator('[data-view-translation]').click();
     await page.waitForFunction(expected => {
      const reader = window.sourceSlideReader, element = document.querySelector('#persian-page');
      return reader?.ready && reader.page === expected && element?.dataset.page === String(expected) && element.dataset.layout && element.dataset.layout !== 'pending';
     }, number, { timeout: 30000 });
     state = await page.evaluate(() => ({ page: window.sourceSlideReader.page, renderedPage: window.sourceSlideReader.renderedPage, pageCount: window.sourceSlideReader.pageCount, layout: document.querySelector('#persian-page').dataset.layout, sourceSha256: window.sourceSlideReader.sourceSha256 }));
     if (state.pageCount !== total) throw Error(`Page count differs: reader=${state.pageCount}, metadata=${total}`);
    } catch (error) { failure = error.message; }
    page.off('pageerror', onError); page.off('console', onConsole); page.off('requestfailed', onFailed); page.off('response', onResponse);
    if (failure || errors.length) failures++;
    record({ type: 'page', session: session.id, page: number, viewport: name, url, state, errors, failure });
    count++;
   }
  }
  await context.close();
 }
} finally {
 await browser.close();
 record({ type: 'summary', finishedAt: new Date().toISOString(), pagesRecorded: count, pagesWithErrors: failures });
}
console.log(`Recorded ${count} page views; ${failures} had browser or loading errors. Rendering states do not establish visual fidelity.`);
if (failures) process.exitCode = 1;
