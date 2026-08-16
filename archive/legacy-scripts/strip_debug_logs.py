#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
安全移除 js/ 目录下的 console.log 调试语句（保留 console.warn / console.error 作为错误处理）。
仅删除独立成行的 console.log(...); 语句，避免破坏多行表达式。
"""
import re
import sys
from pathlib import Path

JS_DIR = Path(__file__).resolve().parent.parent / "js"
# 匹配独立成行的 console.log(...);（允许行首空白和行尾分号/空白）
LINE_RE = re.compile(r'^\s*console\.log\([^;]*\);?\s*$', re.MULTILINE)


def strip_file(path: Path) -> int:
    text = path.read_text(encoding='utf-8')
    new_text, count = LINE_RE.subn('', text)
    if count:
        # 清理因删除而产生的多余空行（最多连续两个空行保留一个）
        new_text = re.sub(r'\n{3,}', '\n\n', new_text)
        path.write_text(new_text, encoding='utf-8')
    return count


def main() -> int:
    total = 0
    for path in sorted(JS_DIR.glob('*.js')):
        count = strip_file(path)
        if count:
            print(f"{path.name}: removed {count} console.log")
            total += count
    print(f"\nTotal removed: {total}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
