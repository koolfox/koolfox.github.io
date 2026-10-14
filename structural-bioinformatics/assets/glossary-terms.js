// First mentions link to the same local definitions in reading, slides and HTML.
const project = new URL('../', import.meta.url);
const terms = [
  { chapter: 1, labels: ['آنتی‌بادی'] },
  { chapter: 2, labels: ['IgG1', 'IgG'] },
  { chapter: 3, labels: ['زنجیرهٔ سنگین', 'زنجیرهٔ سبک'] },
  { chapter: 4, labels: ['Fab'] },
  { chapter: 5, labels: ['Fc'] },
  { chapter: 6, labels: ['نوترکیب'] },
  { chapter: 7, labels: ['مونوکلونال'] },
  { chapter: 8, labels: ['اپی‌توپ'] },
  { chapter: 9, labels: ['TNF-α', 'TNF-alpha', 'TNF'] },
  { chapter: 10, labels: ['TNFR1', 'TNFR2', 'TNFR', 'گیرنده'] },
  { chapter: 11, labels: ['TOP2A'] },
  { chapter: 12, labels: ['RNA-seq'] },
];
const lookup = new Map(terms.flatMap(term => term.labels.map(label => [label, term.chapter])));
const labels = [...lookup.keys()].sort((a, b) => b.length - a.length);
const escaped = labels.map(label => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const expression = new RegExp('(?<![\\p{L}\\p{N}_])(' + escaped.join('|') + ')(?![\\p{L}\\p{N}_])', 'gu');
const excluded = 'a, button, label, option, select, textarea, pre, code, svg, math, .reader-math, .slide-references, blockquote';

export function linkGlossaryTerms(container) {
  const seen = new Set();
  for (const link of container.querySelectorAll('a.term-link')) {
    const url = new URL(link.href, project);
    if (url.searchParams.get('document') === 'glossary.fa.md') seen.add(Number(url.searchParams.get('chapter')?.split('-')[1]));
  }
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(text) {
      return text.parentElement.closest(excluded) || !text.parentElement.closest('p, li, dd, dt, td, figcaption')
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const text of nodes) {
    const fragment = document.createDocumentFragment();
    let offset = 0;
    for (const match of text.textContent.matchAll(expression)) {
      const chapter = lookup.get(match[0]);
      if (seen.has(chapter)) continue;
      seen.add(chapter);
      fragment.append(text.textContent.slice(offset, match.index));
      const link = document.createElement('a');
      const url = new URL(project);
      url.searchParams.set('document', 'glossary.fa.md');
      url.searchParams.set('chapter', 'chapter-' + chapter);
      url.hash = 'reading';
      link.href = url.href;
      link.className = 'term-link';
      link.dataset.document = 'glossary.fa.md';
      link.title = 'توضیح «' + match[0] + '» در واژه‌نامه';
      link.textContent = match[0];
      fragment.append(link);
      offset = match.index + match[0].length;
    }
    if (offset) {
      fragment.append(text.textContent.slice(offset));
      text.replaceWith(fragment);
    }
  }
}
