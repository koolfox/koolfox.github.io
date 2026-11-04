"""Publish rendered films with pinned source data and Persian captions.

First render:
  manim -qh --fps 24 --media_dir deep-learning/results/animation-render \
    deep-learning/animations/source_scenes.py Attention Convolution Backpropagation
Then run this script from any directory. FFmpeg faststart avoids full-file preload.
"""
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
FILMS = [
    ('attention', 'Attention', 'محاسبه توجه (Self-attention)', 's13', list(range(21, 30)), [
        (0, 'یک پرس‌وجو، سه کلید و سه بردار مقدار؛ دقیقا با عددهای مثال درس.'),
        (3, 'ضرب داخلی پرس‌وجوی اول در کلیدها، امتیازهای ۲، ۴ و ۴ را می‌دهد.'),
        (6, 'Softmax امتیازها را به وزن‌های مثبت با مجموع یک تبدیل می‌کند.'),
        (9, 'هر بردار مقدار در وزن متناظر ضرب می‌شود؛ جمع آن‌ها بردار خروجی است.'),
        (13, 'خروجی دقیق با تقریب چاپ‌شده در اسلاید متفاوت است؛ هر دو جدا نمایش داده می‌شوند.'),
    ]),
    ('convolution', 'Convolution', 'کانولوشن (Convolution)', 's05', list(range(27, 38)), [
        (0, 'تصویر پنج‌درپنج و فیلتر سه‌درسه مثال درس؛ بدون حاشیه‌گذاری و بایاس.'),
        (2, 'در هر پنجره، درایه‌های متناظر ضرب و سپس جمع می‌شوند.'),
        (5, 'گام برابر یک است؛ همان نه وزن در مکان بعدی دوباره استفاده می‌شوند.'),
        (10, 'هر پاسخ در خانه متناظر نقشه ویژگی ثبت می‌شود.'),
        (14, 'خروجی سه‌درسه است؛ فیلتر وارونه نمی‌شود، مطابق عمل رایج CNN.'),
    ]),
    ('backpropagation', 'Backpropagation', 'پس‌انتشار (Backpropagation)', 's03', list(range(69, 85)), [
        (0, 'سه ورودی، دو نورون پنهان و یک خروجی؛ وزن‌ها و بایاس‌ها از مثال درس هستند.'),
        (3, 'جمع وزن‌دار و سیگموید، خروجی هر نورون پنهان را می‌سازند.'),
        (6, 'خروجی شبکه و خطای مربعی با دقت کامل محاسبه می‌شوند.'),
        (10, 'گرادیان ابتدا در خروجی و سپس با قاعده زنجیره در نورون‌های پنهان محاسبه می‌شود.'),
        (15, 'مانند صفحه ۷۵، ضریب ثابت دو حذف شده است؛ این دلتاها برای نصف خطای مربعی‌اند. گرادیان خطای کامل دوبرابر است.'),
    ]),
]

CHAPTERS = {
    'attention': [(1.1, 'ورودی‌ها'), (3.5, 'امتیازها'), (5.8, 'وزن‌ها'),
                  (9.3, 'جمع وزن‌دار'), (12.3, 'خروجی دقیق'), (15.3, 'تقریب اسلاید')],
    'convolution': [(3.0 + 1.3 * index, f'پنجره {index + 1}') for index in range(9)],
    'backpropagation': [(2.1, 'وزن‌ها و بایاس‌ها'), (3.2, 'لایه پنهان'),
                        (6.2, 'خروجی و زیان'), (11.2, 'دلتاها'),
                        (15.2, 'قاعده زنجیره'), (18.2, 'ضریب ثابت')],
}


def stamp(seconds):
    milliseconds = round(seconds * 1000)
    return f'{milliseconds // 3600000:02}:{milliseconds // 60000 % 60:02}:{milliseconds // 1000 % 60:02}.{milliseconds % 1000:03}'


def main():
    records = {r['session_id']: r for r in json.loads((ROOT / 'data/metadata/spring-2026-slide-identity.json').read_text())['records']}
    published = []
    for identity, scene, title, session, pages, captions in FILMS:
        source = ROOT / f'results/animation-render/videos/source_scenes/1080p24/{scene}.mp4'
        video = ROOT / f'assets/media/{identity}.mp4'
        subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', str(source), '-c', 'copy', '-movflags', '+faststart', str(video)], check=True)
        duration = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(video)], text=True))
        captions = [(t, line) for t, line in captions if t < duration]
        vtt = ROOT / f'assets/media/{identity}.fa.vtt'
        lines = ['WEBVTT', '']
        for index, (start, line) in enumerate(captions):
            end = captions[index + 1][0] if index + 1 < len(captions) else max(start, duration - 5.625)
            lines.extend([f'{stamp(start)} --> {stamp(end)}', line, ''])
        vtt.write_text('\n'.join(lines))
        def artifact(path):
            return {'path': str(path.relative_to(ROOT)), 'bytes': path.stat().st_size,
                    'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
        published.append({'id': identity, 'title_fa': title, 'source': {
            'term': 'spring-2026', 'session': session, 'pages': pages,
            'pdf_sha256': records[session]['sha256'], 'url': records[session]['url']},
            'video': artifact(video), 'captions': artifact(vtt), 'duration_seconds': duration,
            'transcript_fa': [line for _, line in captions],
            'chapters': [{'time': round(time, 3), 'label_fa': label} for time, label in CHAPTERS[identity]],
            'license': 'CC BY-NC-SA; source adaptation, source version unspecified',
            'render': {'engine': 'Manim Community', 'version': '0.20.1', 'resolution': [1920, 1080], 'fps': 24},
            'scene': scene})
    # This film has its own render script and source-specific metadata.
    published.append(json.loads((ROOT / 'animations/convolution-code.record.json').read_text()))
    (ROOT / 'animations/manifest.json').write_text(json.dumps({'schema_version': 1, 'films': published}, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
