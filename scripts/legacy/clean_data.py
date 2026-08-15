"""清理 crawled_competition.json：
1. 删除 2017/2019 年题目
2. 删除含图片的题目（题干含图相关关键词）
3. 去掉 E 选项（仅保留 ABCD）
4. 从答案文件夹读取 2025/2026 年答案并匹配
"""
import json
import re
import sys
import os

DATA_PATH = r"d:\bioquest\data\crawled_competition.json"
ANSWER_DIR = r"d:\bioquest\答案"

# 图片相关关键词
IMAGE_KEYWORDS = ["如图", "右图", "左图", "下图", "上图", "见图", "附图", "下图所示",
                  "上图所示", "如图所示", "见下图", "见上图", "参照图", "参考图",
                  "图示", "图中", "图1", "图2", "图3", "图4", "图5",
                  "图一", "图二", "图三", "图四", "图五"]


def load_data():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_data(data):
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def has_image(q):
    """检测题目是否含图片（基于关键词启发式）。"""
    stem = q.get("stem", "")
    options = q.get("options", {})
    all_text = stem + " " + " ".join(str(v) for v in options.values())
    for kw in IMAGE_KEYWORDS:
        if kw in all_text:
            return True
    return False


def remove_e_option(q):
    """去掉 E 选项，仅保留 ABCD。"""
    if "E" in q.get("options", {}):
        del q["options"]["E"]
    if "E" in q.get("answer", {}):
        del q["answer"]["E"]
    return q


def extract_2025_answers():
    """从 2025 年答案 PDF 提取判断题答案（T/F 格式，每题4个子判断）。"""
    pdf_path = os.path.join(ANSWER_DIR, "2025年全国中学生生物学联赛标准答案.pdf")
    if not os.path.exists(pdf_path):
        print(f"  2025答案PDF不存在: {pdf_path}")
        return {}

    try:
        import fitz
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
    except Exception as e:
        print(f"  读取2025答案PDF失败: {e}")
        return {}

    print(f"  2025答案PDF文本前500字:\n{text[:500]}")
    print(f"  ---")

    # 2025年格式：每题4个T/F子判断
    # 格式如：1:FTTF, 2:FTTT, 3:TFTT...
    # 或者竖排：题号 1 2 3 ... 答案 FTTF FTTT TFTT ...
    answers = {}

    # 尝试解析 "题号:答案" 格式
    # 先找所有 T/F 序列
    lines = text.strip().splitlines()

    # 方法1: 找 "数字:TTFF" 格式
    for m in re.finditer(r"(\d+)\s*[：:]\s*([TF]{2,5})", text):
        q_num = int(m.group(1))
        tf_str = m.group(2)
        answers[q_num] = tf_str

    if answers:
        print(f"  方法1匹配到 {len(answers)} 题")
        return answers

    # 方法2: 竖排表格格式
    # 找题号行和答案行
    q_markers = [(m.start(), m.end()) for m in re.finditer(r"题\s*号", text)]
    a_markers = [(m.start(), m.end()) for m in re.finditer(r"答\s*案", text)]

    if q_markers and a_markers:
        for qi, q_marker in enumerate(q_markers):
            a_marker = None
            for am in a_markers:
                if am[0] > q_marker[1]:
                    a_marker = am
                    break
            if not a_marker:
                continue
            q_section = text[q_marker[1]:a_marker[0]].strip()
            next_q = q_markers[qi + 1][0] if qi + 1 < len(q_markers) else len(text)
            a_section = text[a_marker[1]:next_q].strip()

            q_nums = [int(x) for x in re.findall(r"\d+", q_section)]
            a_tokens = []
            for line in a_section.splitlines():
                line = line.strip()
                if not line:
                    continue
                for tok in re.split(r"\s+", line):
                    tok = tok.strip()
                    if tok and re.match(r"^[TF]+$", tok):
                        a_tokens.append(tok)

            for i, q_num in enumerate(q_nums):
                if i < len(a_tokens):
                    answers[q_num] = a_tokens[i]

    if answers:
        print(f"  方法2匹配到 {len(answers)} 题")
        return answers

    # 方法3: 直接找所有 T/F 组合
    tf_pattern = re.findall(r"(\d+)\s*[\.．、]?\s*([TF]{4})", text)
    for q_num_str, tf_str in tf_pattern:
        answers[int(q_num_str)] = tf_str

    if answers:
        print(f"  方法3匹配到 {len(answers)} 题")

    return answers


def extract_2026_answers():
    """从 2026 年答案 PNG 提取答案（需要 OCR）。"""
    png_path = os.path.join(ANSWER_DIR, "2026生物联赛答案.png")
    if not os.path.exists(png_path):
        print(f"  2026答案PNG不存在: {png_path}")
        return {}

    # 尝试使用 easyocr（轻量，兼容性好）
    text = ""
    try:
        import easyocr
        print("  使用 easyocr 识别2026年答案PNG...")
        reader = easyocr.Reader(["ch_sim", "en"], gpu=False)
        result = reader.readtext(png_path)
        text = "\n".join([r[1] for r in result])
        print(f"  2026答案OCR结果:\n{text[:800]}")
    except Exception as e:
        print(f"  easyocr失败: {e}")
        print("  无法识别2026年PNG答案，请手动提供答案文本。")
        return {}

    # 解析答案
    answers = {}

    # 尝试竖排表格格式
    q_markers = [(m.start(), m.end()) for m in re.finditer(r"题\s*号", text)]
    a_markers = [(m.start(), m.end()) for m in re.finditer(r"答\s*案", text)]

    if q_markers and a_markers:
        for qi, q_marker in enumerate(q_markers):
            a_marker = None
            for am in a_markers:
                if am[0] > q_marker[1]:
                    a_marker = am
                    break
            if not a_marker:
                continue
            q_section = text[q_marker[1]:a_marker[0]].strip()
            next_q = q_markers[qi + 1][0] if qi + 1 < len(q_markers) else len(text)
            a_section = text[a_marker[1]:next_q].strip()

            q_nums = [int(x) for x in re.findall(r"\d+", q_section)]
            a_tokens = []
            for line in a_section.splitlines():
                line = line.strip()
                if not line:
                    continue
                for tok in re.split(r"\s+", line):
                    tok = tok.strip()
                    if tok and re.match(r"^[A-D]+$", tok):
                        a_tokens.append(tok)

            for i, q_num in enumerate(q_nums):
                if i < len(a_tokens):
                    answers[q_num] = a_tokens[i]

    # 内联格式
    for m in re.finditer(r"(\d+)\s*[\.．、]?\s*([A-D])\b", text):
        q_num = int(m.group(1))
        if q_num not in answers:
            answers[q_num] = m.group(2)

    # 范围格式
    for m in re.finditer(r"(\d+)\s*-\s*(\d+)\s+([A-D]+)", text):
        start, end, ans = int(m.group(1)), int(m.group(2)), m.group(3)
        for i, ch in enumerate(ans):
            if start + i <= end and (start + i) not in answers:
                answers[start + i] = ch

    return answers


def apply_2025_answers(data, answers_2025):
    """将2025年判断题答案应用到题目。2025年格式：每题4个T/F子判断。
    T/F -> A/B 映射：T=A(正确), B=F(错误)
    每题4个子判断，合并为多选答案。
    """
    if not answers_2025:
        return data

    for q in data:
        if q.get("year") != 2025:
            continue
        q_num = q.pop("_q_num", None)
        # 尝试用原始题号匹配
        if q_num is None:
            # 从tags中提取
            for tag in q.get("tags", []):
                if isinstance(tag, str) and tag.isdigit():
                    # 从stem中提取题号
                    pass
            # 从id或其他字段推断
            # 尝试从stem中提取题号
            m = re.match(r"(\d+)[\.．、]?\s*", q.get("stem", ""))
            if m:
                q_num = int(m.group(1))

        if q_num and q_num in answers_2025:
            tf_str = answers_2025[q_num]
            # T->A(正确), F->B(错误)
            # 每个子判断对应一个选项：1A=T/F, 1B=T/F, 1C=T/F, 1D=T/F
            # 但实际上2025年联赛判断题格式是：
            # 每题4个判断，每个判断T或F
            # 需要看题目实际选项格式
            # 简单处理：将T/F序列作为答案标记
            # 如果题目选项是A/B/C/D，且是判断题，则：
            # 答案格式为 "正确答案：TFFT" 之类
            ans_display = tf_str.replace("T", "对").replace("F", "错")
            q["analysis"] = f"正确答案：{tf_str}（T=对，F=错）"

            # 对于判断题，如果选项是A=对 B=错，则每个子判断对应一个答案
            # 但联赛判断题通常是一道题4个子判断，每个子判断独立
            # 这里先标记答案，后续根据题目实际格式调整

    return data


def apply_2026_answers(data, answers_2026):
    """将2026年答案应用到题目。"""
    if not answers_2026:
        return data

    for q in data:
        if q.get("year") != 2026:
            continue
        q_num = q.pop("_q_num", None)
        if q_num is None:
            m = re.match(r"(\d+)[\.．、]?\s*", q.get("stem", ""))
            if m:
                q_num = int(m.group(1))

        if q_num and q_num in answers_2026:
            ans = answers_2026[q_num]
            if isinstance(ans, str) and len(ans) == 1 and ans in "ABCD":
                q["answer"] = {k: (k == ans) for k in "ABCD"}
                q["analysis"] = f"正确答案：{ans}"
            elif isinstance(ans, str) and len(ans) > 1 and all(c in "ABCD" for c in ans):
                q["answer"] = {k: (k in ans) for k in "ABCD"}
                q["analysis"] = f"正确答案：{ans}"

    return data


def main():
    print("=" * 60)
    print("清理 crawled_competition.json")
    print("=" * 60)

    data = load_data()
    print(f"原始题目数: {len(data)}")

    # 1. 删除 2017/2019 年题目
    before = len(data)
    data = [q for q in data if q.get("year") not in (2017, 2019)]
    print(f"删除2017/2019年: {before - len(data)}题 (剩余{len(data)}题)")

    # 2. 删除含图片的题目
    before = len(data)
    img_removed = []
    clean = []
    for q in data:
        if has_image(q):
            img_removed.append(q)
        else:
            clean.append(q)
    data = clean
    print(f"删除含图片题目: {before - len(data)}题 (剩余{len(data)}题)")
    if img_removed:
        print(f"  被删题目示例: {img_removed[0]['stem'][:50]}...")

    # 3. 去掉 E 选项
    e_count = 0
    for q in data:
        if "E" in q.get("options", {}) or "E" in q.get("answer", {}):
            e_count += 1
            remove_e_option(q)
    print(f"去掉E选项: {e_count}题")

    # 4. 读取 2025 年答案
    print("\n--- 读取2025年答案 ---")
    answers_2025 = extract_2025_answers()
    if answers_2025:
        print(f"  2025年答案匹配: {len(answers_2025)}题")
        # 显示前5个
        for k in sorted(answers_2025.keys())[:5]:
            print(f"    题{k}: {answers_2025[k]}")
    else:
        print("  2025年答案未提取到")

    # 5. 读取 2026 年答案
    print("\n--- 读取2026年答案 ---")
    answers_2026 = extract_2026_answers()
    if answers_2026:
        print(f"  2026年答案匹配: {len(answers_2026)}题")
        for k in sorted(answers_2026.keys())[:5]:
            print(f"    题{k}: {answers_2026[k]}")
    else:
        print("  2026年答案未提取到")

    # 6. 应用答案
    if answers_2025:
        data = apply_2025_answers(data, answers_2025)
    if answers_2026:
        data = apply_2026_answers(data, answers_2026)

    # 统计最终结果
    print(f"\n--- 最终统计 ---")
    years = {}
    for q in data:
        y = q.get("year", "unknown")
        years[y] = years.get(y, 0) + 1
    for y in sorted(years.keys()):
        print(f"  {y}: {years[y]}题")
    print(f"  总计: {len(data)}题")

    # 检查还有多少题没有答案
    no_answer = sum(1 for q in data if q.get("analysis") == "【解析待补充】" or not q.get("analysis"))
    print(f"  无答案/解析: {no_answer}题")

    # 保存
    save_data(data)
    print(f"\n已保存到 {DATA_PATH}")


if __name__ == "__main__":
    main()
