import katex from './vendor/katex/katex.mjs';

const persian = /[\u0620-\u063f\u0641-\u064a\u066e-\u066f\u0671-\u06d3\u06fa-\u06fc]/;
const bullet = /^(\s*)([•●▪◦–-]|\d+[.)])\s+(.+)$/;
const pairedTerms = new Map([['least', 'کمترین'], ['most', 'بیشترین']]);
const sourceTerms = new Map([...pairedTerms, ['training data','دادهٔ آموزش'], ['test data','دادهٔ آزمون'], ['training','آموزش'], ['test','آزمون'], ['overfitting','بیش‌برازش'], ['regularize','منظم‌سازی'], ['gradient','گرادیان'], ['constant','ثابت'], ['constant(i.e.,modelparameter)','ثابت (یعنی پارامتر مدل)'], ['intuition','شهود'], ['e.g','برای مثال'], ['forxorproblem','برای مسئله XOR'], ['directedgraph','گرافی جهت‌دار'], ['nodes','گره‌ها'], ['edges','یال‌ها'], ['forwardpass','گذر رو به جلو (Forward Pass)'], ['backwardpass','گذر رو به عقب (Backward Pass)'], ['forexample','برای مثال'], ['increase','افزایش'], ['reduce','کاهش']].map(([term,target])=>[term.replace(/\s/g,""),target]));
let referenceTargets = new Map();
const referenceKey = value => value.replace(/\ufffe/g, '-').replace(/\/$/, '');

export function configureReferences(targets = {}) {
  referenceTargets = new Map(Object.entries(targets).map(([url, target]) => [referenceKey(url), target]));
}

export function referenceTarget(raw) {
  try {
    const url = new URL(raw);
    const fragment = url.hash; url.hash = '';
    const target = referenceTargets.get(referenceKey(url.href));
    if (!target) return null;
    const checked = new URL(target);
    if (!['http:', 'https:'].includes(checked.protocol)) return null;
    if (fragment && !checked.hash) checked.hash = fragment;
    return checked.href;
  } catch { return null; }
}

function element(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

export function readingColor(value) {
  if (!/^#[0-9a-f]{6}$/i.test(value || '')) return null;
  let rgb = value.slice(1).match(/../g).map(v => parseInt(v, 16));
  const luminance = values => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  if (Math.max(...rgb) - Math.min(...rgb) < 20) return null;
  while (1.05 / (luminance(rgb) + .05) < 4.5) rgb = rgb.map(v => Math.floor(v * .95));
  return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
}

function applyStyle(node, style) {
  const color = readingColor(style?.color);
  if (color) node.style.color = color;
  if (style?.bold) node.style.fontWeight = '700';
  if (style?.italic) node.style.fontStyle = 'italic';
}

function appendBidi(parent, text) {
  const tokens = /https?:\/\/[^\s<>"\u0600-\u06ff]+|[A-Za-z][A-Za-z0-9_]*\([^\u0600-\u06ff()\n]*\)|\([^\u0600-\u06ff()\n]*\)|(?:[+−-](?=\d))?[A-Za-z0-9α-ωΑ-Ω∂∇Σ∑√σŷ][A-Za-z0-9α-ωΑ-Ω∂∇Σ∑√σŷ₀-₉⁰-⁹_+−=<>≤≥×*/.,:;\[\]{}^% \t\-]*/g;
  let end = 0;
  for (const match of text.matchAll(tokens)) {
    parent.append(document.createTextNode(text.slice(end, match.index)));
    const token = match[0];
    if (/^https?:/.test(token)) {
      let url = token;
      while (/[.,;،؛]$/.test(url) || (/\)$/.test(url) && (url.match(/\)/g) || []).length > (url.match(/\(/g) || []).length)) url = url.slice(0, -1);
      try {
        const target = referenceTarget(url);
        if (!target) throw Error();
        const link = element('a', 'reader-reference');
        link.href = target; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.dir = 'ltr'; link.textContent = target;
        parent.append(link, document.createTextNode(token.slice(url.length)));
      } catch { const text = element('bdi'); text.dir = 'ltr'; text.textContent = token; parent.append(text); }
    } else {
      const isolated = element('bdi'); isolated.dir = 'ltr'; isolated.textContent = token.trimEnd();
      parent.append(isolated, document.createTextNode(token.slice(token.trimEnd().length)));
    }
    end = match.index + token.length;
  }
  parent.append(document.createTextNode(text.slice(end)));
}

export function addText(parent, text, style = {}, options = {}) {
  const formulas = [...text.matchAll(/\\\(([\s\S]+?)\\\)/g)];
  if (formulas.length) {
    let end = 0;
    for (const formula of formulas) {
      addText(parent, text.slice(end, formula.index), style, options);
      math(parent, {latex: formula[1], fa: formula[0], display: 'inline'});
      end = formula.index + formula[0].length;
    }
    addText(parent, text.slice(end), style, options);
    return;
  }
  const ranges = [];
  for (const accent of style.accents || []) {
    const english = accent.text.trim().replace(/^[•–-]\s*/, '');
    const sourceKey=english.toLowerCase().replace(/\s/g,'').replace(/[:;,.]+$/,'');
    const target = (options.sourceColors ? sourceTerms.get(sourceKey)||sourceTerms.get(english.toLowerCase()) : pairedTerms.get(english.toLowerCase())) || english;
    if (!target || !(options.sourceColors ? /^#[0-9a-f]{6}$/i.test(accent.color || '') : readingColor(accent.color))) continue;
    const start = text.toLowerCase().indexOf(target.toLowerCase());
    if (start < 0 || text.toLowerCase().indexOf(target.toLowerCase(), start + target.length) >= 0) continue;
    const word = /[\p{L}\p{N}_]/u;
    if ((word.test(target[0]) && word.test(text[start - 1] || ''))
        || (word.test(target.at(-1)) && word.test(text[start + target.length] || ''))) continue;
    ranges.push({start, end: start + target.length, accent});
  }
  let end = 0;
  for (const range of ranges.sort((a, b) => a.start - b.start)) {
    if (range.start < end) continue;
    appendBidi(parent, text.slice(end, range.start));
    const span = element(range.accent.bold ? 'strong' : 'span', 'reader-emphasis');
    applyStyle(span, range.accent); if(options.sourceColors&&/^#[0-9a-f]{6}$/i.test(range.accent.color||''))span.style.color=range.accent.color; appendBidi(span, text.slice(range.start, range.end)); parent.append(span);
    end = range.end;
  }
  appendBidi(parent, text.slice(end));
}

export function math(parent, item) {
  const node = element(item.display === 'inline' ? 'span' : 'div', item.display === 'inline' ? 'reader-math reader-math-inline' : 'reader-math'); node.dir = 'ltr';
  applyStyle(node, item.presentation);
  if (item.latex) {
    try {
      katex.render(item.latex, node, {displayMode: item.display !== 'inline', throwOnError: true, trust: false, strict: 'error'});
      node.dataset.typeset = 'true';
    } catch { node.textContent = item.fa; node.dataset.mathError = 'true'; }
  } else node.textContent = item.fa;
  parent.append(node);
}

export function renderTable(parent, table) {
  const viewport = element('div', 'reader-table-viewport');
  viewport.dir = 'ltr';
  viewport.tabIndex = 0; viewport.setAttribute('role', 'region'); viewport.setAttribute('aria-label', 'جدول اسلاید');
  const node = element('table', 'reader-table'); node.dir = 'ltr'; node.dataset.columns = String(table.headers.length || table.column_count);
  const head = element('thead'), headings = element('tr');
  if (table.groups?.length) {
    const groups = element('tr');
    for (const group of table.groups) {
      const cell = element('th'); cell.colSpan = group.colspan; cell.rowSpan = group.rowspan || 1; cell.scope = group.colspan > 1 ? 'colgroup' : 'col'; cell.dir = 'auto'; addText(cell, group.text); groups.append(cell);
    }
    head.append(groups);
  }
  const covered = new Set(); let column = 0;
  for (const group of table.groups || []) { if (group.rowspan === 2) for (let i = 0; i < group.colspan; i++) covered.add(column + i); column += group.colspan; }
  for (const [index, title] of table.headers.entries()) {
    if (covered.has(index)) continue;
    const cell = element('th'); cell.scope = 'col'; cell.dir = 'auto'; addText(cell, title); headings.append(cell);
  }
  if (table.headers.length) head.append(headings);
  if (head.childElementCount) node.append(head);
  const body = element('tbody');
  for (const row of table.rows) {
    const tr = element('tr');
    row.forEach((value, index) => {
      const data = typeof value === 'string' ? {text: value} : value;
      const isHeader = index === 0 && table.row_headers !== false;
      const cell = element(isHeader ? 'th' : 'td');
      if (isHeader) cell.scope = 'row';
      cell.colSpan = data.colspan || 1; cell.rowSpan = data.rowspan || 1; cell.dir = persian.test(data.text) ? 'rtl' : 'ltr';
      if (data.bold) cell.style.fontWeight = '700';
      if (data.image_rect) {
        const crop = element('canvas', 'reader-table-image'); crop.dataset.sourceCrop = JSON.stringify(data.image_rect);
        crop.setAttribute('role', 'img'); crop.setAttribute('aria-label', data.image_alt); cell.append(crop);
      }
      addText(cell, data.text); tr.append(cell);
    });
    body.append(tr);
  }
  node.append(body); viewport.append(node); parent.append(viewport);
}

function paragraph(parent, text, block) {
  const values = text.split('\n');
  if (block.kind === 'literal' && values.length > 3 && values.every(value => /^[A-Za-zΑ-Ωα-ω0-9۰-۹+\-−×*/=.,()[\]{}^σ∂∇]+$/u.test(value.trim()))) {
    const row = element('p', 'reader-copy literal reader-values'); row.dir = 'ltr'; row.dataset.sourceLines = (block.source_lines || []).join(','); applyStyle(row, block.presentation);
    values.forEach((value, index) => { const token = element('span'); token.textContent = value; row.append(token); if (index < values.length - 1) row.append(document.createTextNode('\n')); });
    parent.append(row);
    return;
  }
  const node = element(block.kind === 'heading' ? 'h3' : block.kind === 'literal' ? 'pre' : 'p', 'reader-copy ' + block.kind);
  node.dir = persian.test(text) ? 'rtl' : 'ltr';
  node.dataset.sourceLines = (block.source_lines || []).join(',');
  applyStyle(node, block.presentation); addText(node, text, block.presentation); parent.append(node);
}

export function renderBlocks(parent, blocks, tables = []) {
  let list = null;
  const consumed = new Set(tables.flatMap(table => table.source_lines || []));
  const at = new Map(tables.filter(table => table.source_lines?.length).map(table => [Math.min(...table.source_lines), table]));
  for (const block of blocks) {
    const table = at.get(Math.min(...(block.source_lines || [])));
    if (table) { list = null; renderTable(parent, table); }
    if (block.source_lines?.some(line => consumed.has(line))) continue;
    if (block.kind === 'not_visible') continue;
    if (block.latex || block.kind === 'math') { list = null; math(parent, block); continue; }
    if (block.kind === 'bullet') {
      if (!list) { list = element('ul', 'reader-list'); list.dir = 'rtl'; parent.append(list); }
      const items = [];
      for (const line of block.fa.split('\n')) {
        if (!line.trim()) continue;
        if (!items.length || /^\s*[•●▪◦–-]\s+/.test(line)) items.push(line.replace(/^\s*[•●▪◦–-]\s+/, ''));
        else items[items.length - 1] += '\n' + line;
      }
      for (const item of items) {
        const node = element('li'); node.dataset.sourceLines = (block.source_lines || []).join(','); applyStyle(node, block.presentation);
        addText(node, item, block.presentation); list.append(node);
      }
      continue;
    }
    list = null;
    const lines = block.fa.split('\n');
    if (block.kind === 'text' && lines.some(line => bullet.test(line))) {
      let paragraphLines = [], innerList = null;
      const flush = () => { if (paragraphLines.length) paragraph(parent, paragraphLines.join('\n'), block); paragraphLines = []; };
      for (const line of lines) {
        const match = line.match(bullet);
        if (!match) { innerList = null; paragraphLines.push(line); continue; }
        flush();
        const tag = /\d/.test(match[2]) ? 'ol' : 'ul';
        if (!innerList || innerList.tagName.toLowerCase() !== tag) { innerList = element(tag, 'reader-list'); innerList.dir = 'rtl'; parent.append(innerList); }
        const node = element('li'); node.dataset.sourceLines = (block.source_lines || []).join(',');
        if (tag === 'ol') node.value = parseInt(match[2], 10);
        applyStyle(node, block.presentation); addText(node, match[3], block.presentation); innerList.append(node);
      }
      flush();
    } else paragraph(parent, block.fa, block);
  }
}

// Keep diagrams and numerical symbols in PDF space; only native translated text moves.
export function sourceLayoutPlan(record, sourceIdentity = {}) {
  const layout = record.source_layout;
  const fail = reason => ({reason, regions: []});
  if (!layout) return fail('no-geometry');
  if (record.image_text?.length && !layout.images?.length) return fail('unpositioned-source-figure');
  const lines = new Map(layout.lines.map(line => [line.index, line]));
  const regions = [];
  const blocks = record.blocks.flatMap(block => block.source_fragments ? block.source_fragments.map(fragment => ({
    ...block, fa:fragment.fa.trim(), kind:fragment.kind || block.kind,
    latex:fragment.kind && fragment.kind!=='math' ? undefined : block.latex,
    source_refs:fragment.source_parts, source_lines:[...new Set(fragment.source_parts.map(ref=>ref.line))],
  })) : [block]);
  for (const block of blocks) {
    if (block.kind === 'not_visible' || !persian.test(block.fa || '')) continue;
    if(block.visible_en&&!block.source_refs)return fail('occluded-source-text');
    const mapped = block.source_refs ? block.source_refs.map(ref=>{
      const line=lines.get(ref.line);if(!line)return null;
      if(ref.part===undefined)return {...line,text:ref.en};
      const part=line.parts?.[ref.part];return part?{...line,...part,index:ref.line,text:ref.en,parts:undefined}:null;
    }) : block.source_lines.map(index => lines.get(index));
    if (!mapped.length || mapped.some(line => !line)) return fail('unmapped-native-text');
    if(mapped.some(line=>line.font_size<8&&(line.rect[3]-line.rect[1])*layout.height>line.font_size*3))return fail('unscaled-source-font');
    const columns = mapped.filter(line => (line.parts || []).filter(part => !/^(?:[•●▪◦–—-]|[0-9]+[.)])$/.test(part.text.trim())).length > 1);
    if (columns.length) {
      const clauses = block.fa.split(/[؛;\n]/).map(text => text.trim()).filter(Boolean);
      const parts = mapped.length === 1 ? mapped[0].parts : [];
      const key = text => text.normalize('NFKC').replace(/\s/g,'').toLowerCase();
      const anchored = (text,term) => {const haystack=key(text),needle=key(term),at=haystack.indexOf(needle);return needle&&at>=0&&!/[a-z0-9_]/.test(haystack[at-1]||'')&&!/[a-z0-9_]/.test(haystack[at+needle.length]||'');};
      const assignments = clauses.map(text => parts.map((part,index) => anchored(text,part.text) ? index : -1).filter(index => index >= 0));
      if (!parts.length || clauses.some(text=>!persian.test(text)) || clauses.length !== parts.length || assignments.some(matches => matches.length !== 1)
          || new Set(assignments.flat()).size !== parts.length || parts.some(part => !part.color || !part.font_size)) return fail('split-source-line');
      for (const [index,text] of clauses.entries()) {
        const part = parts[assignments[index][0]], line = {...mapped[0],...part};
        regions.push({block:{...block,fa:text},rect:part.rect,lines:[line],font:part.font_size,color:part.color});
      }
      continue;
    }
    if (block.kind !== 'math' && mapped.length > 1) {
      const ordered = [...mapped].sort((a,b)=>a.rect[1]-b.rect[1]);
      if (Math.max(...mapped.map(line=>line.rect[0])) > Math.min(...mapped.map(line=>line.rect[2]))
          || ordered.some((line,index)=>index&&line.rect[1]-ordered[index-1].rect[3]
            > Math.max(line.font_size,ordered[index-1].font_size)/layout.height*.8)) return fail('discontinuous-source-region');
    }
    const rect = [Math.min(...mapped.map(l => l.rect[0])), Math.min(...mapped.map(l => l.rect[1])),
      Math.max(...mapped.map(l => l.rect[2])), Math.max(...mapped.map(l => l.rect[3]))];
    const font = Math.max(...mapped.map(line => line.font_size));
    regions.push({block, rect, lines: mapped, font, color: mapped[0].color || '#000000'});
  }
  const intersects = (a,b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  for (const region of regions) {
    if (layout.images.some(image => intersects(region.rect,image.rect)
        && !region.lines.every(line => intersects(line.rect,image.rect)))) return fail('text-spans-media');
  }
  const contains=(outer,inner,padding=0)=>outer[0]-padding<=inner[0]&&outer[1]-padding<=inner[1]&&outer[2]+padding>=inner[2]&&outer[3]+padding>=inner[3];
  const units=layout.lines.flatMap(line=>(line.parts?.length?line.parts:[line]).map(unit=>({...unit,index:line.index})));
  for (const region of regions) {
    const owned = new Set(region.block.source_lines);
    const occupied=units.filter(unit=>!region.lines.some(line=>line.index===unit.index&&contains(line.rect,unit.rect,.00001)));
    const area=rect=>(rect[2]-rect[0])*(rect[3]-rect[1]);
    const frames=(layout.text_frames||[]).filter(frame=>contains(frame.inner_rect,region.rect,.004)
      && area(frame.inner_rect)<=area(region.rect)*8
      && !occupied.some(unit=>intersects(frame.inner_rect,unit.rect)));
    if(frames.length){frames.sort((a,b)=>area(a.inner_rect)-area(b.inner_rect));region.slot=frames[0].inner_rect;continue;}
    const obstacles = [...layout.images, ...(layout.graphics || []),
      ...layout.lines.filter(line => !owned.has(line.index)),
      ...regions.filter(other=>other!==region)].map(item => item.rect);
    let [left,top,right,bottom] = region.rect;
    if (!obstacles.some(rect => intersects(region.rect,rect))) {
      const horizontal = obstacles.filter(rect => rect[1]<bottom&&rect[3]>top&&rect[0]>=right);
      right = Math.min(.97,left+(right-left)*1.5,...horizontal.map(rect=>rect[0]-.004));
      const vertical = obstacles.filter(rect=>rect[0]<right&&rect[2]>left&&rect[1]>=bottom);
      bottom = Math.min(.97,top+(bottom-top)*2.4,...vertical.map(rect=>rect[1]-.004));
    }
    region.slot = [left,top,Math.max(right,region.rect[2]),Math.max(bottom,region.rect[3])];
  }
  // Reviewed placements for the four consecutive gradient-descent diagrams.
  // Both hashes bind these coordinates to the exact source text and translation.
  const reviewed = {
    39:['e99475b68b4d829815dc80e4ff71d0bd1f2ab3dac640d392fd945288a6303f4b','79b1d56908f4d2a69815eb118de60754e9b30ecd7a132bc7803e7466d5b70fc8'],
    40:['764cf46efc021ad48a92db78891affa2b6a5a3bd9292cb4d2f98dcc3d7346b30','6d4bcc8790819ad8d12b8ad6063e85bba527127ed7bae74248736704661843c4'],
    41:['e99475b68b4d829815dc80e4ff71d0bd1f2ab3dac640d392fd945288a6303f4b','79b1d56908f4d2a69815eb118de60754e9b30ecd7a132bc7803e7466d5b70fc8'],
    42:['24fc7b83ba2cd24db3a2e54bfc710cf1647bc2967f2e4cf01eaaca8c51208a54','b37b42737e9f0b619ec9dc48e9eefaffc99a92636bd54d13b06f6e65f1de3f75'],
  }[record.number];
  if(reviewed && sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03'
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256===reviewed[0] && layout.translation_sha256===reviewed[1]){
    const slots = new Map([
      ['نزول گرادیان (Gradient Descent): شهود پیاده‌سازی',[.05,.07,.97,.27]],
      ['• تکرار کنید:',[.076,.274,.235,.326]],
      ['حدس',[.151,.329,.212,.378]],
      ['محاسبه خطا',[.150,.380,.287,.430]],
      ['خطا = حدس − مقدار درست.',[.65,.70,.98,.77]],
    ]);
    for(const region of regions){
      if(slots.has(region.block.fa))region.slot=slots.get(region.block.fa);
      if(region.block.fa.startsWith('• برای مثال، ضریب ثابتی'))region.slot=[.076,.44,.90,.60];
      if(region.block.kind==='math')region.persianEquation=true;
    }
  }
  // Captions on the XOR diagram use distinct source lines and source colors.
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===99
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='baf0c6c184e6fcd54f83a44caef077746147f053f468ee0b00cfcd6cd82fac5b'
      && layout.translation_sha256==='f41d1a6500b5e82f7990b77d655dd33d592adb9ed5a19d724f54283df96f1b5a'){
    for(const region of regions){
      if(region.block.fa.startsWith('برای مثال، وزن‌ها و بایاس‌های'))region.slot=[.03,.84,.97,.91];
      if(region.block.fa.startsWith('(و مسئله‌های حل‌شده'))region.slot=[.03,.91,.97,.985];
    }
  }
  // Separate the computational-graph labels without covering the diagrams.
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===105
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='9cfd57c543dbe83396610804bf2ba0188988faf0823e2f875d4c088a034bccaf'
      && layout.translation_sha256==='8198005a8396db902564d2df1470999ea75b245317e34791f9d5ff1cdd452919'){
    for(const region of regions)if(region.block.fa==='مقدار میانی در متغیری تازه ذخیره می‌شود.')region.slot=[.595,.568,.985,.61];
  }
  // Keep the two-line Persian title clear of the forward and backward passes.
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===106
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='e4cd47bae4488eb1a29a84bf6ded51fad990aed147622705f919a6a8db3de5a9'
      && layout.translation_sha256==='ff7317d3c5018475337246bbb08c760bfeee26efcd799273d383aee68cd7fbd9'){
    for(const region of regions)if(region.block.fa==='چگونه از گراف محاسباتی (Computational Graph) استفاده کنیم؟')region.slot=[.05,.08,.97,.27];
  }
  // Source-bound geometry for the computational graph and its correction note.
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===107
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='0de89f8dc94095fbd0e07d7bd43f9155c0d65a7e73f31286c972f643821b212a' && layout.translation_sha256==='7de2e0b992fa0059dc87c2ce510f71c27049362ca9e0d3c754c4d62e3409ba6d'){
    for(const region of regions){
      if(region.block.fa==='چگونه از گراف محاسباتی (Computational Graph) استفاده کنیم؟')region.slot=[.05,.06,.97,.27];
      if(region.block.fa==='از حساب دیفرانسیل می‌دانیم:')region.slot=[.436,.61,.85,.667];
      if(region.block.fa==='جمع، گرادیان ورودی را عبور می‌دهد؛ ضرب، مقدار دیگر را عبور می‌دهد.')region.slot=[.38,.878,.985,.99];
    }
  }
  // Place the node-four explanation in the clear area above the source formulas.
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===82
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='8b8d985635a018bc636329b6227ed2fc8768a0ed768fed4da7e1082842510b37' && layout.translation_sha256==='83e8adebbdeeeca93c81eb059c8dfaa9ec7795291de16fb17fcf7f8b34344d2a'){
    for(const region of regions){
      if(region.block.fa==='مثال: گام 3 — گذر رو به عقب (Backward Pass)')region.slot=[.02,.075,.99,.205];
      if(region.block.fa==='به‌طور مشابه، برای گره 4 محاسبه می‌کنیم:')region.slot=[.52,.242,.985,.299];
    }
  }
  // Keep the source formulas and the highlighted bias/weight paths unobscured.
  const backwardReview = {
    77:['2252eb710c6cd3758bc7a1ab58124712ad2465c587da9e622d123256c10017f7','4219ca1094fa78cb8c6cf10e6af42ff8db68c673915351d657d8013d79e99b6d'],
    78:['6e6008d861992f9b5c29a244733a3e3da69fcfcafc8eaf4a72227897f8012a0e','c26bfdb60cfdb024f73a5822dce9312d06ff60f103253c8dca7b51e966d8a791'],
    83:['5ac640ad4f410a3ad9892a98e06c5760565ca4e74e2fb65efde56cea54fa4a33','bfcbb51ae1d17152ffa28137ec29a126505425d5dfcdcd864551eab10665707b'],
    84:['3ce0dace29d65d1b06257173f6b9fcf71f1c976c7a29c63d69b06e0d0c4e3a93','6d71981f0683a054d633d4e49e0cccd95dc66c6621c56244b2277e95a063ab69'],
  }[record.number];
  if(backwardReview && sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03'
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256===backwardReview[0] && layout.translation_sha256===backwardReview[1]){
    for(const region of regions)if(region.block.fa==='مثال: گام 3 — گذر رو به عقب (Backward Pass)')region.slot=[.02,.075,.99,.205];
  }
  // Reviewed loss and backward-pass captions avoid the native network and formulas.
  const earlyBackwardReview = {
    73:['959ec19aace2d6c7b36c0c570cd9f58464243e07163be98f36fc7ef0eca1a01f','50927f2ee8b51ec9ed3ad700d5da0b27e5e52c149a3e0a5bf0af12f983811e8f'],
    74:['8c05b1a1b1b00b35554823afe419db7a3bc30c4e38b6f80811776e4be8a73ba7','5922779a2f7fcfbfde028fd0ee8326eeed7fea6db9231674fd6db6d4037a27cc'],
  }[record.number];
  if(earlyBackwardReview && sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03'
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256===earlyBackwardReview[0] && layout.translation_sha256===earlyBackwardReview[1]){
    for(const region of regions){
      const text=region.block.fa;
      if(region.block.kind==='heading')region.slot=[.02,.075,.99,.205];
      if(record.number===73 && text.startsWith('مربع خطا'))region.slot=[.60,.52,.99,.58];
      if(record.number===73 && text.startsWith('آیا هنگام تغییر')){region.slot=[.56,.80,.985,.985];region.color='#ffffff';region.manualAccents=[{text:'increase',color:'#ffc000'},{text:'reduce',color:'#ffc000'}];}
      if(record.number===74 && text.startsWith('به یاد آورید'))region.slot=[.60,.24,.98,.34];
      if(record.number===74 && text.startsWith('1. جمع'))region.slot=[.55,.37,.81,.46];
      if(record.number===74 && text.startsWith('2. تابع'))region.slot=[.61,.49,.84,.61];
      if(record.number===74 && text.startsWith('برای گره 6'))region.slot=[.58,.748,.995,.825];
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===61
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='06188b318d3e9e1a9dd0b0fe40ac1af55dc34b4fe987ce900b5a650a42bdab9f' && layout.translation_sha256==='feeb475a3e5a1ee10edecb643157b0dd80f631ebb5eecc69e577460ebf662942'){
    for(const region of regions){
      const text=region.block.fa;
      if(region.block.kind==='heading')region.slot=[.02,.075,.99,.205];
      if(text.startsWith('• مشاهده')){region.slot=[.04,.205,.98,.265];region.font=17.18;region.manualAccents=[{text:'تابعی ریاضی',color:'#ffc000'},{text:'زنجیره',color:'#ffc000'}];}
      if(text.startsWith('• آنچه')){region.slot=[.04,.267,.98,.327];region.font=17.18;region.manualAccents=[{text:'مشتق‌های جزئی نسبت به متغیرهای تابع',color:'#ffc000'}];}
      if(text.startsWith('• پس')){region.slot=[.04,.329,.98,.41];region.font=17.18;region.manualAccents=[{text:'قاعدهٔ زنجیره‌ای (Chain Rule) حساب دیفرانسیل',color:'#ffc000'}];}
      if(text.startsWith('نشان می‌دهد'))region.slot=[.50,.70,.98,.84];
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===44
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='7a321ee0a41f17f13f61f7911b8234739af74cc0a998a69bf8f1436c68473c38' && layout.translation_sha256==='64b50183dd6ba034c2ab4ab0a43bba54e7e3d4bb49a73278f09b5ab8f1491b00'){
    for(const region of regions){
      const text=region.block.fa;
      if(region.block.kind==='heading')region.slot=[.02,.075,.99,.205];
      if(text.startsWith('• گرادیان')){region.slot=[.06,.215,.97,.335];region.color='#ffffff';region.manualAccents=[{text:'گرادیان (Gradient)',color:'#ffc000'},{text:'مشتق‌های جزئی برای چند متغیر',color:'#ffc000'}];}
      if(text.startsWith('• مشتق')){region.slot=[.06,.34,.97,.455];region.color='#ffffff';region.manualAccents=[{text:'مشتق (Derivative)',color:'#ffc000'}];}
      if(text.startsWith('آیا این تابع')){region.slot=[.095,.575,.55,.675];region.keepTermsTogether=true;}
      if(text.startsWith('مقدار تابع'))region.slot=[.095,.68,.55,.77];
      if(text.startsWith('مقدار x در کمینه'))region.slot=[.095,.775,.55,.87];
    }
  }
  // Reviewed examples use the same text scale as the source neural-network diagram.
  const weightReview = {
    86:['677ef30e430098d8abc449ef7ba245ba50b0585c828114c8820d6deea9a81f4c','06b40a38450fc61c9781fb040c1a81ee5cd790bbde53b43c539545cc92bbcd93'],
    87:['c8ffd768ad84f25f2918462bf8f28f35a183614c92d705768444b0c4eab01284','8c48c9ab63475fa11c27661b5f2c94179321f5864e3c15efcf2268659c2e2ada'],
    88:['20f2656a0583c47fb16500f23526a78ee42eb22cd38b5b8ad364e16e27b2dbd0','9bea0f97125f152bea8f8cd9f4f5bca5963bc8ad6d6752217cc1c596ddc119c9'],
    89:['753c5b6ce877f4c05058bf8f82e79a524631173c1e217ff736139f379b8ab131','144e4c3e304313b8277a06f13b67c621ba1fc5e3fc3bb7d2ca12c6946161908b'],
    90:['b6ba3f0a29e7df954c06c3eb85704211734134b1b087251354f9d20abd3aae12','7e330361196dc54e5251cb4420ddcd0a1b88213752b3d2824285490172ebeb87'],
    91:['cba139827d5580d3e17b3839dd982978d91bebde1c7c7563a890b927f08217e6','62f60feba51e2b4874ffa6fe47b0eb3bedb6c7a3920ad014977e88656027f3a0'],
    92:['3b04a2f354f65e6681ae469526a9dc2e1f0581a32897316e4cd2c5d17a5c3436','990353dbe25eafca034b362ae8d042b7b8606f163461af149c22be5189335bbd'],
    93:['02bd12af3d32dd1ff9762ffb9bbb3c908a8a8ae126d47e98ac4e8b5955e39950','b86f3cc0d442704dc078cc629cedb84ed64e67df9ae98652bf603ae23f71d224'],
    94:['13d1265c17527de34d760c418de4073445056b3690b57dfe130ef62d7c792acf','f916eefd9901153bb2410d77ee5179f11b1ea5a600c2ed63165d88d49ca04770'],
    95:['8aecdb95bf16e5ad06bd81f87595fc413dd409879c013ca8e673b558c123ca9a','5ff43525cd610584bc8356ddf79e55d4c7b0e75bf6794f61bedafe108fff67fe'],
    96:['80ac9c31ab1c010cfc963103944802666ae58396f8d57118ac44329f93ae7a52','86568258f4736eaf8827564f83a13cb2aa54839a12fae2aa0d24c62dfe0ab5ca'],
  }[record.number];
  if(weightReview && sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03'
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256===weightReview[0] && layout.translation_sha256===weightReview[1]){
    for(const region of regions){
      if(region.block.fa==='پارامترهای تازه (نرخ یادگیری (Learning Rate) = 0.9):')region.slot=[.49,.32,.98,.37];
      if(/^آیا (?:w[1-5],(?:4|5|6)|b[4-6]) باید افزایش یابد یا کاهش؟$/.test(region.block.fa))region.slot=[.64,.25,.98,.315];
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===1
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='c7a3f94597e9fcf0b36ceea393004034742e29f1737386e69c7e5f147053a4ca'
      && layout.translation_sha256==='a0a63c0c55ab7a7898f06d8308b9053c96f86195e88f85601d134b1241e6fbb6'){
    for(const region of regions){
      region.align='center';region.keepTermsTogether=true;
      if(region.block.kind==='heading'){region.slot=[.04,.27,.96,.52];region.font=38;}
      if(region.block.source_lines[0]===2){region.slot=[.12,.61,.88,.67];region.font=28;}
      if(region.block.source_lines[0]===3){region.slot=[.08,.68,.92,.74];region.font=23;}
      if(region.block.source_lines[0]===4){region.slot=[.2,.75,.8,.80];region.font=24;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && [2,3,27].includes(record.number)
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='93be166ad020db0006505dc7ba7155a8e809f0fb64afc1dfc2f33e13791b16be'
      && layout.translation_sha256==='a219bf326c518c4dde45b9e7fb7de31a7a0d05378b9f50aa9e41795309054c2f'){
    for(const region of regions){
      const index=region.block.source_lines[0];
      region.keepTermsTogether=true;
      if(index===0)region.slot=[.04,.11,.96,.21];
      else region.slot=[.04,.35+(index-1)*.149,.96,.48+(index-1)*.149];
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===4
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='cb37288320326d69b2a3cf49758e02d4af85a994fa33f569d65454eec9f4d46c'
      && layout.translation_sha256==='bbee7d130870101735d56f84c0a730f0351a6e4594863799d165956e696b98e8'){
    for(const region of regions){
      const index=region.block.source_lines[0];
      if(index>0){region.align='center';region.slot=[.06,.43+(index-1)*.09,.94,.52+(index-1)*.09];}
      if(index===3)region.manualAccents=[{text:'یا',color:'#ffffff'}];
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===13
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='a446f994291fe2033fe08f7ebffd845639d0ba5a4f14fe5ea71abc743c0feebf'
      && layout.translation_sha256==='1945a5e7443b4fd60df7744c340748e5be1274c3cf23fa6386c716525ea40bd7'){
    for(const region of regions)if(region.block.kind==='heading'){
      region.slot=[.04,.09,.96,.205];region.font=33;region.keepTermsTogether=true;
    }
  }
  const s01TitleReview={
    14:['766169dcca47dd0f8949d0481e883b01b40ea73afd686cc4c7f6f2a7de71e6eb','1628326d1ab32c33dfe78e62320213b30f9b51f26a6e0d85d9a3e9eab667044c',[.04,.09,.96,.205],30],
    19:['a2e55bbba08b55ea9c01ab2d28267bedaf666acd16d3f971a809ca68b67fde8b','2087ae62e9f77f266d3deb4b8e77b306a22fcacd53733a2f55962ba674ba02e3',[.02,.10,.40,.22],26],
  }[record.number];
  if(s01TitleReview && sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01'
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256===s01TitleReview[0] && layout.translation_sha256===s01TitleReview[1]){
    for(const region of regions)if(region.block.kind==='heading'){
      region.slot=s01TitleReview[2];region.font=s01TitleReview[3];region.keepTermsTogether=true;
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===21
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='6f488bfb122db5e22972cf3cc92e0f4afcbbf41f3e0c76cb2fd12682484b19c4'
      && layout.translation_sha256==='cb979bfd8e149debec852ed0153d092bc2eb36c3ed002c1cf1565e16a2a78f4c'){
    const slots={2:[.07,.745,.49,.79],3:[.07,.79,.49,.93],6:[.535,.745,.955,.79],7:[.535,.79,.955,.93]};
    for(const region of regions){
      const index=region.block.source_lines[0];
      if(slots[index]){region.slot=slots[index];region.font=index===2||index===6?16:15;region.keepTermsTogether=true;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===22
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='31a9bd085b6372b79164cbf9ebe1b3ecc8068386387b093c24e4129e27f23de9'
      && layout.translation_sha256==='8b9fc2ef7cf844c58e16cc32d0cb29532a91df898826be7aefccd9219895ef77'){
    const slots={2:[.095,.65,.71,.725],3:[.095,.725,.71,.758],4:[.095,.758,.71,.81],5:[.095,.81,.71,.855],6:[.095,.855,.71,.89],7:[.74,.68,.99,.73]};
    for(const region of regions){
      const index=region.block.source_lines[0];
      if(slots[index]){region.slot=slots[index];region.font=index===7?16:12;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===24
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='205729b9df702d6717ee7cbb22da6fc6750b429556cd93badd695b34766b4715'
      && layout.translation_sha256==='e5f7b269b68c10816cd7efe6c37d44df2c061423b77229498ec9d5c4af7b37be'){
    const slots={2:[.10,.675,.90,.76],4:[.10,.76,.90,.80],5:[.10,.80,.90,.84],6:[.10,.84,.90,.88],7:[.10,.88,.90,.92]};
    for(const region of regions){
      const index=region.block.source_lines[0];
      if(slots[index]){region.slot=slots[index];region.font=17;}
      if(index===2)region.manualAccents=[{text:'نتیجهٔ این پرامپت (Prompt):',color:'#ffc000'}];
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===26
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='12e7f4d50b25e3ebaeeaed061df4ba576dae8c35dcfaa3ce714a67cc77bd4ef0'
      && layout.translation_sha256==='ac1cc1e93c28dd7efb0e53d3cf65913246991e4721b76b0e300e9adda01e982f'){
    const slots={0:[.04,.25,.96,.36],1:[.04,.38,.96,.47],2:[.04,.49,.96,.63],4:[.04,.67,.96,.83]};
    const accents={0:'شبکه‌های عصبی (Neural Networks)',1:'جادو نیستند',2:'ساختهٔ انسان',4:'هدف:'};
    for(const region of regions){
      const index=region.block.source_lines[0];
      if(slots[index]){region.slot=slots[index];region.font=26;region.align='center';region.keepTermsTogether=true;region.manualAccents=[{text:accents[index],color:'#ffc000'}];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===28
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='35e0d3bf882163cede45d4c0a9dc4e8555a392f05cb0e6f170ea5e30f5381798'
      && layout.translation_sha256==='3389759be65bfc773ebcaa80fc72ff00158c6e0b51b77336cb95a0cc8e21c0fd'){
    const slots={2:[.01,.33,.21,.43],4:[.10,.81,.61,.985],7:[.63,.84,.94,.91]};
    for(const region of regions){
      const index=region.block.source_lines[0];
      if(slots[index]){region.slot=slots[index];region.align='center';region.font=index===4?15:19;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===29
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='18026cab7117b432141ae0a94b515b66d3436da2ac486d6efbde8af976fbf8e4'
      && layout.translation_sha256==='aea3615d0ec592c74e6abdcffd7be9b2ffba9f916ac3f831425bbbd20f24ffe2'){
    const slots={1:[.075,.435,.23,.55],3:[.01,.33,.21,.425],5:[.54,.88,.98,.985],7:[.275,.88,.49,.985]};
    for(const region of regions){
      const index=region.block.source_lines[0];
      if(slots[index]){region.slot=slots[index];region.align='center';region.font=index===5?15:17;region.keepTermsTogether=true;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===30
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='9a946e4f149135b535c43a464284e546aeb6631358ad8d82dcf63a296979f9cc'
      && layout.translation_sha256==='079ae3aa13559edf7bbac29ae810c278824ea5a0253bd42c008bc33bc018bf0f'){
    for(const region of regions){
      const text=region.block.fa;
      if(text.startsWith('«هوش مصنوعی»')){region.slot=[.07,.94,.94,.995];region.font=14;region.align='center';}
      if(text.startsWith('آزمون تورینگ')){region.slot=[.075,.435,.23,.55];region.font=16;region.align='center';region.keepTermsTogether=true;}
      if(text==='نخستین ماشین برنامه‌پذیر'){region.slot=[.01,.33,.20,.43];region.font=17;region.align='center';}
      if(text==='تولد هوش مصنوعی (AI)'){region.slot=[.19,.36,.30,.43];region.font=16;region.align='center';}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===31
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='1f22cd043b9cbb99a325453dd893379690729088eec8e1aa619d55724a873f26'
      && layout.translation_sha256==='6f575a5fcfc14326131f96bfa6442fc69ef0ff7e369598a3582e2c616fb22fb7'){
    for(const region of regions){
      const text=region.block.fa;
      if(text.startsWith('«هوش مصنوعی»')){region.slot=[.07,.94,.94,.995];region.font=14;region.align='center';}
      if(text.startsWith('پیشنهاد کارگاه:')){region.slot=[.065,.53,.93,.89];region.font=17;}
      if(text.startsWith('آزمون تورینگ')){region.slot=[.075,.435,.23,.52];region.font=16;region.align='center';region.keepTermsTogether=true;}
      if(text==='نخستین ماشین برنامه‌پذیر'){region.slot=[.01,.33,.20,.43];region.font=17;region.align='center';}
      if(text==='تولد هوش مصنوعی (AI)'){region.slot=[.19,.36,.30,.43];region.font=16;region.align='center';}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===32
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='5245c95343e51082e743c6062dbc388ee26aa8c2e6b35f56da2b6fe61fd385bb'
      && layout.translation_sha256==='9aecbd9977733675c668c5fc5b1ed7baae9375972247b0040d3923c3009993e4'){
    for(const region of regions){
      const text=region.block.fa;
      if(text.startsWith('رایانه‌ها ممکن است')){region.slot=[.21,.59,.70,.78];region.font=30;region.align='center';}
      if(text.startsWith('آزمون تورینگ')){region.slot=[.075,.435,.23,.55];region.font=16;region.align='center';region.keepTermsTogether=true;}
      if(text==='نخستین ماشین برنامه‌پذیر'){region.slot=[.01,.33,.20,.43];region.font=17;region.align='center';}
      if(text==='تولد هوش مصنوعی (AI)'){region.slot=[.19,.36,.30,.43];region.font=16;region.align='center';}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===33
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='7d594fd57fc388d20b760e111a961c282a5043507b873690242b4c3b2ca16b97'
      && layout.translation_sha256==='1ee6821da4c2626513699821f0ae646d768cd0752e9b11919f378cb27e364b1c'){
    const slots={1:[.05,.57,.54,.70],3:[.05,.72,.54,.86],5:[.25,.33,.41,.43],7:[.61,.43,.89,.59],10:[.62,.70,.88,.86],13:[.075,.435,.23,.55],15:[.01,.33,.20,.43]};
    for(const region of regions){
      const index=region.block.source_lines[0];
      if(slots[index]){region.slot=slots[index];region.font=index===1||index===3?16:14;region.keepTermsTogether=true;}
      if([5,7,10,13,15].includes(index))region.align='center';
      if(index===3)region.manualAccents=[{text:'توانایی یادگیری می‌دهد، بدون آنکه صریحا برنامه‌ریزی شوند',color:'#ffc000'}];
    }
  }
  let imageTranslations=[];
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===5
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='d63d4b5c01249f0dd295bd5ab96bfdba336fdaf5da802ebce1fea51264725914'
      && layout.translation_sha256==='69176de0c02bc368a77f415655258cb84993e0d8f3f1708eb395812f97574324'){
    const [gemini,copilot]=record.image_text[2].fa.split('؛');
    imageTranslations=[
      {rect:[.17,.34,.82,.389],text:record.image_text[0].fa,background:'#282a2c',color:'#fff',font:21},
      {rect:[.17,.418,.86,.51],text:record.image_text[1].fa,background:'#282a2c',color:'#e8eaed',font:13},
      {rect:[.175,.63,.45,.675],text:gemini,background:'#1e1f20',color:'#bdc1c6',font:17},
      {rect:[.235,.845,.50,.895],text:copilot.trim(),background:'#0f131f',color:'#8990a7',font:17},
    ];
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===7
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='3d4e3a1b6181f4af554a89968295cc2694d87716a35eef5d824fddfae1e23a14'
      && layout.translation_sha256==='0c918ddb540920c44a65eb808a2cf82560edc0a6772616943e058a8788e52c39'){
    imageTranslations=[
      {rect:[.18,.31,.82,.51],text:'ابزار نوشتن هوش مصنوعی با هوشمندی بی‌همتای داستان‌گویی را بیازمایید.',background:'#f0eddf',color:'#34291d',font:29,align:'center',accents:[{text:'هوش مصنوعی',color:'#04b9df'},{text:'بی‌همتای',color:'#d928d9'}]},
      {rect:[.23,.51,.77,.55],text:'Sudowrite همان شریک نوشتن بدون قضاوتی است که همیشه می‌خواستید.',background:'#f0eddf',color:'#716854',font:12,align:'center'},
      {rect:[.328,.60,.49,.65],text:'Sudowrite را رایگان بیازمایید',background:'#16a45b',color:'#fff',font:11,align:'center'},
      {rect:[.527,.60,.67,.65],text:'با گوگل ثبت‌نام کنید',background:'#fff',color:'#282828',font:11,align:'center'},
    ];
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===8
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='612229f89f94d28bbd69eab27a2fb1a89ab36a740e36ab47370affa774e8521d'
      && layout.translation_sha256==='330712f176311beb7b47a09f61501bfef46fa2a717dec41d4f04af4a5e679a69'){
    const [label,title]=record.image_text[1].fa.split('؛');
    imageTranslations=[
      {rect:[.21,.47,.79,.52],text:label,background:'#030319',color:'#b0b0c1',font:15},
      {rect:[.21,.53,.79,.79],text:title.trim(),background:'linear-gradient(#030319,#02062b)',color:'#fff',font:36,accents:[{text:'پژوهش حقوقی',color:'#3987ff'}]},
      {rect:[.21,.82,.79,.96],text:record.image_text[2].fa,background:'#02062b',color:'#d4d6e8',font:17},
    ];
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===9
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='434e82ab1b169fea82a230f936eae28f8b5e87fb8f9b85a19d6b14fd4086e701'
      && layout.translation_sha256==='5601cfe635fa66eea4d7f4a74c804ed8be3dd805f6984cdbd343d02ec346276c'){
    const [heading,subheading]=record.image_text[1].fa.split('. ');
    imageTranslations=[
      {rect:[.40,.33,.77,.39],text:heading,background:'#091517',color:'#f3f5f5',font:20,align:'center'},
      {rect:[.40,.40,.77,.45],text:subheading,background:'#091517',color:'#aeb6b8',font:11,align:'center'},
      {rect:[.39,.59,.78,.87],text:'بازی‌ای برای علاقه‌مندان تاریخ بساز که به کاوش در دنیایی افسون‌شده با رازهای پنهان قابل کشف کمک کند. از سبک هنری زیبای دست‌کشیده استفاده کن.',background:'#1a222a',color:'#e9eef0',font:16},
      {rect:[.40,.92,.76,.96],text:'ساخت با هوش مصنوعی را آغاز کنید',background:'#fff',color:'#1a222a',font:10,align:'center'},
    ];
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===11
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='d36c30e80c8a929e9f3c5db555427aa977dc964e078dc2969e26c48d7081b43b'
      && layout.translation_sha256==='6d73a0822341e45520def1a8f091bbf2855710a65030cda0c9e112176df0c896'){
    imageTranslations=[
      {rect:[.09,.47,.58,.78],text:'نمره‌های بهتر در ۳۰ روز، یا بازگرداندن پولتان',background:'#f7f7f7',color:'#111',font:37},
      {rect:[.09,.80,.58,.87],text:'پرامپت‌های هوش مصنوعی که ChatGPT، Claude یا Gemini را به آموزگار شخصی شما تبدیل می‌کنند. استفاده‌شده توسط بیش از ۶۰۰ دانش‌آموز و دانشجو در بیش از ۵۰ موضوع.',background:'#f7f7f7',color:'#666',font:12},
      {rect:[.59,.63,.90,.69],text:'چرا کار می‌کند؟',background:'#fff',color:'#111',font:16},
      {rect:[.59,.70,.90,.83],text:'فقط پاسخ نمی‌گیرید؛ از آموزگار شخصی توضیح گام‌به‌گام می‌گیرید و تا موضوع را نفهمید، به مرحله بعد نمی‌رود.',background:'#fff',color:'#303545',font:10},
    ];
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===14
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='766169dcca47dd0f8949d0481e883b01b40ea73afd686cc4c7f6f2a7de71e6eb'
      && layout.translation_sha256==='1628326d1ab32c33dfe78e62320213b30f9b51f26a6e0d85d9a3e9eab667044c'){
    const [heading,body]=record.image_text[0].fa.split('؛');
    imageTranslations=[
      {rect:[.025,.36,.33,.59],text:heading,background:'linear-gradient(100deg,#b9e9fa,#c4ebfb)',color:'#075883',font:24,accents:[{text:'با تصوری تازه',color:'#09a6e7'}]},
      {rect:[.025,.60,.33,.69],text:body,background:'linear-gradient(100deg,#b9e9fa,#c4ebfb)',color:'#507c91',font:11},
      {rect:[.04,.71,.11,.75],text:'بیشتر بدانید',background:'#bbe7f8',color:'#0677b5',font:9,align:'center'},
      {rect:[.13,.71,.23,.75],text:'درخواست نمایش',background:'#0080cb',color:'#fff',font:9,align:'center'},
    ];
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===16
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='f39a4db60396e44d6b59c10c606887936c89b2b5b529f1b4ea0366c1a17b7527'
      && layout.translation_sha256==='856793c0adf6086f16d7f5d1ce9c9459280a906da47a2f76c32f93a7194ef4ba'){
    const parts=record.image_text[0].fa.split('؛');
    imageTranslations=[
      {rect:[.44,.405,.58,.45],text:'رزرو نمایش',background:'#000',color:'#fff',font:10,align:'center'},
      {rect:[.10,.64,.42,.79],text:parts[2].trim(),background:'#000',color:'#fff',font:19,accents:[{text:'جلوه‌های بصری هالیوود',color:'#f10d36'}]},
      {rect:[.10,.81,.42,.95],text:record.image_text[1].fa,background:'#000',color:'#fff',font:9},
    ];
  }
  return {reason: null, regions, layout, imageTranslations, figureLabels: record.image_text || [], tables:record.tables || [], nativeMath:record.blocks.filter(block=>block.kind!=='not_visible'&&block.latex&&(!persian.test(block.fa||'')||block.source_fragments))};
}

export function createSourceLayout(record, plan) {
  const stage = element('div', 'reader-slide-stage');
  const width = 960, height = width * plan.layout.height / plan.layout.width;
  stage.style.width = width + 'px'; stage.style.height = height + 'px';
  const background = element('canvas', 'reader-slide-background');
  background.setAttribute('aria-hidden', 'true'); stage.append(background);
  for (const region of plan.regions) {
    const node = element('div', 'reader-slide-text');
    const presentation={...region.block.presentation};
    if(region.lines.every(line=>Array.isArray(line.accents)))presentation.accents=region.lines.flatMap(line=>line.accents);
    if(region.manualAccents)presentation.accents=region.manualAccents;
    const [x0, y0, x1, y1] = region.slot || region.rect;
    Object.assign(node.style, {left: x0 * width + 'px', top: y0 * height + 'px',
      width: (x1 - x0) * width + 'px', height: (y1 - y0) * height + 'px',
      fontSize: region.font / plan.layout.width * width + 'px', color: region.color});
    node.dataset.sourceLines = region.block.source_lines.join(',');
    if (region.align) node.style.textAlign=region.align;
    if (region.block.presentation?.bold) node.style.fontWeight = '700';
    if (region.block.presentation?.italic) node.style.fontStyle = 'italic';
    if (region.block.latex) math(node, region.block);
    else if(region.block.kind==='math'&&region.block.source_refs&&!region.block.fa.includes('\\(')){
      node.classList.add('reader-word-math');node.dir=region.persianEquation?'rtl':'ltr';node.setAttribute('role','math');
      if(region.persianEquation){node.style.direction='rtl';node.style.textAlign='right';}
      for(const chunk of region.block.fa.split(/([=+−×÷-])/)){
        const term=element('bdi');term.dir=persian.test(chunk)?'rtl':'ltr';
        addText(term,chunk,presentation,{sourceColors:true});node.append(term);
      }
    }else addText(node, region.block.fa, presentation, {sourceColors:true});
    if(region.keepTermsTogether)node.querySelectorAll('bdi').forEach(term=>{term.style.whiteSpace='nowrap';});
    stage.append(node);
  }
  for(const item of plan.imageTranslations || []){
    const node=element('div','reader-slide-text reader-image-translation');
    const [x0,y0,x1,y1]=item.rect;
    Object.assign(node.style,{left:x0*width+'px',top:y0*height+'px',width:(x1-x0)*width+'px',height:(y1-y0)*height+'px',fontSize:item.font+'px',lineHeight:'1.2',background:item.background,color:item.color,textAlign:item.align||'right'});
    addText(node,item.text,{accents:item.accents||[]},{});stage.append(node);
  }
  let companion = null;
  if (plan.figureLabels?.length || plan.tables?.length || plan.nativeMath?.length) {
    const tableIndices = new Set([...plan.tables.flatMap(table => table.source_lines || []), ...plan.nativeMath.flatMap(block=>block.source_lines)]);
    const nativeTables = plan.layout.lines.filter(line => tableIndices.has(line.index));
    const rects = plan.figureLabels.length ? plan.layout.images.map(image => image.rect) : nativeTables.map(line => line.rect);
    if (!rects.length) rects.push([0,0,1,1]);
    const left = Math.min(...rects.map(r => r[0])), top = Math.min(...rects.map(r => r[1]));
    const right = Math.max(...rects.map(r => r[2])), bottom = Math.max(...rects.map(r => r[3]));
    const details = element('details', 'reader-figure-labels'); details.dir = 'rtl';
    details.dataset.figureRect = JSON.stringify([left,top,right,bottom]);
    details.open = Boolean(plan.tables.length);
    const summary = element('summary'); summary.textContent = plan.tables.length ? 'جدول و نوشته‌های شکل' : (plan.figureLabels.length ? (plan.nativeMath.length?'نوشته‌ها و فرمول‌های شکل':rects.length>1?'نوشته‌های شکل‌ها':'نوشته‌های شکل') : 'فرمول‌ها'); details.append(summary);
    const content = element('div','reader-figure-content');
    for(const block of plan.nativeMath)math(content,block);
    const imageTables=plan.tables.filter(table=>table.image_text_indices?.length);
    const tableAt=new Map(imageTables.map(table=>[table.image_text_indices[0],table]));
    const consumed=new Set(imageTables.flatMap(table=>table.image_text_indices));
    for(const table of plan.tables.filter(table=>table.source_lines?.length))renderTable(content,table);
    for (const [index,item] of plan.figureLabels.entries()) {
      if(tableAt.has(index)){renderTable(content,tableAt.get(index));continue;}
      if(consumed.has(index))continue;
      if(item.latex){math(content,item);continue;}
      const paragraph = element('p');addText(paragraph,item.fa);content.append(paragraph);
    }
    details.append(content);companion=details;
  }
  const holder = element('div', 'reader-slide-holder'); holder.append(stage);
  return {holder, stage, background, width, height, companion};
}

export function fitSourceLayout(stage) {
  const nodes = [...stage.querySelectorAll('.reader-slide-text')];
  const original = nodes.map(node => node.style.fontSize);
  const scale = stage.offsetWidth ? stage.getBoundingClientRect().width / stage.offsetWidth : 0;
  const fits = node => node.scrollHeight <= node.clientHeight + 2 && node.scrollWidth <= node.clientWidth + 2;
  for (const node of nodes) {
    if (fits(node)) continue;
    const size = parseFloat(node.style.fontSize);
    if (Number.isFinite(size) && !node.matches('.reader-word-math') && !node.querySelector('.katex, code, pre')) {
      for (const factor of [.95, .90, .85]) {
        if (size * factor < 16 || size * factor * scale < 12) continue;
        node.style.fontSize = `${size * factor}px`;
        if (fits(node)) break;
      }
    }
    if (!fits(node)) {
      nodes.forEach((item,index) => { item.style.fontSize = original[index]; });
      return false;
    }
  }
  return true;
}
