import json,pathlib,unittest,importlib.util,copy
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('thinking',ROOT/'tools/thinking.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class FiveTests(unittest.TestCase):
 def setUp(self):self.q=json.loads((ROOT/'data/five-choice.json').read_text());self.units=json.loads((ROOT/'data/curriculum.json').read_text())['units']
 def test_structure(self):
  self.assertEqual(len(self.q),170);self.assertEqual(sum(q['family']=='knowledge' for q in self.q),90)
  for subject,n in [('生物基礎',73),('生物',97)]:self.assertEqual(sum(self.units[q['unit']]['subject']==subject for q in self.q),n)
  self.assertEqual(m.compile_thinking(self.q,self.units)[1],[])
  for q in self.q:self.assertEqual(len(q['options']),5);self.assertEqual(len(q.get('answers',[q['answer']])),1)
 def test_invalid_five_fields(self):
  for key,value in [('family','unknown'),('direction','both')]:
   q=copy.deepcopy(self.q[:1]);q[0][key]=value;self.assertTrue(m.compile_thinking(q,self.units)[1])
  q=copy.deepcopy(self.q[:1]);q[0]['answers']=[0,1];self.assertTrue(m.compile_thinking(q,self.units)[1])
 def test_calculations(self):
  q={q['id']:q for q in self.q};r=dict(q['fa01']['table']['rows']);self.assertIn(f"{(r['G']+r['C'])/2:g}%",q['fa01']['options'][0]['text'])
  r=q['fa02']['table']['rows'];self.assertEqual(r[0][1]*r[0][2],r[1][1]*r[1][2]);r=q['fa05']['table']['rows'];self.assertIn(str(sum(x[1] for x in r)),q['fa05']['options'][0]['text'])
  r=q['fa06']['table']['rows'];self.assertIn(f'{sum(x[1] for x in r[2:])/sum(x[1] for x in r)*100:g}%',q['fa06']['options'][0]['text'])
if __name__=='__main__':unittest.main()
