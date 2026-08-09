#!/usr/bin/env python3
"""查询 community_posts 表的 RLS 策略"""
import urllib.request
import json
import re

env = {}
with open('.env', encoding='utf-8') as f:
    for line in f:
        m = re.match(r'^([A-Z_][A-Z0-9_]*)\s*=\s*(.+)$', line.strip())
        if m:
            env[m.group(1)] = m.group(2)
URL = env['SUPABASE_URL']
KEY = env['SUPABASE_SERVICE_ROLE_KEY']

# RLS 策略
sql = """
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('community_posts', 'community_comments')
ORDER BY tablename, policyname;
"""
req = urllib.request.Request(
    URL + '/rest/v1/rpc/query',
    data=json.dumps({'query': sql}).encode(),
    headers={'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json'},
    method='POST'
)
try:
    r = urllib.request.urlopen(req, timeout=15)
    print(json.dumps(json.loads(r.read()), indent=2, ensure_ascii=False))
except urllib.error.HTTPError as e:
    print('HTTPError:', e.code)
    print('Body:', e.read().decode()[:1000])
