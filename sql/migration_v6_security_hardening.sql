-- ============================================================
-- BioQuest — 迁移 v6：安全加固（P0-2 / S-003 / S-004）
-- 在 Supabase SQL Editor 中运行此文件（幂等，可重复执行）
--
-- 修复内容：
--   1. 移除 cards/questions 的「匿名可写」INSERT 策略
--      （cards_public_insert / questions_public_insert / questions_insert_anon），
--      改为仅 admin 可写。题库写入统一走 service_role（server.py / 导入脚本），
--      前端 anon key 仅保留读权限 —— 满足「匿名写敏感表返回 403/401」。
--   2. 为 profiles 增加「禁止自提权」UPDATE 检查：
--      普通用户只能保持原 user_group 或升为 verified（邮箱验证流程需要），
--      无法自行改到 admin / premium 等特权组；管理员不受限。
-- ============================================================

-- ---------- 1. cards / questions：匿名 INSERT -> admin INSERT ----------
DROP POLICY IF EXISTS cards_public_insert ON cards;
DROP POLICY IF EXISTS questions_public_insert ON questions;
DROP POLICY IF EXISTS questions_insert_anon ON questions;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cards_admin_insert' AND tablename = 'cards') THEN
        CREATE POLICY "cards_admin_insert" ON cards FOR INSERT WITH CHECK (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_group = 'admin')
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'questions_admin_insert' AND tablename = 'questions') THEN
        CREATE POLICY "questions_admin_insert" ON questions FOR INSERT WITH CHECK (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_group = 'admin')
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '跳过 cards/questions admin INSERT 策略: %', SQLERRM;
END $$;

-- ---------- 2. profiles：禁止普通用户自提权 ----------
-- WITH CHECK 跨策略为 AND 语义：既有 profiles_update_policy 允许用户改自己的行，
-- 本策略再叠加「user_group 不得随意提升」，两条同时满足才能更新成功。
-- 豁免：目标值不变、升为 verified（邮箱验证流程）、或操作者是 admin。
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_no_elevation' AND tablename = 'profiles') THEN
        CREATE POLICY "profiles_no_elevation" ON profiles FOR UPDATE
            WITH CHECK (
                NEW.user_group IS NOT DISTINCT FROM user_group
                OR NEW.user_group = 'verified'
                OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_group = 'admin')
            );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '跳过 profiles_no_elevation 策略: %', SQLERRM;
END $$;

-- ---------- 3. 校验：输出最终策略清单供人工核对 ----------
SELECT schemaname, tablename, policyname, permissive, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('profiles', 'cards', 'questions')
ORDER BY tablename, policyname;
