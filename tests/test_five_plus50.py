"""Independent arithmetic checks for the additional 50 original exercises."""
import itertools
import json
import pathlib
import unittest
from fractions import Fraction

ROOT = pathlib.Path(__file__).resolve().parents[1]

class FivePlus50Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.q = {q['id']: q for q in json.loads((ROOT / 'data/five-choice.json').read_text())}

    def answer(self, qid):
        q = self.q[qid]
        return q['options'][q['answer']]['text']

    def rows(self, qid):
        return self.q[qid]['table']['rows']

    def test_rates_area_and_cycle(self):
        r = self.rows('fa21')
        rate = (r[1][1] - r[0][1]) / (r[1][0] - r[0][0])
        overall = (r[-1][1] - r[0][1]) / (r[-1][0] - r[0][0])
        self.assertGreater(rate, overall)
        self.assertIn(f'{rate:g} µmol/分', self.answer('fa21'))
        # Count scales with viewing area, not diameter.
        self.assertIn(f'{160 * (10 / 40) ** 2:g}個', self.answer('fa22'))
        r = dict(self.rows('fa23'))
        self.assertIn(f'{20 * r["分裂期"] / sum(r.values()):g}時間', self.answer('fa23'))

    def test_reverse_strand_composition(self):
        r = dict(self.rows('fa24'))
        # Construct a 100-base strand and its complement, then check the
        # measured whole-DNA GC proportion rather than averaging answers.
        strand = dict(A=r['鎖SのA'], G=r['鎖SのG'])
        strand['C'] = r['二本鎖全体のG＋C'] - strand['G']
        strand['T'] = 100 - sum(strand.values())
        complement = {base: strand[other] for base, other in zip('ATGC', 'TACG')}
        self.assertEqual(sum(strand.values()), 100)
        self.assertEqual((strand['G'] + strand['C'] + complement['G'] + complement['C']) / 2,
                         r['二本鎖全体のG＋C'])
        self.assertIn(f'鎖SのTは{strand["T"]}%', self.answer('fa24'))
        self.assertIn(f'Cは{strand["C"]}%', self.answer('fa24'))

    def test_absolute_and_relative_reduction(self):
        r = self.rows('fa28')
        vaccinated, control = (Fraction(row[2], row[1]) for row in r)
        points = (control - vaccinated) * 100
        reduction = (control - vaccinated) / control * 100
        self.assertIn(f'{points}パーセントポイント', self.answer('fa28'))
        self.assertIn(f'{reduction}%', self.q['fa28']['recall']['answer'])

    def test_matched_comparisons_and_density(self):
        r = self.rows('fa30')
        same_temperature = [row for row in r if row[0] == 25]
        effect = same_temperature[1][2] - same_temperature[0][2]
        self.assertIn(f'{effect} g', self.answer('fa30'))
        counts = [row[1] for row in self.rows('fa32')]
        density = sum(counts) / len(counts)
        self.assertIn(f'{density:g}個体/m²', self.answer('fa32'))
        self.assertIn(f'{density * 200:g}個体', self.answer('fa32'))

    def test_semiconservative_replication_and_pcr(self):
        molecules = [('heavy', 'heavy')]
        for generation in range(1, 4):
            molecules = [(strand, 'light') for molecule in molecules for strand in molecule]
            mixed = sum('heavy' in molecule and 'light' in molecule for molecule in molecules)
            if generation == 2:
                self.assertEqual(Fraction(mixed, len(molecules)), Fraction(1, 2))
                self.assertIn('1：1', self.answer('fa33'))
            if generation == 3:
                self.assertIn(str(Fraction(mixed, len(molecules))), self.q['fa33']['recall']['answer'])
        # Explicit doubling rather than deriving a number from the stored answer.
        molecules = 3
        for _ in range(5):
            molecules += molecules
        self.assertIn(f'{molecules}分子', self.answer('fa39'))
        self.assertIn(f'{molecules - 3}分子', self.q['fa39']['recall']['answer'])

    def test_dihybrid_cross_by_enumeration(self):
        gametes = list(itertools.product('Aa', 'Bb'))
        children = list(itertools.product(gametes, repeat=2))
        selected = sum('A' in (p[0], m[0]) and p[1] == m[1] == 'b' for p, m in children)
        self.assertIn(str(Fraction(selected, len(children))), self.answer('fa34'))

    def test_population_and_energy_budget(self):
        per_capita = [Fraction(row[2], row[1]) for row in self.rows('fa43')]
        self.assertTrue(all(a > b for a, b in zip(per_capita, per_capita[1:])))
        self.assertIn('小さくなり', self.answer('fa43'))
        r = dict(self.rows('fa44'))
        assimilated = r['摂食'] - r['未消化排出']
        production = assimilated - r['呼吸']
        self.assertIn(f'同化量は{assimilated} kJ', self.answer('fa44'))
        self.assertIn(f'生産量は{production} kJ', self.answer('fa44'))

if __name__ == '__main__':
    unittest.main()
