-- ============================================================
-- BioQuest — 百科模块 wiki_entries 表迁移
-- 在 Supabase 控制台 → SQL Editor 中执行本文件一次即可。
-- 之后：
--   1) 在本机运行 scripts/wiki_crawler.py --upload 抓取并上传词条
--   2) 前端 wiki.html 首次加载会从该表读取词条（离线时回退到 data/wiki-seed.json）
-- ============================================================

create table if not exists public.wiki_entries (
  id          text primary key,
  title       text not null,
  aliases     text[] not null default '{}',
  summary     text not null default '',
  content     text not null default '',
  category    text not null default '',
  tags        text[] not null default '{}',
  source      text not null default 'manual',
  source_url  text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.wiki_entries is 'BioQuest 百科词条（由 wiki_crawler.py 抓取/上传）';

alter table public.wiki_entries enable row level security;

-- 公开可读：匿名与登录用户都能读取词条（词条为公开内容，无敏感数据）
create policy "wiki_entries public read"
  on public.wiki_entries
  for select
  to anon, authenticated
  using (true);

-- 写入由服务端（service_role，默认 BYPASSRLS）或脚本完成，无需额外写策略。
-- 若希望匿名不可写，则保持现状即可。

-- 便于按标题去重/更新
create index if not exists wiki_entries_title_idx on public.wiki_entries (title);
create index if not exists wiki_entries_category_idx on public.wiki_entries (category);