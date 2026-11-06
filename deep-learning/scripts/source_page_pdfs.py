"""Build independently verifiable pages, retaining the source for uncertain pages."""
import hashlib
import json
from pathlib import Path


def build_source_pages(root: Path, output: Path, sessions) -> None:
    from pypdf import PdfReader, PdfWriter

    identity = json.loads((root / 'data/metadata/spring-2026-slide-identity.json').read_text())
    records = {row['session_id']: row for row in identity['records']}
    fallback = json.loads((root / 'data/metadata/spring-2026-page-fallbacks.json').read_text())['pages']
    if set(fallback) - set(records):
        raise ValueError('Fallback session missing from reader registry')
    for session in sessions:
        source = root / f'assets/danna/spring-2026/{session}.pdf'
        source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
        record = records[session]
        if source_hash != record['sha256']:
            raise ValueError(f'{session}: PDF does not match source identity')
        reader = PdfReader(source)
        if len(reader.pages) != record['page_count']:
            raise ValueError(f'{session}: PDF page count does not match source identity')
        fallback_pages = set(fallback.get(session, []))
        if any(not isinstance(n, int) or n < 1 or n > len(reader.pages) for n in fallback_pages):
            raise ValueError(f'{session}: invalid fallback page')
        dest = output / f'assets/danna/spring-2026/{session}-pages'
        dest.mkdir(parents=True, exist_ok=True)
        hashes = []
        for number, page in enumerate(reader.pages, 1):
            for ref in page.get('/Annots', []):
                annotation = ref.get_object()
                action = annotation.get('/A')
                action = action.get_object() if action else {}
                if annotation.get('/Dest') or action.get('/S') == '/GoTo':
                    raise ValueError(f'{session}: internal PDF destination needs remapping: page {number}')
            if number in fallback_pages:
                hashes.append(None)
                continue
            writer = PdfWriter()
            writer.add_page(page)
            target = dest / f'{number:03}.pdf'
            with target.open('wb') as handle:
                writer.write(handle)
            hashes.append(hashlib.sha256(target.read_bytes()).hexdigest())
        (dest / 'manifest.json').write_text(json.dumps({
            'source_sha256': source_hash, 'page_count': len(hashes), 'pages': hashes,
        }, separators=(',', ':')))
