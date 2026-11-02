// BERT's published BasicTokenizer + greedy WordPiece, without executing Python.
// The vocabulary is the pinned, original bert-base-uncased vocabulary.
const specials = new Set(['[UNK]', '[SEP]', '[PAD]', '[CLS]', '[MASK]']);
const punctuation = character => /^[!-/:-@[-`{-~]$/.test(character) || /^\p{P}$/u.test(character);
const chinese = value => [[0x4e00,0x9fff],[0x3400,0x4dbf],[0x20000,0x2a6df],
  [0x2a700,0x2b73f],[0x2b740,0x2b81f],[0x2b820,0x2ceaf],[0xf900,0xfaff],
  [0x2f800,0x2fa1f]].some(([first,last]) => value >= first && value <= last);

export function createBertTokenizer(vocabulary) {
  const words = vocabulary.trimEnd().split(/\r?\n/), ids = new Map(words.map((word,index) => [word,index]));
  if (words.length !== 30522 || [...specials].some(word => !ids.has(word))) throw Error('واژگان با BERT-Base Uncased سازگار نیست.');
  function basic(text) {
    let clean = '';
    for (const character of text) {
      const point = character.codePointAt(0);
      if (point === 0 || point === 0xfffd || (/^[\p{Cc}\p{Cf}]$/u.test(character) && !/[\t\n\r]/.test(character))) continue;
      if (/^\s$/u.test(character)) clean += ' ';
      else clean += chinese(point) ? ' ' + character + ' ' : character;
    }
    const tokens = [];
    for (const piece of clean.trim().split(/\s+/).filter(Boolean)) {
      if (specials.has(piece)) { tokens.push(piece); continue; }
      const normalized = piece.toLowerCase().normalize('NFD').replace(/\p{Mn}/gu,'');
      let word = '';
      for (const character of normalized) {
        if (punctuation(character)) { if (word) tokens.push(word); tokens.push(character); word = ''; }
        else word += character;
      }
      if (word) tokens.push(word);
    }
    return tokens;
  }
  function tokenize(text) {
    if (typeof text !== 'string' || text.length > 10000) throw Error('متن BERT باید حداکثر ۱۰٬۰۰۰ نویسه داشته باشد.');
    const tokens = [];
    for (const part of text.split(/(\[UNK\]|\[SEP\]|\[PAD\]|\[CLS\]|\[MASK\])/g)) {
      for (const word of specials.has(part) ? [part] : basic(part)) {
        if (specials.has(word)) { tokens.push(word); continue; }
        const characters = [...word];
        if (characters.length > 100) { tokens.push('[UNK]'); continue; }
        const pieces = []; let start = 0;
        while (start < characters.length) {
          let end = characters.length, match = null;
          while (start < end) {
            const piece = (start ? '##' : '') + characters.slice(start,end).join('');
            if (ids.has(piece)) { match = piece; break; }
            end--;
          }
          if (match === null) { pieces.length = 0; pieces.push('[UNK]'); break; }
          pieces.push(match); start = end;
        }
        tokens.push(...pieces);
      }
    }
    return tokens;
  }
  function encode(text,textPair='') {
    const first = tokenize(text), second = textPair ? tokenize(textPair) : [];
    const tokens = ['[CLS]',...first,'[SEP]',...(second.length ? [...second,'[SEP]'] : [])];
    if (tokens.length > 128) throw Error('این آزمایش حداکثر ۱۲۸ توکن را می‌پذیرد؛ متن را کوتاه‌تر کن.');
    const inputIds = tokens.map(token => ids.get(token));
    const typeIds = tokens.map((_,index) => index < first.length + 2 ? 0 : 1);
    const maskPositions = inputIds.flatMap((id,index) => id === ids.get('[MASK]') ? [index] : []);
    if (!maskPositions.length) throw Error('برای پیش‌بینی واژه، یک [MASK] در متن قرار بده.');
    return {tokens,inputIds,typeIds,attentionMask:tokens.map(()=>1),maskPositions};
  }
  return {encode,tokenize,token:index=>words[index],vocabularySize:words.length};
}
