// Validate the exact math engine and formula inputs shipped to the reader.
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import katex from '../assets/vendor/katex/katex.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
for(const name of ['katex','pdfjs','python-editor','python-tools']){
 const base=root+'assets/vendor/'+name+'/';
 const manifest=JSON.parse(readFileSync(base+'files.json'));
 if(name==='pdfjs'&&manifest.build!=='legacy')throw Error('PDF reader requires the legacy worker feature shims for faithful font rendering');
 for(const entry of manifest.files){
  if(entry.path.startsWith('/')||entry.path.split('/').includes('..'))throw Error('Unsafe vendor manifest path');
  const hash=createHash('sha256').update(readFileSync(base+entry.path)).digest('hex');
  if(hash!==entry.sha256)throw Error('Vendor file changed: '+name+'/'+entry.path);
 }
}
const translations=root+'content/translations/';
let count=0;
for(const term of existsSync(translations)?readdirSync(translations).filter(name=>/^(spring|fall)-20\d{2}$/.test(name)).sort():[]){
const folder=translations+term+'/';
for(const file of readdirSync(folder).filter(name=>/^s\d{2}\.json$/.test(name)).sort()){
 const data=JSON.parse(readFileSync(folder+file));
 for(const page of data.pages)for(const block of [...page.blocks,...page.image_text,
  ...(page.tables||[]).flatMap(table=>table.rows.flat().map(cell=>({fa:typeof cell==='string'?cell:cell.text})))]){
  const formulas=[...(block.latex?[block.latex]:[]),...[...(block.fa||'').matchAll(/\\\(([\s\S]+?)\\\)/g)].map(match=>match[1])];
  for(const formula of formulas){
  try{katex.renderToString(formula,{displayMode:true,output:'htmlAndMathml',throwOnError:true,trust:false,strict:'error'});}
  catch(error){throw Error(`${term}/${file} page ${page.number}: ${error.message}`);}
  count++;
  }
 }
}
}
console.log(`Verified local vendor hashes and rendered ${count} source formulas with KaTeX ${katex.version}`);
