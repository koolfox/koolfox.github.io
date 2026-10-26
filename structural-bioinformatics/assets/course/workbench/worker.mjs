import {loadPyodide} from '../../vendor/code-editor/pyodide.mjs';

self.onmessage=async({data})=>{
 try{
  const base=new URL(data.siteRoot),root=new URL('assets/course/',base);
  const names=['interactive_lab.py','code_recipes.py','code_execution.py','gromacs/1ubq-protein.pdb'];
  const texts=await Promise.all(names.map(async name=>{const r=await fetch(new URL(name,root));if(!r.ok)throw Error(`Input unavailable: ${name}`);return r.text();}));
  const py=await loadPyodide({indexURL:new URL('runtime/concepts/shinylive/pyodide/',base).href});
  await py.loadPackage('numpy');
  py.FS.mkdirTree('/input');
  names.forEach((name,i)=>py.FS.writeFile('/input/'+name.split('/').at(-1),texts[i]));
  py.globals.set('__student_source',data.source);py.globals.set('__experiment_mode',data.mode);
  self.postMessage({type:'running'});
  const json=py.runPython(`
import runpy, json, sys, numpy as np
_lab = runpy.run_path('/input/interactive_lab.py')
_recipes = runpy.run_path('/input/code_recipes.py')
_execution = runpy.run_path('/input/code_execution.py')
_labels, _points = _lab['reference']('/input/1ubq-protein.pdb')
_inputs = {'points':_points.tolist(), 'labels':_labels, 'source_sha256':_lab['REFERENCE_SHA256']}
def _reference(p):
    mode = __experiment_mode
    if mode == 'sequence': s = _lab['sequence'](p['dna'])
    elif mode == 'geometry': s = _lab['geometry']('/input/1ubq-protein.pdb',**p)
    elif mode == 'energy': s = _lab['populations'](**p)
    elif mode == 'minimization': s = _lab['minimize'](**p)
    elif mode == 'sampling': s = _lab['sampling'](**p)
    elif mode == 'graph': s = _lab['graph']('/input/1ubq-protein.pdb',**p)
    else: raise ValueError('Unknown experiment')
    return _recipes['reference_view'](s)
_answer = _execution['execute'](__student_source,_inputs,_reference)
_answer['inputs'] = _inputs
_answer['runtime'] = {'python':sys.version.split()[0], 'numpy':np.__version__}
json.dumps(_answer,allow_nan=False)
`);
  self.postMessage({type:'result',value:JSON.parse(json)});
 }catch(error){self.postMessage({type:'fatal',message:String(error.message||error)});}
};
