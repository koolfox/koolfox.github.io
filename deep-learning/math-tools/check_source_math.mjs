// Validate the exact math engine and formula inputs shipped to the reader.
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import katex from '../assets/vendor/katex/katex.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
for(const name of ['katex','pdfjs']){
 const base=root+'assets/vendor/'+name+'/';
 const manifest=JSON.parse(readFileSync(base+'files.json'));
 if(name==='pdfjs'&&manifest.build!=='legacy')throw Error('PDF reader requires the legacy worker feature shims for faithful font rendering');
 for(const entry of manifest.files){
  if(entry.path.startsWith('/')||entry.path.split('/').includes('..'))throw Error('Unsafe vendor manifest path');
  const hash=createHash('sha256').update(readFileSync(base+entry.path)).digest('hex');
  if(hash!==entry.sha256)throw Error('Vendor file changed: '+name+'/'+entry.path);
 }
}
const folder=root+'content/translations/spring-2022/';
let count=0;
for(const file of readdirSync(folder).filter(name=>/^s\d{2}\.json$/.test(name)).sort()){
 const data=JSON.parse(readFileSync(folder+file));
 for(const page of data.pages)for(const block of [...page.blocks,...page.image_text]){
  if(!block.latex)continue;
  try{katex.renderToString(block.latex,{displayMode:true,output:'htmlAndMathml',throwOnError:true,trust:false,strict:'error'});}
  catch(error){throw Error(`${file} page ${page.number}: ${error.message}`);}
  count++;
 }
}
if(!count)throw Error('No source formulas were checked');
console.log(`Verified local vendor hashes and rendered ${count} source formulas with KaTeX ${katex.version}`);
