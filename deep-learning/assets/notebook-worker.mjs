import {loadPyodide} from './vendor/pyodide.mjs';

let python;
self.onmessage = async ({data}) => {
  try {
    if (data.type === 'load') {
      python = await loadPyodide({indexURL: new URL('../runtime/neuron-xor/shinylive/pyodide/', import.meta.url).href});
      const response = await fetch(new URL('./notebook_kernel.py', import.meta.url));
      if (!response.ok) throw Error('Notebook kernel is unavailable');
      python.FS.writeFile('/home/pyodide/notebook_kernel.py', await response.text());
      self.postMessage({type: 'ready'}); return;
    }
    if (data.type !== 'run' || !python) throw Error('Python is not ready');
    python.globals.set('__notebook_request', JSON.stringify(data.request));
    const result = python.runPython(`
import json
from notebook_kernel import execute_cells
_request = json.loads(__notebook_request)
_record, _scope = execute_cells(_request['cells'], _request['until'], {})
json.dumps(_record, allow_nan=False)
`);
    self.postMessage({type: 'result', value: JSON.parse(result)});
  } catch (error) { self.postMessage({type: 'error', message: String(error.message || error).slice(-12000)}); }
};
