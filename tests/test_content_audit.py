"""Focused regressions for the 2026-10-24 scientific review.
These checks protect comparisons and calculations; they do not replace expert review.
"""
import importlib.util
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('quiz_choices', ROOT / 'tools/quiz_choices.py')
choices = importlib.util.module_from_spec(spec)
spec.loader.exec_module(choices)


def load(name):
    return json.loads((ROOT / 'data' / (name + '.json')).read_text())


class ContentAuditTests(unittest.TestCase):
    def test_crossing_over_and_recombination_cannot_be_competing_answers(self):
        pools, errors = choices.compile_choices(load('words'), load('quiz-choices'))
        self.assertEqual(errors, [])
        for answer, distractors in pools.items():
            self.assertFalse({'組換え', '乗換え'} <= {answer, *distractors}, answer)
        # Both concepts still have independent comparisons, so learning coverage is kept.
        self.assertGreaterEqual(len(pools['組換え']), 3)
        self.assertGreaterEqual(len(pools['乗換え']), 3)

    def test_night_break_has_equal_total_darkness_control(self):
        q = next(q for q in load('five-choice') if q['id'] == 'fa42')
        rows = q['table']['rows']
        interrupted = next(r for r in rows if '暗期中央' in r[0])
        continuous = next(r for r in rows if '連続暗' in r[0])
        base_dark = int(re.search(r'暗(\d+)時間', interrupted[0])[1]) * 60
        pulse = int(re.search(r'(\d+)分間の光', interrupted[0])[1])
        h, m = map(int, re.search(r'連続暗(\d+)時間(\d+)分', continuous[0]).groups())
        self.assertEqual(base_dark - pulse, h * 60 + m)
        light_h, light_m = map(int, re.search(r'明(\d+)時間(\d+)分', continuous[0]).groups())
        base_light = int(re.search(r'明(\d+)時間', interrupted[0])[1]) * 60
        self.assertEqual(base_light + pulse, light_h * 60 + light_m)
        self.assertEqual(base_light + base_dark, 24 * 60)
        self.assertEqual({interrupted[1], continuous[1]}, {'あり', 'なし'})

    def test_gross_photosynthesis_matches_actual_graph_values(self):
        q = next(q for q in load('thinking') if q['id'] == 'g1')
        graph = q['graph']; values = graph['series'][0]['values']
        respiration = -values[graph['x'].index(0)]
        target = int(re.search(r'光の強さが(\d+)', q['question'])[1])
        gross = values[graph['x'].index(target)] + respiration
        self.assertEqual(str(gross), q['options'][q['answer']]['text'])
        self.assertIn('光呼吸', q['passage'])
        self.assertIn('暗所でのCO₂固定', q['passage'])

    def test_daily_oxygen_balance_matches_both_materials(self):
        q = next(q for q in load('thinking') if q['id'] == 'x7')
        rates = dict(q['materials'][0]['table']['rows'])
        hours = dict(q['materials'][1]['table']['rows'])
        respiration = -rates['暗所']
        gross = sum((rate + respiration) * hours[condition]
                    for condition, rate in rates.items() if condition != '暗所')
        net = sum(rate * hours[condition] for condition, rate in rates.items())
        self.assertEqual(sum(hours.values()), 24)
        self.assertEqual(gross - respiration * 24, net)
        selected = q['options'][q['answer']]['text']
        self.assertEqual(list(map(int, re.findall(r'\d+', selected))), [gross, net])

    def test_review_coverage_includes_every_current_term_and_question(self):
        audit = load('content-audit-20261024')
        for filename, section, key in [('words', 'words', 't'), ('thinking', 'thinking', 'id'), ('five-choice', 'five_choice', 'id')]:
            reviewed = audit['coverage'][section]
            if filename in ['thinking', 'five-choice']:
                pack = load('rag-expansion-20261030')
                reviewed = reviewed + pack['ids']['thinking' if filename == 'thinking' else 'five']
            self.assertEqual(reviewed, [x[key] for x in load(filename)])
        for change in audit['changes']:
            self.assertNotEqual(change['before'], change['after'])
            self.assertTrue(change['reason'])
            for source in change['sources']:
                self.assertIn(source, audit['sources'])


if __name__ == '__main__':
    unittest.main()
