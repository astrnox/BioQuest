#!/usr/bin/env python3
"""Update manifest.json with new question counts and file hashes."""
import json
import hashlib
from pathlib import Path

BANK_DIR = Path("data/bank")
INDEX_DIR = Path("data/index")
KG_FILE = Path("data/knowledge-graph.json")
MANIFEST_FILE = Path("data/manifest.json")

# Load knowledge graph
with open(KG_FILE) as f:
    kg = json.load(f)

# Count questions per tag
tag_counts = {}
for bank_file in BANK_DIR.glob("*.json"):
    tag_id = bank_file.stem
    with open(bank_file) as f:
        data = json.load(f)
    tag_counts[tag_id] = len(data)

# Calculate file hashes
def file_hash(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        h.update(f.read())
    return h.hexdigest()

files = {}
for bank_file in sorted(BANK_DIR.glob("*.json")):
    files[f"bank/{bank_file.name}"] = file_hash(bank_file)
for index_file in sorted(INDEX_DIR.glob("*.json")):
    files[f"index/{index_file.name}"] = file_hash(index_file)
files["knowledge-graph.json"] = file_hash(KG_FILE)

# Build topics list
topics = []
for node in kg["nodes"]:
    tag_id = node["id"]
    topics.append({
        "id": tag_id,
        "label": node["label"],
        "category": node["category"],
        "relatedModule": node["relatedModule"],
        "count": tag_counts.get(tag_id, 0)
    })

# Build sources list
sources = [{"tag": t["id"], "count": t["count"]} for t in topics]

# Build modules dict
modules = {"module1": [], "module2": [], "module3": [], "module4": []}
for node in kg["nodes"]:
    mod = node["relatedModule"]
    if mod in modules:
        modules[mod].append(node["id"])

# Calculate total
total = sum(tag_counts.values())

# Build manifest
manifest = {
    "rev": 3,
    "updated_at": "2026-08-23",
    "total_questions": total,
    "topics": topics,
    "sources": sources,
    "modules": modules,
    "files": files
}

# Write manifest
with open(MANIFEST_FILE, "w") as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)

print(f"Manifest updated: {total} questions across {len(tag_counts)} tags")
print(f"Files: {len(files)} hashes calculated")
