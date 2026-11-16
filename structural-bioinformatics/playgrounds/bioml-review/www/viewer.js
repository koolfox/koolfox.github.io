// PDBQT coordinates are copied verbatim into PDB records; no alignment is applied.
const stage = document.getElementById('molecule-viewer');
let viewer;
let generation = 0;
let pending = Promise.resolve();
const sayError = () => {
  stage.dataset.state = 'error';
  stage.textContent = 'نمای سه‌بعدی در این مرورگر در دسترس نیست؛ فایل‌های مختصات و اعداد همچنان قابل بررسی‌اند.';
};

function pdbFromPdbqt(text, model = null) {
  let active = model === null;
  let foundModel = false;
  const records = [];
  for (const line of text.split(/\r?\n/)) {
    if (/^MODEL\s/.test(line)) {
      active = model !== null && Number(line.slice(6).trim()) === model;
      if (active) foundModel = true;
    } else if (line.startsWith('ENDMDL')) active = false;
    else if (active && /^(ATOM  |HETATM)/.test(line)) {
      const type = line.trim().split(/\s+/).at(-1);
      if (['H', 'HD', 'D'].includes(type)) continue;
      const element = ({ A: 'C', OA: 'O', NA: 'N', SA: 'S' })[type] || type;
      const xyz = [30, 38, 46].map(i => line.slice(i, i + 8).trim());
      if (!xyz.every(v => v && Number.isFinite(Number(v))) || !/^[A-Za-z]{1,2}$/.test(element)) {
        throw Error('Invalid PDBQT atom');
      }
      records.push(line.slice(0, 66).padEnd(76) + element.toUpperCase().padStart(2));
    }
  }
  if (!records.length || (model !== null && !foundModel)) throw Error('Missing coordinates or MODEL');
  return records.join('\n') + '\nEND\n';
}

async function get(path) {
  const response = await fetch(path);
  if (!response.ok) throw Error(`Could not load ${path}`);
  return response.text();
}

async function addStructure(plugin, pdb, label, type, color) {
  const data = await plugin.builders.data.rawData({ data: pdb, label });
  const trajectory = await plugin.builders.structure.parseTrajectory(data, 'pdb');
  const model = await plugin.builders.structure.createModel(trajectory, { modelIndex: 0 });
  const structure = await plugin.builders.structure.createStructure(model, { name: 'model', params: {} });
  const component = await plugin.builders.structure.tryCreateComponentStatic(structure, type === 'cartoon' ? 'polymer' : 'all');
  if (!component) throw Error(`Missing ${label} component`);
  await plugin.builders.structure.representation.addRepresentation(component, {
    type, color: 'uniform', colorParams: { value: color },
  });
  return model.obj.data.atomicConformation.x.length;
}

async function main() {
  if (!window.molstar) throw Error('Mol* unavailable');
  const receptor = pdbFromPdbqt(await get('data/receptor.pdbqt'));
  viewer = await molstar.Viewer.create('molecule-viewer', {
    extensions: [], customFormats: [], layoutIsExpanded: false, layoutShowControls: false,
    layoutShowSequence: false, layoutShowLog: false, layoutShowLeftPanel: false,
    layoutShowRemoteState: false, viewportShowExpand: false, viewportShowControls: false,
    viewportShowSettings: false, viewportShowSelectionMode: false, viewportShowAnimation: false,
    viewportShowTrajectoryControls: false, viewportShowScreenshotControls: false,
    viewportShowToggleFullscreen: false, viewportShowReset: false,
    viewportBackgroundColor: '#eef4f5', volumeStreamingDisabled: true,
    allowMajorPerformanceCaveat: true,
  });
  const plugin = viewer.plugin;
  if (!plugin.canvas3d) throw Error('WebGL unavailable');
  async function update(seq, pose, current) {
    const peptide = pdbFromPdbqt(await get(`data/${seq}.pdbqt`), pose);
    if (current !== generation) return;
    await plugin.clear();
    const receptorAtoms = await addStructure(plugin, receptor, 'TNF receptor', 'cartoon', 0x438a9d);
    const peptideAtoms = await addStructure(plugin, peptide, seq, 'ball-and-stick', 0xef8c3a);
    if (current !== generation) return;
    plugin.canvas3d.requestCameraReset({ durationMs: 0 });
    stage.dataset.candidate = seq;
    stage.dataset.pose = String(pose);
    stage.dataset.receptorAtoms = String(receptorAtoms);
    stage.dataset.peptideAtoms = String(peptideAtoms);
    stage.dataset.state = 'ready';
  }
  function schedule() {
    const seq = document.getElementById('candidate')?.value;
    const pose = Number(document.getElementById('pose')?.value);
    if (!['TWNSGHID', 'DIHGNSWT'].includes(seq) || ![1, 2, 3].includes(pose)) return;
    const current = ++generation;
    stage.dataset.state = 'loading';
    pending = pending.catch(() => {}).then(() => update(seq, pose, current))
      .catch(() => { if (current === generation) sayError(); });
  }
  document.addEventListener('change', e => {
    if (['candidate', 'pose'].includes(e.target.id)) schedule();
  });
  schedule();
}
main().catch(sayError);
addEventListener('pagehide', () => viewer?.dispose());
