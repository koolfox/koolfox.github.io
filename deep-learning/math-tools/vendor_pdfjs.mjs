import {readFileSync,writeFileSync,mkdirSync,readdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const base=fileURLToPath(new URL('./node_modules/pdfjs-dist/',import.meta.url)),target=fileURLToPath(new URL('../assets/vendor/pdfjs/',import.meta.url));
const version=JSON.parse(readFileSync(base+'package.json')).version,files=[];
function copy(source,path){mkdirSync(target+path.split('/').slice(0,-1).join('/'),{recursive:true});copyFileSync(base+source,target+path);files.push({path,sha256:createHash('sha256').update(readFileSync(target+path)).digest('hex')});}
// The legacy build includes the browser feature shims required by the worker.
// Missing Math.sumPrecise otherwise corrupts some embedded font mappings.
for(const name of ['pdf.min.mjs','pdf.worker.min.mjs'])copy('legacy/build/'+name,name);
copy('LICENSE','LICENSE.txt');
for(const folder of ['cmaps','standard_fonts','wasm'])for(const name of readdirSync(base+folder).sort())if(!name.startsWith('quickjs-'))copy(folder+'/'+name,folder+'/'+name);
writeFileSync(target+'files.json',JSON.stringify({version,build:'legacy',source:'https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-'+version+'.tgz',retrieved_at_utc:new Date().toISOString(),changes:'Unmodified legacy core and worker with browser feature shims; PDF scripting sandbox and QuickJS evaluator are not included.',files},null,2)+'\n');
const katex=fileURLToPath(new URL('./node_modules/katex/dist/katex.mjs',import.meta.url));
const katexTarget=fileURLToPath(new URL('../assets/vendor/katex/katex.mjs',import.meta.url));
copyFileSync(katex,katexTarget);
const km=fileURLToPath(new URL('../assets/vendor/katex/files.json',import.meta.url));const manifest=JSON.parse(readFileSync(km));manifest.files=manifest.files.filter(f=>f.path!=='katex.mjs');manifest.files.push({path:'katex.mjs',sha256:createHash('sha256').update(readFileSync(katexTarget)).digest('hex')});writeFileSync(km,JSON.stringify(manifest,null,2)+'\n');
console.log('Vendored PDF.js',version,files.length,'files');
