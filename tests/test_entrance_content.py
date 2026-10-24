import json,pathlib,unittest
from fractions import Fraction
ROOT=pathlib.Path(__file__).resolve().parents[1]
class EntranceContentTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.all=json.loads((ROOT/'data/thinking.json').read_text());cls.q={q['id']:q for q in cls.all};cls.new=[q for q in cls.all if q.get('collection')=='entrance-2026-09']
 def chosen(self,id):
  q=self.q[id];return q['options'][q['answer']]['text']
 def test_collection_and_feedback(self):
  self.assertEqual(len(self.new),24);self.assertEqual(sum(q['unit'].startswith('B') for q in self.new),8)
  for q in self.new:
   self.assertTrue(q['recall']['prompt']);self.assertTrue(q['recall']['answer']);self.assertIn('exam-policy-r9',q['sources'])
   self.assertTrue(all(o['why'] for o in q['options']))
 def test_three_point_mapping_from_all_eight_classes(self):
  q=self.q['a16'];counts=dict(q['table']['rows']);parents=sorted(counts,key=counts.get,reverse=True)[:2];double=sorted(counts,key=counts.get)[:2]
  changed=[i for i in range(3) if all(any(sum(a!=b for a,b in zip(d,p))==1 and d[i]!=p[i] for p in parents) for d in double)]
  self.assertEqual(changed,[1]);recomb=sum(n for s,n in counts.items() if s[:2] not in {p[:2] for p in parents})/sum(counts.values())*100
  self.assertEqual(self.chosen('a16'),f'中央はB、A–B間は{recomb:g}%。')
 def test_conditional_cross_and_selection(self):
  first=[x+y for x in 'Aa' for y in 'Aa'];selected=[g for g in first if 'A' in g];prob=sum(Fraction(g.count('a'),2) for g in selected)/len(selected)
  self.assertEqual(self.chosen('a17'),str(prob))
  rows=self.q['a18']['table']['rows'];survivors=[Fraction(str(n))*Fraction(str(rate)) for _,n,rate in rows];p=(survivors[1]+2*survivors[2])/(2*sum(survivors));self.assertEqual(str(p),'8/23');self.assertTrue(self.chosen('a18').startswith(str(p)))
 def test_respiration_and_latency(self):
  rows=self.q['a21']['table']['rows'];ratio=sum(rows[1][1:])/sum(rows[0][1:]);self.assertEqual(self.chosen('a21'),f'{ratio:g}倍')
  rows=self.q['a27']['table']['rows'];v=(rows[1][1]-rows[0][1])/(rows[1][3]-rows[0][3]);delay=rows[0][3]-sum(rows[0][1:3])/v;self.assertEqual(self.chosen('a27'),f'{delay:g} ms')
 def test_mass_and_volume(self):
  rows=self.q['b23']['materials'][0]['table']['rows'];self.assertEqual([v*c for _,v,c in rows],[600,600])
  rows=self.q['a31']['table']['rows'];self.assertEqual(rows[3][1]/rows[1][1],20);self.assertLess(rows[3][1]*rows[3][2],rows[2][1]*rows[2][2]);self.assertEqual(self.q['a31']['answers'],[0,1])
if __name__=='__main__':unittest.main()
