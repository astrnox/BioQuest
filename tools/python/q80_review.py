#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Q80 批次自审脚本：对 data/questions/ 中全部题目执行机械规则校验。
检查项（对应规范）：
  R8 字段完整性 / label 连续 / answer 布尔
  R5 正确项 1-3 个 / 无效选项表述 / 选项包含关系
  D2 题干 15-80 字
  D3 选项 8-60 字、最长/最短 ≤ 2.5 倍、正误项平均长度差
  D4 解析逐项 A【对】/B【错】覆盖、单项 20-60 字、整题 120-320 字、与标答一致
  R7 与库内其他题题干相似度（SequenceMatcher > 0.88 判重）
"""
import json
import re
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
QDIR = ROOT / "data" / "questions"

INVALID_PHRASES = ["以上都对", "以上都错", "以上均对", "以上均错", "无法确定", "以上皆是", "以上皆非"]
issues = []   # (级别, id, 描述)


def check(qid, q, tag):
    stem = q.get("question", "")
    sq = q.get("subQuestions", [])
    expl = q.get("explanation", "")

    # R8 字段
    for f in ("type", "question", "subQuestions", "explanation", "difficulty", "target", "tags"):
        if not q.get(f):
            issues.append(("FAIL", qid, f"缺字段 {f}"))
    if len(sq) != 4 or [s["label"] for s in sq] != ["A", "B", "C", "D"]:
        issues.append(("FAIL", qid, "label 不连续或项数≠4"))
        return
    n_true = sum(1 for s in sq if s["answer"] is True)
    if not 1 <= n_true <= 3:
        issues.append(("FAIL", qid, f"正确项数 {n_true} 越界"))

    # D2 题干
    if len(stem) < 15:
        issues.append(("FAIL", qid, f"题干过短 {len(stem)}"))
    elif len(stem) > 80:
        issues.append(("WARN", qid, f"题干 {len(stem)} 字 > 80"))

    # D3 选项
    lens = [len(s["text"]) for s in sq]
    for s in sq:
        if len(s["text"]) < 8:
            issues.append(("FAIL", qid, f"选项 {s['label']} 过短 {len(s['text'])}"))
        elif len(s["text"]) > 60:
            issues.append(("WARN", qid, f"选项 {s['label']} {len(s['text'])} 字 > 60"))
    if max(lens) / max(min(lens), 1) > 2.5:
        issues.append(("WARN", qid, f"选项长度比 {max(lens)/min(lens):.1f} > 2.5"))
    correct = [s["text"] for s in sq if s["answer"]]
    wrong = [s["text"] for s in sq if not s["answer"]]
    if correct and wrong:
        ac = sum(len(t) for t in correct) / len(correct)
        aw = sum(len(t) for t in wrong) / len(wrong)
        if ac > 0 and abs(ac - aw) / ac > 3.5:
            issues.append(("WARN", qid, f"正误项平均长度差 {abs(ac-aw)/ac:.1f}x"))
    # R5 无效表述 + 包含关系
    for s in sq:
        for p in INVALID_PHRASES:
            if p in s["text"]:
                issues.append(("FAIL", qid, f"选项 {s['label']} 含无效表述 {p}"))
    for i in range(4):
        for j in range(i + 1, 4):
            t1, t2 = sq[i]["text"], sq[j]["text"]
            if len(t1) > 10 and len(t2) > 10 and (t1 in t2 or t2 in t1):
                issues.append(("FAIL", qid, f"选项 {sq[i]['label']}/{sq[j]['label']} 包含关系"))

    # D4 解析
    if len(expl) < 120:
        issues.append(("FAIL", qid, f"解析 {len(expl)} 字 < 120"))
    elif len(expl) > 320:
        issues.append(("WARN", qid, f"解析 {len(expl)} 字 > 320"))
    for s in sq:
        lab = s["label"]
        mark = "对" if s["answer"] else "错"
        pat = rf"{lab}【{mark}】"
        if not re.search(pat, expl):
            issues.append(("FAIL", qid, f"解析缺 {pat} 或与标答不符"))
        # 单项字数
        m = re.search(rf"{lab}【[对错]】(.*?)(?=[A-D]【|$)", expl, re.S)
        if m:
            seg = m.group(1).strip()
            if len(seg) < 20:
                issues.append(("WARN", qid, f"解析 {lab} 项 {len(seg)} 字 < 20"))
            elif len(seg) > 60:
                issues.append(("WARN", qid, f"解析 {lab} 项 {len(seg)} 字 > 60"))

    # tags
    tags = q.get("tags", [])
    if tag not in tags or not any(re.match(r"^module_\d$", t) for t in tags):
        issues.append(("FAIL", qid, f"tags 缺主题或模块标记: {tags}"))


def main():
    items = []
    for qf in sorted(QDIR.glob("*/*/*.json")):
        if qf.name == "id-all.json":
            continue
        tag, qid = qf.parts[-3], qf.stem
        q = json.loads(qf.read_text(encoding="utf-8"))
        items.append((tag, qid, q))
        check(qid, q, tag)

    # R7 去重
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            sim = SequenceMatcher(None, items[i][2]["question"], items[j][2]["question"]).ratio()
            if sim > 0.88:
                issues.append(("FAIL", items[i][1], f"与 {items[j][1]} 题干相似度 {sim:.2f}"))

    fails = [x for x in issues if x[0] == "FAIL"]
    warns = [x for x in issues if x[0] == "WARN"]
    for lv, qid, msg in issues:
        print(f"[{lv}] {qid}: {msg}")
    print(f"\n自审机械校验: 共 {len(items)} 题, FAIL={len(fails)}, WARN={len(warns)}")
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(main())
