import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "propose_slide_segments.py"
SPEC = importlib.util.spec_from_file_location("propose_slide_segments", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class SegmentProposalTests(unittest.TestCase):
    def test_bullets_with_wrapped_source_map_to_original_indices(self):
        source = ["Review", "• First example continues", "on another line", "• Second example"]
        block = {"kind": "text", "source_lines": [0, 1, 2, 3], "fa": "مرور\n• مثال اول\n• مثال دوم"}
        result = MODULE.propose(block, source)
        self.assertEqual([part["source_lines"] for part in result], [[0], [1, 2], [3]])
        self.assertEqual("\n".join(part["fa"] for part in result), block["fa"])

    def test_ambiguous_or_specialized_blocks_are_not_changed(self):
        self.assertIsNone(MODULE.propose({"kind": "text", "source_lines": [0, 1], "fa": "عنوان\nمتن"}, ["Title", "• Item"]))
        self.assertIsNone(MODULE.propose({"kind": "text", "source_lines": [0, 2], "fa": "عنوان\n• متن"}, ["Title", "Other", "• Item"]))
        self.assertIsNone(MODULE.propose({"kind": "text", "source_lines": [0, 1], "fa": "عنوان\n• متن", "latex": "x"}, ["Title", "• Item"]))


if __name__ == "__main__":
    unittest.main()
