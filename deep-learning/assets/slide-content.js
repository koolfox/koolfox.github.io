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
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===2
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='a9a67f6e81b05125d6e74f2676bd4180b7f015dabc06ab3ea8cdda2167c89c35'
      && layout.translation_sha256==='8021c46a51bbfdec84e87b6a29ea2b2323c7859b15c2fb16a2fd668018ad5c3c'){
    const vertical=[[.105,.215],[.27,.335],[.335,.395],[.395,.455],[.455,.515],[.515,.575],[.63,.695],[.695,.765],[.82,.89]];
    for(const region of regions){const index=region.block.source_lines[0];const [top,bottom]=vertical[index];const nested=[2,3,4,5,7].includes(index);region.slot=[.05,top,nested?.88:.94,bottom];}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===6
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='f6f11ea7d4965b4c5f5be9dd187202f219133da7b01eba95d2dd2d0728688852' && layout.translation_sha256==='6fdb505d07abe92a5427eb56f908bd21e4797304c7c8a3eb1ab74a9b51e4335a'){
    const slots={2:[.03,.705,.48,.83],5:[.03,.84,.48,.99],8:[.52,.705,.98,.83],11:[.52,.84,.98,.99]};
    for(const region of regions){
      const index=region.block.source_lines[0],slot=slots[index];if(slot)region.slot=slot;
      if(index===5)region.manualAccents=[{text:'نوبل ۱۹۰۶',color:'#ffc000'},{text:'سلول‌های مستقل',color:'#ffc000'},{text:'نورون',color:'#ffc000'}];
      if(index===11)region.manualAccents=[{text:'نوبل ۱۹۳۲',color:'#ffc000'},{text:'شلیک همه یا هیچ',color:'#ffc000'}];
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===7
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='8b11b7ea0307482bb13cc03c5b7201a3c374838a70d1ac3a6bce4fd2a317aeff' && layout.translation_sha256==='c64a405889f4db34be38c012aa0c56ec2a54d92f544e18db46329bab89fd65a9'){
    const slots={3:[.03,.84,.48,.99],11:[.52,.84,.98,.99],14:[.67,.29,.98,.48],17:[.67,.70,.98,.78]};
    for(const region of regions){const slot=slots[region.block.source_lines[0]];if(slot)region.slot=slot;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===8
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='5fe7e43e304598fdd8f19b618a43e0e1e164b9d0aa28408b08f2d2dc1d9a3b09' && layout.translation_sha256==='0592cd3f463c9fffbb0c43f8f1f34bc51ee798dbaf13dba6001a4ad624114acc'){
    for(const region of regions)if(region.block.source_lines[0]===1){region.slot=[.18,.92,.85,.98];region.linkTarget='https://youtu.be/oa6rvUJlg7o?t=8';}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===10
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='7486dbcc6c89a18b80591440d4c6acf94edabab3efdecaaad11b904f69b2a9b4' && layout.translation_sha256==='1e1d291d37c2faeccac097bf350eeed7b379cada1f3acb912a297f0702d4a2cb'){
    for(const region of regions){
      if(region.block.source_lines[0]===0)region.slot=[.07,.66,.32,.83];
      if(region.block.source_lines[0]===3){region.slot=[.02,.83,.98,.99];region.color='#ffffff';region.manualAccents=[{text:'هدف طراحی، ساخت و ارزیابی مدلی الکترونیکی از مغز',color:'#ffc000'},{text:'توانایی «یادگیری» پاسخ‌ها',color:'#ffc000'}];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===11
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='c28695f15f907b74514e7097378eee67bd4f5348f708379d1fc7c34bda60b7da' && layout.translation_sha256==='602dc6300ea0f23c85f10559af2dbe2117ee5205a7337475e5a59668c4ce883e'){
    for(const region of regions){
      const index=region.block.source_lines[0];
      if(index===2){region.color='#ffffff';region.manualAccents=[{text:'مدل نورون زیستی',color:'#ffc000'}];}
      if(index===3){region.color='#ffffff';region.manualAccents=[{text:'رایانه دیجیتال',color:'#ffc000'}];}
      if(index===4){region.color='#ffffff';region.manualAccents=[{text:'الگوی یادگیری «نورون‌هایی که با هم شلیک می‌کنند، به هم متصل می‌شوند»',color:'#ffc000'}];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===12
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='6e968bc91ce539b3b39add82476a1d1c322f309b89c4935a38b35664df816d29' && layout.translation_sha256==='009b78724b243d94b5ab68dbfeed18e95dba6d557e73e95f68e2d4053349a2d9'){
    const slots={1:[.01,.70,.22,.88],4:[.01,.35,.22,.55],8:[.41,.25,.99,.36],9:[.46,.36,.98,.445],11:[.42,.445,.98,.55],13:[.44,.88,.95,.96]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];
      if(i===8){region.color='#ffffff';region.manualAccents=[{text:'منطق گزاره‌ای (Propositional Logic)',color:'#ffc000'}];}
      if(i===9){region.color='#ffffff';region.manualAccents=[{text:'درستی یا نادرستی',color:'#ffc000'}];}
      if(i===13){region.linkTarget='https://sites.millersville.edu/bikenaga/math-proof/truth-tables/truth-tables.html';region.clearRect=[.43,.875,.96,.965];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===13
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='faa6a39540825108d5432a3596d6c0183876b5d0a738af123515a321bb2f6e78' && layout.translation_sha256==='8c67e64b1346eab6b97439d0e32bf4ff76247c21651f86779de203bfe39c305b'){
    const slots={1:[.04,.27,.97,.59],8:[.04,.60,.97,.68],9:[.04,.70,.97,.75],10:[.04,.75,.97,.81],11:[.04,.81,.97,.86],12:[.04,.86,.97,.92]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];if(i>=9&&i<=12)region.font=17;
      if(i===1){region.color='#ffffff';region.manualAccents=[{text:'شناخت ما از جهان',color:'#ffff00'},{text:'ناقص',color:'#ffff00'},{text:'این ناآگاهی',color:'#00ff00'},{text:'شناخت ما را سودمند می‌کند',color:'#00ff00'},{text:'نقش مغزها',color:'#ffc000'},{text:'هر ایده و هر احساس با فعالیت درون آن شبکه تحقق می‌یابد',color:'#ffc000'},{text:'با تعیین شبکه',color:'#00ffff'}];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===14
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='ea0f2d1cf3fad3cd038d3957f552026ffabc0e2fbb8bf8bd40489a59303ef502' && layout.translation_sha256==='7d886c174bd767e23c090809dcc48504459e92778f7e7584a54cdfccb483f642'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===1){region.slot=[.04,.25,.97,.39];region.color='#ffffff';region.manualAccents=[{text:'جست‌وجوی فراگیر (Brute-force Search)',color:'#ffc000'},{text:'حافظهٔ رایانه‌ها محدود است',color:'#ffc000'}];}
      if(i===3){region.slot=[.04,.83,.97,.98];region.color='#ffffff';region.manualAccents=[{text:'یادگیری',color:'#ffc000'},{text:'لازم است',color:'#ffc000'}];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===15
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='dffe4bb69b14983d8729a87dcc3356ef967552dc549aa166f1c1bfe9ad3f68f7' && layout.translation_sha256==='8a3fde567b9ac95202ded0de51a25cfbcd5e23965740b83d9cf122a200a1271c'){
    for(const region of regions){const i=region.block.source_lines[0];if(i===1)region.slot=[.81,.69,.995,.90];if(i===5){region.slot=[.005,.66,.195,.97];region.clearRect=[.01,.69,.19,.775];region.maskSourceLines=[5];}}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===16
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='92ebeaf9627cb289ee35656e664ee26cb08116aee10cf6caba64d756550fe2eb' && layout.translation_sha256==='cc4713164bfa8349043915897ccb8ec32e82e1a1ccabc2f67844891374a24283'){
    const slots={1:[.04,.25,.65,.36],2:[.04,.41,.33,.50],3:[.06,.62,.22,.70],4:[.07,.76,.255,.83],5:[.61,.81,.98,.99],9:[.02,.86,.59,.98]};
    for(const region of regions){const slot=slots[region.block.source_lines[0]];if(slot)region.slot=slot;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===17
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='957326fb8e021185076aa7cdfc672eb0e219a8358f2f462e66729c67a3fb6f93' && layout.translation_sha256==='855ae707b0584e527671e5e504d8b085d8b0fa5992a3783d17d0e290bdcb4890'){
    const slots={1:[.04,.21,.96,.315],3:[.75,.55,.99,.72],5:[.42,.90,.53,.96],6:[.20,.66,.33,.70],7:[.01,.81,.245,.97]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];if(i===6)region.rotate=-90;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===19
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='7a6eb9e84aafb5aef3adefcb2ce8d3b9308b736058d2b8c61b7059adc048a3c9' && layout.translation_sha256==='739c7d7bdf533b8fab1b8780e1f731872d20840c7f4a2c197488f822c3618b27'){
    const slots={1:[.04,.25,.97,.39],4:[.65,.49,.99,.60],6:[.01,.78,.31,.89],8:[.65,.78,.99,.89],10:[.10,.48,.31,.60]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];
      if(i===0){region.slot=[.04,.08,.98,.22];region.font=30;}
      if(i===4){region.clearRect=[.65,.54,.82,.585];region.maskSourceLines=[5];}
      if(i===8){region.clearRect=[.65,.83,.82,.875];region.maskSourceLines=[9];}
    }
  }
  const trueModelHashes={21:'c48301a8ad99eca5186b14425af66eae4664d89dcc66bb138fde66dff66e1fef',22:'cdaaabdb69ab67ec3fa90cd594e9ea0ecf7bc1ab6169d6a2a250bdc628219b2b',23:'ebad0c094a2f23f2a4916525c4a293960da79f3605b3baf37f8987ba17e6ba2d',24:'73e30984b49d1a8c3440eb5bc13074f72e5e84f4321a84add2e5a51ab5c07492'};
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02'
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && trueModelHashes[record.number]===layout.translation_sha256){
    for(const region of regions){
      const i=region.block.source_lines[0];
      if(i===0)region.slot=[.04,.08,.96,.22];
      if(i===1)region.slot=[.04,.245,.96,.344];
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===26
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='aa6ce1e48e27e1a092afb455c357e4fba3a684b194ca8aa5cb39533fd1cffa24'
      && layout.translation_sha256==='6fb6bafe437481e5e7f43e35f7f28261d420c2b0ceb667b54b0f970855991eff'){
    const slots={0:[.04,.08,.98,.22],1:[.04,.25,.34,.35],10:[.49,.70,.97,.81]};
    for(const region of regions){const slot=slots[region.block.source_lines[0]];if(slot)region.slot=slot;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===20
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='51c21430a260eb3982d4b11ea5fcfc837b9ed629e162530c6ff066409c6ddd41'
      && layout.translation_sha256==='0fcc873299a8b3ef5a503d6a0d437d35fe96550ec333ef0878b373032f1763a6'){
    const slots={0:[.04,.08,.96,.22],1:[.04,.24,.96,.40],3:[.04,.435,.96,.51],4:[.06,.50,.45,.56],5:[.08,.56,.60,.645],6:[.08,.66,.45,.74],7:[.04,.85,.96,.96],9:[.58,.765,.97,.845],11:[.68,.56,.98,.615],12:[.68,.615,.98,.68]};
    for(const region of regions){const i=region.block.source_lines[0],slot=slots[i];if(slot)region.slot=slot;if(i===0)region.font=30;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===25
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='2cad152c61a38d12e6a4731bef915519043cc4e3cfcc15ff0e08aac823119df6'
      && layout.translation_sha256==='0a45a25468bb6b08768378a96044c9dbc4599960838355c81976d0875f9a961f'){
    const slots={0:[.04,.08,.98,.22],1:[.04,.25,.96,.34],6:[.15,.66,.39,.735],7:[.15,.735,.39,.805],8:[.40,.68,.94,.80]};
    for(const region of regions){const slot=slots[region.block.source_lines[0]];if(slot)region.slot=slot;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===27
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='acdf48d99db30f58775e656099087d394641548e5b00a128e1af063e75f83247'
      && layout.translation_sha256==='9bc9115d0ab30854d4e4084d27a311f64320bd01d4e03af5bc0e7e255ca7db85'){
    const slots={0:[.04,.08,.98,.22],10:[.04,.25,.34,.35],6:[.08,.57,.75,.65]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];
      if(i===10){region.maskSourceLines=[10];region.clearRect=[.07,.26,.34,.35];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===28
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='8b2400cf470e8ddd46a4c7b622788970f16fa12104f0f5d919f6b742f5f2ddee'
      && layout.translation_sha256==='01c51cd7619d52d70bc95726a8d1bac585302a49e14b036d9b7301333963c5ec'){
    const slots={0:[.04,.08,.98,.22],1:[.04,.25,.96,.34],6:[.15,.66,.39,.735],7:[.15,.735,.39,.805],8:[.40,.68,.94,.80]};
    for(const region of regions){const slot=slots[region.block.source_lines[0]];if(slot)region.slot=slot;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===29
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='a98650e960cb99d33876a8b47dbdbcd4f036bb396a70b5c47bbb4638691f3bbb'
      && layout.translation_sha256==='72ea1f34e14e0d5e0f1764182870a813e4c49053a8f95fe13db2e9852f6365d8'){
    const slots={0:[.04,.08,.98,.22],10:[.04,.25,.34,.35],6:[.49,.70,.97,.81]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];
      if(i===10){region.maskSourceLines=[10];region.clearRect=[.07,.26,.34,.35];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===30
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='022d53bce28d324c6003bccb7c1d4bb189d4a44047d9d5a65b1f914dfe85a12b'
      && layout.translation_sha256==='aa4f0e1afc51c19ae099aecc2e8b3efe725eee2675e01368b92a98d4384ddbf7'){
    const slots={0:[.04,.08,.98,.22],11:[.04,.25,.34,.35]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];
      if(i===11){region.maskSourceLines=[11];region.clearRect=[.07,.26,.34,.35];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===31
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='02884c1541d33e758c5508a19464f4d15eca023a013c72b9d8e76548382d6027'
      && layout.translation_sha256==='d2cb7c50a32bc371683718b397e66b8aaf65fab42dd3069609ded194d639137b'){
    const slots={7:[.04,.08,.98,.22],0:[.02,.36,.39,.43],1:[.02,.43,.39,.49],2:[.02,.49,.39,.55],3:[.02,.57,.39,.69],5:[.02,.72,.39,.85]};
    for(const region of regions){const slot=slots[region.block.source_lines[0]];if(slot)region.slot=slot;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===32
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='9ac38f48004dd5998ff5642f5f2b907bf68b527e395b4d2cd601732be8f46391'
      && layout.translation_sha256==='a4ed8d63e91a107628de575e57c212f5a5a33a1e9d4db8f187a2963ad823b4b0'){
    const slots={0:[.04,.08,.98,.22],1:[.04,.25,.96,.35]};
    for(const region of regions){const slot=slots[region.block.source_lines[0]];if(slot)region.slot=slot;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===33
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='abbf1196293ace9df43ff5f4fadfee253d93a8a02858f87764455c621f7ecf55'
      && layout.translation_sha256==='ff4ee8fda132c7b0b2f51836127342a052b976e6416e1d99d7027cb99e393447'){
    const slots={3:[.02,.08,.98,.22],0:[.02,.77,.49,.92],2:[.02,.92,.49,.98],4:[.51,.77,.98,.92],6:[.51,.92,.98,.98]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];if(i===3)region.font=30;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===34
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='fcc1d6b4edf7711202471af906a40b0be01dfda1b1baa2799ecd1291d20dbfa0'
      && layout.translation_sha256==='37ce1ca44d4e76666350e1dcb01ae255d95f4a4ac56784e040570b2524615ab6'){
    for(const region of regions){const i=region.block.source_lines[0];if(i===0)region.slot=[.04,.08,.98,.22];
      if(i===1){region.slot=[.04,.34,.96,.80];region.color='#ffffff';region.manualAccents=[{text:'بررسی ساختارهای فیزیکی و اصول عصب‌پویایی مربوط است که زیربنای «هوش طبیعی» هستند',color:'#ffc000'},{text:'پرسپترون پیش از هر چیز مدلی از مغز است',color:'#ffc000'},{text:'ما را قادر می‌کند شرایط فیزیکی پدیدآمدن ویژگی‌های روان‌شناختی گوناگون را تعیین کنیم',color:'#ffc000'}];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===35
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='b97544e601ee854e01a65de63b54c46ee0f8c7fc81079f10ff3cacfc0deac74c'
      && layout.translation_sha256==='6f53076044bd69876adf8945c164ec851f3cd4d80b3753298629c8fa42e6a135'){
    const slots={0:[.03,.055,.46,.25],2:[.03,.49,.46,.57]};
    for(const region of regions){const slot=slots[region.block.source_lines[0]];if(slot)region.slot=slot;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===37
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='7d0e1385360f7dbc13695b23d3722c295f594c2d58bbcfb6e870b16af434ba2f'
      && layout.translation_sha256==='4c1a7dffa343cba0179f7907ed76acfe77d9d10064aa453b56b67c8a3a09648c'){
    const slots={0:[.03,.08,.98,.22],1:[.015,.22,.65,.59],10:[.015,.59,.65,.64],11:[.015,.65,.65,.93],18:[.015,.94,.65,.99],20:[.67,.23,.99,.29]};
    for(const region of regions){const slot=slots[region.block.source_lines[0]];if(slot)region.slot=slot;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===39
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='58ccbab42c7bec48abd230b06de28b7663667df2e405bd517c6e4c264bc98409'
      && layout.translation_sha256==='be5c1cf4406e7af1b3e06a72456861d8323ce8aa906f6c4229680a8638e0812b'){
    const slots={0:[.04,.08,.62,.22],1:[.01,.76,.42,.96],6:[.42,.76,.64,.95]};
    for(const region of regions){const slot=slots[region.block.source_lines[0]];if(slot)region.slot=slot;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===40
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='36ef0d5b06b6c4f913e02a68df8f5a061ecfc722b4d6e1282cb3a203001ae49e'
      && layout.translation_sha256==='c314f1b7bdb45070943cb84e7a4fee6436f6791dff08f2e0e93decd6972b5ffb'){
    const slots={0:[.04,.08,.98,.22],4:[.05,.39,.96,.53],1:[.05,.56,.96,.74]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];
      if(i===1){region.color='#ffffff';region.manualAccents=[{text:'در انواع الگوهایی که پرسپترون‌ها (Perceptrons) می‌توانند بازشناسی‌شان را یاد بگیرند، محدودیت‌های بنیادی وجود دارد',color:'#ffc000'}];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===41
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='13b7e29ff24fef2edffe12ce54d7ba54d434537a541d7ecd319cc34d5c7f9310'
      && layout.translation_sha256==='7d86687217d44e6c57ae1c5f758c5fc8e065fdaa7760b23d48e84f42297e5533'){
    const slots={0:[.04,.08,.98,.22],1:[.05,.28,.96,.84],12:[.05,.85,.96,.93]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];
      if(i===1){region.color='#ffffff';region.manualAccents=[{text:'نتیجه‌ها… عموما ناامیدکننده بودند',color:'#ffc000'},{text:'احساس اجبار درمانگرانه',color:'#ffc000'},{text:'زدودن آنچه می‌ترسیدیم نخستین سایه‌های یک سوءبرداشت «کل‌گرایانه» یا «گشتالتی» باشد',color:'#ffc000'}];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===42
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='7b67d25d5a025f811ae28c89eed9c6fe23421b58264486f7df049dd79e681305'
      && layout.translation_sha256==='7d15ad0b75141351b0aeda9277c9c4457bc4eeaab2deadc8035af1da826fac21'){
    const slots={0:[.04,.08,.98,.22],1:[.04,.25,.96,.35],2:[.04,.79,.96,.95]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];
      if(i===1){region.color='#ffffff';region.manualAccents=[{text:'پرسپترون‌های تعمیم‌پذیر کارآمد',color:'#ffc000'}];}
      if(i===2){region.color='#ffffff';region.manualAccents=[{text:'ناتمام',color:'#ffc000'}];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===43
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='2cdfc2a4514b5e955bea58af1c5a6da21a72c5c6d76475de75eded3f64e4f934'
      && layout.translation_sha256==='37d1242650e42e2d5580841f102e49aff792cbbcea71f8ed9ae12f6ee12a5b98'){
    const slots={0:[.03,.08,.98,.22],1:[.03,.46,.54,.52],2:[.03,.52,.54,.58],3:[.03,.58,.54,.63],4:[.03,.63,.54,.70],5:[.03,.70,.54,.76]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];if(i===0)region.font=30;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===44
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='b2d62cf2778b077bbf87a91d6df2ecdc732366dcec06c0a8628478c527037999'
      && layout.translation_sha256==='ac4805593a58eb2babc1cd7686cf63262fe622fc5075ccc4333b5b0d743c1303'){
    const slots={0:[.03,.08,.98,.22],10:[.10,.82,.90,.96]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];if(i===0)region.font=30;
      if(i===10){region.color='#ffffff';region.manualAccents=[{text:'داوطلب',color:'#ffc000'},{text:'خطی',color:'#ffc000'}];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===45
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='e6a1cd42063ff8e2a9ffe805d8a0f434201629bdeeb295ef73342265b0b7581a'
      && layout.translation_sha256==='737a35d48062886ce511122b9efb8fb34dd7581f7ef3f94febda006712b9adae'){
    for(const region of regions){if(region.block.source_lines[0]===0){region.slot=[.02,.44,.39,.66];region.color='#ffffff';region.manualAccents=[{text:'با پرسپترون تک‌لایه (Single Layer Perceptron) ناممکن است',color:'#ffc000'}];}}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===46
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='b9e9c21f5700b8a6d2e7fdf31710ec221de393d1cee4c86946448ddd4775180a'
      && layout.translation_sha256==='afb5a857c524c95f3866442444819836b5fbcf265bfdcf8e02d99a849df75ef2'){
    const slots={0:[.03,.08,.98,.22],1:[.53,.41,.97,.53],2:[.53,.57,.97,.72]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];if(i===0)region.font=29;
      if(i===1){region.color='#ffffff';region.manualAccents=[{text:'نهادهای تامین مالی',color:'#ffc000'}];}
      if(i===2){region.color='#ffffff';region.manualAccents=[{text:'پژوهشگران',color:'#ffc000'}];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===47
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='8586d2b7414ae644105a506666c4d782224c365e4bea2579025183b27a61f57a'
      && layout.translation_sha256==='4418015150cde8d38a3e78696587ace7bfe650f21d394c40cd1174a145e305b2'){
    for(const region of regions){const i=region.block.source_lines[0];if(i===0)region.slot=[.04,.08,.63,.22];
      if(i===1){region.slot=[.03,.28,.64,.87];region.color='#ffffff';region.manualAccents=[{text:'پیشرفت به‌سبب نبود نظریه‌های بنیادی کافی، از پیش عملا متوقف شده بود',color:'#ffc000'},{text:'درس‌های این کتاب به حوزه نیروی تازه دادند',color:'#ffc000'},{text:'هیچ‌کس نتوانسته بود توضیح دهد چرا آن‌ها می‌توانستند بازشناسی بعضی انواع الگوها را یاد بگیرند و بعضی دیگر را نه',color:'#ffc000'}];}
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
    if(region.clearRect){const [l,t,r,b]=region.clearRect,mask=element('div');Object.assign(mask.style,{position:'absolute',left:l*width+'px',top:t*height+'px',width:(r-l)*width+'px',height:(b-t)*height+'px',background:'#000'});stage.append(mask);}
    const node = element('div', 'reader-slide-text');
    const presentation={...region.block.presentation};
    if(region.lines.every(line=>Array.isArray(line.accents)))presentation.accents=region.lines.flatMap(line=>line.accents);
    if(region.manualAccents)presentation.accents=region.manualAccents;
    const [x0, y0, x1, y1] = region.slot || region.rect;
    Object.assign(node.style, {left: x0 * width + 'px', top: y0 * height + 'px',
      width: (x1 - x0) * width + 'px', height: (y1 - y0) * height + 'px',
      fontSize: region.font / plan.layout.width * width + 'px', color: region.color});
    node.dataset.sourceLines = region.block.source_lines.join(',');
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
    }else if(region.linkTarget){const link=element('a');link.href=region.linkTarget;link.target='_blank';link.rel='noopener noreferrer';link.textContent=region.block.fa;link.style.color='inherit';node.append(link);}
    else addText(node, region.block.fa, presentation, {sourceColors:true});
    if(region.rotate)node.style.transform=`rotate(${region.rotate}deg)`;
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
