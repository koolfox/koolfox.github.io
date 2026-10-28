"""Deck coverage and offline-package integrity, separate from source review state."""

import hashlib
import json
import shutil
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from local_slides import load_slides
from package_slides import ASSETS, CORE, NOTICES, package_slides, read_regular
from source_catalog import ROOT


class LocalSlidesTests(unittest.TestCase):
    def test_every_teaching_session_has_an_independent_narrative(self):
        identity, units = load_slides("spring-2022")
        self.assertEqual(len(units), 23)
        self.assertEqual(identity["supervisor_fa"], "دکتر نگار مجمع")
        self.assertEqual(identity["license"], "MIT")
        self.assertNotIn("s03", units)
        self.assertEqual(load_slides("spring-2026"), ({}, {}))
        self.assertEqual(len({u["formula"] for u in units.values()}), 23)

    def test_archive_is_deterministic_and_contains_only_declared_inputs(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory).resolve()
            root = base / "deep-learning"
            output = base / "public/deep-learning"
            output.mkdir(parents=True)
            for folder in ("content/slides", "content/workshops", "data/metadata"):
                target = root / folder
                target.mkdir(parents=True)
                shutil.copyfile(
                    ROOT / folder / "spring-2022.json", target / "spring-2022.json"
                )
            for name in (*ASSETS, *("vendor/notices/" + n for n in NOTICES)):
                source = root / "assets" / name
                source.parent.mkdir(parents=True, exist_ok=True)
                source.write_text("fixture")
                target = output / "assets" / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text("fixture")
            for name in ("LICENSE", "THIRD_PARTY_NOTICES.md"):
                (root / name).write_text("license fixture")
            font = base / "assets/fonts/arad.woff2"
            font.parent.mkdir(parents=True)
            font.write_bytes(b"font fixture")
            for name in CORE:
                target = root / "results/shinylive/neuron-xor/shinylive/pyodide" / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(b"runtime fixture")
            _, units = load_slides("spring-2022", root)
            for identity in units:
                route = f"terms/spring-2022/{identity}/slides/index.html"
                target = output / route
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(
                    f'<a href="/deep-learning/terms/spring-2022/{identity}/">lesson</a>'
                )
                code = output / f"workshops/spring-2022/{identity}.py"
                code.parent.mkdir(parents=True, exist_ok=True)
                code.write_text("result = {'value': 1}")
            (output / "private.pdf").write_text("must not enter archive")
            path = package_slides(output, root)
            before = path.read_bytes()
            self.assertEqual(package_slides(output, root).read_bytes(), before)
            with zipfile.ZipFile(path) as archive:
                names = archive.namelist()
                self.assertEqual(
                    sum(n.endswith("slides/index.html") for n in names), 23
                )
                self.assertFalse(
                    any(
                        n.endswith(".pdf") or "structural-bioinformatics" in n
                        for n in names
                    )
                )
                manifest = json.loads(archive.read("bundle-manifest.json"))
                self.assertEqual(manifest["slides"], 207)
                self.assertEqual(
                    set(names),
                    {f["path"] for f in manifest["files"]} | {"bundle-manifest.json"},
                )
                for record in manifest["files"]:
                    self.assertEqual(
                        hashlib.sha256(archive.read(record["path"])).hexdigest(),
                        record["sha256"],
                    )
                self.assertIn(
                    b"https://koolfox.github.io/deep-learning/",
                    archive.read(
                        "deep-learning/terms/spring-2022/s01/slides/index.html"
                    ),
                )

    def test_bundle_rejects_symlinked_inputs_and_parents(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory).resolve()
            (base / "real").mkdir()
            (base / "real/file").write_text("x")
            (base / "link").symlink_to(base / "real", target_is_directory=True)
            with self.assertRaisesRegex(ValueError, "Symlink bundle input"):
                read_regular(base / "link/file")


if __name__ == "__main__":
    unittest.main()
