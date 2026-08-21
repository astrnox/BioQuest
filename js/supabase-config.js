/**
 * ============================================================
 * BioQuest — Supabase 公开配置单一来源
 *
 * anon key 按 Supabase 设计为「公开可读」密钥（仅供客户端公开读取，
 * 服务端安全由 RLS 策略强制；真正机密是 service_role key，绝不入前端）。
 * 将 URL / anon key 统一收敛到本文件，避免在 admin.js / wiki.js /
 * daily-billion.js / loader.js 等处重复硬编码，便于统一轮换，
 * 杜绝「改了 A 忘了 B」的遗漏（P0-001 修复）。
 *
 * 本脚本必须被相关页面在最前面同步加载，保证任意 defer / 动态脚本
 * 执行时 window.SUPABASE_URL / window.SUPABASE_ANON_KEY 已可用。
 * ============================================================
 */
(function () {
  'use strict';
  // 幂等：若已有同名全局（如 supabase-client.js 已定义），不覆盖
  if (typeof window.SUPABASE_URL === 'undefined') {
    window.SUPABASE_URL = 'https://pgkjpuowpxngmxjjlfil.supabase.co';
  }
  if (typeof window.SUPABASE_ANON_KEY === 'undefined') {
    window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBna2pwdW93cHhuZ214ampsZmlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODM2MzIsImV4cCI6MjA5NjI1OTYzMn0.lgfxN9htgo1i4tX_KwEehW47uqOwj3Jfwy-ljsjQnx4';
  }
})();
