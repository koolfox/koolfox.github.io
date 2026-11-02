import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createBertTokenizer} from '../../assets/model-tokenizer.js';
const vocabulary=await readFile(new URL('../references/bert-vocab.txt',import.meta.url),'utf8');
const tokenizer=createBertTokenizer(vocabulary);
test('source BERT example preserves sentence boundaries and mask position',()=>{
 const encoded=tokenizer.encode('I arrived at the bank [MASK] crossing the river.','My pants were wet.');
 assert.deepEqual(encoded.inputIds,[101,1045,3369,2012,1996,2924,103,5153,1996,2314,1012,102,2026,6471,2020,4954,1012,102]);
 assert.deepEqual(encoded.typeIds,[...Array(12).fill(0),...Array(6).fill(1)]);
 assert.deepEqual(encoded.maskPositions,[6]);
});
test('punctuation, accents, WordPiece and embedded special tokens',()=>{
 assert.deepEqual(tokenizer.tokenize('Héllo,[MASK]! unaffable'),['hello',',','[MASK]','!','una','##ffa','##ble']);
 assert.deepEqual(tokenizer.tokenize('你好吗'),['[UNK]','[UNK]','[UNK]']);
});
test('explicit errors prevent truncating or running a maskless sentence',()=>{
 assert.throws(()=>tokenizer.encode('hello'),/MASK/);
 assert.throws(()=>tokenizer.encode('[MASK] '+('hello '.repeat(128))),/۱۲۸/);
 assert.throws(()=>createBertTokenizer('wrong vocabulary'));
});

const officialCases=JSON.parse(await readFile(new URL('../references/bert-tokenizer-cases.json',import.meta.url),'utf8'));
test('edited inputs match the official Python tokenizer independently',()=>{for(const c of officialCases)assert.deepEqual(tokenizer.tokenize(c.text),c.tokens);});
