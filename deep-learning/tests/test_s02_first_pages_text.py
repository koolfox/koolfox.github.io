import json
import re
import unittest
from pathlib import Path


TRANSLATION = Path(__file__).resolve().parents[1] / "content" / "translations" / "spring-2026" / "s02.json"


class LessonTwoFirstPagesTests(unittest.TestCase):
    def test_first_fourteen_pages_have_no_diacritics_in_persian_text(self):
        pages = json.loads(TRANSLATION.read_text(encoding="utf-8"))["pages"][:14]
        for page in pages:
            for section in ("blocks", "image_text"):
                for record in page.get(section, []):
                    with self.subTest(page=page["number"], section=section):
                        self.assertIsNone(re.search(r"[\u064b-\u065f\u0670\u0626\u0624\u0623\u0625\u06c0]", record.get("fa", "")))


if __name__ == "__main__":
    unittest.main()
