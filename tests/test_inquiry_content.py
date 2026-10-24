import json,pathlib,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class InquiryTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.all=json.loads((ROOT/'data/thinking.json').read_text());cls.q={q['id']:q for q in cls.all};cls.new=[q for q in cls.all if q.get('collection')=='inquiry-2026-09']
 def chosen(self,id):
  q=self.q[id];return q['options'][q['answer']]['text']
 def test_new_set(self):
  self.assertEqual(len(self.new),24);self.assertEqual(sum(q['unit'].startswith('B') for q in self.new),12)
  for q in self.new:self.assertTrue(q['recall']['prompt'].strip());self.assertTrue(q['recall']['answer'].strip());self.assertTrue(all(o['why'].strip() for o in q['options']))
 def test_dilution_and_weighted_density(self):
  rows=self.q['b24']['table']['rows'];density=sum(r[1] for r in rows)/len(rows)/.1*5;self.assertEqual(self.chosen('b24'),f'{density:g}個体')
  rows=self.q['b32']['table']['rows'];density=sum(r[2] for r in rows)/sum(r[1] for r in rows);self.assertEqual(self.chosen('b32'),f'{density:g}個体/m²')
 def test_complement_and_flows(self):
  rows=dict(self.q['b26']['table']['rows']);self.assertEqual(self.chosen('b26'),f"{(rows['G']+rows['C'])/2:g}%")
  rows=self.q['b28']['table']['rows'];self.assertEqual(self.chosen('b28'),f'{rows[1][1]-rows[0][1]} mg/分')
  self.assertEqual(self.chosen('b30'),f'{5*.4/.44:.2f} L')
 def test_mixed_respiration(self):
  sugar=(82-.7*100)/(1-.7);self.assertAlmostEqual(sugar,40);self.assertEqual(self.chosen('a35'),f'{sugar:.0f}%')
 def test_sex_linked_cross(self):
  daughters=[m+p for m in ['R','r'] for p in ['r']];sons=[m+'Y' for m in ['R','r']]
  self.assertEqual(daughters.count('rr')/len(daughters),.5);self.assertEqual(sons.count('rY')/len(sons),.5);self.assertEqual(self.q['a37']['answers'],[0,1])
 def test_nitrogen_conservation(self):
  rows=self.q['a43']['table']['rows'];self.assertEqual([r[1]+r[2] for r in rows],[50,50,50]);self.assertEqual(rows[0][1]-rows[1][1],rows[1][2]-rows[0][2]);self.assertEqual(self.q['a43']['answers'],[0,1])
if __name__=='__main__':unittest.main()
