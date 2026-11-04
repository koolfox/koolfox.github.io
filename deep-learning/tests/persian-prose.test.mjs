import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePersianProse} from '../assets/persian-prose.mjs';

test('normalizes optional pronunciation and reviewed spellings in Persian prose', () => {
  assert.equal(normalizePersianProse('لایهٔ شبکه، مثلاً برای مسئله و ارائه مؤثر است.'),
    'لایه شبکه، مثلا برای مساله و ارایه موثر است.');
  assert.equal(normalizePersianProse('مسائل، تأثیر، هیئت، جزئی، مسئول، شیء'),
    'مسایل، تاثیر، هیات، جزیی، مسول، شی');
  assert.equal(normalizePersianProse('خانه‌ی تازه، شِکِل و ۀ'), 'خانه تازه، شکل و ه');
});

test('preserves alef madda, ordinary yeh, meaningful joiners and unreviewed words', () => {
  const input = 'آموزش، ا\u0653غاز، شبکه‌های پیش‌خور می‌شود؛ علی به زندگی علاقه دارد.';
  const result = normalizePersianProse(input);
  assert.equal(result, 'آموزش، آغاز، شبکه‌های پیش‌خور می‌شود؛ علی به زندگی علاقه دارد.');
  assert.equal(normalizePersianProse('قرآن و سؤال'), 'قرآن و سؤال');
  assert.equal(normalizePersianProse(result), result);
});

test('leaves unrelated Latin, punctuation and numeric notation intact', () => {
  const input = 'CNN (convolution) 3.14 x_1 → 42';
  assert.equal(normalizePersianProse(input), input);
  assert.throws(() => normalizePersianProse(null), TypeError);
});
