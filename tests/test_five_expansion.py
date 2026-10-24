import json,pathlib,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class FiveExpansionTests(unittest.TestCase):
 def setUp(self):self.q={q['id']:q for q in json.loads((ROOT/'data/five-choice.json').read_text())}
 def test_microscope_and_total_dna(self):
  q=self.q['fa09'];r=q['table']['rows'][0];self.assertIn(f'{r[2]/r[1]*24:g} µm',q['options'][q['answer']]['text'])
  q=self.q['fa11'];r=q['table']['rows'];self.assertEqual(r[1][1]*r[1][2]/(r[0][1]*r[0][2]),2)
 def test_effect_and_substrate(self):
  q=self.q['fa14'];r=q['table']['rows'];effect=(r[0][2]-r[0][1])-(r[1][2]-r[1][1]);self.assertIn(str(effect),q['options'][q['answer']]['text'])
  q=self.q['fa16'];r=q['table']['rows'];fraction=(r[1][1]-.7*r[0][1])/(1-.7)/r[0][1];self.assertAlmostEqual(fraction,.6);self.assertIn('60%',q['options'][q['answer']]['text'])
 def test_selection_and_speed(self):
  q=self.q['fa18'];r=q['table']['rows'];n=[x[1]*x[2] for x in r];self.assertAlmostEqual((n[1]+2*n[2])/(2*sum(n)),1/3);self.assertIn('1/3',q['options'][q['answer']]['text'])
  q=self.q['fa19'];r=q['table']['rows'];v=(r[1][1]-r[0][1])/(r[1][2]-r[0][2]);self.assertIn(f'{v:g} m/s',q['options'][q['answer']]['text'])
 def test_mark_recapture(self):
  q=self.q['fa20'];r=q['table']['rows'][0];self.assertIn(f'{r[0]*r[1]/r[2]:g}',q['options'][q['answer']]['text'])
if __name__=='__main__':unittest.main()
