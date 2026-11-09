import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(new URL('../browser-tests/package.json', import.meta.url));
const { chromium } = require('playwright');
const site = process.env.POOLING_SITE;
const output = process.argv[2];
if (!site || !output) throw Error('Set POOLING_SITE and provide an output directory');
const data = JSON.parse(execFileSync('python3', ['deep-learning/animations/pooling_source_example.py'], { encoding: 'utf8' }));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(site, { waitUntil: 'domcontentloaded' });
await page.setContent(`<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><style>
@font-face{font-family:Arad;src:url('${site}/assets/fonts/arad.woff2')}
*{box-sizing:border-box}body{margin:0;background:#fff;color:#17243a;font-family:Arad,sans-serif}
header{height:86px;border-bottom:2px solid #dfe6f1;padding:12px 52px;display:flex;gap:18px;align-items:center}
header img{width:57px;height:57px;object-fit:contain;filter:brightness(0)}header strong{font-size:28px}
header span{margin-right:auto;font-size:18px;color:#4d5e76}main{padding:28px 58px}
.intro{font-size:24px;margin:0 0 22px}.boards{display:flex;direction:ltr;align-items:center;justify-content:center;gap:66px}
.board h2{text-align:center;font-size:23px;font-weight:600;margin:0 0 12px;direction:rtl}
.grid{display:grid;direction:ltr;grid-template-columns:repeat(4,76px);gap:3px}.out{grid-template-columns:repeat(2,76px)}
.cell{width:76px;height:76px;display:grid;place-items:center;background:#f3f6fb;border:1px solid #c9d4e5;color:#1a2942;font:30px Arial}
.cell.active{background:#dceaff;border:3px solid #2459c4;font-weight:bold}.cell.done{background:#e9f5ed;border-color:#65a376}
.arrow{font:50px Arial;color:#416cae}.calc{direction:ltr;text-align:center;font:31px Arial;min-height:64px;margin-top:28px;color:#174a95}
.caption{text-align:center;font-size:20px;color:#425675;margin-top:4px}footer{position:absolute;bottom:14px;left:52px;right:52px;border-top:1px solid #dfe6f1;padding-top:10px;display:flex;justify-content:space-between;font-size:15px;color:#596a80}
</style><header><img src="${site}/deep-learning/assets/university-logo.png" alt=""><strong>بیشینه‌گیری (Max Pooling)</strong><span>استاد: دکتر نگار مجمع</span></header>
<main><p class="intro">پنجره ۲×۲ با گام ۲؛ از هر ناحیه فقط بیشترین مقدار حفظ می‌شود.</p><div class="boards">
<div class="board"><h2>ورودی اسلاید</h2><div id="input" class="grid"></div></div><div class="arrow">→</div>
<div class="board"><h2>خروجی</h2><div id="output" class="grid out"></div></div></div><div class="calc"></div><div class="caption"></div></main>
<footer><span>ارایه دهنده: حسام شینی</span><span dir="ltr">Danna Gurari · Spring 2026 · slide 48 · CC BY-NC-SA</span></footer></html>`);
await page.evaluate(() => document.fonts.ready);
const durations = [4, 7, 7, 7, 7, 6];
const parts = [];
for (let stage = 0; stage < durations.length; stage++) {
  await page.evaluate(({ data, stage }) => {
    const input = document.querySelector('#input');
    const output = document.querySelector('#output');
    input.replaceChildren(); output.replaceChildren();
    const selected = stage >= 1 && stage <= 4 ? data.steps[stage - 1] : null;
    data.input.forEach((row, r) => row.forEach((value, c) => {
      const cell = document.createElement('div'); cell.className = 'cell'; cell.textContent = value;
      if (selected && r >= selected.row && r < selected.row + 2 && c >= selected.column && c < selected.column + 2) cell.classList.add('active');
      input.append(cell);
    }));
    data.steps.forEach((step, i) => {
      const cell = document.createElement('div'); cell.className = 'cell';
      cell.textContent = stage === 5 || (stage >= 1 && i < stage) ? step.maximum : '؟';
      if (stage === 5 || (stage >= 1 && i < stage)) cell.classList.add('done');
      output.append(cell);
    });
    document.querySelector('.calc').textContent = selected ? `max(${selected.values.join(', ')}) = ${selected.maximum}` : '';
    document.querySelector('.caption').textContent = stage === 0 ? 'چهار پنجره بدون هم‌پوشانی' : stage === 5 ? 'خروجی دو در دو: ۶، ۸، ۳ و ۴' : `پنجره ${stage} از ۴`;
  }, { data, stage });
  const filename = path.resolve(output, `stage-${stage}.png`);
  await page.screenshot({ path: filename });
  parts.push(`file '${filename.replaceAll("'", "'\\''")}'\nduration ${durations[stage]}`);
}
await browser.close();
parts.push(`file '${path.resolve(output, 'stage-5.png').replaceAll("'", "'\\''")}'`);
const concat = path.resolve(output, 'frames.txt');
await writeFile(concat, parts.join('\n') + '\n');
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', concat,
  '-t', '38', '-r', '24', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.resolve(output, 'pooling-s05p48.mp4')], { stdio: 'inherit' });
console.log(JSON.stringify(data));
