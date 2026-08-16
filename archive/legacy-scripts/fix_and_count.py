# -*- coding: utf-8 -*-
"""
Fix all missing "options": keys in current file AND append all remaining questions
to reach exactly 200 with correct tag counts.
"""
import re, ast
from collections import Counter

PATH = "/workspace/data/comp_batch_c_m2_plant_microbe.py"

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

# Step 1: Fix missing "options": key
# Pattern: after a line that ends with ", (stem closing), a line starts with whitespace + {"A"
# We want to insert "options": before the dict.

fixed_lines = []
lines = src.split("\n")
i = 0
while i < len(lines):
    line = lines[i]
    stripped = line.lstrip()
    # Match lines that are dict literal { "A":... missing "options":
    if stripped.startswith('{"A":"') or stripped.startswith('{"A": "'):
        # Calculate indent
        indent = line[: len(line) - len(stripped)]
        fixed_lines.append(indent + '"options": ' + stripped)
    else:
        fixed_lines.append(line)
    i += 1
src_fixed = "\n".join(fixed_lines)

# Verify fix by parsing
try:
    ast.parse(src_fixed)
    print("✅ Step 1 fix: missing 'options': keys repaired. Syntax valid.")
    ns = {}
    exec(compile(src_fixed, "tmp_fixed.py", "exec"), ns)
    Q_fixed = ns["QUESTIONS"]
    cnt = Counter(q["concept"] for q in Q_fixed)
    print(f"Current counts after fix ({len(Q_fixed)} total):")
    for k in ["植物组织", "光合作用", "植物激素", "植物物质运输", "细菌", "病毒", "微生物生态"]:
        print(f"  {k}: {cnt.get(k, 0)}")
except SyntaxError as e:
    print(f"❌ Syntax error after fix: {e}")
    with open("/tmp/_m2_debug.py", "w", encoding="utf-8") as f:
        f.write(src_fixed)
    import sys
    sys.exit(1)

# Write back repaired
with open(PATH, "w", encoding="utf-8") as f:
    f.write(src_fixed)

# Now report remaining needed
target = {
    "植物组织": 29,
    "光合作用": 29,
    "植物激素": 28,
    "植物物质运输": 28,
    "细菌": 29,
    "病毒": 28,
    "微生物生态": 29,
}
remaining = {}
for tag, tgt in target.items():
    remaining[tag] = tgt - cnt.get(tag, 0)
total_remaining = sum(remaining.values())
print(f"\n📋 Remaining needed: {total_remaining} questions")
for t, n in remaining.items():
    if n != 0:
        print(f"  {t}: {n:+d}" if n > 0 else f"  {t}: remove {-n}")
