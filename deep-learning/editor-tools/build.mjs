import {build} from 'esbuild';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const destination = path.resolve(root, '../assets/vendor/python-editor');
mkdirSync(destination, {recursive: true});
const result = await build({absWorkingDir: root, entryPoints: ['editor.js'], bundle: true,
  format: 'esm', target: 'es2022', minify: true, legalComments: 'eof',
  outfile: path.join(destination, 'editor.mjs'), metafile: true});
const packages = new Set(Object.keys(result.metafile.inputs).filter(p => p.startsWith('node_modules/'))
  .map(p => p.split('/').slice(0, p.split('/')[1].startsWith('@') ? 3 : 2).join('/')));
const metadata = [], licenses = [];
for (const name of [...packages].sort()) {
  const folder = path.join(root, name), pkg = JSON.parse(readFileSync(path.join(folder, 'package.json')));
  if (pkg.license !== 'MIT') throw Error('Review editor dependency license: ' + pkg.name);
  metadata.push({name: pkg.name, version: pkg.version, license: pkg.license,
    source: `https://www.npmjs.com/package/${pkg.name}/v/${pkg.version}`});
  licenses.push(`${pkg.name} ${pkg.version}\n\n${readFileSync(path.join(folder, 'LICENSE'), 'utf8')}`);
}
writeFileSync(path.join(destination, 'LICENSE.txt'), licenses.join('\n\n-----\n\n'));
const files = ['editor.mjs', 'LICENSE.txt'].map(name => ({path: name,
  sha256: createHash('sha256').update(readFileSync(path.join(destination, name))).digest('hex')}));
writeFileSync(path.join(destination, 'files.json'), JSON.stringify({
  source: 'https://codemirror.net/', build: 'editor-tools/editor.js via pinned package-lock.json',
  packages: metadata, files,
}, null, 2) + '\n');
const notebook = path.resolve(root, '../assets/notebook.js');
writeFileSync(notebook, readFileSync(notebook, 'utf8').replace(
  /\.\/vendor\/python-editor\/editor\.mjs(?:\?v=[a-f0-9]+)?/g,
  './vendor/python-editor/editor.mjs?v=' + files[0].sha256.slice(0, 16)));
console.log(`Vendored Python editor with ${metadata.length} MIT dependencies and SHA-256 manifest`);
