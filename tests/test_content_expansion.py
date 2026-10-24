"""Independent coverage and answer checks for the September content expansion."""
import copy, importlib.util, json, pathlib, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('thinking_expansion',ROOT/'tools/thinking.py');thinking=importlib.util.module_from_spec(spec);spec.loader.exec_module(thinking)
class ExpansionTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.words=json.loads((ROOT/'data/words.json').read_text());cls.q=json.loads((ROOT/'data/thinking.json').read_text());cls.by={q['id']:q for q in cls.q};cls.units=json.loads((ROOT/'data/curriculum.json').read_text())['units']
 def test_expansion_covers_both_subjects_and_previously_missing_units(self):
  self.assertGreaterEqual(len(self.words),850);self.assertGreaterEqual(len(self.q),60)
  for subject in ['生物基礎','生物']:self.assertGreaterEqual(sum(self.units[q['unit']]['subject']==subject for q in self.q),30)
  self.assertEqual(set(self.units)-{'P'},{q['unit'] for q in self.q})
 def test_new_items_have_recall_explanations_and_traceable_sources(self):
  sources=json.loads((ROOT/'data/content-sources.json').read_text())
  for q in self.q[30:]:
   self.assertTrue(q['recall']['prompt'].strip());self.assertTrue(q['recall']['answer'].strip());self.assertTrue(q['sources'])
   for key in q['sources']:self.assertIn(key,sources)
 def test_numeric_keys_calculated_from_materials(self):
  def chosen(id):
   q=self.by[id];return q['options'][q['answer']]['text']
  q=self.by['b02'];r=q['table']['rows'][0];self.assertEqual(chosen('b02'),f'{r[2]/r[1]*18:g} µm')
  q=self.by['b07'];r=q['table']['rows'];self.assertEqual(chosen('b07'),f'{(r[0][1]-r[1][1])/r[0][1]*100:g}%')
  q=self.by['a03'];rows=q['table']['rows'];self.assertEqual(chosen('a03'),f'{(rows[1][1]+rows[2][1])/sum(r[1] for r in rows)*100:g}%')
  q=self.by['a09'];r=q['table']['rows'][0];self.assertEqual(chosen('a09'),f'{r[0]*2**r[1]}分子')
  q=self.by['a14'];r=q['table']['rows'][0];self.assertEqual(chosen('a14'),f'{r[0]*r[1]//r[2]}個体')
  q=self.by['a15'];r=q['table']['rows'];assim=r[0][1]-r[1][1];production=assim-r[2][1];self.assertEqual((assim,production),(120,30));self.assertIn('120',q['options'][q['answers'][0]]['text']);self.assertIn('30',q['options'][q['answers'][1]]['text'])
 def test_empty_options_and_recall_are_rejected(self):
  q=copy.deepcopy(self.q[:1]);q[0]['options'][0]['text']='';self.assertTrue(thinking.compile_thinking(q,self.units)[1])
  q=copy.deepcopy(self.q[:1]);q[0]['recall']={'prompt':'理由を説明','answer':' '};self.assertTrue(thinking.compile_thinking(q,self.units)[1])
if __name__=='__main__':unittest.main()
