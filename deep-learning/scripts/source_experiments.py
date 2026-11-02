"""Explicit publication boundary for model wrappers and source-bound films.

Never recursively copy models/: large downloads and developer environments live
outside this small, reviewable allow-list.
"""
import hashlib
import json
from pathlib import PurePosixPath

from source_animations import animation_files

ASSETS = ('source-interactives.js', 'source-model-app.js', 'source-model-app.css',
          'model-runtime.js', 'model-image.js', 'model-tokenizer.js',
          'mnist-training.js', 'mnist-training-runtime.js', 'mnist-training.css')
REFERENCES = ('bert-base.json', 'bert-tokenizer-cases.json', 'bert-vocab.txt',
              'image-preprocess-cases.json', 'resnet152-input.float32.bin', 'resnet152.json')


def experiment_files(root, *, generated=False):
    files = [f'assets/{name}' for name in ASSETS]
    files += ['models/source-models.json']
    files += [f'models/references/{name}' for name in REFERENCES]
    files += [f'models/licenses/{name}' for name in ('bert-LICENSE.txt', 'resnet-LICENSE.txt')]
    vendor = root / 'assets/vendor/model-runtime'
    manifest = json.loads((vendor / 'files.json').read_text())
    files.append('assets/vendor/model-runtime/files.json')
    for record in manifest['files']:
        name = record['name']
        path = PurePosixPath(name)
        if path.is_absolute() or len(path.parts) != 1 or name.startswith('.') or '\\' in name:
            raise ValueError('Unsafe model runtime path')
        data = (vendor / name).read_bytes()
        if len(data) != record['bytes'] or hashlib.sha256(data).hexdigest() != record['sha256']:
            raise ValueError('Model runtime integrity failure')
        files.append(f'assets/vendor/model-runtime/{name}')
    training_vendor = root / 'assets/vendor/mnist-runtime'
    training = json.loads((training_vendor / 'files.json').read_text())
    files += ['assets/vendor/mnist-runtime/files.json', 'assets/vendor/mnist-runtime/LICENSE']
    for record in training['packages']:
        name = record['file']
        if PurePosixPath(name).name != name or name.startswith('.') or '\\' in name:
            raise ValueError('Unsafe MNIST runtime path')
        data = (training_vendor / name).read_bytes()
        if len(data) != record['bytes'] or hashlib.sha256(data).hexdigest() != record['sha256']:
            raise ValueError('MNIST runtime integrity failure')
        files.append('assets/vendor/mnist-runtime/' + name)
    dataset = root / 'data/processed/mnist-browser'
    manifest = json.loads((dataset / 'manifest.json').read_text())
    files.append('data/processed/mnist-browser/manifest.json')
    for name, record in manifest['artifacts'].items():
        if name not in {'pixels.bin', 'labels.bin'}:
            raise ValueError('Unexpected browser MNIST artifact')
        data = (dataset / name).read_bytes()
        if len(data) != record['bytes'] or hashlib.sha256(data).hexdigest() != record['sha256']:
            raise ValueError('Browser MNIST data integrity failure')
        files.append('data/processed/mnist-browser/' + name)
    files.append('labs/cnn-mnist/browser_train.py')
    files += animation_files(root)
    if generated:
        files.append('playgrounds/cnn-mnist/train/index.html')
        models = json.loads((root / 'models/source-models.json').read_text())['models']
        films = json.loads((root / 'animations/manifest.json').read_text())['films']
        files += [f'models/{model["id"]}/index.html' for model in models]
        files += [f'animations/{film["id"]}/index.html' for film in films]
    return files
