"""Report PDBQT torsion-tree complexity without applying a size gate."""


def inspect_torsions(text):
    """Count well-nested branches and report whether TORSDOF matches their count.

    A difference can have chemistry/format-specific reasons; it is a diagnostic,
    not proof that the ligand is invalid. This is not a full PDBQT validator.
    """
    torsdof = []
    stack = []
    branches = 0
    ends = 0
    for line in text.splitlines():
        fields = line.split()
        if not fields:
            continue
        key = fields[0]
        if key == "TORSDOF":
            if len(fields) != 2 or not fields[1].isascii() or not fields[1].isdigit():
                raise ValueError("Invalid TORSDOF: expected one nonnegative integer")
            torsdof.append(int(fields[1]))
        elif key in ("BRANCH", "ENDBRANCH"):
            if len(fields) != 3 or any(
                not value.isascii() or not value.isdigit() or int(value) == 0
                for value in fields[1:]
            ):
                raise ValueError(f"Invalid {key}: expected two positive atom indices")
            pair = tuple(map(int, fields[1:]))
            if pair[0] == pair[1]:
                raise ValueError(f"Invalid {key}: atom indices must differ")
            if key == "BRANCH":
                stack.append(pair)
                branches += 1
            else:
                if not stack or stack.pop() != pair:
                    raise ValueError("Mismatched or incorrectly nested ENDBRANCH")
                ends += 1
    if len(torsdof) != 1:
        raise ValueError("Expected exactly one TORSDOF record")
    if stack:
        raise ValueError("Unclosed BRANCH record")
    return {
        "torsdof_declared": torsdof[0],
        "branch_records": branches,
        "endbranch_records": ends,
        "torsdof_matches_branch_count": torsdof[0] == branches,
        "note": "Count mismatch requires format/chemistry review; not an acceptance gate",
    }
