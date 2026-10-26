"""Train an original small CNN or linear baseline on checksum-verified MNIST.

Validation selects the checkpoint; the official test is evaluated exactly once
after training. This ReLU/max-pool model is not a reproduction of LeNet-5.
Torch is imported only for execution, keeping data checks dependency-free.
"""

import argparse
import hashlib
import json
import math
import platform
import random
import struct
import sys
import time
from pathlib import Path

from mnist_data import (
    indices_digest,
    read_idx,
    selected_test_indices,
    stratified_split,
    utc_now,
    verify_data,
)

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=ROOT / "data/raw/mnist")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--download", action="store_true")
    parser.add_argument(
        "--smoke",
        action="store_true",
        help="One epoch, 640/160/320 stratified samples; execution check only",
    )
    parser.add_argument("--model", choices=("cnn", "linear"), default="cnn")
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=128)
    parser.add_argument("--learning-rate", type=float, default=0.001)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--threads", type=int, default=1)
    parser.add_argument("--device", choices=("cpu", "cuda"), default="cpu")
    args = parser.parse_args(argv)
    if (
        not 1 <= args.epochs <= 30
        or not 1 <= args.batch_size <= 1024
        or not 1 <= args.threads <= 16
        or not 0 <= args.seed <= 2**32 - 1
    ):
        parser.error(
            "Epochs, batch size, threads or seed outside their supported bounds"
        )
    if not math.isfinite(args.learning_rate) or not 0 < args.learning_rate <= 1:
        parser.error("Learning rate must be finite and in (0,1]")
    if args.smoke:
        args.epochs = 1
    if args.output.resolve() == args.data_dir.resolve():
        parser.error("Output and source data directories must differ")
    return args


def build_model(torch, kind):
    nn = torch.nn
    if kind == "linear":
        return nn.Sequential(nn.Flatten(), nn.Linear(28 * 28, 10))
    return nn.Sequential(
        nn.Conv2d(1, 8, 3, padding=1),
        nn.ReLU(),
        nn.MaxPool2d(2),
        nn.Conv2d(8, 16, 3, padding=1),
        nn.ReLU(),
        nn.MaxPool2d(2),
        nn.Flatten(),
        nn.Linear(16 * 7 * 7, 10),
    )


def load_pool(torch, directory, prefix):
    count, pixels = read_idx(directory / f"{prefix}-images-idx3-ubyte.gz", True)
    label_count, labels = read_idx(directory / f"{prefix}-labels-idx1-ubyte.gz", False)
    if count != label_count:
        raise ValueError("Image and label counts differ")
    images = torch.frombuffer(bytearray(pixels), dtype=torch.uint8).reshape(
        count, 1, 28, 28
    )
    targets = torch.tensor(list(labels), dtype=torch.int64)
    return images, targets, list(labels)


def batch(torch, images, targets, indices, device):
    index = torch.tensor(indices, dtype=torch.int64)
    # Fixed physical scale, not statistics fitted on validation/test data.
    x = images.index_select(0, index).to(device=device, dtype=torch.float32) / 255
    y = targets.index_select(0, index).to(device)
    return x, y


def evaluate(torch, model, images, targets, indices, batch_size, device):
    model.eval()
    loss_sum = 0.0
    confusion = torch.zeros((10, 10), dtype=torch.int64)
    with torch.inference_mode():
        for start in range(0, len(indices), batch_size):
            chosen = indices[start : start + batch_size]
            x, y = batch(torch, images, targets, chosen, device)
            logits = model(x)
            loss_sum += torch.nn.functional.cross_entropy(
                logits, y, reduction="sum"
            ).item()
            predicted = logits.argmax(dim=1)
            confusion += torch.bincount(
                (y * 10 + predicted).cpu(), minlength=100
            ).reshape(10, 10)
    rows = confusion.sum(dim=1)
    recalls = [
        (confusion[i, i].item() / rows[i].item()) if rows[i].item() else None
        for i in range(10)
    ]
    present = [r for r in recalls if r is not None]
    return {
        "count": len(indices),
        "loss": loss_sum / len(indices),
        "accuracy": confusion.diag().sum().item() / len(indices),
        "confusion": confusion.tolist(),
        "recall_per_class": recalls,
        "macro_recall": sum(present) / len(present),
    }


def parameter_digest(state):
    digest = hashlib.sha256()
    for name, tensor in sorted(state.items()):
        values = (
            tensor.detach()
            .cpu()
            .to(dtype=__import__("torch").float32)
            .flatten()
            .tolist()
        )
        digest.update(name.encode())
        digest.update(json.dumps(list(tensor.shape)).encode())
        digest.update(struct.pack(f"<{len(values)}f", *values))
    return digest.hexdigest()


def run(args):
    import torch

    if torch.__version__.split("+")[0] != "2.13.0":
        raise RuntimeError("Use the locked PyTorch 2.13.0 environment")
    if args.output.exists() and any(args.output.iterdir()):
        raise FileExistsError(
            "Choose an empty output directory; previous evidence is preserved"
        )
    if args.device == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA was requested but is unavailable; choose --device cpu")
    args.output.mkdir(parents=True, exist_ok=True)
    provenance = verify_data(args.data_dir, args.download)
    started = time.perf_counter()
    torch.set_num_threads(args.threads)
    torch.use_deterministic_algorithms(True)
    torch.backends.cudnn.benchmark = False
    torch.manual_seed(args.seed)
    random.seed(args.seed)
    images, targets, labels = load_pool(torch, args.data_dir, "train")
    train_indices, validation_indices = stratified_split(labels, args.seed, args.smoke)
    if set(train_indices) & set(validation_indices):
        raise AssertionError("Training and validation overlap")
    if len(labels) != 60000:
        raise ValueError("Expected the official 60,000-image training pool")
    model = build_model(torch, args.model).to(args.device)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.learning_rate)
    shuffle = torch.Generator().manual_seed(args.seed + 1)
    history, best = [], None
    best_state = None
    for epoch in range(1, args.epochs + 1):
        model.train()
        order = torch.randperm(len(train_indices), generator=shuffle).tolist()
        online_loss = 0.0
        for start in range(0, len(order), args.batch_size):
            indices = [train_indices[i] for i in order[start : start + args.batch_size]]
            x, y = batch(torch, images, targets, indices, args.device)
            optimizer.zero_grad(set_to_none=True)
            loss = torch.nn.functional.cross_entropy(model(x), y)
            if not torch.isfinite(loss):
                raise ArithmeticError(
                    "Non-finite loss; preserve this run and lower the learning rate"
                )
            loss.backward()
            optimizer.step()
            online_loss += loss.item() * len(indices)
        train_score = evaluate(
            torch, model, images, targets, train_indices, args.batch_size, args.device
        )
        validation = evaluate(
            torch,
            model,
            images,
            targets,
            validation_indices,
            args.batch_size,
            args.device,
        )
        record = {
            "epoch": epoch,
            "online_training_loss": online_loss / len(train_indices),
            "train": train_score,
            "validation": validation,
        }
        history.append(record)
        if best is None or validation["loss"] < best["validation"]["loss"]:
            best = record
            best_state = {
                k: v.detach().cpu().clone() for k, v in model.state_dict().items()
            }
        print(
            json.dumps(
                {
                    "epoch": epoch,
                    "train_loss": train_score["loss"],
                    "validation_loss": validation["loss"],
                    "validation_accuracy": validation["accuracy"],
                }
            ),
            flush=True,
        )
    # No test pool is loaded or evaluated until model selection has finished.
    model.load_state_dict(best_state)
    test_images, test_targets, test_labels = load_pool(torch, args.data_dir, "t10k")
    if len(test_labels) != 10000:
        raise ValueError("Expected the official 10,000-image test pool")
    test_indices = selected_test_indices(test_labels, args.seed + 2, args.smoke)
    test = evaluate(
        torch,
        model,
        test_images,
        test_targets,
        test_indices,
        args.batch_size,
        args.device,
    )
    weights_path = args.output / "weights.pt"
    torch.save(best_state, weights_path)
    config = {
        key: value
        for key, value in vars(args).items()
        if key not in ("output", "data_dir", "download")
    }
    source_files = ("train.py", "mnist_data.py", "pyproject.toml", "uv.lock")
    result = {
        "schema_version": 1,
        "executed_at_utc": utc_now(),
        "execution": "pytorch_training",
        "purpose": "execution_smoke_only"
        if args.smoke
        else "educational_mnist_benchmark",
        "config": config,
        "model": str(model),
        "parameter_count": sum(p.numel() for p in model.parameters()),
        "runtime": {
            "python": sys.version.split()[0],
            "torch": torch.__version__,
            "platform": platform.platform(),
            "machine": platform.machine(),
            "device": args.device,
            "threads": args.threads,
        },
        "sources": provenance,
        "source_sha256": {
            name: hashlib.sha256((HERE / name).read_bytes()).hexdigest()
            for name in source_files
        },
        "partitions": {
            "training": {
                "count": len(train_indices),
                "indices_sha256": indices_digest(train_indices),
            },
            "validation": {
                "count": len(validation_indices),
                "indices_sha256": indices_digest(validation_indices),
            },
            "official_test": {
                "count": len(test_indices),
                "indices_sha256": indices_digest(test_indices),
            },
        },
        "history": history,
        "selection_rule": "minimum_validation_cross_entropy",
        "selected_epoch": best["epoch"],
        "test_evaluations": 1,
        "test": test,
        "parameter_sha256": parameter_digest(best_state),
        "checkpoint_file_sha256": hashlib.sha256(weights_path.read_bytes()).hexdigest(),
        "elapsed_seconds": time.perf_counter() - started,
        "limits": [
            "Original small ReLU/max-pool CNN, not the historical LeNet-5 architecture.",
            "Smoke runs test execution on balanced small subsets and do not establish full-dataset performance.",
            "Validation selects the checkpoint; tuning after reading test results invalidates independent evaluation.",
            "Fixed seeds do not guarantee identical results across PyTorch versions, devices or platforms.",
            "MNIST accuracy does not establish performance on other handwriting populations or real applications.",
        ],
    }
    (args.output / "report.json").write_text(json.dumps(result, indent=2) + "\n")
    print(
        json.dumps(
            {
                "selected_epoch": best["epoch"],
                "test": test,
                "parameter_sha256": result["parameter_sha256"],
                "output": str(args.output),
            },
            ensure_ascii=False,
        ),
        flush=True,
    )
    return result


if __name__ == "__main__":
    run(parse_args())
