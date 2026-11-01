"""Stage shared Python source and export browser-executed Shiny laboratories."""

import argparse
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LABS = ("neuron-xor", "network-playground", "convolution")


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
    if lab != "neuron-xor":
        shutil.copyfile(
            ROOT / "playgrounds/neuron-xor/www/lab.css", destination / "www/lab.css"
        )
    shutil.copyfile(
        ROOT.parent / "assets/fonts/arad.woff2", destination / "www/arad.woff2"
    )
    shutil.copyfile(
        ROOT / "playgrounds/shared/workspace.js", destination / "www/workspace.js"
    )


def prepare_editor(destination):
    """Use the pinned runtime's real multi-file editor, with the experiment first."""
    manifest = destination / "app.json"
    files = json.loads(manifest.read_text())
    files.sort(key=lambda item: (item["name"] != "experiment.py", item["name"]))
    manifest.write_text(json.dumps(files, ensure_ascii=False))
    shutil.copyfile(
        ROOT / "playgrounds/workbench-runtime.css", destination / "workbench.css"
    )
    shutil.copyfile(ROOT / "playgrounds/code-runtime.js", destination / "code-runtime.js")
    index = destination / "index.html"
    html = index.read_text()
    html = html.replace(
        'import { runExportedApp } from "./shinylive/shinylive.js";',
        'import { runExportedApp } from "./code-runtime.js";',
    )
    html = html.replace(
        "</head>",
        '<link rel="stylesheet" href="./workbench.css">'
        '<script>if(new URLSearchParams(location.search).has("_danna-code"))'
        'document.documentElement.classList.add("code-runtime");</script></head>',
    )
    index.write_text(html)


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
            subprocess.run(
                [executable, "export", str(source), str(output / lab)], check=True
            )
            prepare_editor(output / lab)
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
