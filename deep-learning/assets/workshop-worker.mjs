import {loadPyodide} from './vendor/pyodide.mjs';

let py;
self.onmessage = async ({data}) => {
  try {
    if (data.type === 'load') {
      py = await loadPyodide({indexURL: new URL('/deep-learning/runtime/neuron-xor/shinylive/pyodide/', self.location).href});
      self.postMessage({type:'ready'});
      return;
    }
    if (data.type !== 'run' || !py) throw Error('Python is not ready');
    if (typeof data.source !== 'string' || data.source.length > 30000) throw Error('Code is too long');
    py.globals.set('__student_source', data.source);
    const value = py.runPython(`
import io, json, contextlib, sys
_stdout = io.StringIO()
_scope = {'__name__': '__main__'}
with contextlib.redirect_stdout(_stdout), contextlib.redirect_stderr(_stdout):
    exec(compile(__student_source, 'workshop.py', 'exec'), _scope)
_result = _scope.get('result')
if not isinstance(_result, dict) or not _result:
    raise ValueError('Put a non-empty dictionary in result')
_serialized = json.dumps(_result, allow_nan=False)
if len(_serialized) > 100000:
    raise ValueError('Result exceeds 100000 characters')
json.dumps({'result': _result, 'stdout': _stdout.getvalue()[:10000], 'python': sys.version.split()[0]}, allow_nan=False)
`);
    self.postMessage({type:'result', value:JSON.parse(value)});
  } catch (error) {
    self.postMessage({type:'error', message:String(error.message || error).slice(-12000)});
  }
};
