#!/usr/bin/env node
// A browser inventory, not a visual or scientific approval of a slide.
import { chromium } from '@playwright/test';
import { appendFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

function options(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith('--') || !argv[i + 1]) throw Error('Expected --name value pairs');
    result[argv[i].slice(2)] = argv[i + 1];
  }
  for (const name of ['base-url', 'build-id', 'sessions', 'pages', 'output']) {
    if (!result[name]) throw Error(`Missing --${name}`);
  }
  return result;
}

function numbers(value, max) {
  const out = new Set();
  for (const item of value.split(',')) {
    const match = /^(\d+)(?:-(\d+))?$/.exec(item);
    if (!match) throw Error(`Invalid range: ${item}`);
    const start = Number(match[1]), end = Number(match[2] || match[1]);
    if (start < 1 || end < start || end > max) throw Error(`Range out of bounds: ${item}`);
    for (let i = start; i <= end; i++) out.add(i);
  }
  return [...out];
}

async function main() {
  const args = options(process.argv.slice(2));
  const variant = args.variant || 'normal';
  if (!['normal', 'baseline', 'candidate'].includes(variant)) throw Error('Invalid variant');
  const baselineModule = args['baseline-module'] ? await readFile(args['baseline-module'], 'utf8') : null;
  if (baselineModule && variant !== 'baseline') throw Error('A baseline module requires the baseline variant');
  const base = new URL(args['base-url']);
  if (!['http:', 'https:'].includes(base.protocol)) throw Error('Base URL must use HTTP(S)');
  const sessions = numbers(args.sessions, 99), pages = numbers(args.pages, 500);
  const viewports = (args.viewports || '390x844,1440x900').split(',').map(value => {
    const m = /^(\d{3,4})x(\d{3,4})$/.exec(value);
    if (!m || +m[1] < 200 || +m[2] < 200) throw Error(`Invalid viewport: ${value}`);
    return { width: +m[1], height: +m[2] };
  });
  const output = path.resolve(args.output), snapshots = `${output}.snapshots`;
  await mkdir(path.dirname(output), { recursive: true });
  let snapshotCount = 0, snapshotBytes = 0;
  try {
    for (const name of await readdir(snapshots)) {
      if (!name.endsWith('.png')) continue;
      snapshotCount++;
      snapshotBytes += (await stat(path.join(snapshots, name))).size;
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const completed = new Set();
  try {
    for (const line of (await readFile(output, 'utf8')).split('\n')) {
      if (!line.trim()) continue;
      const record = JSON.parse(line);
      // Timeouts and errors remain retryable on the next run.
      if (record.status !== 'error') completed.add(record.key);
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  try {
    for (const session of sessions) for (const number of pages) for (const viewport of viewports) {
      const id = `s${String(session).padStart(2, '0')}`;
      const url = new URL(`/deep-learning/terms/spring-2026/${id}/slides/#page=${number}`, base).href;
      const key = JSON.stringify([args['build-id'], base.origin, id, number, viewport.width, viewport.height]);
      if (completed.has(key)) continue;
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      let retryHookSeen = false, baselineSeen = false;
      if (variant !== 'normal') {
        if (baselineModule) await page.route('**/slide-content.js*', route => {baselineSeen=true;return route.fulfill({status:200, contentType:'text/javascript', body:baselineModule});});
        await page.route('**/source-reader.js*', async route => {
          const response = await route.fetch();
          let body = await response.text();
          const needle = 'const expanded=expandSourceLayout(plan);';
          if (!body.includes(needle)) throw Error('Expected retry hook not found');
          retryHookSeen = true;
          if (variant === 'baseline' && !baselineModule) body = body.replace(needle, 'const expanded=null;');
          await route.fulfill({ response, body });
        });
      }
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const record = { schema: 1, key, build_id: args['build-id'], variant, url, session: id, page: number,
        viewport, browser: `chromium ${browser.version()}`, time_utc: new Date().toISOString(),
        status: 'error', visual_review: 'not_performed', findings: [] };
      try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        if (!response?.ok()) throw Error(`HTTP ${response?.status() ?? 'unknown'}`);
        if (viewport.width < 761) await page.locator('[data-view-translation]').click({ timeout: 15000 });
        await page.waitForFunction(n => window.sourceSlideReader?.ready &&
          window.sourceSlideReader.renderedPage === n && window.sourceSlideReader.page === n &&
          document.querySelector('#persian-page')?.dataset.layout !== 'pending', number, { timeout: 45000 });
        if (variant !== 'normal' && !retryHookSeen) throw Error('Retry hook was not observed');
        if (baselineModule && !baselineSeen) throw Error('Baseline module was not observed');
        const result = await page.evaluate(async () => {
          await document.fonts.ready;
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const root = document.querySelector('#persian-page');
          const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
          const visible = node => { const r = node.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(node).visibility !== 'hidden'; };
          const text = [...root.querySelectorAll('.reader-slide-text, [data-source-lines], p, li, h1, h2, h3, th, td')].filter(visible).map(node => {
            const s = getComputedStyle(node);
            return { rect: rect(node), font_family: s.fontFamily, font_size_px: parseFloat(s.fontSize),
              direction: s.direction, unicode_bidi: s.unicodeBidi,
              overflow_x: node.scrollWidth > node.clientWidth + 2, overflow_y: node.scrollHeight > node.clientHeight + 2 };
          });
          const images = [...root.querySelectorAll('img, canvas, svg')].filter(visible).map(node => ({
            type: node.tagName.toLowerCase(), rect: rect(node), loaded: node.tagName === 'IMG' ? node.complete && node.naturalWidth > 0 : null
          }));
          const config = JSON.parse(document.querySelector('#source-reader-config').textContent);
          let translation_sha256 = null;
          try {
            const response = await fetch(config.translationUrl);
            if (response.ok && crypto.subtle) {
              const digest = await crypto.subtle.digest('SHA-256', await response.arrayBuffer());
              translation_sha256 = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
            }
          } catch { /* Resource identity is recorded as unknown. */ }
          return { layout: root.dataset.layout || null, page_count: window.sourceSlideReader.pageCount,
            source_sha256: window.sourceSlideReader.sourceSha256 || null,
            translation_url: config.translationUrl || null, translation_sha256, font_status: document.fonts.status,
            font_faces: [...document.fonts].map(face => ({ family: face.family, status: face.status })),
            root_direction: getComputedStyle(root).direction, text, images };
        });
        Object.assign(record, result);
        record.page_errors = errors;
        if (!result.layout) record.findings.push({ kind: 'missing_layout', status: 'unknown' });
        else if (['render-fallback', 'layout-error-fallback', 'text-overflow'].includes(result.layout))
          record.findings.push({ kind: result.layout, status: 'fail' });
        else if (!['source-canvas', 'source-canvas-figure-companion'].includes(result.layout))
          record.findings.push({ kind: 'fallback_layout', reason: result.layout, status: 'needs_review' });
        if (result.text.some(item => item.overflow_x || item.overflow_y)) record.findings.push({ kind: 'text_overflow', status: 'fail' });
        if (result.images.some(item => item.loaded === false)) record.findings.push({ kind: 'image_load', status: 'fail' });
        if (errors.length) record.findings.push({ kind: 'page_error', status: 'fail' });
        if (!result.text.length) record.findings.push({ kind: 'text_measurement', status: 'unknown' });
        if (!result.images.length) record.findings.push({ kind: 'image_measurement', status: 'unknown' });
        record.status = record.findings.some(f => f.status === 'fail') ? 'fail' :
          record.findings.length ? 'needs_review' : 'measured';
      } catch (error) {
        record.findings.push({ kind: 'load_or_measurement', status: 'unknown', detail: error.message });
      }
      if (record.status === 'fail' || record.status === 'error' || args['snapshot-all'] === 'true') {
        try {
          if (snapshotCount >= 50 || snapshotBytes >= 20 * 1024 * 1024) {
            record.snapshot_skipped = 'snapshot budget exhausted';
          } else {
            const data = await page.screenshot();
            if (snapshotBytes + data.length > 20 * 1024 * 1024) {
              record.snapshot_skipped = 'snapshot would exceed 20 MiB budget';
            } else {
              await mkdir(snapshots, { recursive: true });
              const file = `${id}-${number}-${viewport.width}x${viewport.height}-${createHash('sha256').update(key).digest('hex').slice(0, 10)}.png`;
              await writeFile(path.join(snapshots, file), data);
              snapshotCount++; snapshotBytes += data.length;
              record.snapshot = path.join(snapshots, file);
            }
          }
        } catch (error) { record.snapshot_error = error.message; }
      }
      await appendFile(output, `${JSON.stringify(record)}\n`);
      console.log(`${id} page ${number} ${viewport.width}x${viewport.height}: ${record.status}`);
      await context.close();
      if (!browser.isConnected()) throw Error('Browser disconnected; progress was saved and the scan stopped');
    }
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
