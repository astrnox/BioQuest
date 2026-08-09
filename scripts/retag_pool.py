#!/usr/bin/env python3
"""retag_pool.py

把 pool.json 中所有题目的 target/difficulty 做统一映射，
便于前端 (js/practice.js) 按"高考/竞赛" 及 "基础/进阶/挑战" 筛选。

规则:
    target:  'high_school' (高考) / 'competition' (竞赛) / 'both' (通用)
             原 'competition' 或缺失 -> 'competition'
             原 'high_school' -> 保留
             原 'basic' 难度且没有其他标识 -> 自动归到 high_school
    difficulty:
             'basic'   <-- 'basic'/'easy' 或 数字<=2
             'league'  <-- 'medium'/'league' 或 数字==3
             'national' <-- 'hard'/'national' 或 数字>=4
"""
import json
import sys

sys.path.insert(0, "/workspace")
from server import load, save


def map_difficulty(d):
    if d is None:
        return "league"
    if isinstance(d, int):
        if d <= 2:
            return "basic"
        if d == 3:
            return "league"
        return "national"
    s = str(d).lower()
    if s in ("basic", "easy"):
        return "basic"
    if s in ("league", "medium"):
        return "league"
    if s in ("national", "hard"):
        return "national"
    try:
        n = int(s)
        if n <= 2:
            return "basic"
        if n == 3:
            return "league"
        return "national"
    except Exception:
        return "league"


def infer_target(q):
    t = q.get("target")
    if t in ("high_school", "competition", "both"):
        return t
    # 若题目没有 target，根据 difficulty 推断
    d = str(q.get("difficulty", "")).lower()
    if d in ("basic", "easy"):
        return "high_school"
    return "competition"


def main():
    pool = load()
    changed = 0
    for q in pool:
        old_target = q.get("target")
        old_diff = q.get("difficulty")
        new_diff = map_difficulty(old_diff)
        new_target = infer_target(q)
        if old_target != new_target or old_diff != new_diff:
            changed += 1
            q["difficulty"] = new_diff
            q["target"] = new_target
    save(pool)
    targets = {}
    diffs = {}
    for q in pool:
        t = q.get("target", "(none)")
        targets[t] = targets.get(t, 0) + 1
        d = str(q.get("difficulty", "(none)"))
        diffs[d] = diffs.get(d, 0) + 1
    print(f"total: {len(pool)}; updated: {changed}")
    print(f"targets: {targets}")
    print(f"difficulties: {diffs}")


if __name__ == "__main__":
    main()
