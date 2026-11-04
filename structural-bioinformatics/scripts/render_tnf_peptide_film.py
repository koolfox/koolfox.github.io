"""Render a silent, captioned camera tour from the measured 7TA3 coordinates."""

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from Bio.PDB import PDBParser
from matplotlib.animation import FFMpegWriter

PROJECT = Path(__file__).resolve().parents[1]
ASSETS = PROJECT / "assets/tnf-peptide"


def segments(path, chain):
    residues = [
        r
        for r in PDBParser(QUIET=True).get_structure("x", path)[0][chain]
        if r.id[0] == " " and "CA" in r and (r["CA"].occupancy or 0) > 0
    ]
    result = []
    for residue in residues:
        point = residue["CA"].coord
        if (
            not result
            or residue.id[1] != result[-1][-1][0] + 1
            or np.linalg.norm(point - result[-1][-1][1]) > 4.5
        ):
            result.append([])
        result[-1].append((residue.id[1], point))
    return [np.array([p for _, p in segment]) for segment in result if len(segment) > 1]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    receptor = segments(ASSETS / "receptor-repaired.pdb", "B")
    reference = segments(ASSETS / "peptide.pdb", "A")
    docked = segments(ASSETS / "native-pose.pdb", "A")
    result = json.loads((PROJECT / "data/processed/tnf-peptide-redock.json").read_text())
    rmsd = result["scores"]["poses"][0]["heavy_atom_rmsd_angstrom"]
    all_points = np.vstack(receptor + reference + docked)
    center = (all_points.max(0) + all_points.min(0)) / 2
    span = float(np.ptp(all_points, axis=0).max()) / 2 + 2
    fig = plt.figure(figsize=(12, 6.75), dpi=80, facecolor="#f1f5f7")
    ax = fig.add_axes([0.33, 0.08, 0.64, 0.84], projection="3d", facecolor="#f1f5f7")
    for segment in receptor:
        ax.plot(*segment.T, color="#0085a1", lw=3.0, alpha=0.85)
    for segment in reference:
        ax.plot(*segment.T, color="#677481", lw=4.3, alpha=0.75)
    curves = [ax.plot(*segment.T, color="#d65a23", lw=3)[0] for segment in docked]
    for axis, coord in zip("xyz", center, strict=True):
        getattr(ax, f"set_{axis}lim")(coord - span, coord + span)
    ax.set_box_aspect((1, 1, 1), zoom=1.65)
    ax.set_axis_off()
    fig.text(0.06, 0.91, "7TA3", fontsize=31, weight="bold", color="#132638")
    fig.text(0.06, 0.85, "PEPTIDE / TNF", fontsize=12, color="#397386")
    fig.text(0.06, 0.67, "TNF reference", fontsize=15, color="#0085a1")
    fig.text(0.06, 0.61, "Experimental peptide", fontsize=15, color="#677481")
    fig.text(0.06, 0.55, "Rigid redocking pose", fontsize=15, color="#d65a23")
    fig.text(0.06, 0.32, f"{rmsd:.2f} Å  ·  253 heavy atoms", fontsize=13, color="#132638")
    fig.text(0.06, 0.22, "Known site / bound conformation", fontsize=10, color="#435a68")
    fig.text(0.06, 0.16, "CAMERA ROTATION ONLY", fontsize=10, weight="bold", color="#435a68")
    fig.text(0.06, 0.12, "Not molecular dynamics", fontsize=10, color="#435a68")
    video = ASSETS / "media/7ta3-redocking.mp4"
    writer = FFMpegWriter(
        fps=12,
        codec="libx264",
        bitrate=1800,
        extra_args=["-pix_fmt", "yuv420p", "-movflags", "+faststart"],
    )
    with writer.saving(fig, str(video), 80):
        for frame in range(144):
            ax.view_init(elev=23, azim=-65 + frame * 0.42)
            for line in curves:
                line.set_visible(frame >= 48)
            writer.grab_frame()
    plt.close(fig)
    captions = ASSETS / "media/7ta3-redocking.fa.vtt"
    captions.write_text(
        "WEBVTT\n\n"
        "00:00:00.000 --> 00:00:04.000\n"
        "ساختار تجربی 7TA3: گیرندهٔ TNF و پپتید متصل.\n\n"
        "00:00:04.000 --> 00:00:08.000\n"
        "نارنجی: حالت بازداک‌شده؛ خاکستری: پپتید تجربی.\n\n"
        "00:00:08.000 --> 00:00:12.000\n"
        "شکل داخلی پپتید ثابت است. چرخش تصویر شبیه‌سازی دینامیک نیست.\n"
    )
    record = {
        "created_at_utc": datetime.now(UTC).isoformat(),
        "input_sha256": {
            p.name: sha(p)
            for p in [
                ASSETS / "7ta3.pdb",
                ASSETS / "receptor-repaired.pdb",
                ASSETS / "peptide.pdb",
                ASSETS / "native-pose.pdb",
                PROJECT / "data/processed/tnf-peptide-redock.json",
            ]
        },
        "video_sha256": sha(video),
        "captions_sha256": sha(captions),
        "fps": 12,
        "duration_seconds": 12,
        "audio": "none",
        "geometry": "C-alpha traces; breaks preserved",
        "motion": "camera rotation only, not molecular dynamics",
        "source": "https://www.rcsb.org/structure/7TA3",
    }
    (PROJECT / "data/metadata/tnf-peptide-film.json").write_text(
        json.dumps(record, indent=2) + "\n"
    )
    print(json.dumps(record, indent=2))


if __name__ == "__main__":
    main()
