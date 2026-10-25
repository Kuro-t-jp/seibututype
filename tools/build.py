#!/usr/bin/env python3
"""用語・別名・単元を検証し、単体HTMLの出題データを更新する。"""
import base64
import collections
import json
import pathlib
import re
import sys
import unicodedata
import importlib.util
_quiz_spec = importlib.util.spec_from_file_location("quiz_choices", pathlib.Path(__file__).with_name("quiz_choices.py"))
_quiz_module = importlib.util.module_from_spec(_quiz_spec)
_quiz_spec.loader.exec_module(_quiz_module)
compile_choices = _quiz_module.compile_choices
_thinking_spec = importlib.util.spec_from_file_location("thinking", pathlib.Path(__file__).with_name("thinking.py"))
_thinking_module = importlib.util.module_from_spec(_thinking_spec)
_thinking_spec.loader.exec_module(_thinking_module)
compile_thinking = _thinking_module.compile_thinking

ROOT = pathlib.Path(__file__).resolve().parent.parent
CATS = ['基礎', '細胞', '代謝', '遺伝', '生殖・発生', '恒常性', '動物の反応', '植物の反応', '生態', '進化']
KANA = re.compile(r'^[ぁ-んー]+$')


def validate(words, units):
    errors, names, meanings = [], {}, {}
    if not isinstance(words, list) or not words:
        return ['用語データは空でない配列にしてください']
    for i, w in enumerate(words):
        if not isinstance(w, dict):
            errors.append(f'{i}: 用語データはオブジェクトにしてください')
            continue
        label = w.get('t', f'行{i}')
        for key in ('c', 't', 'y', 'm', 'unit'):
            if not isinstance(w.get(key), str) or not w[key].strip():
                errors.append(f'{label}: 項目 {key} が空、または文字列ではありません')
        if w.get('c') not in CATS:
            errors.append(f'{label}: 未知の分類')
        if not isinstance(w.get('unit'), str) or w['unit'] not in units:
            errors.append(f'{label}: 学習指導要領の単元対応がありません')
        aliases = w.get('aliases', [])
        if not isinstance(aliases, list):
            errors.append(f'{label}: aliases は配列にしてください')
            aliases = []
        for item in [w] + aliases:
            if not isinstance(item, dict):
                errors.append(f'{label}: 別名は t と y をもつオブジェクトにしてください')
                continue
            t, y = item.get('t'), item.get('y')
            if not isinstance(t, str) or not t.strip():
                errors.append(f'{label}: 用語・別名がありません')
                continue
            if not isinstance(y, str) or not KANA.fullmatch(y):
                errors.append(f'{label}: 読みがひらがなではありません: {y}')
            norm = unicodedata.normalize('NFKC', t).casefold().strip()
            if norm in names:
                errors.append(f'用語・別名の重複: {t} ({names[norm]} / {label})')
            names[norm] = label
        meaning = w.get('m')
        if isinstance(meaning, str):
            if meaning in meanings:
                errors.append(f'同一の問題文: {label} / {meanings[meaning]}')
            meanings[meaning] = label
    main_terms = {w.get('t') for w in words if isinstance(w, dict) and isinstance(w.get('t'), str)}
    for w in words:
        if not isinstance(w, dict):
            continue
        avoid = w.get('avoid_with', [])
        if not isinstance(avoid, list) or any(not isinstance(t, str) or t not in main_terms or t == w.get('t') for t in avoid):
            errors.append(f"{w.get('t')}: 選択肢の除外対象が不正です")
    return errors


def main():
    words = json.loads((ROOT / 'data/words.json').read_text(encoding='utf-8'))
    curriculum = json.loads((ROOT / 'data/curriculum.json').read_text(encoding='utf-8'))
    errors = validate(words, curriculum['units'])
    quiz_config = json.loads((ROOT / 'data/quiz-choices.json').read_text(encoding='utf-8'))
    quiz_choices, quiz_errors = compile_choices(words, quiz_config)
    errors.extend(quiz_errors)
    thinking, thinking_errors = compile_thinking(json.loads((ROOT / 'data/thinking.json').read_text()), curriculum['units'])
    errors.extend(thinking_errors)
    five, five_errors = compile_thinking(json.loads((ROOT / 'data/five-choice.json').read_text()), curriculum['units'])
    errors.extend(five_errors)
    if any(len(q['options']) != 5 for q in five): errors.append('5択モードに5個以外の選択肢があります')
    if len({q['id'] for q in thinking+five}) != len(thinking+five): errors.append('モード間で問題IDが重複しています')
    sources = json.loads((ROOT / 'data/content-sources.json').read_text())
    for q in thinking+five:
        if 'recall' in q and not q.get('sources'): errors.append(f"{q['id']}: 出典なし")
        for source in q.get('sources', []):
            if source not in sources: errors.append(f"{q['id']}: 未知の出典 {source}")
    if errors:
        print('\n'.join(errors), file=sys.stderr)
        return 1
    if '--check' in sys.argv:
        print(f'{len(words)}語: 用語・別名・読み・問題文の重複・単元対応を検証しました')
        print(f'{len(quiz_choices)}問: 比較用の誤答候補を検証しました')
        print(f'{len(thinking)}問: 思考問題の構造・解説・出典参照を検証しました')
        print(f'{len(five)}問: 5択問題の分類・正解数・出典を検証しました')
        return 0
    words.sort(key=lambda w: CATS.index(w['c']))
    arr = '[\n' + ',\n'.join('  ' + json.dumps(w, ensure_ascii=False) for w in words) + '\n]'
    path = ROOT / 'index.html'
    html = path.read_text(encoding='utf-8')
    html, n = re.subn(r'const WORDS = \[.*?\n\];', lambda _: 'const WORDS = ' + arr + ';', html, count=1, flags=re.S)
    if n != 1:
        print('index.html の WORDS 配列が見つかりません', file=sys.stderr)
        return 1
    quiz_statement = 'const QUIZ_CHOICES = ' + json.dumps(quiz_choices, ensure_ascii=False) + ';'
    html, quiz_n = re.subn(r'const QUIZ_CHOICES = [^\n]+;', lambda _: quiz_statement, html, count=1)
    if quiz_n != 1:
        print('QUIZ_CHOICES が見つかりません', file=sys.stderr)
        return 1
    statement = 'const CURRICULUM = ' + json.dumps(curriculum['units'], ensure_ascii=False) + ';'
    html, n = re.subn(r'const CURRICULUM = [^\n]+;', lambda _: statement, html, count=1)
    if n != 1:
        print('index.html の CURRICULUM が見つかりません', file=sys.stderr)
        return 1
    html = re.sub(r'(id="thinkingCount">共通テスト対策 · オリジナル)\d+問', lambda m: m[1] + str(len(thinking)) + '問', html)
    for pattern in [r'(id="totalWords">)\d+', r'(id="studyCount">0 / )\d+', r'(id="studyBar" max=")\d+']:
        html = re.sub(pattern, lambda m: m[1] + str(len(words)), html)
    html = re.sub(r'(id="summaryCats">全範囲<small>)\d+', lambda m: m[1] + str(len(words)), html)
    for filename, pattern, start, end in [
        ('biome.js', r'<!-- BIOME ENGINE START -->.*?<!-- BIOME ENGINE END -->', '<!-- BIOME ENGINE START -->\n<script>\n', '\n</script>\n<!-- BIOME ENGINE END -->'),
        ('biome-ui.js', r'<!-- BIOME UI START -->.*?<!-- BIOME UI END -->', '<!-- BIOME UI START -->\n<script>\n', '\n</script>\n<!-- BIOME UI END -->'),
        ('question-stage.js', r'<!-- QUESTION STAGE START -->.*?<!-- QUESTION STAGE END -->', '<!-- QUESTION STAGE START -->\n<script>\n', '\n</script>\n<!-- QUESTION STAGE END -->'),
        ('practice-menu.js', r'<!-- PRACTICE MENU START -->.*?<!-- PRACTICE MENU END -->', '<!-- PRACTICE MENU START -->\n<script>\n', '\n</script>\n<!-- PRACTICE MENU END -->'),
        ('super-challenge.js', r'<!-- SUPER CHALLENGE START -->.*?<!-- SUPER CHALLENGE END -->', '<!-- SUPER CHALLENGE START -->\n<script>\n', '\n</script>\n<!-- SUPER CHALLENGE END -->'),
        ('gas-client.js', r'// GAS CLIENT START.*?// GAS CLIENT END', '// GAS CLIENT START\n', '\n// GAS CLIENT END'),
        ('study-lab.js', r'<!-- STUDY LAB START -->.*?<!-- STUDY LAB END -->', '<!-- STUDY LAB START -->\n<script>\n', '\n</script>\n<!-- STUDY LAB END -->'),
        ('study-navigator.js', r'<!-- STUDY NAVIGATOR START -->.*?<!-- STUDY NAVIGATOR END -->', '<!-- STUDY NAVIGATOR START -->\n<script>\n', '\n</script>\n<!-- STUDY NAVIGATOR END -->'),
        ('learning.js', r'<!-- LEARNING ENGINE START -->.*?<!-- LEARNING ENGINE END -->', '<!-- LEARNING ENGINE START -->\n<script>\n', '\n</script>\n<!-- LEARNING ENGINE END -->'),
        ('learning-ui.js', r'// LEARNING UI START.*?// LEARNING UI END', '// LEARNING UI START\n', '\n// LEARNING UI END'),
    ]:
        source = (ROOT / 'src' / filename).read_text()
        if filename == 'biome.js':
            school = sum([json.loads((ROOT / f'data/biome-{part}-expansion.json').read_text()) for part in ('school', 'extra', 'more', 'habitat')], [])
            school = [{k:v for k,v in row.items() if k != 'card'} for row in school]
            source = 'window.BiomeHabitats=' + (ROOT / 'data/biome-habitats.json').read_text() + ';\n' + (ROOT / 'src/biome-catalog.js').read_text() + '\nwindow.BiomeSchoolExpansion=' + json.dumps(school, ensure_ascii=False) + ';\n' + source
        if filename == 'biome-ui.js':
            plant_cards = json.loads((ROOT / 'data/biome-plant-cards.json').read_text())
            plant_cards.update({row['id']:row['card'] for row in json.loads((ROOT / 'data/biome-school-expansion.json').read_text())})
            plant_cards.update({row['id']:row['card'] for row in json.loads((ROOT / 'data/biome-extra-expansion.json').read_text())})
            plant_cards.update({row['id']:row['card'] for row in json.loads((ROOT / 'data/biome-more-expansion.json').read_text())})
            plant_cards.update({row['id']:row['card'] for row in json.loads((ROOT / 'data/biome-habitat-expansion.json').read_text())})
            source = source.replace('const PLANT_CARDS={};', 'const PLANT_CARDS=' + json.dumps(plant_cards, ensure_ascii=False) + ';', 1)
            art = {}
            manifest = json.loads((ROOT / 'assets/biome-production-20261023/manifest.json').read_text())
            for asset in manifest['specs']:
                data = (ROOT / 'assets/biome-runtime' / (asset['id'] + '.webp')).read_bytes()
                art[asset['id']] = 'data:image/webp;base64,' + base64.b64encode(data).decode('ascii')
            source = source.replace('const ART={};', 'const ART=' + json.dumps(art) + ';', 1)
        html, count = re.subn(pattern, lambda _: start + source + end, html, count=1, flags=re.S)
        if count != 1:
            print(f'{filename}: モジュールの挿入位置が見つかりません', file=sys.stderr)
            return 1
    module = (ROOT / 'src/thinking.js').read_text()
    module = module.replace('const FIVE = [];', 'const FIVE = ' + json.dumps(five, ensure_ascii=False) + ';', 1)
    module = module.replace('const FIVE_SOURCES = {};', 'const FIVE_SOURCES = ' + json.dumps(sources, ensure_ascii=False) + ';', 1)
    html = re.sub(r'(id="fiveCount">)\d+', lambda m: m[1]+str(len(five)), html)
    module = module.replace('const THINKING = [];', 'const THINKING = ' + json.dumps(thinking, ensure_ascii=False) + ';', 1)
    html, module_n = re.subn(r'<!-- THINKING MODULE START -->.*?<!-- THINKING MODULE END -->', lambda _: '<!-- THINKING MODULE START -->\n<script>\n' + module + '\n</script>\n<!-- THINKING MODULE END -->', html, count=1, flags=re.S)
    if module_n != 1:
        print('思考問題モジュールの挿入位置が見つかりません', file=sys.stderr)
        return 1
    # Keep the single-file GAS distribution self-contained, including artwork.
    image_assets = {'biology-hero':'biology-fern-hero.webp', 'biology-lab':'biology-lab.webp', 'biology-growth':'biology-growth.webp', 'biology-terrarium':'biology-terrarium.webp'}
    asset_counts = {'biology-hero':2, 'biology-lab':3, 'biology-growth':3, 'biology-terrarium':2}
    for key, filename in image_assets.items():
        encoded = base64.b64encode((ROOT / 'assets' / filename).read_bytes()).decode('ascii')
        html, image_n = re.subn(r'(data-asset="' + key + r'" src=")[^"]*', lambda m: m[1] + 'data:image/webp;base64,' + encoded, html)
        if image_n != asset_counts[key]:
            print(f'{key}: 画像の挿入位置が一致しません', file=sys.stderr)
            return 1
    css = (ROOT / 'src/visual-refresh.css').read_text()
    habitat_image = base64.b64encode((ROOT / 'assets/biome-landscape.webp').read_bytes()).decode('ascii')
    css = css.replace('__HABITAT_IMAGE__', 'data:image/webp;base64,' + habitat_image)
    html, css_n = re.subn(r'/\* VISUAL REFRESH START \*/.*?/\* VISUAL REFRESH END \*/', lambda _: '/* VISUAL REFRESH START */\n' + css + '\n/* VISUAL REFRESH END */', html, flags=re.S)
    if css_n != 1:
        print('画像・デザインの挿入位置が見つかりません', file=sys.stderr)
        return 1
    path.write_text(html, encoding='utf-8')
    print(f'{len(words)}語を反映しました（別名は語数に含めません）')
    for cat in CATS:
        print(f'  {cat}: {sum(w["c"] == cat for w in words)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
