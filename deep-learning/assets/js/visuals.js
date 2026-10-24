// Optional, source-linked visualizations. No dependencies and no invented histories.
const BLUE = '#175cd3';
const NEUTRAL = '#636b78';
const colors = [BLUE, NEUTRAL];
const format = value => value === 0 ? '0' : (Math.abs(value) < .001 || Math.abs(value) >= 10000) ? value.toExponential(2) : Number(value.toPrecision(4)).toString();
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function technical(node) { node.dir = 'ltr'; node.style.unicodeBidi = 'isolate'; return node; }
function note(parent, text, cls) { const node = el('p', text, cls); node.style.cssText = 'line-height:1.9;overflow-wrap:anywhere;margin:10px 0'; parent.append(node); return node; }
function table(parent, columns, rows, caption) {
  const wrapper = el('div');
  wrapper.style.cssText = 'max-width:100%;min-width:0;overflow-x:auto;margin:12px 0';
  wrapper.tabIndex = 0;
  wrapper.setAttribute('role', 'region');
  wrapper.setAttribute('aria-label', caption);
  const t = technical(el('table'));
  t.style.cssText = 'border-collapse:collapse;width:100%;font-size:13px;text-align:center';
  const cap = el('caption', caption); cap.style.cssText = 'text-align:start;padding:8px;font-weight:700'; t.append(cap);
  const head = el('thead'), hr = el('tr');
  columns.forEach(label => { const th = el('th', label); th.scope = 'col'; th.style.cssText = 'padding:8px;border:1px solid #d8e3f3'; hr.append(th); });
  head.append(hr); t.append(head);
  const body = el('tbody');
  rows.forEach(row => { const tr = el('tr'); row.forEach((value, index) => { const cell = el(index ? 'td' : 'th', String(value)); if (!index) cell.scope = 'row'; cell.style.cssText = 'padding:8px;border:1px solid #d8e3f3;white-space:nowrap'; tr.append(cell); }); body.append(tr); });
  t.append(body); wrapper.append(t); parent.append(wrapper);
  return body;
}
function renderBars(parent, visual) {
  const {categories, series} = visual.data;
  const max = Math.max(...series.flatMap(s => s.values), 0) || 1;
  note(parent, `محور مقدار: ${visual.axes.x} | ردیف ها: ${visual.axes.y}`);
  const legend = el('div'); legend.style.cssText = 'display:flex;flex-wrap:wrap;gap:14px;margin:10px 0';
  series.forEach((s, i) => { const item = technical(el('span', s.label)); item.style.cssText = `border-inline-start:12px solid ${colors[i % colors.length]};padding-inline-start:6px;font-weight:600`; legend.append(item); }); parent.append(legend);
  note(parent, `تمام میله ها مقیاس یکسان دارند: از 0 تا ${format(max)}. طول میله مقدار عددی را نشان می دهد؛ رنگ نام سری را مشخص می کند.`);
  categories.forEach((category, i) => {
    const group = el('div'); group.style.cssText = 'margin:16px 0;min-width:0';
    const label = technical(el('div', category)); label.style.cssText = 'font-weight:700;overflow-wrap:anywhere'; group.append(label);
    series.forEach((s, j) => {
      const row = technical(el('div')); row.style.cssText = 'margin:7px 0';
      const value = el('div', `${s.label}: ${format(s.values[i])}`); value.style.cssText = 'font-size:13px;overflow-wrap:anywhere';
      const track = el('div'); track.style.cssText = 'width:100%;height:14px;background:#edf2f8;border-left:1px solid #668099';
      const bar = el('div'); bar.style.cssText = `height:100%;width:${Math.max(0, s.values[i]) / max * 100}%;background:${colors[j % colors.length]}`;
      track.setAttribute('aria-hidden', 'true'); track.append(bar); row.append(value, track); group.append(row);
    }); parent.append(group);
  });
}
function renderMatrices(parent, visual) {
  note(parent, `محور افقی: ${visual.axes.x} | محور عمودی: ${visual.axes.y}`);
  note(parent, 'آبی مقدار مثبت، خاکستری مقدار منفی و سفید صفر است. پررنگ تر یعنی قدر مطلق بزرگ تر؛ مقدار دقیق در هر خانه نوشته شده است. مقیاس هر ماتریس مستقل است.');
  visual.data.panels.forEach(panel => {
    const max = Math.max(...panel.values.flat().map(Math.abs)) || 1;
    const body = table(parent, [visual.axes.y + ' / ' + visual.axes.x, ...panel.columns], panel.values.map((r, i) => [panel.rows[i], ...r.map(format)]), panel.label);
    [...body.rows].forEach((row, i) => [...row.cells].slice(1).forEach((cell, j) => {
      const value = panel.values[i][j], alpha = Math.abs(value) / max * .28;
      cell.style.backgroundColor = value < 0 ? `rgba(99,107,120,${alpha})` : `rgba(23,92,211,${alpha})`;
      cell.style.color = '#152d4d'; cell.style.fontVariantNumeric = 'tabular-nums';
      cell.title = String(value);
    }));
    note(parent, `بیشترین قدر مطلق در ${panel.label}: ${format(Math.max(...panel.values.flat().map(Math.abs)))}`);
  });
}
function svgNode(tag, attrs, text) {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([key, value]) => n.setAttribute(key, String(value)));
  if (text !== undefined) n.textContent = text;
  return n;
}
function renderSpectrum(parent, visual) {
  const points = visual.data.points;
  const maxX = Math.max(...points.map(p => p[0])) || 1;
  const maxY = Math.max(...points.map(p => p[1])) || 1;
  note(parent, `محور افقی: ${visual.axes.x} | محور عمودی: ${visual.axes.y}. خط آبی دامنه خانه های FFT را نشان می دهد.`);
  const peak = points.reduce((a, b) => b[1] > a[1] ? b : a);
  const svg = svgNode('svg', {viewBox:'0 0 560 260', role:'img', 'aria-label':`${visual.title}؛ قله در ${format(peak[0])} هرتز با دامنه ${format(peak[1])}`});
  svg.style.cssText = 'display:block;width:100%;max-width:100%;height:auto;direction:ltr;background:#fff';
  svg.append(svgNode('title', {}, visual.title));
  const x = v => 55 + v / maxX * 480, y = v => 215 - v / maxY * 185;
  svg.append(svgNode('path', {d:'M55 25 V215 H535', fill:'none', stroke:'#667d99'}));
  for (let i = 0; i <= 4; i++) {
    const vx = maxX * i / 4, vy = maxY * i / 4;
    svg.append(svgNode('text', {x:x(vx),y:240,'text-anchor':'middle','font-size':14,fill:'#263d59'},format(vx)));
    svg.append(svgNode('text', {x:48,y:y(vy)+5,'text-anchor':'end','font-size':14,fill:'#263d59'},format(vy)));
    svg.append(svgNode('line', {x1:55,x2:535,y1:y(vy),y2:y(vy),stroke:'#e6edf6'}));
  }
  svg.append(svgNode('polyline', {points:points.map(p => `${x(p[0])},${y(p[1])}`).join(' '), fill:'none', stroke:BLUE,'stroke-width':2}));
  svg.append(svgNode('circle', {cx:x(peak[0]),cy:y(peak[1]),r:4,fill:BLUE}));
  parent.append(svg);
  note(parent, `قله واقعی آرایه: ${format(peak[0])} Hz؛ دامنه: ${format(peak[1])}. تعداد خانه های نمایش داده شده: ${points.length}.`);
  const details = el('details'); details.append(el('summary', 'دیدن مقدار عددی تمام خانه های FFT'));
  table(details, ['Hz', '|FFT|'], points.map(p => p.map(format)), 'frequencies / spectrum'); parent.append(details);
}
export function renderLessonVisual(container, visual) {
  container.replaceChildren();
  container.hidden = !visual;
  if (!visual) return;
  container.dir = 'rtl';
  container.style.cssText = 'min-width:0;max-width:100%;box-sizing:border-box;margin-top:24px;padding:16px;border:1px solid #c9d9ef;border-radius:12px;background:#f8fbff;color:#18314f';
  container.append(el('h3', visual.title));
  note(container, visual.caption, 'visual-caption');
  if (visual.type === 'bars') renderBars(container, visual);
  else if (visual.type === 'matrix') renderMatrices(container, visual);
  else if (visual.type === 'spectrum') renderSpectrum(container, visual);
  note(container, 'خط مرتبط در همان کد درس:');
  const code = technical(el('pre', visual.code_reference, 'visual-code-reference'));
  code.style.cssText = 'max-width:100%;box-sizing:border-box;white-space:pre-wrap;overflow-wrap:anywhere;text-align:left;padding:12px;border-radius:8px;background:#e9f1fc;font-size:13px;color:#18314f'; container.append(code);
  note(container, visual.limitations, 'visual-limitations');
  note(container, 'این تصویر از اجرای کد همین نسخه ساخته شده است؛ تغییر فایل روی رایانه شما تصویر صفحه را خودکار به روز نمی کند.');
}
