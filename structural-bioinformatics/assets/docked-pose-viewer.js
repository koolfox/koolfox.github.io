import { MolecularScene } from './molecular-scene.js';
const $ = id => document.getElementById(id);
const status = $('pose-status');
const description = $('sample-description');
const stage = $('pose-stage');
const select = $('pose-select');
const reset = $('reset-view');
const downloadStatus = $('download-status');
const backLink = $('back-to-research');
const decoder = new TextDecoder();
let scene;
let result;
let requestId = 0;
function parseCA(text, chainId) {
 const residues=[]; const seen=new Set(); const chains=new Set();
 for(const line of text.split(/\r?\n/)) {
  if(!/^(ATOM  |HETATM)/.test(line) || (chainId === 'T' && !line.startsWith('ATOM  ')) || line.slice(12,16).trim() !== 'CA') continue;
  const alt=line[16];if(alt !== ' ' && alt !== 'A') continue;
  const residueNumber=line.slice(22,26).trim(); if(!residueNumber) throw Error('شمارهٔ اسیدآمینه ناقص است.');
  const number=Number(residueNumber); const insertion=line[26]?.trim() || '';
  chains.add(line[21]);if(chains.size>1)throw Error('فایل انتخابی باید یک زنجیره داشته باشد.');
  const key=line[21]+':'+number+':'+insertion;
  if(seen.has(key)) continue;
  const values=[30,38,46].map(i=>line.slice(i,i+8).trim());
  if(values.some(v=>!v))throw Error('مختصات ناقص است.');
  const xyz=values.map(Number);
  if(!Number.isInteger(number)||xyz.some(v=>!Number.isFinite(v))) throw Error('مختصات نامعتبر است.');
  const occupancy=Number(line.slice(54,60));if(!Number.isFinite(occupancy)||occupancy<=0)continue;
  seen.add(key);residues.push({chain:chainId,number,insertion,name:line.slice(17,20).trim(),xyz});
 }
 if(!residues.length) throw Error('اتم Cα در فایل پیدا نشد.');
 return {id:chainId,kind:'protein_ca',residues};
}
function splitPoses(text) {
 const blocks=[...text.matchAll(/^MODEL\s+\d+\s*$([\s\S]*?)^ENDMDL\s*$/gm)].map(m=>m[1]);
 if(!blocks.length) throw Error('حالت کامل MODEL در فایل PDBQT پیدا نشد.');return blocks;
}

async function readReport(path) {
  const response = await fetch(path);
  if (!response.ok) throw Error('گزارش این اجرا در دسترس نیست.');
  return response.json();
}

async function verifyFile(path, expectedHash) {
  if (!globalThis.crypto?.subtle) throw Error('این مرورگر نمی‌تواند هش فایل را بررسی کند.');
  const response = await fetch(path);
  if (!response.ok) throw Error('یکی از فایل‌های این نتیجه در دسترس نیست.');
  const bytes = await response.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  if (hash !== expectedHash) throw Error('هش فایل با گزارش این نتیجه همخوان نیست.');
  return bytes;
}

async function readRecordedFiles(targetPath, targetHash, posesPath, posesHash) {
  const [target, poses] = await Promise.all([
    verifyFile(targetPath, targetHash),
    verifyFile(posesPath, posesHash),
  ]);
  return {
    targetText: decoder.decode(target),
    posesText: decoder.decode(poses),
    targetPath,
    posesPath,
  };
}

async function readSaved(sequence, batch) {
  const folder = `peptide-ops-39-demo/docking/batch-00000${batch}/docking/`;
  const report = await readReport(folder + 'report.json');
  const candidate = report.candidates?.find(row => row.sequence === sequence);
  if (candidate?.status !== 'requires_further_validation' || !candidate.poses?.length) {
    throw Error('نتیجهٔ این توالی در گزارش دسته پیدا نشد. دوباره از فهرست نامزدها انتخاب کنید.');
  }
  const files = await readRecordedFiles(
    folder + 'selected-chain.pdb', report.selected_pdb_sha256,
    folder + sequence + '/poses.pdbqt', candidate.poses_sha256,
  );
  return {
    ...files,
    sequence,
    poseCount: candidate.poses.length,
    description: `نتیجهٔ ثبت‌شدهٔ ${sequence} در هدف آزمایشی 1UBQ.`,
  };
}

async function readSample() {
  const folder = 'docked-ac-visualization/';
  const manifest = await readReport(folder + 'manifest.json');
  if (manifest.sequence !== 'AC' || !manifest.files?.length) {
    throw Error('گزارش خروجی سه‌بعدی با نمونهٔ AC همخوان نیست.');
  }
  const files = await readRecordedFiles(
    folder + 'receptor.pdb', manifest.source_receptor_sha256,
    'general-docking-demo/AC/poses.pdbqt', manifest.source_poses_sha256,
  );
  const sdfPaths = await Promise.all(manifest.files.map(async (entry, index) => {
    const name = `pose-${index + 1}.sdf`;
    if (entry.pose !== index + 1 || entry.sdf !== name) return null;
    try {
      await verifyFile(folder + name, entry.sdf_sha256);
      return folder + name;
    } catch {
      return null;
    }
  }));
  return {
    ...files,
    sequence: 'AC',
    poseCount: manifest.files.length,
    sdfPaths,
    description: 'نمونهٔ آمادهٔ AC در هدف آزمایشی 1UBQ.',
  };
}

async function readLocalFiles() {
  const [target] = $('target-file').files;
  const [poses] = $('pose-file').files;
  if (!target || !poses) throw Error('هر دو فایل را انتخاب کنید.');
  if (target.size > 10000000 || poses.size > 10000000) {
    throw Error('اندازهٔ هر فایل باید کمتر از ۱۰ مگابایت باشد.');
  }
  return {
    targetText: await target.text(),
    posesText: await poses.text(),
    description: 'فایل‌های انتخابی شما. هویت پپتید و مطابقت فایل‌ها خودکار بررسی نمی‌شود.',
  };
}

function setDownload(id, path, label, filename) {
  const link = $(id);
  link.hidden = !path;
  if (path) link.href = path;
  else link.removeAttribute('href');
  link.download = path ? filename : '';
  link.textContent = path ? label : '';
}

function updateDownloads() {
  const index = Number(select.value);
  const sequence = result?.sequence;
  const sdf = result?.sdfPaths?.[index];
  setDownload('download-target', result?.targetPath, 'دریافت گیرندهٔ 1UBQ همین اجرا (PDB)', `${sequence}-receptor.pdb`);
  setDownload('download-poses', result?.posesPath, `دریافت همهٔ حالت‌های ${sequence} (PDBQT)`, `${sequence}-poses.pdbqt`);
  setDownload('download-sdf', sdf, `دریافت حالت ${index + 1} از ${sequence} (SDF)`, `${sequence}-pose-${index + 1}.sdf`);
  if (result?.posesPath) {
    downloadStatus.textContent = sdf
      ? 'فایل PDBQT همهٔ حالت‌ها را دارد. فایل SDF مربوط به حالت انتخابی است.'
      : 'فایل SDF تأییدشده برای این حالت در دسترس نیست. از فایل PDBQT همین اجرا استفاده کنید.';
  } else if (result) {
    downloadStatus.textContent = 'برای بررسی خارج از مرورگر، از فایل‌های اصلی انتخاب‌شده استفاده کنید.';
  }
}

function renderPose() {
  updateDownloads();
  const index = Number(select.value);
  const position = `حالت ${index + 1} از ${result.poses.length}`;
  try {
    if (!scene) throw Error('نمای سه‌بعدی در این مرورگر در دسترس نیست.');
    const peptide = parseCA(result.poses[index], 'P');
    stage.hidden = false;
    scene.setStructure({id: 'docked-pose', chains: [result.target, peptide]});
    scene.setChainColor('T', '#245cb7');
    scene.setChainColor('P', '#e16b29');
    status.textContent = `${position}؛ هدف ${result.target.residues.length} و پپتید ${peptide.residues.length} اتم Cα. چرخش، حرکت دوربین است.`;
    status.removeAttribute('data-state');
    reset.disabled = false;
  } catch (error) {
    stage.hidden = true;
    stage.dataset.state = 'error';
    reset.disabled = true;
    status.dataset.state = 'error';
    status.textContent = `${position}؛ ${error.message}`;
  }
}

async function load(label, read) {
  const current = ++requestId;
  result = undefined;
  description.textContent = label;
  select.replaceChildren();
  select.disabled = true;
  reset.disabled = true;
  stage.hidden = true;
  stage.dataset.state = 'loading';
  status.removeAttribute('data-state');
  status.textContent = 'در حال بررسی فایل‌ها…';
  downloadStatus.textContent = '';
  updateDownloads();

  try {
    const data = await read();
    if (current !== requestId) return;
    const poses = splitPoses(data.posesText);
    if (data.poseCount !== undefined && poses.length !== data.poseCount) {
      throw Error('شمار حالت‌ها در فایل و گزارش یکسان نیست.');
    }
    result = { ...data, poses, target: parseCA(data.targetText, 'T') };
    description.textContent = data.description + ' در نمای سه‌بعدی، مسیر Cα هدف آبی و مسیر پپتید نارنجی است.';
    poses.forEach((_, index) => select.add(new Option(`حالت ${index + 1}`, String(index))));
    select.disabled = false;
    renderPose();
  } catch (error) {
    if (current !== requestId) return;
    stage.dataset.state = 'error';
    status.dataset.state = 'error';
    status.textContent = 'نمایش انجام نشد: ' + error.message;
    if (read !== readLocalFiles) {
      downloadStatus.textContent = 'پیوندهای دریافت غیرفعال‌اند. صفحه را دوباره بارگذاری کنید یا به فهرست نامزدها برگردید.';
    }
  }
}

try {
  const { MolecularScene } = await import('./molecular-scene.js');
  scene = new MolecularScene(stage, {descriptionIds: 'pose-status'});
  scene.addEventListener('viewererror', () => {
    scene = undefined;
    if (result) renderPose();
  });
} catch {
  // Recorded files and pose selection remain available without the renderer.
}

select.addEventListener('change', renderPose);
reset.addEventListener('click', () => scene.resetView());
$('load-files').addEventListener('click', () => load('فایل‌های انتخابی شما', readLocalFiles));
$('load-sample').addEventListener('click', () => {
  history.replaceState(null, '', location.pathname);
  backLink.href = '../research.html';
  backLink.textContent = 'بازگشت به پژوهش';
  load('نمونهٔ درخواستی AC', readSample);
});

const params = new URLSearchParams(location.search);
if (['demo', 'sequence', 'batch'].some(name => params.has(name))) {
  backLink.href = 'peptide-workflow.html';
  backLink.textContent = 'بازگشت به فهرست نامزدها';
  const sequence = params.get('sequence');
  const batch = params.get('batch');
  if (params.get('demo') === '39' && /^[ACDEFGHIKLMNPQRSTVWY]{2}$/.test(sequence) && /^[12]$/.test(batch)) {
    load(`نتیجهٔ درخواستی ${sequence}`, () => readSaved(sequence, batch));
  } else {
    load('انتخاب نتیجهٔ ثبت‌شده', () => {
      throw Error('نشانی نتیجه معتبر نیست. دوباره از فهرست نامزدها انتخاب کنید.');
    });
  }
} else {
  load('نمونهٔ درخواستی AC', readSample);
}
