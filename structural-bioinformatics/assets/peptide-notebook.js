const definitions=[
 {title:'۱ · ساخت توالی‌های کوتاه',explain:'الفبای آزمایشی و طول را عوض کنید. تعداد ترکیب‌ها با طول به سرعت افزایش می‌یابد.',code:`from itertools import product
alphabet = "AR"
length = 2
if not alphabet or length < 1 or length > 6 or len(alphabet)**length > 256:
    raise ValueError("تعداد ترکیب‌ها باید بین ۱ تا ۲۵۶ باشد")
sequences = ["".join(x) for x in product(alphabet, repeat=length)]
print("تعداد:", len(sequences))
print(*sequences)`},
 {title:'۲ · بررسی پیوند دی‌سولفید',explain:'فاصلهٔ دو اتم گوگرد سیستئین را در ساختار تجربی حساب کنید؛ فاصله به آنگستروم است.',code:`import math
sulfur = {}
for line in pdb_text.splitlines():
    if line.startswith("ATOM  ") and line[21] == "A" and line[12:16].strip() == "SG" and line[16] in (" ", "A") and float(line[54:60]) > 0:
        number = int(line[22:26])
        if number in (2, 31):
            sulfur[number] = [float(line[i:i+8]) for i in (30, 38, 46)]
print("فاصلهٔ گوگردها:", round(math.dist(sulfur[2], sulfur[31]), 3), "Å")`},
 {title:'۳ · مقایسهٔ نتیجه با ساختار تجربی',explain:'RMSD فاصلهٔ متوسط مربعی اتم‌های متناظر را بدون جابه‌جایی یا انطباق دوباره نشان می‌دهد.',code:`import math
def atoms(text):
    result = {}
    for line in text.splitlines():
        if line.startswith("ENDMDL"):
            break
        if line.startswith(("ATOM  ", "HETATM")) and line[77:79].strip() not in ("H", "HD"):
            result[int(line[6:11])] = [float(line[i:i+8]) for i in (30, 38, 46)]
    return result
a, b = atoms(reference_qt), atoms(pose_qt)
if not a or a.keys() != b.keys():
    raise ValueError("اتم‌های متناظر برابر نیستند")
rmsd = math.sqrt(sum(math.dist(a[i], b[i])**2 for i in a) / len(a))
print("اتم‌ها:", len(a), "| RMSD:", round(rmsd, 4), "Å")`}
];
const root=document.querySelector('#peptide-cells');
if(root){
 const key='tnf-peptide-notebook-v1'; let saved=[]; try{saved=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(saved))saved=[];}catch{}
 let active=null,timer=null;const editors=[];const status=document.querySelector('#peptide-status');
 function stop(){if(active){active.terminate();active=null;}clearTimeout(timer);document.querySelectorAll('.peptide-run').forEach(b=>b.disabled=false);}
 function persist(){try{localStorage.setItem(key,JSON.stringify(editors.map(e=>e.value)));}catch{status.textContent='ذخیرهٔ محلی در این مرورگر در دسترس نیست.';}}
 definitions.forEach((d,i)=>{const card=document.createElement('article');card.className='peptide-cell';const heading=document.createElement('h4');heading.textContent=d.title;const p=document.createElement('p');p.textContent=d.explain;const editor=document.createElement('textarea');editor.setAttribute('aria-label','کد '+d.title);editor.spellcheck=false;editor.value=typeof saved[i]==='string'?saved[i]:d.code;editors.push(editor);const actions=document.createElement('div');actions.className='peptide-actions';const run=document.createElement('button');run.type='button';run.className='peptide-run';run.textContent='اجرای سلول';const halt=document.createElement('button');halt.type='button';halt.textContent='توقف';halt.addEventListener('click',()=>{stop();status.textContent='اجرا متوقف شد.';});const out=document.createElement('pre');out.className='peptide-output';out.textContent='خروجی اینجا نشان داده می‌شود.';editor.addEventListener('input',()=>{stop();persist();root.querySelectorAll('.peptide-output').forEach((o,j)=>{if(j>=i)o.textContent='کد تغییر کرد؛ دوباره اجرا کنید.';});});run.addEventListener('click',()=>{stop();const cells=editors.slice(0,i+1).map(e=>e.value);if(cells.some(c=>c.length>20000)){status.textContent='کد سلول بیش از حد طولانی است.';return;}document.querySelectorAll('.peptide-run').forEach(b=>b.disabled=true);out.textContent='در حال آماده‌سازی پایتون…';status.textContent='نخستین اجرا ممکن است زمان ببرد.';active=new Worker(new URL('./peptide-notebook-worker.mjs',import.meta.url),{type:'module'});timer=setTimeout(()=>{stop();out.textContent='زمان اجرا تمام شد.';},90000);active.onmessage=({data})=>{if(data.type==='running'){clearTimeout(timer);timer=setTimeout(()=>{stop();out.textContent='زمان اجرا تمام شد.';},10000);out.textContent='در حال محاسبه…';}else{out.textContent=data.type==='result'?(data.output||'(خروجی چاپ نشده است)'):data.message;status.textContent=data.type==='result'?'اجرا کامل شد.':'اجرا کامل نشد.';stop();}};active.onerror=()=>{stop();out.textContent='بارگذاری محیط پایتون انجام نشد.';};active.postMessage({cells});});actions.append(run,halt);card.append(heading,p,editor,actions,out);root.append(card);});
 document.querySelector('#peptide-reset').addEventListener('click',()=>{stop();editors.forEach((e,i)=>e.value=definitions[i].code);persist();document.querySelectorAll('.peptide-output').forEach(o=>o.textContent='خروجی اینجا نشان داده می‌شود.');status.textContent='کد اولیه بازگردانده شد.';});
}