"""Fetch official archive files and record source URLs, UTC retrieval and SHA-256."""

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import requests


def sha256(path: Path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def fetch_structures(project: Path, entries=("3WD5", "1TNF", "1B09", "4FM9")):
    manifest = {
        "retrieved_at_utc": datetime.now(UTC).isoformat(),
        "source": "RCSB PDB",
        "files": [],
    }
    session = requests.Session()
    session.headers["User-Agent"] = "tnf-adalimumab-atlas/0.1 (academic reproducibility)"
    for entry in entries:
        if len(entry) != 4 or not entry.isalnum():
            raise ValueError(f"Invalid four-character PDB identifier: {entry}")
        pdb_id = entry.upper()
        response = session.get(f"https://data.rcsb.org/rest/v1/core/entry/{pdb_id}", timeout=60)
        response.raise_for_status()
        metadata = response.json()
        directory = project / "data/raw/structures"
        directory.mkdir(parents=True, exist_ok=True)
        paths = []
        for extension in ("cif", "pdb"):
            path = directory / f"{pdb_id}.{extension}"
            url = f"https://files.rcsb.org/download/{pdb_id}.{extension}"
            payload = session.get(url, timeout=60)
            payload.raise_for_status()
            if not payload.content or payload.content.lstrip().startswith(b"<"):
                raise ValueError(f"Unexpected coordinate response from {url}")
            path.write_bytes(payload.content)
            paths.append(
                {"path": str(path.relative_to(project)), "url": url, "sha256": sha256(path)}
            )
        manifest["files"].append(
            {
                "pdb_id": pdb_id,
                "title": metadata["struct"]["title"],
                "method": [item["method"] for item in metadata.get("exptl", [])],
                "resolution_angstrom": metadata["rcsb_entry_info"].get("resolution_combined"),
                "release_date": metadata["rcsb_accession_info"]["initial_release_date"],
                "source_page": f"https://www.rcsb.org/structure/{pdb_id}",
                "coordinates": paths,
            }
        )
    write_json(project / "data/metadata/structure-downloads.json", manifest)
    return manifest
