"""
BioQuest — 上传本地 pool.json 到 Supabase
用法：python scripts/upload_to_supabase.py
"""
import json
import time
import urllib.request
import urllib.error
import os
import sys

# 复用 server.py 的配置
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from server import SUPABASE_URL, SUPABASE_KEY, _build_record, sb_request, log

POOL_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "pool.json")


def upload_pool():
    if not os.path.exists(POOL_FILE):
        print(f"[ERROR] {POOL_FILE} 不存在")
        return 0, 0

    with open(POOL_FILE, "r", encoding="utf-8") as f:
        pool = json.load(f)

    print(f"[INFO] 共 {len(pool)} 题待上传")
    success = 0
    fail = 0

    for i, q in enumerate(pool):
        record = _build_record(q)
        # 使用 upsert 模式：已存在则更新，不存在则插入
        result = sb_request("POST", "questions", record,
                           prefer="return=representation,resolution=merge-duplicates")
        if result is not None:
            success += 1
            if (i + 1) % 10 == 0:
                print(f"  进度: {i+1}/{len(pool)} (成功 {success}, 失败 {fail})")
        else:
            fail += 1
            if fail <= 3:
                print(f"  [WARN] 上传失败 {q.get('id', '?')}")
        # 避免触发速率限制
        time.sleep(0.1)

    print(f"\n[DONE] 成功 {success}/{len(pool)}, 失败 {fail}")
    return success, fail


if __name__ == "__main__":
    # 先检查当前 Supabase 题目数
    existing = sb_request("GET", "questions", query="select=id&limit=1")
    if existing is not None:
        print(f"[INFO] Supabase 连接正常，当前可读取")
    else:
        print("[WARN] Supabase 连接失败，仍尝试上传")
    upload_pool()
