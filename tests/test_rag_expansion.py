"""RAG edition: provenance, coverage, and independently recomputed answer keys."""
import collections
import json
from pathlib import Path
import unittest
ROOT = Path(__file__).resolve().parents[1]
def read(name): return json.loads((ROOT/'data'/name).read_text())
class RagExpansionTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.manifest=read('rag-expansion-20261030.json')
  cls.sources=read('content-sources.json')
  cls.units=read('curriculum.json')['units']
  cls.banks={b:read(f) for b,f in [('five','five-choice.json'),('thinking','thinking.json')]}
  cls.new={b:[q for q in qs if q.get('sourcePack')=='rag-20261030'] for b,qs in cls.banks.items()}
  cls.q={q['id']:q for qs in cls.new.values() for q in qs}
 def answer(self,id):
  q=self.q[id];return q['options'][q['answer']]['text']
 def test_coverage_and_unique_ids(self):
  all_ids=[q['id'] for qs in self.banks.values() for q in qs]
  self.assertEqual(len(all_ids),len(set(all_ids)))
  for bank,count,per_unit in [('five',72,4),('thinking',36,2)]:
   qs=self.new[bank];self.assertEqual(len(qs),count)
   self.assertEqual([q['id'] for q in qs],self.manifest['ids'][bank])
   self.assertEqual(collections.Counter(q['unit'] for q in qs),{u:per_unit for u in self.units if u!='P'})
   for q in qs:
    self.assertEqual(q['collection'],'rag')
    self.assertEqual(len(q['options']),5 if bank=='five' else 4)
    self.assertEqual(len(set(o['text'] for o in q['options'])),len(q['options']))
    self.assertTrue(all(o['why'] for o in q['options']))
    self.assertTrue(q['recall']['answer']);self.assertGreaterEqual(len(q['steps']),2)
  for u in self.units:
   if u=='P':continue
   self.assertEqual(collections.Counter(q['family'] for q in self.new['five'] if q['unit']==u),{'knowledge':2,'application':2})
 def test_traceable_sources_without_local_paths(self):
  used=set()
  for q in self.q.values():
   self.assertTrue(q['sources'])
   for sid in q['sources']:
    s=self.sources[sid];used.add(s['evidenceId'])
    for field in ['title','location','sectionTitle','evidenceId']:self.assertTrue(s[field])
    for field in ['sourceSha256','contentSha256']:self.assertRegex(s[field],r'^[0-9a-f]{64}$')
    self.assertNotIn('/Volumes/',json.dumps(s));self.assertNotIn('/Users/',json.dumps(s))
  self.assertEqual(sorted(used),self.manifest['evidenceIds'])
 def test_numeric_answers(self):
  self.assertEqual(self.answer('rag26f008'),f'{2**3}個')
  self.assertEqual(self.answer('rag26f032'),str((2*20+50)/(2*100)))
  self.assertEqual(self.answer('rag26f047'),'1/2');self.assertEqual(2/(2**2),.5)
  self.assertEqual(self.answer('rag26f055'),f'{3*2**4}分子')
  self.assertEqual(self.answer('rag26f067'),f'{100+30-18}個体')
  g=self.q['rag26t002']['graph'];speeds=[(s['values'][-1]-s['values'][0])/(g['x'][-1]-g['x'][0]) for s in g['series']]
  self.assertEqual(self.answer('rag26t002'),f'{speeds[0]/speeds[1]:g}倍')
  self.assertEqual((100-99)/(100-98),.5);self.assertEqual(self.answer('rag26t005'),'1/2')
  self.assertEqual(self.answer('rag26t015'),f'{2*.8*.2:.2f}')
  self.assertEqual(self.answer('rag26t018'),f'{12//2*100}万年')
  self.assertEqual(self.answer('rag26t022'),f'{(5*3+3)//3}分子')
  self.assertEqual(self.answer('rag26t023'),f'{120+90+150}塩基')
  self.assertEqual(self.answer('rag26t025'),f'{32//4}分の1')
  self.assertEqual(self.answer('rag26t029'),f'{.12/(4/1000):g} m/s')
  rows=self.q['rag26t035']['table']['rows'];ratio=(rows[1][1]*rows[1][2])/(rows[0][1]*rows[0][2])
  self.assertEqual(self.answer('rag26t035'),f'{ratio:g}倍')
 def test_data_supports_single_conclusion(self):
  rows=self.q['rag26f056']['table']['rows']
  self.assertLess(rows[0][2],rows[2][2]);self.assertLess(rows[2][2],rows[1][2])
  self.assertIn('500塩基対より長く、1000塩基対より短い',self.answer('rag26f056'))
  rows=self.q['rag26t012']['table']['rows'];self.assertEqual([sum(r[1:]) for r in rows],[60,60])
  self.assertEqual([sum(v>0 for v in r[1:]) for r in rows],[3,1])
  self.assertEqual(self.answer('rag26t031'),'10時間＜L≦12時間')
  self.assertGreater(50*40/5,50*40/10);self.assertEqual(self.answer('rag26t033'),'過大になる。')
if __name__=='__main__':unittest.main()
