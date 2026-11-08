"""Check whether the pinned Audio8 tokenizer preserves spoken Persian marks."""

import argparse
import hashlib
import json
from pathlib import Path


TOKENIZER_SHA256 = "f24e08099d45a8adf3f52f5f0b03276e433bb9d689bb15fcbcc48ce58744588b"
MODEL_REVISION = "bcca4112db62fccaf733772226d4f9931a088a0a"
CASES = ("کَرد", "کُرد", "خوبِه", "خوبِه، آره", "اِم", "ام", "مدلِ شبکه", "مدل شبکه")
PAIRS = (("کَرد", "کُرد"), ("اِم", "ام"), ("مدلِ شبکه", "مدل شبکه"))


def probe(path):
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != TOKENIZER_SHA256:
        raise ValueError("Tokenizer SHA-256 does not match the pinned model revision")
    from tokenizers import Tokenizer, __version__

    tokenizer = Tokenizer.from_file(str(path))
    results = []
    ids = {}
    for text in CASES:
        encoding = tokenizer.encode(text, add_special_tokens=False)
        decoded = tokenizer.decode(encoding.ids, skip_special_tokens=False)
        ids[text] = encoding.ids
        results.append({"text": text, "ids": encoding.ids, "decoded": decoded, "exact": decoded == text})
    comparisons = [{"left": left, "right": right, "distinct": ids[left] != ids[right]} for left, right in PAIRS]
    if not all(row["exact"] for row in results) or not all(row["distinct"] for row in comparisons):
        raise ValueError("Tokenizer altered or conflated at least one test case")
    return {"model_revision": MODEL_REVISION, "tokenizer_sha256": digest, "tokenizers_version": __version__,
            "cases": results, "comparisons": comparisons,
            "limitation": "Token round trips do not establish correct pronunciation or learned prosody."}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("tokenizer", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = probe(args.tokenizer)
    with args.output.open("x", encoding="utf-8") as stream:
        json.dump(result, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    print(f"Saved tokenizer probe to {args.output}; this is not a speech-quality test.")
