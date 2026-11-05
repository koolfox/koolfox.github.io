"""Repository link is present in each course header shape."""

import sys
import unittest
from html.parser import HTMLParser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from course_star import add_course_star


class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.header_depth = 0
        self.stars = []

    def handle_starttag(self, tag, attrs):
        if tag == 'header':
            self.header_depth += 1
        attributes = dict(attrs)
        if tag == 'a' and attributes.get('class') == 'course-repo-star':
            self.stars.append((self.header_depth, attributes))

    def handle_endtag(self, tag):
        if tag == 'header':
            self.header_depth -= 1


class CourseStarTest(unittest.TestCase):
    def test_supported_headers_and_film_are_accessible_and_idempotent(self):
        cases = [
            '<header class="reader-header"><nav></nav></header>',
            '<header class="site-header"><div class="header-inner"><nav></nav></div></header>',
            '<header class="deck-toolbar"><div></div></header>',
            '<header class="host-header"><nav></nav></header>',
            '<header><h1>آزمایشگاه</h1></header>',
            '<header><h1>نوتبوک</h1><nav data-related-labs></nav></header>',
            '<main><h1>فیلم</h1></main>',
        ]
        for case in cases:
            with self.subTest(case=case):
                rendered = add_course_star('<html><head></head><body>' + case + '</body></html>')
                self.assertEqual(add_course_star(rendered), rendered)
                parser = LinkParser()
                parser.feed(rendered)
                self.assertEqual(len(parser.stars), 1)
                depth, attrs = parser.stars[0]
                self.assertGreater(depth, 0)
                self.assertEqual(attrs['href'], 'https://github.com/koolfox/koolfox.github.io')
                self.assertEqual(attrs['rel'], 'noopener noreferrer')
                self.assertIn('GitHub', attrs['aria-label'])

    def test_practice_link_shares_related_links_row(self):
        html = '<header><h1>Notebook</h1><nav data-related-labs></nav></header>'
        result = add_course_star(html)
        self.assertIn('<nav data-related-labs><a class="course-repo-star"', result)

    def test_redirects_are_left_alone(self):
        source = '<html><script>location.replace("/deep-learning/")</script></html>'
        self.assertEqual(add_course_star(source), source)


if __name__ == '__main__':
    unittest.main()
