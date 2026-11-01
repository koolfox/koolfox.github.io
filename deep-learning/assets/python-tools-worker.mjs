import {loadPyodide} from './vendor/pyodide.mjs';

let python;
async function initialize(files) {
  python = await loadPyodide({indexURL: new URL('../runtime/neuron-xor/shinylive/pyodide/', import.meta.url).href});
  const home = '/home/pyodide/';
  for (const name of ['notebook_kernel.py', 'notebook_support.py']) {
    const response = await fetch(new URL('./' + name, import.meta.url));
    if (!response.ok) throw Error('Python support file is unavailable');
    python.FS.writeFile(home + name, await response.text());
  }
  for (const [name, source] of Object.entries(files || {})) {
    if (/^[a-zA-Z0-9_-]+\.py$/.test(name)) python.FS.writeFile(home + name, source);
  }
  const base = new URL('./vendor/python-tools/', import.meta.url);
  const manifest = await (await fetch(new URL('files.json', base))).json();
  const site = python.runPython('import sysconfig; sysconfig.get_path("purelib")');
  for (const entry of manifest.files) {
    if (entry.path.endsWith('.whl')) {
      python.unpackArchive(await (await fetch(new URL(entry.path, base))).arrayBuffer(), 'zip', {extractDir: site});
    } else if (entry.path === 'pyodide-lock.json') {
      python.FS.writeFile(home + 'notebook-package-index.json', await (await fetch(new URL(entry.path, base))).text());
    }
  }
  python.runPython('from notebook_support import complete_python, install_packages');
}

// Serialize work: completion requests cannot overwrite a running cell's input.
let queue = Promise.resolve();
self.onmessage = ({data}) => { queue = queue.then(async () => {
  try {
    if (data.type === 'load') { await initialize(data.files); self.postMessage({id:data.id, value:true}); return; }
    if (!python) throw Error('Python is not ready');
    python.globals.set('__tools_request', JSON.stringify(data.value));
    let result;
    if (data.type === 'complete') result = python.runPython(`
import json
_request = json.loads(__tools_request)
json.dumps(complete_python(_request['source'], _request['line'], _request['column']))
`);
    else if (data.type === 'install') result = await python.runPythonAsync(`
import json
json.dumps(await install_packages(json.loads(__tools_request)))
`);
    else if (data.type === 'run') result = python.runPython(`
import json
from notebook_kernel import execute_cells
_request = json.loads(__tools_request)
_record, _scope = execute_cells(_request['cells'], _request['until'], {})
json.dumps(_record, allow_nan=False)
`);
    else throw Error('Unknown Python operation');
    self.postMessage({id:data.id, value:JSON.parse(result)});
  } catch (error) { self.postMessage({id:data.id, error:String(error.message || error).slice(-12000)}); }
}); };
