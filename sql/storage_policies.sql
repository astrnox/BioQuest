-- BioQuest Storage RLS Policies for bioquest-ebooks bucket
-- 在 Supabase Dashboard → SQL Editor 中执行此文件

-- 确保存储桶存在
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('bioquest-ebooks', 'bioquest-ebooks', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- 更新为允许公开读取（方便前端直接加载 PDF）
UPDATE storage.buckets SET public = true WHERE id = 'bioquest-ebooks';

-- 上传策略（已认证用户）
CREATE POLICY IF NOT EXISTS "ebook_upload_auth" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bioquest-ebooks');

-- 更新策略（已认证用户，支持 upsert）
CREATE POLICY IF NOT EXISTS "ebook_update_auth" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'bioquest-ebooks')
  WITH CHECK (bucket_id = 'bioquest-ebooks');

-- 读取策略（所有人，因为 bucket 设为 public）
CREATE POLICY IF NOT EXISTS "ebook_read_public" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'bioquest-ebooks');

-- 删除策略（已认证用户）
CREATE POLICY IF NOT EXISTS "ebook_delete_auth" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'bioquest-ebooks');
