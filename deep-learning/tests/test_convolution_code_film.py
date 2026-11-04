"""The code shown in the film executes the slide's exact numeric example."""
from contextlib import redirect_stdout
from io import StringIO
import json
from pathlib import Path
import runpy
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'animations'))
from source_math import IMAGE, KERNEL, convolution  # noqa: E402


def test_film_code_matches_source_convolution():
    stdout = StringIO()
    with redirect_stdout(stdout):
        state = runpy.run_path(str(ROOT / 'animations/convolution_code_example.py'))
    assert state['image'] == IMAGE
    assert state['kernel'] == KERNEL
    assert state['output'] == convolution() == [[4, 3, 4], [2, 4, 3], [2, 3, 4]]
    assert stdout.getvalue().strip() == str(state['output'])
    pages = json.loads((ROOT / 'content/source-slides/spring-2026/s05.json').read_text())['pages']
    assert [' '.join(map(str, row)) for row in state['image']] == pages[26]['lines'][8:13]
    assert [' '.join(map(str, row)) for row in state['output']] == pages[36]['lines'][-6:-3]
