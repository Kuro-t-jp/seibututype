import copy, importlib.util, json, pathlib, unittest, xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('thinking',ROOT/'tools/thinking.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class ThinkingTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.q=json.loads((ROOT/'data/thinking.json').read_text());cls.by={q['id']:q for q in cls.q};cls.units=json.loads((ROOT/'data/curriculum.json').read_text())['units']
 def test_structure_and_format_coverage(self):
  compiled,errors=module.compile_thinking(self.q,self.units);self.assertEqual(errors,[])
  self.assertEqual(len(compiled),144)
  for kind in ['graph','table','text','mixed']:self.assertGreaterEqual(sum(q['kind']==kind for q in compiled),6)
  for subject,n in [('生物',82),('生物基礎',62)]:self.assertEqual(sum(self.units[q['unit']]['subject']==subject for q in compiled),n)
 def test_independent_numeric_answers(self):
  q=self.by
  self.assertEqual(q['g1']['graph']['series'][0]['values'][3]-q['g1']['graph']['series'][0]['values'][0],8)
  g=q['g3']['graph'];drops=[s['values'][1]-s['values'][-1] for s in g['series']];self.assertEqual(drops,[70,20])
  g=q['g4']['graph'];days=[next(d for d,v in zip(g['x'],s['values']) if v>=10) for s in g['series']];self.assertEqual(days[0]-days[1],4)
  g=q['g5']['graph'];v=g['series'][0]['values'];slopes=[(v[i+1]-v[i])/(g['x'][i+1]-g['x'][i]) for i in range(4)];self.assertEqual(slopes.index(max(slopes)),1)
  self.assertEqual((100-20-20)/2,30)
  row=q['t2']['table']['rows'][0][1:];self.assertEqual((2*row[0]+row[1])/(2*sum(row)),.6)
  rows=q['t3']['table']['rows'];self.assertEqual(rows[0][1]-rows[1][1],650)
  rows=q['t4']['table']['rows'];self.assertEqual(min(rows,key=lambda r:abs(r[2]-r[1]))[0],.3)
  rows=q['t5']['table']['rows'];self.assertEqual([sum(r[1:]) for r in rows],[100,100])
 def test_answer_key_matches_calculations(self):
  q=self.by
  def chosen(id):return q[id]['options'][q[id]['answer']]['text']
  v=q['g1']['graph']['series'][0]['values'];self.assertEqual(chosen('g1'),str(v[3]-v[0]))
  row=q['t1']['table']['rows'][0];self.assertEqual(chosen('t1'),f"{(100-row[1]-row[2])//2}%")
  row=q['t2']['table']['rows'][0][1:];self.assertEqual(chosen('t2'),f"{(2*row[0]+row[1])/(2*sum(row)):.2f}")
  rows=q['t3']['table']['rows'];self.assertEqual(chosen('t3'),f"{rows[0][1]-rows[1][1]} g/m²/年")
  rows=q['t4']['table']['rows'];self.assertEqual(chosen('t4'),f"{min(rows,key=lambda r:abs(r[2]-r[1]))[0]} mol/L")
 def test_svg_points_match_data_independently(self):
  compiled,errors=module.compile_thinking(self.q,self.units);self.assertFalse(errors)
  for q in compiled+[m for q in compiled for m in q.get('materials',[])]:
   if 'graph' not in q:continue
   root=ET.fromstring(q['graphSvg']);circles=root.findall('.//{http://www.w3.org/2000/svg}circle');g=q['graph'];values=[v for s in g['series'] for v in s['values']]
   self.assertEqual(len(circles),len(values))
   # Equal value changes must give equal pixel differences; x spans use actual elapsed time.
   for i,s in enumerate(g['series']):
    pts=circles[i*len(g['x']):(i+1)*len(g['x'])]
    self.assertAlmostEqual(float(pts[-1].attrib['cx'])-float(pts[0].attrib['cx']),520)
    for j in range(len(pts)-1):
     self.assertAlmostEqual((float(pts[j+1].attrib['cx'])-float(pts[j].attrib['cx']))/520,(g['x'][j+1]-g['x'][j])/(g['x'][-1]-g['x'][0]),places=7)
 def test_advanced_calculations_and_keys(self):
  q=self.by
  self.assertEqual([q['x1']['materials'][0]['table']['rows'][i][1]*v for i,v in enumerate([.25,.4])],[60,48])
  g=q['x2']['materials'][0]['graph'];self.assertEqual([(s['values'][0]-s['values'][1])/2 for s in g['series']],[20,10])
  self.assertEqual([24/800,12/200],[.03,.06])
  rows=q['x7']['materials'][0]['table']['rows'];hours=q['x7']['materials'][1]['table']['rows']
  net=sum(row[1]*hours[i][1] for i,row in enumerate(rows));gross=sum((row[1]-rows[2][1])*hours[i][1] for i,row in enumerate(rows[:2]))
  self.assertEqual((gross,net),(48,24));self.assertIn('48 mg、正味24 mg',q['x7']['options'][q['x7']['answer']]['text'])
  rows=q['x12']['materials'][0]['table']['rows'];p=sum(n*f for _,n,f in rows)/sum(n for _,n,f in rows);self.assertEqual((p,2*p*(1-p)),(.5,.5))
  self.assertEqual(q['x10']['answers'],[0,1]);self.assertEqual(q['x10']['materials'][0]['table']['rows'],[['なし','なし'],['Pのみ','なし'],['Qのみ','なし'],['PとQ','あり']])
 def test_nested_materials_and_multiple_answers_reject_corruption(self):
  q=copy.deepcopy(self.q);next(x for x in q if x['id']=='x2')['materials'][0]['graph']['x']=[0,0,6];self.assertTrue(module.compile_thinking(q,self.units)[1])
  q=copy.deepcopy(self.q);next(x for x in q if x['id']=='x1')['answers']=[0,0];self.assertTrue(module.compile_thinking(q,self.units)[1])
  q=copy.deepcopy(self.q);next(x for x in q if x['id']=='x1')['answers']=[0,6];self.assertTrue(module.compile_thinking(q,self.units)[1])
 def test_bad_graph_and_table_fail_validation(self):
  q=copy.deepcopy(self.q);q[0]['graph']['series'][0]['values'].pop();self.assertTrue(module.compile_thinking(q,self.units)[1])
  q=copy.deepcopy(self.q);next(x for x in q if x['kind']=='table')['table']['rows'][0].pop();self.assertTrue(module.compile_thinking(q,self.units)[1])
if __name__=='__main__':unittest.main()
