"""Copy a pinned Mol* browser distribution and verified PDB inputs for offline viewing."""

import base64
import hashlib
import io
import json
import tarfile
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
VERSION = "5.13.1"
TARBALL = f"https://registry.npmjs.org/molstar/-/molstar-{VERSION}.tgz"
INTEGRITY = (
    "sha512-iExD98bJN2P4JK6+pVMwdJlPePldBH8oNT0pZhs8ucxOp086NU2b/gThKwYMC3SW"
    "kdmv++a1g4fGwKfu4Glx1w=="
)


def download(url):
    with urllib.request.urlopen(url, timeout=60) as response:
        return response.read()


def recorded_file(path, content, source):
    destination = PROJECT / path
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(content)
    return {
        "path": path,
        "source": source,
        "bytes": len(content),
        "sha256": hashlib.sha256(content).hexdigest(),
    }


def main():
    archive = download(TARBALL)
    actual = "sha512-" + base64.b64encode(hashlib.sha512(archive).digest()).decode()
    if actual != INTEGRITY:
        raise ValueError("Mol* package integrity does not match the pinned release")
    files = []
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as package:
        for source, target in (
            ("package/build/viewer/molstar.js", "assets/vendor/molstar/molstar.js"),
            ("package/build/viewer/molstar.css", "assets/vendor/molstar/molstar.css"),
            ("package/LICENSE", "assets/vendor/molstar/LICENSE.txt"),
        ):
            files.append(recorded_file(target, package.extractfile(source).read(), TARBALL))
    provenance = json.loads((PROJECT / "data/metadata/structure-downloads.json").read_text())
    coordinates = []
    for entry in provenance["files"]:
        source = next(item for item in entry["coordinates"] if item["path"].endswith(".pdb"))
        content = download(source["url"])
        if hashlib.sha256(content).hexdigest() != source["sha256"]:
            raise ValueError(f"Source coordinate bytes changed for {entry['pdb_id']}")
        coordinates.append(
            {
                "pdb_id": entry["pdb_id"],
                **recorded_file(f"assets/{entry['pdb_id'].lower()}.pdb", content, source["url"]),
            }
        )
    manifest = {
        "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
        "package": "molstar",
        "version": VERSION,
        "license": "MIT",
        "registry_tarball": TARBALL,
        "registry_integrity": INTEGRITY,
        "files": files,
        "coordinates": coordinates,
        "scope": "First deposited model; polymer cartoon; no assembly expansion or dynamics",
    }
    path = PROJECT / "data/metadata/molecular-viewer-vendor.json"
    path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Vendored Mol* {VERSION} and {len(coordinates)} verified coordinate files")


if __name__ == "__main__":
    main()
