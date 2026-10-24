#!/usr/bin/env python3
"""Build a self-contained Apps Script upload bundle. Does not log in or deploy."""
import hashlib
import base64
import gzip
import json
import pathlib
import re
import subprocess
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent


def packed(text):
    return '<!--BIO_HTML_GZIP_V1:' + base64.b64encode(gzip.compress(text.encode(), compresslevel=9, mtime=0)).decode('ascii') + '-->\n'


def main():
    subprocess.run([sys.executable, str(ROOT / 'tools/build.py')], check=True)
    html = (ROOT / 'index.html').read_text()
    for marker in ('BIOME ENGINE START', 'BIOME UI START', 'GAS CLIENT START', 'STUDY LAB START', 'SUPER CHALLENGE START', 'PRACTICE MENU START', 'QUESTION STAGE START', 'data-asset="biology-terrarium"'):
        if marker not in html:
            raise ValueError('Missing app component: ' + marker)
    if 'src="assets/' in html or '<script src=' in html:
        raise ValueError('GAS bundle must embed local resources')
    out = ROOT / 'dist/gas'
    out.mkdir(parents=True, exist_ok=True)
    names = ['Code.gs', 'index.html', 'appsscript.json', 'GAS_SETUP.md']
    match = re.search(r'const ART=(\{.*?\});', html)
    if not match:
        raise ValueError('Missing biome image catalog')
    art = json.loads(match.group(1))
    gas_html = html[:match.start(1)] + '{}' + html[match.end(1):]
    asset_names = []
    boundaries = [(0,20),(20,40),(40,60),(60,92),(92,None)]
    for i, (start, end) in enumerate(boundaries):
        name = f'biome-art-{i+1}.html'
        # Preserve all four deployed image files; school artwork is a separate fifth file.
        chunk = dict(list(art.items())[start:end])
        if len(json.dumps(chunk).encode()) > 3_500_000:
            raise ValueError('GAS image chunk exceeds safe editor upload size; split assets first')
        data = json.dumps(chunk, ensure_ascii=False)
        (out / name).write_text(data)
        asset_names.append(name)
    hashes = {}
    for name in names:
        data = packed(gas_html).encode() if name == 'index.html' else (ROOT / name).read_bytes()
        (out / name).write_bytes(data)
        hashes[name] = hashlib.sha256(data).hexdigest()
    for name in asset_names:
        hashes[name] = hashlib.sha256((out / name).read_bytes()).hexdigest()
    names += asset_names
    if sum((out / name).stat().st_size for name in names) > 10_400_000:
        raise ValueError('GAS project exceeds the guarded total upload size; split or compress before publishing')
    (out / 'SHA256.json').write_text(json.dumps(hashes, indent=2) + '\n')
    (out / '.claspignore').write_text('**/**\n!Code.gs\n!index.html\n!biome-art-*.html\n!appsscript.json\n')
    with zipfile.ZipFile(ROOT / 'dist/seibututype-gas.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
        for name in names + ['SHA256.json', '.claspignore']:
            archive.write(out / name, name)
    print('GAS bundle: dist/seibututype-gas.zip')
    print('No Google account or remote project was changed.')


if __name__ == '__main__':
    main()
