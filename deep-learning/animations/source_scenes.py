"""Render independently drawn source-example films: manim -qh source_scenes.py.

No external video is reused. Source data: Danna Gurari, Spring 2026,
s03 pp.69–84; s05 pp.27–36; s13 pp.21–29. See manifest.json.
"""
from pathlib import Path
import subprocess
import sys
import tempfile

from manim import (
    Scene, VGroup, Text, ImageMobject, Circle, Line, Rectangle, RoundedRectangle,
    FadeIn, FadeOut, Create, Write, Transform, Indicate,
    UP, DOWN, LEFT,
)

sys.path.insert(0, str(Path(__file__).parent))
from source_math import IMAGE, KERNEL, QUERY, KEYS, VALUES, attention, convolution, backprop

INK = '#172134'
RED, GREEN, BLUE, GOLD, PURPLE, ORANGE = '#A6283A', '#176443', '#1755A3', '#805000', '#75499B', '#945000'


def text(value, size=27, color=INK):
    return Text(str(value), font='DejaVu Sans', font_size=size, color=color)


def matrix(rows, color=INK, step=0.56):
    group = VGroup()
    for i, row in enumerate(rows):
        for j, value in enumerate(row):
            item = text(value, 25, color).move_to([j * step, -i * step, 0])
            group.add(item)
    group.move_to([0, 0, 0])
    return group


class SourceScene(Scene):
    def heading(self, title, source):
        self.camera.background_color = '#F7F9FC'
        self.source_credit = source
        self.add(text(title, 38).to_edge(UP, buff=0.42))

    def caption(self, value, color=INK):
        return text(value, 25, color).move_to([0, -2.0, 0])

    def credits(self):
        # Pango applies Persian shaping and RTL ordering before Manim loads the image.
        self.play(*[FadeOut(item) for item in self.mobjects], run_time=.5)
        backdrop = RoundedRectangle(corner_radius=.15, width=1.4, height=1.4,
                                    color='#194FC3', fill_color='#194FC3', fill_opacity=1).move_to([0, 2.5, 0])
        logo = ImageMobject(str(Path(__file__).resolve().parents[1] / 'assets/university-logo.png')).scale(1.1)
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
            reference = text(self.source_credit, 22, '#526075').move_to([0, -1.15, 0])
            license_text = text('CC BY-NC-SA', 20, '#526075').move_to([0, -1.85, 0])
            self.play(FadeIn(backdrop), FadeIn(logo), *[FadeIn(item) for item in persian],
                      FadeIn(reference), FadeIn(license_text), run_time=.6)
        self.wait(4.5)


class Attention(SourceScene):
    def construct(self):
        self.heading('Self-attention: one query, three keys', 'Danna Gurari · Spring 2026 · s13 / 21–29')
        scores, weights, output = attention()
        q = VGroup(text('Q1', 29, RED), matrix([QUERY], RED)).arrange(DOWN).move_to([-4.6, 1.3, 0])
        k = VGroup(text('K', 29, ORANGE), matrix(KEYS, ORANGE)).arrange(DOWN).move_to([-0.7, 1.3, 0])
        v = VGroup(text('V', 29, PURPLE), matrix(VALUES, PURPLE)).arrange(DOWN).move_to([4, 1.3, 0])
        self.play(FadeIn(q), FadeIn(k), FadeIn(v))
        self.wait(1)
        score = text('Q1 · Kᵀ = [2, 4, 4]', 31, GOLD).move_to([0, -0.7, 0])
        self.play(Write(score), run_time=1.4)
        self.wait(1.3)
        softmax = text('softmax: [0.063379, 0.468311, 0.468311]', 28, GOLD).move_to([0, -1.45, 0])
        self.play(FadeIn(softmax))
        self.wait(1.5)
        bars = VGroup()
        for i, weight in enumerate(weights):
            bar = Rectangle(width=0.8 * weight / max(weights), height=0.14, color=GOLD, fill_opacity=1)
            bar.move_to([2.15, 1.45 - i * 0.56, 0], aligned_edge=LEFT)
            bars.add(bar)
        self.play(Create(bars))
        formula = self.caption('O1 = 0.063379 V1 + 0.468311 V2 + 0.468311 V3', GREEN)
        self.play(FadeIn(formula))
        self.wait(2)
        precise = self.caption('O1 = [1.936621, 6.683105, 1.595068]', GREEN)
        self.play(Transform(formula, precise))
        self.wait(2)
        approximation = text('Slide approximation: [0, 0.5, 0.5] → [2, 7, 1.5]', 22, '#526075').move_to([0, 2.52, 0])
        self.play(FadeIn(approximation))
        self.wait(3)
        self.credits()


class Convolution(SourceScene):
    def construct(self):
        self.heading('Convolution: shared weights, stride 1', 'Danna Gurari · Spring 2026 · s05 / 27–37')
        result = convolution()
        image = matrix(IMAGE, BLUE, 0.65).move_to([-4.25, 0.55, 0])
        kernel = matrix(KERNEL, RED, 0.65).move_to([0, 0.55, 0])
        output = matrix([['·'] * 3 for _ in range(3)], INK, 0.65).move_to([4.25, 0.55, 0])
        self.add(text('Input', 26, BLUE).move_to([-4.25, 2.5, 0]), text('Filter', 26, RED).move_to([0, 2.5, 0]), text('Feature map', 26).move_to([4.25, 2.5, 0]))
        self.play(FadeIn(image), FadeIn(kernel), FadeIn(output))
        window = Rectangle(width=1.95, height=1.95, color=GOLD, stroke_width=3)
        window.move_to(image[6])
        self.play(Create(window))
        calculation = self.caption('')
        self.add(calculation)
        for row in range(3):
            for col in range(3):
                products = [IMAGE[row + i][col + j] * KERNEL[i][j] for i in range(3) for j in range(3)]
                expression = ' + '.join(map(str, products)) + ' = ' + str(result[row][col])
                next_caption = self.caption(expression, GOLD)
                new_value = text(result[row][col], 25, GREEN).move_to(output[row * 3 + col])
                self.play(window.animate.move_to(image[(row + 1) * 5 + col + 1]), Transform(calculation, next_caption), run_time=0.55)
                self.play(Transform(output[row * 3 + col], new_value), run_time=0.35)
                self.wait(0.4)
        self.play(FadeOut(window), Transform(calculation, self.caption('Same 9 weights at every position · no padding · no bias', GREEN)))
        self.wait(3)
        self.credits()


class Backpropagation(SourceScene):
    def construct(self):
        self.heading('Backpropagation: 3 → 2 → 1', 'Danna Gurari · Spring 2026 · s03 / 69–84')
        values = backprop()
        positions = [(-4, 1.9), (-4, .65), (-4, -.6), (0, 1.4), (0, -.35), (4, .6)]
        nodes, labels, edges = VGroup(), VGroup(), VGroup()
        for i, (x, y) in enumerate(positions):
            nodes.add(Circle(radius=0.42, color=INK).move_to([x, y, 0]))
            labels.add(text(['1', '0', '1', '4', '5', '6'][i], 28, RED if i < 3 else INK).move_to([x, y, 0]))
        edge_data = [(0,3,'.2'),(1,3,'.4'),(2,3,'−.5'),(0,4,'−.3'),(1,4,'.1'),(2,4,'.2'),(3,5,'−.3'),(4,5,'−.2')]
        weight_labels = VGroup()
        for a, b, weight in edge_data:
            line = Line(nodes[a].get_center(), nodes[b].get_center(), buff=0.46, color=GREEN, stroke_width=2)
            edges.add(line)
            # Separate labels toward each destination to keep crossing edges readable.
            label = text(weight, 18, GREEN).move_to(line.point_from_proportion(0.72))
            weight_labels.add(label)
        self.play(Create(edges), FadeIn(nodes), FadeIn(labels), FadeIn(weight_labels))
        biases = text('b4 = −0.4     b5 = 0.2     b6 = 0.1     target = 1', 23).move_to([0, -1.45, 0])
        self.play(FadeIn(biases))
        forward = self.caption('z4 = −0.7 → o4 = 0.331812     z5 = 0.1 → o5 = 0.524979', GOLD)
        self.play(Indicate(nodes[3:5], color=GOLD), FadeIn(forward))
        self.wait(2)
        self.play(Transform(forward, self.caption(f'o6 = {values["o6"]:.6f}     E = (1 − o6)² = {values["loss"]:.6f}', GOLD)))
        self.wait(2)
        self.play(FadeOut(weight_labels), FadeOut(biases))
        backward = text('δ6 = (o6 − 1) o6 (1 − o6)', 28, PURPLE).move_to([0, -1.45, 0])
        self.play(FadeIn(backward), Indicate(nodes[5], color=PURPLE))
        self.play(Transform(forward, self.caption(f'δ6 = {values["e6"]:.6f}   δ4 = {values["e4"]:.6f}   δ5 = {values["e5"]:.6f}', PURPLE)))
        self.play(Indicate(edges[6:], color=PURPLE), Indicate(nodes[3:5], color=PURPLE))
        self.wait(2)
        self.play(Transform(backward, text('δ4 = δ6 w46 o4 (1 − o4)     δ5 = δ6 w56 o5 (1 − o5)', 24, PURPLE).move_to([0, -1.45, 0])))
        self.wait(2)
        convention = text('δ uses ½(1 − o6)², as on slide 75; gradients of E are twice these values.', 20, '#526075').move_to([0, 2.72, 0])
        self.play(FadeIn(convention))
        self.wait(3)
        self.credits()
