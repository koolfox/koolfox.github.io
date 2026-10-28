"""Assemble only intended public website files for GitHub Pages; no scientific downloads."""

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

PROJECTS = (
    "optimization",
    "stochastic-processes",
    "karpathy",
    "deep-learning",
    "structural-bioinformatics",
)
FORBIDDEN = {
    ".git",
    ".venv",
    "__pycache__",
    ".agents",
    ".impeccable",
    "raw",
    "node_modules",
}


class PublicFiles:
    """Only Git-tracked public inputs; never follow links into another workspace."""

    def __init__(self, repository):
        self.repository = repository
        result = subprocess.run(
            ["git", "-C", str(repository), "ls-files", "-z"],
            check=True,
            capture_output=True,
        )
        self.tracked = {Path(p.decode()) for p in result.stdout.split(b"\0") if p}

    def copyfile(self, source, destination):
        relative = source.relative_to(self.repository)
        if relative not in self.tracked:
            raise ValueError(f"Untracked publication input: {relative}")
        if any(
            p.is_symlink()
            for p in (source, *source.parents)
            if p != self.repository.parent
        ):
            raise ValueError(f"Symlink publication input: {relative}")
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)

    def copytree(self, source, destination):
        relative = source.relative_to(self.repository)
        destination.mkdir(parents=True, exist_ok=True)
        for path in sorted(self.tracked):
            if path.is_relative_to(relative):
                self.copyfile(
                    self.repository / path, destination / path.relative_to(relative)
                )


def copy_runtime(source, destination):
    """Explicit generated output, inspected before copying; not a source-tree escape."""
    if any(parent.is_symlink() for parent in source.parents):
        raise ValueError(f"Forbidden generated publication input: {source}")
    for path in (source, *source.rglob("*")):
        if path.is_symlink() or path.name in FORBIDDEN or path.name.startswith(".env"):
            raise ValueError(f"Forbidden generated publication input: {path}")
    shutil.copytree(source, destination)


def publication_manifest(output, projects):
    files = []
    for path in sorted(output.rglob("*")):
        relative = path.relative_to(output)
        if path.name in FORBIDDEN or path.name.startswith(".env"):
            raise ValueError(f"Forbidden public path: {relative}")
        if not path.is_file():
            continue
        owner = relative.parts[0] if relative.parts[0] in PROJECTS else "shared"
        if owner != "shared" and owner not in projects:
            raise ValueError(f"Unexpected project in artifact: {relative}")
        if owner == "shared" and relative.parts[0] not in {
            "index.html",
            "favicon.ico",
            "assets",
            ".nojekyll",
        }:
            raise ValueError(f"Unexpected shared publication path: {relative}")
        files.append(
            {
                "path": relative.as_posix(),
                "owner": owner,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            }
        )
    (output / "_publication.json").write_text(
        json.dumps({"projects": list(projects), "files": files}, indent=2) + "\n"
    )


def redirect_page(target, title):
    return (
        f'<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8">'
        f'<meta http-equiv="refresh" content="0;url={target}">'
        f'<link rel="canonical" href="{target}"><title>{title}</title>'
        f'<a href="{target}">{title}</a></html>'
    )


def package_mnist_project(learning: Path, target: Path, public):
    destination = target / "labs/cnn-mnist"
    destination.mkdir(parents=True)
    filenames = (
        "README.md",
        "train.py",
        "mnist_data.py",
        "verify_smoke.py",
        "pyproject.toml",
        "uv.lock",
        "data-sources.json",
    )
    for name in filenames:
        public.copyfile(learning / "labs/cnn-mnist" / name, destination / name)
    public.copyfile(
        learning / "data/processed/mnist-reference.json",
        destination / "reference-results.json",
    )
    manifest = {
        name: hashlib.sha256((destination / name).read_bytes()).hexdigest()
        for name in (*filenames, "reference-results.json")
    }
    (destination / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    with zipfile.ZipFile(
        destination / "project.zip", "w", compression=zipfile.ZIP_DEFLATED
    ) as archive:
        for name in (*filenames, "reference-results.json", "manifest.json"):
            info = zipfile.ZipInfo(
                f"deep-learning/labs/cnn-mnist/{name}", date_time=(2026, 1, 1, 0, 0, 0)
            )
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, (destination / name).read_bytes())


def build_site(repository: Path, output: Path, projects=None):
    repository = repository.resolve()
    projects = PROJECTS if projects is None else tuple(projects)
    if (
        not projects
        or len(set(projects)) != len(projects)
        or set(projects) - set(PROJECTS)
    ):
        raise ValueError("Choose distinct known publication projects")
    public = PublicFiles(repository)
    output = output.resolve()
    if output == repository or repository in output.parents and output.name != "pages":
        raise ValueError(
            "Use a dedicated directory named pages for the deployment artifact"
        )
    if output.exists() and any(output.iterdir()):
        raise ValueError("Deployment output must be empty; use a fresh build directory")
    output.mkdir(parents=True, exist_ok=True)
    for name in ("index.html", "favicon.ico"):
        public.copyfile(repository / name, output / name)
    for directory in ("assets",):
        public.copytree(repository / directory, output / directory)
    for directory in ("optimization", "stochastic-processes"):
        if directory in projects:
            public.copytree(repository / directory, output / directory)
    if "karpathy" in projects:
        karpathy = repository / "karpathy"
        karpathy_target = output / "karpathy"
        karpathy_target.mkdir()
        for name in ("index.html", "README.md"):
            public.copyfile(karpathy / name, karpathy_target / name)
        public.copytree(karpathy / "assets", karpathy_target / "assets")
    if "deep-learning" in projects:
        # Deliberate public teaching assets only; lecture uploads stay private.
        learning = repository / "deep-learning"
        learning_target = output / "deep-learning"
        learning_target.mkdir()
        for name in ("index.html", "README.md"):
            public.copyfile(learning / name, learning_target / name)
        public.copytree(learning / "assets", learning_target / "assets")
        (learning_target / "python").mkdir()
        for name in (
            "logic_gates.py",
            "live_training.py",
            "network_playground.py",
            "convolution_lab.py",
            "README.md",
        ):
            public.copyfile(
                learning / "python" / name, learning_target / "python" / name
            )
        subprocess.run(
            [
                sys.executable,
                str(learning / "scripts/build_course.py"),
                "--output",
                str(learning_target),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
        )
        runtime = learning / "results/shinylive"
        if any(
            not (runtime / lab / "index.html").exists()
            for lab in ("neuron-xor", "network-playground", "convolution")
        ):
            raise ValueError(
                "Export live laboratories first: uv run --project deep-learning/playgrounds "
                "python deep-learning/scripts/export_playgrounds.py "
                "--output deep-learning/results/shinylive"
            )
        copy_runtime(runtime, learning_target / "runtime")
        package_mnist_project(learning, learning_target, public)
        # Historical URLs keep working through navigation, without duplicating sibling code.
        (learning_target / "karpathy").mkdir()
        (learning_target / "karpathy/index.html").write_text(
            redirect_page("/karpathy/", "درس مستقل کارپتی"), encoding="utf-8"
        )
    if "structural-bioinformatics" in projects:
        project = repository / "structural-bioinformatics"
        target = output / "structural-bioinformatics"
        target.mkdir()
        for name in (
            "index.html",
            "presentation.html",
            "learn.html",
            "course.html",
            "research.html",
            "library.html",
            "papers.html",
            "structures.html",
            "datasets.html",
            "docking.html",
            "exercises.html",
            "presentations.html",
        ):
            if (project / name).exists():
                public.copyfile(project / name, target / name)
        public.copyfile(project / "README.md", target / "README.md")
        course_runtime = project / "results/shinylive"
        if not (course_runtime / "concepts/index.html").exists():
            raise ValueError(
                "Export the structural course lab first: uv run --project "
                "structural-bioinformatics/playgrounds python "
                "structural-bioinformatics/scripts/export_course_lab.py "
                "--output structural-bioinformatics/results/shinylive"
            )
        copy_runtime(course_runtime, target / "runtime")
        for directory in ("assets", "docs"):
            public.copytree(project / directory, target / directory)
        for directory in ("metadata", "processed"):
            destination = target / "data" / directory
            destination.mkdir(parents=True)
            for path in (project / "data" / directory).glob("*.json"):
                public.copyfile(path, destination / path.name)
        templates = project / "data" / "templates"
        if templates.exists():
            public.copytree(templates, target / "data" / "templates")
        # Small, source-verified teaching sequences are deliberate public inputs.
        sequences = project / "data" / "sequences"
        if sequences.exists():
            destination = target / "data" / "sequences"
            destination.mkdir()
            for pattern in ("*.fasta", "*.gb"):
                for path in sequences.glob(pattern):
                    public.copyfile(path, destination / path.name)
        # Development direction contracts are not browser-delivered artifacts.
        (target / "docs" / "surface-brief.md").unlink(missing_ok=True)
    (output / ".nojekyll").touch()
    publication_manifest(output, projects)
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument(
        "--project",
        action="append",
        choices=PROJECTS,
        help="Build only this project; may be repeated",
    )
    args = parser.parse_args()
    repository = Path(__file__).resolve().parents[1]
    result = build_site(repository, args.output, projects=args.project)
    print(f"Website artifact ready: {result}")


if __name__ == "__main__":
    main()
