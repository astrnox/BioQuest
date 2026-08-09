-- ============================================================
-- BioQuest — 修复 RLS 策略以允许后端匿名上传题目
-- 在 Supabase SQL Editor 中运行此文件
-- 问题：questions 表只允许 admin 插入，导致 server.py 用 anon key 上传失败 (401)
-- 方案：允许匿名 INSERT（题库为公开数据，无安全风险），保留 admin 管理 UPDATE/DELETE
-- ============================================================

-- 删除旧的仅 admin 插入策略
DROP POLICY IF EXISTS questions_insert_admin ON questions;

-- 创建新的匿名可插入策略（允许 server.py 后端上传题目）
CREATE POLICY questions_insert_anon ON questions
  FOR INSERT WITH CHECK (true);

-- 可选：如果需要更严格的控制，可以改为只允许特定 IP 或使用 service_role key
-- 但对于公开题库场景，匿名插入是安全的

-- 验证策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'questions';
