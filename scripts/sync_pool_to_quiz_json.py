#!/usr/bin/env python3
"""将 pool.json 的题目转换为前端 data/quiz_m*.json 格式并写入。
前端 loader.js 加载本地 quiz_m*.json 时要求：题库为数组，每个元素
包含 type、question、subQuestions、explanation、subject、concept、
difficulty、chart、year、module、target 等字段。"""
import json
import os
import sys

POOL_PATH = "/workspace/pool.json"
DATA_DIR = "/workspace/data"


def convert_one(q):
    """将 pool 题转为前端 quiz_m 格式（subQuestions 列表）。"""
    opts = q.get("options") or {}
    answer = q.get("answer")
    if isinstance(answer, dict):
        # 多重判断：每个选项独立判定
        sub_questions = [
            {
                "label": k,
                "text": opts.get(k, ""),
                "answer": bool(answer.get(k, False)),
            }
            for k in ["A", "B", "C", "D"]
        ]
        type_ = "multi_judge"
    else:
        # 单选：正确选项 True，其他 False（我们这里按多选结构存以兼容前端）
        sub_questions = [
            {
                "label": k,
                "text": opts.get(k, ""),
                "answer": (answer == k),
            }
            for k in ["A", "B", "C", "D"]
        ]
        type_ = "mtf"

    # 难度映射，保存一份与前端相同
    return {
        "type": type_,
        "question": q.get("stem", ""),
        "subQuestions": sub_questions,
        "explanation": q.get("analysis", ""),
        "subject": q.get("subject", ""),
        "concept": q.get("concept", ""),
        "difficulty": q.get("difficulty", "basic"),
        "chart": q.get("chart"),
        "year": q.get("year"),
        "module": q.get("module"),
        "target": q.get("target"),
        "tags": q.get("tags", []),
    }


def module_of(q):
    m = q.get("module") or ""
    if isinstance(m, int):
        return f"module_{m}"
    if isinstance(m, str) and m.startswith("module_"):
        return m
    # 尝试按 subject 推断
    subj = (q.get("subject") or "").strip()
    for key, mod in [
        (["细胞", "分子", "生化", "生物化学", "细胞生物学", "分子生物学"], "module_1"),
        (["植物", "微生物"], "module_2"),
        (["动物", "生态"], "module_3"),
        (["遗传", "进化", "生物信息"], "module_4"),
    ]:
        for k in key:
            if k in subj:
                return mod
    return "module_1"


def main():
    with open(POOL_PATH, "r", encoding="utf-8") as f:
        pool = json.load(f)
    print(f"[pool] total={len(pool)}")

    converted = []
    for q in pool:
        if not isinstance(q, dict):
            continue
        try:
            converted.append(convert_one(q))
        except Exception as e:
            print(f"[warn] skip: {e}")

    # 按模块拆分
    by_module = {"module_1": [], "module_2": [], "module_3": [], "module_4": []}
    for c in converted:
        m = module_of(c)
        if m not in by_module:
            by_module[m] = []
        by_module[m].append(c)

    for m, items in by_module.items():
        idx = m.split("_")[-1]
        path = os.path.join(DATA_DIR, f"quiz_m{idx}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)
        print(f"[write] {path} -> {len(items)}")

    # quiz.json：取一份精简版（最新 100 道）用于首页/演示
    demo = converted[-100:]
    with open(os.path.join(DATA_DIR, "quiz.json"), "w", encoding="utf-8") as f:
        json.dump(demo, f, ensure_ascii=False, indent=2)
    print(f"[write] quiz.json -> {len(demo)}")

    # 统计
    targets = {}
    diffs = {}
    for c in converted:
        t = c.get("target") or "unknown"
        targets[t] = targets.get(t, 0) + 1
        d = str(c.get("difficulty") or "?")
        diffs[d] = diffs.get(d, 0) + 1
    print(f"[stats] targets={targets}")
    print(f"[stats] difficulties={diffs}")
    print(f"[stats] with chart={sum(1 for c in converted if c.get('chart'))}")


if __name__ == "__main__":
    main()
