# -*- coding: utf-8 -*-
"""Refresh the artwork preview from the same manifest and packed images used by the game."""
import html,json,pathlib,re
ROOT=pathlib.Path(__file__).resolve().parent.parent
folder=ROOT/'assets/biome-production-20261023'
p=folder/'index.html';old=p.read_text();css=re.search(r'<style>(.*?)</style>',old,re.S).group(1)
m=json.loads((folder/'manifest.json').read_text());specs=m['specs'];e=html.escape
counts={k:sum(s['category']==k for s in specs) for k in ['植物','動物','観察生物','環境']}
frames=sum(s['columns']*s['rows'] for s in specs)
intro=f'''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>育つバイオーム｜{len(specs)-counts['環境']}種類の生物</title><style>{css}.portrait{{max-width:340px}}.launch{{display:inline-block;padding:12px 20px;border-radius:30px;background:#315e43;color:white;text-decoration:none}}</style></head><body><div class="intro"><span class="eyebrow">BIOME ASSET COLLECTION</span><h1>出会って、育てる。<br>景色に、いのちが増えていく。</h1><p>植物・動物・顕微鏡で観察する生物の画像を確認する制作ギャラリーです。ゲームでは未獲得の種類は隠れています。</p><a class="launch" href="../../index.html">学習アプリを開く</a><div class="totals"><div><strong>{len(specs)-counts['環境']}</strong><span>生物の種類</span></div><div><strong>{counts['環境']}</strong><span>環境の種類</span></div><div><strong>{frames}</strong><span>姿・成長・変化のコマ</span></div></div><div class="toolbar"><button data-filter="すべて" aria-pressed="true">すべて</button>'''
intro+=''.join(f'<button data-filter="{k}" aria-pressed="false">{k} {v}</button>' for k,v in counts.items())
intro+='<input type="search" id="search" aria-label="名前で検索" placeholder="名前で検索"></div><p id="count" role="status"></p></div><main>'
sections=[]
for s in specs:
 cols,rows=s['columns'],s['rows'];env=s['category']=='環境';portrait=s.get('artMode')=='portrait';url='../biome-runtime/'+s['id']+'.webp'
 section=f'<section class="card" id="{e(s["id"])}" data-category="{e(s["category"])}" data-search="{e(s["title"])}" data-frames="{cols*rows}"><header><div><div class="tag">{e(s["category"])}</div><h2>{e(s["title"])}</h2></div><a href="{e(url)}" target="_blank" rel="noopener">画像を見る</a></header><div class="frames {"landscapes" if env else "portrait" if portrait else ""}" style="{ "grid-template-columns:1fr" if portrait else ""}">'
 for i,stage in enumerate(s['stages']):
  x=(i%cols)*100/max(1,cols-1);y=(i//cols)*100/max(1,rows-1);ratio=s.get('frameAspectRatio',1) if env else 1
  section+=f'<figure><div class="frame" role="img" aria-label="{e(s["title"]+"・"+stage)}" style="background-image:url({url});background-size:{cols*100}% {rows*100}%;background-position:{x}% {y}%;aspect-ratio:{ratio}"></div><figcaption>{e(stage)}</figcaption></figure>'
 sections.append(section+'</div></section>')
script=re.search(r'<script>(.*?)</script>',old,re.S).group(1)
footer='<footer>画像はゲーム用の生成イラストです。種類の識別に使う精密な図版ではありません。各段階は見やすさのため異なる倍率で描いています。観察生物の学習段階は実際の発生段階とは異なります。<p><a href="manifest.json">画像一覧・生成指示・制作記録</a></p></footer>'
p.write_text(intro+''.join(sections)+'</main>'+footer+'<script>'+script+';filter();</script></body></html>')
print(f'Gallery: {len(specs)-counts["環境"]} organisms / {frames} frames')
