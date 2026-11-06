"""Report built film resources missing from each experimental reader manifest."""
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

FILMS = {'backpropagation': 's03', 'convolution': 's05',
         'convolution-code': 's05', 'attention': 's13'}


def report(site, manifests):
    site, manifests = Path(site), Path(manifests)
    actual = {p.parent.name for p in (site / 'deep-learning/animations').glob('*/index.html')}
    if actual != set(FILMS):
        raise ValueError(f'Unexpected film inventory: {sorted(actual)}')
    output = []
    for name, session in FILMS.items():
        manifest = json.loads((manifests / f'{session}.json').read_text())
        included = {entry['url'] for entry in manifest['entries']}
        film_url = f'/deep-learning/animations/{name}/'
        html = (site / film_url.lstrip('/') / 'index.html').read_text(encoding='utf-8')
        assets = sorted(set(re.findall(r'/deep-learning/assets/media/[^"\s<]+', html)))
        if not any(urlsplit(url).path.endswith('.mp4') for url in assets):
            raise ValueError(f'No media URL for {name}')
        required = [film_url, *assets]
        output.append({'film': name, 'session': session, 'required': required,
                       'missing': [url for url in required if url not in included],
                       'iframe_outside_scope': True})
    return output


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit('Usage: python film_coverage.py BUILT_SITE MANIFEST_DIRECTORY')
    print(json.dumps(report(sys.argv[1], sys.argv[2]), indent=2))
