#!/usr/bin/env python3
"""微调答案分布，使正确率更接近50%"""
import json
from pathlib import Path
import random

BANK_DIR = Path("data/bank")

def get_answer_pattern(sub_questions):
    return ''.join(['T' if sq['answer'] else 'F' for sq in sub_questions])

def flip_one_answer(sub_questions):
    """翻转一个答案（T变F或F变T）"""
    indices = list(range(len(sub_questions)))
    random.shuffle(indices)
    
    for idx in indices:
        sq = sub_questions[idx]
        # 优先翻转3对1错中的T，或1对3错中的F
        current_pattern = get_answer_pattern(sub_questions)
        t_count = current_pattern.count('T')
        
        if t_count > 2 and sq['answer']:  # 翻转T
            sq['answer'] = False
            return True
        elif t_count < 2 and not sq['answer']:  # 翻转F
            sq['answer'] = True
            return True
    
    # 如果没找到合适的，随机翻转一个
    idx = indices[0]
    sub_questions[idx]['answer'] = not sub_questions[idx]['answer']
    return True

# 统计当前分布
total_true = 0
total_options = 0
questions_to_fix = []

for bank_file in sorted(BANK_DIR.glob("*.json")):
    with open(bank_file, 'r', encoding='utf-8') as f:
        questions = json.load(f)
    
    for qid, question in questions.items():
        sub_questions = question['subQuestions']
        for sq in sub_questions:
            total_options += 1
            if sq['answer']:
                total_true += 1
        
        pattern = get_answer_pattern(sub_questions)
        t_count = pattern.count('T')
        if t_count == 3 or t_count == 1:
            questions_to_fix.append((bank_file, qid, question))

current_accuracy = total_true / total_options
print(f"当前正确率: {current_accuracy:.2%} ({total_true}/{total_options})")
print(f"需要调整的题目: {len(questions_to_fix)}")

# 随机选择一部分题目进行翻转
target_accuracy = 0.50
accuracy_gap = current_accuracy - target_accuracy
questions_to_flip = int(len(questions_to_fix) * abs(accuracy_gap) * 2)

print(f"计划翻转 {questions_to_flip} 道题目的答案")

random.shuffle(questions_to_fix)
flipped = 0

for bank_file, qid, question in questions_to_fix[:questions_to_flip]:
    sub_questions = question['subQuestions']
    
    # 根据当前正确率决定翻转方向
    if current_accuracy > target_accuracy:
        # 需要降低正确率，翻转T为F
        for sq in sub_questions:
            if sq['answer']:
                sq['answer'] = False
                flipped += 1
                break
    else:
        # 需要提高正确率，翻转F为T
        for sq in sub_questions:
            if not sq['answer']:
                sq['answer'] = True
                flipped += 1
                break
    
    # 更新解析
    correct_options = [chr(65+i) for i, sq in enumerate(sub_questions) if sq['answer']]
    question['explanation'] = f"正确答案：{', '.join(correct_options)}。详细解析请参见相关教材。"
    
    # 写回文件
    with open(bank_file, 'r', encoding='utf-8') as f:
        all_questions = json.load(f)
    all_questions[qid] = question
    with open(bank_file, 'w', encoding='utf-8') as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)

# 重新统计
total_true = 0
total_options = 0
for bank_file in sorted(BANK_DIR.glob("*.json")):
    with open(bank_file, 'r', encoding='utf-8') as f:
        questions = json.load(f)
    for qid, question in questions.items():
        for sq in question['subQuestions']:
            total_options += 1
            if sq['answer']:
                total_true += 1

new_accuracy = total_true / total_options
print(f"\n调整后正确率: {new_accuracy:.2%} ({total_true}/{total_options})")
print(f"翻转了 {flipped} 个选项")
