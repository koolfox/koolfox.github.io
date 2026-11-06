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
  const historyReview = {
    104:['8e3bcd80521f7447d652e6bff329a6f04da8d18046f6a876eaa832f7b864af13','52922152980a9a85e1a3b6195281dcc039f3829f5d5658d448593feaa26c890e'],
    108:['9d1100f78fc5694e7688a1ffbd47153a29fd4b6b93882e0f17a015973614aedd','cfdae2cb13ce1f79e7660befecbe8f7ea87eb69b6070362b7d4d935b559c6e12'],
  }[record.number];
  if(historyReview && sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03'
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256===historyReview[0] && layout.translation_sha256===historyReview[1]){
    for(const region of regions){
      if(region.block.fa.startsWith('دهه‌های 1960'))region.manualAccents=[{text:'دهه‌های 1960 و 1970',color:'#ffc000'}];
      if(region.block.fa.startsWith('دههٔ 1980'))region.manualAccents=[{text:'دههٔ 1980',color:'#ffc000'}];
      if(region.block.fa.startsWith('• محاسبهٔ کارآمد'))region.manualAccents=[{text:'محاسبهٔ کارآمد',color:'#0000ff'}];
      if(region.block.fa.startsWith('• بازنمایی کارآمد'))region.manualAccents=[{text:'بازنمایی کارآمد',color:'#0000ff'}];
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===1
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='6c8977230001710a5095b31f0814a98a904f5b97dca0180a625ddf2125605bb4'
      && layout.translation_sha256==='53ebd634396bdfbedba20ae712cd00b04baa158e80c7c9a43af06cd37ed8ec9e'){
    for(const region of regions){const i=region.block.source_lines[0];region.align='center';
      if(i===0){region.slot=[.05,.19,.95,.30];region.font=39;}
      if(i===1){region.slot=[.05,.30,.95,.46];region.font=33;region.keepTermsTogether=true;}
      if(i===2){region.slot=[.05,.60,.95,.675];region.font=23;}
      if(i===3){region.slot=[.05,.68,.95,.746];region.font=18;}
      if(i===4){region.slot=[.05,.747,.95,.81];region.font=18;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===5
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='7223ce84f8bda3a3f91278b27d701d9882a532dba5b6959f918a45133a92646e'
      && layout.translation_sha256==='4a810fb1270142b79e306799a189a762e6d1146124a9d435a3ac5e4f548413ef'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.95,.21];region.font=33;}
      if(i===1){region.slot=[.05,.25,.95,.32];region.font=18;}
      if(i===2){region.slot=[.28,.92,.65,.98];region.font=17;region.align='center';}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===6
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='9f3222dba016e54a25a87152cb0429d3cd26ba7339a8432ee0cd27127d8ef5c2'
      && layout.translation_sha256==='33f255068e82f0f9c357ea5e07620c0b9dce7bbc3d3e91ff942a64d953d91c74'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.95,.21];region.font=33;}
      if(i===1){region.slot=[.57,.39,.98,.69];region.font=15;region.color='#ffffff';region.manualAccents=[{text:'«… پرسپترون ساده نخست مطالعه شد… زیرا نشان داد شبکه‌های عصبی سازگارشونده، در ساده‌ترین شکل‌هایشان، در اصل می‌توانند بهبود یابند.',color:'#ffc000'},{text:'آنچه طرفداران پرسپترون تکیه‌گاهی موقت می‌دانستند، مینسکی و پاپرت ساختار نهایی تفسیر می‌کنند.»',color:'#ffc000'}];}
      if(i===8){region.slot=[.57,.71,.98,.77];region.font=14;}
      if(i===9){region.slot=[.22,.84,.39,.90];region.font=16;region.align='center';}
      if(i===10){region.slot=[.05,.25,.95,.32];region.font=18;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===7
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='3a19a7bf5d6ff9befd79e500ab2466ed8ff84a5e2831b0cd1d4709b94eee2e9e'
      && layout.translation_sha256==='847827d2070a64cee5f7a0e196bee576ac9a623d38e1d04d2771f58074aae669'){
    const slots={0:[.05,.10,.95,.21],1:[.05,.25,.95,.32],3:[.14,.69,.57,.74],4:[.13,.74,.57,.85],7:[.14,.88,.56,.95],8:[.25,.95,.48,.999],9:[.07,.34,.47,.385],10:[.06,.385,.48,.51],14:[.49,.455,.79,.525],17:[.81,.70,.95,.81]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];region.font=i===0?33:i===1?18:14;if(i!==0&&i!==1)region.align='center';}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===13
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='e3f542d201f4ef52ca74def54f48381efd2b79a51cbcc849d9d1da802e289cc1'
      && layout.translation_sha256==='9816afaee199566e755bb08c193d19588a19396fd1e337791d438670517e2666'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.95,.21];region.font=33;}
      if(i===1){region.slot=[.08,.46,.93,.69];region.font=18;region.manualAccents=[{text:'اصطلاح‌های رایج',color:'#ffc000'}];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===14
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='6e17855c66104cb103869e9a81bf71f6b9dcbaef4d24ff5725e90c1f52819912'
      && layout.translation_sha256==='318f520558411f31e7c10eae18fcfb4788951e900e531d95a6ae2a31df308971'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.95,.21];region.font=33;}
      if(i===1){region.slot=[.64,.43,.99,.77];region.font=19;region.manualAccents=[{text:'لایه‌های پنهان',color:'#ffc000'},{text:'لایهٔ خروجی',color:'#f300f2'}];}
      if(i===5){region.slot=[.52,.37,.63,.46];region.font=15;region.align='center';}
      if(i===6){region.slot=[.07,.34,.145,.43];region.font=15;region.align='center';}
      if(i===7){region.slot=[.11,.83,.54,.99];region.font=18;region.align='center';}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===15
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='eaabb71e7fe8a9f5736dbf8be6e206e41db8e728029bcd1ca46fefde4350d525'
      && layout.translation_sha256==='61a61389bf94cf44d4abcc3dc1bd78b8b6bb4da7328a69dddd2374f8ee938eba'){
    const heading=regions.find(region=>region.block.source_lines[0]===0);
    if(heading){heading.slot=[.05,.10,.95,.21];heading.font=33;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number>=16 && record.number<=22
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='6508d4651512caadebed2f3b950de4ae10858f035dfb081b39a6ea2eaa03e8a0'
      && layout.translation_sha256==='58103bbbeceb299c4f292b09accac120bccd6168bd92a34e6b928e0ea9249c8c'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.95,.21];region.font=33;}
      if(i===1){region.slot=[.435,.50,.62,.67];region.font=16;}
      if(i===4){region.slot=[.715,.64,.97,.71];region.font=14;}
      if(i===5){region.slot=[.715,.48,.97,.55];region.font=14;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===23
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='89c08c49c3e7bb9eaddf42a3bf087d552752d44b37187c2d676b8a9832d58b33'
      && layout.translation_sha256==='1a67d57852ca7aceddaa2c3081eb09903516f8250404f732eb66edc9fd89d937'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.95,.21];region.font=33;}
      if(i===1){region.slot=[.46,.26,.97,.32];region.font=19;region.manualAccents=[{text:'هدف',color:'#ffc000'}];}
      if(i===2){region.slot=[.46,.33,.97,.39];region.font=18;}
      if([3,5,7,9,11].includes(i)){region.slot=[.49,region.rect[1]-.004,.97,region.rect[3]+.006];region.font=15;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===24
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='2122eb5c5573331881a7e3edd7f30c665856aa1096635bb85ba519879da54041'
      && layout.translation_sha256==='6da542d0d375c77c1bd8f717477a12d46e4ade463fd2ea93958e9642c5a0a610'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.05,.95,.25];region.font=30;}
      if(i===2){region.slot=[.50,.45,.97,.56];region.font=18;region.manualAccents=[{text:'تمام‌متصل',color:'#ffc000'}];}
      if(i===4){region.slot=[.50,.61,.97,.73];region.font=18;region.manualAccents=[{text:'پیش‌خور',color:'#ffc000'}];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===25
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='b7f21a8953abe540ddf19a5d8417d6bf096b30b0599a94994cbf83dd86cd0c93'
      && layout.translation_sha256==='bac3183f58480f3a2e9626a7fa58a49f3cd6e70c4c1a8437e88b1c975eece07b'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.95,.21];region.font=33;}
      if(i===1){region.slot=[.09,.33,.81,.47];region.font=18;region.manualAccents=[{text:'دشواری مسئله',color:'#ffc000'}];}
      if(i===3){region.slot=[.08,.53,.94,.68];region.font=18;region.manualAccents=[{text:'به‌رسمیت‌شناخته‌شدن',color:'#ffc000'}];}
      if(i===5){region.slot=[.08,.74,.94,.89];region.font=18;region.manualAccents=[{text:'تامین مالی',color:'#ffc000'}];}
    }
  }
  const xorLayouts={
    8:['d2b3197385ac54cba5e2883e08b575286ecb53ec32490248714c327d28b2f53b','414db0665fe15478a7298705f8437c61179a99157138f11dc87c6f4df357d677'],
    9:['0c34d94aedceba75167565b32f6a1aef6444728377f7c21ad3a0701f165a4e00','84e1ebe3a8d6fdd6ba5126dff88fc0cbdcd3d7ed8ab30e8aebdb215a07798ab9'],
    10:['edce9583e309c4b00d27b9eb6c32488fde269855a22643f14037c23501079a6c','043ede2ec24efffcd76ba0273a9a7cd05459606565501134e12106aef1d2b03b'],
    11:['3a52b8b9d36531075480f1da0f27608e5ebeaed2eb5df0a7d20fd1b21d03a652','7e3dd4420fcff2257e0d6c5772aa3f8220a0f87d221ff7954f1dd9e2b71bc2d4'],
    12:['624022a61eacf81b47635f2c0dfe811c12ce9d5544b8aa8325b78e07d3400159','8b35176d091c3bafb333f00033612101b8858c43e1b9fe85c027a6f04af4954d'],
  }[record.number];
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && xorLayouts
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256===xorLayouts[0] && layout.translation_sha256===xorLayouts[1]){
    const initial=record.number===8;
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.95,.21];region.font=33;}
      if(i===(initial?18:1)){region.slot=[.05,.245,.95,.32];region.font=18;}
      if(i===(initial?6:7)){region.slot=region.block.fa.startsWith('ورودی')?[.23,.463,.302,.521]:[.306,.463,.39,.521];region.font=14;region.align='center';}
      if(i===(initial?11:17)){region.slot=[.68,.44,.755,.50];region.font=14;region.align='center';}
      if(i===(initial?13:19)){region.slot=[.54,.36,.615,.42];region.font=14;region.align='center';}
      if(i===(initial?15:21)){region.slot=[.54,.85,.62,.91];region.font=14;region.align='center';}
    }
  }
  return {reason: null, regions, layout, figureLabels: record.image_text || [], tables:record.tables || [], nativeMath:record.blocks.filter(block=>block.kind!=='not_visible'&&block.latex&&(!persian.test(block.fa||'')||block.source_fragments))};
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
    if (region.align) node.style.textAlign = region.align;
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
