"""
知识图谱高质量题目生成器 v1.0
为 knowledge-graph.json 中每个 tag 生成 5 道联赛/IBO 风格的多重判断题

质量标准：
1. 考点核心、深度恰当——考大纲主干，深达大学普生但不偏怪
2. 情境真实、为考点服务——真实物种/现象或经典实验作入口
3. 选项精炼、单一判断点——短句成题，避免"半对半错"复合句
4. 干扰项"错得有理"——基于竞赛生真实高级误解
5. 区分度来自机制与定量关系——差距设计在"为什么/多少"
6. 科学严谨、无争议——避开过时数据与教材冲突表述
7. 选项独立、答案分布均衡——互不提示、不可靠排除法猜中
8. 整体有主线——四选项围绕同一主题构成微型综述
9. 解析到位——逐项点破陷阱与正解思路并做知识延伸

用法：
  python generate_graph_questions.py --tag plant_respiration --count 5
  python generate_graph_questions.py --all --count 5
"""

import json
import os
import sys
import time
import random
import hashlib
from pathlib import Path
from difflib import SequenceMatcher

# 复用 server.py 的 API 调用和命题规则
sys.path.insert(0, str(Path(__file__).parent))
from server import (
    api_call, PRIMARY_MODEL, SELF_CHECK_MODEL,
    COMPETITION_PROP_RULES, self_check, distractor_quality_check,
    scientific_sanity_check, dedup_check, log
)

# 知识图谱路径
GRAPH_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "knowledge-graph.json"
BANK_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "bank"

# 命题模板：联赛多重判断风格
LEAGUE_MTF_RULES = """你是全国中学生生物学联赛命题专家，命制 2025 联赛风格的多重判断题（每选项独立判断对错），需达到出版级质量。

""" + COMPETITION_PROP_RULES + """

【核心要求】
1. 情境真实：必须使用真实物种名称（如"臭菘""天南星科"）、经典实验或科研前沿作入口，禁止"某种生物""某种植物"等模糊表述
2. 选项独立：每个选项单独判断对错，互不提示、互不依赖
3. 干扰项"错得有理"：基于竞赛生真实高级误解（真前提+假结论、方向颠倒、场所混淆、定量错误）
4. 解析到位：逐项说明对错原因，点破陷阱，做知识延伸，每项≥40字，总解析≥200字
5. 答案分布：正确选项2-3个，错误选项1-2个，避免全对或全错

输出要求：单题精雕，严格输出以下 JSON（无其他内容）：
{
  "stem": "题干（包含真实物种/实验情境，100-200字）",
  "options": {
    "A": "选项A（30-80字，单一判断点）",
    "B": "选项B（30-80字，单一判断点）",
    "C": "选项C（30-80字，单一判断点）",
    "D": "选项D（30-80字，单一判断点）"
  },
  "answer": {"A": true/false, "B": true/false, "C": true/false, "D": true/false},
  "analysis": "逐项解析（≥200字）：\\nA（正确/错误）：...\\nB（正确/错误）：...\\nC（正确/错误）：...\\nD（正确/错误）：...",
  "knowledge": ["学科名", "具体概念"],
  "intent": "命题意图（考察什么能力/知识点）",
  "misconceptions": "干扰项针对的常见错误"
}

【难度控制】
覆盖CBO大纲，可涉及大学普通生物学；可考察具体酶、信号通路、实验技术、定量关系；干扰项体现竞赛生高级误解。
"""


def load_graph():
    """加载知识图谱"""
    if not GRAPH_PATH.exists():
        log.error(f"知识图谱文件不存在: {GRAPH_PATH}")
        return None
    with open(GRAPH_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def generate_question_for_tag(node, existing_stems=None):
    """为指定 tag 生成 1 道高质量题目"""
    tag_id = node["id"]
    label = node["label"]
    category = node["category"]
    description = node["description"]
    key_concepts = node.get("keyConcepts", [])

    # 构建命题提示
    system_prompt = LEAGUE_MTF_RULES
    user_prompt = f"""学科范围：{category}
专项概念：{label}（{description}）
核心概念：{', '.join(key_concepts[:4])}

请生成 1 道高质量联赛风格多重判断题，输出严格 JSON，不要任何额外说明。"""

    if existing_stems:
        dedup = "\n".join(f"- {s[:60]}" for s in existing_stems[-5:])
        user_prompt += f"\n\n【重要】以下题目已存在，新题不得与之语义相似：\n{dedup}"

    # 调用 API 生成
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    try:
        response = api_call(PRIMARY_MODEL, messages, temperature=0.7, max_tokens=2000, json_mode=True)
        if not response or "choices" not in response:
            log.error(f"API 调用失败: {tag_id}")
            return None

        content = response["choices"][0]["message"]["content"].strip()
        # 提取 JSON
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        question = json.loads(content)

        # 质量校验链
        if not scientific_sanity_check(question):
            log.warning(f"科学事实校验未通过: {tag_id}")
            return None

        if not distractor_quality_check(question):
            log.warning(f"干扰项质量校验未通过: {tag_id}")
            return None

        # 自检
        ok, model_answer = self_check(question)
        if not ok:
            log.warning(f"自检未通过: {tag_id}, 模型答案: {model_answer}")
            return None

        # 转换为项目格式
        project_question = {
            "type": "mtf",
            "question": question["stem"],
            "subQuestions": [
                {"label": "A", "text": question["options"]["A"], "answer": question["answer"]["A"]},
                {"label": "B", "text": question["options"]["B"], "answer": question["answer"]["B"]},
                {"label": "C", "text": question["options"]["C"], "answer": question["answer"]["C"]},
                {"label": "D", "text": question["options"]["D"], "answer": question["answer"]["D"]}
            ],
            "explanation": question["analysis"],
            "subject": category,
            "concept": label,
            "difficulty": "competition",
            "target": "multi_judge",
            "tags": [tag_id, f"module_{node.get('relatedModule', '1').replace('module', '')}", category],
            "references": [],
            "intent": question.get("intent", ""),
            "misconceptions": question.get("misconceptions", ""),
            "id": generate_id(tag_id, question["stem"])
        }

        return project_question

    except Exception as e:
        log.error(f"生成题目失败: {tag_id}, 错误: {e}")
        return None


def generate_id(tag, stem):
    """生成题目 ID"""
    hash_input = f"{tag}:{stem}"
    hash_hex = hashlib.md5(hash_input.encode()).hexdigest()[:12]
    return f"GRAPH-{tag}-{hash_hex}"


def save_question(question, tag_id):
    """保存题目到对应的 bank 文件"""
    bank_file = BANK_DIR / f"{tag_id}.json"

    # 加载已有题目
    if bank_file.exists():
        with open(bank_file, "r", encoding="utf-8") as f:
            bank = json.load(f)
    else:
        bank = {}

    # 添加新题目
    bank[question["id"]] = question

    # 保存
    with open(bank_file, "w", encoding="utf-8") as f:
        json.dump(bank, f, ensure_ascii=False, indent=2)

    log.info(f"✅ 保存题目到 {bank_file}: {question['id']}")


def generate_for_tag(tag_id, count=5):
    """为指定 tag 生成 count 道题目"""
    graph = load_graph()
    if not graph:
        return

    # 查找节点
    node = None
    for n in graph["nodes"]:
        if n["id"] == tag_id:
            node = n
            break

    if not node:
        log.error(f"未找到 tag: {tag_id}")
        return

    log.info(f"开始为 {node['label']} ({tag_id}) 生成 {count} 道题目...")

    # 加载已有题目
    bank_file = BANK_DIR / f"{tag_id}.json"
    existing_stems = []
    if bank_file.exists():
        with open(bank_file, "r", encoding="utf-8") as f:
            bank = json.load(f)
            # 兼容两种格式：新格式用 stem，旧格式用 question
            existing_stems = [q.get("stem") or q.get("question") for q in bank.values() if q.get("stem") or q.get("question")]

    # 生成题目
    generated = 0
    attempts = 0
    max_attempts = count * 3  # 允许失败重试

    while generated < count and attempts < max_attempts:
        attempts += 1
        log.info(f"生成第 {generated + 1}/{count} 道题目 (尝试 {attempts}/{max_attempts})...")

        question = generate_question_for_tag(node, existing_stems)
        if question:
            # 去重检查
            if not dedup_check(question, existing_stems):
                log.warning(f"题目与已有题目重复，跳过")
                continue

            save_question(question, tag_id)
            existing_stems.append(question["stem"])
            generated += 1

            # 间隔生成，避免 API 限流
            if generated < count:
                time.sleep(2)
        else:
            log.warning(f"生成失败，重试...")

    log.info(f"✅ 完成: {node['label']} 生成了 {generated}/{count} 道题目")


def generate_for_all_tags(count=5):
    """为所有 tag 生成题目"""
    graph = load_graph()
    if not graph:
        return

    nodes = graph["nodes"]
    log.info(f"开始为 {len(nodes)} 个 tag 各生成 {count} 道题目...")

    for i, node in enumerate(nodes, 1):
        log.info(f"\n{'='*60}")
        log.info(f"[{i}/{len(nodes)}] 处理 tag: {node['label']} ({node['id']})")
        log.info(f"{'='*60}")
        generate_for_tag(node["id"], count)

        # 间隔处理，避免 API 限流
        if i < len(nodes):
            time.sleep(3)

    log.info(f"\n✅ 全部完成: {len(nodes)} 个 tag")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="知识图谱高质量题目生成器")
    parser.add_argument("--tag", type=str, help="指定 tag ID（如 plant_respiration）")
    parser.add_argument("--all", action="store_true", help="为所有 tag 生成题目")
    parser.add_argument("--count", type=int, default=5, help="每个 tag 生成的题目数量（默认 5）")

    args = parser.parse_args()

    if args.all:
        generate_for_all_tags(args.count)
    elif args.tag:
        generate_for_tag(args.tag, args.count)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
