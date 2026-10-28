"""Guard accidental mixed PRs and actual sparse worktree behavior."""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from project_scope import check_scope
from project_workspace import create_workspace


class ChangeScopeTests(unittest.TestCase):
    def test_one_project_and_shared_publication_are_allowed(self):
        self.assertEqual(
            check_scope(
                ["structural-bioinformatics/assets/lab.js", "scripts/build_pages.py"],
                "structural/lab",
            ),
            ["structural-bioinformatics"],
        )

    def test_cross_project_code_is_rejected_even_on_infrastructure_branches(self):
        paths = [
            "structural-bioinformatics/assets/lab.js",
            "deep-learning/python/model.py",
        ]
        for branch in ("structural/lab", "infrastructure/changes"):
            with self.subTest(branch=branch), self.assertRaises(ValueError):
                check_scope(paths, branch)

    def test_test_infrastructure_migration_requires_an_infrastructure_branch(self):
        paths = [
            "structural-bioinformatics/browser-tests/example.js",
            "deep-learning/browser-tests/example.js",
        ]
        self.assertEqual(len(check_scope(paths, "infrastructure/test-separation")), 2)
        with self.assertRaises(ValueError):
            check_scope(paths, "structural/test-separation")

    def test_unowned_or_escaping_paths_are_rejected(self):
        for path in (
            "../private.csv",
            "/tmp/private.csv",
            ".env",
            "private/patients.csv",
        ):
            with self.subTest(path=path), self.assertRaises(ValueError):
                check_scope([path], "structural/lab")

    def test_workspace_excludes_siblings_and_leaves_original_checkout_untouched(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "repo"
            root.mkdir()

            def git(*args):
                return subprocess.run(
                    ["git", "-C", str(root), *args],
                    check=True,
                    capture_output=True,
                    text=True,
                ).stdout.strip()

            git("init", "-q")
            for name in (
                "structural-bioinformatics/own.txt",
                "deep-learning/foreign.txt",
                "assets/font.txt",
                "scripts/tool.py",
                ".github/config.yml",
                "README.md",
            ):
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(name)
            git(
                "add",
                "--",
                "structural-bioinformatics",
                "deep-learning",
                "assets",
                "scripts",
                ".github",
                "README.md",
            )
            git(
                "-c",
                "user.name=Test",
                "-c",
                "user.email=test@example.invalid",
                "commit",
                "-qm",
                "fixture",
            )
            git("update-ref", "refs/remotes/origin/main", "HEAD")
            original_branch = git("branch", "--show-current")
            (root / "personal.txt").write_text("preserve me")
            destination = Path(directory) / "workspace"
            branch = create_workspace(
                root, "structural-bioinformatics", "isolation-test", destination
            )
            self.assertEqual(branch, "structural-bioinformatics/isolation-test")
            self.assertTrue(
                (destination / "structural-bioinformatics/own.txt").is_file()
            )
            self.assertFalse((destination / "deep-learning").exists())
            self.assertEqual(git("branch", "--show-current"), original_branch)
            self.assertEqual((root / "personal.txt").read_text(), "preserve me")
            with self.assertRaises(ValueError):
                create_workspace(
                    root, "structural-bioinformatics", "other", destination
                )


if __name__ == "__main__":
    unittest.main()
