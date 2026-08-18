-- ============================================================
-- BioQuest — Supabase 邮件模板（请在 Dashboard 配置）
-- ============================================================
-- 邮件被判定为垃圾的常见原因：
--   1. 发送方地址是通用 noreply@mail.app.supabase.io（信誉低）
--   2. 主题/正文含过多营销词、感叹号
--   3. HTML/纯文本比例失衡
--   4. 缺少 List-Unsubscribe 头
--   5. 链接全是 supabase.co 域名（外链比例 100%）
-- 解决：
--   A. 配置自定义 SMTP（Settings → Auth → SMTP Settings）
--      推荐：SendGrid / Mailgun / Resend / 阿里云 DM
--   B. 用下方模板替换 Dashboard 默认模板
--   C. 在 DNS 加 SPF/DKIM/DMARC 记录
-- ============================================================

-- ============================================================
-- 1. 注册确认邮件模板（在 Dashboard → Auth → Email Templates → Confirm signup 粘贴）
-- ============================================================
-- Subject (主题)：
--   [BioQuest] 请确认你的注册邮箱
--
-- Body (正文，HTML + 纯文本双版本)：
-- HTML 版本：
/*
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a2b3c;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
    <div style="padding:24px 32px;border-bottom:1px solid #e8ecf0;">
      <h1 style="margin:0;font-size:18px;font-weight:600;color:#2a5a2a;">BioQuest · 生物学习平台</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;">你好，</p>
      <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;">
        感谢你注册 BioQuest 账号。点击下方按钮完成邮箱验证，即可解锁完整功能。
      </p>
      <p style="margin:0 0 32px 0;text-align:center;">
        <a href="{{ .ConfirmationURL }}"
           style="display:inline-block;padding:12px 32px;background:#3a7a2a;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:500;">
          确认我的邮箱
        </a>
      </p>
      <p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;color:#6a7a8a;">
        按钮无法点击？复制以下链接到浏览器：
      </p>
      <p style="margin:0 0 24px 0;font-size:12px;line-height:1.5;color:#6a7a8a;word-break:break-all;background:#f4f6f8;padding:12px;border-radius:4px;">
        {{ .ConfirmationURL }}
      </p>
      <p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;color:#6a7a8a;">
        此链接 24 小时内有效。如果你没有注册 BioQuest 账号，请忽略此邮件。
      </p>
    </div>
    <div style="padding:16px 32px;background:#f4f6f8;font-size:12px;color:#8a9aaa;line-height:1.5;">
      <p style="margin:0 0 4px 0;">BioQuest · 用生物知识服务社会公益</p>
      <p style="margin:0;">
        <a href="https://astrnox.github.io/BioQuest/" style="color:#6a7a8a;text-decoration:none;">项目主页</a> ·
        <a href="mailto:support@bio.sumalink.cn?subject=取消订阅" style="color:#6a7a8a;text-decoration:none;">联系我们</a>
      </p>
    </div>
  </div>
</body>
</html>
*/

-- 纯文本版本（重要：必须有 plain text，否则 ISP 评分扣分）：
/*
你好，

感谢你注册 BioQuest 账号。点击下方链接完成邮箱验证，即可解锁完整功能：

{{ .ConfirmationURL }}

此链接 24 小时内有效。
如果你没有注册 BioQuest 账号，请忽略此邮件。

——
BioQuest · 用生物知识服务社会公益
项目主页：https://astrnox.github.io/BioQuest/
联系我们：support@bio.sumalink.cn
*/

-- ============================================================
-- 2. 密码重置邮件模板（Confirm signup → Reset password 模板页签）
-- ============================================================
-- Subject：
--   [BioQuest] 重置你的密码
--
-- Body（HTML）：
/*
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a2b3c;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
    <div style="padding:24px 32px;border-bottom:1px solid #e8ecf0;">
      <h1 style="margin:0;font-size:18px;font-weight:600;color:#2a5a2a;">BioQuest · 密码重置</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;">你好，</p>
      <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;">
        我们收到了你的密码重置请求。点击下方按钮设置新密码：
      </p>
      <p style="margin:0 0 32px 0;text-align:center;">
        <a href="{{ .ConfirmationURL }}"
           style="display:inline-block;padding:12px 32px;background:#3a7a2a;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:500;">
          重置我的密码
        </a>
      </p>
      <p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;color:#6a7a8a;">
        按钮无法点击？复制以下链接到浏览器：
      </p>
      <p style="margin:0 0 24px 0;font-size:12px;line-height:1.5;color:#6a7a8a;word-break:break-all;background:#f4f6f8;padding:12px;border-radius:4px;">
        {{ .ConfirmationURL }}
      </p>
      <p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;color:#6a7a8a;">
        此链接 1 小时内有效。如果不是你发起的请求，请忽略此邮件，你的账号仍然安全。
      </p>
    </div>
    <div style="padding:16px 32px;background:#f4f6f8;font-size:12px;color:#8a9aaa;line-height:1.5;">
      <p style="margin:0 0 4px 0;">BioQuest · 用生物知识服务社会公益</p>
      <p style="margin:0;">
        <a href="https://astrnox.github.io/BioQuest/" style="color:#6a7a8a;text-decoration:none;">项目主页</a>
      </p>
    </div>
  </div>
</body>
</html>
*/


-- ============================================================
-- 3. DNS 记录（域名所有者添加）
-- ============================================================
-- 如果你用 bio.sumalink.cn 域名，DNS 添加：
--   v=spf1 include:sendgrid.net ~all
--   （Mailgun: include:mailgun.org / Resend: include:resend.com）
--
-- DKIM：由 SMTP 服务商提供
-- DMARC：_dmarc.bio.sumalink.cn TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@bio.sumalink.cn"


-- ============================================================
-- 4. 自定义 SMTP 配置路径
-- ============================================================
-- Supabase Dashboard → Settings → Auth → SMTP Settings:
--   Host:        smtp.sendgrid.net   (示例)
--   Port:        587
--   User:        apikey
--   Password:    <your-sendgrid-api-key>
--   Sender email: noreply@bio.sumalink.cn
--   Sender name:  BioQuest
--   Enable custom SMTP: ON
--
-- 启用自定义 SMTP 后，Authentication → Email Templates 里
-- 的模板才会被实际使用（默认 Supabase 模板使用通用 noreply）


-- ============================================================
-- 5. 反垃圾要点自检清单
-- ============================================================
-- [ ] 1. 自定义 SMTP 已开启（不是默认 supabase.io 域名）
-- [ ] 2. 发件人带品牌名（如 BioQuest <noreply@bio.sumalink.cn>）
-- [ ] 3. 主题无感叹号、无 ALL CAPS
-- [ ] 4. 正文同时提供 HTML 和纯文本版本
-- [ ] 5. 链接数量 < 3 个，且至少有 1 个指向 bio.sumalink.cn
-- [ ] 6. 域名 SPF/DKIM/DMARC 记录已加
-- [ ] 7. 邮件底部有「联系我们」「项目主页」链接（提升信誉）
-- [ ] 8. 重要：List-Unsubscribe 头（自定义 SMTP 自动加）
-- [ ] 9. Supabase → Auth → Rate Limits → Email rate limit 调高
--       默认 30/小时，注册高峰期会被限流
-- [ ] 10. 启用 auto_confirm_email 触发器后，注册邮件仍会发送
--        （用户收不到，但账号已激活）。如要彻底不发，
--        Dashboard → Auth → Sign In/Up → Confirm email: OFF
