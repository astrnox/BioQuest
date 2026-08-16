# -*- coding: utf-8 -*-
import json, re, sys

def sanitize(s):
    s = s.replace("\u207a", "+").replace("\u207b", "-")
    s = s.replace("\uff08", "(").replace("\uff09", ")")
    s = s.replace("\uff0c", ",").replace("\uff1a", ":")
    s = s.replace("\uff1b", ";").replace("\uff01", "!")
    s = s.replace("\uff1f", "?").replace("\u3001", ",")
    s = s.replace("\u201c", '"').replace("\u201d", '"')
    s = s.replace("\u2018", "'").replace("\u2019", "'")
    s = s.replace("\u2014", "-").replace("\u2026", "...")
    return s

def mkq(stem, opts, ans, analysis, discipline, tag, kn_point):
    stem = sanitize(stem)
    opts = {k: sanitize(v) for k,v in opts.items()}
    analysis = sanitize(analysis)
    kn_point = sanitize(kn_point)
    assert len(stem) >= 15, f"stem too short: {stem[:50]}"
    for k in "ABCD":
        assert k in opts, f"missing option {k}"
    assert ans in "ABCD"
    assert len(analysis) >= 150, f"analysis too short ({len(analysis)}): {analysis[:100]}"
    return {
        "stem": stem, "options": opts, "answer": ans, "analysis": analysis,
        "knowledge": [discipline, tag, kn_point],
        "module": "module_2", "difficulty": "league", "target": "both",
        "concept": tag
    }

def P(tag, stem, opts, ans, analysis, kn):
    return mkq(stem, opts, ans, analysis, "植物学", tag, kn)

def M(tag, stem, opts, ans, analysis, kn):
    return mkq(stem, opts, ans, analysis, "微生物学", tag, kn)

def L(tpl):
    tag, stem, opts_d, ans, a_exp, b_exp, c_exp, d_exp, summary, kn = tpl
    letters = "ABCD"
    if ans == "A":
        analysis = (f"A选项正确。{a_exp}\n"
                    f"B选项错误，{b_exp}\n"
                    f"C选项错误，{c_exp}\n"
                    f"D选项错误，{d_exp}\n"
                    f"总结：{summary}。本题考查联赛{tag}核心知识点与实验证据的对应，是典型的综合应用分析题型，需准确掌握分子机制与遗传学证据才能做出正确判断。")
    elif ans == "B":
        analysis = (f"A选项错误，{a_exp}\n"
                    f"B选项正确。{b_exp}\n"
                    f"C选项错误，{c_exp}\n"
                    f"D选项错误，{d_exp}\n"
                    f"总结：{summary}。本题考查联赛{tag}核心知识点与实验证据的对应，是典型的综合应用分析题型，需准确掌握分子机制与遗传学证据才能做出正确判断。")
    elif ans == "C":
        analysis = (f"A选项错误，{a_exp}\n"
                    f"B选项错误，{b_exp}\n"
                    f"C选项正确。{c_exp}\n"
                    f"D选项错误，{d_exp}\n"
                    f"总结：{summary}。本题考查联赛{tag}核心知识点与实验证据的对应，是典型的综合应用分析题型，需准确掌握分子机制与遗传学证据才能做出正确判断。")
    else:
        analysis = (f"A选项错误，{a_exp}\n"
                    f"B选项错误，{b_exp}\n"
                    f"C选项错误，{c_exp}\n"
                    f"D选项正确。{d_exp}\n"
                    f"总结：{summary}。本题考查联赛{tag}核心知识点与实验证据的对应，是典型的综合应用分析题型，需准确掌握分子机制与遗传学证据才能做出正确判断。")
    opts = {"A": opts_d[0], "B": opts_d[1], "C": opts_d[2], "D": opts_d[3]}
    discipline = "植物学" if tag in ["植物组织","光合作用","植物激素","植物物质运输"] else "微生物学"
    return mkq(stem, opts, ans, analysis, discipline, tag, kn)

QUESTIONS = []
