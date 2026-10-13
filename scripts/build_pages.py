"""Assemble only intended public website files for GitHub Pages; no scientific downloads."""

import argparse
import shutil
from pathlib import Path


def build_site(repository: Path, output: Path):
    repository = repository.resolve()
    output = output.resolve()
    if output == repository or repository in output.parents and output.name != "pages":
        raise ValueError("Use a dedicated directory named pages for the deployment artifact")
    if output.exists() and any(output.iterdir()):
        raise ValueError("Deployment output must be empty; use a fresh build directory")
    output.mkdir(parents=True, exist_ok=True)
    for name in ("index.html", "favicon.ico"):
        shutil.copyfile(repository / name, output / name)
    for directory in ("assets", "optimization", "stochastic-processes"):
        shutil.copytree(repository / directory, output / directory)
    project = repository / "structural-bioinformatics"
    target = output / "structural-bioinformatics"
    target.mkdir()
    if (project / "index.html").exists():
        shutil.copyfile(project / "index.html", target / "index.html")
    shutil.copyfile(project / "README.md", target / "README.md")
    for directory in ("assets", "docs"):
        shutil.copytree(project / directory, target / directory)
    for directory in ("metadata", "processed"):
        destination = target / "data" / directory
        destination.mkdir(parents=True)
        for path in (project / "data" / directory).glob("*.json"):
            shutil.copyfile(path, destination / path.name)
    # Development direction contracts are not browser-delivered artifacts.
    (target / "docs" / "surface-brief.md").unlink(missing_ok=True)
    (output / ".nojekyll").touch()
    forbidden = {".git", ".venv", "__pycache__", ".agents", ".impeccable", "raw"}
    if any(path.name in forbidden for path in output.rglob("*")):
        raise ValueError("Unexpected development/raw directory in public website artifact")
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
