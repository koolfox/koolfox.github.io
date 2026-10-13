"""Verify the actual dependency-free preview command and its public artifact."""

import subprocess
import sys
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import urlopen

import pytest


def test_local_preview_serves_complete_public_notebook_from_any_directory(tmp_path):
    root = Path(__file__).resolve().parents[2]
    process = subprocess.Popen(
        [sys.executable, str(root / "scripts/serve_local.py"), "--port", "0", "--no-browser"],
        cwd=tmp_path,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        line = process.stdout.readline().strip()
        assert line.startswith("LOCAL_PREVIEW_URL=http://127.0.0.1:")
        base = line.split("=", 1)[1]
        files = [
            ("", root / "structural-bioinformatics/index.html"),
            (
                "docs/class-presentation.fa.md",
                root / "structural-bioinformatics/docs/class-presentation.fa.md",
            ),
            (
                "assets/markdown-reader.js",
                root / "structural-bioinformatics/assets/markdown-reader.js",
            ),
            (
                "data/sequences/TNF_NM_000594.4.fasta",
                root / "structural-bioinformatics/data/sequences/TNF_NM_000594.4.fasta",
            ),
        ]
        for route, expected in files:
            with urlopen(base + route, timeout=5) as response:
                assert response.read() == expected.read_bytes()
        origin = base.split("/structural-bioinformatics/")[0]
        with urlopen(origin + "/assets/fonts/arad.woff2", timeout=5) as response:
            assert response.read() == (root / "assets/fonts/arad.woff2").read_bytes()
        with pytest.raises(HTTPError) as error:
            urlopen(origin + "/.git/config", timeout=5)
        assert error.value.code == 404
    finally:
        process.terminate()
        process.communicate(timeout=10)
