# -*- coding: utf-8 -*-
"""
重审转换后的题目：对 Supabase 中的每道题运行 5 重质量校验链，
不合格的用 GLM-4-Flash 修改（最多 2 次），2 次修改仍失败的从 Supabase 删除。

5 重校验链（来自 server.py）：
1. scientific_sanity_check(q)  科学事实校验
2. proposition_rule_check(q)   命题规则校验
3. distractor_quality_check(q) 干扰项质量校验
4. dedup_check(q, recent_stems) 去重校验
5. self_check(q)               双模型自检（调用 AI）
"""
import os
import sys
import json
import time
import urllib.request
from pathlib import Path


# ---------- 1. 加载 .env ----------
def load_env():
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text("utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        k = k.strip()
        v = v.strip().strip("'\"")
        if k and k not in os.environ:
            os.environ[k] = v


load_env()

SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
if not SERVICE_KEY:
    print("未找到 SUPABASE_SERVICE_ROLE_KEY，请检查 .env")
    sys.exit(1)
# 用 service role key 覆盖 SUPABASE_KEY，使 server.sb_request 能绕过 RLS 读写
os.environ["SUPABASE_KEY"] = SERVICE_KEY

# ---------- 2. import server.py 复用校验函数 ----------
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import server
from server import (
    self_check,
    scientific_sanity_check,
    proposition_rule_check,
    distractor_quality_check,
    dedup_check,
    api_call,
    sb_fetch_all,
    _build_record,
)

SUPABASE_URL = server.SUPABASE_URL
PRIMARY_MODEL = server.PRIMARY_MODEL
_NO_PROXY_OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))


# ---------- 3a. 分页拉取全部题目（绕过 REST API 1000 行上限） ----------
def sb_fetch_all_paged():
    """分页拉取 Supabase 全部题目，返回内部题目 dict 列表（复用 server.sb_fetch_all 的行解析逻辑）。"""
    all_rows = []
    offset = 0
    page_size = 1000
    while True:
        url = f"{SUPABASE_URL}/rest/v1/questions?select=*&offset={offset}&limit={page_size}"
        headers = {
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
        }
        req = urllib.request.Request(url, headers=headers, method="GET")
        try:
            with _NO_PROXY_OPENER.open(req, timeout=30) as resp:
                rows = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            print(f"分页拉取失败 offset={offset}: {e}")
            break
        if not rows:
            break
        all_rows.extend(rows)
        if len(rows) < page_size:
            break
        offset += page_size
    # 复用 server.sb_fetch_all 的行->题目 解析逻辑
    import server as _srv
    pool = []
    for row in all_rows:
        try:
            sq = row.get("sub_questions") or []
            options = {}
            answer = {}
            if isinstance(sq, list):
                for item in sq:
                    label = item.get("label", "")
                    text = item.get("text", "")
                    is_correct = item.get("answer", False)
                    if label:
                        options[label] = text
                        answer[label] = is_correct
            elif isinstance(sq, dict):
                options = sq
                answer = "A"
            answer_str = row.get("answer", "")
            if isinstance(answer_str, str) and ":" in answer_str and "," in answer_str:
                answer = {}
                for part in answer_str.split(","):
                    if ":" in part:
                        k, v = part.split(":", 1)
                        answer[k.strip()] = v.strip().upper() == "T"
            tags = row.get("tags") or []
            target = row.get("target")
            if not target and tags:
                for t in ["high_school", "competition", "both", "multi_judge"]:
                    if t in tags:
                        target = t
                        break
            target = target or "competition"
            q = {
                "id": row.get("id", f"bio_{int(time.time()*1000)}"),
                "stem": row.get("question") or "",
                "options": options,
                "answer": answer,
                "analysis": row.get("explanation") or "",
                "knowledge": tags,
                "module": row.get("module", "module_1"),
                "difficulty": row.get("difficulty", "medium"),
                "target": target,
                "subject": row.get("subject", ""),
                "concept": row.get("concept", ""),
                "tags": tags,
                "weight": row.get("weight", 1.0),
                "fb_good": row.get("fb_good", 0),
                "fb_bad": row.get("fb_bad", 0),
                "created_at": time.time(),
            }
            if row.get("chart"):
                q["chart"] = row["chart"]
            pool.append(q)
        except Exception as e:
            print(f"解析行失败: {e}")
            continue
    return pool


# 第一轮已修改成功（通过全部校验）的题目 id，本轮跳过避免重复校验
SKIP_IDS = {
    "bio_1782546020308_6755", "bio_1783460025687_9532", "bio_1782524959915_6726",
    "bio_1782546134697_1870", "bio_1783465658821_5619", "bio_1782542916802_5970",
    "bio_1782525888871_8566", "bio_1783254399209_4947", "bio_1783291651026_0336",
    "bio_1783450906276_3467", "bio_1783454903348_5243", "bio_1783253541940_0526",
    "bio_1782540754698_5633", "bio_1782543750526_5200", "bio_1783463846715_1481",
    "bio_1782541964107_6859", "bio_1783466439792_2723", "bio_1782544288896_3678",
    "bio_1782540766969_0408", "bio_1783255281822_3083", "bio_1782544822055_2033",
    "bio_1783255165420_0355", "bio_1783291770419_2966", "bio_1783449557600_4596",
}


# ---------- 3. Supabase DELETE / PATCH 工具（用 service role key） ----------
def sb_delete(qid):
    url = f"{SUPABASE_URL}/rest/v1/questions?id=eq.{qid}"
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    req = urllib.request.Request(url, headers=headers, method="DELETE")
    try:
        with _NO_PROXY_OPENER.open(req, timeout=20) as resp:
            return resp.status in (200, 204)
    except Exception as e:
        print(f"   DELETE 失败 {qid}: {e}")
        return False


def sb_patch(qid, record):
    url = f"{SUPABASE_URL}/rest/v1/questions?id=eq.{qid}"
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    data = json.dumps(record).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="PATCH")
    try:
        with _NO_PROXY_OPENER.open(req, timeout=20) as resp:
            return resp.status in (200, 204)
    except Exception as e:
        print(f"   PATCH 失败 {qid}: {e}")
        return False


# ---------- 4. 5 重校验链 ----------
def run_checks(q, recent_stems):
    """返回 (passed: bool, reason: str)。本地校验在前，self_check 最后。"""
    try:
        if not scientific_sanity_check(q):
            return False, "scientific_sanity_check 失败（科学事实/格式）"
    except Exception as e:
        return False, f"scientific_sanity_check 异常: {e}"
    try:
        if not proposition_rule_check(q):
            return False, "proposition_rule_check 失败（命题规则）"
    except Exception as e:
        return False, f"proposition_rule_check 异常: {e}"
    try:
        if not distractor_quality_check(q):
            return False, "distractor_quality_check 失败（干扰项质量）"
    except Exception as e:
        return False, f"distractor_quality_check 异常: {e}"
    try:
        if not dedup_check(q, recent_stems):
            return False, "dedup_check 失败（与已有题相似>0.88）"
    except Exception as e:
        return False, f"dedup_check 异常: {e}"
    try:
        ok, model_answer = self_check(q)
        if not ok:
            return False, f"self_check 不一致（模型答:{model_answer}）"
    except Exception as e:
        return False, f"self_check 异常: {e}"
    return True, "ok"


# ---------- 5. AI 修正 ----------
def _normalize_answer(ans):
    """把模型返回的答案归一化为 单字母 或 {A:bool,...}。失败返回 None。"""
    if isinstance(ans, dict):
        d = {k: bool(v) for k, v in ans.items() if k in "ABCD"}
        if len(d) == 4:
            return d
        return None
    if isinstance(ans, bool) or ans is None:
        return None
    s = str(ans).strip().upper()
    if ":" in s and "," in s:
        d = {}
        for part in s.split(","):
            if ":" in part:
                k, v = part.split(":", 1)
                k = k.strip()
                v = v.strip().upper()
                if k in "ABCD":
                    d[k] = v in ("T", "TRUE", "1", "Y", "YES")
        if len(d) == 4:
            return d
    if s.isalpha() and all(c in "ABCD" for c in s):
        if len(s) == 1:
            return s
        d = {k: (k in s) for k in "ABCD"}
        if 2 <= sum(d.values()) <= 3:
            return d
    if len(s) == 1 and s in "ABCD":
        return s
    return None


def ai_fix(q, reason):
    """用 GLM-4-Flash 修正题目。返回新的内部题目 dict 或 None。"""
    opts_desc = "\n".join(f"{k}. {v}" for k, v in q["options"].items())
    ans = q["answer"]
    if isinstance(ans, dict):
        ans_desc = ",".join(f"{k}:{'T' if v else 'F'}" for k, v in sorted(ans.items()))
    else:
        ans_desc = str(ans)
    is_multi = isinstance(ans, dict)

    prompt = (
        "以下是一道生物题目，未通过自动质量校验，请修正后重新输出。\n"
        f"【校验失败原因】{reason}\n\n"
        f"【原题干】{q['stem']}\n【原选项】\n{opts_desc}\n【原答案】{ans_desc}\n"
        f"【原解析】{q['analysis']}\n【知识点】{q.get('knowledge', [])}\n"
        f"【模块】{q.get('module', 'module_1')} 【难度】{q.get('difficulty', 'medium')} "
        f"【目标】{q.get('target', 'competition')}\n\n"
        "【修正要求】\n"
        "1. 解析必须逐项覆盖 A/B/C/D 四个字母\n"
        "2. 选项不得包含“以上都对/以上都错/无法确定”等无效表述\n"
        "3. 题干>=15字，解析>=120字（高考题>=100字）\n"
        "4. 任意两个选项之间不得存在子串包含关系\n"
        "5. 干扰项须含学科术语，与正确选项长度相近、内容相关\n"
        "6. 答案科学正确，与题干一致\n"
    )
    if is_multi:
        prompt += '7. 多重判断题：answer 为对象 {"A":true,"B":false,"C":true,"D":false}，正确选项2-3个\n'
    else:
        prompt += '7. 单选题：answer 为单个字母 "A"/"B"/"C"/"D"\n'
    prompt += (
        "8. knowledge 为至少 2 项的数组\n\n"
        "输出严格 JSON（不要 markdown、不要解释），字段：\n"
        '{"stem":string, "options":{"A":string,"B":string,"C":string,"D":string}, '
        '"answer":<字母或对象>, "analysis":string, "knowledge":[string,...]}'
    )
    msg = [{"role": "user", "content": prompt}]
    r = api_call(PRIMARY_MODEL, msg, temperature=0.4, max_tokens=1400, json_mode=True)
    if not r:
        return None
    try:
        content = r["choices"][0]["message"]["content"]
        obj = json.loads(content)
    except Exception as e:
        print(f"   AI 返回解析失败: {e}")
        return None

    for k in ("stem", "options", "answer", "analysis"):
        if k not in obj:
            return None
    opts = obj["options"]
    if not isinstance(opts, dict) or not all(k in opts for k in "ABCD"):
        return None
    if not all(isinstance(opts[k], str) and opts[k].strip() for k in "ABCD"):
        return None

    ans_n = _normalize_answer(obj["answer"])
    if ans_n is None:
        return None

    know = obj.get("knowledge")
    if not isinstance(know, list) or len(know) < 2:
        know = q.get("knowledge", [])[:2] or ["生物", "综合"]
    if len(know) < 2:
        know = (know + ["生物", "综合"])[:2]

    new_q = {
        "id": q["id"],
        "stem": obj["stem"].strip(),
        "options": {k: opts[k].strip() for k in "ABCD"},
        "answer": ans_n,
        "analysis": obj["analysis"].strip(),
        "knowledge": know,
        "module": q.get("module", "module_1"),
        "difficulty": q.get("difficulty", "medium"),
        "target": q.get("target", "competition"),
        "subject": q.get("subject", ""),
        "concept": q.get("concept", ""),
        "tags": q.get("tags", []),
        "weight": q.get("weight", 1.0),
    }
    if q.get("chart"):
        new_q["chart"] = q["chart"]
    return new_q


# ---------- 6. 主流程 ----------
def main():
    # 读取转换后题目的 id 集合（任务范围：仅重审这 346 道转换题）
    conv_path = Path(__file__).resolve().parent / "converted-questions.json"
    conv_ids = set()
    if conv_path.exists():
        try:
            conv = json.loads(conv_path.read_text("utf-8"))
            conv_ids = {r.get("id") for r in conv if r.get("id")}
        except Exception as e:
            print(f"读取 converted-questions.json 失败: {e}")
    print(f"转换题目 id 集合大小：{len(conv_ids)}")

    print("=" * 60)
    print("拉取 Supabase 全部题目（分页） ...")
    full_pool = sb_fetch_all_paged()
    if not full_pool:
        print("拉取失败或为空，退出")
        return
    print(f"Supabase 共 {len(full_pool)} 道题。")

    # 去重比对集：用全部题干（避免转换题与已存在题重复）
    all_id_stems = [(q2.get("id"), q2.get("stem", "")) for q2 in full_pool]

    # 仅审查转换后的题目，跳过第一轮已修改成功的（已通过全部校验）
    if conv_ids:
        pool = [q for q in full_pool if q.get("id") in conv_ids and q.get("id") not in SKIP_IDS]
    else:
        pool = [q for q in full_pool if q.get("id") not in SKIP_IDS]
    total = len(pool)
    skipped = len(conv_ids & SKIP_IDS) if conv_ids else 0
    print(f"本次重审范围：{total} 道转换题（跳过已修改 {skipped} 道）。开始 5 重校验链（self_check 调 AI，耐心等待）...")
    print("=" * 60)

    already_ok = 0
    fix_success = 0
    fix_fail = 0
    fixed_ids = []
    deleted_ids = []

    t0 = time.time()
    for idx, q in enumerate(pool, 1):
        qid = q["id"]
        # 去重比对集：排除当前题目自身（按 id），保留其他题的题干以发现重复
        recent_stems = [s for (qid2, s) in all_id_stems if qid2 != qid]

        ok, reason = run_checks(q, recent_stems)
        if ok:
            already_ok += 1
            if idx % 20 == 0 or idx == total:
                elapsed = time.time() - t0
                print(f"[{idx}/{total}] 已通过 {already_ok} | 用时 {elapsed:.0f}s")
            continue

        print(f"[{idx}/{total}] FAIL {qid}：{reason}")
        cur_q = q
        fixed = False
        for attempt in (1, 2):
            print(f"   -> 第 {attempt} 次 AI 修正 ...")
            new_q = ai_fix(cur_q, reason)
            if new_q is None:
                print(f"   第 {attempt} 次修正返回为空")
                continue
            ok2, reason2 = run_checks(new_q, recent_stems)
            if ok2:
                record = _build_record(new_q)
                if sb_patch(qid, record):
                    fixed = True
                    fix_success += 1
                    fixed_ids.append(qid)
                    print(f"   OK 第 {attempt} 次修正成功并已更新 Supabase")
                    break
                else:
                    print(f"   修正通过但 PATCH 写回失败，继续尝试")
            else:
                print(f"   第 {attempt} 次修正仍不通过：{reason2}")
                cur_q = new_q
                reason = reason2

        if not fixed:
            if sb_delete(qid):
                deleted_ids.append(qid)
                fix_fail += 1
                print(f"   DEL 2 次修改失败，已从 Supabase 删除 {qid}")
            else:
                print(f"   WARN 2 次修改失败且删除也失败 {qid}")

    elapsed = time.time() - t0
    print("\n" + "=" * 60)
    print("【重审完成】")
    print(f"  校验总数：{total}")
    print(f"  一次通过：{already_ok}")
    print(f"  修改成功：{fix_success}")
    print(f"  删除数量：{fix_fail}")
    print(f"  最终留存：{already_ok + fix_success}")
    print(f"  总耗时：  {elapsed:.0f}s ({elapsed/60:.1f}min)")
    if deleted_ids:
        print(f"  删除的题目 id 列表（{len(deleted_ids)}）：")
        for i in deleted_ids:
            print(f"    - {i}")
    if fixed_ids:
        print(f"  修改成功的题目 id 列表（{len(fixed_ids)}）：")
        for i in fixed_ids:
            print(f"    - {i}")
    print("=" * 60)


if __name__ == "__main__":
    main()
