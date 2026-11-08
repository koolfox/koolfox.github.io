"""Two source-bound perceptron updates from lesson 2, pages 25–30.

Render with Manim Community: manim -qh --fps 24 --disable_caching
--media_dir /tmp/s02-film-render perceptron_steps_scene.py PerceptronSteps
"""
from pathlib import Path
import subprocess
import tempfile
from manim import Scene, ImageMobject, RoundedRectangle, FadeIn, FadeOut, Text

INK = '#172134'
BLUE = '#245baf'
GREEN = '#19745a'


class PerceptronSteps(Scene):
    def construct(self):
        self.camera.background_color = '#f7f9fc'
        root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            counter = 0

            def label(value, width=11, size=38, color=INK):
                nonlocal counter
                counter += 1
                path = directory / f'label-{counter}.png'
                subprocess.run(['pango-view', '--no-display', '--background=transparent',
                    f'--foreground={color}', f'--font=Vazirmatn {size}', '--rtl',
                    '--margin=8', f'--text={value}', f'--output={path}'], check=True)
                image = ImageMobject(str(path))
                if image.width > width:
                    image.scale_to_fit_width(width)
                return image

            def code(value, width=12, size=35, color=INK):
                item = Text(value, font='Menlo', font_size=size, color=color, line_spacing=1.6)
                if item.width > width:
                    item.scale_to_fit_width(width)
                return item

            title = label('دو گام آموزش پرسپترون', size=46).move_to([0, 3.05, 0])
            first = label('نمونه اول: هدف منفی یک، پیش‌بینی مثبت یک', color=BLUE, size=35).move_to([0, 2.0, 0])
            inputs1 = code('x = [1, 0, 0]    y_true = -1    eta = 0.1').move_to([0, 1.05, 0])
            score1 = code('w = [0, 0, 0, 0]    score = 0    y_pred = +1').move_to([0, .2, 0])
            update1 = code('w_new = [0, 0, 0, 0] + 0.1(-1 - 1)[1, 1, 0, 0]', size=31).move_to([0, -.7, 0])
            result1 = code('w_new = [-0.2, -0.2, 0, 0]', color=GREEN, size=37).move_to([0, -1.65, 0])
            note1 = label('امتیاز صفر به کلاس مثبت یک می‌رود؛ ورودی بایاس همواره یک است.', width=12, size=28).move_to([0, -2.65, 0])
            self.play(FadeIn(title), FadeIn(first), FadeIn(inputs1), run_time=.7)
            self.play(FadeIn(score1), FadeIn(note1), run_time=.6); self.wait(2.4)
            self.play(FadeIn(update1), FadeIn(result1), run_time=.7); self.wait(3.8)
            self.play(*[FadeOut(x) for x in [first, inputs1, score1, update1, result1, note1]], run_time=.5)
            second = label('نمونه دوم: هدف مثبت یک، پیش‌بینی منفی یک', color=BLUE, size=35).move_to([0, 2.0, 0])
            inputs2 = code('x = [1, 0, 1]    y_true = +1    eta = 0.1').move_to([0, 1.05, 0])
            score2 = code('w = [-0.2, -0.2, 0, 0]    score = -0.4    y_pred = -1', size=32).move_to([0, .2, 0])
            update2 = code('w_new = [-0.2, -0.2, 0, 0] + 0.1(1 - (-1))[1, 1, 0, 1]', size=30).move_to([0, -.7, 0])
            result2 = code('w_new = [0, 0, 0, 0.2]', color=GREEN, size=37).move_to([0, -1.65, 0])
            note2 = label('ترتیب وزن‌ها: بایاس، وزن ورودی ۱، وزن ورودی ۲، وزن ورودی ۳', width=12, size=28).move_to([0, -2.65, 0])
            self.play(FadeIn(second), FadeIn(inputs2), FadeIn(score2), run_time=.7)
            self.play(FadeIn(update2), FadeIn(result2), FadeIn(note2), run_time=.7); self.wait(5.0)
            self.play(*[FadeOut(item) for item in self.mobjects], run_time=.5)
            backdrop = RoundedRectangle(corner_radius=.15, width=1.65, height=1.65,
                stroke_color=BLUE, fill_color=BLUE, fill_opacity=1).move_to([0, 2.35, 0])
            logo = ImageMobject(str(root / 'assets/university-logo.png')).scale_to_fit_height(1.3).move_to([0, 2.35, 0])
            credit1 = label('تهیه: حسام شینی', width=8, size=42).move_to([0, .65, 0])
            credit2 = label('استاد: دکتر نگار مجمع', width=8, size=42).move_to([0, -.25, 0])
            ref = label('منبع: دانا گوراری، بهار ۲۰۲۶، جلسه ۲، اسلایدهای ۲۵ تا ۳۰', width=12, size=27).move_to([0, -1.3, 0])
            self.play(FadeIn(backdrop), FadeIn(logo), FadeIn(credit1), FadeIn(credit2), FadeIn(ref), run_time=.6)
            self.wait(4)
