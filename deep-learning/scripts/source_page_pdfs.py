"""Split the first Spring 2026 source into independently verifiable pages."""
import hashlib
import json
from pathlib import Path


def build_source_pages(root: Path, output: Path) -> None:
    # Kept as a build dependency, never downloaded by readers.
    from pypdf import PdfReader, PdfWriter

    source = root / 'assets/danna/spring-2026/s01.pdf'
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    identity = json.loads((root / 'data/metadata/spring-2026-slide-identity.json').read_text())
    record = next(row for row in identity['records'] if row['session_id'] == 's01')
    if source_hash != record['sha256']:
        raise ValueError('Session 1 PDF does not match source identity')
    reader = PdfReader(source)
    if len(reader.pages) != record['page_count']:
        raise ValueError('Session 1 PDF page count does not match source identity')
    dest = output / 'assets/danna/spring-2026/s01-pages'
    dest.mkdir(parents=True, exist_ok=True)
    hashes = []
    for number, page in enumerate(reader.pages, 1):
        for ref in page.get('/Annots', []):
            annotation = ref.get_object()
            action = annotation.get('/A')
            action = action.get_object() if action else {}
            if annotation.get('/Dest') or action.get('/S') == '/GoTo':
                raise ValueError(f'Internal PDF destination needs remapping: page {number}')
        writer = PdfWriter()
        writer.add_page(page)
        target = dest / f'{number:03}.pdf'
        with target.open('wb') as handle:
            writer.write(handle)
        hashes.append(hashlib.sha256(target.read_bytes()).hexdigest())
    (dest / 'manifest.json').write_text(json.dumps({
        'source_sha256': source_hash, 'page_count': len(hashes), 'pages': hashes,
    }, separators=(',', ':')))
