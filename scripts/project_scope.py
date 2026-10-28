"""Reject accidental cross-project changes in a pull request."""

import argparse
import subprocess
from pathlib import PurePosixPath

from build_pages import PROJECTS


def check_scope(paths, branch):
    owners = set()
    project_paths = []
    for name in paths:
        path = PurePosixPath(name)
        if path.is_absolute() or ".." in path.parts or not path.parts:
            raise ValueError(f"Invalid changed path: {name}")
        owner = path.parts[0]
        if owner in PROJECTS:
            owners.add(owner)
            project_paths.append(path)
        elif owner not in {
            "scripts",
            ".github",
            ".agents",
            ".impeccable",
            "assets",
        } and not (
            len(path.parts) == 1
            and (
                path.suffix == ".md"
                or name
                in {
                    "index.html",
                    "favicon.ico",
                    ".gitignore",
                    ".gitattributes",
                    "start-local.command",
                }
            )
        ):
            raise ValueError(f"Unowned path in pull request: {name}")
    if len(owners) > 1:
        infrastructure_only = branch.startswith("infrastructure/") and all(
            len(path.parts) > 2
            and path.parts[1] in {"tests", "browser-tests"}
            or len(path.parts) == 2
            and path.name == "README.md"
            for path in project_paths
        )
        if not infrastructure_only:
            raise ValueError(
                "A project PR must not change sibling projects: "
                + ", ".join(sorted(owners))
            )
    return sorted(owners)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True)
    parser.add_argument("--branch", required=True)
    args = parser.parse_args()
    changed = subprocess.run(
        ["git", "diff", "--name-only", "--no-renames", "-z", args.base, "HEAD"],
        check=True,
        capture_output=True,
    )
    paths = [p.decode() for p in changed.stdout.split(b"\0") if p]
    try:
        owners = check_scope(paths, args.branch)
    except ValueError as error:
        parser.exit(1, str(error) + "\n")
    print("Project scope accepted:", ", ".join(owners) or "shared infrastructure")


if __name__ == "__main__":
    main()
