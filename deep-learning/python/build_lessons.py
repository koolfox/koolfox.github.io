"""Build the course reader from original scripts and their actual stdout."""
import contextlib
import io
import runpy
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess
import sys

import numpy as np

from lesson_visuals import build_spring_visual

ROOT = Path(__file__).resolve().parents[1]


def build():
    metadata = json.loads((ROOT / 'lesson_metadata.json').read_text())
    inventory = json.loads((ROOT / 'assets/data/curriculum.json').read_text())
    sources = {item['number']: item for item in inventory['lessons'] if item.get('kind') == 'lecture_slides'}
    if sorted(item['id'] for item in metadata) != sorted(sources):
        raise ValueError('Expected each Spring 2026 lecture with a public slide link exactly once')
    lessons = []
    env = {**os.environ, 'PYTHONHASHSEED': '0', 'OPENBLAS_NUM_THREADS': '1', 'OMP_NUM_THREADS': '1'}
    for item in sorted(metadata, key=lambda row: row['id']):
        number = item['id']
        relative = f'python/spring2026/lesson_{number:02d}.py'
        path = ROOT / relative
        code = path.read_text()
        result = subprocess.run([sys.executable, str(path)], cwd=ROOT,
                                text=True, capture_output=True, check=True,
                                timeout=30, env=env)
        if not result.stdout.strip():
            raise ValueError(f'Lesson {number} has no visible output')
        with contextlib.redirect_stdout(io.StringIO()) as captured:
            namespace = runpy.run_path(str(path))
        if captured.getvalue() != result.stdout:
            raise ValueError(f'Lesson {number} differed during visual extraction')
        visual = build_spring_visual(number, namespace, code)
        source = sources[number]
        lessons.append({
            'id': f'spring2026-{number:02d}', 'number': number,
            'title': item['title_fa'], 'title_fa': item['title_fa'],
            'goal': item['goal_fa'], 'explanation': item['explanation_fa'],
            'practice': item['practice_fa'], 'limitations': item['limitations_fa'],
            'code': code, 'output': result.stdout.rstrip(),
            'output_explanation': item.get('output_explanation_fa',
                'این خروجی با اجرای همین فایل پایتون ثبت شده است. با تغییر کد، خروجی اجرای خودت را مقایسه کن.'),
            'filename': path.name, 'source_path': relative,
            'requirements': item.get('requirements', ['numpy']),
            'source_url': inventory['source_url'], 'source_label': 'مرجع رسمی درس',
            'slide_url': source.get('slide_url'),
            'source_status': source.get('status', source.get('source_status')),
            'verified': True, 'visual': visual,
            'code_sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        })
    payload = {'schema_version': 1, 'source_url': inventory['source_url'],
               'source_status': inventory.get('source_note_fa', ''),
               'execution': {'python': platform.python_version(), 'numpy': np.__version__,
                             'kind': 'actual execution of original examples; recorded stdout, not browser Python'},
               'lessons': lessons, 'extra_sessions': inventory.get('additional_sessions', [x for x in inventory['lessons'] if x.get('kind') != 'lecture_slides'])}
    target = ROOT / 'assets/data/lessons.json'
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')
    print(f'Executed and exported {len(lessons)} lessons to {target}')


if __name__ == '__main__':
    build()
