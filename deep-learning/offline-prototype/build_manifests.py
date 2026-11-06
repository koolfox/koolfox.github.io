"""Produce experimental reader-only manifests from an assembled disposable site."""
import hashlib
import json
import re
import sys
from pathlib import Path
from urllib.parse import urljoin, urlsplit


def generate(site, output):
    site = Path(site).resolve()
    output = Path(output)
    readers = sorted((site / 'deep-learning/terms/spring-2026').glob('s*/slides/index.html'))
    if not readers:
        raise ValueError('No Spring 2026 readers in the assembled site')
    for reader in readers:
        session = reader.parent.parent.name
        html = reader.read_text(encoding='utf-8')
        match = re.search(r'<script id="source-reader-config"[^>]*>(.*?)</script>', html, re.S)
        if not match:
            raise ValueError(f'Missing reader configuration: {session}')
        config = json.loads(match.group(1))
        if config['session'] != session or config['term'] != 'spring-2026':
            raise ValueError(f'Unexpected reader identity: {session}')
        base = f'/deep-learning/terms/spring-2026/{session}/slides/'
        pending = [base, config['translationUrl'],
                   f"/deep-learning/assets/danna/spring-2026/{session}-pages/manifest.json?sha={config['sourceSha256']}",
                   '/deep-learning/models/source-models.json', '/assets/fonts/arad.woff2']
        if session == 's05':
            pending.append('/deep-learning/animations/convolution-code/')
            film = (site / 'deep-learning/animations/convolution-code/index.html').read_text(encoding='utf-8')
            pending.extend(re.findall(r'/deep-learning/assets/media/convolution-code[^\"\s<]+', film))
        pending += re.findall(r'<(?:script|link|img)\b[^>]*\b(?:src|href)="([^"]+)"', html)
        for directory in ('deep-learning/assets/vendor/pdfjs/cmaps',
                          'deep-learning/assets/vendor/pdfjs/standard_fonts',
                          'deep-learning/assets/vendor/pdfjs/wasm',
                          'deep-learning/assets/vendor/katex/fonts'):
            pending.extend('/' + str(p.relative_to(site)) for p in sorted((site / directory).rglob('*')) if p.is_file())
        entries = {}
        while pending:
            raw = pending.pop()
            parts = urlsplit(urljoin('http://local' + base, raw))
            if parts.netloc != 'local' or not parts.path.startswith('/'):
                raise ValueError(f'External or invalid reader dependency: {raw}')
            url = parts.path + (('?' + parts.query) if parts.query else '')
            if url in entries:
                continue
            file = (site / parts.path.lstrip('/')).resolve()
            if parts.path.endswith('/'):
                file /= 'index.html'
            if not file.is_relative_to(site) or not file.is_file():
                raise ValueError(f'Missing reader dependency: {url}')
            content = file.read_bytes()
            entries[url] = hashlib.sha256(content).hexdigest()
            if file.suffix in {'.js', '.mjs'}:
                text = content.decode('utf-8')
                imports = re.findall(r'(?:\bfrom\s*|\bimport\s*)["\'](\.[^"\']+)["\']', text)
                # PDF.js resolves its worker URL dynamically.
                if file.name == 'source-reader.js':
                    imports.append('./vendor/pdfjs/pdf.worker.min.mjs')
                pending.extend(urljoin(parts.path, item) for item in imports)
        items = [{'url': url, 'sha256': sha} for url, sha in sorted(entries.items())]
        canonical = json.dumps(items, sort_keys=True, separators=(',', ':')).encode()
        manifest = {'version': hashlib.sha256(canonical).hexdigest(), 'session': session, 'entries': items}
        output.mkdir(parents=True, exist_ok=True)
        (output / f'{session}.json').write_text(json.dumps(manifest, indent=2) + '\n')
    return len(readers)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit('Usage: python build_manifests.py BUILT_SITE OUTPUT_DIRECTORY')
    print(f'Generated {generate(sys.argv[1], sys.argv[2])} experimental session manifests')
