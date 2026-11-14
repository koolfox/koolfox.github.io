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
  const tokens = /\{h, e, l, o\}|https?:\/\/[^\s<>"\u0600-\u06ff]+|[A-Za-z][A-Za-z0-9_]*\([^\u0600-\u06ff()\n]*\)|\([^\u0600-\u06ff()\n]*\)|(?:[+−-](?=\d))?[A-Za-z0-9α-ωΑ-Ω∂∇Σ∑√σŷ][A-Za-z0-9α-ωΑ-Ω∂∇Σ∑√σŷ₀-₉⁰-⁹_+−=<>≤≥×*/.,:;\[\]{}^% \t\-]*/g;
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
  if (sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && record.number===6
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='3386702c731ad98f8b816ce00160f295c2713499941019417261d4020201dbbb'
      && layout.translation_sha256==='c68ddf9f4a181164afdf448ddc2981ba5f17322effecac800c00cc6013fd06f8') {
    const memory=regions.find(region=>region.block.source_lines[0]===3);
    if(memory)memory.manualAccents=[{text:'حافظه',color:'#ffc000'}];
    const example=regions.find(region=>region.block.source_lines[0]===2);
    if(example){example.slot=[.04,.48,.245,.56];example.font=17;}
  }
  if (sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && record.number===7
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='6e99def376ea4f393f4b9e30d6260f35808a7a1a336623a1254f23154d96d983'
      && layout.translation_sha256==='ac6d3fdb6b8a800ad6218d37774d33b7eeee145c5bbf42716ee2dbe1ae12f12b'){
    const accents={1:['شبکه‌های پیش‌خور','مناسب نیستند'],2:['حافظه ندارند'],3:['اندازه ورودی ثابت است']};
    for(const region of regions){const i=region.block.source_lines[0];if(accents[i])region.manualAccents=accents[i].map(text=>({text,color:'#ffc000'}));}
  }
  if (sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && record.number===9
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='410c138d3bae03bbf04cea0268a0aad126b7765878a047dd5b13214742fdeae4'
      && layout.translation_sha256==='df4ec58ba8dc796caefe7a9721857e9837a6c03eff4be4cab1b4997f4b2f6ba1') {
    for (const region of regions) {const i=region.block.source_lines[0];if(i>=2 && i<=13){const group=Math.floor((i-2)/4),row=(i-2)%4,columns=[[.04,.29],[.66,.97],[.34,.63]],[left,right]=columns[group],top=.335+row*.044;region.slot=[left,top,right,top+.042];region.font=row===0?17:16;}else if(i===14){region.slot=[.025,.837,.29,.96];region.font=14;}else if(i===17){region.slot=[.335,.877,.62,.93];region.font=14;}}
  }
  if (sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && record.number===2
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='8611e0e0ce4fdd5e231bf198538073ee93da99da61d59cf90c61f2cc30d5f819'
      && layout.translation_sha256==='dce6d92f50da1911ffb44c1d8493253c52cad650ba8888b17345ead51b4c0d8e') {
    for(const region of regions){
      const i=region.block.source_lines[0];
      if(i>=2&&i<=5)region.slot=[.04,region.slot[1],.96,region.slot[3]];
    }
  }
  if (sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && record.number===11
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='5858cd7d5cdaa9c344a3c7883001961c4abed3c9aefd0f631d1389d58913418f'
      && layout.translation_sha256==='b5962b5278e15cfe4918f22414e36990c123168673bc6551916218cdd720404f') {
    const slots={0:[.04,.08,.97,.24],1:[.04,.27,.63,.40],3:[.04,.45,.63,.55],4:[.04,.59,.63,.71],6:[.04,.77,.63,.89]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i]){region.slot=slots[i];region.font=i===0?32:20;}if(i===1){region.color='#ffffff';region.manualAccents=[{text:'اتصال بازگشتی',color:'#ffc000'}];}}
  }
  // Reviewed placements for the four consecutive gradient-descent diagrams.
  if (sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && record.number===26
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='9d5930cab1aa34127bf92484723905d0ccaab9703e996e0f2c2410b807039b63'
      && layout.translation_sha256==='f9040e8b5708c91c9f829727fd824b0dcc115e39ac633f4e0053f57f82cd3186') {
    for (const region of regions) {
      const index=region.block.source_lines[0];
      if(index===1){region.slot=[.05,.23,.97,.31];region.font=19;region.manualAccents=[{text:'tanh',color:'#ffc000'}];}
      if(index===2){region.slot=[.08,.31,.97,.39];region.font=19;}
    }
  }
  // Keep the longer Persian caption above the unrolled RNN figure.
  const s04CaptionReview = {
    19:['a001823222275e73cf0a5b3ccab0df575dc507fde195f7bffcee0a23d5b103ae','af9b1f02985b90f015d4474fa5ccc464703ce6099c79b17c50a38349e7e1a03e'],
    16:['5605488fd9bd2cd7352a205b14ac64ecf37b6827dec615023844f0810851e872','d72366e8f7c87c51feef6a199f079b060b27b4b77ec0910d047d37d2db209516'],
    24:['8e4ae230d6a1eae89defb6b041d9c3860127b7f38380d1d360d577098648f14d','73d324917f54b73ee472be6f6b769acba976a0e836d67d1f6b0c173a08e992cf'],
    25:['8e4ae230d6a1eae89defb6b041d9c3860127b7f38380d1d360d577098648f14d','73d324917f54b73ee472be6f6b769acba976a0e836d67d1f6b0c173a08e992cf'],
  }[record.number];
  if (s04CaptionReview && sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04'
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256===s04CaptionReview[0] && layout.translation_sha256===s04CaptionReview[1]) {
    for (const region of regions) if (region.block.fa.startsWith('• ')) {
      region.slot=[.05,.23,.97,.34]; region.font=record.number===19?21:23;
    }
  }
  // Both hashes bind these coordinates to the exact source text and translation.
  const reviewed = {
    37:['d8ac0d1ace97fed0c17091f911cb8d2b26f1ddc62a551f6be92047e8a3184e24','90782fd9416c5c4565dd6e88bca2df9da9d79f3e85afd86558766e777f434fd3'],
    38:['7bbb9f55c321ca229bfe0670ccaf7df2b99f03f22a8aeb6ceea5f06aeeaa409f','72090fadccdd88565e6df4005d2dbffbec5efa356eeafacfebc73c463db4eb05'],
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
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && [2,3,27,86].includes(record.number)
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
      && layout.translation_sha256==='8a812ba33427b7a64f9a70cfb39e934667f8d7fa5dc928e6b5f7f2e32e869735'){
    for(const region of regions){
      const index=region.block.source_lines[0];
      if(index>0){region.align='center';region.slot=[.06,.43+(index-1)*.09,.94,.52+(index-1)*.09];}
      if(index===3)region.manualAccents=[{text:'یا',color:'#ffffff'}];
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===13
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='a446f994291fe2033fe08f7ebffd845639d0ba5a4f14fe5ea71abc743c0feebf'
      && layout.translation_sha256==='9455399902fc938b9d50640862240352d9ebaced1420106dcdd28252ed80a332'){
    for(const region of regions)if(region.block.kind==='heading'){
      region.slot=[.04,.09,.96,.205];region.font=33;region.keepTermsTogether=true;
    }
  }
  const s01TitleReview={
    14:['766169dcca47dd0f8949d0481e883b01b40ea73afd686cc4c7f6f2a7de71e6eb','250e9b89f3d5dbbd37838e4d7e9ff2f2691e3360993d6079c3abf4ae29b94a3f',[.04,.09,.96,.205],30],
    19:['a2e55bbba08b55ea9c01ab2d28267bedaf666acd16d3f971a809ca68b67fde8b','cd36588eda1926328aa1293054ac487b75906335b99c8c78ede6b202899e448c',[.02,.10,.40,.22],26],
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
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===39
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='21f0e8cd989bb18d4ef7a8388ec73b00de7fafd0103bda05b8acf4c256eee569'
      && layout.translation_sha256==='399257a7e6d9504e8fd7b4d077c2a5cfb43c0540943bb95075b3965cd6ca6764'){
    for(const region of regions){
      if(region.block.kind==='heading'){region.slot=[.04,.10,.96,.22];region.font=31;region.keepTermsTogether=true;}
      if(region.block.source_lines[0]===1){region.slot=[.07,.29,.96,.37];region.font=21;region.manualAccents=[{text:'داده را انتخاب کنید',color:'#ffc000'}];}
      if(region.block.source_lines[0]===3 && ['مودار','بی‌مو'].includes(region.block.fa)){region.slot=[region.rect[0]-.005,.719,region.rect[2]+.005,.768];region.font=16;region.align='center';}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===40
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='7f793820f417d38fab16ffb8114d6fc8847387a90602edb55117f3e2e4fabc30'
      && layout.translation_sha256==='fab59128a31413698f8b2919bd0ff5f06fa245a7b2be7252aab1323315581ee1'){
    for(const region of regions){
      const index=region.block.source_lines[0];
      if(region.block.kind==='heading'){region.slot=[.04,.10,.96,.22];region.font=31;region.keepTermsTogether=true;}
      if(index===4){region.slot=[.07,.29,.96,.37];region.font=21;region.manualAccents=[{text:'تقسیم کنید',color:'#ffc000'}];}
      if(index===1){region.slot=[region.rect[0]-.01,.398,region.rect[2]+.01,.447];region.font=16;region.align='center';}
      if(index===3 && ['مودار','بی‌مو'].includes(region.block.fa)){region.slot=[region.rect[0]-.005,.719,region.rect[2]+.005,.768];region.font=16;region.align='center';}
      if(index===3 && region.block.fa==='برچسب:'){region.slot=[.085,.719,.17,.768];region.font=14;}
    }
  }
  const s01TrainingReview={
    41:['a5bb65667c1620f728c5c6092307cd4a32a64444907fab33e8f14b122723944c','c6303118221d2c91a1ab58c269359839ea8d8b52c7150a0d58218bbf034a63d0'],
    42:['680a1d770209b136648e4d79c698ca9c2a7dc9a62a6f34a269c70755d748e39d','c1cfbec6c3cd396112dfd4f6e6ddcc9d3166b801709dd8194bf1983e6fea3ce9'],
    43:['fae88c0963edb328116d7b7203e91d93ec9f4d7b9f7d1bde7b5280906aa917aa','f5785db850f45ec5a0711720d577c549790383046a7066714fd6bcc3b2bdb346'],
  }[record.number];
  if(s01TrainingReview && sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01'
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256===s01TrainingReview[0] && layout.translation_sha256===s01TrainingReview[1]){
    for(const region of regions){
      const index=region.block.source_lines[0];
      if(region.block.kind==='heading'){region.slot=[.04,.10,.96,.22];region.font=31;region.keepTermsTogether=true;}
      if((record.number===41&&index===4)||(record.number!==41&&index===1)){
        region.slot=[.07,.295,.96,.40];region.font=19;
        region.manualAccents=[{text:record.number===41?'مدل را برای کمینه‌کردن خطای پیش‌بینی آموزش دهید':'خطای تعمیم (Generalization Error) را اندازه بگیرید',color:'#ffc000'}];
      }
      if((record.number===41&&index===1)||(record.number!==41&&index===3)){region.slot=[region.rect[0]-.015,.398,region.rect[2]+.015,.447];region.font=16;region.align='center';}
      if(record.number===41&&index===3 && ['مودار','بی‌مو'].includes(region.block.fa)){region.slot=[region.rect[0]-.005,.719,region.rect[2]+.005,.768];region.font=16;region.align='center';}
      if(record.number===41&&index===3 && region.block.fa==='برچسب:'){region.slot=[.085,.719,.17,.768];region.font=14;}
      if(record.number===43&&index===4){region.slot=[.69,.719,.79,.768];region.font=16;region.align='center';}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===44
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='113f6c87814d610d9d9b3b61a3f73db25daef0742b113d2bd17ecc4ce01b9460'
      && layout.translation_sha256==='2c2213349e74d874745d1d70804ecb86673fecc4fe6a6825c56ac1cd55a649cc'){
    const slots={1:[.49,.33,.83,.43],4:[.51,.49,.81,.61],7:[.53,.69,.79,.815],10:[.59,.85,.73,.94],12:[.25,.33,.40,.43],14:[.075,.435,.23,.55],16:[.01,.33,.20,.43]};
    for(const region of regions){
      const index=region.block.source_lines[0];
      if(region.block.kind==='heading'){region.slot=[.04,.10,.96,.22];region.font=30;region.keepTermsTogether=true;}
      if(slots[index]){region.slot=slots[index];region.font=[4,7].includes(index)?14:index===10?13:14;region.align='center';region.keepTermsTogether=true;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===45
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='3d9aaca8c08f5f9b04fe5e7bc92c86bb2900592d2114d717cd65d8ac63dd7a76'
      && layout.translation_sha256==='ea21d9d41268276de0013485c38c104146467deedc70b6fa5e80eca72499a4ad'){
    for(const region of regions){
      const index=region.block.source_lines[0], text=region.block.fa;
      if(index===2){region.slot=text.startsWith('استخراج')?[.26,.40,.48,.47]:[.55,.40,.70,.47];region.font=12;region.align='center';}
      if(index===3){region.slot=[.34,.255,.64,.31];region.font=16;region.align='center';}
      if(index===4){region.slot=[.82,.45,.91,.51];region.font=16;region.align='center';}
      if(index===5){region.slot=text.startsWith('ورودی')?[.075,.33,.18,.385]:text.startsWith('خروجی')?[.79,.33,.92,.385]:[.27,.33,.74,.385];region.font=14;region.align='center';}
      if(index===6){region.slot=[.20,.74,.77,.82];region.font=19;}
      if(index===7){region.slot=[.20,.84,.86,.91];region.font=14;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===46
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='af1b02a052e6b8bbbe94af7bf001510d5f2459b3b04b7324ef3fa97a27dcb19c'
      && layout.translation_sha256==='cafa77592cb133b0ec9dfc18a9e5c8b92b9386fc532e04af94123aa47a5bb3ad'){
    for(const region of regions){
      const index=region.block.source_lines[0], text=region.block.fa;
      if(index===2){region.slot=text.startsWith('استخراج')?[.26,.40,.48,.47]:[.55,.40,.70,.47];region.font=12;region.align='center';}
      if(index===3){region.slot=[.34,.255,.64,.31];region.font=16;region.align='center';}
      if(index===4){region.slot=[.82,.45,.91,.51];region.font=16;region.align='center';}
      if(index===6){region.slot=text.startsWith('ورودی')?[.075,.33,.18,.385]:text.startsWith('خروجی')?[.79,.33,.92,.385]:[.27,.33,.74,.385];region.font=14;region.align='center';}
      if(index===5){region.slot=[.21,.74,.78,.82];region.font=21;region.align='center';}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===47
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='02026ec9c63b9d49faa8df6262de038b5ee3a9b76a5e26ca32e0b3714ded4480'
      && layout.translation_sha256==='af1e625c530e6713ff143dfbd9d2bba721734f4f17d0bc983290fcab2606610b'){
    for(const region of regions){
      const index=region.block.source_lines[0], text=region.block.fa;
      if(index===2){region.slot=text.startsWith('استخراج')?[.26,.40,.48,.47]:[.55,.40,.70,.47];region.font=12;region.align='center';}
      if(index===3){region.slot=[.34,.255,.64,.31];region.font=16;region.align='center';}
      if(index===4){region.slot=[.82,.45,.91,.51];region.font=16;region.align='center';}
      if(index===5){region.slot=[.82,.82,.91,.88];region.font=16;region.align='center';}
      if(index===6){region.slot=[.26,.755,.48,.81];region.font=12;region.align='center';}
      if(index===7){region.slot=[.27,.69,.74,.75];region.font=13;region.align='center';}
      if(index===8){region.slot=[.55,.755,.70,.81];region.font=12;region.align='center';}
      if(index===9){region.slot=[.77,.675,.96,.74];region.font=18;region.align='center';}
      if(index===10){region.slot=text.startsWith('ورودی')?[.075,.33,.18,.385]:text.startsWith('خروجی')?[.79,.33,.92,.385]:[.27,.33,.74,.385];region.font=14;region.align='center';}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===48
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='03323390cdbb63782ad0d60397ee6a3fa9ecb06d015b2df341f101464d9df968'
      && layout.translation_sha256==='c0e3d1fd20f239b784d1f5b02c7a1b65095bba51aef4506635e3f5781cf6cb58'){
    for(const region of regions){
      const index=region.block.source_lines[0], text=region.block.fa;
      if(index===0){region.slot=[.04,.10,.98,.20];region.font=29;region.align='center';}
      if(index===1){region.slot=text.includes('۱')?[.43,.48,.50,.53]:[.60,.48,.68,.53];region.font=17;region.align='center';}
      if(index===3){region.slot=[.025,.65,.22,.81];region.font=18;}
      if(index===6){region.slot=[.08,.43,.25,.50];region.font=14;region.align='center';}
      if(index===8){region.slot=[.005,.33,.20,.38];region.font=15;region.align='center';}
      if(index===9){region.slot=text==='برنامه‌پذیر'?[.06,.38,.14,.42]:[.205,.34,.27,.43];region.font=12;region.align='center';}
      if(index===11){region.slot=[.26,.33,.37,.44];region.font=12;region.align='center';}
      if(index===14){region.slot=[.78,.33,.96,.42];region.font=16;region.align='center';}
      if(index===16){region.slot=[.52,.33,.78,.42];region.font=17;region.align='center';}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===49
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='605f4ada3f9709e71ff46ac3f55558a286f82fc76f264d572ed971893e51ef6e'
      && layout.translation_sha256==='5a1c20b227891c75db4c82d427982c5961d3557a272bedea193fe90e678abc31'){
    for(const region of regions){region.slot=[.07,.40,.93,.61];region.font=29;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && [50,66].includes(record.number)
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='93be166ad020db0006505dc7ba7155a8e809f0fb64afc1dfc2f33e13791b16be'
      && layout.translation_sha256==='ae0510d97d33a63f2d4c163c0c48f6b55a124bd4921b58801103d1bdfcb1b30c'){
    const top=[.11,.35,.49,.64,.79];
    for(const region of regions){const i=region.block.source_lines[0];region.slot=[.075,top[i],.92,top[i]+.09];region.font=i===0?35:23;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && [51,52,55,62].includes(record.number)
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='c13c8b12f2c82f6f39911df9250e21a438ec4e5d816c296f0d8c1124191359bb'
      && layout.translation_sha256==='6847e9d587d81e12420dd918f66c8e6f1758b4d8c9dff4027f5dca4c26cf80f8'){
    for(const region of regions){const i=region.block.source_lines[0];region.align='center';
      if(i===0){region.slot=[.04,.10,.96,.21];region.font=29;}
      if(i===1){region.slot=[.06,.925,.94,.99];region.font=18;}
      if(i===2){region.slot=[.12,.30,.88,.44];region.font=22;region.color='#ffc000';region.manualAccents=[...([51,52].includes(record.number)?[{text:'معماری (Architecture)',color:'#ff0000'},{text:'آموزش می‌بیند',color:'#ff0000'}]:[]),...([51,55].includes(record.number)?[{text:'داده',color:'#00b050'}]:[]),...([51,62].includes(record.number)?[{text:'پردازنده',color:'#7030a0'}]:[])];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===53
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='e5e1a922388ef1ec4e11a7c24977341806b1a435cd9a818985fe447d230efce4'
      && layout.translation_sha256==='ad5ca6ebe60e3bfe72fcb97f10a8844a581736ca1526fef11cab1446752153cf'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===1){region.slot=[.04,.10,.96,.21];region.font=32;}
      if(i===0){region.slot=[.07,.27,.92,.34];region.font=22;}
      if(i===2){region.slot=[.54,.47,.97,.53];region.font=19;}
      if(i===3||i===4||i===5){region.slot=[.54,.53+(i-3)*.058,.98,.59+(i-3)*.058];region.font=17;}
      if(i===6||i===7){region.slot=[.48,.74+(i-6)*.06,.97,.80+(i-6)*.06];region.font=16;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===54
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='9be4d2205c47a68510fb464d9458ebee9b8d5257952a206299aade47dbeb2202'
      && layout.translation_sha256==='8571746ef101e315870051934b5096449781aee13008dfb2533687764a7d02ad'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.95,.20];region.font=31;region.align='center';}
      if(i===1){region.slot=[.01,.34,.20,.43];region.font=14;region.align='center';}
      if(i===4){region.slot=[.265,.34,.37,.44];region.font=12;region.align='center';}
      if(i===6){region.slot=[.09,.45,.25,.52];region.font=14;region.align='center';}
      if(i===8){region.slot=[.205,.36,.27,.44];region.font=12;region.align='center';}
      if(i===10){region.slot=[.27,.49,.95,.61];region.font=18;region.align='center';}
      if(i===12){region.slot=[.78,.33,.96,.43];region.font=15;region.align='center';}
      if(i===14){region.slot=[.52,.33,.78,.43];region.font=16;region.align='center';}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===56
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='150b0a342cc4ddf232ac190a05a4ec2fc87663763c1e5e24374b650afc33f5e4'
      && layout.translation_sha256==='daeb7831dae0d0674d5df48a0dd8be9cdb59fef3801c6822c25d32e7bee0f338'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.85,.21];region.font=31;}
      if(i===1){region.slot=[.05,.27,.30,.34];region.font=23;}
      if(i===2){region.slot=[.07,.34,.30,.40];region.font=19;}
      if(i===3){region.slot=[.25,.70,.35,.76];region.font=17;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===57
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='45ca887e0c2f1867237c0090b08578ec9abc19f4f0e32701b7f22fcd0d2a5780'
      && layout.translation_sha256==='d4a794e771f60f37b2ae3f2d81d11e74d19e836ffd5cb9cd7991d18afebd5523'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.85,.21];region.font=31;}
      if(i===1||i===3){const top=i===1?.27:.405;region.slot=[.01,top,.20,top+.13];region.font=15;if(i===3)region.manualAccents=[{text:'ورودی؟',color:'#ffffff'}];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===58
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='77257dab3d0adef00b142a8b697cbbe421684c1f4a03306166d013fe54db4461'
      && layout.translation_sha256==='0e7348e48445da4c273a53ac5144d0984fa69866623f428b5a737d5b50323004'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.85,.21];region.font=31;}
      if(i===1||i===3||i===5){const top={1:.27,3:.40,5:.53}[i];region.slot=[.02,top,.25,top+.13];region.font=16;if(i===5)region.manualAccents=[{text:'ورودی؟',color:'#ffffff'}];}
      if(i===7){region.slot=[.51,.85,.62,.90];region.font=15;}
      if(i===8){region.slot=[.82,.56,.93,.61];region.font=15;}
      if(i===9){region.slot=[.81,.67,.95,.72];region.font=15;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===59
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='0ba41213473612c15d8013cf8b61f9a0674e21a8fe522fdc3aafafa320a427dc'
      && layout.translation_sha256==='0597346a4b563c965600a7f1be2303154267d44073b2cb38a24cabfbbff17452'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.85,.21];region.font=31;}
      if([1,3,5,7].includes(i)){const top={1:.27,3:.40,5:.53,7:.66}[i];region.slot=[.02,top,.25,top+.13];region.font=16;if(i===7)region.manualAccents=[{text:'ورودی؟',color:'#ffffff'}];}
      if(i===9){region.slot=[.25,.59,.32,.66];region.font=15;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===60
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='e51ec96b4f9dc65cca1731342b1867987d26a6542ebb57b3d064583bb482a99a'
      && layout.translation_sha256==='76d7b3ad46ff924c09bdc3fc091d79deb2cc94c16ed8d37d383d3fd2f8b9237e'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.85,.21];region.font=31;}
      if([1,3,5,7].includes(i)){const top={1:.27,3:.40,5:.53,7:.66}[i];region.slot=[.01,top,.25,top+.13];region.font=16;}
      if(i===9){region.slot=[.01,.80,.40,.87];region.font=16;}
      if(i===10){region.slot=[.01,.87,.45,.94];region.font=16;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===61
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='f92e1020b35113df95396c2386c8ef9dc5f91910f03de1a7e8a5263f8603f1d9'
      && layout.translation_sha256==='050aecd13695d5f8ce615c2de4fd2351014715a626acb7c40b569c830db5e059'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.95,.21];region.font=30;}
      if(i===1){region.slot=[.05,.26,.94,.33];region.font=22;}
      if(i===2){region.slot=[.05,.33,.94,.40];region.font=22;}
      if(i===3){region.slot=[.10,.39,.94,.92];region.font=22;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===63
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='a9d9b07431fc0137cb6b4915cdb80797483e32d04ba01e0a38c7280f79ddc9a9'
      && layout.translation_sha256==='70ab60de1d08352a1f25150b382da621b2f1b84df1d4ea355711ec9bae5c341f'){
    for(const region of regions){const i=region.block.source_lines[0];region.align='center';
      if(i===0){region.slot=[.04,.10,.96,.21];region.font=29;}
      if(i===1){region.slot=[.12,.30,.88,.44];region.font=19;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===64
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='f3b579608cc56b76492d61f0acfd4c501e7499886745ffff5b456474b69afa29'
      && layout.translation_sha256==='f7bcd0314c8e53aa4c577648640f3344cd9afc39055a2910ea81f13904456607'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.35,.21];region.font=35;}
      if(i===1){region.slot=[.06,.925,.94,.99];region.font=18;region.align='center';}
      if(i===2){region.slot=[.12,.30,.88,.44];region.font=22;region.align='center';region.color='#ffc000';region.manualAccents=[{text:'معماری (Architecture)',color:'#ff0000'},{text:'آموزش می‌بیند',color:'#ff0000'},{text:'داده',color:'#00b050'},{text:'پردازنده',color:'#7030a0'}];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===65
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='87184ba5fe22dd971a7e5cc2ab5b52164ef16c24a0b20052fa26c0226c6b5198'
      && layout.translation_sha256==='d839da333e344fc7504cdf0e90fa03e76c846bdb4605fe20bbb78d51ad15c59c'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.95,.21];region.font=33;}
      if(i===2){region.slot=[.68,.665,.98,.94];region.font=20;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===81
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='2e5b2c6330ea9f9fa04ff3c15e9c59982c160d9b3e1fd08f84cafdae82640ca9'
      && layout.translation_sha256==='b56c81a23b04424c41f9944c402f484833ed4e247fbb93572ebf6e4da0976e1d'){
    const labels={1:'پرسش از مدرس',2:'پیازا',6:'ساعت پاسخ‌گویی (Office Hours)',9:'قرار ملاقات'};
    for(const region of regions){const label=labels[region.block.source_lines[0]];if(label){region.color='#ffffff';region.manualAccents=[{text:label,color:'#ffc000'}];}}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===80
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='2a75a6c7431570b58c363f94ad10828cb82846f1ecebd9904f7a5d31bd7b1b75'
      && layout.translation_sha256==='f5ef91bf48a6f72508a4b9d42e8e1d6216b74749beaad7dceaa02dc696520573'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.95,.21];region.font=35;}
      if(i===1){region.slot=[.05,.30,.95,.38];region.font=19;}
      if(i===2){region.slot=[.05,.41,.95,.47];region.font=19;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===67
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='ccfb4c3eb76569bb8cc7550feb3a236d8b67364a366804e8a7c16293450432b1'
      && layout.translation_sha256==='e368dc1f71f3f78972e3a7d0a560e72581800915f27b507d32c5bf568beb25d3'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.55,.21];region.font=35;}
      if(i===1){region.slot=[.05,.33,.56,.40];region.font=19;}
      if(i===3){region.slot=[.05,.55,.57,.63];region.font=19;region.manualAccents=[{text:'اسلایدهای درس',color:'#ffc000'}];}
      if(i===4){region.slot=[.05,.69,.53,.81];region.font=19;region.color='#ffffff';region.manualAccents=[{text:'ضبط سخنرانی‌ها',color:'#ffc000'}];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===68
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='1e9cdf51784b231bc58345d0e14ef690dab785761d0029bdfa4c41e2d02dddca'
      && layout.translation_sha256==='7055408c1ca4faad40bc8422d4975b6474ce2adfa8cadac710e922bcc364e1da'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.95,.21];region.font=34;}
      if(i===1){region.slot=[.05,.33,.95,.41];region.font=23;}
      if(i===2){region.slot=[.08,.40,.95,.47];region.font=21;}
      if(i===3){region.slot=[.10,.47,.94,.62];region.font=19;}
      if(i===6){region.slot=[.10,.62,.94,.74];region.font=19;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===69
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='385ea9aeff7b0289ead82ddcc8d754bfccf78306d32de8ee462b478e64d44023'
      && layout.translation_sha256==='8c2d6846013b42756253197e369e4a8a0694fdee39232d235d1735e06cf651db'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.95,.21];region.font=34;}
      if(i===1){region.slot=[.05,.34,.95,.47];region.font=22;region.color='#ffffff';region.manualAccents=[{text:'شناخت و تحلیل روش‌های رایج آموزش شبکه‌های عصبی (Neural Networks)',color:'#ffc000'}];}
      if(i===3){region.slot=[.10,.47,.94,.57];region.font=19;}
      if(i===5){region.slot=[.10,.57,.94,.79];region.font=19;region.keepTermsTogether=true;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===70
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='56ca95300265c1c9bd33285be236e973fb3f70b2212a4fe190a22a7eb4d0d86f'
      && layout.translation_sha256==='11cd69113ab1600e056552223f615414377367117f47aa6ec1963287b48d8979'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.95,.21];region.font=34;}
      if(i===1){region.slot=[.05,.34,.95,.47];region.font=22;region.color='#ffffff';region.manualAccents=[{text:'کسب تجربه عملی در شبکه‌های عصبی و یادگیری عمیق (Deep Learning) برای وظایف گوناگون هوش مصنوعی',color:'#ffc000'}];}
      if(i===3){region.slot=[.10,.47,.94,.53];region.font=19;}
      if(i===4){region.slot=[.10,.53,.94,.66];region.font=19;region.keepTermsTogether=true;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===71
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='b62fb7107fbff1a02b50d502c26435b417ff24e883e9c664806ce9eb04c24479'
      && layout.translation_sha256==='d3eb7cfc72139fdba49bb00787b4648f0e012b84a03e2e8dbf01e4e7ebf09b48'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.95,.21];region.font=34;}
      if(i===1){region.slot=[.05,.34,.95,.47];region.font=22;region.color='#ffffff';region.manualAccents=[{text:'بررسی رویه‌های هوش مصنوعی مسئولانه (Responsible AI)، برای کاهش آسیب زیست‌محیطی و ترویج رفتار اخلاقی در سامانه‌های هوش مصنوعی',color:'#ffc000'}];}
      if(i===3){region.slot=[.10,.47,.94,.57];region.font=19;}
      if(i===5){region.slot=[.10,.57,.94,.70];region.font=19;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===72
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='40d0645e91a1dc4ce7cf6f9565703a9f4f71015229f70aa899ada821358efba6'
      && layout.translation_sha256==='e8900e0e6675bb68863525b0bdf01e528a5ee75e3fce1667e89f8e562d31aec5'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.95,.21];region.font=34;}
      if(i===1){region.slot=[.05,.34,.95,.47];region.font=22;region.color='#ffffff';region.manualAccents=[{text:'به‌کارگیری آموخته‌ها برای پیشنهاد و نقد پروژه‌های تازه مرتبط با شبکه‌های عصبی و یادگیری عمیق (Deep Learning)',color:'#ffc000'}];}
      if(i>=3){const top=.47+(i-3)*.057;region.slot=[.10,top,.94,top+.057];region.font=19;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===73
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='6394af000becea9f3069c1f012e74a54d5ac596791dff971780bf7ba6cf3ab21'
      && layout.translation_sha256==='02da0cfe1b19806325db65d2b9e0e9dcdf7af4dd68fa97c27884057112454c7d'){
    const slots={35:[.05,.10,.55,.21],0:[.23,.58,.35,.73],3:[.39,.42,.56,.47],4:[.37,.28,.57,.40],7:[.39,.50,.56,.71],12:[.84,.42,.98,.59],16:[.84,.28,.98,.40],19:[.84,.62,.98,.72],21:[.62,.39,.80,.55],25:[.62,.24,.80,.37],28:[.62,.58,.80,.72],31:[.015,.79,.24,.84],32:[.015,.84,.24,.97]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];region.font=i===35?35:i===31||i===32?14:12;if(i!==35&&i!==31&&i!==32)region.align='center';}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===74
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='ed741ff36dff50fb7349c0a091133d102183c38a3ec39aa28778d96a278eeb0c'
      && layout.translation_sha256==='d0e4ad47edcb03fd3963e7db7e362a680b7a9dda248158885c9ef18eae99bef3'){
    const slots={0:[.05,.06,.95,.25],2:[.05,.36,.95,.46],3:[.10,.46,.94,.52],4:[.10,.52,.94,.58],5:[.10,.58,.94,.64],6:[.05,.69,.94,.75],7:[.10,.75,.94,.82]};
    for(const region of regions){const i=region.block.source_lines[0];region.slot=slots[i];region.font=i===0?32:i===2||i===6?22:19;if(i===7)region.manualAccents=[{text:'مبانی',color:'#ffc000'}];}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===75
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='db1c702981c2eede9bcbc6310baa916c16cf9c33aaa93e580223c07b336aec95'
      && layout.translation_sha256==='e3bbaab7acbbc3eba807c7d8b6e322badf8304436ff18342fa7d243a02ffd567'){
    for(const region of regions){const i=region.block.source_lines[0];if(i===0){region.slot=[.05,.06,.95,.25];region.font=32;}else{const top=.49+(i-2)*.075;region.slot=[.05,top,.94,top+.07];region.font=23;}}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===76
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='b38ccde06ed46820c245a7e33621daa298644dd44bc9f0ac937a828b553fee55'
      && layout.translation_sha256==='ac4ab84da881cfcafb301f42b5bc5d6dc6cc4551f8cb3756f4c28328c86f5a79'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.95,.21];region.font=32;}
      if(i===1){region.slot=region.block.fa.includes('VPN')?[.56,.25,.94,.34]:[.12,.25,.49,.31];region.font=16;region.align='center';}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===77
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='dcb9f23d0a259de3a1e44ac53604692e94099e470588e5fbe0b5d28c1f08910f'
      && layout.translation_sha256==='353f5cfd8aa99d06c06da31798f2691d134aaebd9fd2104738c1dcc32269ae6c'){
    const top=[.10,.26,.40,.54,.60,.65,.70,.75,.87];
    for(const region of regions){const i=region.block.source_lines[0];region.slot=[i>=4&&i<=7?.10:.05,top[i],.95,top[i]+(i===0?.11:.06)];region.font=i===0?34:i>=4&&i<=7?19:22;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===78
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='3e6672c8e90af769505a90237127f2bc27368343fc4a4d4291e6c38c66310f52'
      && layout.translation_sha256==='40d8fec58c879396b42b249bddc7699a5f8f33ee07edf5ef6f874e13198f4239'){
    for(const region of regions){region.slot=[.05,.10,.95,.21];region.font=32;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===79
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='89e5a1f84262047589124d433a72dc39bcde3571bd8c3ad248287d67d5abac7c'
      && layout.translation_sha256==='b01789df84b726181ca909fe441fe321e7f929e3a99adea9a97804b72d418a5c'){
    const slots={0:[.05,.10,.95,.21],1:[.05,.34,.95,.41],2:[.10,.41,.95,.48],3:[.05,.53,.95,.60],4:[.10,.60,.95,.75],7:[.10,.75,.95,.82]};
    for(const region of regions){const i=region.block.source_lines[0];region.slot=slots[i];region.font=i===0?32:i===1||i===3?22:19;if(i===4)region.manualAccents=[{text:'مقررات تأخیر',color:'#ffc000'}];if(i===7)region.manualAccents=[{text:'درخواست بازبینی نمره',color:'#ffc000'}];}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===83
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='098a2c262a1750acbe89fab828e45aa2a9283f3636e09211315038664fdf3415'
      && layout.translation_sha256==='80a2ad7987de47e623a18b012398b7592aa8ba22f86f98f02658ad74c70162ca'){
    const slots={0:[.05,.10,.95,.21],2:[.255,.36,.48,.55],6:[.495,.36,.705,.55],10:[.71,.36,.96,.55],14:[.68,.58,.99,.94],21:[.54,.89,.67,.97],24:[.01,.36,.22,.59],29:[.01,.79,.22,.83]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];region.font=i===0?34:i===29?12:i===14?16:14;if(i!==0)region.align='center';}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===84
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='4b7a025a50e7266f0a49745a66375e3c610514152d0810865b5185f7264533c5'
      && layout.translation_sha256==='d7ae61eb608f347f8ce472ec53ddf776433fdfd39f1d3bf285bdcabce66b760b'){
    const slots={0:[.05,.10,.95,.21],2:[.255,.36,.48,.55],24:[.01,.36,.22,.59],29:[.01,.79,.22,.83],30:[.50,.55,.98,.77]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];region.font=i===0?34:i===30?34:i===29?12:14;if(i!==0)region.align='center';}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===85
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='2f9bf15d27e4a50bfc77bf40d29e55d186172146802daa7f20e916a74f8298cc'
      && layout.translation_sha256==='9002baffb6eb6e426aefb59f84c9ab790d5175e35bd7c3987a6594336cb01ad9'){
    const slots={0:[.05,.10,.95,.21],1:[.34,.67,.59,.73],2:[.30,.74,.63,.97],6:[.34,.44,.59,.50],7:[.26,.51,.67,.63],9:[.34,.26,.59,.32],10:[.24,.33,.69,.40]};
    for(const region of regions){const i=region.block.source_lines[0];region.slot=slots[i];region.font=i===0?32:[1,6,9].includes(i)?23:19;if(i!==0)region.align='center';}
  }
  const s05IllustrationHashes={21:['7a536322fc55e75450801d8cc24e594feaab9978fa55acecaea631d5a17a2313','24630bd3dbddcc5ba1d319b99a8a0b0fb9116ced682ec1ebe85750dbdefc9cf3'],22:['11395c323a1596b4b0fd497fb43b399146914c96898357c85ba82bbe8b00d8e7','91e51d742a5dbc1137fcb1fed5e1be565404846caf671eef8eae9a5d92cb634f']}[record.number];
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s05' && s05IllustrationHashes
      && sourceIdentity.sourceSha256==='f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7'
      && record.source_text_sha256===s05IllustrationHashes[0] && layout.translation_sha256===s05IllustrationHashes[1]){
    for(const region of regions){const i=region.block.source_lines[0],n=record.number;
      if(i===0){region.slot=[.04,.10,.96,.21];region.font=32;}
      if(i===2){region.slot=n===21?[.35,.80,.74,.91]:[.52,.80,.95,.91];region.font=16;region.align='center';}
      if(i===4){region.slot=[.35,.91,.74,.97];region.font=16;region.align='center';}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s05' && [24,25].includes(record.number)
      && sourceIdentity.sourceSha256==='f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7'
      && record.source_text_sha256==='3a1ddb29148237045e6ccde4418cfb077dd138c28eeb48818afce7bbdd9e7787'
      && layout.translation_sha256==='c1956dd88d86fb4183536f39dc0ff667741341483dccfc0f8652c0d0d89f6a0a'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.04,.09,.96,.24];region.font=32;}
      if(i===1){region.slot=[.05,.26,.95,.33];region.font=19;}
      if(i===2){region.slot=[.05,.33,.95,.41];region.font=19;}
      if(i===4){region.slot=[.25,.47,.36,.53];region.font=18;}
      if(i===5){region.slot=[.55,.52,.68,.64];region.font=17;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s05' && record.number===26
      && sourceIdentity.sourceSha256==='f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7'
      && record.source_text_sha256==='a675b5fa6248745411523abccc8e55d5a92e58becf39a7fd0f32362e3bbf3034'
      && layout.translation_sha256==='105a80c9198e64ca01d6ce618a7b8c91f2b4c3daf814413e72e0fc550bb5fb11'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.04,.09,.96,.24];region.font=32;}
      if(i===1){region.slot=[.05,.26,.95,.33];region.font=19;}
      if(i===2){region.slot=[.05,.33,.95,.41];region.font=19;}
      if(i===4){region.slot=[.25,.47,.36,.53];region.font=18;}
      if(i===5 && region.block.fa.startsWith('نتیجه')){region.slot=[.55,.52,.68,.64];region.font=17;}
      if(i===5 && region.block.fa.startsWith('توجه')){region.slot=[.72,.60,.99,.78];region.font=15;}
    }
  }
  const s05FilterHashes={27:['86093944cd0d0f1382f128953d4f21d6b5e4be722ac83454d02c59e6eb738703','65028ef7c0310c6cc3e47eda034987144cac2b6e0ef07a3a535509b07a8dbacd'],28:['96f254df9fb6aed925265152feddcad92610a5a263c99d6578147bfdb355a054','dbda397c3893520663076b8c667959ed44ef7bf5399abca269c9d14a9e582a3e'],29:['f99b3bbc274d9be1b619b276b0a277565ac9cabb3ed0fc2337bed3b484ce92bc','def554425466fcccc3aa89fa4b99a5b7afca18d9368103f7613eafa0970595e0'],30:['4f89a8aaceb62d86d58d2c4a8f1e1eb32d5dbf7b3d8648fd45ca8721af50a75e','1b2b8c20ed74451385a92c3002f6ef8251ed0a74a8365a9697d796a2ac8da6a2']}[record.number];
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s05' && s05FilterHashes
      && sourceIdentity.sourceSha256==='f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7'
      && record.source_text_sha256===s05FilterHashes[0] && layout.translation_sha256===s05FilterHashes[1]){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===4){region.slot=[.17,.47,.33,.54];region.font=18;region.align='center';}
      if(i===13 && region.block.fa.startsWith('ورودی')){region.slot=[.40,.47,.53,.54];region.font=18;region.align='center';}
      if(i===13 && region.block.fa.startsWith('نقشه')){region.slot=[.66,.47,.84,.54];region.font=18;region.align='center';}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s05' && record.number===11
      && sourceIdentity.sourceSha256==='f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7'
      && record.source_text_sha256==='666b30d38aa77ec692a8809766da2c7d0819f8609d3e596ccf462466c4c7df2c'
      && layout.translation_sha256==='6018e16ffe9ba3659a722df65adaa58ce782e699f1779b78538c91408bfd7992'){
    for(const region of regions){
      const i=region.block.source_lines[0];
      region.slot=i===0?[.05,.10,.95,.20]:[.04,.265+(i-1)*.142,.96,.395+(i-1)*.142];
      region.font=i===0?33:20;
      region.keepTermsTogether=true;
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s05' && record.number===14
      && sourceIdentity.sourceSha256==='f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7'
      && record.source_text_sha256===layout.source_text_sha256
      && layout.translation_sha256==='280fd331b6dfaa8825b879425ed5d80fa88a45fd4238767e1d3ef39a5e0d18ce'){
    for(const region of regions){
      const i=region.block.source_lines[0];
      if(i===0){region.slot=[.04,.09,.96,.24];region.font=32;}
      if(i===1){region.slot=[.04,.26,.96,.335];region.font=19;}
      if(i===2){region.slot=[.05,.335,.95,.445];region.font=17;}
    }
  }
  const s05ExampleHashes={19:'3d8158ead05ea9b1e873e9ffb1a349d1c143ccf3d026d437d87a2fdf692e1f11',20:'fbca5d6da922d1f0b7cba9de50b30dbfbd99a6b32510daf7e40b6bb0dbdbe58a'};
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s05' && s05ExampleHashes[record.number]
      && sourceIdentity.sourceSha256==='f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7'
      && record.source_text_sha256===layout.source_text_sha256 && layout.translation_sha256===s05ExampleHashes[record.number]){
    for(const region of regions){const i=region.block.source_lines[0],n=record.number;
      if(i===0){region.slot=[.04,.10,.96,.21];region.font=32;}
      if(i===2){region.slot=n===19?[.09,.80,.54,.91]:[.29,.80,.70,.91];region.font=16;region.align='center';}
      if(i===4){region.slot=n===19?[.10,.91,.54,.97]:[.30,.91,.70,.97];region.font=16;region.align='center';region.block={...region.block,fa:region.block.fa.replace(/k=\d/g,term=>'\u2066'+term+'\u2069')};}
    }
  }
  const s05FilterContinuation={"31":["3a2f6d79f2d434b8fc6fdfb00b75a6b4c48768c7ac32fa6797582899162808de","4e43c3f8a26a74f0cc6eb6182fa2c53232fc0bf995d70a44f44cd9bc415f201a"],"32":["790d7c1defecba9091c7f164ca9a55d555703fddf677da31025502d069674cc4","027737573ca33fd4f6357f3ab0fb308e35c7794a1ecb553dd63ff27a24c9362a"],"33":["591a52d77c8034e0911e249daaea0f8d17b6bb599fd560f0797d0f3e0c285b94","a1a94d126d58b4b56e61e1a23f6c56679194f596a2d4a951eca57e8365aead70"],"34":["cdbb7988811e5c31bf82e1f6422e88bb13a27c756ead5a5db343bb0ef02df1b0","cf1dd91c6b9cc15993d84df47855e0e9ae3594297d3009d7fcef7e94b585b119"],"35":["52841b2d89d1e0c16c4c26d2aed9020319d749210909852af9d691800bb273bb","f56c3dea3d3e3ae158d13d3f08f83e44450f886572dea8936fabe94a42a40829"],"36":["f8ca0fcf853b151de6ace9f96cc62c9d69e335640574077a184811a42459f47c","b5b19865229e0010d71669b320966fec7b2ddacf5978bd49f177ce9a422710bb"],"37":["8c3ff0749941d7c49e2a033a2faca0b748f9a6ad9701df0c20bea2cbdc797ec9","6418143f6de8dd3c44599ec7ffd6f3375f99ae6fb7c9e29c98e3bee049c67122"]}[record.number];
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s05' && s05FilterContinuation
      && sourceIdentity.sourceSha256==='f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7'
      && record.source_text_sha256===s05FilterContinuation[0] && layout.translation_sha256===s05FilterContinuation[1]){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===4){region.slot=[.17,.47,.33,.54];region.font=18;region.align='center';}
      if(i===13 && region.block.fa.startsWith('ورودی')){region.slot=[.40,.47,.53,.54];region.font=18;region.align='center';}
      if(i===13 && region.block.fa.startsWith('نقشه')){region.slot=[.66,.47,.84,.54];region.font=18;region.align='center';}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s05' && record.number===40
      && sourceIdentity.sourceSha256==='f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7'
      && record.source_text_sha256==='f933f44d413f9e1e2268537b1cbb8f481396916beae1353b48250bb57e711b72'
      && layout.translation_sha256==='39d691be5fb3191d3a895af963907edc71c6a155a23ecad575a0e0b927c645c1'){
    for(const region of regions){if(region.block.source_lines[0]===1){region.slot=[.10,.91,.90,.99];region.font=18;region.align='center';}}
  }
  const s05Networks={"41":["251c99ab2cd44a32244cf344081e9e3059aeaf0dabf06ab79f132bff7beee917","217cd3dd45fd1179eaf416231996f14a249056c7812e67effb581c15da1206e5"],"42":["780bda5e890d663eddb901d99a49ca468e37eaa728657624da7f8428353f1a15","55b05d12951cbe2ea3f6dd86fa3db5e09c515b9e9d82eaa15db78d07ed6fd996"],"43":["0df77321705824fd65241a1bb8e35baee50c6fd4d0ed8d2c4c6778c11849661c","6e2c0f6a223ba1fef5aebe10fa6f243babc24bcc0f0174c336a8cff0a16615fa"],"44":["9904a2b5880e7af0ed488bf66e20b8362ff6d038b1ef507cc944f22d0fd2ff3c","42463716baaa2313801b0b683649355b71e9e26dc76e4a107ca34f3e58709492"],"45":["e372fb51286c6803aee84a9515c506ec159e0efb4660f4aa574c3bb78997e20c","ac6778cfc6b6138f4a69fd9f07c971e0df1af1792b807d0e693cc5bcb7afe895"]}[record.number];
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s05' && s05Networks
      && sourceIdentity.sourceSha256==='f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7'
      && record.source_text_sha256===s05Networks[0] && layout.translation_sha256===s05Networks[1]){
    for(const region of regions){const i=region.block.source_lines[0],n=record.number;
      if(i===0){region.slot=[.04,.09,.96,.23];region.font=32;}
      if(n===41 && i===1){region.slot=region.block.fa.startsWith('ورودی')?[.04,.65,.12,.73]:[.21,.65,.30,.73];region.font=18;region.align='center';}
      if(n===41 && i===2){region.slot=[.39,.62,.49,.73];region.font=17;region.align='center';}
      if(n>=43 && i===1){region.slot=[.09,.27,.18,.33];region.font=18;region.align='center';}
      if(n===43 && i===3){region.slot=[.30,.35,.42,.41];region.font=18;region.align='center';}
      if(n>=44 && i===4){region.slot=[.30,.20,.42,.26];region.font=18;region.align='center';}
      if(n===43 && i===5){region.slot=[.64,.36,.99,.55];region.font=18;}
      if(n===44 && i===7){region.slot=[.28,.88,.98,.99];region.font=18;region.align='center';}
      if(n===45 && i===7){region.slot=[.02,.81,.30,.95];region.font=17;region.align='center';}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s05' && record.number===49
      && sourceIdentity.sourceSha256==='f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7'
      && record.source_text_sha256==='d21fe764db739bc690ada9a61e12f4227e04a07aea5a91db6db797f2f3222ff6'
      && layout.translation_sha256==='cbf280cb62991772c72f750eaba3c77e8abbb65920f5a53becf3bd0f79fe06de'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.04,.09,.96,.23];region.font=32;}
      if(i===1){region.slot=[.05,.26,.95,.325];region.font=19;}
      if(i===2){region.slot=[.05,.325,.95,.39];region.font=19;}
      if(i===3){region.slot=[.04,.39,.96,.46];region.font=16;}
      if(i===4){region.slot=[.04,.46,.16,.51];region.font=16;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s05' && record.number===58
      && sourceIdentity.sourceSha256==='f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7'
      && record.source_text_sha256==='666b30d38aa77ec692a8809766da2c7d0819f8609d3e596ccf462466c4c7df2c'
      && layout.translation_sha256==='6018e16ffe9ba3659a722df65adaa58ce782e699f1779b78538c91408bfd7992'){
    for(const region of regions){const i=region.block.source_lines[0];region.slot=i===0?[.05,.10,.95,.20]:[.04,.265+(i-1)*.142,.96,.395+(i-1)*.142];region.font=i===0?33:20;region.keepTermsTogether=true;}
  }
  const s05StrideHashes={56:['d30cffbc1e282872d51d6d3eb08efa9b3ef79583005efbb13af3f1835d182367','b6bd5ba5e0d62e13c6044c0d19c9cb19dc70ca7fa0b7ef045c16e498fed32da2'],57:['473472ae22a471a42aa5c41ba60f63b2889446d71221a11ab9dc7dc0eb12bdf8','421ca249667bf83c3b966b939a962bea0c186cb713da522a30a6c3654cf07344']}[record.number];
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s05' && s05StrideHashes
      && sourceIdentity.sourceSha256==='f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7'
      && record.source_text_sha256===s05StrideHashes[0] && layout.translation_sha256===s05StrideHashes[1]){
    for(const region of regions){const i=region.block.source_lines[0];
      if(record.number===56 && i===3){region.slot=[.05,.85,.77,.97];region.font=17;}
      if(record.number===57 && i===1){region.slot=[.02,.79,.39,.98];region.font=15;region.align='center';}
      if(record.number===57 && i===5){region.slot=[.41,.79,.99,.98];region.font=15;region.align='center';}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s05' && [64,74,75].includes(record.number)
      && sourceIdentity.sourceSha256==='f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7'
      && record.source_text_sha256==='666b30d38aa77ec692a8809766da2c7d0819f8609d3e596ccf462466c4c7df2c'
      && layout.translation_sha256==='6018e16ffe9ba3659a722df65adaa58ce782e699f1779b78538c91408bfd7992'){
    for(const region of regions){const i=region.block.source_lines[0];region.slot=i===0?[.05,.10,.95,.20]:[.04,.265+(i-1)*.142,.96,.395+(i-1)*.142];region.font=i===0?33:20;region.keepTermsTogether=true;}
  }
  const s05LenetReview={61:['67f768219e48a783e3ca760c364a8dd28ea02013ee2468eda7843e0395379c79','e57d24d900eca856e796380752a52fcd14ad51b25bb28f4c5368f3e4e9333665'],67:['661efe6eb99c60d2540cef55a2eb85e9b345d3bf9102b5c3fe03182087b77d8e','183228a933fe63be130a9fdbdc5e307e3d70a40bad54c2b01217e788b58db3d5'],69:['99069e8ef992315273e975fa9379cdd56b9bcc9fc6f1ad21c9f6cc937e1d4cce','1467e198cbe23ba79cb3f0e4055d39dbdfbdbace4bf121f898f94fecac17a7fa']}[record.number];
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s05' && s05LenetReview
      && sourceIdentity.sourceSha256==='f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7'
      && record.source_text_sha256===s05LenetReview[0] && layout.translation_sha256===s05LenetReview[1]){
    for(const region of regions){const i=region.block.source_lines[0],n=record.number;
      if(n===61 && i===1){region.slot=region.block.fa.startsWith('ورودی')?[.04,.65,.12,.73]:[.21,.65,.30,.73];region.font=18;region.align='center';}
      if(n===61 && i===2){region.slot=[.39,.62,.49,.73];region.font=17;region.align='center';}
      if(n===61 && i===5){region.slot=[.40,.76,.71,.96];region.font=16;}
      if(n===67 && i===2){region.slot=[.66,.36,.95,.43];region.font=18;region.align='center';}
      if(n===67 && i===3){region.slot=[.20,.83,.60,.875];region.font=14;region.align='center';}
      if(n===67 && i===4){region.slot=[.76,.46,.96,.59];region.font=16;region.align='center';}
      if(n===69 && i===2){region.slot=[.20,.82,.68,.90];region.font=16;region.align='center';}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s05' && record.number===68
      && sourceIdentity.sourceSha256==='f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7'
      && record.source_text_sha256==='9d79b648542fb6d1647656e2cd1c09d68d1f37d1a9d335b3cc90080bf7725eb4'
      && layout.translation_sha256==='4b1fba13da2dbe5752589751ec21f7fff5bc0bafa359c474a2069a5e4f4e3e68'){
    for(const region of regions){if(region.block.source_lines[0]===4 && region.block.fa.startsWith('بین')){region.slot=[.04,.958,.60,.998];region.font=16;}}
  }
  const s05CellsHashes={15:['218de1606529ad3e8d1f1bc3d3e2e64bda2c6fce42cb7a8f9e8ea11c3741e52b','9b5b19cc30d82add783084c50e6953096d72193fbeab6910185722af3b1fec90'],16:['2ff011eaf2adc363ed336978b004adc09f21372a59bca191dcec2c73dc9e2dff','594cf80d7918963d6c4e2dcc2809659ae70f4e9d6b8abf1d27c7ff7074cdd96e'],17:['597ef07910b308050583b06338fff57ff568dc1d7a30c9375e84f72b1eee8c9a','34a80dfcfd2d12506410b50f65cc8bfb420ded04efe5dd13a34325ffe3e0bef9']}[record.number];
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s05' && s05CellsHashes
      && sourceIdentity.sourceSha256==='f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7'
      && record.source_text_sha256===s05CellsHashes[0] && layout.translation_sha256===s05CellsHashes[1]){
    for(const region of regions){const i=region.block.source_lines[0],n=record.number;
      if(i===0){region.slot=[.04,.10,.96,.24];region.font=32;}
      if(i===1){region.slot=[.04,.26,.96,.33];region.font=18;}
      if(i===2){region.slot=[.04,.33,.96,.43];region.font=16;}
      if(i===4){region.slot=[.78,.95,.99,.995];region.font=13;}
      if(n===15 && i===5){region.slot=[.008,.70,.21,.85];region.font=15;region.align='center';}
      if(n===16 && i===5){region.slot=[.005,.72,.22,.91];region.font=12;}
      if(n===17 && i===5){region.slot=[.76,.48,.99,.56];region.font=15;}
      if(n===17 && i===6){region.slot=[.76,.55,.99,.70];region.font=13;}
      if(n===17 && i===9){region.slot=[.76,.70,.99,.88];region.font=13;}
      if((n===15 && i===8)||(n===16 && i===14)||(n===17 && i===12)){region.slot=[.21,.91,.80,.99];region.font=16;region.align='center';}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s05' && record.number===62
      && sourceIdentity.sourceSha256==='f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7'
      && record.source_text_sha256==='d939f6b63b5a74b901f6ca192d495b3b062e83aa572c7c779e5fb0f2622c2553'
      && layout.translation_sha256==='31f596c68db078e346d48478403ee030bd38e106d0faf9539e31d3ca433fa796'){
    for(const region of regions){
      const i=region.block.source_lines[0];
      if(i===7){region.slot=[.08,.87,.75,.96];region.font=18;}
      if(i===9){region.slot=[.78,.62,.99,.85];region.font=15;}
    }
  }
  let imageTranslations=[];
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s05' && record.number===27
      && sourceIdentity.sourceSha256==='f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7'
      && record.source_text_sha256==='86093944cd0d0f1382f128953d4f21d6b5e4be722ac83454d02c59e6eb738703'
      && layout.translation_sha256==='65028ef7c0310c6cc3e47eda034987144cac2b6e0ef07a3a535509b07a8dbacd'){
    imageTranslations.push(
      {rect:[.178,.887,.26,.928],text:'پاسخ',background:'#000',color:'#fff',font:16,align:'center'},
      {rect:[.178,.932,.26,.973],text:'پاسخ',background:'#000',color:'#fff',font:16,align:'center'}
    );
  }
  const s05FigureLabelHashes={
    39:['ed5a02b908f9bbf93cf61bf18b998ce514afbef19d8200595612f4a73cf17e03','4bcaefd5c11b474ebf97c1de3a3a853ee23910760019289cef20037123c570b9'],
    46:['638daa30ae3bd8787283983fb08b08c2b518b1f8dbb303324007f240013020bb','40a7382db00d0c1ac416b33532f6809706e102f59628998c932d1396c9f33dfa'],
    47:['7dace07ff37e579f456cd70cd80ba56c45d536a9708d10c0b52e68d0608d2b6f','5d2dd8edf34b817c14e52db20095d550a510c480f2a52fc350041173bc08fd5a'],
    53:['8279d72c325cd717ecd34f956503501a3f5836092e68fe069347ce67f278f1cb','f32b1f334b4de8b042d96a2e494a521b0aa198e0dc4de80025b99357ab649757']
  }[record.number];
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s05' && s05FigureLabelHashes
      && sourceIdentity.sourceSha256==='f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7'
      && record.source_text_sha256===s05FigureLabelHashes[0] && layout.translation_sha256===s05FigureLabelHashes[1]){
    const labels={
      39:[[[.455,.32,.565,.36],'همانی'],[[.455,.49,.565,.53],'تشخیص لبه'],[[.455,.67,.565,.71],'تیز کردن'],[[.455,.825,.565,.895],'محو جعبه ای\n(نرمال شده)']],
      46:[[[.905,.47,.99,.52],'کانال آبی'],[[.90,.625,.99,.68],'کانال سبز'],[[.52,.76,.65,.795],'کانال قرمز']],
      47:[[[.165,.225,.225,.26],'ورودی'],[[.455,.225,.52,.26],'فیلتر'],[[.675,.225,.755,.26],'خروجی'],[[.41,.55,.535,.58],'پارامترها'],[[.41,.59,.465,.625],'اندازه'],[[.41,.625,.51,.66],'تعداد کانال']],
      53:[[[.21,.58,.29,.665],'کانولوشن\nReLU'],[[.46,.59,.54,.675],'کانولوشن\nReLU'],[[.70,.59,.78,.675],'کانولوشن\nReLU']]
    }[record.number];
    for(const [rect,text] of labels)imageTranslations.push({rect,text,background:'#fff',color:'#111',font:14,align:'center'});
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s05' && record.number===71
      && sourceIdentity.sourceSha256==='f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7'
      && record.source_text_sha256==='e6deb73627a334bdc6b72f943170ba686622c0d9761e953844751e4c3f024c61'
      && layout.translation_sha256==='6446883defde8028fef82eda8d21613546e0b192d04b14791ca78967d17655c5'){
    imageTranslations.push(
      {rect:[.505,.25,.66,.30],text:'نرخ خطا (%)',background:'#fff',color:'#000',font:19,align:'center'},
      {rect:[.89,.715,.96,.76],text:'آزمون',background:'#fff',color:'#0000ff',font:18,align:'center'},
      {rect:[.89,.77,.98,.82],text:'آموزش',background:'#fff',color:'#ed3022',font:18,align:'center'},
      {rect:[.75,.875,.98,.93],text:'تکرارهای مجموعه آموزش',background:'#fff',color:'#000',font:17,align:'center'},
    );
  }

  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04'
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'){
    if(record.number===39 && record.source_text_sha256==='3b46f7af0c6aeaffd78c64f1ded81ca6631c965366fd08d3b50f218d195d2deb'
        && layout.translation_sha256==='bb2e007bee053e5e8003d762cd001cd99a66363d50e89954d8c13bf191059811'){
      const labels=record.image_text[0].fa.split('؛');
      const boxes=[[.087,.244,.190,.286],[.226,.244,.348,.286],[.395,.244,.517,.286],[.595,.244,.735,.286],[.805,.244,.947,.286]];
      imageTranslations=labels.map((text,index)=>({rect:boxes[index],text:text.trim(),background:'#fff',color:'#000',font:16,align:'center'}));
    }
    if(record.number===40 && record.source_text_sha256==='652dd588a0207a30da560ebf6fb724f94fdc4c8cb505c3675e3360b21aefa17b'
        && layout.translation_sha256==='10aa574186791f0efdd1f3d7b30b37af033b9b1cc9cf5edf2a161b785a19f0cc'){
      imageTranslations=[
        {rect:[.303,.825,.346,.855],text:'عمق',background:'#fff',color:'#000',font:14,align:'center'},
        {rect:[.469,.936,.506,.963],text:'زمان',background:'#fff',color:'#000',font:14,align:'center'},
      ];
    }
    if(record.number===42 && record.source_text_sha256==='f6b19ce219de43934205645e317793cd69e4cee83ee89bbd2fa30d43ce7beb27'
        && layout.translation_sha256==='6085a3f9308181e77ab8f0055a2bdcebba52c12dd3382db2f370a3517dcf52a3'){
      imageTranslations=[
        {rect:[.123,.402,.179,.436],text:'داده ها',background:'#fff',color:'#000',font:13,align:'center'},
        {rect:[.122,.482,.191,.518],text:'نمونه 1',background:'#fff',color:'#000',font:13,align:'center'},
        {rect:[.195,.563,.265,.598],text:'نمونه 2',background:'#fff',color:'#000',font:13,align:'center'},
        {rect:[.265,.645,.335,.680],text:'نمونه 3',background:'#fff',color:'#000',font:13,align:'center'},
        {rect:[.303,.765,.405,.820],text:'نمونه N-L',background:'#fff',color:'#000',font:13,align:'center'},
        {rect:[.606,.848,.650,.883],text:'ورودی',background:'#fff',color:'#000',font:13,align:'center'},
        {rect:[.840,.848,.889,.883],text:'خروجی',background:'#fff',color:'#000',font:13,align:'center'},
      ];
    }
    if(record.number===44 && record.source_text_sha256==='d76c7367a57fde21aa8f039871c97d1eeee7397f1bbe020208bef2b98aedfd1e'
        && layout.translation_sha256==='fa3c63736d5486dffe075512c789afbc15f8e96d2ee7c8d530b0aa6195faa3aa'){
      imageTranslations=[{rect:[.361,.621,.407,.657],text:'بازکردن',background:'#fff',color:'#000',font:11,align:'center'}];
    }
    if(record.number===61 && record.source_text_sha256==='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        && layout.translation_sha256==='964920c96f52d60c9c43c67ac8f49db4d87777ea0d7edc04a72289cf0f8daf5d'){
      imageTranslations=[{rect:[.38,.69,.62,.81],text:'پایان',background:'transparent',color:'#fff',font:46,align:'center'}];
    }
    const gates={
      55:['6bda73a2802b1b64c71d142c9476486ad3134b694f2530283f3ded2929f3e41b','aa1a92c82df85613ece56ee54d912657c7c179dc354d8a56388c37a9add2e2bb'],
      56:['fe58256f415717435184a8727809426f68031475be569201a2a5945e06c6ff91','10d17ce59e2af29b835f45d64453bf3f4119113ba091efbe07c793c66396b64e'],
      57:['4e9b8a7809c17dd2b8e804a4c97bad90d5aa458cca1dd7a0856582e937bdc775','4f66431abe6798220f5846da7db267f82103d87cd8908a9cfe53c2fee8441b35'],
    }[record.number];
    if(gates && record.source_text_sha256===gates[0] && layout.translation_sha256===gates[1]){
      imageTranslations=[
        {rect:[.237,.508,.28,.553],text:'ورودی',background:'#d8e6f7',color:'#000',font:12,align:'center'},
        {rect:[.375,.508,.420,.573],text:'دروازه ورودی',background:'#d8e6f7',color:'#000',font:10,align:'center'},
        {rect:[.503,.508,.549,.573],text:'دروازه فراموشی',background:'#d8e6f7',color:'#000',font:10,align:'center'},
        {rect:[.610,.508,.666,.573],text:'دروازه خروجی',background:'#d8e6f7',color:'#000',font:10,align:'center'},
      ];
    }
    const paperTitles={
      51:['7c48fc0319dc86b9c82dea38dba41d70c07f0e6e941262498f1f7b86259201ed','21a247833794829d1dee1e919e1bfe3fbadf563905bbba95b83a91236026ec7f'],
      52:['43baa7f794793ecf04301f18d2fca9262c86b502783df9117a443b78ea176110','1ca05d22f7263d7c1c956453bf3c9670967365cc38325c1c5e4c26db5457a9ef'],
      53:['fee2965e1f874f5609c73f9fe1dc34e7ff21039d0f23526e1969199cca977131','3428bf155bb4384c3866b7eaff1d567d53feb3fe9def87679b640895c921312d'],
    }[record.number];
    if(paperTitles && record.source_text_sha256===paperTitles[0] && layout.translation_sha256===paperTitles[1]){
      imageTranslations.push(
        {rect:[.218,.141,.36,.209],text:'',background:'#fff',color:'#000',font:19,align:'center'},
        {rect:[.369,.141,.553,.209],text:'بلندمدت',background:'#fff',color:'#000',font:24,align:'center'},
        {rect:[.565,.141,.786,.209],text:'یادگیری وابستگی های',background:'#fff',color:'#000',font:19,align:'center'},
        {rect:[.226,.223,.783,.282],text:'با نزول گرادیان دشوار است',background:'#fff',color:'#000',font:25,align:'center'},
      );
      if(record.number===51)imageTranslations.push({rect:[.469,.388,.544,.414],text:'مشتق ها',background:'#fff',color:'#000',font:11,align:'center'});
      if(record.number===52)imageTranslations.push(
        {rect:[.382,.402,.426,.438],text:'ورودی',background:'#fff',color:'#000',font:11,align:'center'},
        {rect:[.49,.402,.55,.438],text:'پنهان 1',background:'#fff',color:'#000',font:11,align:'center'},
        {rect:[.602,.402,.665,.438],text:'پنهان 2',background:'#fff',color:'#000',font:11,align:'center'},
        {rect:[.722,.402,.774,.438],text:'خروجی',background:'#fff',color:'#000',font:11,align:'center'},
        {rect:[.889,.477,.925,.512],text:'خطا',background:'#fff',color:'#000',font:11,align:'center'},
      );
    }
    if(record.number===54 && record.source_text_sha256==='61f5f434f391e004fed09cc5c282511c123de4e73b7921eefe013b30d418f61d'
        && layout.translation_sha256==='b61f042706e967ebc31350bd57f310fe0afcde246f81a00683722ed90350cb16'){
      imageTranslations.push({rect:[.222,.228,.779,.305],text:'حافظه بلند کوتاه مدت (Long Short-Term Memory)',background:'#fff',color:'#000',font:21,align:'center'});
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===78
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='3e6672c8e90af769505a90237127f2bc27368343fc4a4d4291e6c38c66310f52'
      && layout.translation_sha256==='40d8fec58c879396b42b249bddc7699a5f8f33ee07edf5ef6f874e13198f4239'){
    imageTranslations=[
      {rect:[.44,.41,.80,.47],text:'درصد نمره نهایی درس',background:'#fff',color:'#000',font:21,align:'center'},
      {rect:[.20,.50,.43,.56],text:'مجموعه مسئله‌ها',background:'#fff',color:'#000',font:19,align:'center'},
      {rect:[.20,.56,.43,.62],text:'تکلیف‌های آزمایشگاهی',background:'#fff',color:'#000',font:19,align:'center'},
      {rect:[.20,.62,.43,.68],text:'پروژه نهایی',background:'#fff',color:'#000',font:19,align:'center'},
    ];
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===5
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='d63d4b5c01249f0dd295bd5ab96bfdba336fdaf5da802ebce1fea51264725914'
      && layout.translation_sha256==='2a2eb746299711dedff48034e43dd71db74b8f0346b91e204d73d7559cd2557a'){
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
      && layout.translation_sha256==='c6efb1a8d0c6cd4795dcf51f05a0bc636604b1e051d1ff8ee3386f0ab2122cd9'){
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
      && layout.translation_sha256==='6732dcd455295c0ea4889346a8b9cb34b33441de68a7c7d8767574f687a99a08'){
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
      && layout.translation_sha256==='3c3b56dcac41f106e712e175414b57d1358966592de4eb8aceb751112851d20f'){
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
      && layout.translation_sha256==='be6c59b6177e370ace7ca41b5557f6e2f3d474c2749823c70db72f599ed036cb'){
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
      && layout.translation_sha256==='250e9b89f3d5dbbd37838e4d7e9ff2f2691e3360993d6079c3abf4ae29b94a3f'){
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
      && layout.translation_sha256==='d782263a14bfd96537cd6e18059d60dab66cddcdee1003c785981193bcc765a6'){
    const parts=record.image_text[0].fa.split('؛');
    imageTranslations=[
      {rect:[.44,.405,.58,.45],text:'رزرو نمایش',background:'#000',color:'#fff',font:10,align:'center'},
      {rect:[.10,.64,.42,.79],text:parts[2].trim(),background:'#000',color:'#fff',font:19,accents:[{text:'جلوه‌های بصری هالیوود',color:'#f10d36'}]},
      {rect:[.10,.81,.42,.95],text:record.image_text[1].fa,background:'#000',color:'#fff',font:9},
    ];
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===17
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='0d8d9f5bc6fec33c8708fb7f8f1f036acc6898d27ab4a67ed476541941c50dd2'
      && layout.translation_sha256==='a808d58607002fb795e2868f5af5191b0499c6e73e49dc699f60f52a56fca36f'){
    const heading=record.image_text[0].fa.split('؛').at(-1).trim();
    const body=record.image_text[1].fa.split('؛')[0];
    imageTranslations=[
      {rect:[.125,.46,.46,.68],text:heading,background:'#fff',color:'#171717',font:25},
      {rect:[.125,.70,.46,.77],text:body,background:'#fff',color:'#777',font:9},
      {rect:[.13,.87,.27,.92],text:'درخواست نمایش',background:'#00bf57',color:'#fff',font:10,align:'center'},
      {rect:[.29,.87,.39,.92],text:'نمونه‌های بیشتر',background:'#fff',color:'#f33b47',font:10,align:'center'},
    ];
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===19
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='a2e55bbba08b55ea9c01ab2d28267bedaf666acd16d3f971a809ca68b67fde8b'
      && layout.translation_sha256==='cd36588eda1926328aa1293054ac487b75906335b99c8c78ede6b202899e448c'){
    const [heading,description]=record.image_text[0].fa.split('؛');
    imageTranslations=[
      {rect:[.48,.04,.91,.11],text:heading,background:'#5c74cb',color:'#fff',font:25,align:'center'},
      {rect:[.45,.12,.95,.22],text:description.trim(),background:'#5c74cb',color:'#fff',font:13,align:'center'},
      {rect:[.455,.43,.78,.65],text:record.image_text[1].fa,background:'#899ad5',color:'#fff',font:12},
      {rect:[.49,.86,.65,.93],text:record.image_text[2].fa,background:'#899ad5',color:'#fff',font:9},
    ];
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===20
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='2e37398adde30d4ea9d1eb093600f809eea2d545f558149912581637fd7d32de'
      && layout.translation_sha256==='b66df3f72328650bd5fbc862348bcf0a04a91c6edf8d63a4a3d0af5824f5e849'){
    imageTranslations=[
      {rect:[.07,.69,.63,.89],text:'تبدیل رایگان آنلاین عکس به صفحه رنگ‌آمیزی',background:'linear-gradient(105deg,#f69ca9,#f98997)',color:'#fff',font:32},
    ];
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===6
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='54b822b737f3a34ef6cc599bf9919c7e348900d49d62c72a87cfd38fc35506c2'
      && layout.translation_sha256==='f115323bd73d34d629c3ad8f9e6209183632a32ef594c4c8920bd72483e38b6f'){
    imageTranslations=[
      {rect:[.30,.28,.70,.40],text:'ابزار هوش مصنوعی توسعه‌دهندگان با گسترده‌ترین پذیرش در جهان',background:'linear-gradient(#0c033c,#12085a)',color:'#fff',font:25,align:'center'},
      {rect:[.445,.425,.555,.45],text:'آغاز کار با Copilot',background:'#fff',color:'#111',font:9,align:'center'},
    ];
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===10
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='872bff1955f2607d81954fc8c98cba5d588656411a0531fd803e8f38568f4294'
      && layout.translation_sha256==='7cab9e252705a05921d0452fed8dc3518d197ffdd4682c0c0ad81881d6cb513c'){
    imageTranslations=[
      {rect:[.27,.335,.67,.39],text:'یک پرسش پزشکی بپرسید…',background:'#303030',color:'#c7c7c7',font:10},
      {rect:[.30,.70,.70,.75],text:'پلتفرم پیشتاز اطلاعات پزشکی',background:'#1b1b1b',color:'#fff',font:15,align:'center'},
    ];
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s01' && record.number===34
      && sourceIdentity.sourceSha256==='33f07553c15df2d9f37960fd45d54e5df3ab795eacea91a82af3cc1ffea9c593'
      && record.source_text_sha256==='b52364a06033fe1870847d084611c5451a3a10e528ac69c2f03a2791c4f4bde0'
      && layout.translation_sha256==='f80efe88defb697c5d8bc301a694afb3d19bb785b9a38a88ee41dcf926789417'){
    imageTranslations=[
      {rect:[.205,.625,.30,.705],text:'مطالعه مسئله',background:'#f2f2f2',color:'#171717',font:13,align:'center'},
      {rect:[.375,.625,.47,.705],text:'نوشتن قواعد',background:'#f6cecf',color:'#171717',font:13,align:'center'},
      {rect:[.595,.65,.68,.69],text:'ارزیابی',background:'#fff',color:'#171717',font:14,align:'center'},
      {rect:[.397,.83,.49,.91],text:'تحلیل خطاها',background:'#f2f2f2',color:'#171717',font:13,align:'center'},
      {rect:[.588,.38,.68,.47],text:'راه‌اندازی!',background:'#f2f2f2',color:'#171717',font:13,align:'center'},
    ];
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===1
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='51bf4efc0fbcc06209909fbb5e90aa2c2ad1b22dadfa3693e88af33c13926334'
      && layout.translation_sha256==='d01e719b215acb598e6f5d80d8eaf8857756d441a2f7e6a9b5e16eddbfc9d49a'){
    const slots={0:[.08,.22,.92,.32],1:[.05,.33,.95,.52],2:[.10,.61,.90,.67],3:[.05,.68,.95,.74],4:[.20,.75,.80,.81]};
    const fonts={0:48,1:42,2:28,3:22,4:23};
    for(const region of regions){const index=region.block.source_lines[0];if(slots[index]){region.slot=slots[index];region.font=fonts[index];region.align='center';region.keepTermsTogether=true;}}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && [3,4,9].includes(record.number)
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='f10f15723e5a9398fe5aac522d18cc8252d563c7d620555b27f915a536854f43'
      && layout.translation_sha256==='33c83593f3460c5e184a5534ee29466b6edf3c9e456e4b14ad8e85090480e271'){
    for(const region of regions){if(region.block.source_lines[0]===0){region.slot=[.60,.105,.925,.20];region.align='right';}}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===2
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='a9a67f6e81b05125d6e74f2676bd4180b7f015dabc06ab3ea8cdda2167c89c35'
      && layout.translation_sha256==='b332662cf563cad86fbbe3676bf3794913875154a09a211f1b2bb1c5869cb580'){
    const vertical=[[.105,.215],[.27,.335],[.335,.395],[.395,.455],[.455,.515],[.515,.575],[.63,.695],[.695,.765],[.82,.89]];
    for(const region of regions){const index=region.block.source_lines[0];const [top,bottom]=vertical[index];const nested=[2,3,4,5,7].includes(index);region.slot=[.05,top,nested?.88:.94,bottom];}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===6
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='f6f11ea7d4965b4c5f5be9dd187202f219133da7b01eba95d2dd2d0728688852' && layout.translation_sha256==='a3b4c638594616a77fd1be22c379df02e41c93e662d559bd25d0c97160b32914'){
    const slots={2:[.03,.705,.48,.83],5:[.03,.84,.48,.99],8:[.52,.705,.98,.83],11:[.52,.84,.98,.99]};
    for(const region of regions){
      const index=region.block.source_lines[0],slot=slots[index];if(slot)region.slot=slot;
      if(index===5)region.manualAccents=[{text:'نوبل ۱۹۰۶',color:'#ffc000'},{text:'سلول‌های مستقل',color:'#ffc000'},{text:'نورون',color:'#ffc000'}];
      if(index===11)region.manualAccents=[{text:'نوبل ۱۹۳۲',color:'#ffc000'},{text:'شلیک همه یا هیچ',color:'#ffc000'}];
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===7
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='8b11b7ea0307482bb13cc03c5b7201a3c374838a70d1ac3a6bce4fd2a317aeff' && layout.translation_sha256==='03c1668840dcbcc7f33a9db2425a7925ef17eb142664480a3c2f17d7f343da1a'){
    const slots={3:[.03,.84,.48,.99],11:[.52,.84,.98,.99],14:[.67,.29,.98,.48],17:[.67,.70,.98,.78]};
    for(const region of regions){const slot=slots[region.block.source_lines[0]];if(slot)region.slot=slot;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===8
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='5fe7e43e304598fdd8f19b618a43e0e1e164b9d0aa28408b08f2d2dc1d9a3b09' && layout.translation_sha256==='dfa211ce4cc357f19dc0bfd2e8a37d4d017d9b20e421c88291a81849824fc9aa'){
    for(const region of regions)if(region.block.source_lines[0]===1){region.slot=[.18,.92,.85,.98];region.linkTarget='https://youtu.be/oa6rvUJlg7o?t=8';}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===10
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='7486dbcc6c89a18b80591440d4c6acf94edabab3efdecaaad11b904f69b2a9b4' && layout.translation_sha256==='d6979a87748b9cedd820db2ea53fcfaf56a28b3f0edbcb92e46fcf3e8282529a'){
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
      if(index===0){region.slot=[.076,.06,.95,.245];region.font=38;}
      if(index===2){region.slot=[.076,.40,.61,.51];region.font=27;region.color='#ffffff';region.manualAccents=[{text:'مدل نورون زیستی',color:'#ffc000'}];}
      if(index===3){region.slot=[.076,.55,.94,.66];region.font=28;region.color='#ffffff';region.manualAccents=[{text:'رایانه دیجیتال',color:'#ffc000'}];}
      if(index===4){region.slot=[.076,.70,.95,.96];region.font=26;region.color='#ffffff';region.manualAccents=[{text:'الگوی یادگیری «نورون‌هایی که با هم شلیک می‌کنند، به هم متصل می‌شوند»',color:'#ffc000'}];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===12
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='6e968bc91ce539b3b39add82476a1d1c322f309b89c4935a38b35664df816d29' && layout.translation_sha256==='a4de45b2e6544674632748b650e4346dde39df56db77bfd4a6f786da34198acd'){
    const slots={1:[.01,.70,.22,.88],4:[.01,.35,.22,.55],8:[.41,.25,.99,.36],9:[.46,.36,.98,.445],11:[.42,.445,.98,.55],13:[.44,.88,.95,.96]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];
      if(i===8){region.color='#ffffff';region.manualAccents=[{text:'منطق گزاره‌ای (Propositional Logic)',color:'#ffc000'}];}
      if(i===9){region.color='#ffffff';region.manualAccents=[{text:'درستی یا نادرستی',color:'#ffc000'}];}
      if(i===13){region.linkTarget='https://sites.millersville.edu/bikenaga/math-proof/truth-tables/truth-tables.html';region.clearRect=[.43,.875,.96,.965];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===13
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='faa6a39540825108d5432a3596d6c0183876b5d0a738af123515a321bb2f6e78' && layout.translation_sha256==='fb748a988caaa594d80740695ad0c8deb4b1243ab53728394c4b41527a692e18'){
    const slots={1:[.04,.27,.97,.59],8:[.04,.60,.97,.68],9:[.04,.70,.97,.75],10:[.04,.75,.97,.81],11:[.04,.81,.97,.86],12:[.04,.86,.97,.92]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];if(i>=9&&i<=12)region.font=17;
      if(i===1){region.color='#ffffff';region.manualAccents=[{text:'شناخت ما از جهان',color:'#ffff00'},{text:'ناقص',color:'#ffff00'},{text:'این ناآگاهی',color:'#00ff00'},{text:'شناخت ما را سودمند می‌کند',color:'#00ff00'},{text:'نقش مغزها',color:'#ffc000'},{text:'هر ایده و هر احساس با فعالیت درون آن شبکه تحقق می‌یابد',color:'#ffc000'},{text:'با تعیین شبکه',color:'#00ffff'}];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===14
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='ea0f2d1cf3fad3cd038d3957f552026ffabc0e2fbb8bf8bd40489a59303ef502' && layout.translation_sha256==='e86d00ee633bcd55c2ed40a2633fa4a7bed7c36e089c3f57f48d6b9eb820cf62'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===1){region.slot=[.04,.25,.97,.39];region.color='#ffffff';region.manualAccents=[{text:'جست‌وجوی فراگیر (Brute-force Search)',color:'#ffc000'},{text:'حافظه رایانه‌ها محدود است',color:'#ffc000'}];}
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
      && record.source_text_sha256==='92ebeaf9627cb289ee35656e664ee26cb08116aee10cf6caba64d756550fe2eb' && layout.translation_sha256==='091856640710fc89acdf5b2d62ec59890ef09aaa0fa139907de93cbb8e4b6455'){
    const slots={1:[.04,.25,.65,.36],2:[.04,.41,.33,.50],3:[.06,.62,.22,.70],4:[.07,.76,.255,.83],5:[.61,.81,.98,.99],9:[.02,.86,.59,.98]};
    for(const region of regions){const i=region.block.source_lines[0],slot=slots[i];if(slot)region.slot=slot;if([1,4,5,9].includes(i))region.font*=.9;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===17
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='957326fb8e021185076aa7cdfc672eb0e219a8358f2f462e66729c67a3fb6f93' && layout.translation_sha256==='716a57c92f8d9c752c024816b8d82b2d956c12b31db37769b8841fce848a54e0'){
    const slots={1:[.04,.21,.96,.315],3:[.75,.55,.99,.72],5:[.42,.90,.53,.96],6:[.20,.66,.33,.70],7:[.01,.81,.245,.97]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];if(i===6)region.rotate=-90;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===19
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='7a6eb9e84aafb5aef3adefcb2ce8d3b9308b736058d2b8c61b7059adc048a3c9' && layout.translation_sha256==='59793b3f5a5929105a03e7b9f3d72b678d3912e78a16a288185a3ccbda7abb53'){
    const slots={1:[.04,.25,.97,.39],4:[.65,.49,.99,.60],6:[.01,.78,.31,.89],8:[.65,.78,.99,.89],10:[.10,.48,.31,.60]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];
      if(i===0){region.slot=[.04,.08,.98,.22];region.font=30;}
      if(i===4){region.clearRect=[.65,.54,.82,.585];region.maskSourceLines=[5];}
      if(i===8){region.clearRect=[.65,.83,.82,.875];region.maskSourceLines=[9];}
    }
  }
  const trueModelHashes={21:'cb239412a46c2cbd9aacd70783d609f63fd3296bfffe3e1eea9345f4e77da60d',22:'fda54424bca8df574d45802651899c059b02a47326392fc6cc2e8a9a306f5bf3',23:'ad3e7d9148433bedfffed0a1c9e0885856574bfc85900ec8406af537afbc5f3a',24:'ab60a838f7f61876bc4199fd0547f7cb1a9dee169c74cf062be23ea302baa54f'};
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
      && layout.translation_sha256==='00e7949f33d3b1b553762f21e9f024f3db45f8c4afb3fe36d46c76d6f7a60331'){
    const slots={0:[.04,.08,.98,.22],1:[.04,.25,.34,.35],10:[.49,.70,.97,.81]};
    for(const region of regions){const slot=slots[region.block.source_lines[0]];if(slot)region.slot=slot;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===20
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='51c21430a260eb3982d4b11ea5fcfc837b9ed629e162530c6ff066409c6ddd41'
      && layout.translation_sha256==='1dfed53ba066a5a7d3c4c1f2acde4f7981ddf85035f7389703ab29aaefec2a99'){
    const slots={0:[.04,.08,.96,.22],1:[.04,.24,.96,.40],3:[.04,.435,.96,.51],4:[.06,.50,.45,.56],5:[.08,.56,.60,.645],6:[.08,.66,.45,.74],7:[.04,.85,.96,.96],9:[.58,.765,.97,.845],11:[.68,.56,.98,.615],12:[.68,.615,.98,.68]};
    for(const region of regions){const i=region.block.source_lines[0],slot=slots[i];if(slot)region.slot=slot;if(i===0)region.font=30;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===25
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='2cad152c61a38d12e6a4731bef915519043cc4e3cfcc15ff0e08aac823119df6'
      && layout.translation_sha256==='5fae403bc76081cd993dc3f4878d6d2c2b0a0a5eec47c019f02c5ed23d8052b0'){
    const slots={0:[.04,.08,.98,.22],1:[.04,.25,.96,.34],6:[.15,.66,.39,.735],7:[.15,.735,.39,.805],8:[.40,.68,.94,.80]};
    for(const region of regions){const slot=slots[region.block.source_lines[0]];if(slot)region.slot=slot;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===27
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='acdf48d99db30f58775e656099087d394641548e5b00a128e1af063e75f83247'
      && layout.translation_sha256==='615c9587313af8fdaf876b51e7dd6053367a7e31f0be17c8cb1059f5409f2dbe'){
    const slots={0:[.04,.08,.98,.22],10:[.04,.25,.34,.35],6:[.08,.57,.75,.65]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];
      if(i===10){region.maskSourceLines=[10];region.clearRect=[.07,.26,.34,.35];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===28
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='8b2400cf470e8ddd46a4c7b622788970f16fa12104f0f5d919f6b742f5f2ddee'
      && layout.translation_sha256==='c0fc44732cee3bf689c35ab79d1f759958a6b622994a126863b230092767ac9c'){
    const slots={0:[.04,.08,.98,.22],1:[.04,.25,.96,.34],6:[.15,.66,.39,.735],7:[.15,.735,.39,.805],8:[.40,.68,.94,.80]};
    for(const region of regions){const slot=slots[region.block.source_lines[0]];if(slot)region.slot=slot;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===29
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='a98650e960cb99d33876a8b47dbdbcd4f036bb396a70b5c47bbb4638691f3bbb'
      && layout.translation_sha256==='43be63eebdea3587ad69e8a82990dfd673d5759da2f6b0969c81bac93affd985'){
    const slots={0:[.04,.08,.98,.22],10:[.04,.25,.34,.35],6:[.49,.70,.97,.81]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];
      if(i===10){region.maskSourceLines=[10];region.clearRect=[.07,.26,.34,.35];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===30
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='022d53bce28d324c6003bccb7c1d4bb189d4a44047d9d5a65b1f914dfe85a12b'
      && layout.translation_sha256==='60c4d77388105c362083b80af11191ca9a63737e66cd78ee20461e87260d272f'){
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
      && layout.translation_sha256==='02ef1f002e6587995f48eaa45a876464687fb2aab130e3b5aa155e53c1f9f3d5'){
    const slots={3:[.02,.08,.98,.22],0:[.02,.77,.49,.92],2:[.02,.92,.49,.98],4:[.51,.77,.98,.92],6:[.51,.92,.98,.98]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];if(i===3)region.font=30;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===34
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='fcc1d6b4edf7711202471af906a40b0be01dfda1b1baa2799ecd1291d20dbfa0'
      && layout.translation_sha256==='427ae935c2c94d266656fd0f842616a49599091c456725f19eb473a1617ee5e2'){
    for(const region of regions){const i=region.block.source_lines[0];if(i===0)region.slot=[.04,.08,.98,.22];
      if(i===1){region.slot=[.04,.34,.96,.80];region.color='#ffffff';region.manualAccents=[{text:'بررسی ساختارهای فیزیکی و اصول عصب‌پویایی مربوط است که زیربنای «هوش طبیعی» هستند',color:'#ffc000'},{text:'پرسپترون پیش از هر چیز مدلی از مغز است',color:'#ffc000'},{text:'ما را قادر می‌کند شرایط فیزیکی پدیدآمدن ویژگی‌های روان‌شناختی گوناگون را تعیین کنیم',color:'#ffc000'}];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===35
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='b97544e601ee854e01a65de63b54c46ee0f8c7fc81079f10ff3cacfc0deac74c'
      && layout.translation_sha256==='7732a5a041d9f977ea3bb484d333924da0136640e69d7c9d28f9554216279f8b'){
    const slots={0:[.03,.055,.46,.25],2:[.03,.49,.46,.57]};
    for(const region of regions){const slot=slots[region.block.source_lines[0]];if(slot)region.slot=slot;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===37
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='7d0e1385360f7dbc13695b23d3722c295f594c2d58bbcfb6e870b16af434ba2f'
      && layout.translation_sha256==='8f96107d7e614b0c8c5d730b9aadceab29fda4330ae92f626adc8a44f4af471b'){
    const slots={0:[.03,.08,.98,.22],1:[.015,.22,.65,.57],10:[.015,.57,.65,.655],11:[.015,.655,.65,.93],18:[.015,.94,.65,.99],20:[.67,.23,.99,.29]};
    for(const region of regions){const i=region.block.source_lines[0],slot=slots[i];if(slot)region.slot=slot;if(i===1||i===11){region.scrollable=true;region.color='#ffffff';}
      if(i===1)region.manualAccents=[{text:'ظرف سه تا هشت سال، ماشینی با هوش عمومی یک انسان معمولی خواهیم داشت',color:'#ffc000'},{text:'ظرف چند ماه در سطح نابغه خواهد بود و چند ماه بعد، قدرت‌هایش محاسبه‌ناپذیر خواهند شد',color:'#ffc000'},{text:'اگر خوش‌شانس باشیم، شاید تصمیم بگیرند ما را به‌عنوان حیوان خانگی نگه دارند',color:'#ffc000'}];
      if(i===11)region.manualAccents=[{text:'جدول زمانی او شاید تاحدی آرزومندانه باشد؛ «15 سال به ما وقت بدهید»',color:'#ffc000'},{text:'سومین انقلاب صنعتی را رقم بزند، جنگ و فقر را از میان ببرد و قرن‌ها پیشرفت در علم، آموزش و هنر را در هم فشرده کند',color:'#ffc000'},{text:'این موهبت به گولم',color:'#ffc000'}];}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===39
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='58ccbab42c7bec48abd230b06de28b7663667df2e405bd517c6e4c264bc98409'
      && layout.translation_sha256==='ada84ab18d0728abcbb10733bc838055bfa7679e7b71522a98d875e04780be2c'){
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
      && layout.translation_sha256==='e2dbfd81eb74316833e11250dc45924d0283972276cfec25660129f4a4e64478'){
    const slots={0:[.04,.08,.98,.22],1:[.05,.28,.96,.84],12:[.05,.85,.96,.93]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];
      if(i===1){region.color='#ffffff';region.manualAccents=[{text:'نتیجه‌ها… عموما ناامیدکننده بودند',color:'#ffc000'},{text:'احساس اجبار درمانگرانه',color:'#ffc000'},{text:'زدودن آنچه می‌ترسیدیم نخستین سایه‌های یک برداشت نادرست «کل‌گرایانه» یا «گشتالتی» باشد',color:'#ffc000'}];}
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
      && layout.translation_sha256==='4b73b184b48f26f525c26b2111322e5dc02fe2c33095bcaddcb9a18c14c9813f'){
    const slots={0:[.03,.08,.98,.22],10:[.10,.82,.90,.96]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];if(i===0)region.font=30;
      if(i===10){region.color='#ffffff';region.manualAccents=[{text:'داوطلب',color:'#ffc000'},{text:'خطی',color:'#ffc000'}];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===45
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='e6a1cd42063ff8e2a9ffe805d8a0f434201629bdeeb295ef73342265b0b7581a'
      && layout.translation_sha256==='f62a52f171a7fe3e31c9e0f58ec4e95e92b14237f3e260775827b685974c084f'){
    for(const region of regions){if(region.block.source_lines[0]===0){region.slot=[.02,.44,.39,.66];region.color='#ffffff';region.manualAccents=[{text:'با پرسپترون تک‌لایه (Single Layer Perceptron) ناممکن است',color:'#ffc000'}];}}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===46
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='b9e9c21f5700b8a6d2e7fdf31710ec221de393d1cee4c86946448ddd4775180a'
      && layout.translation_sha256==='c0fbadc713e040610ba2a2a325149cf6e6cf856173f140f4aec6d0319cebe89e'){
    const slots={0:[.03,.08,.98,.22],1:[.53,.41,.97,.53],2:[.53,.57,.97,.72]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];if(i===0)region.font=29;
      if(i===1){region.color='#ffffff';region.manualAccents=[{text:'نهادهای تامین مالی',color:'#ffc000'}];}
      if(i===2){region.color='#ffffff';region.manualAccents=[{text:'پژوهشگران',color:'#ffc000'}];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===47
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='8586d2b7414ae644105a506666c4d782224c365e4bea2579025183b27a61f57a'
      && layout.translation_sha256==='5052ee48c66976fef819e6b854cbc4fa481c87695c3fe2f9a227c2da8c754f5a'){
    for(const region of regions){const i=region.block.source_lines[0];if(i===0)region.slot=[.04,.08,.63,.22];
      if(i===1){region.slot=[.03,.28,.64,.87];region.color='#ffffff';region.manualAccents=[{text:'پیشرفت به‌سبب نبود نظریه‌های بنیادی کافی، از پیش عملا متوقف شده بود',color:'#ffc000'},{text:'درس‌های این کتاب به حوزه نیروی تازه دادند',color:'#ffc000'},{text:'هیچ‌کس نتوانسته بود توضیح دهد چرا آن‌ها می‌توانستند بازشناسی بعضی انواع الگوها را یاد بگیرند و بعضی دیگر را نه',color:'#ffc000'}];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s02' && record.number===49
      && sourceIdentity.sourceSha256==='fd1415e6b0888e50a952c805477237eb48aa145a85926a931f435b6f112dc477'
      && record.source_text_sha256==='08a245281a6684133e9041e76e7b78b26955aa9beb0c431eb262501e39422390'
      && layout.translation_sha256==='45b154890ff3d145e4484f62c82399ade0d229d520c6709df2f68a34b5462f0f'){
    const slots={0:[.04,.08,.98,.22],1:[.04,.46,.96,.58],3:[.04,.64,.96,.76]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];
      if(i===1){region.color='#ffffff';region.manualAccents=[{text:'راهنمای تکلیف آزمایشگاهی 1',color:'#ffc000'}];}
      if(i===3){region.color='#ffffff';region.manualAccents=[{text:'مطالب خواندنی تعیین‌شده',color:'#ffc000'}];}
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
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===26
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='c28428154a1b18f3a976cac0ccd29eedfc8f9cf07be95b9c2dd50b139e9c782c'
      && layout.translation_sha256==='5b1e02f1d1300cb8e23f7fbf489cf36a5409fe66a98a53f9aa0a6f43e7e15335'){
    const slots={0:[.05,.10,.97,.21],1:[.08,.26,.96,.32],2:[.10,.32,.96,.61],8:[.08,.61,.96,.67],9:[.10,.67,.96,.76],11:[.10,.76,.96,.81],12:[.08,.81,.96,.87],13:[.10,.87,.96,.94]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];region.font=i===0?33:([1,8,12].includes(i)?19:17);if(i===2){region.color='#ffffff';region.manualAccents=[{text:'روش تصحیح خطای پس‌انتشاری',color:'#ffc000'},{text:'شاید بهبود چشمگیری در عملکرد حاصل شود',color:'#ffc000'}];}}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===27
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='1d3838ef5880e2a72216250d03f4f9c577d7009867b981b0a2159efe58a3c020'
      && layout.translation_sha256==='5e007360ec6865d5bce3616732269fe38c32c074b25de8c9e3d306c8f0233f86'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.10,.95,.21];region.font=33;}
      if(i>=1){region.slot=[.075,region.rect[1]-.01,.96,region.rect[3]+.025];region.font=20;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===28
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='54f6575979fcf155fd709f8b1d1f738e28dc6b794b6928bd02897b3893ca7fc2'
      && layout.translation_sha256==='a4b6ee1723d10bc31eef14a2cb94d1d9c2a3393d00e8fb240ade55587541bb5b'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===5){region.slot=[.05,.05,.95,.25];region.font=29;region.align='center';region.manualAccents=[{text:'رواج یافت',color:'#ffc000'}];}
      if(i===0){region.slot=[.03,.76,.54,.92];region.font=17;region.align='center';}
      if(i===2){region.slot=[.59,.74,.99,.97];region.font=15;region.align='center';}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===30
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='26fceaaa40b6d7aad160c365a342806082d09eb6893c0f397cd48b1ca2d02069'
      && layout.translation_sha256==='3bd90912f82c53c1908defefe54292343d9e18dd3b37b17e755a3fa856e966ae'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.06,.96,.235];region.font=29;}
      if(i===2){region.slot=[.05,.26,.96,.33];region.font=18;region.manualAccents=[{text:'غیرخطی',color:'#ffc000'}];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===31
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='a6e45ab6bd80f457cafc9d7d27553c0c35c5f30491eda974f28b6a48f2e5a16a'
      && layout.translation_sha256==='3d83dd9d86ce376d54f0f3f67b79c12892183bf654e0e8e4c7473d8493467866'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.06,.96,.235];region.font=29;}
      if(i===2){region.slot=[.05,.26,.96,.33];region.font=18;region.manualAccents=[{text:'غیرخطی',color:'#ffc000'}];}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===32
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='b201815716b1b07e7d6c081dbccc009402b464ec963270656759e5bf555b703f'
      && layout.translation_sha256==='d578c46b3e4b88e91bf28c90584f4084bac7fcced39d2a51443c4ac033de6bf2'){
    const slots={0:[.05,.06,.96,.235],2:[.05,.26,.97,.32],3:[.05,.33,.97,.39],5:[.15,.42,.53,.47],19:[.15,.47,.68,.52],14:[.535,.59,.98,.65],15:[.535,.65,.98,.75],17:[.535,.75,.98,.80],18:[.535,.81,.98,.87]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];if(i===0)region.font=29;else if(i===2||i===3)region.font=17;else if(slots[i])region.font=14;if(i===2){region.color='#ffffff';region.manualAccents=[{text:'مشتق‌پذیر',color:'#ffc000'},{text:'بهینه‌سازی',color:'#ffc000'}];}if(i===3)region.manualAccents=[{text:'سطح خطا',color:'#ffc000'}];}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===33
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='f593ca5fc89ad22365917dedd237abf53a9df79e3b0b570ff9f4b3f166d5f364'
      && layout.translation_sha256==='c4891cee60d10cca38d9bb7fbf89c8d584733d2349dd511c72d385e46275a0a8'){
    const slots={0:[.05,.06,.96,.235],2:[.05,.26,.97,.32],3:[.05,.33,.97,.39],4:[.02,.84,.98,.90],5:[.06,.90,.97,.97],6:[.16,.54,.31,.64],8:[.73,.44,.90,.55]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];region.font=i===0?29:([2,3].includes(i)?17:14);if(i===2){region.color='#ffffff';region.manualAccents=[{text:'مشتق‌پذیر',color:'#ffc000'},{text:'بهینه‌سازی',color:'#ffc000'}];}if(i===3)region.manualAccents=[{text:'سطح خطا',color:'#ffc000'}];if(i===4)region.manualAccents=[{text:'تمثیل',color:'#ffc000'}];if(i===5)region.manualAccents=[{text:'رویکرد',color:'#ffc000'},{text:'نزول گرادیان',color:'#ffc000'}];}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===34
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='242be6d9fe4be8a170b56c26609dc5df411b1d94e2222729ee2c4b95a447d6a0'
      && layout.translation_sha256==='0bcc76ab7b5d333d2f6a4e89e1f8890e9c0540c0d25a63cf1c0a9fce4063d8af'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.05,.06,.96,.235];region.font=29;region.manualAccents=[{text:'مشتق‌پذیر',color:'#ffc000'}];}
      if(i===2){region.slot=[.40,.50,.63,.66];region.font=16;}
      if(i===5){region.slot=[.76,.45,.98,.55];region.font=15;region.align='center';}
      if(i===7){region.slot=[.76,.65,.98,.72];region.font=15;region.align='center';}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===35
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='e6d3066d47654ed74877afa0c3edafdfde89c8b07fa9c0f4b1da908f6c83fe51'
      && layout.translation_sha256==='b866b59b1250bb80982e85dcda8e8335de21cdf695b5c7ce242602249af3eadd'){
    const slots={0:[.05,.06,.96,.235],3:[.77,.45,.98,.55],5:[.08,.85,.39,.97],7:[.40,.50,.63,.66],8:[.80,.61,.97,.72],11:[.47,.90,.56,.97]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];region.font=i===0?29:14;if(i===0)region.manualAccents=[{text:'مشتق‌پذیر',color:'#ffc000'}];}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===36
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='7e2cf7b861544b3000267aae41bc4f93e2332fc61afa0270b599d0e227133780'
      && layout.translation_sha256==='f22138184686b51fd7b7c5936c4e743856c4f858d8b13dce3967710dd1e2dd49'){
    const slots={0:[.05,.10,.95,.21],1:[.07,.27,.70,.33],2:[.10,.39,.70,.46],3:[.10,.50,.70,.61],5:[.10,.66,.70,.78],7:[.10,.83,.70,.89],8:[.72,.26,.99,.35],10:[.72,.80,.99,.90]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];region.font=i===0?33:([8,10].includes(i)?14:17);if(i===10)region.manualAccents=[{text:'ایده',color:'#ffc000'}];}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===43
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='28498cbb49917a7a3cb90646c4047ed8851de8ee5585e8633f242d3c2f2bf56b'
      && layout.translation_sha256==='b559479446ac9204db22a416dbd0568af3066a253bc784659274363b7d3a8f2d'){
    const slots={0:[.05,.10,.95,.21],1:[.07,.27,.70,.33],2:[.10,.39,.70,.46],3:[.10,.49,.70,.61],5:[.10,.66,.70,.78],7:[.10,.83,.70,.89],8:[.72,.47,.99,.62],11:[.79,.93,.91,.99],12:[.70,.76,.76,.84]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];region.font=i===0?33:([8,11,12].includes(i)?14:17);}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===45
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='a41b327bd27511add6a6604c8255cebd4f8bd71cadaa36f75d7a9faf23a042df'
      && layout.translation_sha256==='458d19c061e0acbeed2da01b20f3df309ff7ecdb463250c0254f10aa57d5dbfc'){
    const slots={0:[.05,.10,.96,.21],1:[.07,.27,.96,.38],3:[.07,.39,.96,.45],7:[.09,.70,.53,.81],9:[.09,.85,.53,.91],10:[.09,.53,.54,.58]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];region.font=i===0?33:([1,3].includes(i)?18:14);if(i===1){region.color='#ffffff';region.manualAccents=[{text:'گرادیان',color:'#ffc000'},{text:'مشتق‌های جزئی برای چند متغیر',color:'#ffc000'}];}if(i===3)region.manualAccents=[{text:'مشتق',color:'#ffc000'}];}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===46
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='47e24f2200d0ffc5f7ab419fe28035b2caa8bb70db69481d8bba12a68241b62b'
      && layout.translation_sha256==='8e85fe1ccee759d8d46c96e1c0e8ae762689e117c5dd1d6420ebd75cdd1aaf98'){
    const slots={0:[.05,.10,.96,.21],1:[.07,.27,.96,.38],3:[.07,.39,.96,.45],8:[.09,.53,.54,.58],14:[.09,.72,.54,.77],15:[.09,.77,.54,.83],16:[.09,.83,.54,.93]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];region.font=i===0?33:([1,3].includes(i)?18:14);if(i===1){region.color='#ffffff';region.manualAccents=[{text:'گرادیان',color:'#ffc000'},{text:'مشتق‌های جزئی برای چند متغیر',color:'#ffc000'}];}if(i===3)region.manualAccents=[{text:'مشتق',color:'#ffc000'}];}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===2
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='4544921747d18808b5c990cc7d584d2cfa755f0125df556e37d8395d3d671f92'
      && layout.translation_sha256==='ecff732a3b478a95c85e5132fdd64fc1179a453fb6cef4a9b99983ecabf36cc7'){
    const slots={0:[.05,.10,.95,.20],1:[.08,.27,.94,.33],2:[.11,.335,.96,.39],3:[.11,.39,.96,.445],4:[.11,.445,.96,.50],5:[.11,.50,.96,.555],6:[.08,.63,.94,.69],7:[.11,.70,.96,.76],8:[.08,.82,.94,.88]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];region.font=i===0?36:([1,6,8].includes(i)?25:21);}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===47
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='6d80a5e0824a451c2b95a6e52d38ea78895a9a6d9d43b02de94ed05d0c9622b9'
      && layout.translation_sha256==='3b863af7a87abf49688b4ac7f44d661b2d95a991454fe7b15e0c00cd85d477a9'){
    const slots={0:[.05,.10,.96,.21],1:[.07,.27,.96,.38],3:[.07,.39,.96,.45],8:[.09,.53,.54,.58],14:[.09,.72,.56,.765],15:[.09,.765,.56,.805],16:[.09,.805,.56,.845],17:[.09,.845,.56,.885],18:[.09,.895,.56,.94],19:[.09,.94,.56,.99]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];region.font=i===0?33:([1,3].includes(i)?18:12);if(i===1){region.color='#ffffff';region.manualAccents=[{text:'گرادیان',color:'#ffc000'},{text:'مشتق‌های جزئی برای چند متغیر',color:'#ffc000'}];}if(i===3)region.manualAccents=[{text:'مشتق',color:'#ffc000'}];}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s03' && record.number===48
      && sourceIdentity.sourceSha256==='92289c9dc36c9774490e123c0be7ed7980770f2fb5f13b7bdfbb391937e452b0'
      && record.source_text_sha256==='d1cd555e1f477e529f92ebdd06bed212c088786083ffb777569d497858d8fde3'
      && layout.translation_sha256==='121c4a0c62c870d136a478bdf5b26320d3057e86f81450905890f0a3083a2115'){
    const slots={0:[.05,.10,.96,.21],1:[.07,.27,.96,.38],3:[.07,.39,.96,.45],8:[.09,.53,.54,.58],14:[.09,.72,.56,.77],15:[.09,.78,.56,.87],17:[.09,.87,.56,.91]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i])region.slot=slots[i];region.font=i===0?33:([1,3].includes(i)?18:13);if(i===1){region.color='#ffffff';region.manualAccents=[{text:'گرادیان',color:'#ffc000'},{text:'مشتق‌های جزئی برای چند متغیر',color:'#ffc000'}];}if(i===3)region.manualAccents=[{text:'مشتق',color:'#ffc000'}];}
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
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && record.number===2
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='8611e0e0ce4fdd5e231bf198538073ee93da99da61d59cf90c61f2cc30d5f819'
      && layout.translation_sha256==='dce6d92f50da1911ffb44c1d8493253c52cad650ba8888b17345ead51b4c0d8e'){
    const slots={0:[.04,.10,.96,.21],1:[.04,.26,.96,.33],2:[.04,.33,.92,.39],3:[.04,.39,.92,.45],4:[.04,.45,.92,.51],5:[.04,.51,.92,.57],6:[.04,.62,.96,.69],7:[.04,.69,.92,.76],8:[.04,.81,.96,.89]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i]){region.slot=slots[i];region.align='right';region.font=i===0?34:i===1||i===6||i===8?23:19;}}
  }
  if (sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && record.number===12
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='e9d8b7a8bf6c31d8c782e49b48b13ceb8b497293093571a07da18a6b360b7f9f'
      && layout.translation_sha256==='d228be82837246307e0255dd3e52e4dd6266736e334101c2e0a6a3ba83428081') {
    const slots={0:[.04,.09,.97,.235],1:[.015,.40,.34,.49],2:[.015,.49,.34,.57],4:[.46,.40,.745,.49],5:[.46,.49,.745,.57],7:[.46,.57,.745,.70],10:[.04,.26,.96,.36]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i]){region.slot=slots[i];region.font=i===0?32:i===10?20:18;}if(i===0||i===1||i===4)region.keepTermsTogether=true;if(i===10)region.manualAccents=[{text:'افزودن حالت پنهان',color:'#ffc000'}];}
  }
  if (sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && record.number===13
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='aaecda53dc8046c4b654f3082dfc3eab7a002066129d774e815a216b12801df9'
      && layout.translation_sha256==='5cdc58c70e62d76905e151731a335a0d86f3c8fc05ea56beed4473e50b4f4f9a') {
    const slots={0:[.04,.09,.97,.235],1:[.065,.40,.39,.51],6:[.07,.68,.145,.78],8:[.17,.68,.235,.78],10:[.235,.68,.335,.78],12:[.07,.52,.28,.57],13:[.48,.41,.74,.48],14:[.48,.48,.74,.57],16:[.48,.57,.74,.70],19:[.04,.26,.96,.36]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i]){region.slot=slots[i];region.font=i===0?30:i===19?18:i===1?17:i>=6&&i<=12?13:16;}if(i===0)region.keepTermsTogether=true;if(i===19)region.manualAccents=[{text:'افزودن حالت پنهان',color:'#ffc000'}];}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && record.number===14
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='58ed64d51139f7f36e374a9ef97ce219384ee3d246aaad2a30c502ed0b65a74e'
      && layout.translation_sha256==='9004cfdcb725c2fcefffb69c33bd08231d151952bc9b3d9e7bb0501c63ea779a'){
    for(const region of regions)if(region.block.fa.startsWith('• ')){region.slot=[.05,.23,.97,.34];region.font=23;region.manualAccents=[{text:'افزودن حالت پنهان',color:'#ffc000'}];}
  }
  const s04Unrolled = {
    15:['58ed64d51139f7f36e374a9ef97ce219384ee3d246aaad2a30c502ed0b65a74e','d4e001fec2823dc3813a0d802b3617efccfaacf86481a0e18571a5321f65e804'],
    16:['5605488fd9bd2cd7352a205b14ac64ecf37b6827dec615023844f0810851e872','d72366e8f7c87c51feef6a199f079b060b27b4b77ec0910d047d37d2db209516'],
    17:['fee7296cda17c18dad9d011f8d618bb93efdef9d6da66d27b0366268a2eb1b56','423f55cb74a10fe08157593b16631a1058cf92f4da5ae0443219dbe440922af0'],
    18:['7ccb2c073dac7f3c5493e44b60c022b14a57b0d8a9a693ada38e147e8fe5cd1b','0d1606d4f6d6672fef613381ad511cf3c4f8439437653bc93271b0da5c86e213'],
  }[record.number];
  if(s04Unrolled && sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04'
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256===s04Unrolled[0] && layout.translation_sha256===s04Unrolled[1]){
    for(const region of regions){
      if(region.block.fa.startsWith('• ')){region.slot=[.05,.23,.97,.34];region.font=23;region.manualAccents=[{text:'افزودن حالت پنهان',color:'#ffc000'}];}
      if(record.number===18 && region.block.source_lines[0]===4){region.slot=[.04,.91,.96,.97];region.font=16;}
    }
  }
  const s04EquationPage = {
    20:['4455d89ddc5a7631938d69d35dcb803fde488ea095877b8c86025b2d143e9887','b5bf499c0e849bccad923032cc5ec5d2755e95f66caa49856ef15a98d7fb5a8f'],
    21:['0627decd1b300c238a7a1a9dedeaa81545ee43f6af0bfcd04985a2a6bda596ee','de8c88447ffd4d892a7bc2133760200f6cad58b2da9eea80ac660a3c1879d601'],
  }[record.number];
  if(s04EquationPage && sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04'
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256===s04EquationPage[0] && layout.translation_sha256===s04EquationPage[1]){
    const slots={6:[.06,.68,.14,.79],8:[.155,.68,.225,.79],10:[.225,.68,.335,.79],12:[.06,.52,.29,.57]};
    for(const region of regions){const i=region.block.source_lines[0];
      if(region.block.kind==='heading'){region.slot=[.04,.09,.97,.22];region.font=30;}
      else if(i===(record.number===20?1:0)){region.slot=[.06,.40,.37,.51];region.font=17;}
      else if(slots[i]){region.slot=slots[i];region.font=13;}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && record.number===23
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='f411a58014188bf6197229cbfd37912ad6ae94a88e9226571565ffa434a34e4f'
      && layout.translation_sha256==='4b588bac1af1f56b28ed8b4887fe9ef2806a92901ef4bec05610661c47eb7490'){
    const caption=regions.find(region=>region.block.source_lines[0]===3);
    if(caption){caption.slot=[.05,.23,.97,.34];caption.font=20;caption.manualAccents=[{text:'U',color:'#00b050'},{text:'V',color:'#0432ff'},{text:'W',color:'#ff0000'},{text:'بین لایه‌ها متفاوت است',color:'#ffc000'}];}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && record.number===27
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='9bacaf5cc01a0ab665ecd3f39ec648b9e51f59ee7d020ea0027cad7fe7ba59de'
      && layout.translation_sha256==='4c73ac498ec0e05b3d17ffa3717014ef04a1ee3ac015505a6199885b232524dd'){
    const slots={0:[.04,.09,.65,.22],2:[.12,.85,.24,.91],5:[.10,.59,.17,.64],6:[.05,.28,.65,.37],8:[.05,.37,.65,.43],15:[.21,.59,.29,.64],20:[.26,.85,.36,.91],23:[.37,.85,.48,.91],25:[.33,.59,.41,.64],27:[.46,.59,.53,.64],31:[.49,.86,.60,.92],33:[.56,.59,.64,.64],34:[.10,.93,.66,.98]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i]){region.slot=slots[i];region.font=i===0?28:i===6||i===8?15:i===34?16:13;}if(i===34)region.manualAccents=[{text:'حافظه',color:'#ff40ff'}];}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && record.number===28
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='7d982bfcd5fd0660621c2fa65887a8919b0358403fe7968ffb4b34d6c5e00e95'
      && layout.translation_sha256==='8645f17b4d72e6b07960cd66de94d3acd54fc047de4160c3848a2dc816764e9c'){
    const slots={0:[.04,.09,.97,.22],1:[.05,.26,.96,.34],2:[.05,.93,.38,.97],3:[.265,.80,.47,.89],5:[.39,.68,.47,.79],8:[.30,.39,.47,.48]};
    for(const region of regions){const i=region.block.source_lines[0];
      if(slots[i]){region.slot=slots[i];region.font=i===0?29:i===1?19:i===2?20:i===5?12:14;}
      if(i===2)region.manualAccents=[{text:'سه',color:'#ffc000'},{text:'جدید',color:'#ff0000'},{text:'جز',color:'#00b050'}];
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && record.number===29
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='1bbc60eddf13c88486e7b3d480159ae1658e706268de78e911076cf4b77e7eea'
      && layout.translation_sha256==='a2ce043cf352514016a57cd57c8f2bd15336fb219921e21c627ffb89dbab6a1c'){
    const slots={0:[.04,.09,.97,.22],1:[.05,.27,.96,.33],2:[.08,.33,.96,.38],3:[.08,.38,.96,.43],4:[.08,.43,.96,.48],5:[.05,.49,.96,.55],10:[.07,.81,.29,.87]};
    const accents={1:'بردار تک داغ',2:'توکن سازی',3:'واژگان',4:'داده را به بردار تبدیل کنید'};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i]){region.slot=slots[i];region.font=i===0?29:i===1||i===5?19:16;}if(accents[i])region.manualAccents=[{text:accents[i],color:'#ffc000'}];if(i===2)region.ltrSequence='“hello” → “h”, “e”, “l”, “l”, “o”';}
  }
  const s04SoftmaxSlides={
    30:['dd468b0092ae98495015dfb7b4d3943f8f7139f83ed682535bf60d0e52b1eeef','99e27f56949c04ed1433549afc152e64ba6e3e9fb37f7d45190c5c2b8c1c82a6'],
    31:['00d515369ed702b464c2d34553e588b3a4d43e70ba29b7d69bdf3d5158a6d105','497de513ccb327f631d55611677bcfa6aaca6303e42ef9613200ac1e8f54bbac'],
    32:['b48f61ab2558d865529208c7e1ee5d4996d5ca8003b6bc0662f02d262c991f2e','c907b0f47171b07aef73c9d008fe4013afb528c8d294a06a6093061b1b81775b'],
  }[record.number];
  if(s04SoftmaxSlides && sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04'
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256===s04SoftmaxSlides[0] && layout.translation_sha256===s04SoftmaxSlides[1]){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.04,.09,.97,.22];region.font=29;}
      if(i===1){region.slot=[.05,.26,.96,.34];region.font=19;region.manualAccents=[{text:'سافت مکس',color:'#ffc000'}];}
      if(record.number===30 && i===3){region.slot=[.50,.37,.97,.53];region.font=17;}
      if(record.number===31 && i===2){region.slot=[.70,.445,.99,.55];region.font=17;}
      if(record.number===31 && i===13){region.slot=[.57,.90,.76,.96];region.font=14;}
      if(record.number===32 && i===9){region.slot=[.64,.42,.99,.52];region.font=15;}
      if(record.number===32 && i===11){region.slot=[.64,.77,.99,.92];region.font=15;}
    }
  }
  const s04MatrixSlides={
    33:['8fa9d4e5929d7ccaf78c63cb132865bf1e4652c4482e532cb9d830cd423e9f52','c02f1609070bf768f9477c96ff4bd8291e1622e795f994dfb437a0da693e3d6f'],
    34:['ce4f7d7474bfda053d75d4100fda623dd10a39760c797a4662270e5762652777','dec28ccfb95691ea4da80b6a6d75cd987b409cc72f275a95d6b70fac51a18186'],
  }[record.number];
  if(s04MatrixSlides && sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04'
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256===s04MatrixSlides[0] && layout.translation_sha256===s04MatrixSlides[1]){
    const slots={0:[.34,.25,.46,.30],2:[.14,.32,.27,.36],3:[.35,.198,.68,.25]};
    if(record.number===33){slots[5]=[.27,.67,.81,.78];slots[7]=[.27,.82,.81,.88];}
    else slots[4]=[.04,.47,.24,.53];
    for(const region of regions){const i=region.block.source_lines[0];
      if(region.block.kind==='heading'){region.slot=[.04,.09,.97,.19];region.font=29;}
      else if(slots[i]){region.slot=slots[i];region.font=i===5||i===7?18:13;}
    }
  }
  const s05EarlyReviewed={
    3:['666b30d38aa77ec692a8809766da2c7d0819f8609d3e596ccf462466c4c7df2c','6018e16ffe9ba3659a722df65adaa58ce782e699f1779b78538c91408bfd7992'],
    4:['666b30d38aa77ec692a8809766da2c7d0819f8609d3e596ccf462466c4c7df2c','6018e16ffe9ba3659a722df65adaa58ce782e699f1779b78538c91408bfd7992'],
    5:['f35a98f5c3c9fc8ed5a48e49d69cabbf596426a115cc4a373e593d9c908b38e8','a833a18278cc3c2692c853046f614a78aa5a5377d1f833a55743cf5cadc9427c'],
    6:['781f14ef69e01b46b6c1e8120a11a47c628a6c1a40df30439ff331155f7677f0','e02d7633c5ea671223da7ca47df36e82dc79044277c05b5e72826ff900265c62'],
    7:['1db08da2466e4949c4ef9f51bb66a1090e5a592398e0d87356e836f21346b589','971be62cbda927817c17dcb6dfcd839bc3a6c1f2c096426a134dc4d1b69f1624'],
    8:['e7abb0bb16c1b7b50dcd599dfccea0a3e10caf961f0bdce7995a5e45d1d74194','2e93fcbcf16d426371eea4b6213d36826beb9387aeb3094523e9b1319842cdcf'],
    9:['718f97086e49e6b621ed3be173fe60d9bba909b54c2d60e566bb8ea5f82b543b','29dea48b3edb115fca3a9f1145e520047843caaedb42257cb6c8bcdc7c4d1eab'],
    10:['e668330f831023bb82d46ddff5dc59e97a8d598bc0a5851f50d5a14183f3fe2a','767054d45ad013fb0fa9b5790aa68cf2deeb04dccf3a9fcac0532dcb4bde62c0'],
  }[record.number];
  if(s05EarlyReviewed && sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s05'
      && sourceIdentity.sourceSha256==='f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7'
      && record.source_text_sha256===s05EarlyReviewed[0] && layout.translation_sha256===s05EarlyReviewed[1]){
    if(record.number>=6 && record.number<=8){
      imageTranslations.push(
        {rect:[.390,.490,.520,.550],text:'سیگنال الکتریکی مغز',background:'#fff',color:'#000',font:12,align:'center'},
        {rect:[.300,.552,.435,.600],text:'الکترود ثبت',background:'#fff',color:'#000',font:12,align:'center'},
        {rect:[.315,.605,.420,.670],text:'ناحیه دیداری مغز',background:'#fff',color:'#000',font:12,align:'center'},
        {rect:[.300,.820,.375,.875],text:'محرک',background:'#fff',color:'#000',font:12,align:'center'},
      );
    }
    if(record.number===9){
      imageTranslations.push(
        {rect:[.301,.518,.426,.593],text:'سلول های فوق پیچیده',background:'#fff',color:'#000',font:10,align:'center'},
        {rect:[.302,.632,.427,.681],text:'سلول های پیچیده',background:'#fff',color:'#000',font:10,align:'center'},
        {rect:[.302,.708,.405,.755],text:'سلول های ساده',background:'#fff',color:'#000',font:10,align:'center'},
        {rect:[.646,.507,.726,.545],text:'سطح بالا',background:'#fff',color:'#000',font:10,align:'center'},
        {rect:[.646,.627,.726,.665],text:'سطح میانی',background:'#fff',color:'#000',font:10,align:'center'},
        {rect:[.646,.766,.726,.804],text:'سطح پایین',background:'#fff',color:'#000',font:10,align:'center'},
      );
    }
    for(const region of regions){
      const i=region.block.source_lines[0],n=record.number;
      if(n<=4){region.slot=i===0?[.05,.10,.95,.20]:[.04,.265+(i-1)*.142,.96,.395+(i-1)*.142];region.font=i===0?33:20;region.keepTermsTogether=true;continue;}
      if(i===0){region.slot=[.04,.10,.96,.21];region.font=33;region.keepTermsTogether=true;}
      if(i===1){region.slot=[.05,.26,.50,.325];region.font=18;}
      if(i===2){region.slot=[.09,.325,.49,.39];region.font=17;}
      if(i===3){region.slot=n===10?[.04,.45,.96,.52]:[.04,.385,.96,.45];region.font=17;}
      if(n===5 && i===10){region.slot=[.05,.89,.42,.98];region.font=14;region.align='center';region.keepTermsTogether=true;}
      if(n===5 && i===13){region.slot=[.50,.925,.97,.985];region.font=14;region.align='center';}
      if(n>=6 && n<=8 && i===10){region.slot=[.07,.65,.30,.72];region.font=17;}
      if((n===6||n===7) && i===13){region.slot=[.55,.47,.96,.615];region.font=15;}
      if(n===9 && i===8){region.slot=[.15,.85,.85,.98];region.font=17;region.keepTermsTogether=true;}
      if(n===10 && i===12){region.slot=[.205,.57,.355,.63];region.font=12;region.align='center';}
      if(n===10 && i===13){region.slot=[.20,.70,.40,.77];region.font=14;}
      if(n===10 && i===15){region.slot=region.block.fa.startsWith('دو ورودی')?[.09,.88,.43,.965]:[.54,.88,.97,.98];region.font=14;region.keepTermsTogether=true;}
    }
  }
  if (sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s05' && record.number===2
      && sourceIdentity.sourceSha256==='f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7'
      && record.source_text_sha256==='a425071cd8ba09ee16114db96fd45c9c4f8c57fc0c1fd1cd594e4dfce778c365'
      && layout.translation_sha256==='78d218563ac84b82badb80f5e303c4b397fec09f49093ea7537ee56aaf569279'){
    const y={0:[.10,.21],1:[.25,.31],2:[.31,.37],3:[.37,.43],4:[.43,.51],5:[.51,.57],6:[.63,.68],7:[.68,.735],8:[.735,.79],9:[.855,.92]};
    for(const region of regions){const i=region.block.source_lines[0];if(y[i]){const nested=[2,3,4,5,7,8].includes(i);region.slot=[.04,y[i][0],nested?.92:.96,y[i][1]];region.font=i===0?35:20;region.keepTermsTogether=true;}}
  }
  if (sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s05' && record.number===1
      && sourceIdentity.sourceSha256==='f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7'
      && record.source_text_sha256==='8b164107255622992616ea16711f18e111c483b75c23b15742895f2563ef9b0d'
      && layout.translation_sha256==='5b0285036445feb75055bda9b32a04b0b1113e40467bb2b850bc932a1e56a848'){
    const slots={0:[.04,.22,.96,.48],2:[.12,.60,.88,.68],3:[.08,.685,.92,.745],4:[.20,.75,.80,.80]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i]){region.slot=slots[i];region.align='center';region.font=i===0?35:i===2?25:21;region.keepTermsTogether=true;}}
  }
  if (sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && record.number===1
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='63d01824a8df3538efa44d7f1f5f51556ac56d610e5bd0de32470f6c535e30f5'
      && layout.translation_sha256==='b9976b74cb3b9c9d9b9b884ef0b1010ede6cf283e93cf707a041a8ae972e0c2e'){
    const slots={0:[.04,.19,.96,.33],1:[.10,.32,.90,.43],2:[.12,.60,.88,.68],3:[.08,.685,.92,.745],4:[.20,.75,.80,.80]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i]){region.slot=slots[i];region.align='center';region.font=i===0?35:i===1?40:i===2?25:21;region.keepTermsTogether=true;}}
  }
  if (sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && [3,4,10,50,59,60].includes(record.number)
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='c35a993287a515e411449c7b8b31a0adcea96a5641d87102f686216e24af03b0'
      && layout.translation_sha256==='1faf934bc6bf9fb06389fb918b681649d3bb44990f064be609759cfafb90d336'){
    for(const region of regions){region.slot=[.04,region.slot[1],.96,region.slot[3]];region.align='right';if(region.block.source_lines[0]>0)region.keepTermsTogether=true;}
  }
  const s04SequencePages={
    35:['0f85273a22defe53ca50c9de8b873fab373185ccbeb1661e8895eee37cfdd408','61ebb785e46abcc502ae5d3eff0bd720e55055c9f99501e9cd0c0ec8618a01b0'],
    38:['3b03884cb8f26ded9d19c5874b72d7a869402b57b999219fad5c810ffbe5267b','e12378d2c8e87be936cedd8511723dbd9a0a695fd2d43d9c5be9e477bc678482'],
    39:['3b46f7af0c6aeaffd78c64f1ded81ca6631c965366fd08d3b50f218d195d2deb','bb2e007bee053e5e8003d762cd001cd99a66363d50e89954d8c13bf191059811'],
  }[record.number];
  if(s04SequencePages && sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04'
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256===s04SequencePages[0] && layout.translation_sha256===s04SequencePages[1]){
    for(const region of regions){const i=region.block.source_lines[0];
      if(region.block.kind==='heading'){region.slot=[.04,.09,.97,.19];region.font=29;}
      if(record.number===35){
        if(i===0){region.slot=[.34,.25,.46,.30];region.font=13;}
        if(i===2){region.slot=region.block.fa.startsWith('یادآوری')?[.35,.195,.70,.25]:[.02,.195,.30,.25];region.font=14;}
        if(i===3){region.slot=[.03,.32,.26,.36];region.font=13;}
      }
      if(record.number===38){const slots={0:[.67,.55,.99,.67],5:[.67,.71,.99,.76],6:[.67,.76,.99,.80],7:[.67,.80,.99,.845],8:[.67,.845,.99,.90]};if(slots[i]){region.slot=slots[i];region.font=13;}}
      if(record.number===39){const slots={1:[.05,.78,.96,.83],2:[.05,.83,.96,.89],3:[.05,.89,.96,.96]};if(slots[i]){region.slot=slots[i];region.font=17;}}
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && record.number===40
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='652dd588a0207a30da560ebf6fb724f94fdc4c8cb505c3675e3360b21aefa17b'
      && layout.translation_sha256==='10aa574186791f0efdd1f3d7b30b37af033b9b1cc9cf5edf2a161b785a19f0cc'){
    for(const region of regions)if(region.block.source_lines[0]===0){region.keepTermsTogether=true;region.slot=[.04,.06,.97,.24];region.font=32;}
  }
  const s04BpttPages={
    41:['f5d069d5fbf417904854f0ba16af8c06005c1d5a2df7bbe81d52254e32f16b01','48e2a9ab00364888de43f19fa92a870ac343ba079e33038c52ea32b89c5f3b7d',[7,0,1,2,3,6,8]],
    43:['fba713664fb38064ef0c40cf3f2df1415a8b79c09042950c22d1f2aa07f33553','0195eb7936ab6b904861aa7919097b29fddd223b9aa30f50f99a5f85082b8ee8',[0,3,4,5,6,9,1]],
    45:['f1645e75a8358b064d9d06826ad6c66a60fbbf202fd4abc9da4adf0033dc11ff','b4fdc75ada88cbde96e3961ef8ecadf411c28da8bc81aefc8adfeae011119097',[0,1,2,3,4,7,8]],
  }[record.number];
  if(s04BpttPages && sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04'
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256===s04BpttPages[0] && layout.translation_sha256===s04BpttPages[1]){
    const slots=[[.04,.09,.97,.22],[.05,.27,.90,.33],[.04,.38,.68,.46],[.04,.49,.68,.57],[.04,.61,.68,.79],[.04,.83,.68,.90],[.70,.47,.99,.60]];
    for(const region of regions){const part=s04BpttPages[2].indexOf(region.block.source_lines[0]);if(part<0)continue;region.slot=slots[part];region.font=part===0?29:part===6?14:17;
      if(part===2)region.manualAccents=[{text:'شبکه بازشده',color:'#ffc000'}];
      if(part===4)region.manualAccents=[{text:'اشتراک وزن با جمع گرادیان ها در همه گام های زمانی',color:'#ffc000'}];
    }
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && record.number===42
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='f6b19ce219de43934205645e317793cd69e4cee83ee89bbd2fa30d43ce7beb27'
      && layout.translation_sha256==='6085a3f9308181e77ab8f0055a2bdcebba52c12dd3382db2f370a3517dcf52a3'){
    const slots={0:[.04,.09,.97,.22],1:[.05,.27,.90,.33],2:[.08,.33,.90,.38],3:[.08,.91,.90,.97]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i]){region.slot=slots[i];region.font=i===0?29:17;}}
  }
  const s04LossPages={
    46:['1dbeeff27313648aa4c8fc2c709d2dde451d290640282403ca00fa11af6dd05d','9645e6aa8f2b7c2d7f9be22671856452e3cf29e6f4224459ba74bf0af3835b08'],
    47:['8a995a60a5373c0b7a1971029e924ffba5fbe2802e54ff4ce5c55142d72b928b','0d21e8d03deef8d9256b6db0f62788808a3afa0c16e10598925a35504686e714'],
    48:['6176f3222e881d36bdfcfe70fdec5ab9bc5d1d9fd411c67369a1f8b29703f5cd','7f86cf3a7b62e4fb83c4392ac02ba6745292dc61866922c2a5969b2830abbb6b'],
    49:['4fdce9f31e171ff862fe6de311c88311a1109a35381e640cc1eb664f148741ad','87685a6b64c7d184230588a999caacf1222ac2dce796187476668007117c7ab5'],
    51:['7c48fc0319dc86b9c82dea38dba41d70c07f0e6e941262498f1f7b86259201ed','21a247833794829d1dee1e919e1bfe3fbadf563905bbba95b83a91236026ec7f'],
  }[record.number];
  if(s04LossPages && sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04'
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256===s04LossPages[0] && layout.translation_sha256===s04LossPages[1]){
    const byPage={46:{0:[.04,.09,.97,.22],10:[.67,.50,.98,.72]},47:{9:[.04,.06,.97,.24],1:[.68,.39,.87,.44],2:[.42,.29,.74,.34],3:[.04,.34,.40,.39],4:[.55,.58,.82,.68],6:[.05,.73,.40,.88],11:[.46,.80,.97,.90]},48:{11:[.04,.06,.97,.24],0:[.05,.35,.47,.50],3:[.05,.58,.47,.64],4:[.05,.65,.47,.70],5:[.08,.70,.47,.75],6:[.05,.76,.47,.82],7:[.08,.82,.47,.88],9:[.65,.42,.96,.52]},49:{0:[.04,.09,.97,.22],1:[.05,.27,.90,.33],2:[.09,.38,.86,.46],3:[.09,.49,.86,.57],4:[.09,.61,.86,.79],7:[.09,.83,.86,.90]},51:{2:[.10,.42,.31,.46],3:[.10,.46,.31,.55],5:[.10,.59,.31,.65]}};
    const slots=byPage[record.number];
    for(const region of regions){const i=region.block.source_lines[0];if(!slots[i])continue;region.slot=slots[i];region.font=region.block.kind==='heading'?28:record.number===49?17:record.number===46?16:14;
      if(record.number===46&&i===10)region.manualAccents=[{text:'هدف',color:'#ffc000'}];
      if(record.number===49&&i===0){region.color='#ffffff';region.manualAccents=[{text:'این روش اغلب شکست می خورد',color:'#ffc000'},{text:'چرا',color:'#ffc000'}];}
    }
  }
  const s04VanishingPages={
    52:['43baa7f794793ecf04301f18d2fca9262c86b502783df9117a443b78ea176110','1ca05d22f7263d7c1c956453bf3c9670967365cc38325c1c5e4c26db5457a9ef'],
    53:['fee2965e1f874f5609c73f9fe1dc34e7ff21039d0f23526e1969199cca977131','3428bf155bb4384c3866b7eaff1d567d53feb3fe9def87679b640895c921312d'],
    54:['61f5f434f391e004fed09cc5c282511c123de4e73b7921eefe013b30d418f61d','b61f042706e967ebc31350bd57f310fe0afcde246f81a00683722ed90350cb16'],
  }[record.number];
  if(s04VanishingPages && sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04'
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256===s04VanishingPages[0] && layout.translation_sha256===s04VanishingPages[1]){
    const byPage={52:{0:[.11,.42,.32,.55],4:[.11,.61,.33,.74],7:[.35,.76,.97,.82],8:[.01,.84,.99,.96]},53:{0:[.10,.54,.44,.59],1:[.10,.59,.44,.68],4:[.01,.84,.99,.96]},54:{0:[.08,.86,.96,.94]}};
    for(const region of regions){const i=region.block.source_lines[0],slot=byPage[record.number][i];if(slot){region.slot=slot;region.font=(record.number===54?19:((record.number===52&&i===8)||(record.number===53&&i===4))?17:14);}if((record.number===52&&i===8)||(record.number===53&&i===4))region.manualAccents=[{text:'نگرانی',color:'#ffc000'}];}
  }
  const s04GatePages={
    55:['6bda73a2802b1b64c71d142c9476486ad3134b694f2530283f3ded2929f3e41b','aa1a92c82df85613ece56ee54d912657c7c179dc354d8a56388c37a9add2e2bb'],
    56:['fe58256f415717435184a8727809426f68031475be569201a2a5945e06c6ff91','10d17ce59e2af29b835f45d64453bf3f4119113ba091efbe07c793c66396b64e'],
    57:['4e9b8a7809c17dd2b8e804a4c97bad90d5aa458cca1dd7a0856582e937bdc775','4f66431abe6798220f5846da7db267f82103d87cd8908a9cfe53c2fee8441b35'],
    58:['ff883b721fb5ff47b14381387f73db6f38eafbea5648e3eb224356ceeaa01b6d','64ff7e0cc53e44754601afc416d791bbb1bdfccfb5f97a7c31853e4e70333125'],
  }[record.number];
  if(s04GatePages && sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04'
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256===s04GatePages[0] && layout.translation_sha256===s04GatePages[1]){
    const common={0:[.04,.09,.97,.22],1:[.04,.26,.97,.33]};
    const extra=record.number===55||record.number===56?{3:[.335,.37,.485,.49],6:[.49,.37,.60,.49],9:[.605,.37,.76,.49],12:[.78,.55,.99,.68],15:[.78,.35,.99,.45],17:[.78,.45,.99,.55]}:record.number===57?{5:[.785,.46,.99,.69]}:{};
    for(const region of regions){const i=region.block.source_lines[0],slot=extra[i]||common[i];if(!slot)continue;region.slot=slot;region.font=i===0?29:i===1?16:record.number===57?13:12;}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && record.number===36
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='1fc9bb5b31167061761a0f704cd78f000ff7871b715987edad1bb71d55bc17dc'
      && layout.translation_sha256==='953b4ff315115f1a6d4d9714bfcd49d2cb79f775c3ded101af08caf9f96a10ba'){
    const slots={6:[.04,.09,.97,.19],4:[.40,.40,.625,.53],1:[.40,.70,.765,.90]};
    for(const region of regions){const i=region.block.source_lines[0];if(slots[i]){region.slot=slots[i];region.font=i===6?30:i===1?20:14;}}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && record.number===37
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='eb0be28e9cdc0b33ef5dabd8734de68430d4533216833b659a21f535570a8864'
      && layout.translation_sha256==='0f868ae9081174c5643c18249f1506e05cc893a8a15f303f38d44b940e4e946f'){
    for(const region of regions){if(region.block.source_lines[0]===1){region.slot=[.40,.70,.76,.90];region.font=20;}}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && record.number===38
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='3b03884cb8f26ded9d19c5874b72d7a869402b57b999219fad5c810ffbe5267b'
      && layout.translation_sha256==='e12378d2c8e87be936cedd8511723dbd9a0a695fd2d43d9c5be9e477bc678482'){
    const slots={0:[.66,.52,.99,.67,17],5:[.66,.69,.99,.76,16],6:[.66,.76,.99,.80,15],7:[.66,.80,.99,.85,15],8:[.66,.85,.99,.94,15]};
    for(const region of regions){const slot=slots[region.block.source_lines[0]];if(slot){region.slot=slot.slice(0,4);region.font=slot[4];}}
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && record.number===44
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='d76c7367a57fde21aa8f039871c97d1eeee7397f1bbe020208bef2b98aedfd1e'
      && layout.translation_sha256==='fa3c63736d5486dffe075512c789afbc15f8e96d2ee7c8d530b0aa6195faa3aa'){
    for(const region of regions){const i=region.block.source_lines[0];
      if(i===0){region.slot=[.04,.09,.97,.22];region.font=28;region.keepTermsTogether=true;}
      if(i===2){region.slot=[.34,.40,.47,.52];region.font=12;region.align='center';}
    }
  }
  const s04FigureLabels = {
    15:['58ed64d51139f7f36e374a9ef97ce219384ee3d246aaad2a30c502ed0b65a74e','d4e001fec2823dc3813a0d802b3617efccfaacf86481a0e18571a5321f65e804'],
    16:['5605488fd9bd2cd7352a205b14ac64ecf37b6827dec615023844f0810851e872','d72366e8f7c87c51feef6a199f079b060b27b4b77ec0910d047d37d2db209516'],
    17:['fee7296cda17c18dad9d011f8d618bb93efdef9d6da66d27b0366268a2eb1b56','423f55cb74a10fe08157593b16631a1058cf92f4da5ae0443219dbe440922af0'],
    18:['7ccb2c073dac7f3c5493e44b60c022b14a57b0d8a9a693ada38e147e8fe5cd1b','0d1606d4f6d6672fef613381ad511cf3c4f8439437653bc93271b0da5c86e213'],
    19:['a001823222275e73cf0a5b3ccab0df575dc507fde195f7bffcee0a23d5b103ae','af9b1f02985b90f015d4474fa5ccc464703ce6099c79b17c50a38349e7e1a03e'],
    22:['ecee341c50e3187c81d84c5269117461f339617db4dd8fecbf0510c4bea2c67d','6734909eab8f8fe9a1570790213f80b2311e141f7fe949a32fc652e54831b9ea'],
    23:['f411a58014188bf6197229cbfd37912ad6ae94a88e9226571565ffa434a34e4f','4b588bac1af1f56b28ed8b4887fe9ef2806a92901ef4bec05610661c47eb7490'],
    24:['8e4ae230d6a1eae89defb6b041d9c3860127b7f38380d1d360d577098648f14d','73d324917f54b73ee472be6f6b769acba976a0e836d67d1f6b0c173a08e992cf'],
    25:['8e4ae230d6a1eae89defb6b041d9c3860127b7f38380d1d360d577098648f14d','73d324917f54b73ee472be6f6b769acba976a0e836d67d1f6b0c173a08e992cf'],
    28:['7d982bfcd5fd0660621c2fa65887a8919b0358403fe7968ffb4b34d6c5e00e95','8645f17b4d72e6b07960cd66de94d3acd54fc047de4160c3848a2dc816764e9c'],
  }[record.number];
  if(s04FigureLabels && sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04'
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256===s04FigureLabels[0] && layout.translation_sha256===s04FigureLabels[1]){
    imageTranslations.push({rect:[.258,.695,.35,.741],text:'بازکردن',background:'#fff',color:'#000',font:20,align:'center'});
  }
  const s04PlotLabels={
    26:['9d5930cab1aa34127bf92484723905d0ccaab9703e996e0f2c2410b807039b63','f9040e8b5708c91c9f829727fd824b0dcc115e39ac633f4e0053f57f82cd3186'],
    27:['9bacaf5cc01a0ab665ecd3f39ec648b9e51f59ee7d020ea0027cad7fe7ba59de','4c73ac498ec0e05b3d17ffa3717014ef04a1ee3ac015505a6199885b232524dd'],
  }[record.number];
  if(s04PlotLabels && sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04'
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256===s04PlotLabels[0] && layout.translation_sha256===s04PlotLabels[1]){
    if(record.number===26){
      imageTranslations.push({rect:[.258,.396,.392,.42],text:'تابع های فعال سازی',background:'#fff',color:'#000',font:11,align:'center'});
      imageTranslations.push({rect:[.644,.396,.721,.42],text:'مشتق ها',background:'#fff',color:'#000',font:11,align:'center'});
    }else imageTranslations.push({rect:[.788,.014,.91,.037],text:'تابع های فعال سازی',background:'#fff',color:'#000',font:11,align:'center'});
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && record.number===9
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='410c138d3bae03bbf04cea0268a0aad126b7765878a047dd5b13214742fdeae4'
      && layout.translation_sha256==='df4ec58ba8dc796caefe7a9721857e9837a6c03eff4be4cab1b4997f4b2f6ba1'){
    imageTranslations.push({rect:[.35,.578,.605,.647],text:'هواداران دوآتشه عاشق آن می شوند؛ برای بقیه، وقت گذرانی نسبتا خوبی است.',background:'#fff',color:'#242424',font:11,align:'right'});
    imageTranslations.push({rect:[.666,.554,.842,.626],text:'امروز سرگرم کننده است.',background:'#fff',color:'#000',font:15,align:'center'});
    imageTranslations.push({rect:[.682,.672,.825,.704],text:'چینی (سنتی)',background:'#fff',color:'#555',font:11,align:'center'});
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && record.number===8
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='f59288a393682d132c08d2cc0e0d0221c6c5c9f487962c56f1fbf4548bdd2ca4'
      && layout.translation_sha256==='f4115f9bf90dbdcfb5148de830dbc9916099210031efa64e788853d08404b1ec'){
    imageTranslations.push({rect:[.081,.32,.226,.357],text:'پیش بینی چندروزه',background:'#14203e',color:'#fff',font:15,align:'center'});
    imageTranslations.push({rect:[.514,.338,.738,.477],text:'آنچه درباره The Last Jedi برایم از همه جالب تر است، بازگشت لوک در نقش مربی به جای شاگرد است؛ او با شکست در این نقش تازه دست و پنجه نرم می کند و بعد می خواهد آموزگاری خردمند و صبور باشد.',background:'#fff',color:'#242424',font:9,align:'right'});
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04' && record.number===11
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && record.source_text_sha256==='5858cd7d5cdaa9c344a3c7883001961c4abed3c9aefd0f631d1389d58913418f'
      && layout.translation_sha256==='b5962b5278e15cfe4918f22414e36990c123168673bc6551916218cdd720404f'){
    imageTranslations.push({rect:[.75,.341,.815,.405],text:'مجموعه وزن های متناظر',background:'#fff',color:'#000',font:8,align:'center'});
  }
  if(sourceIdentity.term==='spring-2026' && sourceIdentity.session==='s04'
      && sourceIdentity.sourceSha256==='4dcd6bb4b6322d6b7e5d30b5f636d2f23678991dfc353b9ca1cbcec41fb41ff5'
      && [14,15,16,17,18,24,25,26,27].includes(record.number)){
    for(const region of regions)if(region.block.kind==='heading'){
      const box=region.slot||region.rect;region.slot=[.04,box[1],.96,box[3]];region.align='right';
    }
  }
  return {reason: null, regions, layout, imageTranslations, figureLabels: record.image_text || [], tables:record.tables || [], nativeMath:record.blocks.filter(block=>block.kind!=='not_visible'&&block.latex&&(!persian.test(block.fa||'')||block.source_fragments))};
}

export function expandSourceLayout(plan) {
  if (plan.reason) return null;
  const overlaps=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
  const regions=plan.regions.map(region=>({...region,slot:[...region.slot]}));
  let changed=false;
  for(const region of regions){
    if(region.rotate||region.clearRect)continue;
    const [left,top,right,bottom]=region.slot,owned=new Set(region.block.source_lines);
    const obstacles=[...plan.layout.images,...(plan.layout.graphics||[]),
      ...plan.layout.lines.filter(line=>!owned.has(line.index)),
      ...(plan.imageTranslations||[]),...regions.filter(other=>other!==region).map(other=>({rect:other.slot}))]
      .map(item=>item.rect).filter(rect=>Array.isArray(rect)&&rect.length===4);
    if(obstacles.some(rect=>overlaps(region.slot,rect)))continue;
    const boundary=Math.max(.03,left-(right-left)*.5,
      ...obstacles.filter(rect=>rect[1]<bottom&&rect[3]>top&&rect[2]<=left).map(rect=>rect[2]+.004));
    const candidate=[boundary,top,right,bottom];
    if(boundary>=left||obstacles.some(rect=>overlaps(candidate,rect)))continue;
    region.slot=candidate;changed=true;
  }
  return changed?{...plan,regions}:null;
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
    if(region.scrollable){node.dataset.scrollable='true';node.tabIndex=0;node.style.overflowY='auto';node.setAttribute('aria-label','نقل‌قول؛ برای خواندن ادامه اسکرول کنید');}
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
    }else if(region.ltrSequence && region.block.fa.includes(region.ltrSequence)){
      const [before,after]=region.block.fa.split(region.ltrSequence);
      addText(node,before,presentation,{sourceColors:true});
      const sequence=element('bdi');sequence.dir='ltr';sequence.textContent=region.ltrSequence;node.append(sequence);
      addText(node,after,presentation,{sourceColors:true});
    }else if(region.linkTarget){const link=element('a');link.href=region.linkTarget;link.target='_blank';link.rel='noopener noreferrer';link.textContent=region.block.fa;link.style.color='inherit';node.append(link);}
    else addText(node, region.block.fa, presentation, {sourceColors:true});
    if(region.rotate)node.style.transform=`rotate(${region.rotate}deg)`;
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
    if (fits(node) || node.dataset.scrollable==='true') continue;
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
