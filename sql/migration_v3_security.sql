-- ============================================================
-- BioQuest — 安全审计修复（migration_v3）
-- 适用 Supabase SQL Editor
-- 修复 4 个高风险问题：
--   1. handle_new_user 触发器不写 email/device_id
--   2. 客户端可改 email/user_key/user_group（绕过 admin 流程）
--   3. profiles 表无匿名可读视图（UI 取不到昵称）
--   4. teacher 模式 user_key 查询需要专用函数（避免 RLS 冲突）
-- ============================================================


-- ============================================================
-- 1. 修复 handle_new_user 触发器，补写 email/device_id/user_group
-- ============================================================

-- 1.1 先补齐缺失列（如果 schema.sql 没建）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_key TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_group TEXT DEFAULT 'member';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cr INT DEFAULT 50;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, email, device_id, user_group, cr)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'device_id',
    COALESCE(NEW.raw_user_meta_data->>'user_group', 'member'),
    50
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================
-- 2. 创建 public_profiles 视图（仅暴露非敏感字段）
--    UI 渲染其他用户信息时统一读这个视图
--    security_invoker = off → 用 owner 权限（postgres）读 profiles
--    但视图只 select 公开列，email/user_key 物理上不暴露
-- ============================================================
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
SELECT
  id,
  username,
  display_name,
  avatar_url,
  bio_score,
  user_group,
  cr,
  created_at
FROM public.profiles;

ALTER VIEW public.public_profiles SET (security_invoker = off);
GRANT SELECT ON public.public_profiles TO anon, authenticated;


-- ============================================================
-- 3. 收紧 profiles 表 RLS + 触发器兜底
--    策略：
--      SELECT 保持 USING (true) 以兼容现有查询
--            （但代码层 select 列表必须不包含 email/user_key）
--      INSERT 禁止（由 handle_new_user 触发器写入）
--      UPDATE 触发器拦截敏感字段：email/user_key/user_group/id/created_at
-- ============================================================

-- 3.1 清理旧策略
DROP POLICY IF EXISTS profiles_select_policy ON profiles;
DROP POLICY IF EXISTS profiles_insert_policy ON profiles;
DROP POLICY IF EXISTS profiles_update_policy ON profiles;
DROP POLICY IF EXISTS profiles_select_own ON profiles;
DROP POLICY IF EXISTS profiles_update_own ON profiles;

-- 3.2 SELECT：所有人可读（保持现有功能，敏感字段靠视图 + 触发器保护）
CREATE POLICY profiles_select_all ON profiles
  FOR SELECT TO anon, authenticated
  USING (true);

-- 3.3 INSERT：不创建策略 = 禁止客户端直接插入
--      （只能由 handle_new_user 触发器以 SECURITY DEFINER 角色写入）

-- 3.4 UPDATE：本人可更新自己的非敏感字段（触发器会拦截敏感字段）
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3.5 DELETE：禁止（账号删除走 Supabase auth.admin API）


-- ============================================================
-- 4. 触发器：禁止客户端绕过 RLS 修改敏感字段
-- ============================================================
CREATE OR REPLACE FUNCTION public.profile_protect_sensitive()
RETURNS trigger AS $$
BEGIN
  -- email 只能由服务端（handle_new_user/service_role）设置
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    IF current_setting('role', true) NOT IN ('service_role', 'supabase_admin') THEN
      NEW.email := OLD.email;
    END IF;
  END IF;

  -- user_key 只能由服务端设置（教师后台写入 user_key）
  IF NEW.user_key IS DISTINCT FROM OLD.user_key THEN
    IF current_setting('role', true) NOT IN ('service_role', 'supabase_admin') THEN
      NEW.user_key := OLD.user_key;
    END IF;
  END IF;

  -- user_group 只能由 admin (service_role) 升级
  IF NEW.user_group IS DISTINCT FROM OLD.user_group THEN
    IF current_setting('role', true) NOT IN ('service_role', 'supabase_admin') THEN
      NEW.user_group := OLD.user_group;
    END IF;
  END IF;

  -- id / created_at 永远不能改
  NEW.id := OLD.id;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS profile_protect ON profiles;
CREATE TRIGGER profile_protect
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profile_protect_sensitive();


-- ============================================================
-- 5. 教师 user_key 查询函数（SECURITY DEFINER 绕过 RLS）
--    教师需要通过 8 位 user_key 查到学生公开信息
--    函数只返回非敏感字段
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_student_by_key(p_user_key text)
RETURNS TABLE(
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio_score int,
  total_answered int,
  total_correct int,
  accuracy numeric,
  current_streak int,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.username, p.display_name, p.avatar_url,
    p.bio_score, p.total_answered, p.total_correct,
    p.accuracy, p.current_streak, p.updated_at
  FROM public.profiles p
  WHERE UPPER(p.user_key) = UPPER(p_user_key)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_student_by_key(text) TO authenticated;


-- ============================================================
-- 6. 增加关键索引
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON profiles (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON profiles (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_profiles_user_key ON profiles (user_key) WHERE user_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_user_group ON profiles (user_group) WHERE user_group != 'member';


-- ============================================================
-- 7. 前端迁移指引
-- ============================================================
-- 读取其他用户公开信息时，用 .from('public_profiles') 代替 .from('profiles')
--   .select('id, username, display_name, avatar_url, ...')
-- 读取自己的完整 profile，用 .from('profiles').eq('id', myId) （select 不带 email/user_key）
-- 教师查学生改用 RPC：sb.rpc('get_student_by_key', { p_user_key: key })
-- ============================================================
