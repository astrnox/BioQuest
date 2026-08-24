#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""同步 data/community.json 的 20 条旧帖子到 Supabase，并清理 5 条测试垃圾

需要环境变量：
  SUPABASE_URL              默认 https://qxehkfucvmx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY 必填，从 .env 读取（绝不能硬编码或提交）
"""
import os
import sys
import urllib.request
import json
from pathlib import Path

# 加载项目根目录的 .env（如果存在）
ROOT = Path(__file__).resolve().parent.parent.parent
ENV_PATH = ROOT / '.env'
if ENV_PATH.exists():
    for line in ENV_PATH.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        k, v = line.split('=', 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

URL = os.environ.get('SUPABASE_URL', 'https://qxehkfucvmx.supabase.co') + '/rest/v1'
KEY_SRV = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
if not KEY_SRV:
    print('ERROR: SUPABASE_SERVICE_ROLE_KEY not set. Please create .env file in project root with:')
    print('  SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...')
    sys.exit(1)

HEADERS = {
    'apikey': KEY_SRV,
    'Authorization': 'Bearer ' + KEY_SRV,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(URL + path, data=data, headers=HEADERS, method=method)
    return json.loads(urllib.request.urlopen(r, timeout=15).read())

# 0) 读本地
with open(r'd:\bioquest\data\community.json', encoding='utf-8') as f:
    local = json.load(f)
posts = local.get('posts', [])
print('Local posts:', len(posts))

# 1) 找一个 admin 用户作为 author
profiles = req('GET', '/profiles?user_group=eq.admin&select=id&limit=1')
if not profiles:
    profiles = req('GET', '/profiles?select=id&limit=1')
if not profiles:
    print('NO USER FOUND, abort')
    sys.exit(1)
seed_author = profiles[0]['id']
print('Seed author:', seed_author)

# 2) 删除现有所有 community_posts（清空测试垃圾）
deleted = req('DELETE', '/community_posts?id=neq.00000000-0000-0000-0000-000000000000')
# Supabase 批量 delete 用 neq 不行，需要 IN 或 LIKE
# 改用 PostgREST 的标准批量删除：直接 DELETE 全部
# 但 neq 0 行还是合法的
print('Cleanup: deleted', len(deleted) if deleted else 0)

# 3) 插入 20 条
payload = []
for p in posts:
    payload.append({
        'id': p['id'],
        'author_id': seed_author,
        'author_name': p.get('author_name', ''),
        'content': p.get('content', ''),
        'tags': p.get('tags', []),
        'like_count': p.get('like_count', 0),
        'comment_count': p.get('comment_count', 0),
        'is_pinned': p.get('is_pinned', False),
        'is_deleted': p.get('is_deleted', False),
        'created_at': p.get('created_at')
    })

# 分批插入（每批 10）
for i in range(0, len(payload), 10):
    batch = payload[i:i+10]
    r = urllib.request.Request(URL + '/community_posts', data=json.dumps(batch).encode(), headers=HEADERS, method='POST')
    r.headers['Prefer'] = 'return=representation'
    result = json.loads(urllib.request.urlopen(r, timeout=15).read())
    print(f'  Inserted batch {i//10 + 1}: {len(result)} posts')

# 4) 验证
final = req('GET', '/community_posts?select=id,author_name&order=created_at.desc&limit=50')
print('Final posts in Supabase:', len(final))
