"""Create a 3WD5 CCP4 density map from local validation coefficients using Gemmi."""

import argparse
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import gemmi
import numpy as np

EXPECTED_SHA256 = "4a4f2d98a9f1bdaaf9ffa70115be757d96f2e881dfef9d9b01c332c7864c0322"
SOURCE_URL = (
    "https://files.rcsb.org/pub/pdb/validation_reports/wd/3wd5/"
    "3wd5_validation_2fo-fc_map_coef.cif.gz"
)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def export(coefficients, output, retrieved_at_utc=None, coordinates=None):
    if retrieved_at_utc is not None:
        timestamp = datetime.fromisoformat(retrieved_at_utc.replace("Z", "+00:00"))
        if timestamp.tzinfo is None or timestamp.utcoffset() != UTC.utcoffset(timestamp):
            raise ValueError("Retrieval timestamp must include a UTC offset")
    source = Path(coefficients)
    source_hash = sha(source)
    if source_hash != EXPECTED_SHA256:
        raise ValueError("Input SHA-256 differs from the documented validation coefficients")
    blocks = gemmi.as_refln_blocks(gemmi.cif.read(str(source)))
    if len(blocks) != 1 or blocks[0].entry_id.lower() != "3wd5":
        raise ValueError("Expected a single 3WD5 reflection block")
    block = blocks[0]
    if not {"pdbx_FWT", "pdbx_PHWT"}.issubset(block.column_labels()):
        raise ValueError("Missing 2Fo-Fc map coefficients")
    grid = block.transform_f_phi_to_map("pdbx_FWT", "pdbx_PHWT", sample_rate=3.0)
    coordinate_hash = None
    if coordinates is not None:
        coordinate_path = Path(coordinates)
        coordinate_hash = sha(coordinate_path)
        structure = gemmi.read_structure(str(coordinate_path))
        group = gemmi.find_spacegroup_by_name(structure.spacegroup_hm)
        if (
            group is None
            or group.number != block.spacegroup.number
            or not np.allclose(structure.cell.parameters, block.cell.parameters, atol=1e-3)
        ):
            raise ValueError("Coordinate cell or space group differs from the map coefficients")
        if sha(coordinate_path) != coordinate_hash:
            raise ValueError("Coordinate file changed during processing")
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
    if (
        check.axis_positions() != [0, 1, 2]
        or any(check.header_i32(i) != 0 for i in (5, 6, 7))
        or any(check.header_float(i) != 0 for i in (50, 51, 52))
        or check.grid.spacegroup != grid.spacegroup
        or not np.allclose(check.grid.unit_cell.parameters, grid.unit_cell.parameters, atol=1e-3)
        or not np.isfinite(np.array(check.grid, copy=False)).all()
        or not np.array_equal(np.array(check.grid, copy=False), np.array(grid, copy=False))
    ):
        raise ValueError("Exported map values, cell, axes or space group failed round-trip")
    report = {
        "created_at_utc": datetime.now(UTC).isoformat(),
        "source_url": SOURCE_URL,
        "source_retrieved_at_utc": retrieved_at_utc,
        "input_sha256": source_hash,
        "output_file": output_map.name,
        "coordinate_file_sha256": coordinate_hash,
        "map_sha256": sha(output_map),
        "script_sha256": sha(Path(__file__)),
        "gemmi_version": gemmi.__version__,
        "numpy_version": np.__version__,
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
    parser.add_argument("--retrieved-at-utc", help="Recorded retrieval time, if known")
    parser.add_argument("--coordinates", type=Path, help="Optional coordinate file for cell check")
    args = parser.parse_args()
    print(
        json.dumps(
            export(args.coefficients, args.output_dir, args.retrieved_at_utc, args.coordinates),
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
