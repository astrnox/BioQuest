#!/usr/bin/env python3
"""
BioQuest — 批量导入 200 张知识卡片到 Supabase cards 表
用法: python scripts/import-cards-to-supabase.py

需要环境变量：
  SUPABASE_URL              默认 https://qxehkfucvmx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY 必填，从 .env 读取（绝不能硬编码或提交）
"""
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

# 加载项目根目录的 .env
ROOT = Path(__file__).resolve().parent.parent.parent
ENV_PATH = ROOT / '.env'
if ENV_PATH.exists():
    for line in ENV_PATH.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        k, v = line.split('=', 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://qxehkfucvmx.supabase.co')
SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
if not SERVICE_KEY:
    print('ERROR: SUPABASE_SERVICE_ROLE_KEY not set. Please create .env file in project root with:')
    print('  SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...')
    sys.exit(1)

CARDS_JSON = ROOT / "data" / "cards.json"

BATCH_SIZE = 50  # 每次插入 50 张


def log(msg: str) -> None:
    print(f"[import] {msg}", flush=True)


def load_cards() -> list:
    """从 data/cards.json 加载并扁平化分类数组为统一卡片列表"""
    with open(CARDS_JSON, "r", encoding="utf-8") as f:
        raw = json.load(f)

    # data/cards.json 实际格式: { "分类": [ { name, id, cards: [...] } ] }
    categories = raw.get("分类") or raw.get("categories") or []
    if not isinstance(categories, list):
        raise ValueError("data/cards.json 格式错误：'分类' 字段不是数组")

    cards = []
    for cat in categories:
        cat_name = cat.get("name") or cat.get("id") or "未分类"
        cat_cards = cat.get("cards") or []
        if not isinstance(cat_cards, list):
            continue
        for c in cat_cards:
            title = c.get("title") or ""
            question = c.get("question") or ""
            answer = c.get("answer") or ""
            if not (title and question and answer):
                continue
            cards.append({
                "category": cat_name,
                "title": title,
                "question": question,
                "answer": answer,
            })

    return cards


def post_batch(batch: list) -> int:
    """POST 一批卡片到 Supabase，返回成功插入数量"""
    url = f"{SUPABASE_URL}/rest/v1/cards"
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation,count=exact",
    }
    data = json.dumps(batch, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
            if resp.status in (200, 201):
                arr = json.loads(body) if body else []
                return len(arr) if isinstance(arr, list) else 0
            log(f"HTTP {resp.status}: {body[:200]}")
            return 0
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8") if e.fp else ""
        log(f"HTTPError {e.code}: {body[:500]}")
        return 0
    except Exception as e:
        log(f"Error: {e}")
        return 0


def main() -> int:
    if not CARDS_JSON.exists():
        log(f"找不到文件: {CARDS_JSON}")
        return 1

    log(f"读取: {CARDS_JSON}")
    cards = load_cards()
    log(f"共解析 {len(cards)} 张卡片")

    if not cards:
        log("没有可导入的卡片")
        return 1

    success = 0
    for i in range(0, len(cards), BATCH_SIZE):
        batch = cards[i : i + BATCH_SIZE]
        log(f"导入 [{i + 1}..{i + len(batch)}] / {len(cards)}")
        n = post_batch(batch)
        success += n
        if n != len(batch):
            log(f"  ⚠ 期望 {len(batch)}，实际 {n}")

    log(f"导入完成: {success}/{len(cards)} 张")
    return 0 if success == len(cards) else 2


if __name__ == "__main__":
    sys.exit(main())
