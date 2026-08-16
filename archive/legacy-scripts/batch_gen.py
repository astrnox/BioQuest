#!/usr/bin/env python3
"""批量生成脚本：使用 server.py 的生成器。
用法:
    python3 scripts/batch_gen.py --type gaokao --count 300
    python3 scripts/batch_gen.py --type chart --count 100
    python3 scripts/batch_gen.py --type competition --count 100
"""
import argparse
import json
import os
import sys
import time
import random
import logging
from pathlib import Path

sys.path.insert(0, '/workspace')

from server import (
    gen_one,
    load,
    save,
    sb_upsert_batch,
    POOL_FILE,
    FAST_MODEL,
)

LOG = "/workspace/logs/batch_gen.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler(LOG, encoding="utf-8"), logging.StreamHandler()],
)
log = logging.getLogger("batch")


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--type", default="gaokao", choices=["gaokao", "competition", "chart", "both"])
    p.add_argument("--count", type=int, default=100)
    p.add_argument("--batch-size", type=int, default=4)
    p.add_argument("--max-workers", type=int, default=1)
    p.add_argument("--interval", type=float, default=0.0)
    return p.parse_args()


def main():
    args = parse_args()

    # 根据题型选择参数
    if args.type == "gaokao":
        target = "high_school"
        difficulties = ["basic"] * 3 + ["league"]
        modules = ["module_1", "module_2", "module_3", "module_4"]
        chart = False
        model = FAST_MODEL
    elif args.type == "competition":
        target = "competition"
        difficulties = ["basic", "league", "national"]
        modules = ["module_1", "module_2", "module_3", "module_4"]
        chart = False
        model = FAST_MODEL
    elif args.type == "chart":
        target = "both"
        difficulties = ["basic", "league", "national"]
        modules = ["module_1", "module_2", "module_3", "module_4"]
        chart = True
        model = FAST_MODEL
    else:  # both
        target = "both"
        difficulties = ["basic", "league", "national"]
        modules = ["module_1", "module_2", "module_3", "module_4"]
        chart = False
        model = FAST_MODEL

    pool = load()
    existing = set(q.get("stem") for q in pool)
    accepted_total = 0
    attempts = 0
    start = time.time()
    deadline = start + 60 * 60 * 2  # 2 小时上限

    log.info(
        f"开始生成: type={args.type} target_count={args.count} "
        f"target_field={target} batch_size={args.batch_size} model={model}"
    )

    while accepted_total < args.count and time.time() < deadline:
        mod = random.choice(modules)
        diff = random.choice(difficulties)
        attempt_start = time.time()
        try:
            new_questions = gen_one(
                mod,
                difficulty=diff,
                target=target,
                recent_stems=list(existing)[-20:],
                concept=None,
                chart=chart,
                batch_size=args.batch_size,
                model=model,
            )
            attempts += 1
        except Exception as e:
            log.warning(f"生成异常: {e}")
            time.sleep(1)
            continue

        if not new_questions:
            continue

        # 写入 pool.json
        pool = load()
        for q in new_questions:
            # 避免重复
            if q.get("stem") not in [qq.get("stem") for qq in pool]:
                pool.append(q)
                accepted_total += 1
        save(pool)

        elapsed = time.time() - attempt_start
        log.info(
            f"本次生成 {len(new_questions)} 题（{mod}/{elapsed:.1f}s）| 累计接受 {accepted_total}/{args.count} | pool={len(pool)}"
        )

        if args.interval > 0:
            time.sleep(args.interval)

    # Supabase 上传（若可用则跳过）
    try:
        sb_upsert_batch(pool[-20:])
    except Exception as e:
        log.warning(f"Supabase 上传失败: {e}")

    log.info(f"结束。共接受 {accepted_total} 题，调用 {attempts} 次")


if __name__ == "__main__":
    main()
