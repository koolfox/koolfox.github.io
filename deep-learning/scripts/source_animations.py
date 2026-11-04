"""Source-bound films and their accessible, explicitly controlled player."""
import hashlib
import json
from html import escape
from pathlib import Path

PLAYER_SCRIPT = r"""<script>
const video=document.querySelector('video'),chapters=[...document.querySelectorAll('[data-film-time]')],status=document.querySelector('.film-status');
const mediaURL=video.querySelector('source').src,controller=new AbortController();
let preparation,blobURL,leaving=false;
function prepareMovie(){
 if(preparation)return preparation;
 for(const button of chapters)button.disabled=true;
 status.textContent='در حال بارگیری فیلم...';
 preparation=(async()=>{
  const response=await fetch(mediaURL,{signal:controller.signal});if(!response.ok)throw Error('فیلم بارگیری نشد.');
  const bytes=await response.arrayBuffer();if(leaving)return;
  blobURL=URL.createObjectURL(new Blob([bytes],{type:'video/mp4'}));
  await new Promise((resolve,reject)=>{
   const ready=()=>{video.removeEventListener('error',failed);resolve();};
   const failed=()=>{video.removeEventListener('loadedmetadata',ready);reject(Error('فیلم پخش نشد.'));};
   video.addEventListener('loadedmetadata',ready,{once:true});video.addEventListener('error',failed,{once:true});video.src=blobURL;
  });
 })().catch(error=>{preparation=null;if(blobURL){URL.revokeObjectURL(blobURL);blobURL=null;}throw error;}).finally(()=>{if(!leaving)status.textContent='';for(const button of chapters)button.disabled=false;});
 return preparation;
}
function showFailure(message){if(!leaving)status.textContent=message;}
for(const button of chapters)button.addEventListener('click',async()=>{
 video.pause();try{await prepareMovie();if(!leaving){video.pause();video.currentTime=Number(button.dataset.filmTime);}}catch{showFailure('بارگیری فیلم انجام نشد. دوباره تلاش کنید.');}
});
video.addEventListener('timeupdate',()=>{let current=null;for(const button of chapters)if(Number(button.dataset.filmTime)<=video.currentTime+.05)current=button;for(const button of chapters)button.setAttribute('aria-pressed',String(button===current));});
if(new URLSearchParams(location.search).get('play')==='1')prepareMovie().then(()=>{if(!leaving&&!document.hidden)return video.play().catch(()=>showFailure('برای پخش، دکمه پخش فیلم را بزنید.'));}).catch(()=>showFailure('بارگیری فیلم انجام نشد. دوباره تلاش کنید.'));
document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});
window.addEventListener('pagehide',()=>{leaving=true;controller.abort();video.pause();if(blobURL)URL.revokeObjectURL(blobURL);});
</script>"""


def animation_files(root):
    manifest = json.loads((root / 'animations/manifest.json').read_text())
    files = ['animations/manifest.json']
    for item in manifest['films']:
        for field in ('video', 'captions'):
            record = item[field]
            path = Path(record['path'])
            if path.is_absolute() or '..' in path.parts:
                raise ValueError('Unsafe animation path')
            data = (root / path).read_bytes()
            if hashlib.sha256(data).hexdigest() != record['sha256']:
                raise ValueError(f'Stale animation: {path}')
            files.append(str(path))
    return files


def build_animation_pages(root, output):
    animation_files(root)
    manifest = json.loads((root / 'animations/manifest.json').read_text())
    for film in manifest['films']:
        title = escape(film['title_fa'])
        chapters = film.get('chapters', [])
        if any(not 0 <= chapter['time'] < film['duration_seconds'] for chapter in chapters):
            raise ValueError('Film chapter outside duration')
        buttons = ''.join(f'<button type="button" data-film-time="{chapter["time"]}" aria-pressed="false">{escape(chapter["label_fa"])}</button>' for chapter in chapters)
        transcript = ''.join(f'<p>{escape(line)}</p>' for line in film['transcript_fa'])
        body = f'''<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title>
<link rel="stylesheet" href="/deep-learning/assets/course.css">
<style>body{{margin:0}}main{{max-width:72rem;margin:auto;padding:1rem}}h1{{font-size:1.25rem;margin:.2rem 0 1rem}}video{{display:block;width:100%;max-height:75dvh;background:#000}}summary{{cursor:pointer;margin-top:1rem}}.film-status:empty{{display:none}}.film-status{{color:#9b2c24;margin:.5rem 0}}.film-chapters{{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}}.film-chapters button{{font:inherit;font-size:.875rem;min-height:44px;padding:8px 12px;border:1px solid #c7d3e6;border-radius:5px;background:#fff;color:#172134;cursor:pointer}}.film-chapters button[aria-pressed=true]{{background:#245bdf;color:#fff;border-color:#245bdf}}.film-chapters button:focus-visible{{outline:2px solid #245bdf;outline-offset:2px}}p{{max-width:70ch;line-height:1.9}}::cue{{font-family:Arad,sans-serif;font-size:1rem;background:#000c}}</style>
<main><h1>{title}</h1><video controls playsinline preload="metadata" aria-label="{title}">
<source src="/deep-learning/{film['video']['path']}?sha={film['video']['sha256']}" type="video/mp4">
<track kind="captions" src="/deep-learning/{film['captions']['path']}?sha={film['captions']['sha256']}" srclang="fa" label="فارسی" default>
</video><p class="film-status" role="status" aria-live="polite"></p><nav class="film-chapters" aria-label="مراحل محاسبه">{buttons}</nav><details><summary>متن فیلم</summary>{transcript}</details></main>
{PLAYER_SCRIPT}</html>'''
        destination = output / f"animations/{film['id']}/index.html"
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(body)
