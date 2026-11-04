import { MolecularScene } from './molecular-scene.js';
const $ = id => document.getElementById(id);
let scene, targetText = '', poseTexts = [], requestId = 0;
const status = $('pose-status');
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
function draw() {
 const n=Number($('pose-select').value); const target=parseCA(targetText,'T');const peptide=parseCA(poseTexts[n],'P');
 $('pose-stage').hidden=false;scene.setStructure({id:'docked-pose',chains:[target,peptide]});scene.setChainColor('T','#245cb7');scene.setChainColor('P','#e16b29');
 status.textContent=`حالت ${n+1} از ${poseTexts.length}؛ هدف ${target.residues.length} و پپتید ${peptide.residues.length} اتم Cα. چرخش، حرکت دوربین است.`;
 $('reset-view').disabled=false;
}
function setData(target,poses) {
 targetText=target;poseTexts=splitPoses(poses);const select=$('pose-select');select.replaceChildren();
 poseTexts.forEach((_,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=`حالت ${i+1}`;select.append(o)});select.disabled=false;draw();
}
async function sample(){
 const current=++requestId;status.textContent='در حال بارگذاری نمونه…';
 try {const rs=await Promise.all(['docked-ac-visualization/receptor.pdb','general-docking-demo/AC/poses.pdbqt'].map(u=>fetch(u)));if(rs.some(r=>!r.ok))throw Error('فایل نمونه در دسترس نیست.');const target=await rs[0].text(),poses=await rs[1].text();if(current===requestId)setData(target,poses)}catch(e){if(current===requestId){$('pose-stage').hidden=true;status.textContent='نمایش انجام نشد: '+e.message}}
}
try {
 scene=new MolecularScene($('pose-stage'),{descriptionIds:'pose-status'});
 $('pose-select').addEventListener('change',()=>{try{draw()}catch(e){$('pose-stage').hidden=true;status.textContent=e.message}});
 $('load-sample').addEventListener('click',sample);$('reset-view').addEventListener('click',()=>scene.resetView());
 $('load-files').addEventListener('click',async()=>{const current=++requestId;try{const a=$('target-file').files[0],b=$('pose-file').files[0];if(!a||!b)throw Error('هر دو فایل را انتخاب کنید.');if(a.size>10000000||b.size>10000000)throw Error('اندازهٔ هر فایل باید کمتر از ۱۰ مگابایت باشد.');const target=await a.text(),poses=await b.text();if(current===requestId)setData(target,poses)}catch(e){if(current===requestId){$('pose-stage').hidden=true;status.textContent='نمایش انجام نشد: '+e.message}}});
 const params=new URLSearchParams(location.search);
 const sequence=params.get('sequence'),batch=params.get('batch');
 if(params.get('demo')==='39' && /^[ACDEFGHIKLMNPQRSTVWY]{2}$/.test(sequence||'') && /^(1|2)$/.test(batch||'')) {
  const current=++requestId;
  const folder=`peptide-ops-39-demo/docking/batch-00000${batch}/docking/`;
  status.textContent='در حال بارگذاری نتیجهٔ ثبت‌شده…';
  Promise.all([fetch(folder+'report.json'),fetch(folder+'selected-chain.pdb'),fetch(folder+sequence+'/poses.pdbqt')])
   .then(async rs=>{if(rs.some(r=>!r.ok))throw Error('فایل نتیجه در دسترس نیست.');const report=await rs[0].json();if(!report.candidates.some(row=>row.sequence===sequence))throw Error('توالی در گزارش این دسته نیست.');const [target,poses]=await Promise.all([rs[1].text(),rs[2].text()]);if(current===requestId){setData(target,poses);$('sample-description').textContent=`نتیجهٔ ثبت‌شدهٔ ${sequence} در هدف آزمایشی 1UBQ؛ آبی هدف و نارنجی پپتید است.`}})
   .catch(e=>{if(current===requestId){$('pose-stage').hidden=true;status.textContent='نمایش انجام نشد: '+e.message}});
 } else sample();
}catch(e){status.textContent='نمای سه‌بعدی در این مرورگر در دسترس نیست. فایل‌های SDF را دریافت کنید.'}
