"""Keep unchanged, hash-verified original PDFs in an ignored local review cache.

Import the already downloaded audit files:
    python3 deep-learning/scripts/cache_sources.py --import-from /tmp/danna-research

Or retrieve missing PDFs again from catalogued official URLs:
    python3 deep-learning/scripts/cache_sources.py --download

Only files matching the recorded SHA-256 are accepted. Changed upstream files
fail verification and require a new source review; catalogues are never rewritten.
This cache is excluded from Git and the public website build.
"""

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from source_catalog import ROOT, TERMS, build_index


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def sources(directory):
    records = {}
    for term_id in TERMS:
        term = json.loads((directory / f"{term_id}.json").read_text(encoding="utf-8"))[
            "term"
        ]
        for row in term["schedule"]:
            for slide in row.get("slides", []):
                if slide.get("download_status") == "ok":
                    records.setdefault(slide["sha256"], slide)
    return records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--import-from", type=Path)
    parser.add_argument(
        "--link",
        action="store_true",
        help="Hard-link verified local downloads without duplicating disk usage; same filesystem required",
    )
    parser.add_argument("--download", action="store_true")
    parser.add_argument("--cache", type=Path, default=ROOT / "data/raw/danna/by-sha256")
    args = parser.parse_args()
    metadata = ROOT / "data/metadata"
    build_index(metadata)
    records = sources(metadata)
    available = {}
    if args.import_from:
        # Some official 2024 PDF links (and their saved files) have no suffix.
        for path in args.import_from.rglob("*"):
            if not path.is_file():
                continue
            with path.open("rb") as stream:
                is_pdf = stream.read(5) == b"%PDF-"
            if is_pdf:
                available.setdefault(digest(path), path)
    args.cache.mkdir(parents=True, exist_ok=True)
    curl = "/usr/bin/curl" if Path("/usr/bin/curl").is_file() else shutil.which("curl")
    missing = []
    copied = downloaded = existing = 0
    for sha, slide in records.items():
        target = args.cache / f"{sha}.pdf"
        if target.exists():
            if digest(target) != sha:
                raise ValueError(f"Cached source has changed: {target}")
            existing += 1
            continue
        if sha in available:
            if args.link:
                os.link(available[sha], target)
            else:
                with available[sha].open("rb") as source, target.open("xb") as output:
                    shutil.copyfileobj(source, output)
            if digest(target) != sha:
                raise ValueError(f"Source changed during copy: {target}")
            copied += 1
        elif args.download:
            if not curl:
                raise RuntimeError("curl is required for remote retrieval")
            with tempfile.TemporaryDirectory(prefix="danna-download-") as folder:
                temporary = Path(folder) / "source.pdf"
                subprocess.run(
                    [
                        curl,
                        "--fail",
                        "--location",
                        "--silent",
                        "--show-error",
                        "--proto",
                        "=http,https",
                        "--proto-redir",
                        "=http,https",
                        "--max-time",
                        "120",
                        "--retry",
                        "2",
                        "--output",
                        str(temporary),
                        "--url",
                        slide["url"],
                    ],
                    check=True,
                )
                if digest(temporary) != sha:
                    raise ValueError(
                        f"Upstream bytes changed; review required: {slide['url']}"
                    )
                with temporary.open("rb") as source, target.open("xb") as output:
                    shutil.copyfileobj(source, output)
                downloaded += 1
        else:
            missing.append(slide["url"])
    print(
        json.dumps(
            {
                "expected_unique_hashes": len(records),
                "existing": existing,
                "imported": copied,
                "downloaded": downloaded,
                "missing": missing,
                "cache": str(args.cache),
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    if missing:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
