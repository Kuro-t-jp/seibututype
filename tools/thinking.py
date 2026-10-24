"""Validate original exercises and generate exact, accessible line graphs."""
import copy
import html
import math

def render_graph(g):
    xs=g['x'];values=[v for s in g['series'] for v in s['values']]
    step=g['yStep']
    low=math.floor(min(0,min(values))/step)*step;high=math.ceil(max(values)/step)*step
    if high==low: high=low+1
    def X(x):return 70+(x-xs[0])/(xs[-1]-xs[0])*520
    def Y(y):return 300-(y-low)/(high-low)*220
    esc=lambda x:html.escape(str(x),quote=True)
    pieces=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 390" role="img" aria-label="'+esc(g['yLabel']+'と'+g['xLabel'])+'"><g font-family="sans-serif" font-size="14" fill="#223e34">',f'<text x="70" y="23">{esc(g["yLabel"])}</text>']
    for i in range(round((high-low)/step)+1):
        v=low+step*i;y=Y(v)
        pieces.append(f'<line x1="70" y1="{y}" x2="590" y2="{y}" stroke="#dce3d7"/><text x="60" y="{y+5}" text-anchor="end">{v:g}</text>')
    pieces.append('<path d="M70 80V300H590" fill="none" stroke="#4c6155"/>')
    for x in xs:pieces.append(f'<text x="{X(x)}" y="326" text-anchor="middle">{esc(x)}</text>')
    for i,s in enumerate(g['series']):
        color=['#184e3d','#a65b17'][i];dash='' if i==0 else ' stroke-dasharray="7 5"'
        pieces.append(f'<line x1="{70+i*190}" y1="50" x2="{100+i*190}" y2="50" stroke="{color}" stroke-width="3"{dash}/><text x="{109+i*190}" y="55">{esc(s["name"])}</text>')
        points=' '.join(f'{X(x):.6f},{Y(v):.6f}' for x,v in zip(xs,s['values']))
        pieces.append(f'<polyline points="{points}" fill="none" stroke="{color}" stroke-width="3"{dash}/>')
        for x,v in zip(xs,s['values']):
            cx,cy=X(x),Y(v)
            # Independent inverse-coordinate verification against the source data.
            assert abs(xs[0]+(cx-70)*(xs[-1]-xs[0])/520-x)<1e-8
            assert abs(low+(300-cy)*(high-low)/220-v)<1e-8
            pieces.append(f'<circle cx="{cx:.6f}" cy="{cy:.6f}" r="4" fill="{color}"/>')
    pieces.append(f'<text x="330" y="365" text-anchor="middle">{esc(g["xLabel"])}</text></g></svg>')
    return ''.join(pieces)

def compile_thinking(questions,units):
    errors=[];ids=set();compiled=copy.deepcopy(questions)
    for q in compiled:
        label=q.get('id','?')
        for key in ['id','kind','unit','title','skill','passage','question']:
            if not isinstance(q.get(key),str) or not q[key].strip():errors.append(f'{label}: {key} が不正')
        if label in ids:errors.append(f'{label}: ID重複')
        ids.add(label)
        if q.get('unit') not in units:errors.append(f'{label}: 未知の単元')
        opts=q.get('options',[])
        if len(opts) not in [4,5,6] or len({o.get('text') for o in opts})!=len(opts) or any(not isinstance(o.get(k),str) or not o[k].strip() for o in opts for k in ['text','why']):errors.append(f'{label}: 選択肢・解説不正')
        answers=q.get('answers',[q.get('answer')])
        if not answers or len(set(answers))!=len(answers) or any(type(a) is not int or not 0<=a<len(opts) for a in answers) or len(answers)>2 or q.get('answer')!=answers[0]:errors.append(f'{label}: 正解不正')
        if len(opts)==5:
            if len(answers)!=1 or q.get('family') not in ['knowledge','application'] or q.get('direction') not in ['correct','incorrect']:errors.append(f'{label}: 5択の分類・設問方向・正解数不正')
        if q.get('level') not in ['foundation','standard','challenge']:errors.append(f'{label}: 難度不正')
        if q.get('competency') not in ['quantify','compare','integrate','hypothesis','evidence']:errors.append(f'{label}: 思考分類不正')
        if not isinstance(q.get('steps'),list) or not q['steps'] or any(not isinstance(s,str) or not s.strip() for s in q['steps']):errors.append(f'{label}: 読み取り手順なし')
        if 'recall' in q and (not isinstance(q['recall'],dict) or any(not isinstance(q['recall'].get(k),str) or not q['recall'][k].strip() for k in ['prompt','answer'])):errors.append(f'{label}: 説明問題・解答例不正')
        if q.get('materials'):
            for i,m in enumerate(q['materials']):
                kind='graph' if 'graph' in m else 'table' if 'table' in m else 'text'
                if not m.get('title'):errors.append(f'{label}: 資料の見出しなし')
                child={**q,**m,'id':f'{label}-material-{i}','kind':kind}
                child.pop('materials',None)
                parts,issues=compile_thinking([child],units);errors.extend(issues)
                if 'graphSvg' in parts[0]:m['graphSvg']=parts[0]['graphSvg']
            if q.get('kind') not in ['mixed','table','graph','text']:errors.append(f'{label}: 未知の形式')
            continue
        if q.get('kind')=='graph':
            g=q.get('graph',{});xs=g.get('x',[]);series=g.get('series',[])
            finite=lambda n:type(n) in [int,float] and math.isfinite(n)
            valid=finite(g.get('yStep')) and g['yStep']>0 and len(xs)>=2 and all(finite(x) for x in xs) and all(a<b for a,b in zip(xs,xs[1:])) and 1<=len(series)<=2 and all(len(s['values'])==len(xs) and all(finite(v) for v in s['values']) for s in series) and g.get('xLabel') and g.get('yLabel')
            if not valid:errors.append(f'{label}: グラフの軸・数値不正')
            else:q['graphSvg']=render_graph(g)
        elif q.get('kind')=='table':
            t=q.get('table',{});headers=t.get('headers',[])
            if not headers or not t.get('rows') or any(len(r)!=len(headers) for r in t['rows']):errors.append(f'{label}: 表の列数不正')
        elif q.get('kind')!='text':errors.append(f'{label}: 未知の形式')
    return compiled,errors
