"""Content integrity checks; these cannot replace scientific review."""
import copy
import importlib.util
import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('content_build', ROOT / 'tools/build.py')
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class ContentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.words = json.loads((ROOT / 'data/words.json').read_text())
        cls.units = json.loads((ROOT / 'data/curriculum.json').read_text())['units']

    def test_catalog_has_valid_units_names_readings_and_distinct_prompts(self):
        self.assertEqual(build.validate(self.words, self.units), [])

    def test_missing_fields_rejected_without_crashing(self):
        for record in [{}, {'t': '用語'}, None, {'t': '用語', 'y': 123}]:
            with self.subTest(record=record):
                self.assertTrue(build.validate([record], self.units))

    def test_equivalent_name_cannot_become_another_distractor(self):
        original = next(w for w in self.words if w.get('aliases'))
        duplicate = copy.deepcopy(original)
        duplicate['t'] = original['aliases'][0]['t']
        duplicate['m'] = '別の問題文'
        duplicate.pop('aliases')
        errors = build.validate([original, duplicate], self.units)
        self.assertTrue(any('重複' in e for e in errors))

    def test_unknown_curriculum_or_exclusion_is_rejected(self):
        for field, value in [('unit', 'nonexistent'), ('avoid_with', ['存在しない用語'])]:
            word = copy.deepcopy(self.words[0])
            word[field] = value
            self.assertTrue(build.validate([word], self.units))

    def test_every_original_record_has_a_review_decision(self):
        review = json.loads((ROOT / 'data/content-review.json').read_text())
        entries = review['entries']
        self.assertEqual(len(entries), review['original_count'])
        self.assertEqual(len({e['original']['t'] for e in entries}), len(entries))
        current = {w['t'] for w in self.words}
        for entry in entries:
            if entry['current_term'] is not None:
                self.assertIn(entry['current_term'], current)
        self.assertEqual(len(review['additions']), review['new_count'])
        self.assertEqual(len(self.words), review['current_count'])
        retained = sum(e['status'] in ['修正', '点検済み・維持'] for e in entries)
        self.assertEqual(retained + review['new_count'], len(self.words))

    def test_exclusions_are_symmetric_and_leave_four_choices(self):
        by_name = {w['t']: w for w in self.words}
        for word in self.words:
            for excluded in word.get('avoid_with', []):
                self.assertIn(word['t'], by_name[excluded].get('avoid_with', []))
            self.assertGreaterEqual(len(self.words)-1-len(word.get('avoid_with', [])), 3)


if __name__ == '__main__':
    unittest.main()
