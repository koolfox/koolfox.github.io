// Apply only to authored Persian prose, never to code, formulas, data or input.
const spellings = new Map([
  ['مسئله', 'مساله'],
  ['مسائل', 'مسایل'],
  ['ارائه', 'ارایه'],
  ['تأثیر', 'تاثیر'],
  ['مؤثر', 'موثر'],
  ['هیئت', 'هیات'],
  ['جزئی', 'جزیی'],
  ['مسئول', 'مسول'],
  ['شیء', 'شی'],
]);

export function normalizePersianProse(value) {
  if (typeof value !== 'string') throw new TypeError('Persian prose must be a string');
  return value
    .replace(/ا\u0653/g, 'آ')
    .replace(/ۀ/g, 'ه')
    .replace(/[\u064b-\u065f\u0670]/g, '')
    .replace(/ه\u200cی(?=$|[\s،؛:؟!.,()[\]{}«»])/gu, 'ه')
    .replace(/[\u0621-\u063a\u0641-\u064a\u0671-\u06d3]+/gu, word => spellings.get(word) ?? word);
}
