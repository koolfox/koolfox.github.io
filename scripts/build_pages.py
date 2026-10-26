"""Assemble only intended public website files for GitHub Pages; no scientific downloads."""

import argparse
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path


def package_mnist_project(learning: Path, target: Path):
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
        shutil.copyfile(learning / "labs/cnn-mnist" / name, destination / name)
    shutil.copyfile(
        learning / "data/processed/mnist-reference.json",
        destination / "reference-results.json",
    )
    import hashlib
    import json

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


def build_site(repository: Path, output: Path):
    repository = repository.resolve()
    output = output.resolve()
    if output == repository or repository in output.parents and output.name != "pages":
        raise ValueError(
            "Use a dedicated directory named pages for the deployment artifact"
        )
    if output.exists() and any(output.iterdir()):
        raise ValueError("Deployment output must be empty; use a fresh build directory")
    output.mkdir(parents=True, exist_ok=True)
    for name in ("index.html", "favicon.ico"):
        shutil.copyfile(repository / name, output / name)
    for directory in ("assets", "optimization", "stochastic-processes"):
        shutil.copytree(repository / directory, output / directory)
    karpathy = repository / "karpathy"
    karpathy_target = output / "karpathy"
    karpathy_target.mkdir()
    for name in ("index.html", "README.md"):
        shutil.copyfile(karpathy / name, karpathy_target / name)
    shutil.copytree(karpathy / "assets", karpathy_target / "assets")
    # Deliberate public teaching assets only; lecture uploads stay private.
    learning = repository / "deep-learning"
    learning_target = output / "deep-learning"
    learning_target.mkdir()
    for name in ("index.html", "README.md", "replay.html"):
        shutil.copyfile(learning / name, learning_target / name)
    shutil.copytree(learning / "assets", learning_target / "assets")
    (learning_target / "python").mkdir()
    for name in (
        "logic_gates.py",
        "live_training.py",
        "network_playground.py",
        "convolution_lab.py",
        "README.md",
    ):
        shutil.copyfile(learning / "python" / name, learning_target / "python" / name)
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
    shutil.copytree(runtime, learning_target / "runtime")
    package_mnist_project(learning, learning_target)
    # Keep the original Karpathy engine intact, with one course entry point.
    shutil.copytree(karpathy_target, learning_target / "karpathy")
    (karpathy_target / "index.html").write_text(
        '<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">'
        '<meta http-equiv="refresh" content="0;url=/deep-learning/karpathy/">'
        '<link rel="canonical" href="/deep-learning/karpathy/"><title>درس مکمل کارپتی</title>'
        '</head><body><a href="/deep-learning/karpathy/">ادامه در درس یادگیری ژرف</a>'
        "</body></html>",
        encoding="utf-8",
    )
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
            shutil.copyfile(project / name, target / name)
    shutil.copyfile(project / "README.md", target / "README.md")
    course_runtime = project / "results/shinylive"
    if not (course_runtime / "concepts/index.html").exists():
        raise ValueError(
            "Export the structural course lab first: uv run --project "
            "structural-bioinformatics/playgrounds python "
            "structural-bioinformatics/scripts/export_course_lab.py "
            "--output structural-bioinformatics/results/shinylive"
        )
    shutil.copytree(course_runtime, target / "runtime")
    for directory in ("assets", "docs"):
        shutil.copytree(project / directory, target / directory)
    for directory in ("metadata", "processed"):
        destination = target / "data" / directory
        destination.mkdir(parents=True)
        for path in (project / "data" / directory).glob("*.json"):
            shutil.copyfile(path, destination / path.name)
    templates = project / "data" / "templates"
    if templates.exists():
        shutil.copytree(templates, target / "data" / "templates")
    # Small, source-verified teaching sequences are deliberate public inputs.
    sequences = project / "data" / "sequences"
    if sequences.exists():
        destination = target / "data" / "sequences"
        destination.mkdir()
        for pattern in ("*.fasta", "*.gb"):
            for path in sequences.glob(pattern):
                shutil.copyfile(path, destination / path.name)
    # Development direction contracts are not browser-delivered artifacts.
    (target / "docs" / "surface-brief.md").unlink(missing_ok=True)
    (output / ".nojekyll").touch()
    forbidden = {".git", ".venv", "__pycache__", ".agents", ".impeccable", "raw"}
    if any(path.name in forbidden for path in output.rglob("*")):
        raise ValueError(
            "Unexpected development/raw directory in public website artifact"
        )
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    repository = Path(__file__).resolve().parents[1]
    result = build_site(repository, args.output)
    print(f"Website artifact ready: {result}")


if __name__ == "__main__":
    main()
