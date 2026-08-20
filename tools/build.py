#!/usr/bin/env python3
"""data/words.json の内容で index.html の WORDS 配列を差し替える。

用語を追加・修正したら data/words.json を編集して
    python3 tools/build.py
を実行すれば index.html に反映されます。重複した用語があればエラーで止まります。
"""
import json, re, pathlib, collections, sys

root = pathlib.Path(__file__).resolve().parent.parent
CATS = ["基礎", "細胞", "代謝", "遺伝", "生殖・発生", "恒常性", "動物の反応", "植物の反応", "生態", "進化"]

words = json.load(open(root / "data/words.json", encoding="utf-8"))

# --- 検証 ---
seen = {}
errors = []
KANA = re.compile(r"^[ぁ-んー]+$")
for w in words:
    for k in ("c", "t", "y", "m"):
        if k not in w or not str(w[k]).strip():
            errors.append(f"項目が足りません: {w}")
    if w.get("c") not in CATS:
        errors.append(f"未知の分類 '{w.get('c')}': {w.get('t')}")
    if not KANA.match(w.get("y", "")):
        errors.append(f"よみがながひらがなではありません: {w.get('t')} / {w.get('y')}")
    if w["t"] in seen:
        errors.append(f"重複した用語: {w['t']}（{seen[w['t']]} と {w['c']}）")
    seen[w["t"]] = w["c"]
if errors:
    print("\n".join(errors), file=sys.stderr)
    sys.exit(1)

# --- 分類順に並べる ---
order = {c: i for i, c in enumerate(CATS)}
words.sort(key=lambda w: order[w["c"]])

j = lambda v: json.dumps(v, ensure_ascii=False)
arr = "[\n" + ",\n".join(
    f'  {{c:{j(w["c"])}, t:{j(w["t"])}, y:{j(w["y"])}, m:{j(w["m"])}}}' for w in words
) + "\n]"

path = root / "index.html"
html = path.read_text(encoding="utf-8")
new, n = re.subn(r"const WORDS = \[.*?\n\];", "const WORDS = " + arr + ";", html, count=1, flags=re.S)
if n != 1:
    print("index.html の WORDS 配列が見つかりませんでした", file=sys.stderr)
    sys.exit(1)
path.write_text(new, encoding="utf-8")

print(f"{len(words)} 語を書き込みました（重複なし）")
for c in CATS:
    print(f"  {c}: {sum(1 for w in words if w['c'] == c)}")
