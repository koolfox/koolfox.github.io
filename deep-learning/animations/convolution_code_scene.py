"""Render with manim -qh --fps 24 convolution_code_scene.py ConvolutionCode.

The code and results are read from the executed example, not typed into the film.
"""
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
import runpy
import subprocess
import tempfile

from manim import (Scene, Text, VGroup, ImageMobject, RoundedRectangle, Rectangle, FadeIn, FadeOut,
                   Transform, UP, DOWN, LEFT, RIGHT, WHITE)

EXAMPLE = Path(__file__).with_name('convolution_code_example.py')
BLUE, GOLD, GREEN = '#1755A3', '#8A5500', '#176443'


class ConvolutionCode(Scene):
    def construct(self):
        output_capture = StringIO()
        with redirect_stdout(output_capture):
            values = runpy.run_path(str(EXAMPLE))
        image, kernel, output = (values[name] for name in ('image', 'kernel', 'output'))
        assert output_capture.getvalue().strip() == str(output)
        self.camera.background_color = '#F7F9FC'
        heading = Text('Convolution: code and output', font='DejaVu Sans',
                       font_size=34, color='#172134').to_edge(UP, buff=.23)
        panel = RoundedRectangle(corner_radius=.12, width=8.2, height=6.8,
                                 color='#CBD5E1', fill_color='#FFFFFF', fill_opacity=1)
        panel.move_to([-2.65, -.1, 0])
        lines = EXAMPLE.read_text().splitlines()[1:]
        code = VGroup(*[Text(line.lstrip(), font='Courier', font_size=18,
                             color='#172134', disable_ligatures=True)
                        for line in lines]).arrange(DOWN, aligned_edge=LEFT, buff=.07)
        code.move_to(panel.get_center()).align_to(panel, LEFT).shift(RIGHT * .24)
        space = Text('M', font='Courier', font_size=18).width
        for item, line in zip(code, lines):
            item.shift(RIGHT * (len(line) - len(line.lstrip())) * space)
        self.add(heading, panel, code)
        marker = Rectangle(width=7.8, height=.34, color=GOLD, stroke_width=2)
        marker.move_to(code[0]).align_to(panel, LEFT).shift(RIGHT * .2)
        self.play(FadeIn(marker), run_time=.6)
        title = Text('Input', font='DejaVu Sans', font_size=26, color=BLUE).move_to([4.1, 2.5, 0])
        matrix = VGroup(*[Text('  '.join(map(str, row)), font='DejaVu Sans Mono',
                              font_size=25, color=BLUE) for row in image]).arrange(DOWN, buff=.14).move_to([4.1, 1.3, 0])
        self.play(FadeIn(title), FadeIn(matrix), run_time=.6)
        self.wait(2.2)
        self.play(marker.animate.move_to([marker.get_x(), code[5].get_y(), 0]), run_time=.6)
        filter_title = Text('Filter', font='DejaVu Sans', font_size=23, color=GOLD).move_to([4.1, -.15, 0])
        filter_matrix = VGroup(*[Text('  '.join(map(str, row)), font='DejaVu Sans Mono',
                                     font_size=23, color=GOLD) for row in kernel]).arrange(DOWN, buff=.12).move_to([4.1, -.9, 0])
        self.play(FadeIn(filter_title), FadeIn(filter_matrix), run_time=.5)
        self.wait(2.3)
        self.play(marker.animate.move_to([marker.get_x(), code[9].get_y(), 0]), run_time=.6)
        self.wait(1.4)
        self.play(marker.animate.move_to([marker.get_x(), code[11].get_y(), 0]), run_time=.6)
        expression = Text('1×1 + 1×0 + 1×1\n+ 0×0 + 1×1 + 1×0\n+ 0×1 + 0×0 + 1×1 = 4',
                          font='DejaVu Sans Mono', font_size=18, color=GOLD,
                          line_spacing=1.3).move_to([4.1, -2.35, 0])
        assert output[0][0] == 4
        self.play(FadeIn(expression), run_time=.5)
        self.wait(3)
        self.play(marker.animate.move_to([marker.get_x(), code[-1].get_y(), 0]), FadeOut(filter_title), FadeOut(expression),
                  FadeIn(Text('Output', font='DejaVu Sans', font_size=24, color=GREEN).move_to([4.1, -.05, 0])),
                  run_time=.6)
        out_matrix = VGroup(*[Text('  '.join(map(str, row)), font='DejaVu Sans Mono',
                                  font_size=24, color=GREEN) for row in output]).arrange(DOWN, buff=.12).move_to([4.1, -1.1, 0])
        stride = Text('stride = 1', font='DejaVu Sans', font_size=17, color='#526075').move_to([4.1, -1.95, 0])
        self.play(Transform(filter_matrix, out_matrix), FadeIn(stride), run_time=.6)
        self.wait(3.2)
        self.play(*[FadeOut(item) for item in self.mobjects], run_time=.5)
        logo_background = RoundedRectangle(corner_radius=.15, width=1.4, height=1.4,
                                           color='#194FC3', fill_color='#194FC3', fill_opacity=1).move_to([0, 2.5, 0])
        logo = ImageMobject(str(EXAMPLE.parent.parent / 'assets/university-logo.png')).scale(1.1)
        logo.move_to([0, 2.5, 0])
        with tempfile.TemporaryDirectory() as temp_dir:
            persian = []
            for index, value in enumerate(('تهیه: حسام شینی', 'استاد: دکتر نگار مجمع')):
                path = Path(temp_dir) / f'{index}.png'
                subprocess.run(['pango-view', '--no-display', '--background=transparent',
                                '--foreground=#172134', '--font=Vazirmatn 38', '--rtl',
                                '--margin=6', f'--text={value}', f'--output={path}'], check=True)
                item = ImageMobject(str(path)).scale_to_fit_height(.42)
                item.move_to([0, .45 - index * .8, 0])
                persian.append(item)
            reference = Text('Danna Gurari · Spring 2026 · s05 / 27–37', font='DejaVu Sans',
                             font_size=22, color='#526075').move_to([0, -1.15, 0])
            license_text = Text('CC BY-NC-SA', font='DejaVu Sans', font_size=20,
                                color='#526075').move_to([0, -1.85, 0])
            self.play(FadeIn(logo_background), FadeIn(logo), *[FadeIn(item) for item in persian],
                      FadeIn(reference), FadeIn(license_text), run_time=.6)
        self.wait(4.5)
