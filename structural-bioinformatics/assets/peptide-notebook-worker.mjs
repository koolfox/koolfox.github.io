import {loadPyodide} from './vendor/code-editor/pyodide.mjs';
self.onmessage = async ({data}) => {
 try {
  const names = ['7ta3.pdb','reference.pdbqt','native-pose.pdbqt'];
  const texts = await Promise.all(names.map(async n => {const r=await fetch(new URL('tnf-peptide/'+n, import.meta.url)); if(!r.ok) throw Error('فایل '+n+' در دسترس نیست'); return r.text();}));
  const py=await loadPyodide({indexURL:new URL('../runtime/concepts/shinylive/pyodide/',import.meta.url).href});
  ['pdb_text','reference_qt','pose_qt'].forEach((n,i)=>py.globals.set(n,texts[i]));
  let output=''; py.setStdout({batched:s=>{output+=(s+'\n'); if(output.length>20000) throw Error('خروجی بیش از حد طولانی است');}});
  self.postMessage({type:'running'});
  for(let i=0;i<data.cells.length;i++){output=''; try {await py.runPythonAsync(data.cells[i]);} catch(e){throw Error('سلول '+(i+1)+': '+e.message);}}
  self.postMessage({type:'result',output});
 }catch(e){self.postMessage({type:'error',message:String(e.message||e)});}
};