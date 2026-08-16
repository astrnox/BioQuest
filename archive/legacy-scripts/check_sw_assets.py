import re

with open('d:/trae_bio-1/sw.js','r',encoding='utf-8') as f:
    sw = f.read()
core = re.findall(r"'\.\/([^']+)'", sw)

with open('d:/trae_bio-1/index.html','r',encoding='utf-8') as f:
    html = f.read()
scripts = re.findall(r'src="([^"]+)"', html)
links = re.findall(r'href="([^"]+\.css[^"]*)"', html)
all_refs = set(scripts + links)

missing = []
for ref in all_refs:
    if ref.startswith('http') or ref.startswith('//'):
        continue
    if ref not in core:
        missing.append(ref)

print('CORE_ASSETS count:', len(core))
print('index.html local refs count:', len([r for r in all_refs if not r.startswith('http') and not r.startswith('//')]))
print('Missing from CORE_ASSETS:')
for m in sorted(missing):
    print(' ', m)
