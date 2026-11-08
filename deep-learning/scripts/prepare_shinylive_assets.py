"""Fetch and verify the pinned public Shinylive asset bundle for CI export."""
import hashlib
import os
import tarfile
import tempfile
import time
import urllib.request
from pathlib import Path, PurePosixPath

VERSION = '0.10.15'
SHA256 = '92deba97423ef2baba39df1806372af320cd6f0e751f4a36f3a7faf2645ea19b'
SIZE = 434679785
URLS = (
    'https://api.github.com/repos/posit-dev/shinylive/releases/assets/560406182',
    'https://github.com/posit-dev/shinylive/releases/download/v0.10.15/shinylive-0.10.15.tar.gz',
)


def valid_archive(path, expected_sha=SHA256, expected_size=SIZE):
    if not path.is_file() or path.stat().st_size != expected_size:
        return False
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest() == expected_sha


def obtain_archive(path, urls=URLS, expected_sha=SHA256, expected_size=SIZE, opener=urllib.request.urlopen):
    path.parent.mkdir(parents=True, exist_ok=True)
    if valid_archive(path, expected_sha, expected_size):
        return
    errors = []
    for attempt in range(2):
        for url in urls:
            temporary = None
            try:
                request = urllib.request.Request(url, headers={'Accept': 'application/octet-stream',
                    'User-Agent': 'danna-shinylive-assets/1', 'Cache-Control': 'no-cache'})
                with opener(request, timeout=120) as response, tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as out:
                    temporary = Path(out.name)
                    size = 0
                    while True:
                        block = response.read(1024 * 1024)
                        if not block:
                            break
                        size += len(block)
                        if size > expected_size:
                            raise ValueError('Downloaded asset exceeds expected size')
                        out.write(block)
                if not valid_archive(temporary, expected_sha, expected_size):
                    raise ValueError('Downloaded asset hash or size mismatch')
                os.replace(temporary, path)
                return
            except (OSError, ValueError) as error:
                errors.append(f'{type(error).__name__}: {error}')
            finally:
                if temporary is not None:
                    temporary.unlink(missing_ok=True)
        if attempt == 0:
            time.sleep(2)
    raise RuntimeError('Unable to obtain verified Shinylive assets: ' + '; '.join(errors))


def install_archive(archive, cache_dir, version=VERSION):
    target = cache_dir / f'shinylive-{version}'
    cache_dir.mkdir(parents=True, exist_ok=True)
    if target.exists() or target.is_symlink():
        raise FileExistsError('Shinylive asset directory already exists; refusing to replace it')
    with tempfile.TemporaryDirectory(prefix='.shinylive-', dir=cache_dir) as tmp:
        root = Path(tmp)
        with tarfile.open(archive, 'r:gz') as tar:
            members = tar.getmembers()
            if not members:
                raise ValueError('Empty asset archive')
            expected_root = f'shinylive-{version}'
            for member in members:
                path = PurePosixPath(member.name)
                if path.is_absolute() or '..' in path.parts or not path.parts or path.parts[0] != expected_root:
                    raise ValueError('Asset path outside expected directory')
                if not (member.isfile() or member.isdir()):
                    raise ValueError('Asset archive contains a link or special file')
            tar.extractall(root, members=members, filter='data')
        extracted = root / expected_root
        if not (extracted / 'shinylive' / 'pyodide' / 'pyodide-lock.json').is_file():
            raise ValueError('Asset archive lacks the Python runtime lock')
        os.replace(extracted, target)


def main():
    import argparse
    from shinylive._assets import shinylive_cache_dir
    from shinylive._version import SHINYLIVE_ASSETS_VERSION

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, required=True)
    args = parser.parse_args()
    if SHINYLIVE_ASSETS_VERSION != VERSION:
        raise RuntimeError('Shinylive asset version does not match the pinned bundle')
    obtain_archive(args.archive)
    install_archive(args.archive, Path(shinylive_cache_dir()))
    print(f'Verified and installed Shinylive assets {VERSION} ({SHA256})')


if __name__ == '__main__':
    main()
