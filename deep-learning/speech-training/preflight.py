"""Check a GPU environment without using speech data or external code."""

import json
import importlib.metadata
import platform
import shutil
import sys
import time
from pathlib import Path


def collect(require_cuda=True):
    import torch

    available = torch.cuda.is_available()
    report = {
        "kind": "synthetic-compute-preflight",
        "purpose": "Verify CUDA and one gradient step; no speech model or dataset is trained.",
        "python": platform.python_version(),
        "torch": torch.__version__,
        "cuda_build": torch.version.cuda,
        "cuda_available": available,
        "devices": [],
        "working_free_bytes": shutil.disk_usage("/kaggle/working" if Path("/kaggle/working").exists() else ".").free,
        "packages": {},
    }
    for name in ("transformers", "tokenizers", "safetensors", "numpy", "soundfile", "accelerate"):
        try:
            report["packages"][name] = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            report["packages"][name] = None
    if require_cuda and not available:
        raise RuntimeError("CUDA is required for this preflight")
    device = torch.device("cuda:0" if available else "cpu")
    if available:
        report["devices"] = [{"name": torch.cuda.get_device_name(i), "memory_bytes": torch.cuda.get_device_properties(i).total_memory}
                             for i in range(torch.cuda.device_count())]
    torch.manual_seed(17)
    model = torch.nn.Linear(32, 8).to(device)
    optimizer = torch.optim.SGD(model.parameters(), lr=0.01)
    inputs = torch.randn(16, 32, device=device)
    targets = torch.randn(16, 8, device=device)
    before = model.weight.detach().clone()
    start = time.monotonic()
    loss = torch.nn.functional.mse_loss(model(inputs), targets)
    loss.backward()
    optimizer.step()
    if available:
        torch.cuda.synchronize()
    report["synthetic_step"] = {
        "device": str(device),
        "loss_finite": bool(torch.isfinite(loss).item()),
        "weights_changed": bool(torch.any(model.weight.detach() != before).item()),
        "seconds": round(time.monotonic() - start, 6),
    }
    if not report["synthetic_step"]["loss_finite"] or not report["synthetic_step"]["weights_changed"]:
        raise RuntimeError("Synthetic gradient step failed")
    return report


if __name__ == "__main__":
    destination = Path("/kaggle/working/speech-preflight.json")
    if not destination.parent.is_dir():
        raise SystemExit("This entry point is intended for Kaggle; import collect(False) for a local check.")
    try:
        result = collect()
    except (ImportError, RuntimeError) as exc:
        print(f"Preflight failed: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
    destination.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
