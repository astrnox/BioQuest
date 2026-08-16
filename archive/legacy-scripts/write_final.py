import json

qs = json.load(open('/workspace/data/_temp_questions.json', 'r', encoding='utf-8'))

# Convert json list to python QUESTIONS list literal in a separate file
# To keep valid python, we use repr and wrap as QUESTIONS = [dict1, dict2, ...]
# Better: write out manually with proper escaping

def py_repr_dict(d, indent=0):
    pad = '    ' * indent
    inner_pad = '    ' * (indent + 1)
    lines = [pad + '{']
    keys_order = ['stem','options','answer','analysis','knowledge','module','difficulty','target','concept']
    for k in keys_order:
        if k not in d:
            continue
        v = d[k]
        if isinstance(v, dict):
            inner = inner_pad + '"' + k + '": {'
            opt_parts = []
            for ok in ['A','B','C','D']:
                if ok in v:
                    # escaped string
                    s = v[ok].replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
                    opt_parts.append('"' + ok + '": "' + s + '"')
            inner += ', '.join(opt_parts) + '},'
            lines.append(inner)
        elif isinstance(v, list):
            inner = inner_pad + '"' + k + '": ['
            parts = []
            for item in v:
                s = item.replace('\\', '\\\\').replace('"', '\\"')
                parts.append('"' + s + '"')
            inner += ', '.join(parts) + '],'
            lines.append(inner)
        elif isinstance(v, str):
            s = v.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
            lines.append(inner_pad + '"' + k + '": "' + s + '",')
        else:
            lines.append(inner_pad + '"' + k + '": ' + repr(v) + ',')
    lines.append(pad + '}')
    return '\n'.join(lines)

with open('/workspace/data/comp_batch_e_m3_eco_m4_gen.py', 'w', encoding='utf-8') as f:
    f.write('QUESTIONS = [\n')
    for idx, q in enumerate(qs):
        f.write(py_repr_dict(q, indent=1))
        if idx < len(qs) - 1:
            f.write(',\n')
        else:
            f.write('\n')
    f.write(']\n')

print('Written to /workspace/data/comp_batch_e_m3_eco_m4_gen.py')
print('Length check...')
import os
print(f'File size: {os.path.getsize("/workspace/data/comp_batch_e_m3_eco_m4_gen.py")/1024/1024:.2f} MB')
# Now try to import
import sys
sys.path.insert(0, '/workspace/data')
# Check syntax only
import ast
ast.parse(open('/workspace/data/comp_batch_e_m3_eco_m4_gen.py', 'r', encoding='utf-8').read())
print('Syntax check PASS')
# Then try load
exec(compile(open('/workspace/data/comp_batch_e_m3_eco_m4_gen.py').read(), 'comp_batch_e_m3_eco_m4_gen.py', 'exec'))
print(f'Loaded QUESTIONS successfully. len = {len(QUESTIONS)}')
# Quality checks
from collections import Counter
print('Concepts:', dict(Counter(q['concept'] for q in QUESTIONS)))
print('Modules:', dict(Counter(q['module'] for q in QUESTIONS)))
# Each question check
min_stem = 9999; min_ana = 99999
bad = []
for i, q in enumerate(QUESTIONS):
    if len(q['stem']) < 15:
        bad.append((i, 'stem_short', len(q['stem'])))
    if len(q['analysis']) < 150:
        bad.append((i, 'analysis_short', len(q['analysis'])))
    min_stem = min(min_stem, len(q['stem']))
    min_ana = min(min_ana, len(q['analysis']))
    if q['difficulty'] != 'league' or q['target'] != 'both':
        bad.append((i, 'tagging', q['difficulty'], q['target']))
    if q['answer'] not in ['A','B','C','D']:
        bad.append((i, 'ans', q['answer']))
    # module/concept match
    con_to_mod = {
        '生态系统':'module_3','种群生态':'module_3','群落生态':'module_3','物质循环':'module_3','生物多样性':'module_3',
        '孟德尔遗传':'module_4','连锁与交换':'module_4','伴性遗传':'module_4','基因突变':'module_4','染色体变异':'module_4','群体遗传':'module_4'
    }
    if con_to_mod.get(q['concept']) != q['module']:
        bad.append((i, 'concept_mod_mismatch', q['concept'], q['module']))
    # knowledge[0] check
    if q['module'] == 'module_3' and q['knowledge'][0] != '生态学':
        bad.append((i, 'knowledge[0]_eco', q['knowledge']))
    if q['module'] == 'module_4' and q['knowledge'][0] not in ('遗传学', '进化生物学'):
        bad.append((i, 'knowledge[0]_gen', q['knowledge']))
    min_stem = min(min_stem, len(q['stem']))
    min_ana = min(min_ana, len(q['analysis']))
print(f'min stem = {min_stem}, min analysis = {min_ana}, num_bad = {len(bad)}')
if bad:
    print('Bad list (first 5):', bad[:5])
