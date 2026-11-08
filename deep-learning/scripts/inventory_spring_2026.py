"""Inventory source, translation and slide geometry; no rendering is inferred."""
import argparse
import hashlib
import json
import subprocess
from collections import Counter
from pathlib import Path

from source_reader import load_source_translation

ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    with path.open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


def inventory(root, artifact=None):
    identity = json.loads((root / 'data/metadata/spring-2026-slide-identity.json').read_text())
    fallbacks = json.loads((root / 'data/metadata/spring-2026-page-fallbacks.json').read_text())
    rows = []
    for source in identity['records']:
        session = source['session_id']
        pdf = root / 'assets/danna/spring-2026' / f'{session}.pdf'
        pdf_hash = digest(pdf)
        # This loader checks PDF, page and translation hashes, layout identity and completeness.
        payload = load_source_translation(session, root=root, term_id='spring-2026')
        translation = json.loads((root / f'content/translations/spring-2026/{session}.json').read_text())
        geometry = json.loads((root / f'content/source-layout/spring-2026/{session}.json').read_text())
        if not (len(payload['pages']) == len(translation['pages']) == len(geometry['pages']) == source['page_count']):
            raise ValueError(f'{session}: page count mismatch')
        manifest = None
        page_dir = None
        if artifact is not None:
            page_dir = artifact / f'assets/danna/spring-2026/{session}-pages'
            path = page_dir / 'manifest.json'
            if path.is_file():
                manifest = json.loads(path.read_text())
                if manifest.get('source_sha256') != pdf_hash or manifest.get('page_count') != source['page_count'] or len(manifest.get('pages', [])) != source['page_count']:
                    raise ValueError(f'{session}: artifact manifest identity mismatch')
        for p, t, g in zip(payload['pages'], translation['pages'], geometry['pages']):
            n = p['number']
            expected_fallback = n in fallbacks['pages'].get(session, [])
            artifact_status = 'not_checked'
            artifact_hash = None
            if artifact is not None:
                if manifest is None:
                    artifact_status = 'manifest_missing'
                else:
                    artifact_hash = manifest['pages'][n-1]
                    if artifact_hash is None:
                        artifact_status = 'full_pdf_manifest_fallback'
                    else:
                        page_file = page_dir / f'{n:03}.pdf'
                        artifact_status = 'missing' if not page_file.is_file() else 'hash_match' if digest(page_file) == artifact_hash else 'hash_mismatch'
            rows.append({
                'term': 'spring-2026', 'session': session, 'page': n,
                'source_url': source['url'], 'source_pdf_sha256': pdf_hash,
                'source_page_text_sha256': p['source_text_sha256'],
                'translation_present': True, 'translation_block_count': len(t['blocks']),
                'text_reviewed_flag': t.get('text_reviewed'), 'image_text_reviewed_flag': t.get('image_text_reviewed'),
                'layout_present': True, 'layout_line_count': len(g['lines']), 'layout_unmatched_count': len(g['unmatched_lines']),
                'layout_visual_reviewed_flag': g.get('visual_reviewed'),
                'page_pdf_policy': 'full_pdf' if expected_fallback else 'individual_pdf',
                'page_pdf_policy_reason': fallbacks['reason'] if expected_fallback else None,
                'artifact_page_pdf_status': artifact_status, 'artifact_page_pdf_sha256': artifact_hash,
                # Actual fallback can depend on font measurement, rendering, graphics and network.
                'render_status': 'not_observed', 'render_fallback_reason': None,
            })
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--artifact', type=Path, help='Local packaged deep-learning directory, if available')
    args = parser.parse_args()
    out = args.output.resolve()
    if out.is_relative_to(ROOT.parent.resolve()):
        parser.error('Output must be outside the repository')
    if out.exists() and any(out.iterdir()):
        parser.error('Output directory must be empty')
    rows = inventory(ROOT, args.artifact.resolve() if args.artifact else None)
    out.mkdir(parents=True, exist_ok=True)
    (out / 'pages.jsonl').write_text(''.join(json.dumps(row, ensure_ascii=False, sort_keys=True)+'\n' for row in rows), encoding='utf-8')
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    summary = {'source_commit': commit, 'sessions': len({r['session'] for r in rows}), 'pages': len(rows),
               'page_pdf_policy': dict(sorted(Counter(r['page_pdf_policy'] for r in rows).items())),
               'artifact_page_pdf_status': dict(sorted(Counter(r['artifact_page_pdf_status'] for r in rows).items())),
               'render_status': dict(sorted(Counter(r['render_status'] for r in rows).items())),
               'session_pages': dict(sorted(Counter(r['session'] for r in rows).items())),
               'translation_text_reviewed_flags': dict(sorted(Counter(str(r['text_reviewed_flag']) for r in rows).items())),
               'layout_visual_reviewed_flags': dict(sorted(Counter(str(r['layout_visual_reviewed_flag']) for r in rows).items())),
               'note': 'Review flags are metadata, not visual acceptance. Runtime and live deployment were not observed.'}
    (out / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True)+'\n', encoding='utf-8')
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == '__main__':
    main()
