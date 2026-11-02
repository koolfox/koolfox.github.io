"""Count ordered sequences with repetition and export only bounded complete libraries."""

import hashlib
import json
import platform
from dataclasses import dataclass
from datetime import UTC, datetime
from itertools import product
from pathlib import Path

from . import __version__

CANONICAL_ALPHABET = "ACDEFGHIKLMNPQRSTVWY"
MAX_LENGTH = 50
MAX_EXPORT_SEQUENCES = 10_000


@dataclass(frozen=True)
class LibrarySpec:
    alphabet: str = CANONICAL_ALPHABET
    min_length: int = 2
    max_length: int = 4

    def __post_init__(self):
        if not isinstance(self.alphabet, str):
            raise ValueError("Alphabet must be a string of canonical one-letter symbols")
        alphabet = self.alphabet.strip().upper()
        if not alphabet or set(alphabet) - set(CANONICAL_ALPHABET):
            raise ValueError("Alphabet must contain only canonical amino-acid symbols")
        if len(set(alphabet)) != len(alphabet):
            raise ValueError("Repeated alphabet symbols would double-count sequences")
        for length in (self.min_length, self.max_length):
            if isinstance(length, bool) or not isinstance(length, int):
                raise ValueError("Sequence lengths must be integers")
        if not 1 <= self.min_length <= self.max_length <= MAX_LENGTH:
            raise ValueError(f"Require 1 <= min_length <= max_length <= {MAX_LENGTH}")
        object.__setattr__(self, "alphabet", alphabet)


def plan_library(spec: LibrarySpec) -> dict:
    """Compute sizes without enumerating sequences or starting scientific calculations."""
    settings = {
        "alphabet": spec.alphabet,
        "min_length": spec.min_length,
        "max_length": spec.max_length,
        "ordered": True,
        "repetition_allowed": True,
    }
    encoded = json.dumps(settings, sort_keys=True, separators=(",", ":")).encode()
    counts = [
        {"length": length, "count": len(spec.alphabet) ** length}
        for length in range(spec.min_length, spec.max_length + 1)
    ]
    return {
        "schema_version": 1,
        "tool": "peptide-lab",
        "tool_version": __version__,
        "settings": settings,
        "spec_sha256": hashlib.sha256(encoded).hexdigest(),
        "counts_by_length": counts,
        "total_sequences": sum(row["count"] for row in counts),
        "max_export_sequences": MAX_EXPORT_SEQUENCES,
        "enumeration_order": "increasing_length_then_supplied_alphabet_order",
        "scope": "sequence_strings_only",
        "structure_generation": "not_run",
        "docking": "not_run",
        "functional_test": "not_run",
        "stereochemistry": "not_built_or_checked",
    }


def export_library(spec: LibrarySpec, output_dir: Path, max_sequences: int = 1_000) -> dict:
    """Refuse over-budget or existing destinations before writing any output.

    FASTA is written first and the completion manifest last. An interrupted write
    can leave incomplete files, but cannot have a completed manifest for that run.
    No prefix is silently substituted for an over-budget complete library.
    """
    if (
        isinstance(max_sequences, bool)
        or not isinstance(max_sequences, int)
        or not 1 <= max_sequences <= MAX_EXPORT_SEQUENCES
    ):
        raise ValueError(f"Export budget must be between 1 and {MAX_EXPORT_SEQUENCES}")
    manifest = plan_library(spec)
    if manifest["total_sequences"] > max_sequences:
        raise ValueError(
            f"Library has {manifest['total_sequences']} sequences; budget is {max_sequences}. "
            "Reduce the alphabet or length range; no partial library was generated."
        )
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=False)
    fasta_path = output_dir / "sequences.fasta"
    digest = hashlib.sha256()
    count = 0
    with fasta_path.open("xb") as handle:
        for length in range(spec.min_length, spec.max_length + 1):
            for letters in product(spec.alphabet, repeat=length):
                count += 1
                sequence = "".join(letters)
                record = f">peptide-{count:06d} length={length}\n{sequence}\n".encode()
                handle.write(record)
                digest.update(record)
    manifest.update(
        {
            "status": "sequences_generated",
            "generated_at_utc": datetime.now(UTC).isoformat(),
            "python_version": platform.python_version(),
            "export_budget": max_sequences,
            "exported_sequences": count,
            "files": {"sequences.fasta": {"sha256": digest.hexdigest()}},
        }
    )
    with (output_dir / "manifest.json").open("x", encoding="utf-8") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    return manifest
