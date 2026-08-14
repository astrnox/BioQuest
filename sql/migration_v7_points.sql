-- ============================================================
-- BioQuest 数据库迁移 v7：信用点 CR → 积分 Points
-- 1. profiles.cr / cr_updated_at → points / points_updated_at（数据迁移）
-- 2. q_bounties.cr_reward / extra_reward → points_reward / extra_points
-- 3. 等级触发器改为基于 points 阈值
-- ============================================================

BEGIN;

-- 1. 为 profiles 增加 points / points_updated_at 列
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'points' AND table_schema = 'public'
    ) THEN
        ALTER TABLE profiles ADD COLUMN points INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'points_updated_at' AND table_schema = 'public'
    ) THEN
        ALTER TABLE profiles ADD COLUMN points_updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '跳过 profiles.points 字段: %', SQLERRM;
END $$;

-- 2. 从 cr 迁移数据（若 cr 字段存在）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'cr' AND table_schema = 'public'
    ) THEN
        UPDATE profiles SET points = COALESCE(cr, 0)
        WHERE points IS NULL OR points = 0;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '迁移 profiles.cr -> points 失败: %', SQLERRM;
END $$;

UPDATE profiles SET points = 0 WHERE points IS NULL;
UPDATE profiles SET points_updated_at = now() WHERE points_updated_at IS NULL;

-- 3. 迁移悬赏金额字段
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'q_bounties' AND column_name = 'cr_reward' AND table_schema = 'public'
    ) THEN
        ALTER TABLE q_bounties RENAME COLUMN cr_reward TO points_reward;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '跳过 q_bounties.cr_reward 重命名: %', SQLERRM;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'q_bounties' AND column_name = 'extra_reward' AND table_schema = 'public'
    ) THEN
        ALTER TABLE q_bounties RENAME COLUMN extra_reward TO extra_points;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '跳过 q_bounties.extra_reward 重命名: %', SQLERRM;
END $$;

-- 4. 基于 points 自动升级用户组（仅 member/verified/premium 之间升降）
--   - points >= 10000（大师）自动升级为 premium
--   - points >= 2000（园丁）自动升级为 verified
--   - points < 2000 降级为 member（admin 不受影响）
CREATE OR REPLACE FUNCTION public.upgrade_user_group_by_points()
RETURNS trigger AS $$
BEGIN
    IF NEW.user_group = 'admin' THEN
        RETURN NEW;
    END IF;

    IF NEW.points >= 10000 AND NEW.user_group IN ('member', 'guest') THEN
        NEW.user_group := 'premium';
    ELSIF NEW.points >= 2000 AND NEW.user_group IN ('member', 'guest') THEN
        NEW.user_group := 'verified';
    ELSIF NEW.points < 2000 AND NEW.user_group IN ('verified', 'premium') THEN
        NEW.user_group := 'member';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_points_updated ON profiles;
CREATE TRIGGER on_points_updated
    BEFORE UPDATE OF points ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.upgrade_user_group_by_points();

-- 初次运行：根据现有 points 校正用户组
DO $$
BEGIN
    UPDATE profiles
    SET user_group = CASE
        WHEN points >= 10000 AND user_group != 'admin' THEN 'premium'
        WHEN points >= 2000 AND user_group NOT IN ('admin', 'premium') THEN 'verified'
        WHEN points < 2000 AND user_group NOT IN ('admin') THEN 'member'
        ELSE user_group
    END;
END $$;

-- 5. 清理旧 cr 列（可选：如需保留可注释。前端已全面迁移到 points）
-- ALTER TABLE profiles DROP COLUMN IF EXISTS cr;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS cr_updated_at;

COMMIT;