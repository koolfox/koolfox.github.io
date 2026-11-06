"""Source figure and illustrative boundary curves for the lesson-one activity.

Render with Manim Community: manim -qh --fps 24 --disable_caching
--media_dir /tmp/capacity-film-render capacity_boundary_scene.py CapacityBoundary
"""
from pathlib import Path
import subprocess
import tempfile

from manim import (Scene, Group, ImageMobject, RoundedRectangle, Line, VMobject,
                   FadeIn, FadeOut, Create)

INK = '#172134'
BLUE = '#245baf'
GREEN = '#008d50'
PURPLE = '#a128a1'
GOLD = '#a46b00'


class CapacityBoundary(Scene):
    def construct(self):
        self.camera.background_color = '#f7f9fc'
        root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory() as temp:
            temp = Path(temp)
            figure = temp / 'source-figure'
            subprocess.run([
                'pdftoppm', '-f', '53', '-l', '53', '-scale-to-x', '1600',
                '-scale-to-y', '900', '-x', '182', '-y', '362', '-W', '488',
                '-H', '438', '-png', '-singlefile',
                str(root / 'assets/danna/spring-2026/s01.pdf'), str(figure),
            ], check=True)
            counter = 0

            def label(value, width=6, size=36, color=INK):
                nonlocal counter
                counter += 1
                path = temp / f'label-{counter}.png'
                subprocess.run([
                    'pango-view', '--no-display', '--background=transparent',
                    f'--foreground={color}', f'--font=Vazirmatn {size}', '--rtl',
                    '--margin=8', f'--text={value}', f'--output={path}',
                ], check=True)
                image = ImageMobject(str(path))
                if image.width > width:
                    image.scale_to_fit_width(width)
                return image

            title = label('مرز تصمیم و ظرفیت مدل', width=11, size=47).move_to([0, 3.05, 0])
            chart = ImageMobject(str(figure) + '.png').scale_to_fit_height(4.7).move_to([-3.65, .1, 0])
            def point(x, y):
                return [chart.get_left()[0] + x * chart.width,
                        chart.get_top()[1] - y * chart.height, 0]
            line = Line(point(.14, .58), point(.93, .72), color=GREEN, stroke_width=7)
            parabola = VMobject(color=PURPLE, stroke_width=7)
            parabola.set_points_smoothly([point(x, .30 + 1.15 * (x - .53) ** 2)
                                          for x in [i / 100 for i in range(12, 96, 2)]])
            curve = VMobject(color=GOLD, stroke_width=7)
            curve.set_points_smoothly([point(x, y) for x, y in [(.12, .50), (.25, .52),
                (.35, .65), (.48, .68), (.58, .54), (.68, .59), (.80, .65), (.94, .61)]])
            labels = [label('خط: مرز مستقیم', color=GREEN),
                      label('سهمی: مرز درجه دو', color=PURPLE),
                      label('منحنی دلخواه: انعطاف بیشتر', color=GOLD)]
            for item in labels:
                item.move_to([3.0, .85, 0])
            note = label('مرزها نمایشی اند؛ مختصات نقاط در اسلاید داده نشده است', width=11, size=27).move_to([0, -2.8, 0])
            self.play(FadeIn(title), FadeIn(chart), FadeIn(note), run_time=.7)
            self.play(Create(line), FadeIn(labels[0]), run_time=1.1); self.wait(3.0)
            self.play(FadeOut(line), FadeOut(labels[0]), Create(parabola), FadeIn(labels[1]), run_time=1.1); self.wait(3.0)
            self.play(FadeOut(parabola), FadeOut(labels[1]), Create(curve), FadeIn(labels[2]), run_time=1.1); self.wait(3.0)
            self.play(FadeOut(chart), FadeOut(curve), FadeOut(labels[2]), FadeOut(note), run_time=.5)
            heading = label('نمونه مستقل دفترچه: ضرایب قابل تغییرند', width=11, size=39).move_to([0, 2.0, 0])
            # The values are exactly the defaults of s01_boundary_functions.py.
            from manim import Text
            table = Text('x              -2   -1    0    1    2\nline: y=x      -2   -1    0    1    2\nparabola: y=x²  4    1    0    1    4',
                         font='Menlo', font_size=31, color=INK, line_spacing=1.7).move_to([0, .15, 0])
            caution = label('این اعداد مختصات شکل اسلاید نیستند', width=10, size=31).move_to([0, -2.0, 0])
            self.play(FadeIn(heading), FadeIn(table), FadeIn(caution), run_time=.7); self.wait(5.0)
            self.play(*[FadeOut(item) for item in self.mobjects], run_time=.5)
            backdrop = RoundedRectangle(corner_radius=.15, width=1.65, height=1.65,
                                        stroke_color=BLUE, fill_color=BLUE, fill_opacity=1).move_to([0, 2.35, 0])
            logo = ImageMobject(str(root / 'assets/university-logo.png')).scale_to_fit_height(1.3).move_to([0, 2.35, 0])
            credit1 = label('تهیه: حسام شینی', width=8, size=42).move_to([0, .65, 0])
            credit2 = label('استاد: دکتر نگار مجمع', width=8, size=42).move_to([0, -.25, 0])
            ref = label('منبع: دانا گوراری، بهار ۲۰۲۶، جلسه ۱، اسلاید ۵۳', width=12, size=28).move_to([0, -1.3, 0])
            self.play(FadeIn(backdrop), FadeIn(logo), FadeIn(credit1), FadeIn(credit2), FadeIn(ref), run_time=.6)
            self.wait(4)
