-- ============================================================
-- BioQuest — 题目图片存储 Bucket 初始化
-- 在 Supabase Dashboard → SQL Editor 中执行此文件
-- 创建 question-images bucket 并配置 RLS 策略
-- ============================================================
-- [幂等改造] Issue #143
-- 原文件使用 `CREATE POLICY IF NOT EXISTS`，该语法在
-- PostgreSQL / Supabase PG15 中非法（不支持 IF NOT EXISTS），
-- 首次执行即报错。现已改为 DO 块 + pg_policies 存在性判断，
-- 重复执行业务语义不变且不报错。
-- ============================================================

-- 1. 创建存储桶（公开读，管理员可写）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'question-images',
  'question-images',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 确保 bucket 是公开的
UPDATE storage.buckets SET public = true WHERE id = 'question-images';

-- 2. 读取策略：所有人可读（因为 bucket 是 public）
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'question_images_read_public') THEN
    EXECUTE 'CREATE POLICY "question_images_read_public" ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = ''question-images'')';
  END IF;
END $$;

-- 3. 上传策略：仅管理员可上传（通过 bioquest_is_admin() 函数检查）
-- 注意：需要先运行 schema.sql 中的 bioquest_is_admin() 函数
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'question_images_upload_admin') THEN
    EXECUTE 'CREATE POLICY "question_images_upload_admin" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = ''question-images''
        AND bioquest_is_admin()
      )';
  END IF;
END $$;

-- 4. 更新策略：仅管理员可更新/替换图片
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'question_images_update_admin') THEN
    EXECUTE 'CREATE POLICY "question_images_update_admin" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = ''question-images''
        AND bioquest_is_admin()
      )
      WITH CHECK (
        bucket_id = ''question-images''
        AND bioquest_is_admin()
      )';
  END IF;
END $$;

-- 5. 删除策略：仅管理员可删除图片
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'question_images_delete_admin') THEN
    EXECUTE 'CREATE POLICY "question_images_delete_admin" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = ''question-images''
        AND bioquest_is_admin()
      )';
  END IF;
END $$;
