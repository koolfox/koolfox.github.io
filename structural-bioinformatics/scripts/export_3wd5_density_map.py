"""Create a 3WD5 CCP4 density map from local validation coefficients using Gemmi."""

import argparse
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import gemmi


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def export(coefficients, output):
    source = Path(coefficients)
    source_hash = sha(source)
    blocks = gemmi.as_refln_blocks(gemmi.cif.read(str(source)))
    if len(blocks) != 1 or blocks[0].entry_id.lower() != "3wd5":
        raise ValueError("Expected a single 3WD5 reflection block")
    block = blocks[0]
    if not {"pdbx_FWT", "pdbx_PHWT"}.issubset(block.column_labels()):
        raise ValueError("Missing 2Fo-Fc map coefficients")
    grid = block.transform_f_phi_to_map("pdbx_FWT", "pdbx_PHWT", sample_rate=3.0)
    if sha(source) != source_hash:
        raise ValueError("Input changed during processing")
    output = Path(output)
    output.mkdir(parents=True, exist_ok=False)
    output_map = output / "3wd5-validation-2fofc.map"
    ccp4 = gemmi.Ccp4Map()
    ccp4.grid = grid
    ccp4.update_ccp4_header()
    ccp4.write_ccp4_map(str(output_map))
    check = gemmi.read_ccp4_map(str(output_map))
    if (check.grid.nu, check.grid.nv, check.grid.nw) != (grid.nu, grid.nv, grid.nw):
        raise ValueError("Exported map dimensions did not round-trip")
    report = {
        "created_at_utc": datetime.now(UTC).isoformat(),
        "input_sha256": source_hash,
        "map_sha256": sha(output_map),
        "script_sha256": sha(Path(__file__)),
        "gemmi_version": gemmi.__version__,
        "sample_rate": 3.0,
        "grid": [grid.nu, grid.nv, grid.nw],
        "space_group": block.spacegroup.hm,
        "limitations": "Validation 2Fo-Fc map is model-dependent; no alternative model was fitted.",
    }
    (output / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--coefficients", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(export(args.coefficients, args.output_dir), indent=2))


if __name__ == "__main__":
    main()
