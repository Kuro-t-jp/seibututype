"""Structural and concrete regression checks for semantic distractors."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('quiz', ROOT/'tools/quiz_choices.py')
quiz = importlib.util.module_from_spec(spec)
spec.loader.exec_module(quiz)
class QuizChoiceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.words = json.loads((ROOT/'data/words.json').read_text())
        cls.config = json.loads((ROOT/'data/quiz-choices.json').read_text())
        cls.choices, cls.errors = quiz.compile_choices(cls.words, cls.config)
    def test_coverage_is_explicit_and_every_question_has_three_peers(self):
        self.assertEqual(self.errors, [])
        self.assertEqual(set(self.choices) | set(self.config['typing_only']), {w['t'] for w in self.words})
        for term, peers in self.choices.items():
            self.assertGreaterEqual(len(peers), 3, term)
            self.assertEqual(len(peers), len(set(peers)))
            self.assertNotIn(term, peers)
    def test_hormones_and_bases_stay_with_their_peers(self):
        self.assertEqual(set(self.choices['インスリン']), {'グルカゴン','チロキシン','アドレナリン'})
        self.assertEqual(set(self.choices['アデニン']), {'チミン','グアニン','シトシン','ウラシル'})
        self.assertEqual(set(self.choices['ジベレリン']), {'オーキシン','アブシシン酸','エチレン','サイトカイニン'})
        self.assertNotIn('ATP', self.choices['核'])
        self.assertNotIn('細胞小器官', self.choices['核'])
    def test_generic_specific_pairs_are_never_mixed_with_answer(self):
        forbidden = self.config['excluded_pairs'] + [[w['t'],t] for w in self.words for t in w.get('avoid_with',[])]
        for a,b in forbidden:
            self.assertNotIn(b,self.choices.get(a,[]),a)
            self.assertNotIn(a,self.choices.get(b,[]),b)
            for peers in self.choices.values():
                self.assertFalse(a in peers and b in peers,(a,b))
    def test_shortage_is_rejected_instead_of_random_fallback(self):
        config=copy.deepcopy(self.config)
        config['groups']=[g for g in config['groups'] if 'インスリン' not in g['terms']]
        choices, errors=quiz.compile_choices(self.words,config)
        self.assertTrue(any('インスリン' in e for e in errors))
        self.assertNotIn('インスリン',choices)
    def test_unknown_group_member_is_reported(self):
        config=copy.deepcopy(self.config)
        config['groups'].append({'label':'bad','terms':['存在しない語']})
        self.assertTrue(quiz.compile_choices(self.words,config)[1])
if __name__=='__main__':unittest.main()
