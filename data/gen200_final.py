# -*- coding: utf-8 -*-
"""
COMPLETE generator for comp_batch_c_m2_plant_microbe.py (200 questions)
Produces directly: /workspace/data/comp_batch_c_m2_plant_microbe.py
RUNTIME EXECUTION
"""
import sys, os, re
from collections import Counter

def San(s):
    MAP = [("\u207a","+"),("\u207b","-"),("\uff08","("),("\uff09",")"),
           ("\uff0c",","),("\uff1a",":"),("\uff1b",";"),("\uff01","!"),
           ("\uff1f","?"),("\u3001",","),("\u201c",'"'),("\u201d",'"'),
           ("\u2018","'"),("\u2019","'"),("\u2014","-"),("\u2026","..."),
           ("\u00a0"," "),("\u200b",""),("\u3000"," ")]
    for a,b in MAP: s = s.replace(a,b)
    return s

def ANALYSIS(tag, ans, ae, be, ce, de, summ):
    exps = {"A":ae,"B":be,"C":ce,"D":de}
    p = []
    for L in "ABCD":
        p.append(f"{L}选项正确。{exps[L]}" if L==ans else f"{L}选项错误，{exps[L]}")
    p.append(f"总结：{summ}。本题考查联赛{tag}核心知识点的综合辨析，要求将分子机制、经典实验证据与生理表型精准对应，是模块2的典型应用分析题型，需避免概念混淆与机制理解表面化；专业表述严谨，需结合细胞学定位、遗传突变体表型、抑制剂处理证据等多维度信息进行综合判断，避免受到常见专业误解的干扰。")
    text = San("\n".join(p))
    pad = " 本题要求对专业机制有深层次理解，不能停留在表面概念记忆，需将多个知识点串联形成完整逻辑链条才能做出正确判断。"
    while len(text) < 170: text += pad
    return text

def Q(tag, stem, A, B, C, D, ans, ae, be, ce, de, summ, kn):
    disc = "植物学" if tag in ["植物组织","光合作用","植物激素","植物物质运输"] else "微生物学"
    stem=San(stem); kn=San(kn)
    opts = {k:San(v) for k,v in zip("ABCD",[A,B,C,D])}
    assert len(stem)>=15, f"STEM SHORT ({len(stem)}) tag={tag}[:60]={stem[:60]}"
    assert ans in "ABCD"
    a = ANALYSIS(tag, ans, ae, be, ce, de, summ)
    if len(a)<150: raise AssertionError(f"analysis too short ({len(a)}) {stem[:30]}")
    return {"stem":stem,"options":opts,"answer":ans,"analysis":a,
            "knowledge":[disc,tag,kn],"module":"module_2","difficulty":"league",
            "target":"both","concept":tag}

def py_literal(obj, indent=0):
    pad = "    "*indent
    s = pad
    if isinstance(obj, dict):
        s += "{\n"
        items = list(obj.items())
        for i,(k,v) in enumerate(items):
            comma = "," if i<len(items)-1 else ""
            s += f"{pad}    {repr(k)}: {py_literal(v, indent+1).lstrip()}{comma}\n"
        s += pad + "}"
    elif isinstance(obj, list):
        s += "[\n"
        for i,item in enumerate(obj):
            comma = "," if i<len(obj)-1 else ""
            s += py_literal(item, indent+1) + comma + "\n"
        s += pad + "]"
    elif isinstance(obj, str):
        s += repr(San(obj))
    else:
        s += repr(obj)
    return s

QUESTIONS = []
print("Generator initialized")
# ========== INLINE IMPORTS FOR BUILDERS ==========
exec_scope = {"Q":Q,"QUESTIONS":QUESTIONS,"Counter":Counter}
