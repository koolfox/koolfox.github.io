import {build} from 'esbuild';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),project=resolve(here,'..'),out=resolve(project,'assets/vendor/code-editor');
await mkdir(out,{recursive:true});
await build({entryPoints:[resolve(here,'editor.mjs')],outfile:resolve(out,'editor.js'),bundle:true,minify:true,format:'iife',target:'es2022',legalComments:'linked'});
await copyFile(resolve(here,'node_modules/pyodide/pyodide.mjs'),resolve(out,'pyodide.mjs'));
const lock=JSON.parse(await readFile(resolve(here,'package-lock.json'),'utf8'));
const packages=[];
for(const[name,value]of Object.entries(lock.packages)){
 if(!name.startsWith('node_modules/')||name.includes('@esbuild/'))continue;
 const file=resolve(here,name,'LICENSE');let license;
 try{license=await readFile(file,'utf8');}catch{try{license=await readFile(resolve(here,name,'LICENSE.txt'),'utf8');}catch{try{license=await readFile(resolve(here,name,'LICENSE.md'),'utf8');}catch{license=name==='node_modules/pyodide'?await readFile(resolve(here,'vendor-licenses/pyodide-0.27.7.txt'),'utf8'):'See package license: '+value.license;}}}
 packages.push({name:name.slice(13),version:value.version,license:value.license,distribution:value.resolved,integrity:value.integrity,license_text:license});
}
await writeFile(resolve(out,'LICENSES.json'),JSON.stringify(packages,null,2)+'\n');
const files=[];
for(const name of ['editor.js','editor.js.LEGAL.txt','pyodide.mjs','LICENSES.json']){
 let bytes;try{bytes=await readFile(resolve(out,name));}catch(error){if(error.code==='ENOENT')continue;throw error;}files.push({path:'assets/vendor/code-editor/'+name,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});
}
const source=await readFile(resolve(here,'editor.mjs'));
await writeFile(resolve(project,'data/metadata/code-editor-vendor.json'),JSON.stringify({generated_at_utc:new Date().toISOString(),source_sha256:createHash('sha256').update(source).digest('hex'),command:'npm ci --prefix structural-bioinformatics/editor-tools --ignore-scripts && npm --prefix structural-bioinformatics/editor-tools run build',pyodide_loader_version:'0.27.7',files,packages:packages.map(({license_text,...entry})=>entry)},null,2)+'\n');
console.log('Bundled CodeMirror and the loader matching the exported Pyodide runtime.');
