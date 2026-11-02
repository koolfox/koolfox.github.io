"""Report independent completion dimensions without inventing a percentage.

Prompt inventory review is not visual approval. Geometry coverage is not a
human page-by-page design review. Publication requires separate live evidence.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
import json
from pathlib import Path

from source_activities import load_activities
from source_reader import load_source_translation
from source_catalog import ROOT


def audit(root=ROOT):
    registry = json.loads((root / 'data/metadata/source-readers.json').read_text())
    sessions = registry['terms']['spring-2026']
    rows = []
    for session in sessions:
        translation = load_source_translation(session, root=root, term_id='spring-2026')
        activities = load_activities(root, 'spring-2026', session)
        layout = json.loads((root / f'content/source-layout/spring-2026/{session}.json').read_text())
        coverage = Counter(page['question_coverage'] for page in activities['pages'])
        lines = Counter()
        for page in layout['pages']:
            lines.update({key: value for key, value in page['coverage'].items()
                          if key in {'translated_native_lines', 'mapped_translated_native_lines'}})
        workshop = json.loads((root / f'content/workshops/spring-2026/{session}.json').read_text())
        rows.append({'session': session, 'source_pages': len(translation['pages']),
                     'prompt_inventory': dict(coverage),
                     'native_line_geometry': dict(lines),
                     'visual_approved_pages': sum(page.get('visual_reviewed') is True for page in layout['pages']),
                     'exact_source_notebooks': len(workshop.get('source_examples', [])),
                     'authored_choice_questions': len(activities['questions'])})
    source_pages = sum(row['source_pages'] for row in rows)
    if source_pages != 1303:
        raise ValueError(f'Expected registered 1303-page Spring 2026 source, got {source_pages}')
    return {'schema_version': 1, 'generated_at_utc': datetime.now(timezone.utc).isoformat(),
            'scope': 'spring-2026', 'sessions': rows, 'source_pages': source_pages,
            'interpretation': {
                'prompt_inventory': 'Source prompt coverage only; not scientific or visual slide approval.',
                'native_line_geometry': 'Measured source geometry; does not assert runtime fit or visual approval.',
                'visual_approved_pages': 'Only explicitly recorded page visual reviews.',
                'publication': 'Not assessed by this offline report; requires commit-matched live evidence.'}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    result = json.dumps(audit(), ensure_ascii=False, indent=2) + '\n'
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(result)
    else:
        print(result, end='')


if __name__ == '__main__':
    main()
