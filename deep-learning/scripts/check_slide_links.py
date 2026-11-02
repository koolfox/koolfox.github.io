"""Check slide citations without changing the hash-pinned source documents.

403/429 and transport failures are inconclusive, never reported as 404.
Only a successful GET enables a link. Reviewed migrations retain their evidence.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
URL = re.compile(r'https?://[^\s<>"\u0600-\u06ff]+')


def normalize(url):
    url = url.replace('\ufffe', '-').rstrip('.,;،؛')
    while url.endswith(')') and url.count(')') > url.count('('):
        url = url[:-1]
    return url


def inventory(root, term):
    urls = {}
    for path in sorted((root / f'content/source-slides/{term}').glob('*.json')):
        for page in json.loads(path.read_text())['pages']:
            for line in page['lines']:
                for match in URL.findall(line):
                    urls.setdefault(normalize(match), []).append(f'{path.stem}:{page["number"]}')
        pdf_path = root / f'assets/danna/{term}/{path.stem}.pdf'
        if pdf_path.exists():
            from pypdf import PdfReader
            for number, page in enumerate(PdfReader(pdf_path).pages, 1):
                for annotation in page.get('/Annots', []):
                    action = annotation.get_object().get('/A', {})
                    if hasattr(action, 'get_object'):
                        action = action.get_object()
                    url = action.get('/URI')
                    if isinstance(url, str) and url.startswith(('https://', 'http://')):
                        urls.setdefault(normalize(url), []).append(f'{path.stem}:{number}')
    return {url: sorted(set(pages)) for url, pages in sorted(urls.items())}


def check(url):
    request = Request(url, headers={'User-Agent': 'CourseCitationCheck/1.0', 'Range': 'bytes=0-65535'})
    try:
        with urlopen(request, timeout=12) as response:
            response.read(65536)
            return {'status': 'reachable', 'http_status': response.status, 'target': response.url}
    except HTTPError as error:
        return {'status': 'missing' if error.code in (404, 410) else 'unverified', 'http_status': error.code}
    except (URLError, TimeoutError, OSError, ValueError):
        return {'status': 'unverified'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--term', default='spring-2026')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    locations = inventory(ROOT, args.term)
    output = args.output or ROOT / f'data/metadata/{args.term}-links.json'
    previous = json.loads(output.read_text()) if output.exists() else {}
    entries = previous.get('entries', {})
    checked = datetime.now(timezone.utc).isoformat()
    def run(item):
        url, pages = item
        old = entries.get(url, {})
        target = old.get('target', url) if old.get('migration_evidence') else url
        record = {**check(target), 'pages': pages, 'checked_at_utc': checked}
        if old.get('migration_evidence'):
            record['migration_evidence'] = old['migration_evidence']
            if record['status'] != 'reachable':
                record['status'] = 'reviewed_migration'
                record['target'] = target
        return url, record
    with ThreadPoolExecutor(max_workers=8) as pool:
        records = dict(pool.map(run, locations.items()))
    output.write_text(json.dumps({'schema_version': 1, 'term_id': args.term, 'entries': records}, ensure_ascii=False, indent=2) + '\n')
    from collections import Counter
    print(dict(Counter(r['status'] for r in records.values())))


if __name__ == '__main__':
    main()
