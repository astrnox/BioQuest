#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""同步 18 道期刊图题目到 data/bank、data/index、data/questions/id-all.json、data/manifest.json
用法: python3 scripts/sync_question_images.py
"""
import json, os, re, hashlib, glob, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")

def sha256_hex(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()

def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)

def dump(p, obj):
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
    os.replace(tmp, p)

# ---- 发现所有 source 题目（本次涉及）----
src_ids = []
for tag_dir in sorted(os.listdir(os.path.join(DATA, "questions"))):
    tdir = os.path.join(DATA, "questions", tag_dir)
    if not os.path.isdir(tdir):
        continue
    for diff_dir in sorted(os.listdir(tdir)):
        ddir = os.path.join(tdir, diff_dir)
        if not os.path.isdir(ddir):
            continue
        for fn in sorted(os.listdir(ddir)):
            if fn.endswith(".json"):
                src_ids.append((tag_dir, diff_dir, fn))

# 只同步 18 道题目（带 @@ANNOTATED_IMAGE 标记的，即本次新增/更新的期刊图题目）
targets = []
for tag, diff, fn in src_ids:
    p = os.path.join(DATA, "questions", tag, diff, fn)
    q = load(p)
    if "@@ANNOTATED_IMAGE:" in q.get("explanation", ""):
        targets.append((tag, diff, fn, q))

print(f"本次同步题目数: {len(targets)}")

banks = {}   # tag -> {id: q}
indexes = {}
idall = load(os.path.join(DATA, "questions", "id-all.json"))

for tag, diff, fn, q in targets:
    qid = fn[:-5]
    bn = q.get("tags", [])
    mod = next((t for t in bn if re.match(r"^module_[1-4]$", t)), q.get("module", ""))
    banks.setdefault(tag, {}).__setitem__(qid, q)
    indexes.setdefault(tag, {})[qid] = {
        "diff": q.get("difficulty", "league"),
        "difficulty": q.get("difficulty", "league"),
        "has_image": True,
        "len": len(q.get("question", "")),
        "module": mod,
        "src": tag,
        "tag": tag,
        "tags": bn,
        "target": q.get("target", "competition"),
        "year": None,
    }
    idall["questions"][qid] = {
        "concept": q.get("concept", ""),
        "difficulty": q.get("difficulty", "league"),
        "file": f"{tag}/{diff}/{fn}",
        "has_image": True,
        "len": len(q.get("question", "")),
        "subject": q.get("subject", ""),
        "tag": tag,
        "target": q.get("target", "competition"),
        "type": q.get("type", "mtf"),
    }

# ---- bank：合并进现有分片 ----
for tag, items in banks.items():
    bp = os.path.join(DATA, "bank", tag + ".json")
    cur = load(bp) if os.path.exists(bp) else {}
    # 已存在同 id 旧题：整题替换（内容已更新）
    cur.update({k: items[k] for k in items})
    dump(bp, cur)
    print(f"[bank] {tag}: {len(cur)} 题")

# ---- index：合并 ----
for tag, items in indexes.items():
    ip = os.path.join(DATA, "index", tag + ".json")
    cur = load(ip) if os.path.exists(ip) else {}
    cur.update({k: items[k] for k in items})
    dump(ip, cur)
    print(f"[index] {tag}: {len(cur)} 题")

# ---- id-all ----
dump(os.path.join(DATA, "questions", "id-all.json"), idall)
print(f"[id-all] questions={len(idall['questions'])}")

# ---- manifest：仅更新 manifest 已声明的 bank 分片 ----
mp = os.path.join(DATA, "manifest.json")
mf = load(mp)
total = 0
bank_tags = sorted(t for t in mf["files"] if t.startswith("bank/"))
sources_by_tag = {s["tag"]: s for s in mf["sources"]}
for rel in bank_tags:
    tag = rel[len("bank/"):-len(".json")]
    bp = os.path.join(DATA, "bank", tag + ".json")
    n = len(load(bp))
    if tag in sources_by_tag:
        sources_by_tag[tag]["count"] = n
    mf["files"][f"bank/{tag}.json"] = sha256_hex(bp)
    ip = os.path.join(DATA, "index", tag + ".json")
    if os.path.exists(ip):
        mf["files"][f"index/{tag}.json"] = sha256_hex(ip)
for s in mf["sources"]:
    total += s.get("count", 0)
mf["files"]["questions/id-all.json"] = sha256_hex(os.path.join(DATA, "questions", "id-all.json"))
mf["total_questions"] = total
mf["rev"] = mf.get("rev", 0) + 1
mf["updated_at"] = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")
dump(mp, mf)
print(f"[manifest] rev={mf['rev']} total={total} bank_tags={len(bank_tags)}")

print("DONE")