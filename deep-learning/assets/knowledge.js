(() => {
  const input = document.querySelector('#knowledge-search'), entries = [...document.querySelectorAll('[data-knowledge-entry]')];
  const normalize = text => text.normalize('NFKC').toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\u064b-\u065f]/g, '').replace(/\u200c/g, ' ');
  const indexed = entries.map(entry => [entry, normalize(entry.textContent)]);
  function search() {
    const terms = normalize(input.value).trim().split(/\s+/).filter(Boolean); let count = 0;
    for (const [entry, text] of indexed) { entry.hidden = !terms.every(term => text.includes(term)); if (!entry.hidden) count++; }
    document.querySelector('[data-search-count]').textContent = `${count} مدخل`;
    document.querySelector('[data-no-results]').hidden = count > 0;
  }
  input.addEventListener('input', search); search();
})();
