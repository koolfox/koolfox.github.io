import hashlib
import json
import unittest
from pathlib import Path


class LessonThreeSlideTextTest(unittest.TestCase):
    def test_slide_text_and_layout_identities(self):
        root = Path(__file__).resolve().parents[1] / 'content'
        translations = json.loads((root / 'translations/spring-2026/s03.json').read_text())['pages']
        layouts = json.loads((root / 'source-layout/spring-2026/s03.json').read_text())['pages']
        for number in range(13, 18):
            slide = translations[number - 1]
            self.assertEqual(slide['number'], number)
            for item in slide['blocks'] + slide.get('image_text', []):
                self.assertNotRegex(item['fa'], r'[\u064b-\u065f\u0670\u0626\u06c0]')
            content = {key: slide.get(key, []) for key in ('blocks', 'image_text', 'tables')}
            digest = hashlib.sha256(json.dumps(content, ensure_ascii=False, sort_keys=True,
                                                separators=(',', ':')).encode()).hexdigest()
            self.assertEqual(digest, layouts[number - 1]['translation_sha256'])


if __name__ == '__main__':
    unittest.main()
