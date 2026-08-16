"""删除题库中全部题目：清空 pool.json + 删除 Supabase questions 表全部行"""
import json
import sys
sys.path.insert(0, ".")
import server
from pathlib import Path

# 1. 清空本地 pool.json
print("=== 清空本地 pool.json ===")
p = Path("pool.json")
if p.exists():
    old_count = len(json.loads(p.read_text("utf-8")))
    p.write_text("[]", "utf-8")
    print(f"  已清空 {old_count} 道题")
else:
    p.write_text("[]", "utf-8")
    print("  pool.json 不存在，已创建空文件")

# 2. 清空 pool.json.bak
p_bak = Path("pool.json.bak")
if p_bak.exists():
    p_bak.write_text("[]", "utf-8")
    print("  已清空 pool.json.bak")

# 3. 删除 Supabase questions 表全部行（需要 WHERE 子句，用 id=not.is.null 匹配所有行）
print("\n=== 清空 Supabase questions 表 ===")
result = server.sb_request("DELETE", "questions", query="id=not.is.null", prefer="return=representation")
if result is None:
    print("  Supabase 删除失败（可能是 RLS 或网络问题）")
else:
    deleted = len(result) if isinstance(result, list) else 0
    print(f"  已从 Supabase 删除 {deleted} 行")

# 4. 验证
print("\n=== 验证 ===")
pool = server.load()
print(f"  当前题库数量: {len(pool)}")
if pool:
    print(f"  警告: 仍有 {len(pool)} 题，可能 Supabase 删除未成功")
else:
    print("  题库已完全清空!")
