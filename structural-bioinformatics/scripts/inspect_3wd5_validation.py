#!/usr/bin/env python3
"""Inspect deposited per-residue wwPDB validation metrics; do not alter coordinates."""

import argparse
import gzip
import hashlib
import json
import xml.etree.ElementTree as ET
from pathlib import Path


def inspect(path):
    data = Path(path).read_bytes()
    root = ET.fromstring(gzip.decompress(data))
    entry = root.find("Entry")
    if entry is None or entry.get("pdbid") != "3WD5":
        raise ValueError("Expected a 3WD5 validation report")
    residues = {}
    for element in root.iter("ModelledSubgroup"):
        attrs = element.attrib
        if (
            attrs.get("model") == "1"
            and attrs.get("chain") == "A"
            and attrs.get("resnum") in {"69", "101"}
            and attrs.get("resname") == "CYS"
            and attrs.get("icode", " ").strip() == ""
            and attrs.get("altcode", " ").strip() == ""
        ):
            number = attrs["resnum"]
            if number in residues:
                raise ValueError(f"Duplicate residue A:{number}")
            residues[number] = {
                key: attrs.get(key) for key in ("rscc", "rsr", "rsrz", "EDIAm", "rama")
            }
    if set(residues) != {"69", "101"}:
        raise ValueError("Expected both A:CYS69 and A:CYS101 in model 1")
    return {"input_sha256": hashlib.sha256(data).hexdigest(), "residues": residues}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("validation_xml_gz", type=Path)
    args = parser.parse_args()
    print(json.dumps(inspect(args.validation_xml_gz), indent=2))


if __name__ == "__main__":
    main()
