#!/usr/bin/env python3
"""
BioQuest - 知识卡片自动出题机

核心思想：
从 cards.json 的结构化知识 → 自动生成多种题型题目

支持题型：
1. 单选题 - 选择题（单选题）
2. 判断题
3. 配对题（匹配概念-描述）
4. 填空题

用法：python scripts/generate_questions_from_cards.py
"""

import json
import random
import os
from pathlib import Path

random.seed(42)


def load_cards():
    """加载 cards.json """
    cards_path = Path(__file__).parent.parent / 'data' / 'cards.json'
    with open(cards_path, encoding='utf-8') as of:
        data = json.load(of)
    return data.get('分类', [])


def extract_all_concepts(categories):
    """提取所有概念：标题 + 问题 + 答案"""
    concepts = []
    for cat in categories:
        cat_name = cat.get('name', '')
        for card in cat.get('cards', []):
            concepts.append({
                'category': cat_name,
                'title': card.get('title', ''),
                'question': card.get('question', ''),
                'answer': card.get('answer', ''),
            })
    return concepts


def generate_single_choice(concepts, num_per_concept=3):
    """从知识卡片生成单选题：
    策略：答案中的关键词汇做正确选项，其他概念的答案做干扰项
    """
    questions = []
    qid = 1000

    for concept in concepts:
        title = concept['title']
        answer = concept['answer']
        category = concept['category']

        if len(answer) < 10:
            continue

        keywords = answer.split('。')[:2]
        if not keywords or all(not k.strip() for k in keywords):
            continue

        for i in range(min(num_per_concept, len(keywords))):
            # 从答案中截取一句作为正确选项
            correct = keywords[i].strip()
            if len(correct) < 8:
                continue

            wrong_concepts = [c for c in concepts if c['title'] != title]
            wrong_choices = random.sample(wrong_concepts, min(3, len(wrong_concepts)))
            wrongs = []
            for wc in wrong_choices:
                wrong_answer = wc['answer'].split('。')[0].strip()
                if len(wrong_answer) < 5:
                    wrong_answer = f"{wc['title']}的主要特点"
                wrongs.append(wrong_answer)

            while len(wrongs) < 3:
                wrongs.append(random.choice(concepts)['answer'].split('。')[0].strip())

            options = [correct] + wrongs[:3]
            random.shuffle(options)
            correct_idx = options.index(correct) + 1

            questions.append({
                'id': f'auto_{qid}',
                'category': category,
                'title': title,
                'question_text': f"关于{title}，以下描述正确的是：",
                'options': [
                    {'key': 'A', 'text': options[0]},
                    {'key': 'B', 'text': options[1]},
                    {'key': 'C', 'text': options[2]},
                    {'key': 'D', 'text': options[3]},
                ],
                'correctAnswer': chr(64 + correct_idx),
                'explanation': answer,
                'difficulty': 'medium',
                'type': 'single',
                'source': 'auto_generated',
            })
            qid += 1

    return questions


def generate_tf_questions(concepts, num_per_concept=2):
    """生成判断题：
    - 正确陈述：直接用答案中的正确陈述
    - 错误陈述：用其他概念的答案替换关键词
    """
    questions = []
    qid = 2000

    for concept in concepts:
        title = concept['title']
        answer = concept['answer']
        category = concept['category']

        if len(answer) < 10:
            continue

        for i in range(min(num_per_concept, 2)):
            if i == 0:
                # 正确陈述
                correct_stmt = answer.split('。')[0].strip()
                if len(correct_stmt) < 10:
                    continue
                questions.append({
                    'id': f'auto_tf_{qid}',
                    'category': category,
                    'title': title,
                    'question_text': f"判断：{correct_stmt}",
                    'correctAnswer': '正确',
                    'explanation': answer,
                    'difficulty': 'easy',
                    'type': 'tf',
                    'source': 'auto_generated',
                })
            else:
                # 错误陈述：找另一个概念混淆
                other = random.choice([c for c in concepts if c['title'] != title])
                wrong_answer = other['answer'].split('。')[0].strip()
                if len(wrong_answer) < 10:
                    continue
                questions.append({
                    'id': f'auto_tf_{qid}',
                    'category': category,
                    'title': title,
                    'question_text': f"判断：{title}的主要特点是{wrong_answer}",
                    'correctAnswer': '错误',
                    'explanation': f"正确答案是：{answer}。混淆概念：{other['title']}",
                    'difficulty': 'medium',
                    'type': 'tf',
                    'source': 'auto_generated',
                })
            qid += 1

    return questions


def generate_matching_pairs(concepts, num_pairs=5):
    """生成配对题（匹配-概念描述）"""
    questions = []
    qid = 3000

    # 按分类分组
    by_category = {}
    for c in concepts:
        cat = c['category']
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(c)

    for cat, cat_concepts in by_category.items():
        if len(cat_concepts) < 4:
            continue

        # 每组 5-8 个概念
        selected = random.sample(cat_concepts, min(num_pairs, len(cat_concepts)))

        pairs = []
        for sc in selected:
            answer_part = sc['answer'].split('。')[0].strip()
            if len(answer_part) < 8:
                continue
            pairs.append({
                'left': sc['title'],
                'right': answer_part[:80] + '...' if len(answer_part) > 80 else answer_part,
            })

        if len(pairs) < 3:
            continue

        questions.append({
            'id': f'auto_match_{qid}',
            'category': cat,
            'title': f'{cat} - 概念匹配',
            'question_text': f'将以下{cat}中的概念与其描述相匹配',
            'pairs': pairs,
            'difficulty': 'hard',
            'type': 'matching',
            'source': 'auto_generated',
        })
        qid += 1

    return questions


def generate_fill_blank(concepts):
    """生成填空题：
    从答案中提取核心术语，挖空让学生填写
    """
    import re

    questions = []
    qid = 4000

    # 术语模式（从答案中提取"是XX，"或"由XX组成"等结构
    patterns = [
        r"([^，。、]{2,15})是[^，。]{2,20}",
        r"由([^，。、]{2,15})组成",
        r"主要包括([^，。、]{2,20})",
        r"([^，。、]{2,15})的特点",
    ]

    for concept in concepts:
        title = concept['title']
        answer = concept['answer']
        category = concept['category']

        # 尝试提取术语
        matched = False
        for pat in patterns:
            m = re.search(pat, answer)
            if not m:
                continue
            term = m.group(1)
            if len(term) < 2 or len(term) > 15:
                continue

            blanked = answer.replace(term, '____', 1)
            if blanked == answer:
                continue

            questions.append({
                'id': f'auto_fill_{qid}',
                'category': category,
                'title': title,
                'question_text': f"填空：{blanked.split('。')[0]}。",
                'correctAnswer': term,
                'explanation': answer,
                'difficulty': 'medium',
                'type': 'fill',
                'source': 'auto_generated',
            })
            qid += 1
            matched = True
            break

        if not matched and len(answer) > 30:
            # 备用：取答案前20字中的第一个词
            first_sentence = answer.split('。')[0]
            if len(first_sentence) > 15:
                words = first_sentence.split('，')
                if len(words) >= 2 and len(words[0]) > 2:
                    blank = words[0]
                    rest = '，'.join(words[1:])
                    questions.append({
                        'id': f'auto_fill_{qid}',
                        'title': title,
                        'question_text': f"____：{rest.strip()}",
                        'correctAnswer': blank,
                        'explanation': answer,
                        'difficulty': 'easy',
                        'type': 'fill',
                        'source': 'auto_generated',
                    })
                    qid += 1

    return questions


def main():
    print('[BioQuest] 正在加载知识卡片...')
    categories = load_cards()
    concepts = extract_all_concepts(categories)
    print(f'[BioQuest] 共加载 {len(concepts)} 张知识卡片')

    # 按模块分组
    module_map = {
        '生化/分子/细胞': [c for c in concepts if any(k in c['category'] for k in ['细胞生物学', '分子生物学', '生物化学'])],
        '植物/微生物': [c for c in concepts if any(k in c['category'] for k in ['植物学', '微生物学'])],
        '动物/生态': [c for c in concepts if any(k in c['category'] for k in ['动物学', '生态学'])],
        '遗传/进化': [c for c in concepts if '遗传' in c['category'] or '进化' in c['category'] or '进化生物学' in c['category']]
    }

    all_questions = []

    for module_name, module_concepts in module_map.items():
        if not module_concepts:
            continue

        print(f'\n[BioQuest] 正在生成模块: {module_name} ({len(module_concepts)} 张卡片)')

        single = generate_single_choice(module_concepts)
        tf = generate_tf_questions(module_concepts)
        matching = generate_matching_pairs(module_concepts)
        fill = generate_fill_blank(module_concepts)

        module_questions = single + tf + matching + fill
        random.shuffle(module_questions)

        all_questions.extend(module_questions)
        print(f'  单选: {len(single)} 题')
        print(f'  判断: {len(tf)} 题')
        print(f'  匹配: {len(matching)} 题')
        print(f'  填空: {len(fill)} 题')

    # 输出统计
    print(f'\n[BioQuest] 合计: {len(all_questions)} 题')
    print(f'[BioQuest] 按类型统计:')
    type_counts = {}
    for q in all_questions:
        t = q.get('type', 'unknown')
        type_counts[t] = type_counts.get(t, 0) + 1
    for t, c in type_counts.items():
        print(f'  {t}: {c}')

    # 保存为 quiz_questions.json
    output_path = Path(__file__).parent.parent / 'data' / 'quiz_auto_generated.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            '题库': [q for q in all_questions if q.get('type') in ['single', 'tf']],
            '匹配题': [q for q in all_questions if q.get('type') == 'matching'],
            '填空题': [q for q in all_questions if q.get('type') == 'fill'],
            '生成时间': 'auto_generated',
        }, f, ensure_ascii=False, indent=2)

    print(f'\n[BioQuest] 已保存到 {output_path}')
    return output_path


if __name__ == '__main__':
    main()
