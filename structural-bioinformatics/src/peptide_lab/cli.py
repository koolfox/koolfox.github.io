"""Plan or generate a bounded ordered peptide sequence library, without docking."""

import argparse
import json
from pathlib import Path

from . import __version__
from .library import CANONICAL_ALPHABET, LibrarySpec, export_library, plan_library


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", action="version", version=__version__)
    commands = parser.add_subparsers(dest="command", required=True)
    for name in ("plan", "generate"):
        command = commands.add_parser(name)
        command.add_argument("--alphabet", default=CANONICAL_ALPHABET)
        command.add_argument("--min-length", type=int, default=2)
        command.add_argument("--max-length", type=int, default=4)
        if name == "generate":
            command.add_argument("--output-dir", type=Path, required=True)
            command.add_argument("--max-sequences", type=int, default=1_000)
    args = parser.parse_args(argv)
    try:
        spec = LibrarySpec(args.alphabet, args.min_length, args.max_length)
        if args.command == "plan":
            result = plan_library(spec)
        else:
            result = export_library(spec, args.output_dir, args.max_sequences)
    except (ValueError, OSError) as error:
        parser.error(str(error))
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
