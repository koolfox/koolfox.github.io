#!/usr/bin/env python3
"""Generate a self-contained PyMOL script from a verified paired-control run."""

import argparse
import base64
import hashlib
import json
import re
import sys
from pathlib import Path

SEQ = re.compile(r"[ACDEFGHIKLMNPQRSTVWY]{1,100}\Z")
SHA = re.compile(r"[a-f0-9]{64}\Z")


def read_verified(root, name, digest):
    if not isinstance(digest, str) or not SHA.fullmatch(digest):
        raise ValueError(f"{name}: missing or invalid SHA-256")
    path = root / name
    if path.is_symlink() or not path.is_file() or path.resolve().parent != root:
        raise ValueError(f"{name}: missing, non-regular, or unsafe artifact")
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != digest:
        raise ValueError(f"{name}: SHA-256 mismatch")
    return data


def split_models(data):
    try:
        lines = data.decode("ascii").splitlines(keepends=True)
    except UnicodeDecodeError as exc:
        raise ValueError("pose file is not ASCII PDBQT") from exc
    models, current = [], None
    for line in lines:
        tag = line.split(maxsplit=1)[0] if line.split() else ""
        if tag == "MODEL":
            if current is not None or not re.fullmatch(r"MODEL\s+\d+\s*", line):
                raise ValueError("invalid nested or malformed MODEL")
            number = int(line.split()[1])
            if number != len(models) + 1:
                raise ValueError("MODEL numbers must be consecutive from 1")
            current = [line]
        elif tag == "ENDMDL":
            if current is None or line.strip() != "ENDMDL":
                raise ValueError("unexpected ENDMDL")
            current.append(line)
            if not any(x.startswith(("ATOM  ", "HETATM")) for x in current):
                raise ValueError("empty pose model")
            models.append("".join(current).encode("ascii"))
            current = None
        elif current is not None:
            current.append(line)
        elif line.strip():
            raise ValueError("unexpected data outside pose models")
    if current is not None or not models:
        raise ValueError("missing or incomplete pose models")
    return models


def generate(report, root, selections):
    if not isinstance(report, dict) or not isinstance(report.get("arms"), dict):
        raise ValueError("report must contain an arms object")
    root = root.resolve(strict=True)
    if not root.is_dir():
        raise ValueError("artifact root is not a directory")
    objects, receptor_hash = [], None
    for seq, pose_number in selections:
        if not SEQ.fullmatch(seq):
            raise ValueError("invalid sequence identifier")
        arm = report["arms"].get(seq)
        if (
            not isinstance(arm, dict)
            or type(arm.get("returncode")) is not int
            or arm["returncode"] != 0
        ):
            raise ValueError(f"{seq}: run failed or is unavailable")
        run = arm.get("report")
        if not isinstance(run, dict) or run.get("status") != "requires_further_validation":
            raise ValueError(f"{seq}: invalid run status")
        candidates = run.get("candidates")
        if (
            not isinstance(candidates, list)
            or len(candidates) != 1
            or not isinstance(candidates[0], dict)
        ):
            raise ValueError(f"{seq}: expected exactly one candidate")
        candidate = candidates[0]
        if (
            candidate.get("sequence") != seq
            or candidate.get("status") != "requires_further_validation"
        ):
            raise ValueError(f"{seq}: candidate identity or status mismatch")
        receptor = read_verified(root, "receptor.pdbqt", run.get("receptor_pdbqt_sha256"))
        digest = hashlib.sha256(receptor).hexdigest()
        if receptor_hash is None:
            receptor_hash = digest
            objects.append(("receptor", receptor))
        elif digest != receptor_hash:
            raise ValueError("selected arms have different receptors")
        poses = split_models(read_verified(root, seq + ".pdbqt", candidate.get("poses_sha256")))
        declared = candidate.get("poses")
        if not isinstance(declared, list) or len(declared) != len(poses):
            raise ValueError(f"{seq}: reported pose count differs from artifact")
        if pose_number < 1 or pose_number > len(poses):
            raise ValueError(f"{seq}: pose {pose_number} outside 1..{len(poses)}")
        objects.append((f"pose_{seq}_{pose_number}", poses[pose_number - 1]))
    if len({name for name, _ in objects}) != len(objects):
        raise ValueError("duplicate selection")
    lines = [
        "# Exploratory docking poses: binding or inhibition is not established.",
        "# Coordinates were checked against hashes in the supplied report at generation.",
        "python",
        "import base64, os, tempfile",
        "from pymol import cmd",
        "def _bioops_load(name, encoded):",
        '    fd, path = tempfile.mkstemp(suffix=".pdbqt")',
        "    try:",
        '        with os.fdopen(fd, "wb") as handle:',
        "            handle.write(base64.b64decode(encoded))",
        '        cmd.load(path, name, format="pdbqt")',
        "    finally:",
        "        os.unlink(path)",
    ]
    for name, data in objects:
        lines.append(f"_bioops_load({name!r}, {base64.b64encode(data).decode('ascii')!r})")
    lines += [
        "del _bioops_load",
        "python end",
        "hide everything, all",
        "show cartoon, receptor",
        "color grey70, receptor",
    ]
    for name, _ in objects[1:]:
        lines += [f"show sticks, {name}", f"color cyan, {name}"]
    lines += ["orient all", ""]
    return "\n".join(lines)


def selection(value):
    match = re.fullmatch(r"([ACDEFGHIKLMNPQRSTVWY]{1,100}):([1-9][0-9]{0,5})", value)
    if not match:
        raise argparse.ArgumentTypeError("selection must be SEQUENCE:POSE_NUMBER (1-based)")
    return match.group(1), int(match.group(2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--artifacts", type=Path, required=True)
    parser.add_argument(
        "--select", type=selection, action="append", required=True, metavar="SEQUENCE:POSE"
    )
    parser.add_argument(
        "--output",
        type=Path,
        required=True,
        help="new .pml file; existing files are never overwritten",
    )
    args = parser.parse_args()
    try:
        if args.output.suffix.lower() != ".pml":
            raise ValueError("output must have a .pml extension")
        report = json.loads(args.report.read_text(encoding="utf-8"))
        result = generate(report, args.artifacts, args.select)
        with args.output.open("x", encoding="ascii", newline="\n") as output:
            output.write(result)
    except (ValueError, OSError, UnicodeError, RecursionError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(f"Wrote {args.output}; exploratory poses only; binding not established.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
