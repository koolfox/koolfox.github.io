"""Download actual executed Python sources beside the experiment, not editor drafts."""

import hashlib


def source_record(state, directory):
    return {
        **state,
        "source_files": {
            path.name: {
                "content": path.read_text(),
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            }
            for path in sorted(directory.glob("*.py"))
        },
    }
