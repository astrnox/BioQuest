#!/usr/bin/env python3
"""
BioQuest - Supabase 题目标签重建脚本

用途：
  为 Supabase 中已有的题目重新推断并写入 subject / concept / tags 字段，
  使思维图谱点击节点后能够进入对应的专项练习。

运行前请确保 server.py 中的 SUPABASE_URL 和 SUPABASE_KEY 已配置。

用法：
  python scripts/retag_supabase.py
"""

import sys
from pathlib import Path

# 将项目根目录加入路径，以便导入 server.py
sys.path.insert(0, str(Path(__file__).parent.parent))

from server import retag_all_questions


def main():
    print("[BioQuest Retag] 开始为 Supabase 题目重新建立标签...")
    updated = retag_all_questions()
    print(f"[BioQuest Retag] 完成：共更新 {updated} 道题目")


if __name__ == '__main__':
    main()
