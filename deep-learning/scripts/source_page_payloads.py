"""Generate optional, content-addressed Persian reader records for individual pages."""
import hashlib
import json
import os
import tempfile
import re
from pathlib import Path


def encode(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')


def write_atomic(path: Path, content: bytes) -> None:
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix='.page-', delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(content)
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def build_page_payloads(output: Path, payload: dict) -> dict:
    """Write page records and return their index; the existing reader stays untouched."""
    term, session = payload.get('term_id'), payload.get('session_id')
    source, pages = payload.get('source'), payload.get('pages')
    if not isinstance(term, str) or not re.fullmatch(r'[a-z0-9-]+', term):
        raise ValueError('Invalid term')
    if not isinstance(session, str) or not re.fullmatch(r's[0-9]{2}', session):
        raise ValueError('Invalid session')
    if not isinstance(source, dict) or not re.fullmatch(r'[a-f0-9]{64}', source.get('sha256', '')):
        raise ValueError('Invalid source identity')
    if (not isinstance(pages, list) or not pages or type(source.get('page_count')) is not int
            or len(pages) != source['page_count']):
        raise ValueError('Invalid page count')
    if any(not isinstance(page, dict) or type(page.get('number')) is not int or page['number'] != i
           for i, page in enumerate(pages, 1)):
        raise ValueError('Invalid page sequence')
    references = payload.get('reference_targets', {})
    if not isinstance(references, dict):
        raise ValueError('Invalid reference targets')
    directory = output / 'source-pages' / term / session
    directory.mkdir(parents=True, exist_ok=True)
    entries = []
    for page in pages:
        record = {'schema_version': 1, 'term_id': term, 'session_id': session,
                  'source_sha256': source['sha256'], 'page': page}
        content = encode(record)
        digest = hashlib.sha256(content).hexdigest()
        filename = f"{page['number']:03}-{digest}.json"
        write_atomic(directory / filename, content)
        blocks = page.get('blocks', [])
        heading = next((block.get('fa') for block in blocks if block.get('kind') == 'heading' and block.get('fa')), None)
        if not heading:
            text = next((block.get('fa') for block in blocks if block.get('kind') != 'not_visible' and block.get('fa')), '')
            heading = next((line for line in text.split('\n') if not line.startswith(('http:', 'https:'))), '')
        entries.append({'number': page['number'], 'file': filename, 'sha256': digest, 'title': heading[:100]})
    manifest = {'schema_version': 1, 'term_id': term, 'session_id': session,
                'source': source, 'page_count': len(pages),
                'reference_targets': references, 'pages': entries}
    write_atomic(directory / 'manifest.json', encode(manifest))
    return manifest
