import * as THREE from './vendor/three.module.js';

const stage = document.getElementById('molecule-viewer');
const sayError = () => { stage.dataset.state = 'error'; stage.textContent = 'نمای سه‌بعدی در این مرورگر در دسترس نیست؛ فایل‌های مختصات و اعداد همچنان قابل بررسی‌اند.'; };
function atoms(text, model) {
  let active = model == null; const out = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('MODEL ')) active = Number(line.slice(6).trim()) === model;
    else if (line.startsWith('ENDMDL')) active = false;
    else if (active && /^(ATOM  |HETATM)/.test(line)) {
      const type = line.trim().split(/\s+/).at(-1);
      if (['H', 'HD', 'D'].includes(type)) continue;
      const fields = [30, 38, 46].map(i => line.slice(i, i + 8).trim());
      const xyz = fields.map(Number);
      if (!fields.some(v => !v) && xyz.every(Number.isFinite)) out.push(xyz);
    }
  }
  return out;
}
async function main() {
  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); stage.replaceChildren(renderer.domElement);
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'مدل سه بعدی؛ با کلیدهای جهت بچرخانید');
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#eef4f5');
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000); camera.position.z = 100;
  const group = new THREE.Group(); scene.add(group);
  const light = new THREE.HemisphereLight(0xffffff, 0x94a9aa, 2.5); scene.add(light);
  function resize(){const w=stage.clientWidth,h=stage.clientHeight; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.render(scene,camera)}
  new ResizeObserver(resize).observe(stage);
  let dragging=false, x=0, y=0;
  renderer.domElement.addEventListener('pointerdown', e=>{dragging=true;x=e.clientX;y=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)});
  renderer.domElement.addEventListener('pointerup',()=>dragging=false);
  renderer.domElement.addEventListener('pointermove',e=>{if(!dragging)return;group.rotation.y+=(e.clientX-x)*.01;group.rotation.x+=(e.clientY-y)*.01;x=e.clientX;y=e.clientY;resize()});
  renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();camera.position.z=Math.max(25,Math.min(200,camera.position.z+e.deltaY*.06));resize()},{passive:false});
  renderer.domElement.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
    e.preventDefault();
    if(e.key==='ArrowLeft')group.rotation.y-=.12;
    if(e.key==='ArrowRight')group.rotation.y+=.12;
    if(e.key==='ArrowUp')group.rotation.x-=.12;
    if(e.key==='ArrowDown')group.rotation.x+=.12;
    resize();
  });
  const get = async path => {const r=await fetch(path); if(!r.ok) throw Error(path); return r.text()};
  const receptor=atoms(await get('data/receptor.pdbqt'),null);
  let generation=0;
  async function update(){
    const seq=document.getElementById('candidate')?.value, pose=Number(document.getElementById('pose')?.value);
    if(!['TWNSGHID','DIHGNSWT'].includes(seq)||![1,2,3].includes(pose)) return;
    const current=++generation; stage.dataset.state='loading';
    try {
      const peptide=atoms(await get(`data/${seq}.pdbqt`),pose); if(current!==generation)return;
      if(!receptor.length||!peptide.length)throw Error('No coordinates');
      while(group.children.length){const child=group.children[0];group.remove(child);child.geometry.dispose();child.material.dispose()}
      const center=new THREE.Vector3(); receptor.forEach(p=>center.add(new THREE.Vector3(...p)));center.divideScalar(receptor.length);
      for(const [points,color,radius] of [[receptor,0x438a9d,.35],[peptide,0xef8c3a,.65]]){
        const mesh=new THREE.InstancedMesh(new THREE.SphereGeometry(radius,8,6),new THREE.MeshLambertMaterial({color}),points.length);
        const matrix=new THREE.Matrix4(); points.forEach((p,i)=>{matrix.makeTranslation(p[0]-center.x,p[1]-center.y,p[2]-center.z);mesh.setMatrixAt(i,matrix)});group.add(mesh);
      }
      resize(); stage.dataset.candidate=seq;stage.dataset.pose=String(pose);stage.dataset.state='ready';
    } catch(e){if(current===generation)sayError()}
  }
  document.addEventListener('change',e=>{if(['candidate','pose'].includes(e.target.id))update()});
  await update();
}
main().catch(sayError);
