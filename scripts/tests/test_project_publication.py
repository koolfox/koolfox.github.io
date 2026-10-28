"""Real filesystem/registry controls for publication isolation, without either app runtime."""

import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location(
    "publication", ROOT / "scripts/build_pages.py"
)
publication = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publication)


class PublicationIsolationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name) / "repo"
        self.root.mkdir()
        self.output = Path(self.temporary.name) / "pages"
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        self.put("index.html", "portal")
        self.put("favicon.ico", "icon")
        self.put("assets/fonts/public.woff2", "shared public font")
        self.put("structural-bioinformatics/index.html", "structural course")
        self.put("structural-bioinformatics/README.md", "readme")
        self.put("structural-bioinformatics/assets/code.py", "structural code")
        self.put("structural-bioinformatics/docs/lesson.md", "lesson")
        self.put("structural-bioinformatics/data/metadata/public.json", "{}")
        self.put("structural-bioinformatics/data/processed/public.json", "{}")
        self.track()
        self.put(
            "structural-bioinformatics/results/shinylive/concepts/index.html", "runtime"
        )

    def put(self, name, value):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(value)
        return path

    def track(self):
        paths = [
            str(p.relative_to(self.root))
            for p in self.root.rglob("*")
            if p.is_file()
            and ".git" not in p.relative_to(self.root).parts
            and "results" not in p.relative_to(self.root).parts
        ]
        subprocess.run(["git", "-C", str(self.root), "add", "--", *paths], check=True)

    def build(self, project="structural-bioinformatics"):
        return publication.build_site(self.root, self.output, projects=(project,))

    def test_structural_build_needs_no_sibling_source_or_runtime(self):
        self.build()
        self.assertTrue(
            (
                self.output / "structural-bioinformatics/runtime/concepts/index.html"
            ).is_file()
        )
        self.assertFalse((self.output / "deep-learning").exists())
        self.assertFalse((self.output / "karpathy").exists())
        manifest = json.loads((self.output / "_publication.json").read_text())
        self.assertEqual(manifest["projects"], ["structural-bioinformatics"])
        self.assertEqual(
            {r["owner"] for r in manifest["files"]},
            {"shared", "structural-bioinformatics"},
        )

    def test_untracked_personal_files_are_not_published(self):
        self.put("structural-bioinformatics/assets/private.csv", "private")
        self.put("assets/private.txt", "private")
        self.put("structural-bioinformatics/data/raw/patients.csv", "private")
        self.put("lecture.pptx", "private")
        self.build()
        self.assertFalse(
            any(p.name.startswith("private") for p in self.output.rglob("*"))
        )
        self.assertFalse((self.output / "structural-bioinformatics/data/raw").exists())
        self.assertFalse((self.output / "lecture.pptx").exists())

    def test_untracked_curated_data_fails_closed(self):
        self.put("structural-bioinformatics/data/metadata/private.json", "{}")
        with self.assertRaisesRegex(ValueError, "Untracked publication input"):
            self.build()

    def test_tracked_symlink_cannot_copy_another_project(self):
        foreign = self.put("deep-learning/private.txt", "not structural")
        link = self.root / "structural-bioinformatics/assets/foreign.txt"
        link.symlink_to(foreign)
        self.track()
        with self.assertRaisesRegex(ValueError, "Symlink publication input"):
            self.build()

    def test_runtime_symlink_cannot_copy_another_workspace(self):
        link = (
            self.root / "structural-bioinformatics/results/shinylive/concepts/foreign"
        )
        link.symlink_to(self.root / "assets", target_is_directory=True)
        with self.assertRaisesRegex(
            ValueError, "Forbidden generated publication input"
        ):
            self.build()

    def test_tracked_environment_file_is_rejected(self):
        self.put("structural-bioinformatics/assets/.env", "not public")
        self.track()
        with self.assertRaisesRegex(ValueError, "Forbidden public path"):
            self.build()

    def test_ordinary_course_build_has_no_lab_dependency(self):
        self.put("optimization/index.html", "optimization")
        self.track()
        self.build("optimization")
        self.assertTrue((self.output / "optimization/index.html").is_file())
        self.assertFalse((self.output / "structural-bioinformatics").exists())

    def test_unknown_or_duplicate_projects_are_rejected(self):
        for projects in (("unknown",), ("karpathy", "karpathy"), ()):
            with self.subTest(projects=projects), self.assertRaises(ValueError):
                publication.build_site(self.root, self.output, projects=projects)

    def test_deep_learning_never_copies_karpathy_sources(self):
        self.put("deep-learning/index.html", "learning")
        self.put("deep-learning/README.md", "readme")
        self.put("deep-learning/assets/own.js", "own code")
        for name in (
            "logic_gates.py",
            "live_training.py",
            "network_playground.py",
            "convolution_lab.py",
            "README.md",
        ):
            self.put("deep-learning/python/" + name, "public")
        for name in (
            "README.md",
            "train.py",
            "mnist_data.py",
            "verify_smoke.py",
            "pyproject.toml",
            "uv.lock",
            "data-sources.json",
        ):
            self.put("deep-learning/labs/cnn-mnist/" + name, "public")
        self.put("deep-learning/data/processed/mnist-reference.json", "{}")
        self.put("deep-learning/scripts/build_course.py", "import sys\n")
        self.track()
        for lab in ("neuron-xor", "network-playground", "convolution"):
            self.put(f"deep-learning/results/shinylive/{lab}/index.html", "runtime")
        self.build("deep-learning")
        redirect = (self.output / "deep-learning/karpathy/index.html").read_text()
        self.assertIn('href="/karpathy/"', redirect)
        self.assertFalse((self.output / "deep-learning/karpathy/assets").exists())
        self.assertFalse((self.output / "karpathy").exists())


if __name__ == "__main__":
    unittest.main()
