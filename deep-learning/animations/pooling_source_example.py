"""Numerical example shown in the Spring 2026 lesson 5, page 48."""
import json
import runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = [[1, 1, 2, 4], [5, 6, 7, 8], [3, 2, 1, 0], [1, 2, 3, 4]]


def example():
    lesson = runpy.run_path(str(ROOT / 'workshops/spring-2026/s05_source_pooling.py'))
    if lesson['values'] != SOURCE or lesson['window'] != 2 or lesson['stride'] != 2:
        raise ValueError('The notebook no longer matches the source slide')
    steps = []
    for top in (0, 2):
        for left in (0, 2):
            cells = [SOURCE[row][column] for row in range(top, top + 2)
                     for column in range(left, left + 2)]
            steps.append({'row': top, 'column': left, 'values': cells, 'maximum': max(cells)})
    output = [[steps[0]['maximum'], steps[1]['maximum']],
              [steps[2]['maximum'], steps[3]['maximum']]]
    if output != lesson['result']['pooled']:
        raise ValueError('Pooling result differs from the notebook')
    return {'input': SOURCE, 'steps': steps, 'output': output}


if __name__ == '__main__':
    print(json.dumps(example()))
