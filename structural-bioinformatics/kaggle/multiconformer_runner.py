"""Run four independent bounded probes; preserve failures and partial results."""

import hashlib
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

SEEDS = (42, 43, 44, 45)
OUT = Path("/kaggle/working/multiconformer")
OUT.mkdir(parents=True, exist_ok=True)
summary = {
    "utc": datetime.now(timezone.utc).isoformat(),
    "kernel_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    "probe_sha256": hashlib.sha256(Path("/kaggle/working/probe.py").read_bytes()).hexdigest(),
    "reference_sha256": hashlib.sha256(
        Path("/kaggle/working/reference.pdb").read_bytes()
    ).hexdigest(),
    "seeds": list(SEEDS),
    "minimization_max_iterations": 1000,
    "per_seed_timeout_seconds": 300,
    "status": "incomplete",
    "runs": [],
}
start = time.monotonic()
for seed in SEEDS:
    target = OUT / str(seed)
    target.mkdir()
    item = {"seed": seed, "status": "failed"}
    try:
        run = subprocess.run(
            [sys.executable, "/kaggle/working/probe.py", str(target), str(seed)],
            capture_output=True,
            text=True,
            timeout=300,
        )
        (target / "process.log").write_text(run.stdout + "\n" + run.stderr)
        item["returncode"] = run.returncode
        report_path = target / "report.json"
        if run.returncode != 0 or not report_path.exists():
            item["reason"] = "process_failed_or_missing_report"
        else:
            report = json.loads(report_path.read_text())
            item["report"] = report
            if report.get("status") != "feasibility_only":
                item["reason"] = "probe_failed"
            elif report.get("minimization_status") != 0:
                item["reason"] = "minimization_not_converged"
            elif report.get("intrapeptide_nonlocal_heavy_pairs_below_2_angstrom") != 0:
                item["reason"] = "nonlocal_heavy_atom_clashes"
            elif not 1.8 <= report.get("disulfide_distance_angstrom", 0) <= 2.3:
                item["reason"] = "disulfide_distance_outside_diagnostic_range"
            elif len(report.get("matched_ca_residues", [])) != 31:
                item["reason"] = "incomplete_reference_mapping"
            else:
                item["status"] = "qc_pass"
    except subprocess.TimeoutExpired:
        item["reason"] = "process_timeout"
    except Exception as exc:
        item["reason"] = "runner_exception"
        item["error"] = str(exc)
    summary["runs"].append(item)
    summary["elapsed_seconds"] = round(time.monotonic() - start, 3)
    (OUT / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
summary["status"] = (
    "all_qc_pass"
    if all(x["status"] == "qc_pass" for x in summary["runs"])
    else "qc_incomplete_or_failed"
)
(OUT / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps(summary, indent=2), flush=True)
