#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Q80 批次落库脚本：
1. 读取 q80_data_m1~m4.py 的 80 道题；
2. 校验 tag 覆盖（manifest 80 考点各 1 道）；
3. 按编号规范生成 id：M{模块}-{主题序号}-{内容sha256前8位}；
   主题序号 = 该 tag 已有题数 + 1（两位零填充）；
4. 写入 per-id 真源 data/questions/<tag>/league/<id>.json；
5. 调用 rebuild-bank-perid.py build --per-id-only 再生四件套。
"""
import hashlib
import importlib.util
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
QUESTIONS_DIR = ROOT / "data" / "questions"
MANIFEST = ROOT / "data" / "manifest.json"

sys.path.insert(0, str(Path(__file__).resolve().parent))


def load_module(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).resolve().parent / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.QUESTIONS


def canonical_json(obj):
    return json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def main():
    questions = []
    for m in ("q80_data_m1", "q80_data_m2", "q80_data_m3", "q80_data_m4"):
        questions.extend(load_module(m))
    print(f"载入题目: {len(questions)}")

    # 1) tag 覆盖校验
    mf = json.loads(MANIFEST.read_text(encoding="utf-8"))
    all_tags = [t["id"] for t in mf.get("topics", []) if t.get("id")]
    new_tags = [q["tag"] for q in questions]
    assert len(new_tags) == len(set(new_tags)), "新题 tag 有重复"
    missing = set(all_tags) - set(new_tags)
    extra = set(new_tags) - set(all_tags)
    if missing or extra:
        print(f"[FAIL] 覆盖不全: missing={sorted(missing)} extra={sorted(extra)}")
        return 1
    print(f"tag 覆盖校验通过: {len(all_tags)} 考点各 1 道")

    # 2) 统计各 tag 已有题数（主题序号接续）
    existing_count = {}
    if QUESTIONS_DIR.exists():
        for qf in QUESTIONS_DIR.glob("*/*/*.json"):
            if qf.name == "id-all.json":
                continue
            existing_count[qf.parts[-3]] = existing_count.get(qf.parts[-3], 0) + 1

    written = 0
    for q in questions:
        tag = q["tag"]
        module = q["module"]
        mnum = re.match(r"module_(\d+)", module).group(1)
        seq = existing_count.get(tag, 0) + 1

        obj = {
            "type": "mtf",
            "question": q["question"],
            "subQuestions": [
                {"label": lab, "text": text, "answer": ans}
                for (lab, text, ans) in q["options"]
            ],
            "explanation": q["explanation"],
            "subject": q["subject"],
            "concept": q["concept"],
            "difficulty": "league",
            "target": "competition",
            "tags": [tag, module, q["subject"], q["concept"]],
            "references": [],
        }

        # 内容寻址 id：规范内容（不含 id）sha256 前 8 位
        content_hash = hashlib.sha256(canonical_json(obj).encode("utf-8")).hexdigest()[:8]
        # 幂等：同内容（哈希相同）已入库则跳过，无论序号如何
        dup = list((QUESTIONS_DIR / tag / "league").glob(f"*-{content_hash}.json")) if (QUESTIONS_DIR / tag / "league").exists() else []
        if dup:
            print(f"  跳过（已存在） {dup[0].name}")
            continue
        qid = f"M{mnum}-{seq:02d}-{content_hash}"

        path = QUESTIONS_DIR / tag / "league" / f"{qid}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(canonical_json(obj), encoding="utf-8")
        written += 1
        print(f"  写入 {tag}/league/{qid}.json  (正确项 {sum(1 for o in q['options'] if o[2])} 个)")

    print(f"共写入 {written} 道，开始再生四件套...")
    import subprocess
    r = subprocess.run(
        [sys.executable, str(ROOT / "tools" / "python" / "rebuild-bank-perid.py"), "build", "--per-id-only"],
        cwd=ROOT, capture_output=True, text=True)
    print(r.stdout)
    if r.returncode != 0:
        print(r.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
