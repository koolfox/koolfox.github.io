"""Create a project-only worktree, without switching or editing another checkout."""

import argparse
import re
import subprocess
from pathlib import Path

from build_pages import PROJECTS


def create_workspace(repository, project, task, destination, base="origin/main"):
    if project not in PROJECTS or not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,60}", task):
        raise ValueError("Choose a known project and a lowercase task slug")
    destination = Path(destination).absolute()
    if destination.exists():
        raise ValueError("Workspace destination must not exist")
    branch = f"{project}/{task}"
    subprocess.run(
        [
            "git",
            "-C",
            str(repository),
            "worktree",
            "add",
            "--no-checkout",
            "-b",
            branch,
            str(destination),
            base,
        ],
        check=True,
    )
    paths = [project, "scripts", "assets", ".github"]
    if project == "structural-bioinformatics":
        paths.append(".agents/skills/tnf-structural-research")
    subprocess.run(
        ["git", "-C", str(destination), "sparse-checkout", "set", "--cone", *paths],
        check=True,
    )
    subprocess.run(["git", "-C", str(destination), "checkout"], check=True)
    return branch


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", choices=PROJECTS)
    parser.add_argument("--task", required=True)
    parser.add_argument("--path", type=Path, required=True)
    parser.add_argument("--base", default="origin/main")
    args = parser.parse_args()
    repository = Path(__file__).resolve().parents[1]
    branch = create_workspace(repository, args.project, args.task, args.path, args.base)
    print(f"Workspace: {args.path.absolute()}\nBranch: {branch}")
    print(
        "Shared Git history and public hosting remain shared; this is not an OS sandbox."
    )


if __name__ == "__main__":
    main()
