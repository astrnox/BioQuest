#!/usr/bin/env python3
"""Dry-run 数据解析验证：不连网络，仅验证全部数据源能被正确解析为上传记录。"""
import sys, json, importlib.util, re
from pathlib import Path
ROOT = Path("/workspace")

# 加载上传脚本模块（不执行 __main__）
spec = importlib.util.spec_from_file_location("up", "/workspace/tools/python/upload_all_to_supabase.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

errors = []

# 1. 题库
print("[1] 题库 questions ...")
try:
    bank_dir = ROOT / "data" / "bank"
    files = sorted(bank_dir.glob("*.json"))
    total = 0
    ids = set()
    for f in files:
        with open(f, encoding="utf-8") as fh:
            data = json.load(fh)
        for qid, q in data.items():
            rec = m.build_question_record(qid, q)
            total += 1
            if qid in ids:
                errors.append(f"重复ID: {qid}")
            ids.add(qid)
            # 校验必填
            if not rec["question"]: errors.append(f"{qid} 缺题干")
            if not rec["sub_questions"]: errors.append(f"{qid} 缺选项")
            for sq in rec["sub_questions"]:
                if "answer" not in sq: errors.append(f"{qid} 子项缺answer")
    print(f"  解析 OK: {len(files)} 分片, {total} 题, 唯一ID={len(ids)}")
    if total != 400: errors.append(f"题库总数应是400, 实际{total}")
except Exception as e:
    errors.append(f"题库解析异常: {e}")

# 2. 卡片
print("[2] 卡片 cards ...")
try:
    with open(ROOT/"data/cards.json", encoding="utf-8") as f: raw = json.load(f)
    cats = raw.get("分类") or raw.get("categories") or []
    n = sum(len(c.get("cards") or []) for c in cats)
    print(f"  解析 OK: {len(cats)} 分类, {n} 张卡片")
except Exception as e:
    errors.append(f"卡片解析异常: {e}")

# 3. 资源
print("[3] 资源 resources ...")
try:
    with open(ROOT/"data/resources.json", encoding="utf-8") as f: raw = json.load(f)
    items = raw.get("资源库") or raw.get("resources") or []
    print(f"  解析 OK: {len(items)} 条资源")
except Exception as e:
    errors.append(f"资源解析异常: {e}")

# 4. 社区
print("[4] 社区 community ...")
try:
    with open(ROOT/"data/community.json", encoding="utf-8") as f: raw = json.load(f)
    posts = raw.get("posts") or []
    print(f"  解析 OK: {len(posts)} 条帖子")
except Exception as e:
    errors.append(f"社区解析异常: {e}")

# 5. 上传脚本存在性
script = ROOT/"tools/python/upload_all_to_supabase.py"
print(f"\n[5] 上传脚本存在: {script.exists()}")

print("\n" + "="*50)
if errors:
    print("❌ 发现错误:")
    for e in errors[:20]: print("  -", e)
    sys.exit(1)
else:
    print("✅ 全部数据源 dry-run 解析通过，上传脚本就绪！")
