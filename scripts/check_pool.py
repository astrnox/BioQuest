"""检查 pool.json 当前状态"""
import json
p = json.load(open('pool.json', 'r', encoding='utf-8'))
print(f'pool.json: {len(p)} questions')
for q in p[-5:]:
    print(f'  {q["id"]}: [{q.get("target")}][{q.get("concept")}] {q["stem"][:60]}')
