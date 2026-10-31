// Compile the authored LaTeX once. Public pages need no math JavaScript or CDN.
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import katex from 'katex';
const base=fileURLToPath(new URL('../',import.meta.url));
const dist=fileURLToPath(new URL('./node_modules/katex/dist/',import.meta.url));
const target=base+'assets/vendor/katex/';
const sha=s=>createHash('sha256').update(s).digest('hex');
const document=JSON.parse(readFileSync(base+'content/slides/spring-2022.json','utf8'));
const sessions={};
for(const unit of document.sessions){
 const latex=unit.formula_latex;
 sessions[unit.session_id]={latex_sha256:sha(latex),html:katex.renderToString(latex,{displayMode:true,output:'htmlAndMathml',throwOnError:true,trust:false,strict:'error'})};
}
mkdirSync(target+'fonts',{recursive:true});
const css=readFileSync(dist+'katex.min.css','utf8');
// These pages support WOFF2; omit obsolete fallback URLs and their duplicate files.
writeFileSync(target+'katex.min.css',css.replace(/src:([^;]+);/g,(all,value)=>value.includes('.woff2')?'src:'+value.split(',').filter(x=>x.includes('.woff2')).join(',')+';':all));
const fonts=readdirSync(dist+'fonts').filter(n=>n.endsWith('.woff2')).sort();
for(const name of fonts)copyFileSync(dist+'fonts/'+name,target+'fonts/'+name);
copyFileSync(dist+'../LICENSE',target+'LICENSE.txt');
const files=['katex.min.css','LICENSE.txt',...fonts.map(n=>'fonts/'+n)];
writeFileSync(target+'files.json',JSON.stringify({version:katex.version,source:'https://registry.npmjs.org/katex/-/katex-'+katex.version+'.tgz',retrieved_at_utc:new Date().toISOString(),css_changes:'Keep WOFF2 font sources only; original CSS SHA-256 '+sha(css),files:files.map(path=>({path,sha256:sha(readFileSync(target+path))}))},null,2)+'\n');
mkdirSync(base+'content/slides/math',{recursive:true});
writeFileSync(base+'content/slides/math/spring-2022.json',JSON.stringify({renderer:'KaTeX',version:katex.version,sessions},null,2)+'\n');
console.log(`Compiled ${Object.keys(sessions).length} formulas with KaTeX ${katex.version}`);
