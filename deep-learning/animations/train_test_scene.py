"""An independent explanation of train/test separation, inspired by s01 pp. 39–43.

Render: manim -qh --fps 24 --media_dir /tmp/s01-film-render train_test_scene.py TrainTest
"""
from pathlib import Path
import subprocess
import tempfile

from manim import (Scene, Group, ImageMobject, RoundedRectangle, Arrow, FadeIn,
                   FadeOut, Indicate, RIGHT, LEFT)

INK = '#172134'
BLUE = '#245baf'
GREEN = '#19745a'


class TrainTest(Scene):
    def construct(self):
        self.camera.background_color = '#f7f9fc'
        with tempfile.TemporaryDirectory() as temp:
            counter = 0

            def label(value, width=3.5, size=38, color=INK):
                nonlocal counter
                counter += 1
                path = Path(temp) / f'{counter}.png'
                subprocess.run([
                    'pango-view', '--no-display', '--background=transparent',
                    f'--foreground={color}', f'--font=Vazirmatn {size}', '--rtl',
                    '--margin=8', f'--text={value}', f'--output={path}',
                ], check=True)
                image = ImageMobject(str(path))
                if image.width > width:
                    image.scale_to_fit_width(width)
                return image

            def card(text, color, position):
                box = RoundedRectangle(corner_radius=.15, width=3.4, height=1.25,
                                       stroke_color=color, stroke_width=2,
                                       fill_color='#ffffff', fill_opacity=1).move_to(position)
                caption = label(text, width=2.9, size=34, color=color).move_to(position)
                return Group(box, caption)

            title = label('از داده تا ارزیابی مدل', width=8, size=48).move_to([0, 3.05, 0])
            data = card('داده برچسب دار', BLUE, [4.5, .7, 0])
            train = card('داده آموزش', BLUE, [0, 1.5, 0])
            test = card('داده آزمون', GREEN, [0, -.65, 0])
            model = card('آموزش مدل', BLUE, [-4.5, 1.5, 0])
            evaluation = card('ارزیابی مدل', GREEN, [-4.5, -.65, 0])
            arrow1 = Arrow([2.75, .9, 0], [1.8, 1.4, 0], buff=.06, color=BLUE)
            arrow2 = Arrow([2.75, .5, 0], [1.8, -.5, 0], buff=.06, color=GREEN)
            arrow3 = Arrow([-1.75, 1.5, 0], [-2.75, 1.5, 0], buff=.06, color=BLUE)
            arrow4 = Arrow([-1.75, -.65, 0], [-2.75, -.65, 0], buff=.06, color=GREEN)
            arrow5 = Arrow([-4.5, .8, 0], [-4.5, .05, 0], buff=.06, color=GREEN)
            note1 = label('نمونه ها را پیش از آموزش جدا می کنیم', width=11, size=33).move_to([0, -2.45, 0])
            note2 = label('مدل با داده آموزش یاد می گیرد', width=11, size=33).move_to([0, -2.45, 0])
            note3 = label('داده آزمون برای سنجش روی نمونه های ندیده است', width=11, size=32).move_to([0, -2.45, 0])
            note4 = label('یک نمونه آزمون برای نتیجه گیری قابل اتکا کافی نیست', width=11, size=32).move_to([0, -2.45, 0])
            self.play(FadeIn(title), FadeIn(data), run_time=.6)
            self.wait(1.5)
            self.play(FadeIn(train), FadeIn(test), FadeIn(arrow1), FadeIn(arrow2), FadeIn(note1), run_time=.7)
            self.wait(3.2)
            self.play(FadeOut(note1), FadeIn(note2), FadeIn(model), FadeIn(arrow3), run_time=.6)
            self.play(Indicate(train, color=BLUE), Indicate(model, color=BLUE), run_time=.8)
            self.wait(3)
            self.play(FadeOut(note2), FadeIn(note3), FadeIn(evaluation), FadeIn(arrow4), FadeIn(arrow5), run_time=.6)
            self.play(Indicate(test, color=GREEN), Indicate(evaluation, color=GREEN), run_time=.8)
            self.wait(3)
            self.play(FadeOut(note3), FadeIn(note4), run_time=.5)
            self.wait(3.5)
            self.play(*[FadeOut(item) for item in self.mobjects], run_time=.5)
            backdrop = RoundedRectangle(corner_radius=.15, width=1.65, height=1.65,
                                        stroke_color=BLUE, fill_color=BLUE, fill_opacity=1).move_to([0, 2.35, 0])
            logo = ImageMobject(str(Path(__file__).resolve().parents[1] / 'assets/university-logo.png')).scale_to_fit_height(1.3).move_to([0, 2.35, 0])
            credit1 = label('تهیه: حسام شینی', width=8, size=42).move_to([0, .65, 0])
            credit2 = label('استاد: دکتر نگار مجمع', width=8, size=42).move_to([0, -.25, 0])
            ref = label('منبع: دانا گوراری، بهار ۲۰۲۶، جلسه ۱', width=10, size=30).move_to([0, -1.3, 0])
            self.play(FadeIn(backdrop), FadeIn(logo), FadeIn(credit1), FadeIn(credit2), FadeIn(ref), run_time=.6)
            self.wait(4)
