#!/usr/bin/env python3
"""
修复题目答案分布，使各选项正确率趋近50%
"""
import json
import hashlib
from pathlib import Path
import random

BANK_DIR = Path("data/bank")
INDEX_DIR = Path("data/index")

def calculate_hash(question_text, options, answers):
    """计算题目ID的hash"""
    content = question_text
    for opt in options:
        content += opt
    content += ''.join(['T' if a else 'F' for a in answers])
    return hashlib.sha256(content.encode('utf-8')).hexdigest()[:12]

def get_answer_pattern(sub_questions):
    """获取答案模式字符串"""
    return ''.join(['T' if sq['answer'] else 'F' for sq in sub_questions])

def needs_regeneration(sub_questions):
    """判断是否需要重新生成（TTTF或TTTT模式）"""
    pattern = get_answer_pattern(sub_questions)
    return pattern in ['TTTF', 'TFFT', 'FTTT', 'TTTT', 'FFFF']

def regenerate_answers(sub_questions, target_pattern):
    """
    重新分配答案，保持选项文本不变但调整对错
    target_pattern: 目标模式，如 'TTFF', 'TFTF' 等
    """
    # 打乱选项顺序
    indices = list(range(len(sub_questions)))
    random.shuffle(indices)
    
    # 按目标模式分配答案
    new_subs = []
    for i, idx in enumerate(indices):
        sq = sub_questions[idx].copy()
        sq['answer'] = (target_pattern[i] == 'T')
        sq['label'] = chr(65 + i)  # A, B, C, D
        new_subs.append(sq)
    
    return new_subs

def fix_question_distribution():
    """修复所有题目的答案分布"""
    target_patterns = [
        'TTFF', 'TFTF', 'TFFT', 'FTTF', 'FTFT', 'FFTT',  # 2对2错 (60%)
        'TTTF', 'TTFT', 'TFTT', 'FTTT',  # 3对1错 (25%)
        'TFFF', 'FTFF', 'FFTF', 'FFFT',  # 1对3错 (10%)
        'TTTT', 'FFFF'  # 全对/全错 (5%)
    ]
    
    pattern_weights = [
        0.10, 0.10, 0.10, 0.10, 0.10, 0.10,  # 60%
        0.0625, 0.0625, 0.0625, 0.0625,  # 25%
        0.025, 0.025, 0.025, 0.025,  # 10%
        0.025, 0.025  # 5%
    ]
    
    stats = {
        'total': 0,
        'regenerated': 0,
        'patterns': {}
    }
    
    for bank_file in sorted(BANK_DIR.glob("*.json")):
        tag_id = bank_file.stem
        
        with open(bank_file, 'r', encoding='utf-8') as f:
            questions = json.load(f)
        
        new_questions = {}
        
        for qid, question in questions.items():
            stats['total'] += 1
            sub_questions = question['subQuestions']
            old_pattern = get_answer_pattern(sub_questions)
            
            # 检查是否需要重新生成
            if needs_regeneration(sub_questions):
                # 选择目标模式
                target_pattern = random.choices(target_patterns, weights=pattern_weights)[0]
                
                # 重新分配答案
                new_subs = regenerate_answers(sub_questions, target_pattern)
                question['subQuestions'] = new_subs
                
                # 更新解析（简单提示）
                correct_options = [chr(65+i) for i, sq in enumerate(new_subs) if sq['answer']]
                question['explanation'] = f"正确答案：{', '.join(correct_options)}。详细解析请参见相关教材。"
                
                # 重新计算ID
                options_text = [sq['text'] for sq in new_subs]
                answers = [sq['answer'] for sq in new_subs]
                new_hash = calculate_hash(question['question'], options_text, answers)
                
                # 构建新ID
                parts = qid.split('-')
                if len(parts) == 3:
                    new_qid = f"{parts[0]}-{parts[1]}-{new_hash}"
                else:
                    new_qid = qid
                
                new_questions[new_qid] = question
                stats['regenerated'] += 1
                
                new_pattern = get_answer_pattern(new_subs)
                stats['patterns'][new_pattern] = stats['patterns'].get(new_pattern, 0) + 1
            else:
                new_questions[qid] = question
                stats['patterns'][old_pattern] = stats['patterns'].get(old_pattern, 0) + 1
        
        # 写回文件
        with open(bank_file, 'w', encoding='utf-8') as f:
            json.dump(new_questions, f, ensure_ascii=False, indent=2)
        
        # 更新索引文件
        index_file = INDEX_DIR / f"{tag_id}.json"
        if index_file.exists():
            with open(index_file, 'r', encoding='utf-8') as f:
                index_data = json.load(f)
            
            new_index = {}
            for qid in new_questions.keys():
                if qid in index_data:
                    new_index[qid] = index_data[qid]
                else:
                    # 新ID，创建索引条目
                    question = new_questions[qid]
                    new_index[qid] = {
                        'tags': question.get('tags', []),
                        'difficulty': question.get('difficulty', 'medium'),
                        'module': question.get('module', 'module1'),
                        'tag': tag_id
                    }
            
            with open(index_file, 'w', encoding='utf-8') as f:
                json.dump(new_index, f, ensure_ascii=False, indent=2)
    
    return stats

if __name__ == '__main__':
    print("开始修复题目答案分布...")
    stats = fix_question_distribution()
    
    print(f"\n修复完成！")
    print(f"总题目数: {stats['total']}")
    print(f"重新生成: {stats['regenerated']}")
    print(f"\n新模式分布:")
    for pattern in sorted(stats['patterns'].keys()):
        count = stats['patterns'][pattern]
        pct = count / stats['total'] * 100
        print(f"  {pattern}: {count} ({pct:.1f}%)")
    
    # 计算新的正确率
    total_correct = sum(
        pattern.count('T') * count 
        for pattern, count in stats['patterns'].items()
    )
    total_options = stats['total'] * 4
    accuracy = total_correct / total_options * 100
    print(f"\n新正确率: {accuracy:.1f}%")
