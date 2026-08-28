-- ============================================================
-- BioQuest — 已废弃：请勿再运行本文件
-- ============================================================
-- [幂等改造] Issue #143
-- 已确认本文件幂等（仅 DROP POLICY IF EXISTS + SELECT 校验），
-- 但本文件已废弃（P0-2 / S-003 安全加固），请改用 migration_v6_security_hardening.sql。
-- 去除废弃提示外的注释说明，未改动任何业务逻辑。
-- ============================================================
-- ⚠️⚠️ 本文件已废弃（P0-2 / S-003 安全加固），仅供历史审计留存。
--
-- 废弃原因：
--   server.py 已改用 SUPABASE_SERVICE_ROLE_KEY 上传题目（绕过 RLS），
--   不再需要匿名 INSERT。下方「匿名可插入」策略会重新打开
--   「匿名 anon key 可写敏感表」漏洞——若被再次执行，任何拿到
--   anon key（公开）的人都能向 questions 表写入任意数据。
--
-- 正确做法：
--   1) 运行 sql/migration_v6_security_hardening.sql（questions 仅 admin INSERT，
--      普通用户仅读，匿名写一律 403/401）；
--   2) 若题库曾误用本文件的匿名策略，请执行下方「补救」段将其删除。
--
-- 补救段（幂等，删除任何遗留的匿名 INSERT 策略）：
DROP POLICY IF EXISTS questions_insert_anon ON questions;
DROP POLICY IF EXISTS questions_public_insert ON questions;
DROP POLICY IF EXISTS cards_public_insert ON cards;

-- 验证策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('questions', 'cards')
ORDER BY tablename, policyname;
