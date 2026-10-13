"""Render the observed 3WD5 C-alpha trace; camera movement is illustrative only.

This is a structure reveal, not a binding trajectory or an efficacy simulation.
Run with an isolated environment containing manimgx==0.1.1 (Python >= 3.13).
"""

from __future__ import annotations

import argparse
import hashlib
import json
from importlib.metadata import version
from pathlib import Path

import manimgx as m
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PDB = PROJECT_ROOT / "data/raw/structures/3WD5.pdb"
DEFAULT_OUTPUT = PROJECT_ROOT / "results/animations/tnf-adalimumab-3wd5.mp4"
CHAIN_COLORS = {"A": "#5DCBC1", "H": "#F6B16B", "L": "#9EAFF5"}
CHAIN_ROLES = {
    "A": "TNF-alpha protomer",
    "H": "adalimumab Fab heavy chain",
    "L": "adalimumab Fab light chain",
}


def read_ca_coordinates(path: Path) -> dict[str, np.ndarray]:
    """Select first-model ATOM C-alpha coordinates in author chains A/H/L.

    Exclude nonpositive occupancy. Choose the highest-occupancy alternate site,
    with ties preferring blank, then A, then alphabetical. Coordinates remain in
    Angstroms here; no coordinates or missing residues are generated.
    """
    lines = path.read_text(encoding="ascii").splitlines()
    if not lines or not lines[0].startswith("HEADER") or lines[0][62:66] != "3WD5":
        raise ValueError("This demonstrator requires the official PDB 3WD5 file")
    residues: dict[tuple[str, str, str], tuple[float, tuple[bool, bool, str], np.ndarray]] = {}
    model_seen = False
    for number, line in enumerate(lines, 1):
        if line.startswith("MODEL "):
            if model_seen:
                break
            model_seen = True
        if line.startswith("ENDMDL"):
            break
        if not line.startswith("ATOM  ") or line[12:16].strip() != "CA":
            continue
        chain = line[21]
        if chain not in CHAIN_COLORS:
            continue
        try:
            coordinate = np.array([float(line[30:38]), float(line[38:46]), float(line[46:54])])
            occupancy = float(line[54:60])
        except ValueError as error:
            raise ValueError(f"Malformed C-alpha record on line {number}") from error
        if not np.isfinite(coordinate).all() or not np.isfinite(occupancy):
            raise ValueError(f"Non-finite C-alpha record on line {number}")
        if occupancy <= 0:
            continue
        key = (chain, line[22:26], line[26])
        altloc = line[16]
        preference = (altloc != " ", altloc != "A", altloc)
        if (
            key not in residues
            or occupancy > residues[key][0]
            or (occupancy == residues[key][0] and preference < residues[key][1])
        ):
            residues[key] = (occupancy, preference, coordinate)
    chains = {
        chain: np.array([entry[2] for key, entry in residues.items() if key[0] == chain])
        for chain in CHAIN_COLORS
    }
    if any(len(points) < 2 for points in chains.values()):
        raise ValueError("Expected author chains A (TNF), H and L (adalimumab Fab) from 3WD5")
    return chains


def display_coordinates(
    chains: dict[str, np.ndarray],
) -> tuple[dict[str, np.ndarray], float]:
    """Rigidly orient the complex and scale uniformly for the camera.

    PCA chooses a convenient display frame only; it is not a scientific analysis.
    A proper rotation preserves distances, chirality, and relative chain poses.
    """
    points = np.concatenate(list(chains.values()))
    center = points.mean(axis=0)
    _, _, axes = np.linalg.svd(points - center, full_matrices=False)
    if np.linalg.det(axes) < 0:
        axes[-1] *= -1
    scale = 4.1 / float(np.linalg.norm(points - center, axis=1).max())
    return {chain: (coords - center) @ axes.T * scale for chain, coords in chains.items()}, scale


def make_trace(raw: np.ndarray, display: np.ndarray, color: str) -> m.VGroup:
    """Draw beads and cylinders; omit connections across C-alpha gaps > 4.5 A."""
    trace = m.VGroup()
    for coordinate in display:
        trace.add(m.Sphere(center=coordinate, radius=0.034, resolution=(6, 8), color=color))
    for index in range(len(raw) - 1):
        if float(np.linalg.norm(raw[index + 1] - raw[index])) <= 4.5:
            trace.add(
                m.Line3D(
                    display[index],
                    display[index + 1],
                    thickness=0.022,
                    resolution=8,
                    color=color,
                )
            )
    return trace


class TNFAdalimumabComplex(m.ThreeDScene):
    """Reveal deposited chains without translating or deforming the proteins."""

    def __init__(self, pdb_path: Path = DEFAULT_PDB):
        self.pdb_path = pdb_path
        super().__init__()

    def construct(self) -> None:
        raw = read_ca_coordinates(self.pdb_path)
        displayed, _ = display_coordinates(raw)
        self.set_camera_orientation(phi=75 * m.DEGREES, theta=-95 * m.DEGREES)

        title = m.Text("TNFα · Adalimumab Fab", font_size=39, color="#EDF7F6")
        title.to_corner(m.UL, buff=0.55)
        identifier = m.Text("3WD5 / 3.10 Å / X-RAY", font_size=19, color="#A3BCC4")
        identifier.to_corner(m.UR, buff=0.6).shift(0.08 * m.DOWN)
        subtitle = m.Text(
            "An experimental structure, seen from another angle",
            font_size=20,
            color="#A3BCC4",
        )
        subtitle.next_to(title, m.DOWN, aligned_edge=m.LEFT, buff=0.16)

        legend = (
            m.VGroup(
                m.Text(
                    f"TNF protomer · A · {len(raw['A'])} Cα",
                    font_size=21,
                    color=CHAIN_COLORS["A"],
                ),
                m.Text(
                    f"Fab heavy · H · {len(raw['H'])} Cα",
                    font_size=21,
                    color=CHAIN_COLORS["H"],
                ),
                m.Text(
                    f"Fab light · L · {len(raw['L'])} Cα",
                    font_size=21,
                    color=CHAIN_COLORS["L"],
                ),
            )
            .arrange(m.RIGHT, buff=0.55)
            .to_edge(m.DOWN, buff=0.85)
        )
        caption = m.Text(
            "Cα trace · One TNF protomer + Fab H/L · Camera motion only",
            font_size=18,
            color="#A3BCC4",
        ).to_edge(m.DOWN, buff=0.40)
        self.add_fixed_in_frame_mobjects(title, identifier, subtitle, legend, caption)

        traces = {
            chain: make_trace(raw[chain], displayed[chain], CHAIN_COLORS[chain]) for chain in raw
        }
        self.play(m.FadeIn(traces["A"]), run_time=1.0)
        self.wait(0.4)
        self.play(m.FadeIn(traces["H"]), m.FadeIn(traces["L"]), run_time=1.3)
        self.begin_ambient_camera_rotation(rate=0.12)
        self.wait(8)
        self.stop_ambient_camera_rotation()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdb", type=Path, default=DEFAULT_PDB)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--width", type=int, default=1280)
    parser.add_argument("--height", type=int, default=720)
    parser.add_argument("--fps", type=int, default=30)
    args = parser.parse_args()
    if args.width <= 0 or args.height <= 0 or args.width % 2 or args.height % 2 or args.fps < 1:
        parser.error("Width and height must be positive even numbers; fps must be >= 1")
    if not args.pdb.is_file():
        parser.error(f"Missing {args.pdb}; obtain official 3WD5 coordinates before rendering")
    if args.output.suffix.lower() != ".mp4":
        parser.error("--output must end in .mp4")
    chains = read_ca_coordinates(args.pdb)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    m.config.pixel_width = args.width
    m.config.pixel_height = args.height
    m.config.frame_rate = args.fps
    m.config.background_color = "#071822"
    film = TNFAdalimumabComplex(args.pdb).render(args.output, preset="veryfast")
    manifest = {
        "pdb_id": "3WD5",
        "source": "https://files.rcsb.org/download/3WD5.pdb",
        "source_sha256": hashlib.sha256(args.pdb.read_bytes()).hexdigest(),
        "selection": (
            "first model; ATOM C-alpha; occupancy > 0; highest occupancy alternate; author A/H/L"
        ),
        "altloc_tie_preference": ["blank", "A", "alphabetical"],
        "ca_counts": {chain: len(points) for chain, points in chains.items()},
        "chain_colors": {
            chain: {"hex": CHAIN_COLORS[chain], "biological_role": CHAIN_ROLES[chain]}
            for chain in chains
        },
        "representation": "C-alpha beads and trace; no interpolated gaps > 4.5 Angstrom",
        "assembly": "deposited asymmetric unit: one TNF protomer and one adalimumab Fab H/L",
        "display_transform": (
            "centering, proper PCA rotation, uniform scaling; fixed relative coordinates"
        ),
        "motion": (
            "camera rotation and visibility fades only; "
            "no molecular dynamics or efficacy prediction"
        ),
        "engine": "manimgx",
        "engine_version": version("manimgx"),
        "resolution": [args.width, args.height],
        "fps": args.fps,
        "timeline_frames": film.frame_count,
        "video": args.output.name,
    }
    metadata_path = args.output.with_suffix(".json")
    metadata_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Rendered {args.output}\nProvenance {metadata_path}")


if __name__ == "__main__":
    main()
