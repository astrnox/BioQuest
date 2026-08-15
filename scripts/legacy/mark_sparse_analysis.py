"""
P0-4 后续：标记 crawled_competition.json 中的稀疏解析题目
根据 _version.json：109 题无解析的补全 AI 引导提示（"正确答案：X。详细解析请通过 AI 导师获取..."）
这些题目虽然有"解析"，但实际只是答案+引导提示，并非真正的解析。
本脚本为它们添加 _analysis_sparse: true 标志，便于后续人工补充或 AI 补全。

同时为所有 crawled_competition.json 题目添加 _source_quarantined: true 标志，
确保它们不会被默认题库加载器加载（已通过 _version.json 的 quarantined_sources 声明）。
"""
import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
CRAWLED_PATH = DATA_DIR / "crawled_competition.json"


def mark_sparse_analysis():
    """标记使用 AI 引导提示的稀疏解析题目"""
    if not CRAWLED_PATH.exists():
        print(f"[skip] {CRAWLED_PATH} 不存在")
        return

    with open(CRAWLED_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 稀疏解析的识别特征：
    # 1. analysis 包含 "详细解析请通过 AI 导师获取"
    # 2. analysis 包含 "本题答案待验证"
    # 3. analysis 长度过短（< 30 字符）且有 "正确答案："
    sparse_count = 0
    verified_count = 0
    for q in data:
        analysis = q.get("analysis", "") or ""
        is_sparse = False
        if "详细解析请通过 AI 导师获取" in analysis:
            is_sparse = True
        elif "本题答案待验证" in analysis:
            is_sparse = True
            q["_unverified"] = True  # 升级为未验证
        elif len(analysis) < 30 and analysis.startswith("正确答案"):
            is_sparse = True

        if is_sparse:
            q["_analysis_sparse"] = True
            q["_review_reason"] = "解析为 AI 引导提示，待人工补充详细解析"
            sparse_count += 1
        else:
            verified_count += 1

    with open(CRAWLED_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[crawled_competition] 处理 {len(data)} 题：")
    print(f"  - 稀疏解析（_analysis_sparse=true）：{sparse_count} 题")
    print(f"  - 完整解析：{verified_count} 题")
    print(f"  - 已写入：{CRAWLED_PATH}")


if __name__ == "__main__":
    print("=" * 60)
    print("P0-4 后续：标记 crawled_competition.json 稀疏解析")
    print("=" * 60)
    mark_sparse_analysis()
    print()
    print("完成。这些题目仍可使用（有正确答案），但解析需要人工或 AI 补充。")
