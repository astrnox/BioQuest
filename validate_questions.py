#!/usr/bin/env python3
"""Comprehensive validation of the rebuilt question system."""
import json
import hashlib
from pathlib import Path
from collections import defaultdict

BANK_DIR = Path("data/bank")
INDEX_DIR = Path("data/index")
MANIFEST_FILE = Path("data/manifest.json")
KG_FILE = Path("data/knowledge-graph.json")

print("=" * 60)
print("题库系统重建验证报告")
print("=" * 60)

# 1. 加载数据
with open(MANIFEST_FILE) as f:
    manifest = json.load(f)
with open(KG_FILE) as f:
    kg = json.load(f)

# 2. 验证题目ID唯一性
print("\n[1/6] 验证题目ID唯一性...")
all_ids = []
for bank_file in BANK_DIR.glob("*.json"):
    with open(bank_file) as f:
        data = json.load(f)
    all_ids.extend(data.keys())

unique_ids = set(all_ids)
if len(all_ids) == len(unique_ids):
    print(f"✓ 通过: {len(all_ids)} 个题目ID全部唯一")
else:
    print(f"✗ 失败: 发现 {len(all_ids) - len(unique_ids)} 个重复ID")

# 3. 验证每个tag至少有5道题目
print("\n[2/6] 验证每个tag至少有5道题目...")
tag_counts = defaultdict(int)
for bank_file in BANK_DIR.glob("*.json"):
    tag_id = bank_file.stem
    with open(bank_file) as f:
        data = json.load(f)
    tag_counts[tag_id] = len(data)

insufficient_tags = [tag for tag, count in tag_counts.items() if count < 5]
if not insufficient_tags:
    print(f"✓ 通过: 所有 {len(tag_counts)} 个tag都有至少5道题目")
else:
    print(f"✗ 失败: {len(insufficient_tags)} 个tag题目不足5道:")
    for tag in insufficient_tags:
        print(f"  - {tag}: {tag_counts[tag]} 道")

# 4. 验证选项分布合理性
print("\n[3/6] 验证选项分布合理性...")
total_options = 0
correct_options = 0
for bank_file in BANK_DIR.glob("*.json"):
    with open(bank_file) as f:
        data = json.load(f)
    for qid, question in data.items():
        for sub in question.get("subQuestions", []):
            total_options += 1
            if sub.get("answer"):
                correct_options += 1

accuracy = correct_options / total_options if total_options > 0 else 0
if 0.45 <= accuracy <= 0.55:
    print(f"✓ 通过: 平均正确率 {accuracy:.2%} (目标: 45%-55%)")
else:
    print(f"⚠ 警告: 平均正确率 {accuracy:.2%} 偏离目标范围")

# 5. 验证联赛/高考比例
print("\n[4/6] 验证联赛/高考比例...")
competition_count = 0
high_school_count = 0
for bank_file in BANK_DIR.glob("*.json"):
    with open(bank_file) as f:
        data = json.load(f)
    for qid, question in data.items():
        target = question.get("target", "")
        if target == "competition":
            competition_count += 1
        elif target == "high_school":
            high_school_count += 1

total = competition_count + high_school_count
comp_ratio = competition_count / total if total > 0 else 0
hs_ratio = high_school_count / total if total > 0 else 0

if 0.55 <= comp_ratio <= 0.65:
    print(f"✓ 通过: 联赛题目 {comp_ratio:.1%} (目标: 60%)")
else:
    print(f"⚠ 警告: 联赛题目 {comp_ratio:.1%} 偏离目标")

if 0.35 <= hs_ratio <= 0.45:
    print(f"✓ 通过: 高考题目 {hs_ratio:.1%} (目标: 40%)")
else:
    print(f"⚠ 警告: 高考题目 {hs_ratio:.1%} 偏离目标")

# 6. 验证文献DOI（抽样10%）
print("\n[5/6] 验证联赛题目文献DOI...")
competition_questions = []
for bank_file in BANK_DIR.glob("*.json"):
    with open(bank_file) as f:
        data = json.load(f)
    for qid, question in data.items():
        if question.get("target") == "competition":
            competition_questions.append((qid, question))

sample_size = max(1, len(competition_questions) // 10)
import random
sample = random.sample(competition_questions, min(sample_size, len(competition_questions)))

missing_doi = 0
for qid, question in sample:
    refs = question.get("references", [])
    if not refs:
        missing_doi += 1
        print(f"  ⚠ {qid}: 缺少文献引用")
    else:
        for ref in refs:
            doi = ref.get("doi", "")
            if not doi or not doi.startswith("10."):
                missing_doi += 1
                print(f"  ⚠ {qid}: DOI格式错误 ({doi})")

if missing_doi == 0:
    print(f"✓ 通过: 抽样 {len(sample)} 道联赛题目都有有效DOI")
else:
    print(f"✗ 失败: {missing_doi}/{len(sample)} 道题目DOI有问题")

# 7. 验证manifest.json一致性
print("\n[6/6] 验证manifest.json一致性...")
manifest_total = manifest.get("total_questions", 0)
actual_total = sum(tag_counts.values())

if manifest_total == actual_total:
    print(f"✓ 通过: manifest总题数 {manifest_total} 与实际一致")
else:
    print(f"✗ 失败: manifest总题数 {manifest_total} ≠ 实际 {actual_total}")

# 检查文件哈希
manifest_files = manifest.get("files", {})
hash_errors = 0
for file_path, expected_hash in list(manifest_files.items())[:10]:  # 只检查前10个
    full_path = Path("data") / file_path
    if full_path.exists():
        with open(full_path, "rb") as f:
            actual_hash = hashlib.sha256(f.read()).hexdigest()
        if actual_hash != expected_hash:
            hash_errors += 1
            print(f"  ⚠ {file_path}: 哈希不匹配")

if hash_errors == 0:
    print(f"✓ 通过: 文件哈希验证正确")
else:
    print(f"⚠ 警告: {hash_errors} 个文件哈希不匹配")

# 总结
print("\n" + "=" * 60)
print("验证总结")
print("=" * 60)
print(f"总题目数: {actual_total}")
print(f"Tag数量: {len(tag_counts)}")
print(f"联赛题目: {competition_count} ({comp_ratio:.1%})")
print(f"高考题目: {high_school_count} ({hs_ratio:.1%})")
print(f"平均正确率: {accuracy:.2%}")
print("=" * 60)
