/** Keep complete scientific identifiers and quantities in their LTR reading order. */
export function isolateScientificText(container) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const texts = [];
  while (walker.nextNode()) texts.push(walker.currentNode);
  for (const text of texts) {
    if (text.parentElement.closest('pre, code, bdi, svg, .reader-math') || !/[A-Za-z0-9Åαβγ]/.test(text.textContent)) continue;
    const parts = text.textContent.split(/([A-Za-z0-9Åαβγ][A-Za-z0-9Åαβγ–_.→/−+*-]*(?:[ \t]+[A-Za-z0-9Åαβγ][A-Za-z0-9Åαβγ–_.→/−+*-]*)*)/g);
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < parts.length; index++) {
      if (index % 2) {
        const isolated = document.createElement('bdi');
        isolated.dir = 'ltr'; isolated.textContent = parts[index]; fragment.append(isolated);
      } else fragment.append(document.createTextNode(parts[index]));
    }
    text.replaceWith(fragment);
  }
}
