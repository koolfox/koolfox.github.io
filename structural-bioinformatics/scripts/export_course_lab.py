"""Stage the tested course engine and export it as a static browser Python app."""

import argparse
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


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--stage-only", action="store_true")
    args = parser.parse_args()
    if args.stage_only:
        stage(args.output)
    else:
        export(args.output)
