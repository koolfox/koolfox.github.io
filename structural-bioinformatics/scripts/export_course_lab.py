"""Stage the tested course engine and export it as a static browser Python app."""

import argparse
import json
import runpy
import shutil
import subprocess
import tempfile
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]


def stage(destination):
    shutil.copytree(
        PROJECT / "playgrounds/concepts",
        destination,
        ignore=shutil.ignore_patterns("__pycache__", "*.pyc"),
    )
    for source, name in (
        (PROJECT / "assets/course/interactive_lab.py", "interactive_lab.py"),
        (PROJECT / "assets/course/gromacs/1ubq-protein.pdb", "1ubq-protein.pdb"),
        (PROJECT.parent / "assets/fonts/arad.woff2", "www/arad.woff2"),
    ):
        shutil.copyfile(source, destination / name)


def stage_bioml(destination):
    shutil.copytree(
        PROJECT / "playgrounds/bioml-review",
        destination,
        ignore=shutil.ignore_patterns("__pycache__", "*.pyc"),
    )
    www = destination / "www"
    vendor = www / "vendor"
    vendor.mkdir(parents=True, exist_ok=True)
    shutil.copytree(PROJECT / "assets/vendor/molstar", vendor / "molstar", dirs_exist_ok=True)
    shutil.copyfile(PROJECT / "assets/bioml-ui.css", www / "bioml-ui.css")
    shutil.copyfile(PROJECT.parent / "assets/fonts/arad.woff2", www / "arad.woff2")
    report = json.loads((PROJECT / "data/processed/bioml-review.json").read_text())
    generate = runpy.run_path(str(PROJECT / "scripts/build_bioml_pymol.py"))["generate"]
    for sequence in ("TWNSGHID", "DIHGNSWT"):
        for pose in (1, 2, 3):
            script = generate(report, www / "data", [(sequence, pose)])
            (www / "data" / f"{sequence}-{pose}.pml").write_text(script, encoding="ascii")


def export(output):
    if output.exists() and any(output.iterdir()):
        raise ValueError("Choose an empty export directory")
    executable = shutil.which("shinylive")
    if not executable:
        raise RuntimeError("Run with uv run --project structural-bioinformatics/playgrounds")
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="structural-shinylive-") as temporary:
        source = Path(temporary) / "concepts"
        stage(source)
        subprocess.run([executable, "export", str(source), str(output / "concepts")], check=True)
        review = Path(temporary) / "bioml-review"
        stage_bioml(review)
        subprocess.run(
            [executable, "export", str(review), str(output / "bioml-review")], check=True
        )
    runtime_lock = json.loads((output / "concepts/shinylive/pyodide/pyodide-lock.json").read_text())
    vendor = json.loads((PROJECT / "data/metadata/code-editor-vendor.json").read_text())
    if runtime_lock["info"]["version"] != vendor["pyodide_loader_version"]:
        raise ValueError("The code worker loader must match the exported Pyodide runtime")
    review_lock = json.loads(
        (output / "bioml-review/shinylive/pyodide/pyodide-lock.json").read_text()
    )
    if review_lock["info"]["version"] != vendor["pyodide_loader_version"]:
        raise ValueError("BioML review must use the same pinned Pyodide runtime")
    index = output / "concepts/index.html"
    shell = (PROJECT / "playgrounds/runtime-help.html").read_text()
    index.write_text(
        index.read_text()
        .replace("<body>", "<body>" + shell)
        .replace("<title>Shiny App</title>", "<title>آزمایشگاه مفاهیم ساختاری</title>")
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--stage-only", action="store_true")
    args = parser.parse_args()
    if args.stage_only:
        stage(args.output)
    else:
        export(args.output)
