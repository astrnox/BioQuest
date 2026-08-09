-- ============================================================
-- BioQuest — 找回密码功能（无需邮件，user_key 验证）
-- 适用 Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. 注册时自动生成 8 字符 user_key（如果还没有）
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_user_key TEXT;
BEGIN
  -- 生成 8 字符 user_key：去除易混字符 (0/O/1/l/I)
  LOOP
    v_user_key := UPPER(
      SUBSTRING('ABCDEFGHJKMNPQRSTUVWXYZ23456789' FROM 1 + FLOOR(RANDOM() * 32) FOR 1) ||
      SUBSTRING('ABCDEFGHJKMNPQRSTUVWXYZ23456789' FROM 1 + FLOOR(RANDOM() * 32) FOR 1) ||
      SUBSTRING('ABCDEFGHJKMNPQRSTUVWXYZ23456789' FROM 1 + FLOOR(RANDOM() * 32) FOR 1) ||
      SUBSTRING('ABCDEFGHJKMNPQRSTUVWXYZ23456789' FROM 1 + FLOOR(RANDOM() * 32) FOR 1) ||
      SUBSTRING('ABCDEFGHJKMNPQRSTUVWXYZ23456789' FROM 1 + FLOOR(RANDOM() * 32) FOR 1) ||
      SUBSTRING('ABCDEFGHJKMNPQRSTUVWXYZ23456789' FROM 1 + FLOOR(RANDOM() * 32) FOR 1) ||
      SUBSTRING('ABCDEFGHJKMNPQRSTUVWXYZ23456789' FROM 1 + FLOOR(RANDOM() * 32) FOR 1) ||
      SUBSTRING('ABCDEFGHJKMNPQRSTUVWXYZ23456789' FROM 1 + FLOOR(RANDOM() * 32) FOR 1)
    );
    -- 唯一性兜底
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE user_key = v_user_key);
  END LOOP;

  INSERT INTO public.profiles (id, username, display_name, email, device_id, user_group, user_key, cr)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'device_id',
    COALESCE(NEW.raw_user_meta_data->>'user_group', 'member'),
    v_user_key,
    50
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    -- 只在原 user_key 为空时填充
    user_key = COALESCE(profiles.user_key, EXCLUDED.user_key);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================
-- 2. 找回密码 RPC：username + user_key 验证 → 重置密码
--    兼容 Supabase 加密格式（crypt + gen_salt bf）
-- ============================================================
CREATE OR REPLACE FUNCTION public.reset_password_by_key(
  p_username TEXT,
  p_user_key TEXT,
  p_new_password TEXT
)
RETURNS TABLE(
  ok BOOLEAN,
  user_id UUID,
  error_msg TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_crypted TEXT;
BEGIN
  -- 1. 查找用户
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE LOWER(username) = LOWER(p_username)
    AND UPPER(user_key) = UPPER(p_user_key)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, '用户名或 8 字符密钥不正确'::TEXT;
    RETURN;
  END IF;

  -- 2. 校验新密码强度（至少 6 位）
  IF LENGTH(p_new_password) < 6 THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, '新密码至少 6 位'::TEXT;
    RETURN;
  END IF;

  -- 3. 用 crypt() 加密新密码（Supabase auth.users.encrypted_password 格式）
  v_crypted := crypt(p_new_password, gen_salt('bf'));

  -- 4. 更新 auth.users.encrypted_password
  UPDATE auth.users
  SET encrypted_password = v_crypted,
      updated_at = NOW()
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, '用户不存在'::TEXT;
    RETURN;
  END IF;

  -- 5. 记录审计日志（可选：写到 cr_logs）
  -- INSERT INTO cr_logs (...) VALUES (...);

  RETURN QUERY SELECT TRUE, v_user_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.reset_password_by_key(TEXT, TEXT, TEXT) TO anon, authenticated;


-- ============================================================
-- 3. 查询自己的 user_key（如果忘了）
--    验证方式：username + 邮箱后 4 位
-- ============================================================
CREATE OR REPLACE FUNCTION public.recover_user_key(
  p_username TEXT,
  p_email_hint TEXT  -- 邮箱后缀，如 @gmail.com
)
RETURNS TABLE(
  ok BOOLEAN,
  user_key TEXT,
  error_msg TEXT
) AS $$
DECLARE
  v_user_key TEXT;
BEGIN
  -- 通过 username + email 后缀匹配（半验证）
  SELECT p.user_key INTO v_user_key
  FROM public.profiles p
  WHERE LOWER(p.username) = LOWER(p_username)
    AND LOWER(p.email) LIKE '%' || LOWER(p_email_hint)
  LIMIT 1;

  IF v_user_key IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, '用户名或邮箱不匹配'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, v_user_key, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.recover_user_key(TEXT, TEXT) TO anon, authenticated;


-- ============================================================
-- 4. 索引：加速 user_key 查找
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_key_upper ON profiles (UPPER(user_key)) WHERE user_key IS NOT NULL;
