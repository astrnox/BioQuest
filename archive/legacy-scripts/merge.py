#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""合并题目批次脚本：读取主文件QUESTIONS，从批次文件读取新题追加，写回主文件"""
import sys
import importlib.util
import pprint

def load_questions(path, varname='QUESTIONS'):
    spec = importlib.util.spec_from_file_location("mod", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return getattr(mod, varname)

def dump_questions(qs, path):
    lines = ['QUESTIONS = [']
    for i, q in enumerate(qs):
        lines.append('  {')
        for key in ['stem','options','answer','analysis','knowledge','module','difficulty','target','concept']:
            val = q[key]
            if key == 'options':
                lines.append("    'options': {" + f"'A': {repr(val['A'])}, 'B': {repr(val['B'])}, 'C': {repr(val['C'])}, 'D': {repr(val['D'])}" + "},")
            elif key == 'knowledge':
                lines.append(f"    'knowledge': [{repr(val[0])}, {repr(val[1])}, {repr(val[2])}],")
            else:
                lines.append(f"    {repr(key)}: {repr(val)},")
        lines.append('  }' + (',' if i < len(qs)-1 else ''))
    lines.append(']')
    content = '\n'.join(lines)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    return len(content)

def validate(qs):
    errors = []
    tags_count = {}
    for i, q in enumerate(qs):
        for req in ['stem','options','answer','analysis','knowledge','module','difficulty','target','concept']:
            if req not in q:
                errors.append(f"题#{i+1}:缺少字段{req}")
        if len(q.get('stem','')) < 15:
            errors.append(f"题#{i+1}:stem不足15字")
        if len(q.get('analysis','')) < 150:
            errors.append(f"题#{i+1}:analysis不足150字 (实际{len(q.get('analysis',''))})")
        for opt in 'ABCD':
            if opt not in q.get('options',{}):
                errors.append(f"题#{i+1}:缺少选项{opt}")
        if q.get('answer') not in 'ABCD':
            errors.append(f"题#{i+1}:answer非法")
        c = q.get('concept','')
        tags_count[c] = tags_count.get(c, 0) + 1
    return errors, tags_count

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("用法: python3 merge.py <主文件> <批次文件>")
        sys.exit(1)
    main_path = sys.argv[1]
    batch_path = sys.argv[2]
    main_qs = load_questions(main_path)
    batch_qs = load_questions(batch_path)
    print(f"主文件现有题目数: {len(main_qs)}")
    print(f"批次文件题目数: {len(batch_qs)}")
    merged = main_qs + batch_qs
    errors, tags = validate(merged)
    if errors:
        print(f"\n发现{len(errors)}个错误：")
        for e in errors[:30]:
            print("  -", e)
    print("\n各tag数量分布:")
    for k, v in sorted(tags.items()):
        print(f"  {k}: {v}题")
    print(f"  总计: {sum(tags.values())}题")
    size = dump_questions(merged, main_path)
    print(f"\n合并后写入{main_path}，大小{size}字节，总题数{len(merged)}")
