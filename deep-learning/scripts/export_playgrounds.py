"""Stage shared Python source and export browser-executed Shiny laboratories."""

import argparse
import hashlib
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LABS = ("neuron-xor", "network-playground", "convolution")


def validate_workshop_runtime(output):
    loader = json.loads((ROOT / "assets/vendor/pyodide-LICENSE.json").read_text())
    digest = hashlib.sha256(
        (ROOT / "assets/vendor/pyodide.mjs").read_bytes()
    ).hexdigest()
    if digest != loader["loader_sha256"]:
        raise ValueError("Workshop loader hash differs from the pinned source")
    lock = json.loads(
        (output / "neuron-xor/shinylive/pyodide/pyodide-lock.json").read_text()
    )
    if lock["info"]["version"] != loader["version"]:
        raise ValueError(
            "Workshop loader version must match the exported Python runtime"
        )


def stage(lab, destination):
    if lab not in LABS:
        raise ValueError(f"Unknown laboratory: {lab}")
    shutil.copytree(
        ROOT / "playgrounds" / lab,
        destination,
        ignore=shutil.ignore_patterns("__pycache__", "*.pyc"),
    )
    modules = {
        "neuron-xor": ("logic_gates.py", "live_training.py"),
        "network-playground": ("network_playground.py",),
        "convolution": ("convolution_lab.py",),
    }[lab]
    for filename in modules:
        shutil.copyfile(ROOT / "python" / filename, destination / filename)
    shutil.copyfile(
        ROOT / "playgrounds/shared/source_record.py", destination / "source_record.py"
    )
    for filename in ("workspace.js", "workspace.css"):
        shutil.copyfile(
            ROOT / "playgrounds/shared" / filename, destination / "www" / filename
        )
    if lab in {"neuron-xor", "network-playground"}:
        shutil.copyfile(
            ROOT / "playgrounds/shared/topology_ui.py", destination / "topology_ui.py"
        )
        shutil.copyfile(
            ROOT / "playgrounds/shared/native_views.py", destination / "native_views.py"
        )
        for filename in ("topology.js", "topology.css"):
            shutil.copyfile(
                ROOT / "playgrounds/shared" / filename, destination / "www" / filename
            )
    if lab != "neuron-xor":
        shutil.copyfile(
            ROOT / "playgrounds/neuron-xor/www/lab.css", destination / "www/lab.css"
        )
    shutil.copyfile(
        ROOT.parent / "assets/fonts/arad.woff2", destination / "www/arad.woff2"
    )


def export(output):
    if output.exists() and any(output.iterdir()):
        raise ValueError("Choose an empty export directory")
    output.mkdir(parents=True, exist_ok=True)
    executable = shutil.which("shinylive")
    if not executable:
        raise RuntimeError("Run with uv run --project deep-learning/playgrounds")
    with tempfile.TemporaryDirectory(prefix="danna-shinylive-") as temporary:
        for lab in LABS:
            source = Path(temporary) / lab
            stage(lab, source)
            for module in source.glob("*.py"):
                compile(module.read_text(), str(module), "exec")
            subprocess.run(
                [executable, "export", str(source), str(output / lab)], check=True
            )
            shared = ROOT / "playgrounds/shared"
            title = {
                "neuron-xor": "نورون و مسئلهٔ XOR",
                "network-playground": "شبکه و تعمیم",
                "convolution": "فیلتر و تصویر",
            }[lab]
            (output / lab / "index.html").write_text(
                (shared / "host.html")
                .read_text()
                .replace("{{lab}}", lab)
                .replace("{{title}}", title),
                encoding="utf-8",
            )
            for filename in ("host.js", "host.css"):
                shutil.copyfile(shared / filename, output / lab / filename)
            shutil.copyfile(
                ROOT.parent / "assets/fonts/arad.woff2", output / lab / "arad.woff2"
            )
    validate_workshop_runtime(output)
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--stage-only", action="store_true")
    args = parser.parse_args()
    if args.stage_only:
        for lab in LABS:
            stage(lab, args.output / lab)
        print(f"Staged native Python laboratories: {args.output}")
    else:
        print(f"Exported live Python laboratories: {export(args.output)}")


if __name__ == "__main__":
    main()
