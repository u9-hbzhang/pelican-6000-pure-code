"""Publish the tested release snapshot, independent of later source edits on main."""
import io
import json
import pathlib
import re
import shutil
import subprocess
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]


def build(destination):
    release = json.loads((ROOT / 'site/release.json').read_text(encoding='utf-8'))
    tag, commit = release['tag'], release['commit']
    if not re.fullmatch(r'v\d+\.\d+(?:\.\d+)?', tag):
        raise ValueError('Invalid release tag')
    actual = subprocess.check_output(['git', 'rev-parse', f'refs/tags/{tag}^{{commit}}'], cwd=ROOT, text=True).strip()
    if actual != commit:
        raise ValueError(f'{tag} does not match the tested commit')
    destination = pathlib.Path(destination).resolve()
    destination.mkdir(parents=True, exist_ok=False)
    paths = ['index.html', 'src', 'styles', 'assets', 'data', '鹈鹕骑行_纯代码全片_单文件版.html']
    archive = subprocess.check_output(['git', '-c', 'core.autocrlf=false', 'archive', '--format=zip', commit, '--', *paths], cwd=ROOT)
    version = destination / tag
    version.mkdir()
    with zipfile.ZipFile(io.BytesIO(archive)) as source:
        for item in source.infolist():
            target = (version / item.filename).resolve()
            if not target.is_relative_to(version):
                raise ValueError('Archive path outside version directory')
        source.extractall(version)
    # Keep root asset URLs working for clients with an older cached index.html.
    for path in version.iterdir():
        if path.is_dir():
            shutil.copytree(path, destination / path.name)
        else:
            shutil.copy2(path, destination / path.name)
    (destination / '.nojekyll').touch()
    (destination / 'release.json').write_text(json.dumps(release, indent=2) + '\n', encoding='utf-8')
    (destination / 'index.html').write_text(f'''<!doctype html>
<html lang="zh-CN"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>鹈鹕六千年的车 · {tag}</title>
<meta http-equiv="refresh" content="0;url=./{tag}/">
<style>body{{margin:0;background:#050403;color:white;display:grid;place-items:center;min-height:100vh;font:15px monospace}}a{{color:inherit}}</style>
<script>location.replace('./{tag}/' + location.search + location.hash);</script>
</head><body><a href="./{tag}/">正在唤醒六千年的故事…</a></body></html>
''', encoding='utf-8')
    print(f'Prepared {tag} ({commit[:7]}) in {destination}')


if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else ROOT / '_site')
