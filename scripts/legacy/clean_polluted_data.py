"""
修复 P0-4：题库数据清洗
1. crawled_competition.json：将剩余的 【解析待补充】 替换为 AI 引导提示
2. quiz_auto_generated.json：选项污染题目标记为待修复（添加 _needs_review 字段）

由于答案 PDF 不可用，无法自动补全解析。采用以下策略：
- 有答案无解析的题目：用"正确答案：X" + AI 引导提示替代占位符
- 无答案无解析的题目：标记为 _unverified=true，从活跃题库中排除
- quiz_auto_generated.json：全量标记 _needs_review=true，从活跃题库中排除
"""
import json
import os
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
CRAWLED_PATH = DATA_DIR / "crawled_competition.json"
AUTO_GEN_PATH = DATA_DIR / "quiz_auto_generated.json"


def clean_crawled():
    """清洗 crawled_competition.json：替换 【解析待补充】"""
    if not CRAWLED_PATH.exists():
        print(f"[skip] {CRAWLED_PATH} 不存在")
        return

    with open(CRAWLED_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    fixed = 0
    unverified = 0
    for q in data:
        analysis = q.get("analysis", "")
        if analysis == "【解析待补充】":
            # 从 answer 字段提取正确答案
            answer = q.get("answer", {})
            correct_letters = [k for k, v in answer.items() if v is True]
            if correct_letters:
                correct_str = "".join(sorted(correct_letters))
                q["analysis"] = f"正确答案：{correct_str}。详细解析请通过 AI 导师获取（在 AI 对话中粘贴本题题干即可）。"
                fixed += 1
            else:
                # 无答案也无解析 → 标记为未验证，从活跃题库排除
                q["analysis"] = "本题答案待验证，已从练习池中排除。"
                q["_unverified"] = True
                unverified += 1

    with open(CRAWLED_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[crawled_competition] 处理 {len(data)} 题：")
    print(f"  - 补全解析（有答案）：{fixed} 题")
    print(f"  - 标记未验证（无答案）：{unverified} 题")


def clean_auto_generated():
    """清洗 quiz_auto_generated.json：标记选项污染题目"""
    if not AUTO_GEN_PATH.exists():
        print(f"[skip] {AUTO_GEN_PATH} 不存在")
        return

    with open(AUTO_GEN_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 结构：{ "题库": [ {...}, ... ] }
    questions = data.get("题库", []) if isinstance(data, dict) else data

    # 全量标记为 _needs_review，从活跃题库中排除
    # 审计报告确认存在选项跨题污染（如三羧酸循环题选项出现"剪接""转录因子"）
    marked = 0
    for q in questions:
        if isinstance(q, dict):
            q["_needs_review"] = True
            q["_review_reason"] = "选项可能存在跨题污染，待人工校验后才能用于练习"
            marked += 1

    with open(AUTO_GEN_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[quiz_auto_generated] 标记 {marked} 题为 _needs_review（已从活跃题库排除）")


if __name__ == "__main__":
    print("=" * 60)
    print("修复 P0-4：题库数据清洗")
    print("=" * 60)
    clean_crawled()
    print()
    clean_auto_generated()
    print()
    print("完成。详见 PRD.md §6.3 数据治理。")
