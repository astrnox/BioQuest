#!/usr/bin/env python3
"""更新manifest.json中的文件哈希值"""
import json
import hashlib
from pathlib import Path

def calculate_file_hash(file_path):
    """计算文件的SHA256哈希值"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(block)
    return sha256_hash.hexdigest()

# 读取manifest
manifest_path = Path("/workspace/data/manifest.json")
with open(manifest_path, 'r', encoding='utf-8') as f:
    manifest = json.load(f)

# 更新所有bank和index文件的哈希
updated_count = 0
for file_key in list(manifest['files'].keys()):
    file_path = Path("/workspace/data") / file_key
    if file_path.exists():
        new_hash = calculate_file_hash(file_path)
        if manifest['files'][file_key] != new_hash:
            manifest['files'][file_key] = new_hash
            updated_count += 1

# 写回manifest
with open(manifest_path, 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)

print(f"更新了 {updated_count} 个文件的哈希值")
