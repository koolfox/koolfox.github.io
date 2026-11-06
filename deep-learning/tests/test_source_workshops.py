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

    def test_slide_23_opens_source_self_consistency_and_its_questions(self):
        from student_practice import practice_page
        unit = load_workshops('spring-2026', ROOT, execute=True, session_ids=['s17'])['s17']
        page = practice_page({'id': 'spring-2026'}, {'id': 's17', 'title_fa': 'رای', 'workshop': unit})
        tag = '<script type="application/json" id="practice-config">'
        start = page.index(tag) + len(tag)
        config = json.loads(page[start:page.index('</script>', start)])
        example = next(item for item in config['page_notebooks'] if 23 in item['pages'])
        self.assertEqual(example['key'], 'spring-2026/s17/self-consistency')
        self.assertEqual(example['reference']['answers'], [18, 26, 18])
        questions = next(item for item in config['page_questions'] if 23 in item['pages'])
        self.assertEqual(len(questions['questions']), 4)

    def test_slide_32_opens_six_epochs_instead_of_single_epoch(self):
        from student_practice import practice_page
        unit = load_workshops('spring-2026', ROOT, execute=True, session_ids=['s02'])['s02']
        page = practice_page({'id': 'spring-2026'}, {'id': 's02', 'title_fa': 'پرسپترون', 'workshop': unit})
        tag = '<script type="application/json" id="practice-config">'
        start = page.index(tag) + len(tag)
        config = json.loads(page[start:page.index('</script>', start)])
        examples = [example for example in config['page_notebooks'] if 32 in example['pages']]
        self.assertEqual(len(examples), 1)
        self.assertEqual(examples[0]['key'], 'spring-2026/s02/majority-epochs')
        self.assertEqual(len(examples[0]['reference']['history']), 7)

    def test_slide_35_opens_source_markov_chain_and_its_questions(self):
        from student_practice import practice_page
        unit = load_workshops('spring-2026', ROOT, execute=True, session_ids=['s18'])['s18']
        page = practice_page({'id': 'spring-2026'}, {'id': 's18', 'title_fa': 'مارکوف', 'workshop': unit})
        tag = '<script type="application/json" id="practice-config">'
        start = page.index(tag) + len(tag)
        config = json.loads(page[start:page.index('</script>', start)])
        example = next(item for item in config['page_notebooks'] if 35 in item['pages'])
        self.assertEqual(example['key'], 'spring-2026/s18/markov-states')
        self.assertEqual(example['reference']['transition_rows'], [[0.3, 0.7], [0.4, 0.6]])
        questions = next(item for item in config['page_questions'] if 35 in item['pages'])
        self.assertEqual(len(questions['questions']), 3)

    def test_source_character_choice_and_question_banks_agree(self):
        unit = load_workshops('spring-2026', ROOT, execute=True, session_ids=['s04'])['s04']
        example = next(item for item in unit['source_examples'] if item['id'] == 'character-choice')
        workshop_question = next(item for item in example['questions'] if item['id'] == 'choice')
        activity_question = next(item for item in unit['activities']['questions'] if item['id'] == 'character-choice-choice')
        for question in [workshop_question, activity_question]:
            self.assertEqual(question['answer']['options_fa'][question['answer']['correct_index']], 'o')
            self.assertIn('[0.05, 0.1, 0.2, 0.65]', question['prompt_fa'])
        self.assertEqual(example['reference']['prediction'], 'o')
        rnn = next(item for item in unit['source_examples'] if item['id'] == 'character-choice-rnn')
        for question in [next(q for q in rnn['questions'] if q['id'] == 'choice'),
                         next(q for q in unit['activities']['questions'] if q['id'] == 'character-choice-rnn-choice')]:
            self.assertIn('31 که o', question['solution_fa'])
            self.assertNotIn('31 که e', question['solution_fa'])

    def test_rnn_persian_text_and_example_code_have_no_diacritics(self):
        import re
        unwanted = re.compile(r"[\u064b-\u065fئأإءۀ]")
        def check(value, key='', persian=False):
            persian = persian or key == 'fa' or key.endswith('_fa')
            if isinstance(value, dict):
                for name, item in value.items():
                    check(item, name, persian)
            elif isinstance(value, list):
                for item in value:
                    check(item, key, persian)
            elif persian and isinstance(value, str):
                self.assertIsNone(unwanted.search(value), value)
        for folder in ['translations', 'activities', 'workshops']:
            check(json.loads((ROOT / f'content/{folder}/spring-2026/s04.json').read_text()))
        for file in (ROOT / 'workshops/spring-2026').glob('s04*.py'):
            self.assertIsNone(unwanted.search(file.read_text()), str(file))

    def test_rnn_worked_pages_keep_source_linked_multiple_choice(self):
        unit = load_workshops('spring-2026', ROOT, execute=True, session_ids=['s04'])['s04']
        example = next(item for item in unit['source_examples'] if item['id'] == 'hidden-steps')
        self.assertEqual(example['pages'], [33, 34, 35, 36])
        questions = {item['id']: item for item in unit['activities']['questions']}
        for number in [34, 35, 36]:
            page = unit['activities']['pages'][number - 1]
            self.assertTrue(page['question_ids'])
            self.assertEqual(page['question_coverage'], 'not_applicable')
            for identity in page['question_ids']:
                self.assertEqual(questions[identity]['answer']['kind'], 'choice')
                self.assertEqual(questions[identity]['source_page'], number)

    def test_page_example_executes_its_own_hash_pinned_source_and_rejects_stale_code(self):
        import hashlib
        source = 'result = {"value": 3}\nprint(result)\n'
        path = self.root/'workshops/spring-2026/s01_demo.py'
        path.write_text(source)
        choice = next(q for q in self.unit['questions'] if q['answer']['kind'] == 'choice')
        questions = [{**copy.deepcopy(choice), 'id': 'demo'+str(i), 'source_page': 1,
                      'source_kind': 'original'} for i in range(3)]
        self.unit['source_examples'] = [{'id':'demo','title_fa':'مثال همین صفحه','pages':[1],
            'code_file':'s01_demo.py','starter_sha256':hashlib.sha256(source.encode()).hexdigest(),
            'reference':{'value':3},'questions':questions}]
        self.write('content/workshops/spring-2026/s01.json', self.unit)
        loaded = load_workshops('spring-2026', self.root, execute=True)['s01']['source_examples'][0]
        self.assertEqual(loaded['code'], source)
        path.write_text('result = {"value": 4}\n')
        with self.assertRaisesRegex(ValueError, 'Source example code hash changed'):
            load_workshops('spring-2026', self.root)
        self.unit['source_examples'][0]['code_file'] = '../s01_demo.py'
        self.write('content/workshops/spring-2026/s01.json', self.unit)
        with self.assertRaisesRegex(ValueError, 'Invalid source example code file'):
            load_workshops('spring-2026', self.root)


if __name__ == '__main__':
    unittest.main()
