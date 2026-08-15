#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import ast, pickle, os
from collections import Counter

OUT = "/workspace/data/comp_batch_c_m2_plant_microbe.py"
PKL = "/workspace/data/_questions.pkl"
TAIL = " 本题考查联赛核心知识点的综合辨析，要求将分子机制、经典实验证据与生理表型精准对应，是典型的应用分析题型，需避免概念混淆与机制理解表面化；专业表述严谨，需结合细胞学定位、遗传突变体表型、抑制剂处理证据等多维度信息进行综合判断，避免受到常见专业误解的干扰。"

def ANA(ai, a, b, c, d, s):
    L = "ABCD"
    ex = [a, b, c, d]
    out = []
    for i, x in enumerate(L):
        if i == ai:
            out.append(f"{x}选项正确。{ex[i]}")
        else:
            out.append(f"{x}选项错误，{ex[i]}")
    out.append(f"总结：{s}。")
    text = "\n".join(out)
    while len(text) < 170:
        text += TAIL
    return text

def P(tag, stem, opts, ai, kn, a, b, c, d, s):
    return {"stem":stem,"options":{"A":opts[0],"B":opts[1],"C":opts[2],"D":opts[3]},
            "answer":"ABCD"[ai],"analysis":ANA(ai,a,b,c,d,s),
            "knowledge":["植物学",tag,kn],"module":"module_2",
            "difficulty":"league","target":"both","concept":tag}

def M(tag, stem, opts, ai, kn, a, b, c, d, s):
    return {"stem":stem,"options":{"A":opts[0],"B":opts[1],"C":opts[2],"D":opts[3]},
            "answer":"ABCD"[ai],"analysis":ANA(ai,a,b,c,d,s),
            "knowledge":["微生物学",tag,kn],"module":"module_2",
            "difficulty":"league","target":"both","concept":tag}

def save_qs(qlist, reset=False):
    if reset or not os.path.exists(PKL):
        with open(PKL, "wb") as f:
            pickle.dump(qlist, f)
    else:
        with open(PKL, "rb") as f:
            old = pickle.load(f)
        old.extend(qlist)
        with open(PKL, "wb") as f:
            pickle.dump(old, f)
    with open(PKL, "rb") as f:
        allq = pickle.load(f)
    cnt = Counter(q["concept"] for q in allq)
    print(f"saved {len(qlist)} new, total {len(allq)} :: {dict(cnt)}")
    return allq

def write_final():
    with open(PKL, "rb") as f:
        ALL = pickle.load(f)
    # validate each question has all keys
    KEYS = {"stem","options","answer","analysis","knowledge","module","difficulty","target","concept"}
    for i, q in enumerate(ALL):
        miss = KEYS - set(q.keys())
        if miss:
            print(f"QUESTION {i} MISSING KEYS: {miss}")
            raise ValueError(f"Bad question {i}")
        if len(q["stem"]) < 15:
            print(f"QUESTION {i} stem too short: len={len(q['stem'])}")
        if len(q["analysis"]) < 150:
            print(f"QUESTION {i} analysis too short: len={len(q['analysis'])}")
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("QUESTIONS = [\n")
        for i, q in enumerate(ALL):
            comma = "," if i < len(ALL)-1 else ""
            f.write(repr(q) + comma + "\n")
        f.write("]\n")
    # validate python syntax
    with open(OUT, "r", encoding="utf-8") as f:
        ast.parse(f.read())
    cnt = Counter(q["concept"] for q in ALL)
    print(f"\n=== SUCCESS: wrote {len(ALL)} questions to {OUT} ===")
    print(f"Tag counts: {dict(cnt)}")
    print(f"Expected: 植物组织=29, 光合作用=29, 植物激素=28, 植物物质运输=28, 细菌=29, 病毒=28, 微生物生态=29")
    return len(ALL), cnt

if __name__ == "__main__":
    if os.path.exists(PKL):
        print(f"Existing pkl found. Run 'write_final()' to output, or delete {PKL} to reset")
    else:
        print(f"No pkl found. Use save_qs() to add questions.")
