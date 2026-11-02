"""Source-bound films and their accessible, explicitly controlled player."""
import hashlib
import json
from html import escape
from pathlib import Path


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
        transcript = ''.join(f'<p>{escape(line)}</p>' for line in film['transcript_fa'])
        body = f'''<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title>
<link rel="stylesheet" href="/deep-learning/assets/course.css">
<style>body{{margin:0}}main{{max-width:72rem;margin:auto;padding:1rem}}h1{{font-size:1.25rem;margin:.2rem 0 1rem}}video{{display:block;width:100%;max-height:75dvh;background:#000}}summary{{cursor:pointer;margin-top:1rem}}p{{max-width:70ch;line-height:1.9}}::cue{{font-family:Arad,sans-serif;font-size:1rem;background:#000c}}</style>
<main><h1>{title}</h1><video controls playsinline preload="metadata" aria-label="{title}">
<source src="/deep-learning/{film['video']['path']}" type="video/mp4">
<track kind="captions" src="/deep-learning/{film['captions']['path']}" srclang="fa" label="فارسی" default>
</video><details><summary>متن فیلم</summary>{transcript}</details></main>
<script>document.addEventListener('visibilitychange',()=>{{if(document.hidden)document.querySelector('video').pause()}});window.addEventListener('pagehide',()=>document.querySelector('video').pause());</script></html>'''
        destination = output / f"animations/{film['id']}/index.html"
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(body)
