"""Build and verify independent Persian page data in a fresh staging directory.

Output contains reader JSON, not rendered slides or PDF files. This validates
identities and hashes; it does not certify visual or scientific fidelity.
"""
import argparse
import hashlib
import json
from pathlib import Path

from source_page_payloads import build_page_payloads
from source_reader import load_source_translation

ROOT = Path(__file__).resolve().parents[1]
TERM = 'spring-2026'


def verify_manifest(directory, manifest):
    for entry in manifest['pages']:
        page = directory / entry['file']
        if hashlib.sha256(page.read_bytes()).hexdigest() != entry['sha256']:
            raise ValueError(f'Page hash mismatch: {page}')
    return len(manifest['pages'])


def build(root, output, sessions):
    records = json.loads((root / f'data/metadata/{TERM}-slide-identity.json').read_text(encoding='utf-8'))['records']
    available = {row['session_id']: row for row in records}
    selected = sessions or list(available)
    if len(selected) != len(set(selected)) or any(item not in available for item in selected):
        raise ValueError('Unknown or duplicate session')
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        raise ValueError('Output must be an empty directory')
    output.mkdir(parents=True, exist_ok=True)
    results = []
    for session in selected:
        payload = load_source_translation(session, root=root, term_id=TERM)
        manifest = build_page_payloads(output, payload)
        directory = output / 'source-pages' / TERM / session
        count = verify_manifest(directory, manifest)
        results.append({'session': session, 'pages': count, 'source_sha256': manifest['source']['sha256']})
    return {'term': TERM, 'sessions': results, 'pages': sum(r['pages'] for r in results),
            'note': 'Page data verified; rendered appearance and scientific accuracy not verified.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--session', action='append', default=[], help='Session ID; repeat, or omit for all')
    args = parser.parse_args()
    output = args.output.resolve()
    if output.is_relative_to(ROOT.parent.resolve()):
        parser.error('Output must be outside the repository')
    result = build(ROOT, output, args.session)
    (output / 'build-summary.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
