"""Per-session workshops can ship incrementally; enabled readers cannot lack one."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from workshops import load_workshops


class SourceWorkshopTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for name in ('data/metadata', 'content/workshops/spring-2026', 'workshops/spring-2026'):
            (self.root/name).mkdir(parents=True)
        term = json.loads((ROOT/'data/metadata/spring-2026.json').read_text())
        self.write('data/metadata/spring-2026.json', term)
        self.registry(['s01'])
        self.unit = copy.deepcopy(json.loads((ROOT/'content/workshops/spring-2022.json').read_text())['sessions'][0])
        source = next(r for r in term['term']['schedule'] if r['id']=='s01')['slides'][0]
        self.unit.update(source_sha256=source['sha256'], source_url=source['url'], source_page_count=source['page_count'])
        (self.root/'workshops/spring-2026/s01.py').write_bytes((ROOT/'workshops/spring-2022/s01.py').read_bytes())

    def write(self, name, document):
        (self.root/name).write_text(json.dumps(document))

    def registry(self, sessions):
        self.write('data/metadata/source-readers.json', {'schema_version':1, 'terms':{'spring-2026':sessions}})

    def test_partial_session_workshop_executes_with_its_actual_reference(self):
        self.write('content/workshops/spring-2026/s01.json', self.unit)
        result = load_workshops('spring-2026', self.root, execute=True)
        self.assertEqual(set(result), {'s01'})

    def test_enabled_reader_cannot_ship_without_a_workshop_or_with_another_sessions(self):
        with self.assertRaisesRegex(ValueError, 'own workshop'):
            load_workshops('spring-2026', self.root)
        self.write('content/workshops/spring-2026/s01.json', self.unit)
        self.registry(['s02'])
        with self.assertRaisesRegex(ValueError, 'own workshop'):
            load_workshops('spring-2026', self.root)

    def test_source_and_code_identity_stay_required_in_fragment_format(self):
        self.unit['source_sha256'] = '0'*64
        self.write('content/workshops/spring-2026/s01.json', self.unit)
        with self.assertRaisesRegex(ValueError, 'source changed'):
            load_workshops('spring-2026', self.root)

    def test_teaching_prints_do_not_replace_the_result_reference(self):
        import hashlib
        code = (self.root/'workshops/spring-2026/s01.py').read_text() + '\nprint("prediction demo")\n'
        (self.root/'workshops/spring-2026/s01.py').write_text(code)
        self.unit['starter_sha256'] = hashlib.sha256(code.encode()).hexdigest()
        self.write('content/workshops/spring-2026/s01.json', self.unit)
        self.assertEqual(set(load_workshops('spring-2026', self.root, execute=True)), {'s01'})

    def test_session_selection_isolates_registered_units_from_authoring_drafts(self):
        self.write('content/workshops/spring-2026/s01.json', self.unit)
        (self.root/'content/workshops/spring-2026/s02.json').write_text('{unfinished')
        self.assertEqual(set(load_workshops('spring-2026', self.root, execute=True, session_ids=['s01'])), {'s01'})
        self.assertEqual(load_workshops('spring-2026', self.root, session_ids=[]), {})


if __name__ == '__main__':
    unittest.main()
