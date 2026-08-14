/**
 * ============================================================
 * BioQuest - 管理员后台模块
 * 题目管理、用户管理、密钥验证
 * 设计风格：与主站一致，深绿/琥珀色系，衬线字体
 * ============================================================
 */

let _adminSecretKey = null;
let _adminAuthenticated = false;

// admin modal 焦点陷阱管理（统一通过 MutationObserver 监听 display 变化）
var _adminModalTraps = {};

// ===== 管理员后台常量（超时 / 限制 / 重试） =====
var ADMIN_TOKEN_TTL = 5 * 60 * 1000;            // 管理员 token 有效期（5 分钟）
var ADMIN_LOGIN_MAX_ATTEMPTS = 5;               // 连续失败锁定阈值
var ADMIN_LOGIN_LOCK_DURATION_MS = 60000;       // 失败锁定时长（60 秒）
var ADMIN_LOGIN_DELAY_PER_ATTEMPT_MS = 200;     // 每次尝试叠加延迟
var ADMIN_LOGIN_MAX_DELAY_MS = 2000;            // 单次尝试延迟上限
var ADMIN_COUNT_LIMIT = 100000;                 // 统计总数用的查询 limit
var ADMIN_CARDS_COUNT_LIMIT = 1000;             // 卡片统计查询 limit
var ADMIN_LIST_LIMIT = 100;                     // 列表查询默认 limit
var ADMIN_FEEDBACK_LIMIT = 200;                 // 反馈/举报列表查询 limit
var ADMIN_ANNOUNCEMENT_LIMIT = 50;              // 公告列表查询 limit
var ADMIN_IMAGE_MAX_BYTES = 2 * 1024 * 1024;    // 题目配图上传大小上限（2MB）
var ADMIN_EBOOK_MAX_BYTES = 50 * 1024 * 1024;   // PDF 上传大小上限（50MB）
var ADMIN_EBOOK_UPLOAD_TIMEOUT_MS = 300000;     // 大文件上传超时（5 分钟）
var ADMIN_EBOOK_RETRY_BASE_DELAY_MS = 2000;     // 上传失败重试退避基础延迟
var OCR_MAX_IMAGES = 10;                        // OCR 单次最多处理图片数
var OCR_IMAGE_MAX_BYTES = 5 * 1024 * 1024;      // OCR 单图大小上限（5MB）
var ADMIN_TOAST_DISPLAY_MS = 2500;              // 后台 Toast 默认展示时长
var AI_GEN_MAX_TOKENS = 4096;                   // AI 题目生成最大 token 数

function _getAdminModalTitle(overlay) {
  var titleEl = overlay.querySelector('.admin-modal-title, h3');
  return titleEl ? titleEl.textContent.trim() : '管理弹窗';
}

function _applyAdminModalA11y(overlay) {
  if (!overlay) return;
  if (!overlay.getAttribute('role')) overlay.setAttribute('role', 'dialog');
  if (overlay.getAttribute('aria-modal') !== 'true') overlay.setAttribute('aria-modal', 'true');
  var title = _getAdminModalTitle(overlay);
  if (title && !overlay.getAttribute('aria-label') && !overlay.getAttribute('aria-labelledby')) {
    overlay.setAttribute('aria-label', title);
  }
}

function _trapAdminModal(overlay) {
  if (!overlay || !window.BioQuestA11y || typeof window.BioQuestA11y.trapFocus !== 'function') return;
  var id = overlay.id || ('admin-modal-' + Math.random().toString(36).slice(2, 9));
  if (!overlay.id) overlay.id = id;
  if (_adminModalTraps[id]) { _adminModalTraps[id].release(); _adminModalTraps[id] = null; }
  _applyAdminModalA11y(overlay);
  var firstFocus = overlay.querySelector('input, select, textarea, button, a[href]');
  _adminModalTraps[id] = window.BioQuestA11y.trapFocus(overlay, {
    onEscape: function() {
      // 尝试调用常见的关闭函数；若不存在则隐藏 overlay
      var closeFn = window['closeUserModal'] || window['closeMuteModal'] || window['closePostStatModal'] ||
                    window['closeCardModal'] || window['closeQuestionModal'] || window['closePostDetailModal'] ||
                    window['closeCommentsModal'];
      if (typeof closeFn === 'function') {
        try { closeFn(); } catch (e) {}
      } else {
        overlay.style.display = 'none';
      }
    },
    initialFocus: firstFocus || overlay.querySelector('.admin-modal-close') || overlay
  });
}

function _releaseAdminModal(overlay) {
  if (!overlay || !overlay.id) return;
  var trap = _adminModalTraps[overlay.id];
  if (trap) { trap.release(); delete _adminModalTraps[overlay.id]; }
}

function _initAdminModalObserver() {
  if (typeof MutationObserver === 'undefined') return;
  var observer = new MutationObserver(function(records) {
    for (var i = 0; i < records.length; i++) {
      var record = records[i];
      // 属性变化：监听 style.display
      if (record.type === 'attributes' && record.attributeName === 'style') {
        var target = record.target;
        if (!target.classList || !target.classList.contains('admin-modal-overlay')) continue;
        if (target.style.display === 'flex' || target.style.display === 'block') {
          _trapAdminModal(target);
        } else if (target.style.display === 'none') {
          _releaseAdminModal(target);
        }
      }
      // 子树变化：为新创建的 overlay 初始化并监控
      if (record.type === 'childList') {
        var added = record.addedNodes;
        for (var j = 0; j < added.length; j++) {
          var node = added[j];
          if (node.nodeType !== 1) continue;
          if (node.classList && node.classList.contains('admin-modal-overlay')) {
            _applyAdminModalA11y(node);
            if (node.style.display === 'flex' || node.style.display === 'block') {
              _trapAdminModal(node);
            }
            // 监听该节点的 style 变化
            observer.observe(node, { attributes: true, attributeFilter: ['style'] });
          }
          // 递归子元素
          var nested = node.querySelectorAll ? node.querySelectorAll('.admin-modal-overlay') : [];
          for (var k = 0; k < nested.length; k++) {
            _applyAdminModalA11y(nested[k]);
            if (nested[k].style.display === 'flex' || nested[k].style.display === 'block') {
              _trapAdminModal(nested[k]);
            }
            observer.observe(nested[k], { attributes: true, attributeFilter: ['style'] });
          }
        }
        // 节点被移除时释放
        var removed = record.removedNodes;
        for (var r = 0; r < removed.length; r++) {
          var rnode = removed[r];
          if (rnode.nodeType !== 1) continue;
          if (rnode.id && rnode.classList && rnode.classList.contains('admin-modal-overlay')) {
            _releaseAdminModal(rnode);
          }
          var rnested = rnode.querySelectorAll ? rnode.querySelectorAll('.admin-modal-overlay') : [];
          for (var rn = 0; rn < rnested.length; rn++) {
            _releaseAdminModal(rnested[rn]);
          }
        }
      }
    }
  });

  // 初始化现有 overlay
  var existing = document.querySelectorAll('.admin-modal-overlay');
  for (var e = 0; e < existing.length; e++) {
    _applyAdminModalA11y(existing[e]);
    observer.observe(existing[e], { attributes: true, attributeFilter: ['style'] });
  }
  // 监听 body 子树，捕获动态创建的 overlay
  observer.observe(document.body, { childList: true, subtree: true });
}

// DOM 就绪后启动监听
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initAdminModalObserver);
} else {
  _initAdminModalObserver();
}

// escapeHtml 本地 fallback
var escapeHtml = (typeof window !== 'undefined' && typeof window.escapeHtml === 'function')
  ? window.escapeHtml
  : function(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

// 修复：当 Supabase auth 状态变化时，admin 模块同步更新认证状态
window._onAuthUserLoaded = function(user) {
  if (user && user.user_group === 'admin') {
    if (!_adminAuthenticated) {
      _adminAuthenticated = true;
      // 安全：Supabase 管理员身份仅解锁前端 UI，绝不作为服务端管理凭证
      // （服务端无法验证 Supabase JWT，否则任何人伪造 X-Admin-Key: supabase_admin 即可提权）。
      // 服务端管理操作仍需通过 adminLogin 输入真实管理员密钥。
      _adminSecretKey = null;
      var token = JSON.stringify({ t: Date.now(), exp: ADMIN_TOKEN_TTL });
      sessionStorage.setItem('bioquest_admin_auth', token);

    }
  } else if (user) {
    // 普通用户登录时，如果当前 _adminAuthenticated 是从 sessionStorage 恢复的但用户不是 admin，
    // 清除 admin 认证
    if (_adminAuthenticated && _adminSecretKey === 'session_restored') {
      _adminAuthenticated = false;
      _adminSecretKey = null;
      sessionStorage.removeItem('bioquest_admin_auth');

    }
  } else {
    // 用户登出时
    _adminAuthenticated = false;
    _adminSecretKey = null;
    sessionStorage.removeItem('bioquest_admin_auth');
  }
};

// showToast 本地 fallback
function showToast(message) {
  if (typeof window.showToast === 'function' && window.showToast !== showToast) {
    window.showToast(message);
    return;
  }
  var existing = document.getElementById('admin-toast');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.id = 'admin-toast';
  toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--color-deep,#1a3a2a);color:#fff;padding:12px 28px;border-radius:12px;font-size:0.88rem;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.2);animation:slideUp 0.3s ease,fadeOut 0.3s ease 1.7s forwards;';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function() { if (toast.parentNode) toast.remove(); }, 2200);
}

function injectAdminStyles() {
  const styleId = 'admin-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* ===== 管理员登录页 ===== */
    .admin-login-wrap {
      min-height: 70vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
    }

    .admin-login-card {
      width: 100%;
      max-width: 420px;
      background: var(--surface-primary, #ffffff);
      border: 1px solid var(--border-light, #ece8e1);
      border-radius: 24px;
      padding: 48px 40px;
      box-shadow: 0 4px 24px rgba(26,58,42,0.08), 0 1px 3px rgba(26,58,42,0.04);
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .admin-login-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--color-sage, #5a7d5c), var(--color-amber, #c4956a));
    }

    .admin-login-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px;
      background: linear-gradient(135deg, var(--color-sage, #5a7d5c), var(--color-deep, #1a3a2a));
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(90,125,92,0.25);
    }

    .admin-login-icon svg {
      width: 32px;
      height: 32px;
      stroke: #fff;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .admin-login-title {
      font-family: var(--font-serif, 'Noto Serif SC', serif);
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--color-deep, #1a3a2a);
      margin-bottom: 6px;
    }

    .admin-login-subtitle {
      font-size: 0.88rem;
      color: var(--text-muted, #8a8a8a);
      margin-bottom: 32px;
      line-height: 1.5;
    }

    .admin-login-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .admin-login-input-wrap {
      position: relative;
    }

    .admin-login-input-wrap svg {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      stroke: var(--text-muted, #8a8a8a);
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: stroke 0.2s;
    }

    .admin-login-input {
      width: 100%;
      padding: 14px 18px 14px 46px;
      border: 1.5px solid var(--border-light, #ece8e1);
      border-radius: 14px;
      font-size: 0.95rem;
      background: var(--surface-secondary, #faf7f2);
      transition: all 0.25s ease;
      box-sizing: border-box;
    }

    .admin-login-input:focus {
      outline: none;
      border-color: var(--color-sage, #5a7d5c);
      background: var(--surface-primary, #ffffff);
      box-shadow: 0 0 0 3px rgba(90,125,92,0.1);
    }

    .admin-login-input:focus + svg,
    .admin-login-input:focus ~ svg {
      stroke: var(--color-sage, #5a7d5c);
    }

    .admin-login-btn {
      padding: 14px 28px;
      background: linear-gradient(135deg, var(--color-sage, #5a7d5c), var(--color-deep, #1a3a2a));
      color: #fff;
      border: none;
      border-radius: 14px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s ease;
      position: relative;
      overflow: hidden;
    }

    .admin-login-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(90,125,92,0.3);
    }

    .admin-login-btn:active {
      transform: translateY(0);
    }

    .admin-login-error {
      color: var(--color-error, #c0553a);
      font-size: 0.85rem;
      margin-top: 8px;
      display: none;
      animation: adminShake 0.4s ease;
    }

    @keyframes adminShake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-4px); }
      40%, 80% { transform: translateX(4px); }
    }

    .admin-login-hint {
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid var(--border-light, #ece8e1);
      font-size: 0.78rem;
      color: var(--text-muted, #8a8a8a);
      line-height: 1.6;
    }

    /* ===== 管理员仪表盘 ===== */
    .admin-dash {
      max-width: 1100px;
      margin: 0 auto;
      padding: 32px 20px;
      animation: adminFadeIn 0.4s ease;
    }

    @keyframes adminFadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .admin-dash-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 28px;
      padding: 28px 32px;
      background: linear-gradient(135deg, var(--color-deep, #1a3a2a) 0%, #2a4a34 100%);
      border-radius: 20px;
      color: #fff;
      position: relative;
      overflow: hidden;
    }

    .admin-dash-header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -10%;
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, rgba(196,149,106,0.15) 0%, transparent 70%);
      border-radius: 50%;
    }

    .admin-dash-header-left {
      position: relative;
      z-index: 1;
    }

    .admin-dash-title {
      font-family: var(--font-serif, 'Noto Serif SC', serif);
      font-size: 1.6rem;
      font-weight: 700;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .admin-dash-title svg {
      width: 24px;
      height: 24px;
      stroke: var(--color-amber, #c4956a);
      fill: none;
      stroke-width: 2;
    }

    .admin-dash-subtitle {
      font-size: 0.88rem;
      color: rgba(255,255,255,0.6);
    }

    .admin-dash-logout {
      padding: 10px 20px;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.2);
      color: #fff;
      border-radius: 10px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      z-index: 1;
    }

    .admin-dash-logout:hover {
      background: rgba(255,255,255,0.2);
    }

    /* ===== 标签页导航 ===== */
    .admin-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      background: var(--surface-primary, #ffffff);
      border: 1px solid var(--border-light, #ece8e1);
      border-radius: 14px;
      padding: 6px;
    }

    .admin-tab {
      flex: 1;
      padding: 12px 20px;
      background: transparent;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--text-secondary, #4a4a4a);
      transition: all 0.25s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .admin-tab svg {
      width: 18px;
      height: 18px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .admin-tab:hover {
      background: var(--surface-secondary, #faf7f2);
      color: var(--color-deep, #1a3a2a);
    }

    .admin-tab.active {
      background: var(--color-sage, #5a7d5c);
      color: #fff;
      box-shadow: 0 2px 8px rgba(90,125,92,0.25);
    }

    /* ===== 统计卡片 ===== */
    .admin-stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .admin-stat-card {
      background: var(--surface-primary, #ffffff);
      border: 1px solid var(--border-light, #ece8e1);
      border-radius: 16px;
      padding: 20px 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      transition: all 0.2s;
    }

    .admin-stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(26,58,42,0.08);
    }

    .admin-stat-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .admin-stat-icon svg {
      width: 22px;
      height: 22px;
      stroke-width: 2;
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .admin-stat-icon--green {
      background: rgba(90,125,92,0.12);
      stroke: var(--color-sage, #5a7d5c);
    }

    .admin-stat-icon--amber {
      background: rgba(196,149,106,0.12);
      stroke: var(--color-amber, #c4956a);
    }

    .admin-stat-icon--blue {
      background: rgba(59,130,246,0.12);
      stroke: #3b82f6;
    }

    .admin-stat-num {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-deep, #1a3a2a);
      line-height: 1;
    }

    .admin-stat-label {
      font-size: 0.78rem;
      color: var(--text-muted, #8a8a8a);
      margin-top: 2px;
    }

    /* ===== 内容区域 ===== */
    .admin-section {
      background: var(--surface-primary, #ffffff);
      border: 1px solid var(--border-light, #ece8e1);
      border-radius: 20px;
      padding: 28px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(26,58,42,0.04);
    }

    .admin-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-light, #ece8e1);
    }

    .admin-section-title {
      font-family: var(--font-serif, 'Noto Serif SC', serif);
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--color-deep, #1a3a2a);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .admin-section-title svg {
      width: 20px;
      height: 20px;
      stroke: var(--color-amber, #c4956a);
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .admin-section-badge {
      font-family: var(--font-mono, monospace);
      font-size: 0.75rem;
      padding: 4px 10px;
      background: rgba(196,149,106,0.12);
      color: var(--color-amber, #c4956a);
      border-radius: 8px;
      font-weight: 600;
    }

    /* ===== 用户表格 ===== */
    .admin-table-wrap {
      overflow-x: auto;
      border-radius: 12px;
      border: 1px solid var(--border-light, #ece8e1);
    }

    .admin-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }

    .admin-table th {
      background: var(--surface-secondary, #faf7f2);
      padding: 14px 16px;
      text-align: left;
      font-weight: 700;
      color: var(--color-deep, #1a3a2a);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid var(--border-light, #ece8e1);
    }

    .admin-table td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-light, #ece8e1);
      color: var(--text-primary, #1a1a1a);
    }

    .admin-table tr:last-child td {
      border-bottom: none;
    }

    .admin-table tr:hover td {
      background: rgba(90,125,92,0.03);
    }

    .admin-table-name {
      font-weight: 600;
      color: var(--color-deep, #1a3a2a);
    }

    .admin-table-score {
      font-family: var(--font-mono, monospace);
      font-weight: 700;
      color: var(--color-sage, #5a7d5c);
    }

    .admin-table-actions {
      display: flex;
      gap: 8px;
    }

    /* ===== 按钮 ===== */
    .admin-btn {
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .admin-btn svg {
      width: 14px;
      height: 14px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .admin-btn--danger {
      background: rgba(192,85,58,0.1);
      color: var(--color-error, #c0553a);
    }

    .admin-btn--danger:hover {
      background: var(--color-error, #c0553a);
      color: #fff;
    }

    .admin-btn--primary {
      background: var(--color-sage, #5a7d5c);
      color: #fff;
    }

    .admin-btn--primary:hover {
      background: var(--color-deep, #1a3a2a);
      transform: translateY(-1px);
    }

    .admin-btn--ghost {
      background: transparent;
      border: 1.5px solid var(--border-default, #e0dcd5);
      color: var(--text-secondary, #4a4a4a);
    }

    .admin-btn--ghost:hover {
      border-color: var(--color-sage, #5a7d5c);
      color: var(--color-sage, #5a7d5c);
    }

    /* ===== 题目卡片 ===== */
    .admin-q-card {
      background: var(--surface-secondary, #faf7f2);
      border: 1px solid var(--border-light, #ece8e1);
      border-radius: 14px;
      padding: 18px 20px;
      margin-bottom: 12px;
      transition: all 0.2s;
    }

    .admin-q-card:hover {
      border-color: var(--color-sage, #5a7d5c);
      box-shadow: 0 2px 8px rgba(90,125,92,0.08);
    }

    .admin-q-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .admin-q-body {
      flex: 1;
      min-width: 0;
    }

    .admin-q-text {
      font-weight: 600;
      color: var(--color-deep, #1a3a2a);
      margin-bottom: 8px;
      line-height: 1.5;
    }

    .admin-q-meta {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }

    .admin-q-tag {
      padding: 3px 10px;
      border-radius: 8px;
      font-size: 0.7rem;
      font-weight: 600;
    }

    .admin-q-tag--module {
      background: rgba(90,125,92,0.12);
      color: var(--color-sage, #5a7d5c);
    }

    .admin-q-tag--diff {
      background: rgba(196,149,106,0.12);
      color: var(--color-amber, #c4956a);
    }

    .admin-q-tag--subject {
      background: rgba(139,92,246,0.1);
      color: #7c3aed;
    }

    .admin-q-options {
      font-size: 0.8rem;
      color: var(--text-muted, #8a8a8a);
      margin-top: 8px;
      line-height: 1.6;
    }

    .admin-q-explanation {
      font-size: 0.8rem;
      color: var(--text-secondary, #4a4a4a);
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px dashed var(--border-light, #ece8e1);
    }

    /* ===== 表单 ===== */
    .admin-form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 18px;
    }

    .admin-form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .admin-form-group.full {
      grid-column: 1 / -1;
    }

    .admin-form-label {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-secondary, #4a4a4a);
    }

    .admin-form-input,
    .admin-form-select,
    .admin-form-textarea {
      padding: 12px 16px;
      border: 1.5px solid var(--border-light, #ece8e1);
      border-radius: 12px;
      font-size: 0.9rem;
      background: var(--surface-secondary, #faf7f2);
      transition: all 0.2s ease;
      font-family: inherit;
    }

    .admin-form-textarea {
      resize: vertical;
      min-height: 90px;
    }

    .admin-form-input:focus,
    .admin-form-select:focus,
    .admin-form-textarea:focus {
      outline: none;
      border-color: var(--color-sage, #5a7d5c);
      background: var(--surface-primary, #ffffff);
      box-shadow: 0 0 0 3px rgba(90,125,92,0.08);
    }

    .admin-form-submit {
      padding: 14px 28px;
      background: linear-gradient(135deg, var(--color-sage, #5a7d5c), var(--color-deep, #1a3a2a));
      color: #fff;
      border: none;
      border-radius: 14px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      margin-top: 8px;
      width: 100%;
      transition: all 0.25s ease;
    }

    .admin-form-submit:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(90,125,92,0.3);
    }

    /* ===== 空状态 & 加载 ===== */
    .admin-empty {
      text-align: center;
      padding: 48px 24px;
      color: var(--text-muted, #8a8a8a);
    }

    .admin-empty-icon {
      width: 56px;
      height: 56px;
      margin: 0 auto 16px;
      background: var(--surface-secondary, #faf7f2);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .admin-empty-icon svg {
      width: 28px;
      height: 28px;
      stroke: var(--text-muted, #8a8a8a);
      fill: none;
      stroke-width: 1.5;
    }

    .admin-empty-text {
      font-size: 0.95rem;
    }

    .admin-empty-hint {
      margin-top: 12px;
      font-size: 0.8rem;
      color: #999;
      line-height: 1.8;
      text-align: left;
      display: inline-block;
      background: var(--surface-secondary, #faf7f2);
      padding: 12px 18px;
      border-radius: 10px;
      max-width: 480px;
    }

    .admin-loading {
      text-align: center;
      padding: 48px 24px;
    }

    .admin-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(90,125,92,0.15);
      border-top-color: var(--color-sage, #5a7d5c);
      border-radius: 50%;
      animation: adminSpin 0.8s linear infinite;
      margin: 0 auto 12px;
    }

    @keyframes adminSpin {
      to { transform: rotate(360deg); }
    }

    .admin-loading-text {
      font-size: 0.88rem;
      color: var(--text-muted, #8a8a8a);
    }

    /* ===== 响应式 ===== */
    @media (max-width: 768px) {
      .admin-form-grid {
        grid-template-columns: 1fr;
      }

      .admin-stats-row {
        grid-template-columns: 1fr;
      }

      .admin-dash-header {
        flex-direction: column;
        gap: 16px;
        text-align: center;
      }

      .admin-table {
        font-size: 0.82rem;
      }

      .admin-table th,
      .admin-table td {
        padding: 10px 8px;
      }

      .admin-login-card {
        padding: 36px 24px;
      }
    }

    /* ===== 弹窗 ===== */
    .admin-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }

    .admin-modal {
      background: var(--surface-primary, #ffffff);
      border-radius: 20px;
      padding: 32px;
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }

    .admin-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-light, #ece8e1);
    }

    .admin-modal-title {
      font-family: var(--font-serif, 'Noto Serif SC', serif);
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--color-deep, #1a3a2a);
    }

    .admin-modal-close {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: none;
      background: var(--surface-secondary, #faf7f2);
      cursor: pointer;
      font-size: 1.2rem;
      color: var(--text-muted, #8a8a8a);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .admin-modal-close:hover {
      background: var(--color-error, #c0553a);
      color: #fff;
    }
  `;
  document.head.appendChild(style);
}

/* ===== API 调用 ===== */
// 管理员密钥的 SHA-256 哈希值（默认密钥已移除，首次使用需通过 Supabase admin 用户组认证）
const ADMIN_KEY_HASH = 'd090ea0a3c226b0afb5fa7d86dce875dd63434b1e9bd6dc804ea9bf55a38f57b';

// 登录尝试频率限制（持久化到 sessionStorage，防止刷新绕过）
var _adminLoginAttempts = Math.max(0, parseInt(sessionStorage.getItem('bioquest_admin_attempts') || '0', 10) || 0);
var _adminLockUntil = Math.max(0, parseInt(sessionStorage.getItem('bioquest_admin_lock') || '0', 10) || 0);

async function sha256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function adminLogin(key) {
  if (!key) return false;

  // 频率限制：5 次失败后锁定 60 秒
  var now = Date.now();
  if (_adminLockUntil > now) {
    var waitSec = Math.ceil((_adminLockUntil - now) / 1000);
    showToast('尝试过于频繁，请 ' + waitSec + ' 秒后重试');
    return false;
  }

  // 每次尝试叠加延迟（最多 2 秒），减缓暴力破解
  var delay = Math.min(ADMIN_LOGIN_MAX_DELAY_MS, ADMIN_LOGIN_DELAY_PER_ATTEMPT_MS * (_adminLoginAttempts + 1));
  await new Promise(function(r) { setTimeout(r, delay); });

  const hash = await sha256(key);
  if (hash === ADMIN_KEY_HASH) {
    _adminSecretKey = key;
    _adminAuthenticated = true;
    // 使用带时间戳的 token 而非固定 '1'，5 分钟过期
    var token = JSON.stringify({ t: Date.now(), exp: ADMIN_TOKEN_TTL });
    sessionStorage.setItem('bioquest_admin_auth', token);
    _adminLoginAttempts = 0;
    sessionStorage.removeItem('bioquest_admin_attempts');
    sessionStorage.removeItem('bioquest_admin_lock');
    return true;
  }

  // 失败计数（持久化）
  _adminLoginAttempts++;
  sessionStorage.setItem('bioquest_admin_attempts', String(_adminLoginAttempts));
  if (_adminLoginAttempts >= ADMIN_LOGIN_MAX_ATTEMPTS) {
    _adminLockUntil = Date.now() + ADMIN_LOGIN_LOCK_DURATION_MS;
    sessionStorage.setItem('bioquest_admin_lock', String(_adminLockUntil));
    showToast('连续失败 ' + ADMIN_LOGIN_MAX_ATTEMPTS + ' 次，已锁定 ' + (ADMIN_LOGIN_LOCK_DURATION_MS / 1000) + ' 秒');
  }
  return false;
}

// 检查会话中是否已认证（带过期校验）
(function() {
  try {
    var raw = sessionStorage.getItem('bioquest_admin_auth');
    if (!raw) return;
    var token = JSON.parse(raw);
    // 校验 token 结构和过期时间
    if (!token || typeof token.t !== 'number' || typeof token.exp !== 'number') {
      sessionStorage.removeItem('bioquest_admin_auth');
      return;
    }
    if (Date.now() - token.t > token.exp) {
      // 过期，清除
      sessionStorage.removeItem('bioquest_admin_auth');
      return;
    }
    _adminAuthenticated = true;
    _adminSecretKey = 'session_restored';
  } catch (e) {
    sessionStorage.removeItem('bioquest_admin_auth');
  }
})();

// 解析 Supabase 错误，返回用户友好的错误信息
function parseSupabaseError(error) {
  if (!error) return '未知错误';
  var msg = error.message || String(error);
  var code = error.code || '';
  var details = error.details || '';
  var hint = error.hint || '';
  // 常见错误分类
  if (code === '42P01' || msg.includes('does not exist') || msg.includes('relation') && msg.includes('exist')) {
    return '数据库表不存在。请在 Supabase SQL Editor 中运行 sql/schema.sql 初始化表结构。';
  }
  if (code === '42501' || msg.includes('permission denied') || msg.includes('policy') || msg.includes('violates row-level security')) {
    return '权限不足（RLS 策略拒绝）。请确认管理员账号的 user_group 已设为 "admin"，并在 Supabase 中运行最新 schema.sql 添加管理员策略。';
  }
  if (code === '23505' || msg.includes('duplicate key') || msg.includes('unique')) {
    return '数据重复，该记录已存在。';
  }
  if (code === '23503' || msg.includes('foreign key')) {
    return '外键约束失败，关联数据不存在。';
  }
  if (msg.includes('JWT') || msg.includes('token') || msg.includes('expired') || msg.includes('auth')) {
    return '认证已过期，请刷新页面重新登录 Supabase。';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) {
    return '网络连接失败，请检查网络后重试。';
  }
  if (details) return details;
  if (hint) return hint;
  return msg;
}

// Supabase 直连的管理员 API
async function adminApiCall(method, endpoint, body = null) {
  if (!_adminAuthenticated) {
    return { ok: false, data: { error: '管理员未认证，请重新输入管理员密钥' }, status: 401 };
  }
  return await handleAdminSupabaseCall(method, endpoint, body);
}

// 使用 fetch() 直接调用 Supabase REST API，避免 Supabase JS 客户端内部取消请求导致 net::ERR_ABORTED
async function adminFetchRest(method, table, queryParams, body) {
  // 公开表（社区帖子、社区评论、profiles 等）必须用 anon key 拉取，
  // 避免登录用户的 RLS 策略限制（如 auth.uid() = author_id 导致只能看自己发的）
  // 管理员专属操作（更新/删除/插入）才用 session token
  var PUBLIC_TABLES = ['community_posts', 'community_comments', 'profiles', 'checkins', 'questions'];
  var isWriteOp = (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE');
  var useAnon = PUBLIC_TABLES.indexOf(table) >= 0 && method === 'GET';
  var sb = (typeof window.getSupabase === 'function') ? window.getSupabase() : null;
  var token = null;
  if (sb && !useAnon) {
    try {
      var { data } = await sb.auth.getSession();
      token = (data && data.session && data.session.access_token) || null;
    } catch (e) {}
  }
  // 安全加固 F-06：写操作（非公开表的 POST/PATCH/PUT/DELETE）必须携带有效 session token，
  // 绝不静默降级为 anon key，避免越权写入被 RLS 默默拦截或被误判成功
  if (isWriteOp && !useAnon && !token) {
    return {
      ok: false,
      data: { error: '管理员会话已失效，请重新登录后再执行写操作（拒绝降级为匿名身份）' },
      status: 401
    };
  }
  var url = 'https://pgkjpuowpxngmxjjlfil.supabase.co/rest/v1/' + table + (queryParams ? '?' + queryParams : '');
  var anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBna2pwdW93cHhuZ214ampsZmlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODM2MzIsImV4cCI6MjA5NjI1OTYzMn0.lgfxN9htgo1i4tX_KwEehW47uqOwj3Jfwy-ljsjQnx4';
  var headers = {
    'apikey': anonKey,
    // 写操作必定有 token（上方已校验），读公开表用 anon，读私有表用 token
    'Authorization': 'Bearer ' + (token || anonKey),
    'Content-Type': 'application/json'
  };
  if (method === 'POST' || method === 'PATCH') {
    headers['Prefer'] = 'return=representation';
  }
  if (method === 'DELETE') {
    headers['Prefer'] = 'return=representation';
  }
  var fetchOpts = { method: method, headers: headers };
  if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    fetchOpts.body = JSON.stringify(body);
  }

  try {
    var resp = await fetch(url, fetchOpts);
    var json = null;
    try {
      json = await resp.json();
    } catch (e) {}
    if (!resp.ok) {
      var errMsg = (json && json.message) || (json && json.msg) || resp.statusText || '请求失败';
      var errCode = (json && json.code) || '';
      console.error('[Admin REST] 请求失败:', resp.status, errCode, errMsg, json);
      // 如果是 401/403，提示认证问题
      if (resp.status === 401 || resp.status === 403) {
        errMsg = '权限不足（' + (token ? 'token可能已过期' : '未登录') + '）：' + errMsg;
      }
      return { ok: false, data: { error: errMsg }, status: resp.status, _raw: json };
    }

    return { ok: true, data: json, status: resp.status };
  } catch (fetchErr) {
    console.error('[Admin REST] 网络错误:', fetchErr.message);
    return { ok: false, data: { error: '网络请求失败: ' + fetchErr.message }, status: 0 };
  }
}

async function handleAdminSupabaseCall(method, endpoint, body) {
  try {
    // ===== 用户管理 =====
    if (endpoint === '/admin/users') {
      var result = await adminFetchRest('GET', 'profiles', 'select=*&order=created_at.desc', null);
      if (!result.ok) return { ok: false, data: { error: '查询用户列表失败: ' + result.data.error }, status: result.status };
      var data = Array.isArray(result.data) ? result.data : [];

      return { ok: true, data: { users: data }, status: 200 };
    }
    if (endpoint.startsWith('/admin/users/') && method === 'DELETE') {
      var username = endpoint.split('/').pop();
      var selResult = await adminFetchRest('GET', 'profiles', 'username=eq.' + encodeURIComponent(username), null);
      if (!selResult.ok) return { ok: false, data: { error: '查询用户失败: ' + selResult.data.error }, status: selResult.status };
      var profiles = Array.isArray(selResult.data) ? selResult.data : [];
      if (!profiles.length) return { ok: false, data: { error: '用户 "' + username + '" 不存在' }, status: 404 };
      var delResult = await adminFetchRest('DELETE', 'profiles', 'id=eq.' + profiles[0].id, null);
      if (!delResult.ok) return { ok: false, data: { error: '删除用户失败: ' + delResult.data.error }, status: delResult.status };
      return { ok: true, data: {}, status: 200 };
    }
    if (endpoint.startsWith('/admin/users/') && method === 'PUT') {
      var username = endpoint.split('/')[3];
      var updResult = await adminFetchRest('PATCH', 'profiles', 'username=eq.' + encodeURIComponent(username), body);
      if (!updResult.ok) return { ok: false, data: { error: '更新用户失败: ' + updResult.data.error }, status: updResult.status };
      var updated = Array.isArray(updResult.data) ? updResult.data[0] : body;
      return { ok: true, data: updated, status: 200 };
    }
    if (endpoint.startsWith('/admin/users/') && endpoint.includes('/reset-password')) {
      return { ok: true, data: { message: '密码重置请求已记录' }, status: 200 };
    }

    // ===== 题目管理 =====
    if (endpoint.startsWith('/admin/questions') && !endpoint.startsWith('/admin/questions/')) {
      if (method === 'GET') {
        // Parse pagination params from endpoint query string
        var page = 1;
        var perPage = 30;
        var searchMatch = endpoint.match(/search=([^&]*)/);
        var moduleMatch = endpoint.match(/module=([^&]*)/);
        var pageMatch = endpoint.match(/page=(\d+)/);
        if (pageMatch) page = parseInt(pageMatch[1], 10) || 1;

        var queryParams = 'select=*&order=created_at.desc&limit=' + perPage + '&offset=' + ((page - 1) * perPage);

        // Add search filter if provided
        if (searchMatch && searchMatch[1]) {
          var searchTerm = decodeURIComponent(searchMatch[1]);
          queryParams += '&or=(id.ilike.*' + encodeURIComponent(searchTerm) + '*,question.ilike.*' + encodeURIComponent(searchTerm) + '*,concept.ilike.*' + encodeURIComponent(searchTerm) + '*,subject.ilike.*' + encodeURIComponent(searchTerm) + '*)';
        }
        // Add module filter if provided
        if (moduleMatch && moduleMatch[1]) {
          var modVal = decodeURIComponent(moduleMatch[1]);
          queryParams += '&module=eq.' + encodeURIComponent(modVal);
        }

        var result = await adminFetchRest('GET', 'questions', queryParams, null);
        if (!result.ok) return { ok: false, data: { error: '查询题目列表失败: ' + result.data.error }, status: result.status };
        var data = Array.isArray(result.data) ? result.data : [];

        // 使用 Supabase Prefer: count=exact 精确计数（解决默认 limit 1000 导致只显示1000的问题）
        // 原理：加 count=exact 后，Supabase 在 Content-Range 响应头返回 0-0/实际总数，无需拉取全量ID
        var totalCount = data.length;
        try {
          var sb = (typeof window.getSupabase === 'function') ? window.getSupabase() : null;
          var token = null;
          if (sb) {
            try {
              var sesData = await sb.auth.getSession();
              token = (sesData && sesData.data && sesData.data.session && sesData.data.session.access_token) || null;
            } catch (e) {}
          }
          var anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBna2pwdW93cHhuZ214ampsZmlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODM2MzIsImV4cCI6MjA5NjI1OTYzMn0.lgfxN9htgo1i4tX_KwEehW47uqOwj3Jfwy-ljsjQnx4';
          // 精确计数：带上与主查询相同的搜索/模块过滤条件，不带分页/排序
          var countParams = 'select=id&limit=1';
          if (searchMatch && searchMatch[1]) {
            countParams += '&or=(id.ilike.*' + encodeURIComponent(searchTerm) + '*,question.ilike.*' + encodeURIComponent(searchTerm) + '*,concept.ilike.*' + encodeURIComponent(searchTerm) + '*,subject.ilike.*' + encodeURIComponent(searchTerm) + '*)';
          }
          if (moduleMatch && moduleMatch[1]) {
            countParams += '&module=eq.' + encodeURIComponent(modVal);
          }
          var countUrl = 'https://pgkjpuowpxngmxjjlfil.supabase.co/rest/v1/questions?' + countParams;
          var countResp = await fetch(countUrl, {
            method: 'GET',
            headers: {
              'apikey': anonKey,
              'Authorization': 'Bearer ' + (token || anonKey),
              'Prefer': 'count=exact'
            }
          });
          var contentRange = countResp.headers.get('Content-Range') || '';
          var match = contentRange.match(/\/(\d+)$/);
          if (match && match[1]) {
            totalCount = parseInt(match[1], 10) || data.length;
          } else {
            // 兜底：旧版 Supabase 可能不返回 Content-Range，退回到分页数据 + ADMIN_COUNT_LIMIT 推测
            totalCount = Math.max(data.length, (data.length === perPage) ? (page * perPage + 1) : data.length);
          }
        } catch (countErr) {
          console.warn('[Admin] 精确计数失败，使用分页数据兜底:', countErr.message);
        }

        // 提取模块（从 subject 字段去重）
        var modules = [];
        var modSet = {};
        // 从当前页数据中提取 subject 作为模块
        for (var i = 0; i < data.length; i++) {
          var subj = data[i].subject || data[i].module || '';
          if (subj && !modSet[subj]) { modSet[subj] = true; modules.push(subj); }
        }
        // 如果当前页没有模块信息，再从更多数据中提取
        if (modules.length === 0 && data.length > 0) {
          try {
            var subjResult = await adminFetchRest('GET', 'questions', 'select=subject&limit=' + ADMIN_COUNT_LIMIT, null);
            if (Array.isArray(subjResult.data)) {
              for (var j = 0; j < subjResult.data.length; j++) {
                var s = subjResult.data[j].subject || '';
                if (s && !modSet[s]) { modSet[s] = true; modules.push(s); }
              }
            }
          } catch(e) { /* 模块提取失败，静默 */ }
        }
        modules.sort();

        return { ok: true, data: { questions: data, total: totalCount, modules: modules, page: page, per_page: perPage }, status: 200 };
      }
      if (method === 'POST') {
        var result = await adminFetchRest('POST', 'questions', null, body);
        if (!result.ok) return { ok: false, data: { error: '添加题目失败: ' + result.data.error }, status: result.status };
        var item = Array.isArray(result.data) ? result.data[0] : body;
        return { ok: true, data: item, status: 200 };
      }
    }
    if (endpoint.startsWith('/admin/questions/') && method === 'PUT') {
      var qId = decodeURIComponent(endpoint.split('/').pop());
      var result = await adminFetchRest('PATCH', 'questions', 'id=eq.' + encodeURIComponent(qId), body);
      if (!result.ok) return { ok: false, data: { error: '更新题目失败: ' + result.data.error }, status: result.status };
      var item = Array.isArray(result.data) ? result.data[0] : body;
      return { ok: true, data: item, status: 200 };
    }
    if (endpoint.startsWith('/admin/questions/') && method === 'DELETE') {
      var qId = decodeURIComponent(endpoint.split('/').pop());
      var result = await adminFetchRest('DELETE', 'questions', 'id=eq.' + encodeURIComponent(qId), null);
      if (!result.ok) return { ok: false, data: { error: '删除题目失败: ' + result.data.error }, status: result.status };
      return { ok: true, data: {}, status: 200 };
    }

    // ===== 卡片管理 =====
    if (endpoint.startsWith('/admin/cards') && !endpoint.startsWith('/admin/cards/')) {
      if (method === 'GET') {
        var page = 1;
        var perPage = 30;
        var pageMatch = endpoint.match(/page=(\d+)/);
        if (pageMatch) page = parseInt(pageMatch[1], 10) || 1;

        var queryParams = 'select=*&order=created_at.desc&limit=' + perPage + '&offset=' + ((page - 1) * perPage);

        var searchMatch = endpoint.match(/search=([^&]*)/);
        if (searchMatch && searchMatch[1]) {
          var searchTerm = decodeURIComponent(searchMatch[1]);
          queryParams += '&or=(title.ilike.*' + encodeURIComponent(searchTerm) + '*,question.ilike.*' + encodeURIComponent(searchTerm) + '*)';
        }
        var categoryMatch = endpoint.match(/category=([^&]*)/);
        if (categoryMatch && categoryMatch[1]) {
          queryParams += '&category=eq.' + encodeURIComponent(decodeURIComponent(categoryMatch[1]));
        }

        var result = await adminFetchRest('GET', 'cards', queryParams, null);
        if (!result.ok) {
          var isMissingTable = result._raw && result._raw.code === 'PGRST205';
          if (isMissingTable) {
            console.warn('[Admin] cards 表不存在，请在 Supabase SQL Editor 中运行 sql/schema.sql');
            return { ok: true, data: { cards: [], total: 0, categories: [], page: page, per_page: perPage, _missing_table: true }, status: 200 };
          }
          return { ok: false, data: { error: '查询卡片列表失败: ' + result.data.error }, status: result.status };
        }
        var data = Array.isArray(result.data) ? result.data : [];

        // 使用 limit 获取总数（更高效）
        var countResult = await adminFetchRest('GET', 'cards', 'select=id&limit=' + ADMIN_CARDS_COUNT_LIMIT, null);
        var totalCount = Array.isArray(countResult.data) ? countResult.data.length : (Array.isArray(result.data) ? result.data.length : 0);

        return { ok: true, data: { cards: data, total: totalCount, categories: [], page: page, per_page: perPage }, status: 200 };
      }
      if (method === 'POST') {
        var result = await adminFetchRest('POST', 'cards', null, body);
        if (!result.ok) return { ok: false, data: { error: '添加卡片失败: ' + result.data.error }, status: result.status };
        var item = Array.isArray(result.data) ? result.data[0] : body;
        return { ok: true, data: item, status: 200 };
      }
    }
    if (endpoint.startsWith('/admin/cards/') && method === 'PUT') {
      var cId = parseInt(decodeURIComponent(endpoint.split('/').pop()), 10);
      var result = await adminFetchRest('PATCH', 'cards', 'id=eq.' + cId, body);
      if (!result.ok) return { ok: false, data: { error: '更新卡片失败: ' + result.data.error }, status: result.status };
      var item = Array.isArray(result.data) ? result.data[0] : body;
      return { ok: true, data: item, status: 200 };
    }
    if (endpoint.startsWith('/admin/cards/') && method === 'DELETE') {
      var cId = parseInt(decodeURIComponent(endpoint.split('/').pop()), 10);
      var result = await adminFetchRest('DELETE', 'cards', 'id=eq.' + cId, null);
      if (!result.ok) return { ok: false, data: { error: '删除卡片失败: ' + result.data.error }, status: result.status };
      return { ok: true, data: {}, status: 200 };
    }
    if (endpoint.startsWith('/admin/card-categories')) {
      var result = await adminFetchRest('GET', 'cards', 'select=category', null);
      if (!result.ok) return { ok: false, data: { error: '查询卡片分类失败: ' + result.data.error }, status: result.status };
      var data = Array.isArray(result.data) ? result.data : [];
      var categories = [...new Set(data.map(function(c) { return c.category; }).filter(Boolean))];
      return { ok: true, data: { categories: categories }, status: 200 };
    }

    // ===== 社区帖子管理 =====
    if (endpoint.startsWith('/admin/community/posts') && !endpoint.startsWith('/admin/community/posts/')) {
      if (method === 'GET') {
        var result = await adminFetchRest('GET', 'community_posts', 'select=*&order=created_at.desc&limit=' + ADMIN_LIST_LIMIT, null);
        if (!result.ok) {
          console.error('[Admin] 查询帖子列表失败:', result.data);
          return { ok: false, data: { error: '查询帖子列表失败: ' + result.data.error }, status: result.status };
        }
        var data = Array.isArray(result.data) ? result.data : [];

        return { ok: true, data: { posts: data, total: data.length, page: 1, per_page: 100 }, status: 200 };
      }
    }
    if (endpoint.startsWith('/admin/community/posts/') && method === 'PUT' && !endpoint.includes('/pin') && !endpoint.includes('/comments')) {
      var pId = decodeURIComponent(endpoint.split('/').pop());
      var result = await adminFetchRest('PATCH', 'community_posts', 'id=eq.' + encodeURIComponent(pId), body);
      if (!result.ok) return { ok: false, data: { error: '更新帖子失败: ' + result.data.error }, status: result.status };
      var item = Array.isArray(result.data) ? result.data[0] : body;
      return { ok: true, data: item, status: 200 };
    }
    if (endpoint.startsWith('/admin/community/posts/') && method === 'DELETE' && !endpoint.includes('/comments')) {
      var pId = decodeURIComponent(endpoint.split('/').pop());
      var result = await adminFetchRest('PATCH', 'community_posts', 'id=eq.' + encodeURIComponent(pId), { is_deleted: true });
      if (!result.ok) return { ok: false, data: { error: '删除帖子失败: ' + result.data.error }, status: result.status };
      return { ok: true, data: {}, status: 200 };
    }
    if (endpoint.startsWith('/admin/community/posts/') && endpoint.includes('/pin')) {
      var pId = decodeURIComponent(endpoint.split('/')[4]);
      var pinResult = await adminFetchRest('PATCH', 'community_posts', 'id=eq.' + encodeURIComponent(pId), { is_pinned: body.pinned });
      if (!pinResult.ok) return { ok: false, data: { error: '置顶操作失败: ' + pinResult.data.error }, status: pinResult.status };
      return { ok: true, data: { pinned: body.pinned }, status: 200 };
    }
    // 删除帖子评论
    if (endpoint.startsWith('/admin/community/comments/') && method === 'DELETE') {
      var commentId = decodeURIComponent(endpoint.split('/').pop());
      var result = await adminFetchRest('DELETE', 'community_comments', 'id=eq.' + encodeURIComponent(commentId), null);
      if (!result.ok) return { ok: false, data: { error: '删除评论失败: ' + result.data.error }, status: result.status };
      return { ok: true, data: {}, status: 200 };
    }

    // ===== 禁言管理 =====
    if (endpoint === '/admin/community/mutes') {
      if (method === 'GET') {
        var result = await adminFetchRest('GET', 'community_mutes', 'select=*&order=created_at.desc', null);
        if (!result.ok) {
          var isMissingTable = result._raw && result._raw.code === 'PGRST205';
          if (isMissingTable) {
            console.warn('[Admin] community_mutes 表不存在，请在 Supabase SQL Editor 中运行 sql/schema.sql');
            return { ok: true, data: { mutes: [], _missing_table: true }, status: 200 };
          }
          return { ok: false, data: { error: '查询禁言列表失败: ' + result.data.error }, status: result.status };
        }
        var data = Array.isArray(result.data) ? result.data : [];
        return { ok: true, data: { mutes: data }, status: 200 };
      }
      if (method === 'POST') {
        var result = await adminFetchRest('POST', 'community_mutes', null, body);
        if (!result.ok) return { ok: false, data: { error: '添加禁言失败: ' + result.data.error }, status: result.status };
        var item = Array.isArray(result.data) ? result.data[0] : body;
        return { ok: true, data: item, status: 200 };
      }
    }
    if (endpoint.startsWith('/admin/community/mutes/') && method === 'DELETE') {
      var uId = decodeURIComponent(endpoint.split('/').pop());
      var result = await adminFetchRest('DELETE', 'community_mutes', 'user_id=eq.' + encodeURIComponent(uId), null);
      if (!result.ok) return { ok: false, data: { error: '解除禁言失败: ' + result.data.error }, status: result.status };
      return { ok: true, data: {}, status: 200 };
    }

    // ===== 公告管理 =====
    if (endpoint.startsWith('/admin/announcements') && !endpoint.startsWith('/admin/announcements/')) {
      if (method === 'GET') {
        var result = await adminFetchRest('GET', 'announcements', 'select=*&order=created_at.desc&limit=' + ADMIN_LIST_LIMIT, null);
        if (!result.ok) {
          console.error('[Admin] 查询公告列表失败:', result.data);
          return { ok: false, data: { error: '查询公告列表失败: ' + result.data.error }, status: result.status };
        }
        var data = Array.isArray(result.data) ? result.data : [];

        return { ok: true, data: { announcements: data, total: data.length }, status: 200 };
      }
      if (method === 'POST') {
        var result = await adminFetchRest('POST', 'announcements', null, body);
        if (!result.ok) return { ok: false, data: { error: '添加公告失败: ' + result.data.error }, status: result.status };
        var item = Array.isArray(result.data) ? result.data[0] : body;
        return { ok: true, data: item, status: 200 };
      }
    }
    if (endpoint.startsWith('/admin/announcements/') && method === 'PUT') {
      var annId = Number(endpoint.split('/').pop());
      var result = await adminFetchRest('PATCH', 'announcements', 'id=eq.' + annId, body);
      if (!result.ok) return { ok: false, data: { error: '更新公告失败: ' + result.data.error }, status: result.status };
      var item = Array.isArray(result.data) ? result.data[0] : body;
      return { ok: true, data: item, status: 200 };
    }
    if (endpoint.startsWith('/admin/announcements/') && method === 'DELETE') {
      var annId = Number(endpoint.split('/').pop());
      var result = await adminFetchRest('DELETE', 'announcements', 'id=eq.' + annId, null);
      if (!result.ok) return { ok: false, data: { error: '删除公告失败: ' + result.data.error }, status: result.status };
      return { ok: true, data: {}, status: 200 };
    }

    // ===== 反馈管理 =====
    if (endpoint === '/admin/feedbacks' && method === 'GET') {
      var result = await adminFetchRest('GET', 'feedbacks', 'select=*&order=created_at.desc&limit=' + ADMIN_FEEDBACK_LIMIT, null);
      if (!result.ok) {
        var isMissing = result._raw && result._raw.code === 'PGRST205';
        if (isMissing) {
          console.warn('[Admin] feedbacks 表不存在，请在 Supabase SQL Editor 中运行 sql/migration_v2.sql');
          return { ok: true, data: { feedbacks: [], _missing_table: true }, status: 200 };
        }
        return { ok: false, data: { error: '查询反馈列表失败: ' + result.data.error }, status: result.status };
      }
      var data = Array.isArray(result.data) ? result.data : [];
      return { ok: true, data: { feedbacks: data }, status: 200 };
    }

    if (endpoint === '/admin/sync') {
      return { ok: true, data: { message: '同步功能暂不可用（无后端服务器）' }, status: 200 };
    }
    return { ok: false, data: { error: '未知的管理员操作: ' + method + ' ' + endpoint }, status: 404 };
  } catch (e) {
    console.error('[Admin] REST API 调用异常:', e);
    return { ok: false, data: { error: '请求异常: ' + (e.message || '未知错误') }, status: 500 };
  }
}

async function getUsers() {
  if (!_adminSecretKey) return null;
  const result = await adminApiCall('GET', '/admin/users');
  return result.ok ? result.data.users : null;
}

async function deleteUser(username) {
  if (!_adminSecretKey) return false;
  const result = await adminApiCall('DELETE', `/admin/users/${encodeURIComponent(username)}`);
  return result.ok;
}

async function updateUser(username, updates) {
  if (!_adminSecretKey) return null;
  const result = await adminApiCall('PUT', `/admin/users/${encodeURIComponent(username)}`, updates);
  return result.ok ? result.data : null;
}

async function resetUserPassword(username, newPassword) {
  if (!_adminSecretKey) return null;
  const result = await adminApiCall('POST', `/admin/users/${encodeURIComponent(username)}/reset-password`, { new_password: newPassword });
  return result.ok ? result.data : null;
}

async function getQuestions(params = {}) {
  if (!_adminSecretKey) return null;
  const query = new URLSearchParams(params).toString();
  const result = await adminApiCall('GET', `/admin/questions?${query}`);
  if (!result.ok) {
    console.error('[Admin] getQuestions 失败:', result.data);
  }
  return result.ok ? result.data : null;
}

async function addQuestion(question) {
  if (!_adminSecretKey) return null;
  const result = await adminApiCall('POST', '/admin/questions', question);
  return result.ok ? result.data : null;
}

async function updateQuestion(id, question) {
  if (!_adminSecretKey) return null;
  const result = await adminApiCall('PUT', `/admin/questions/${encodeURIComponent(id)}`, question);
  return result.ok ? result.data : null;
}

async function deleteQuestion(id) {
  if (!_adminSecretKey) return false;
  const result = await adminApiCall('DELETE', `/admin/questions/${encodeURIComponent(id)}`);
  return result.ok;
}

/* ===== 卡片管理 API ===== */
async function getCards(params = {}) {
  if (!_adminSecretKey) return null;
  const query = new URLSearchParams(params).toString();
  const result = await adminApiCall('GET', `/admin/cards?${query}`);
  if (!result.ok) {
    console.error('[Admin] getCards 失败:', result.data);
  }
  return result.ok ? result.data : null;
}

async function addCard(card) {
  if (!_adminSecretKey) return null;
  const result = await adminApiCall('POST', '/admin/cards', card);
  return result.ok ? result.data : null;
}

async function updateCard(id, card) {
  if (!_adminSecretKey) return null;
  const result = await adminApiCall('PUT', `/admin/cards/${encodeURIComponent(id)}`, card);
  return result.ok ? result.data : null;
}

async function deleteCard(id) {
  if (!_adminSecretKey) return false;
  const result = await adminApiCall('DELETE', `/admin/cards/${encodeURIComponent(id)}`);
  return result.ok;
}

async function getCardCategories() {
  if (!_adminSecretKey) return null;
  const result = await adminApiCall('GET', '/admin/card-categories');
  return result.ok ? result.data.categories : null;
}

/* ===== 社区管理 API ===== */
async function getCommunityPosts(params = {}) {
  if (!_adminSecretKey) return null;
  const query = new URLSearchParams(params).toString();
  const result = await adminApiCall('GET', `/admin/community/posts?${query}`);
  return result.ok ? result.data : null;
}

async function deleteCommunityPost(id) {
  if (!_adminSecretKey) return false;
  const result = await adminApiCall('DELETE', `/admin/community/posts/${encodeURIComponent(id)}`);
  return result.ok;
}

async function toggleCommunityPostPin(id) {
  if (!_adminSecretKey) return null;
  const result = await adminApiCall('POST', `/admin/community/posts/${encodeURIComponent(id)}/pin`, { key: _adminSecretKey });
  return result.ok ? result.data : null;
}

async function getCommunityMutes() {
  if (!_adminSecretKey) return null;
  const result = await adminApiCall('GET', '/admin/community/mutes');
  return result.ok ? result.data : null;
}

async function muteCommunityUser(userId, reason, durationHours) {
  if (!_adminSecretKey) return null;
  const result = await adminApiCall('POST', '/admin/community/mutes', { user_id: userId, reason, duration_hours: durationHours });
  return result.ok ? result.data : null;
}

async function unmuteCommunityUser(userId) {
  if (!_adminSecretKey) return false;
  const result = await adminApiCall('DELETE', `/admin/community/mutes/${encodeURIComponent(userId)}`);
  return result.ok;
}

async function updateCommunityPost(postId, updates) {
  if (!_adminSecretKey) return null;
  const result = await adminApiCall('PUT', `/admin/community/posts/${encodeURIComponent(postId)}`, updates);
  return result.ok ? result.data : null;
}

async function deleteCommunityComment(commentId) {
  if (!_adminSecretKey) return false;
  const result = await adminApiCall('DELETE', `/admin/community/comments/${encodeURIComponent(commentId)}`);
  return result.ok;
}

/* ===== 举报管理 API ===== */
async function getCommunityReports() {
  // 直接用 anon REST 查询举报表（如果表不存在会返回空，不影响页面）
  try {
    var result = await adminFetchRest('GET', 'community_reports', 'select=*&order=created_at.desc&limit=' + ADMIN_FEEDBACK_LIMIT, null);
    if (result.ok && Array.isArray(result.data)) {
      return { reports: result.data };
    }
    // 表不存在的错误
    if (result._raw && (result._raw.code === 'PGRST205' || result._raw.code === '42P01')) {
      return { reports: [], _missing_table: true };
    }
  } catch (e) {
    console.warn('[Admin] 查询举报表失败:', e.message);
  }
  return { reports: [], _missing_table: true };
}

async function dismissCommunityReport(reportId) {
  try {
    var result = await adminFetchRest('DELETE', 'community_reports', 'id=eq.' + encodeURIComponent(reportId), null);
    return result.ok;
  } catch (e) {
    return false;
  }
}

window.dismissCommunityReport = dismissCommunityReport;

// 驳回指定帖子的所有举报（按 post_id 批量删除举报记录）
async function dismissReportsByPostId(postId) {
  try {
    var result = await adminFetchRest('DELETE', 'community_reports', 'post_id=eq.' + encodeURIComponent(postId), null);
    return result.ok;
  } catch (e) {
    return false;
  }
}
window.dismissReportsByPostId = dismissReportsByPostId;

/* ===== 反馈管理 API ===== */
async function getFeedbacks() {
  if (!_adminSecretKey) return null;
  const result = await adminApiCall('GET', '/admin/feedbacks');
  return result.ok ? result.data : null;
}

async function getCommunityPostComments(postId) {
  if (!_adminSecretKey) return null;
  var sb = (typeof window.getSupabase === 'function') ? window.getSupabase() : null;
  if (!sb) return null;
  var { data, error } = await sb.from('community_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
  if (error) { console.error('[Admin] 查询评论失败:', error); return null; }
  return data || [];
}

/* ===== SVG 图标 ===== */
const ICONS = {
  shield: '<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  key: '<svg viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
  users: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  logout: '<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  inbox: '<svg viewBox="0 0 24 24"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  layers: '<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
  messageCircle: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  ebook: '<svg viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>',
  check: '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  alertCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
};

/* ===== 登录页渲染 ===== */
function renderAdminLoginPage(target) {
  target.innerHTML = `
    <div class="admin-login-wrap">
      <div class="admin-login-card">
        <div class="admin-login-icon">
          ${ICONS.shield}
        </div>
        <div class="admin-login-title">管理员后台</div>
        <div class="admin-login-subtitle">输入密钥以访问 BioQuest 管理面板</div>
        <form class="admin-login-form" id="admin-login-form">
          <div class="admin-login-input-wrap">
            <input
              type="password"
              class="admin-login-input"
              id="admin-key-input"
              placeholder="输入管理员密钥"
              required
              autocomplete="off"
            >
            ${ICONS.key}
          </div>
          <button type="submit" class="admin-login-btn">验证并登录</button>
        </form>
        <div class="admin-login-error" id="admin-login-error"></div>
        <div class="admin-login-hint">
          仅限授权管理员访问。如需密钥，请联系平台管理员。
        </div>
      </div>
    </div>
  `;

  document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = document.getElementById('admin-key-input').value;
    const errorEl = document.getElementById('admin-login-error');
    const btn = e.target.querySelector('.admin-login-btn');

    btn.textContent = '验证中...';
    btn.disabled = true;

    const success = await adminLogin(key);
    if (success) {
      renderAdminDashboard(target);
    } else {
      errorEl.textContent = '密钥错误，请检查后重试';
      errorEl.style.display = 'block';
      btn.textContent = '验证并登录';
      btn.disabled = false;
      document.getElementById('admin-key-input').value = '';
      document.getElementById('admin-key-input').focus();
    }
  });
}

/* ===== 仪表盘渲染 ===== */
function renderAdminDashboard(target) {
  // 如果通过 Supabase 登录且 user_group 是 admin，自动认证
  // 安全：Supabase 管理员身份仅解锁前端 UI，绝不作为服务端管理凭证
  // （服务端无法验证 Supabase JWT，否则任何人伪造 X-Admin-Key: supabase_admin 即可提权）。
  // 服务端管理操作仍需通过 adminLogin 输入真实管理员密钥。
  if (!_adminAuthenticated && typeof window.getCurrentUser === 'function') {
    var user = window.getCurrentUser();
    if (user && user.user_group === 'admin') {
      _adminAuthenticated = true;
      _adminSecretKey = null;  // 前台 UI 解锁，不持有服务端密钥
      var token = JSON.stringify({ t: Date.now(), exp: ADMIN_TOKEN_TTL });
      sessionStorage.setItem('bioquest_admin_auth', token);

    }
  }

  // 修复：如果 _adminAuthenticated 是从 sessionStorage 恢复的，但 _currentUser 还是 null，
  // 等待 _currentUser 加载完成（最多等 2 秒）。
  // 关键：禁止在 setInterval 回调中同步重入 renderAdminDashboard，
  // 否则一旦 _currentUser 状态在多次触发间反复切换，可能累积调用栈导致 "Maximum call stack size exceeded"。
  // 改为：使用 setTimeout 链式轮询，并在用户就绪后通过 setTimeout(0) 异步重入。
  // 注意：仅当认证来源是 Supabase 管理员（_adminSecretKey 为 null，即未持有本地密钥）时才等待 currentUser；
  // 本地密钥认证的管理员不应依赖 Supabase 会话。
  if (_adminAuthenticated && !_adminSecretKey && !window.getCurrentUser()) {
    // 显示加载中
    target.innerHTML = '<div style="padding:80px 20px;text-align:center;color:#666;">正在恢复登录状态...</div>';
    var waitCount = 0;
    var _adminWaitTimer = null;
    function _pollUserReady() {
      waitCount++;
      var u = window.getCurrentUser();
      if (u) {
        // 用户就绪，异步重入（避免同步重入导致栈累积）
        setTimeout(function() { renderAdminDashboard(target); }, 0);
        return;
      }
      if (waitCount > 20) {
        // 2 秒后仍无用户，可能是 session 真的过期
        sessionStorage.removeItem('bioquest_admin_auth');
        _adminAuthenticated = false;
        _adminSecretKey = null;
        setTimeout(function() { renderAdminLoginPage(target); }, 0);
        return;
      }
      _adminWaitTimer = setTimeout(_pollUserReady, 100);
    }
    _adminWaitTimer = setTimeout(_pollUserReady, 100);
    return;
  }

  target.innerHTML = `
    <div class="admin-dash">
      <div class="admin-dash-header">
        <div class="admin-dash-header-left">
          <div class="admin-dash-title">
            ${ICONS.settings}
            管理面板
          </div>
          <div class="admin-dash-subtitle">BioQuest 后台管理系统</div>
        </div>
        <button class="admin-dash-logout" id="admin-logout-btn">
          ${ICONS.logout}
          退出
        </button>
      </div>

      <div class="admin-tabs">
        <button class="admin-tab active" data-tab="questions">
          ${ICONS.book}
          题目管理
        </button>
        <button class="admin-tab" data-tab="users">
          ${ICONS.users}
          用户管理
        </button>
        <button class="admin-tab" data-tab="cards">
          ${ICONS.layers}
          知识卡片
        </button>
        <button class="admin-tab" data-tab="community">
          ${ICONS.messageCircle || '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'}
          社区管理
        </button>
        <button class="admin-tab" data-tab="ebook">
          ${ICONS.ebook}
          电子书管理
        </button>
        <button class="admin-tab" data-tab="announcements">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          公告管理
        </button>
        <button class="admin-tab" data-tab="feedbacks">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          反馈管理
        </button>
        <button class="admin-tab" data-tab="appeals">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          申诉管理
        </button>
        <button class="admin-tab" data-tab="sync">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
          数据同步
        </button>
        <button class="admin-tab" data-tab="ocr">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          OCR 录题
        </button>
        <button class="admin-tab" data-tab="aigen">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
          AI 出题
        </button>
      </div>

      <div id="admin-tab-content"></div>
    </div>
  `;

  // 退出登录
  document.getElementById('admin-logout-btn').addEventListener('click', () => {
    _adminSecretKey = null;
    _adminAuthenticated = false;
    sessionStorage.removeItem('bioquest_admin_auth');
    renderAdminLoginPage(target);
  });

  // 标签页切换
  const tabs = target.querySelectorAll('.admin-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadTabContent(target, tab.dataset.tab);
    });
  });

  loadTabContent(target, 'questions');
}

/* ===== 加载标签内容 ===== */
async function loadTabContent(target, tab) {
  const contentEl = document.getElementById('admin-tab-content');
  contentEl.innerHTML = `<div class="admin-loading"><div class="admin-spinner"></div><div class="admin-loading-text">加载中...</div></div>`;

  if (tab === 'users') {
    const users = await getUsers();
    if (users) {
      renderUsersTab(contentEl, users);
    } else {
      contentEl.innerHTML = `<div class="admin-empty"><div class="admin-empty-icon">${ICONS.inbox}</div><div class="admin-empty-text">加载用户数据失败</div><div class="admin-empty-hint">请确认：<br>1. 已登录 Supabase（页面右上角显示用户信息）<br>2. profiles 表已创建（运行 sql/schema.sql）<br>3. 当前用户的 user_group 已设为 "admin"</div></div>`;
    }
  } else if (tab === 'community') {
    renderCommunityTab(contentEl);
  } else if (tab === 'feedbacks') {
    await renderFeedbacksTab(contentEl);
  } else if (tab === 'appeals') {
    renderAppealsTab(contentEl);
  } else if (tab === 'ebook') {
    renderEbookTab(contentEl);
  } else if (tab === 'sync') {
    renderSyncTab(contentEl);
  } else if (tab === 'announcements') {
    renderAnnouncementsTab(contentEl);
  } else if (tab === 'ocr') {
    renderOcrTab(contentEl);
  } else if (tab === 'aigen') {
    renderAiGenTab(contentEl);
  } else if (tab === 'cards') {
    try {
      const data = await getCards({ page: _adminCardPage, search: _adminCardSearch, category: _adminCardCategory });
      if (data && data.cards && data.cards.length > 0) {
        renderCardsTab(contentEl, data);
      } else {
        // Supabase cards 表为空或不可用，尝试从 data/cards.json 加载
        try {
          const resp = await fetch('data/cards.json');
          if (resp.ok) {
            const jsonCards = await resp.json();
            let cardsArr = [];
            // 修复：data/cards.json 实际格式为 { "分类": [ { name, id, cards: [...] } ] }
            if (jsonCards && Array.isArray(jsonCards['分类'])) {
              jsonCards['分类'].forEach(function(cat) {
                const catName = cat.name || cat.id || '未分类';
                const catCards = Array.isArray(cat.cards) ? cat.cards : [];
                catCards.forEach(function(card) {
                  cardsArr.push(Object.assign({}, card, { category: catName }));
                });
              });
            } else if (Array.isArray(jsonCards)) {
              cardsArr = jsonCards;
            } else if (jsonCards && Array.isArray(jsonCards.cards)) {
              cardsArr = jsonCards.cards;
            }
            // 应用分类过滤
            let filtered = cardsArr;
            if (_adminCardCategory && _adminCardCategory !== 'all') {
              filtered = filtered.filter(function(c) { return c.category === _adminCardCategory; });
            }
            // 应用搜索过滤
            if (_adminCardSearch) {
              var sTerm = _adminCardSearch.toLowerCase();
              filtered = filtered.filter(function(c) {
                return (c.title && c.title.toLowerCase().indexOf(sTerm) >= 0) ||
                       (c.question && c.question.toLowerCase().indexOf(sTerm) >= 0) ||
                       (c.answer && c.answer.toLowerCase().indexOf(sTerm) >= 0) ||
                       (c.category && c.category.toLowerCase().indexOf(sTerm) >= 0);
              });
            }
            // 提取分类
            var cats = {};
            cardsArr.forEach(function(c) { if (c.category) cats[c.category] = true; });
            var categories = Object.keys(cats).sort();
            // 分页
            var perPage = 30;
            var totalPages = Math.ceil(filtered.length / perPage);
            var pageCards = filtered.slice((_adminCardPage - 1) * perPage, _adminCardPage * perPage);
            var fallbackData = {
              cards: pageCards,
              total: filtered.length,
              categories: categories,
              page: _adminCardPage,
              per_page: perPage,
              _source: 'json'
            };
            if (pageCards.length === 0) {
              contentEl.innerHTML = `<div class="admin-empty"><div class="admin-empty-icon">${ICONS.inbox}</div><div class="admin-empty-text">暂无知识卡片</div><div class="admin-empty-hint">当前分类/搜索条件下没有卡片。<br>共 ${cardsArr.length} 张卡片，${categories.length} 个分类。</div></div>`;
            } else {
              renderCardsTab(contentEl, fallbackData);
              showAdminToast('Supabase cards 表为空，已从 data/cards.json 加载 ' + cardsArr.length + ' 张卡片（仅作展示）', 'info');
            }
          } else {
            contentEl.innerHTML = `<div class="admin-empty"><div class="admin-empty-icon">${ICONS.inbox}</div><div class="admin-empty-text">暂无知识卡片</div><div class="admin-empty-hint">Supabase cards 表为空且 data/cards.json 不可读。<br>可在 Supabase SQL Editor 中运行 sql/schema.sql 创建表后手动添加卡片。</div></div>`;
          }
        } catch(fetchErr) {
          console.warn('[Admin] 从 cards.json 加载失败:', fetchErr);
          contentEl.innerHTML = `<div class="admin-empty"><div class="admin-empty-icon">${ICONS.inbox}</div><div class="admin-empty-text">暂无知识卡片</div><div class="admin-empty-hint">Supabase cards 表为空，且 data/cards.json 加载失败。</div></div>`;
        }
      }
    } catch(e) {
      console.error('[Admin] 加载卡片出错:', e);
      contentEl.innerHTML = `<div class="admin-empty"><div class="admin-empty-icon">${ICONS.inbox}</div><div class="admin-empty-text">卡片加载出错: ${e.message}</div><div class="admin-empty-hint">请检查浏览器控制台（F12）获取详细信息</div></div>`;
    }
  } else {
    try {
      const data = await getQuestions({ page: _adminQuestionPage, search: _adminQuestionSearch, module: _adminQuestionModule });
      if (data) {
        renderQuestionsTab(contentEl, data);
      } else {
        contentEl.innerHTML = `<div class="admin-empty"><div class="admin-empty-icon">${ICONS.inbox}</div><div class="admin-empty-text">加载题目数据失败</div><div class="admin-empty-hint">请确认：<br>1. 已登录 Supabase（页面右上角显示用户信息）<br>2. questions 表已创建（在 Supabase SQL Editor 中运行 sql/schema.sql）<br>3. 当前用户的 user_group 已设为 "admin"<br>4. 打开浏览器控制台（F12）查看详细错误</div></div>`;
      }
    } catch(e) {
      console.error('[Admin] 加载题目出错:', e);
      contentEl.innerHTML = `<div class="admin-empty"><div class="admin-empty-icon">${ICONS.inbox}</div><div class="admin-empty-text">题目加载出错: ${e.message}</div><div class="admin-empty-hint">请检查浏览器控制台（F12）获取详细信息</div></div>`;
    }
  }
}

/* ===== 用户管理标签 ===== */
function renderUsersTab(container, users) {
  const totalUsers = users.length;
  const totalAnswered = users.reduce((sum, u) => sum + (u.total_answered || 0), 0);
  const avgScore = totalUsers > 0 ? Math.round(users.reduce((sum, u) => sum + (u.bio_score || 0), 0) / totalUsers) : 0;

  // 用户组分布统计
  const groupCounts = { admin: 0, premium: 0, member: 0, guest: 0 };
  users.forEach(u => {
    const g = u.user_group || 'member';
    if (groupCounts[g] !== undefined) groupCounts[g]++;
    else groupCounts.member++;
  });
  const groupLabels = { admin: '管理员', premium: '高级会员', member: '普通会员', guest: '访客' };
  const groupDistText = Object.entries(groupCounts).filter(([_, v]) => v > 0).map(([k, v]) => `${groupLabels[k]}${v}`).join(' / ');

  let html = `
    <div class="admin-stats-row">
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--green">${ICONS.users}</div>
        <div>
          <div class="admin-stat-num">${totalUsers}</div>
          <div class="admin-stat-label">注册用户</div>
        </div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--amber">${ICONS.book}</div>
        <div>
          <div class="admin-stat-num">${totalAnswered}</div>
          <div class="admin-stat-label">总答题数</div>
        </div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--blue">${ICONS.shield}</div>
        <div>
          <div class="admin-stat-num">${avgScore}</div>
          <div class="admin-stat-label">平均 Bio 分</div>
        </div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--green">${ICONS.users}</div>
        <div>
          <div class="admin-stat-num" style="font-size:0.9rem;">${groupDistText}</div>
          <div class="admin-stat-label">用户组分布</div>
        </div>
      </div>
    </div>

    <div class="admin-section">
      <div class="admin-section-header">
        <div class="admin-section-title">
          ${ICONS.users}
          用户列表
        </div>
        <span class="admin-section-badge">${totalUsers} 人</span>
      </div>
  `;

  if (users.length === 0) {
    html += `<div class="admin-empty"><div class="admin-empty-icon">${ICONS.inbox}</div><div class="admin-empty-text">暂无注册用户</div></div>`;
  } else {
    html += `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>用户名</th>
              <th>显示名称</th>
              <th>Bio 分</th>
              <th>答题数</th>
              <th>正确数</th>
              <th>准确率</th>
              <th>积分</th>
              <th>用户组</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(user => {
              var uid = user.id || '';
              var uname = user.username || '未知用户';
              var dname = user.display_name || uname;
              return `
              <tr data-uid="${uid}">
                <td class="admin-table-name">${uname}</td>
                <td>${dname}</td>
                <td class="admin-table-score" id="score-${uid}">${user.bio_score || 0}</td>
                <td>${user.total_answered || 0}</td>
                <td>${user.total_correct || 0}</td>
                <td>${(user.accuracy || 0)}%</td>
                <td id="points-${uid}" style="font-weight:700;color:var(--color-deep,#1a3a2a);">${typeof user.points === 'number' ? user.points : 0}</td>
                <td>
                  <select class="admin-form-select" style="padding:4px 8px;font-size:0.8rem;min-width:80px;" onchange="handleChangeUserGroup('${uid}', this.value)">
                    <option value="admin" ${user.user_group === 'admin' ? 'selected' : ''}>管理员</option>
                    <option value="premium" ${user.user_group === 'premium' ? 'selected' : ''}>高级会员</option>
                    <option value="verified" ${user.user_group === 'verified' ? 'selected' : ''}>认证会员</option>
                    <option value="member" ${user.user_group === 'member' || !user.user_group ? 'selected' : ''}>普通会员</option>
                    <option value="guest" ${user.user_group === 'guest' ? 'selected' : ''}>访客</option>
                  </select>
                </td>
                <td>
                  <div class="admin-table-actions">
                    <button class="admin-btn admin-btn--primary" onclick="handleEditUser('${uid}', '${(uname || '').replace(/'/g, "\\'")}', '${(dname || '').replace(/'/g, "\\'")}', ${user.bio_score || 0}, ${user.total_answered || 0}, ${user.total_correct || 0}, ${user.accuracy || 0}, ${typeof user.points === 'number' ? user.points : 0})">
                      编辑
                    </button>
                    <button class="admin-btn admin-btn--ghost" onclick="handleAdjustUserPoints('${uid}', ${typeof user.points === 'number' ? user.points : 0})">
                      调整积分
                    </button>
                    <button class="admin-btn admin-btn--ghost" onclick="handleResetPassword('${uid}')">
                      重置密码
                    </button>
                    <button class="admin-btn admin-btn--danger" onclick="handleDeleteUser('${uid}')">
                      ${ICONS.trash}
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  html += '</div>';

  // 编辑用户弹窗
  html += `
    <div class="admin-modal-overlay" id="admin-user-modal" style="display:none;">
      <div class="admin-modal">
        <div class="admin-modal-header">
          <div class="admin-modal-title">编辑用户</div>
          <button class="admin-modal-close" onclick="closeUserModal()">&times;</button>
        </div>
        <form id="admin-user-edit-form" class="admin-form-grid">
          <div class="admin-form-group">
            <label class="admin-form-label">用户名</label>
            <input type="text" class="admin-form-input" id="edit-username" placeholder="输入用户名">
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">显示名称</label>
            <input type="text" class="admin-form-input" id="edit-display-name" placeholder="输入显示名称">
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">Bio 分数</label>
            <input type="number" class="admin-form-input" id="edit-bio-score" min="0" max="100">
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">积分</label>
            <input type="number" class="admin-form-input" id="edit-points" min="0">
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">总答题数</label>
            <input type="number" class="admin-form-input" id="edit-total-answered" min="0">
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">总正确数</label>
            <input type="number" class="admin-form-input" id="edit-total-correct" min="0">
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">准确率 (%)</label>
            <input type="number" class="admin-form-input" id="edit-accuracy" min="0" max="100" step="0.1">
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">新密码（留空不修改）</label>
            <input type="text" class="admin-form-input" id="edit-new-password" placeholder="输入新密码">
          </div>
          <div class="admin-form-group full">
            <button type="submit" class="admin-form-submit">保存修改</button>
          </div>
        </form>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

/* ===== 题目管理标签 ===== */
let _adminQuestionPage = 1;
let _adminQuestionSearch = '';
let _adminQuestionModule = '';
let _adminQuestionTarget = '';

/* ===== 卡片管理标签 ===== */
let _adminCardPage = 1;
let _adminCardSearch = '';
let _adminCardCategory = '';

/* ===== 社区管理标签 ===== */
let _adminCommunityPostPage = 1;
let _adminCommunityPostSearch = '';

async function renderCommunityTab(container) {
  let postsData, mutesData, reportsData, loadError = '', fallbackSource = '';
  try {
    [postsData, mutesData, reportsData] = await Promise.all([
      getCommunityPosts({ page: _adminCommunityPostPage, search: _adminCommunityPostSearch }),
      getCommunityMutes(),
      getCommunityReports()
    ]);
  } catch (e) {
    loadError = e && e.message ? e.message : '加载失败';
    console.error('[Admin] 社区数据加载异常:', e);
  }

  let posts = (postsData && postsData.posts) || [];
  let totalPosts = (postsData && postsData.total) || 0;

  // 兜底：如果通过管理员 API 路径拿不到帖子（认证状态异常等），直接用 anon REST 查询公开表
  if (posts.length === 0 && !loadError) {
    try {
      var directResult = await adminFetchRest('GET', 'community_posts', 'select=*&order=created_at.desc&limit=' + ADMIN_LIST_LIMIT, null);
      if (directResult.ok && Array.isArray(directResult.data) && directResult.data.length > 0) {
        posts = directResult.data;
        totalPosts = directResult.data.length;
        fallbackSource = 'anon-direct';

      }
    } catch (e2) {
      console.error('[Admin] anon 直连也失败:', e2);
    }
  }

  window._adminCurrentPosts = posts; // 保存当前帖子列表供详情视图使用
  var postPage = (postsData && postsData.page) || 1;
  var postPerPage = (postsData && postsData.per_page) || 20;
  var postTotalPages = Math.ceil(totalPosts / postPerPage);

  var mutes = (mutesData && mutesData.mutes) || [];
  var reports = (reportsData && reportsData.reports) || [];

  let html = `
    <div class="admin-stats-row">
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--green">${ICONS.messageCircle}</div>
        <div>
          <div class="admin-stat-num">${totalPosts}</div>
          <div class="admin-stat-label">帖子总数</div>
        </div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--amber">${ICONS.users}</div>
        <div>
          <div class="admin-stat-num">${mutes.length}</div>
          <div class="admin-stat-label">禁言用户</div>
        </div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--blue">${ICONS.shield}</div>
        <div>
          <div class="admin-stat-num">${reports.length}</div>
          <div class="admin-stat-label">待处理举报</div>
        </div>
      </div>
    </div>

    <div class="admin-section">
      <div class="admin-section-header">
        <div class="admin-section-title">
          ${ICONS.messageCircle}
          帖子管理
        </div>
        <span class="admin-section-badge">${totalPosts} 帖</span>
      </div>

      <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;align-items:center;">
        <div style="flex:1;min-width:200px;position:relative;">
          <input type="text" class="admin-form-input" id="admin-community-search" placeholder="搜索帖子内容..." value="${_adminCommunityPostSearch}" style="padding-left:36px;">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);">${ICONS.search}</span>
        </div>
      </div>
  `;

  if (loadError) {
    html += `<div class="admin-empty" style="color:var(--color-error);"><div class="admin-empty-icon">${ICONS.shield}</div><div class="admin-empty-text">加载失败：${escapeHtml(loadError)}</div><div style="font-size:0.82rem;color:var(--text-muted);margin-top:8px;">请确认已登录 Supabase 且 user_group 设为 admin</div></div>`;
  } else if (posts.length === 0) {
    html += `<div class="admin-empty"><div class="admin-empty-icon">${ICONS.inbox}</div><div class="admin-empty-text">Supabase 中暂无帖子</div><div style="font-size:0.82rem;color:var(--text-muted);margin-top:8px;">提示：所有用户帖子都从 Supabase 加载，不会再从本地 JSON 读取 AI 种子帖</div></div>`;
  } else {
    html += `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>作者</th>
              <th>内容</th>
              <th>标签</th>
              <th>点赞</th>
              <th>评论数</th>
              <th>时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${posts.map(post => {
              const contentPreview = (post.content || '').length > 60 ? (post.content || '').slice(0, 60) + '...' : (post.content || '');
              const tags = Array.isArray(post.tags) ? post.tags : [];
              const isPinned = post.pinned || post.is_pinned || false;
              const isDeleted = post.is_deleted || false;
              const likeCount = post.like_count !== undefined ? post.like_count : (post.likes || 0);
              const commentCount = post.comment_count !== undefined ? post.comment_count : (post.comments || 0);
              return `
                <tr data-post-id="${post.id}" style="${isDeleted ? 'opacity:0.5;background:rgba(192,85,58,0.04);' : ''}">
                  <td class="admin-table-name">${post.author_name || post.author || post.username || ''}</td>
                  <td style="max-width:240px;color:var(--text-secondary,#4a4a4a);font-size:0.82rem;" title="${(post.content || '').replace(/"/g, '&quot;')}">${contentPreview}</td>
                  <td>
                    ${tags.map(t => `<span class="admin-q-tag admin-q-tag--module" style="margin:1px;">${t}</span>`).join('')}
                    ${isPinned ? '<span class="admin-q-tag" style="background:rgba(196,149,106,0.12);color:var(--color-amber,#c4956a);margin:1px;">置顶</span>' : ''}
                    ${isDeleted ? '<span class="admin-q-tag" style="background:rgba(192,85,58,0.12);color:var(--color-error,#c0553a);margin:1px;">已删除</span>' : ''}
                  </td>
                  <td style="font-family:var(--font-mono,monospace);font-weight:600;color:var(--color-sage,#5a7d5c);cursor:pointer;" title="点击修改点赞数" onclick="handleEditPostStat('${post.id}','like_count',${likeCount})">${likeCount}<span style="font-size:0.65rem;color:#999;margin-left:2px;">✎</span></td>
                  <td style="font-family:var(--font-mono,monospace);cursor:pointer;" title="点击修改评论数" onclick="handleEditPostStat('${post.id}','comment_count',${commentCount})">${commentCount}<span style="font-size:0.65rem;color:#999;margin-left:2px;">✎</span></td>
                  <td style="font-size:0.78rem;color:var(--text-muted,#8a8a8a);white-space:nowrap;">${post.created_at ? new Date(post.created_at).toLocaleString('zh-CN', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : ''}</td>
                  <td>
                    <div class="admin-table-actions">
                      <button class="admin-btn admin-btn--ghost" onclick="handleViewPostDetail('${post.id}')">
                        详情
                      </button>
                      <button class="admin-btn ${isPinned ? 'admin-btn--ghost' : 'admin-btn--primary'}" onclick="handleTogglePin('${post.id}')">
                        ${isPinned ? '取消置顶' : '置顶'}
                      </button>
                      <button class="admin-btn admin-btn--primary" onclick="handleManagePostComments('${post.id}')">
                        评论
                      </button>
                      <button class="admin-btn admin-btn--danger" onclick="handleDeleteCommunityPost('${post.id}')">
                        ${ICONS.trash}
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    if (postTotalPages > 1) {
      html += `<div style="display:flex;justify-content:center;gap:8px;margin-top:20px;align-items:center;">`;
      html += `<button class="admin-btn admin-btn--ghost" onclick="adminGoCommunityPostPage(${postPage - 1})" ${postPage <= 1 ? 'disabled' : ''}>上一页</button>`;
      html += `<span style="color:var(--text-muted);font-size:0.85rem;">第 ${postPage} / ${postTotalPages} 页</span>`;
      html += `<button class="admin-btn admin-btn--ghost" onclick="adminGoCommunityPostPage(${postPage + 1})" ${postPage >= postTotalPages ? 'disabled' : ''}>下一页</button>`;
      html += `</div>`;
    }
  }

  html += '</div>';

  // 禁言管理
  html += `
    <div class="admin-section">
      <div class="admin-section-header">
        <div class="admin-section-title">
          ${ICONS.shield}
          禁言管理
        </div>
        <button class="admin-btn admin-btn--primary" onclick="openMuteModal()">
          ${ICONS.plus}
          添加禁言
        </button>
      </div>
  `;

  if (mutes.length === 0) {
    html += `<div class="admin-empty"><div class="admin-empty-icon">${ICONS.shield}</div><div class="admin-empty-text">暂无禁言用户</div></div>`;
  } else {
    html += `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>用户</th>
              <th>原因</th>
              <th>过期时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${mutes.map(mute => {
              const expiresAt = mute.expires_at || mute.expire_at || mute.expiry || '';
              const isPermanent = expiresAt === '永久' || expiresAt === 'permanent' || mute.duration_hours === 0 || mute.is_permanent;
              return `
                <tr data-mute-user-id="${mute.user_id || mute.username || ''}">
                  <td class="admin-table-name">${mute.username || mute.user_id || ''}</td>
                  <td style="color:var(--text-secondary,#4a4a4a);">${mute.reason || ''}</td>
                  <td style="font-size:0.82rem;color:${isPermanent ? 'var(--color-error,#c0553a)' : 'var(--text-muted,#8a8a8a)'};">
                    ${isPermanent ? '永久' : (expiresAt ? new Date(expiresAt).toLocaleString('zh-CN') : '--')}
                  </td>
                  <td>
                    <div class="admin-table-actions">
                      <button class="admin-btn admin-btn--ghost" onclick="handleUnmuteUser('${mute.user_id || mute.username || ''}')">
                        解除禁言
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  html += '</div>';

  // 举报管理
  html += `
    <div class="admin-section">
      <div class="admin-section-header">
        <div class="admin-section-title">
          ${ICONS.shield}
          举报管理
        </div>
        <span class="admin-section-badge">${reports.length} 条举报</span>
      </div>
  `;

  if (reportsData && reportsData._missing_table) {
    html += `<div class="admin-empty"><div class="admin-empty-icon">${ICONS.shield}</div><div class="admin-empty-text">举报表未创建</div><div style="font-size:0.82rem;color:var(--text-muted);margin-top:8px;">请在 Supabase SQL Editor 中运行 <code>sql/migration_v5_reports.sql</code> 创建 community_reports 表</div></div>`;
  } else if (reports.length === 0) {
    html += `<div class="admin-empty"><div class="admin-empty-icon">${ICONS.shield}</div><div class="admin-empty-text">暂无举报</div></div>`;
  } else {
    // 按 post_id 分组，显示每篇被举报的帖子
    var reportsByPost = {};
    reports.forEach(function(r) {
      var pid = r.post_id;
      if (!reportsByPost[pid]) reportsByPost[pid] = [];
      reportsByPost[pid].push(r);
    });

    html += `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>帖子 ID</th>
              <th>举报次数</th>
              <th>举报原因</th>
              <th>举报时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${Object.keys(reportsByPost).map(pid => {
              var postReports = reportsByPost[pid];
              var reasons = postReports.map(r => escapeHtml(r.reason || '(无)')).join('<br>');
              var times = postReports.map(r => r.created_at ? new Date(r.created_at).toLocaleString('zh-CN', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '--').join('<br>');
              return `
                <tr data-post-id="${escapeHtml(pid)}">
                  <td style="font-family:var(--font-mono,monospace);font-size:0.78rem;color:var(--text-muted);">${escapeHtml(pid.substring(0, 8))}...</td>
                  <td><span class="admin-q-tag" style="background:rgba(192,85,58,0.12);color:var(--color-error);">${postReports.length}</span></td>
                  <td style="max-width:300px;color:var(--text-secondary);font-size:0.82rem;">${reasons}</td>
                  <td style="font-size:0.78rem;color:var(--text-muted);white-space:nowrap;">${times}</td>
                  <td>
                    <div class="admin-table-actions">
                      <button class="admin-btn admin-btn--ghost" onclick="handleDismissReport('${escapeHtml(pid)}')">
                        驳回举报
                      </button>
                      <button class="admin-btn admin-btn--danger" onclick="handleDeleteReportedPost('${escapeHtml(pid)}')">
                        ${ICONS.trash}
                        删除帖子
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  html += '</div>';

  // 禁言弹窗
  html += `
    <div class="admin-modal-overlay" id="admin-mute-modal" style="display:none;">
      <div class="admin-modal">
        <div class="admin-modal-header">
          <div class="admin-modal-title">添加禁言</div>
          <button class="admin-modal-close" onclick="closeMuteModal()">&times;</button>
        </div>
        <form id="admin-mute-form" class="admin-form-grid">
          <div class="admin-form-group full">
            <label class="admin-form-label">用户 ID / 用户名</label>
            <input type="text" class="admin-form-input" id="mute-user-id" placeholder="输入用户 ID 或用户名" required>
          </div>
          <div class="admin-form-group full">
            <label class="admin-form-label">禁言原因</label>
            <input type="text" class="admin-form-input" id="mute-reason" placeholder="输入禁言原因" required>
          </div>
          <div class="admin-form-group full">
            <label class="admin-form-label">禁言时长</label>
            <select class="admin-form-select" id="mute-duration" required>
              <option value="1">1 小时</option>
              <option value="6">6 小时</option>
              <option value="24">24 小时</option>
              <option value="168">7 天</option>
              <option value="0">永久</option>
            </select>
          </div>
          <div class="admin-form-group full">
            <button type="submit" class="admin-form-submit" id="mute-submit-btn">确认禁言</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 帖子数据编辑弹窗 -->
    <div class="admin-modal-overlay" id="admin-post-stat-modal" style="display:none;">
      <div class="admin-modal" style="max-width:420px;">
        <div class="admin-modal-header">
          <div class="admin-modal-title" id="admin-post-stat-title">编辑帖子数据</div>
          <button class="admin-modal-close" onclick="closePostStatModal()">&times;</button>
        </div>
        <form id="admin-post-stat-form" class="admin-form-grid">
          <div class="admin-form-group full">
            <label class="admin-form-label" id="admin-post-stat-label">数值</label>
            <input type="number" class="admin-form-input" id="admin-post-stat-value" min="0" step="1" required>
            <input type="hidden" id="admin-post-stat-post-id">
            <input type="hidden" id="admin-post-stat-field">
          </div>
          <div class="admin-form-group full">
            <button type="submit" class="admin-form-submit" id="admin-post-stat-submit">保存</button>
          </div>
        </form>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // 提示种子数据来源
  if (fallbackSource) {
    showToast(fallbackSource);
  }

  // 搜索事件
  const searchInput = document.getElementById('admin-community-search');
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      _adminCommunityPostSearch = searchInput.value.trim();
      _adminCommunityPostPage = 1;
      await renderCommunityTab(container);
    }, 300);
  });

  // 禁言表单提交
  const muteForm = document.getElementById('admin-mute-form');
  muteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('mute-submit-btn');
    const userId = document.getElementById('mute-user-id').value.trim();
    const reason = document.getElementById('mute-reason').value.trim();
    const durationHours = parseInt(document.getElementById('mute-duration').value);

    if (!userId || !reason) {
      showAdminToast('请填写用户和原因', 'error');
      return;
    }

    submitBtn.textContent = '处理中...';
    submitBtn.disabled = true;

    const result = await muteCommunityUser(userId, reason, durationHours);
    if (result) {
      showAdminToast('禁言成功', 'success');
      closeMuteModal();
      await renderCommunityTab(container);
    } else {
      showAdminToast('禁言失败，请重试', 'error');
      submitBtn.textContent = '确认禁言';
      submitBtn.disabled = false;
    }
  });

  // 帖子数据编辑表单提交（先移除旧监听器避免重复绑定）
  const postStatForm = document.getElementById('admin-post-stat-form');
  if (postStatForm) {
    const newForm = postStatForm.cloneNode(true);
    postStatForm.parentNode.replaceChild(newForm, postStatForm);
    newForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('admin-post-stat-submit');
      const postId = document.getElementById('admin-post-stat-post-id').value;
      const field = document.getElementById('admin-post-stat-field').value;
      const numValue = parseInt(document.getElementById('admin-post-stat-value').value, 10);

      if (isNaN(numValue) || numValue < 0) {
        showAdminToast('请输入有效的非负整数', 'error');
        return;
      }

      submitBtn.textContent = '保存中...';
      submitBtn.disabled = true;

      var updates = {};
      updates[field] = numValue;
      var result = await updateCommunityPost(postId, updates);
      if (result) {
        showAdminToast((field === 'like_count' ? '点赞数' : '评论数') + '已更新为 ' + numValue, 'success');
        closePostStatModal();
        await renderCommunityTab(container);
      } else {
        showAdminToast('更新失败，请重试', 'error');
        submitBtn.textContent = '保存';
        submitBtn.disabled = false;
      }
    });
  }
}

function renderCardsTab(container, cardsData) {
  const cards = cardsData.cards || [];
  const totalC = cardsData.total || cards.length;
  const categories = cardsData.categories || [];
  const currentPage = cardsData.page || 1;
  const perPage = cardsData.per_page || 20;
  const totalPages = Math.ceil(totalC / perPage);

  let html = `
    <div class="admin-stats-row">
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--green">${ICONS.layers}</div>
        <div>
          <div class="admin-stat-num">${totalC}</div>
          <div class="admin-stat-label">卡片总数</div>
        </div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--amber">${ICONS.book}</div>
        <div>
          <div class="admin-stat-num">${categories.length}</div>
          <div class="admin-stat-label">分类数</div>
        </div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--blue">${ICONS.plus}</div>
        <div>
          <div class="admin-stat-num">--</div>
          <div class="admin-stat-label">添加卡片</div>
        </div>
      </div>
    </div>

    <div class="admin-section">
      <div class="admin-section-header">
        <div class="admin-section-title">
          ${ICONS.layers}
          知识卡片管理
        </div>
        <button class="admin-btn admin-btn--primary" onclick="openCardModal()">
          ${ICONS.plus}
          添加卡片
        </button>
      </div>

      <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;align-items:center;">
        <div style="flex:1;min-width:200px;position:relative;">
          <input type="text" class="admin-form-input" id="admin-card-search" placeholder="搜索 ID、标题、问题、答案..." value="${_adminCardSearch}" style="padding-left:36px;">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);">${ICONS.search}</span>
        </div>
        <select class="admin-form-select" id="admin-card-category-filter" style="max-width:220px;">
          <option value="">全部分类</option>
          ${categories.map(c => `<option value="${c}" ${c === _adminCardCategory ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
  `;

  if (cards.length === 0) {
    if (cardsData._missing_table) {
      html += `<div class="admin-empty"><div class="admin-empty-icon">${ICONS.alertCircle}</div><div class="admin-empty-text">cards 表无法访问</div><div class="admin-empty-hint">可能是表未创建或 RLS 策略阻止读取。请在 Supabase SQL Editor 中运行 sql/schema.sql 创建表，并为 admin 用户添加 RLS 读取策略</div></div>`;
    } else {
      html += `<div class="admin-empty"><div class="admin-empty-icon">${ICONS.layers}</div><div class="admin-empty-text">暂无知识卡片，请点击上方「添加卡片」</div></div>`;
    }
  } else {
    html += `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>分类</th>
              <th>标题</th>
              <th>问题预览</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${cards.map(card => {
              const qPreview = (card.question || '').length > 60 ? (card.question || '').slice(0, 60) + '...' : (card.question || '');
              return `
                <tr data-card-id="${card.id}">
                  <td style="font-family:var(--font-mono,monospace);font-size:0.75rem;color:var(--color-sage,#5a7d5c);">${String(card.id).slice(0, 12)}${String(card.id).length > 12 ? '...' : ''}</td>
                  <td><span class="admin-q-tag admin-q-tag--module">${card.category || ''}</span></td>
                  <td class="admin-table-name">${card.title || ''}</td>
                  <td style="color:var(--text-muted,#8a8a8a);font-size:0.82rem;max-width:300px;" title="${(card.question || '').replace(/"/g, '&quot;')}">${qPreview}</td>
                  <td>
                    <div class="admin-table-actions">
                      <button class="admin-btn admin-btn--ghost" onclick='handleEditCard(${JSON.stringify(card).replace(/'/g, "&#39;")})'>
                        编辑
                      </button>
                      <button class="admin-btn admin-btn--danger" onclick="handleDeleteCard('${card.id}')">
                        ${ICONS.trash}
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    // 分页
    if (totalPages > 1) {
      html += `<div style="display:flex;justify-content:center;gap:8px;margin-top:20px;align-items:center;">`;
      html += `<button class="admin-btn admin-btn--ghost" onclick="adminGoCardPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>上一页</button>`;
      html += `<span style="color:var(--text-muted);font-size:0.85rem;">第 ${currentPage} / ${totalPages} 页</span>`;
      html += `<button class="admin-btn admin-btn--ghost" onclick="adminGoCardPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>下一页</button>`;
      html += `</div>`;
    }
  }

  html += '</div>';

  // 卡片弹窗（添加/编辑共用）
  html += `
    <div class="admin-modal-overlay" id="admin-card-modal" style="display:none;">
      <div class="admin-modal" style="max-width:600px;">
        <div class="admin-modal-header">
          <div class="admin-modal-title" id="admin-card-modal-title">添加卡片</div>
          <button class="admin-modal-close" onclick="closeCardModal()">&times;</button>
        </div>
        <form id="admin-card-form" class="admin-form-grid">
          <div class="admin-form-group full">
            <label class="admin-form-label">分类</label>
            <select class="admin-form-select" id="card-category" required>
              ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
              <option value="__new__">+ 新建分类</option>
            </select>
          </div>
          <div class="admin-form-group full" id="new-category-group" style="display:none;">
            <label class="admin-form-label">新分类名称</label>
            <input type="text" class="admin-form-input" id="card-new-category" placeholder="输入新的分类名称">
          </div>
          <div class="admin-form-group full">
            <label class="admin-form-label">标题</label>
            <input type="text" class="admin-form-input" id="card-title" placeholder="例如：细胞膜" required>
          </div>
          <div class="admin-form-group full">
            <label class="admin-form-label">问题</label>
            <textarea class="admin-form-textarea" id="card-question" placeholder="输入问题内容" required style="min-height:80px;"></textarea>
          </div>
          <div class="admin-form-group full">
            <label class="admin-form-label">答案</label>
            <textarea class="admin-form-textarea" id="card-answer" placeholder="输入答案内容" style="min-height:100px;"></textarea>
          </div>
          <input type="hidden" id="card-edit-id" value="">
          <div class="admin-form-group full">
            <button type="submit" class="admin-form-submit" id="card-submit-btn">保存卡片</button>
          </div>
        </form>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // 搜索事件
  const searchInput = document.getElementById('admin-card-search');
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      _adminCardSearch = searchInput.value.trim();
      _adminCardPage = 1;
      const data = await getCards({ search: _adminCardSearch, category: _adminCardCategory, page: _adminCardPage });
      if (data) renderCardsTab(container, data);
    }, 300);
  });

  // 分类筛选
  document.getElementById('admin-card-category-filter').addEventListener('change', async (e) => {
    _adminCardCategory = e.target.value;
    _adminCardPage = 1;
    const data = await getCards({ search: _adminCardSearch, category: _adminCardCategory, page: _adminCardPage });
    if (data) renderCardsTab(container, data);
  });

  // 新建分类切换
  const catSelect = document.getElementById('card-category');
  const newCatGroup = document.getElementById('new-category-group');
  catSelect.addEventListener('change', () => {
    newCatGroup.style.display = catSelect.value === '__new__' ? '' : 'none';
  });

  // 绑定表单提交
  const form = document.getElementById('admin-card-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('card-submit-btn');
    let category = catSelect.value;
    if (category === '__new__') {
      category = document.getElementById('card-new-category').value.trim();
      if (!category) {
        showAdminToast('请输入新分类名称', 'error');
        return;
      }
    }
    if (!category) {
      showAdminToast('请选择或输入分类', 'error');
      return;
    }

    const cardData = {
      category,
      title: document.getElementById('card-title').value.trim(),
      question: document.getElementById('card-question').value.trim(),
      answer: document.getElementById('card-answer').value.trim(),
    };

    if (!cardData.title || !cardData.question) {
      showAdminToast('标题和问题不能为空', 'error');
      return;
    }

    const editId = document.getElementById('card-edit-id').value;
    submitBtn.textContent = '保存中...';
    submitBtn.disabled = true;

    let result;
    if (editId) {
      result = await updateCard(editId, cardData);
    } else {
      result = await addCard(cardData);
    }

    if (result) {
      showAdminToast(editId ? '卡片更新成功！' : '卡片添加成功！', 'success');
      closeCardModal();
      const data = await getCards({ search: _adminCardSearch, category: _adminCardCategory, page: _adminCardPage });
      if (data) renderCardsTab(container, data);
    } else {
      showAdminToast('操作失败，请重试', 'error');
      submitBtn.textContent = '保存卡片';
      submitBtn.disabled = false;
    }
  });
}

/* ===== Toast 通知 ===== */
function showAdminToast(message, type = 'success') {
  const existing = document.getElementById('admin-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'admin-toast';
  const bgColor = type === 'success' ? '#22c55e' : type === 'error' ? '#c0553a' : '#3b82f6';
  const iconSvg = type === 'success' ? '<svg viewBox="0 0 24 24" width="16" height="16" stroke="#fff" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' :
                 type === 'error' ? '<svg viewBox="0 0 24 24" width="16" height="16" stroke="#fff" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' : '';
  toast.style.cssText = `
    position: fixed; top: 24px; right: 24px; z-index: 11000;
    background: ${bgColor}; color: #fff; padding: 14px 24px;
    border-radius: 12px; font-size: 0.88rem; font-weight: 500;
    display: flex; align-items: center; gap: 10px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.18);
    animation: adminToastIn 0.35s ease; max-width: 380px;
  `;
  toast.innerHTML = `${iconSvg}<span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'adminToastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, ADMIN_TOAST_DISPLAY_MS);
}

// 注入 Toast 动画样式
if (!document.getElementById('admin-toast-styles')) {
  const toastStyle = document.createElement('style');
  toastStyle.id = 'admin-toast-styles';
  toastStyle.textContent = `
    @keyframes adminToastIn { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes adminToastOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(40px); } }
  `;
  document.head.appendChild(toastStyle);
}

/* ===== 题目管理标签 ===== */

// 渲染题目选项 HTML（兼容数组与对象两种格式）
function _renderQuestionOptionsHtml(options) {
  if (!options) return '';
  // 数组格式：["选项A", "选项B", ...]
  if (Array.isArray(options) && options.length > 0) {
    const visible = options.slice(0, 4);
    const rest = options.length - visible.length;
    let html = '<div class="admin-q-options">';
    visible.forEach(function (opt, i) {
      html += '<div>' + String.fromCharCode(65 + i) + '. ' + escapeHtml(String(opt)) + '</div>';
    });
    if (rest > 0) html += '<div>...还有 ' + rest + ' 个选项</div>';
    html += '</div>';
    return html;
  }
  // 对象格式：{"A": "...", "B": "..."}
  if (typeof options === 'object' && options !== null) {
    const keys = Object.keys(options).sort();
    if (keys.length === 0) return '';
    const visible = keys.slice(0, 4);
    const rest = keys.length - visible.length;
    let html = '<div class="admin-q-options">';
    visible.forEach(function (k) {
      html += '<div>' + escapeHtml(k) + '. ' + escapeHtml(String(options[k])) + '</div>';
    });
    if (rest > 0) html += '<div>...还有 ' + rest + ' 个选项</div>';
    html += '</div>';
    return html;
  }
  return '';
}

// 渲染 MTF 子题 HTML
function _renderSubQuestionsHtml(subs) {
  if (!Array.isArray(subs) || subs.length === 0) return '';
  let html = '<div class="admin-q-options" style="border-left:2px solid rgba(168,85,247,0.3);padding-left:8px;margin-top:4px;">';
  subs.slice(0, 4).forEach(function (s) {
    const label = s.label || '';
    const text = s.text || '';
    const ans = s.answer === true ? ' ✓' : (s.answer === false ? ' ✗' : '');
    html += '<div><strong>' + escapeHtml(String(label)) + '.</strong> ' + escapeHtml(String(text)) + '<span style="color:' + (s.answer === true ? '#10b981' : (s.answer === false ? '#ef4444' : '#999')) + ';">' + ans + '</span></div>';
  });
  if (subs.length > 4) html += '<div>...还有 ' + (subs.length - 4) + ' 个子题</div>';
  html += '</div>';
  return html;
}

function renderQuestionsTab(container, questionsData) {
  const allQuestions = questionsData.questions || [];
  // 客户端按 target 过滤（Supabase 无 target 列，从 difficulty 推断）
  const questions = _adminQuestionTarget ? allQuestions.filter(q => {
    const t = q.target || (function() {
      const d = String(q.difficulty || '').toLowerCase();
      if (d === 'basic' || d === 'easy') return 'high_school';
      if (d === 'national' || d === 'league' || d === 'hard') return 'competition';
      return 'both';
    })();
    return t === _adminQuestionTarget;
  }) : allQuestions;
  const totalQ = questionsData.total || questions.length;
  const modules = questionsData.modules || [];
  const currentPage = questionsData.page || 1;
  const perPage = questionsData.per_page || 50;
  const totalPages = Math.ceil(totalQ / perPage);

  // 收集所有标签
  const allTags = new Set();
  questions.forEach(q => {
    if (q.subject) allTags.add(q.subject);
    if (q.concept) allTags.add(q.concept);
    if (q.tags && Array.isArray(q.tags)) q.tags.forEach(t => allTags.add(t));
  });

  let html = `
    <div class="admin-stats-row">
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--green">${ICONS.book}</div>
        <div>
          <div class="admin-stat-num">${totalQ}</div>
          <div class="admin-stat-label">题目总数</div>
        </div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--amber">${ICONS.settings}</div>
        <div>
          <div class="admin-stat-num">${modules.length}</div>
          <div class="admin-stat-label">模块数</div>
        </div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--blue">${ICONS.plus}</div>
        <div>
          <div class="admin-stat-num">--</div>
          <div class="admin-stat-label">添加新题</div>
        </div>
      </div>
    </div>

    <div class="admin-section">
      <div class="admin-section-header">
        <div class="admin-section-title">
          ${ICONS.plus}
          添加新题目
        </div>
      </div>
      <form class="admin-form-grid" id="add-question-form">
        <div class="admin-form-group">
          <label class="admin-form-label">模块</label>
          <select class="admin-form-select" id="q-module" required>
            <option value="module_1">模块 1 - 生化/分子/细胞</option>
            <option value="module_2">模块 2 - 植物/微生物</option>
            <option value="module_3">模块 3 - 动物/生态</option>
            <option value="module_4">模块 4 - 遗传/进化/信息</option>
          </select>
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">科目</label>
          <input type="text" class="admin-form-input" id="q-subject" placeholder="例如：细胞生物学" required>
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">知识点</label>
          <input type="text" class="admin-form-input" id="q-concept" placeholder="例如：细胞器" required>
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">类型</label>
          <select class="admin-form-select" id="q-type">
            <option value="single">单选题</option>
            <option value="multiple">多选题</option>
            <option value="judgment">判断题</option>
          </select>
        </div>
        <div class="admin-form-group full">
          <label class="admin-form-label">题目内容</label>
          <textarea class="admin-form-textarea" id="q-text" placeholder="输入题目内容" required></textarea>
        </div>
        <div class="admin-form-group full">
          <label class="admin-form-label">选项（每行一个选项）</label>
          <textarea class="admin-form-textarea" id="q-options" placeholder="选项A&#10;选项B&#10;选项C&#10;选项D" required></textarea>
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">答案（TTFF 格式）</label>
          <input type="text" class="admin-form-input" id="q-answer" placeholder="如：TTFF（T=对，F=错）" required>
          <div style="font-size:0.72rem;color:var(--text-muted,#8a8a8a);margin-top:4px;line-height:1.5;">
            按选项顺序填 T/F。如 4 选项选 A → <code>TFFF</code>；选 AB → <code>TTFF</code>；判断题 → <code>T</code> 或 <code>F</code>
          </div>
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">难度（1-5）</label>
          <input type="number" class="admin-form-input" id="q-difficulty" min="1" max="5" value="3" required>
        </div>
        <div class="admin-form-group full">
          <label class="admin-form-label">解析</label>
          <textarea class="admin-form-textarea" id="q-explanation" placeholder="题目解析（可选）"></textarea>
        </div>
        <div class="admin-form-group full">
          <button type="submit" class="admin-form-submit">添加题目</button>
        </div>
      </form>
    </div>

    <div class="admin-section">
      <div class="admin-section-header">
        <div class="admin-section-title">
          ${ICONS.book}
          题目列表
        </div>
        <span class="admin-section-badge">${totalQ} 题</span>
      </div>

      <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;align-items:center;">
        <div style="flex:1;min-width:200px;position:relative;">
          <input type="text" class="admin-form-input" id="admin-q-search" placeholder="搜索 ID、题目、科目、知识点..." value="${_adminQuestionSearch}" style="padding-left:36px;">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);">${ICONS.search}</span>
        </div>
        <button class="admin-btn admin-btn--primary" id="admin-q-search-btn" style="padding:8px 20px;font-size:0.85rem;white-space:nowrap;">搜索</button>
        <select class="admin-form-select" id="admin-q-module-filter" style="max-width:200px;">
          <option value="">全部模块</option>
          ${modules.map(m => `<option value="${m}" ${m === _adminQuestionModule ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
        <select class="admin-form-select" id="admin-q-target-filter" style="max-width:160px;">
          <option value="">全部目标</option>
          <option value="high_school" ${_adminQuestionTarget === 'high_school' ? 'selected' : ''}>高考</option>
          <option value="competition" ${_adminQuestionTarget === 'competition' ? 'selected' : ''}>竞赛</option>
          <option value="both" ${_adminQuestionTarget === 'both' ? 'selected' : ''}>共通</option>
        </select>
      </div>
  `;

  if (questions.length === 0) {
    html += `<div class="admin-empty"><div class="admin-empty-icon">${ICONS.inbox}</div><div class="admin-empty-text">暂无题目，请在上方添加</div></div>`;
  } else {
    questions.forEach(q => {
      // 兼容两种字段命名：question (Supabase 默认) / stem (OCR 入库)
      const qStem = q.question || q.stem || '';
      const qText = qStem.length > 100 ? qStem.slice(0, 100) + '...' : qStem;
      const qExpl = q.explanation || q.analysis || '';
      // 选项支持数组 ["A","B"] 和对象 {"A":"...","B":"..."} 两种格式
      const optsHtml = _renderQuestionOptionsHtml(q.options);
      // 渲染 MTF 子题（sub_questions / subQuestions）
      const subsHtml = _renderSubQuestionsHtml(q.sub_questions || q.subQuestions);
      // Supabase 实时查看链接（按 id 拉取单题）
      const supaLink = q.id
        ? `<a href="https://supabase.com/dashboard/project/pgkjpuowpxngmxjjlfil/editor/2920?filter=id%3Deq%3A${encodeURIComponent(q.id)}" target="_blank" rel="noopener" class="admin-q-tag" style="background:rgba(99,102,241,0.1);color:#6366f1;text-decoration:none;font-size:0.65rem;cursor:pointer;" title="在 Supabase 中查看">↗ Supabase</a>`
        : '';
      html += `
        <div class="admin-q-card" data-question-id="${q.id}">
          <div class="admin-q-top">
            <div class="admin-q-body">
              <div class="admin-q-text" title="${qStem.replace(/"/g, '&quot;')}">${escapeHtml(qText)}</div>
              <div class="admin-q-meta">
                <span class="admin-q-tag" style="background:rgba(59,130,246,0.1);color:#3b82f6;font-family:var(--font-mono,monospace);font-size:0.65rem;">ID: ${escapeHtml(String(q.id || ''))}</span>
                ${supaLink}
                <span class="admin-q-tag admin-q-tag--module">${escapeHtml(q.module || '')}</span>
                <span class="admin-q-tag admin-q-tag--diff">难度 ${escapeHtml(String(q.difficulty != null ? q.difficulty : 3))}</span>
                ${q.subject ? `<span class="admin-q-tag admin-q-tag--subject">${escapeHtml(q.subject)}</span>` : ''}
                ${q.concept ? `<span class="admin-q-tag" style="background:rgba(16,185,129,0.1);color:#10b981;">${escapeHtml(q.concept)}</span>` : ''}
                ${q.type ? `<span class="admin-q-tag" style="background:rgba(168,85,247,0.1);color:#a855f7;font-size:0.65rem;">${escapeHtml(q.type)}</span>` : ''}
                ${q.source === 'data' ? '<span class="admin-q-tag" style="background:rgba(107,114,128,0.1);color:#6b7280;">数据文件</span>' : ''}
              </div>
              ${optsHtml}
              ${subsHtml}
              ${qExpl ? `<div class="admin-q-explanation"><strong>解析：</strong>${qExpl.length > 80 ? qExpl.slice(0, 80) + '...' : qExpl}</div>` : ''}
            </div>
            <div class="admin-table-actions">
              <button class="admin-btn admin-btn--ghost" onclick='handleEditQuestion(${JSON.stringify(q).replace(/'/g, "&#39;")})'>
                编辑
              </button>
              <button class="admin-btn admin-btn--danger" onclick="handleDeleteQuestion('${q.id}')">
                ${ICONS.trash}
                删除
              </button>
            </div>
          </div>
        </div>
      `;
    });

    // 分页
    if (totalPages > 1) {
      html += `<div style="display:flex;justify-content:center;gap:8px;margin-top:20px;align-items:center;">`;
      html += `<button class="admin-btn admin-btn--ghost" onclick="adminGoQuestionPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>上一页</button>`;
      html += `<span style="color:var(--text-muted);font-size:0.85rem;">第 ${currentPage} / ${totalPages} 页</span>`;
      html += `<button class="admin-btn admin-btn--ghost" onclick="adminGoQuestionPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>下一页</button>`;
      html += `</div>`;
    }
  }

  html += '</div>';

  // 题目编辑弹窗
  html += `
    <div class="admin-modal-overlay" id="admin-question-modal" style="display:none;">
      <div class="admin-modal" style="max-width:680px;">
        <div class="admin-modal-header">
          <div class="admin-modal-title">编辑题目</div>
          <button class="admin-modal-close" onclick="closeQuestionModal()">&times;</button>
        </div>
        <form id="admin-question-edit-form" class="admin-form-grid">
          <div class="admin-form-group">
            <label class="admin-form-label">ID</label>
            <input type="text" class="admin-form-input" id="eq-id" readonly>
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">模块</label>
            <select class="admin-form-select" id="eq-module">
              <option value="module_1">模块 1 - 生化/分子/细胞</option>
              <option value="module_2">模块 2 - 植物/微生物</option>
              <option value="module_3">模块 3 - 动物/生态</option>
              <option value="module_4">模块 4 - 遗传/进化/信息</option>
              <option value="exam">综合/考试</option>
            </select>
          </div>
          <div class="admin-form-group full">
            <label class="admin-form-label">题目内容</label>
            <textarea class="admin-form-textarea" id="eq-question" required></textarea>
          </div>
          <div class="admin-form-group full">
            <label class="admin-form-label">选项（每行一个）</label>
            <textarea class="admin-form-textarea" id="eq-options" style="min-height:80px;"></textarea>
            <div style="font-size:0.72rem;color:var(--text-muted,#8a8a8a);margin-top:4px;line-height:1.5;">
              💡 <strong>选项格式：</strong>每行一个选项，选项数量决定答案长度。<br>
              • 单选题 / 多选题 / 判断题：直接写选项文字（如：<code>酶是蛋白质</code>）<br>
              • 多判断题（MTF）：写描述文字即可，无需标注对错（对错统一在「答案」字段用 TTFF 表示）
            </div>
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">答案（TTFF 格式，大小写均可）</label>
            <input type="text" class="admin-form-input" id="eq-answer" placeholder="如：TTFF / ttff / TfFf">
            <div style="font-size:0.72rem;color:var(--text-muted,#8a8a8a);margin-top:4px;line-height:1.6;">
              💡 <strong>答案格式（统一 TTFF）：</strong>按选项顺序，每项用 <code>T</code> 或 <code>F</code> 表示。<br>
              • <strong>T</strong> = 该选项属于正确答案集合；<strong>F</strong> = 该选项不属于答案集合<br>
              • 单选题（4 选项）：<code>TFFF</code> 表示选 A；<code>FFTF</code> 表示选 C<br>
              • 多选题（4 选项）：<code>TTFF</code> 表示选 AB；<code>TFFT</code> 表示选 AD<br>
              • 判断题（1 选项）：<code>T</code> 表示对；<code>F</code> 表示错<br>
              • 多判断题：每项 T/F 直接对应该选项描述的真假<br>
              ⚠️ <strong>「问错的是？」类题目：</strong>T 表示该选项在答案视角下正确（即该选项确实是「错的」、属于答案），F 表示该选项在答案视角下错误（即该选项其实是对的、不属于答案）。<br>
              例：题目问「下列哪个错误」，答案是 A 和 B 错误 → TTFF 格式填 <code>TTFF</code>（A、B 是答案→T；C、D 不是答案→F）。
            </div>
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">类型</label>
            <select class="admin-form-select" id="eq-type">
              <option value="single">单选题</option>
              <option value="multiple">多选题</option>
              <option value="judgment">判断题</option>
              <option value="mtf">多判断题</option>
            </select>
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">科目</label>
            <input type="text" class="admin-form-input" id="eq-subject">
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">知识点</label>
            <input type="text" class="admin-form-input" id="eq-concept">
          </div>
          <div class="admin-form-group full">
            <label class="admin-form-label">解析</label>
            <textarea class="admin-form-textarea" id="eq-explanation" style="min-height:70px;"></textarea>
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">难度（1-5）</label>
            <div style="display:flex;gap:6px;align-items:center;" id="eq-difficulty-stars">
              ${[1,2,3,4,5].map(d => `<button type="button" class="admin-diff-star" data-diff="${d}" style="width:36px;height:36px;border-radius:8px;border:1.5px solid var(--border-light,#ece8e1);background:var(--surface-secondary,#faf7f2);cursor:pointer;font-size:1rem;transition:all 0.15s;">${d}</button>`).join('')}
            </div>
            <input type="hidden" id="eq-difficulty" value="3">
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">标签</label>
            <div id="eq-tags-container" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;"></div>
            <div style="display:flex;gap:6px;">
              <input type="text" class="admin-form-input" id="eq-tag-input" placeholder="输入标签后回车" style="flex:1;">
              <button type="button" class="admin-btn admin-btn--ghost" onclick="addEditTag()" style="white-space:nowrap;">添加</button>
            </div>
          </div>
          <div class="admin-form-group full">
            <label class="admin-form-label">题目图片</label>
            <div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;">
              <div style="flex:1;min-width:200px;">
                <input type="file" accept="image/*" id="eq-image-file" style="font-size:0.82rem;" onchange="handleQuestionImageUpload(this)">
                <div style="font-size:0.72rem;color:var(--text-muted,#8a8a8a);margin-top:4px;">支持 JPG/PNG/GIF，将转为 Base64 存储</div>
              </div>
              <div id="eq-image-preview" style="max-width:120px;max-height:80px;overflow:hidden;border-radius:8px;border:1px solid var(--border-light,#ece8e1);display:none;">
                <img id="eq-image-preview-img" style="max-width:100%;max-height:80px;object-fit:contain;">
              </div>
            </div>
            <input type="hidden" id="eq-image" value="">
          </div>
          <div class="admin-form-group full">
            <button type="submit" class="admin-form-submit" id="eq-submit-btn">保存修改</button>
          </div>
        </form>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // 搜索事件
  const searchInput = document.getElementById('admin-q-search');
  const searchBtn = document.getElementById('admin-q-search-btn');

  async function doSearch() {
    _adminQuestionSearch = searchInput.value.trim();
    _adminQuestionPage = 1;
    const data = await getQuestions({ search: _adminQuestionSearch, module: _adminQuestionModule, page: _adminQuestionPage });
    if (data) renderQuestionsTab(container, data);
  }

  // 搜索按钮点击
  if (searchBtn) {
    searchBtn.addEventListener('click', doSearch);
  }
  // 回车键触发搜索
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doSearch();
    }
  });

  // 模块筛选
  document.getElementById('admin-q-module-filter').addEventListener('change', async (e) => {
    _adminQuestionModule = e.target.value;
    _adminQuestionPage = 1;
    const data = await getQuestions({ search: _adminQuestionSearch, module: _adminQuestionModule, page: _adminQuestionPage });
    if (data) renderQuestionsTab(container, data);
  });

  // 目标筛选
  var targetFilter = document.getElementById('admin-q-target-filter');
  if (targetFilter) {
    targetFilter.addEventListener('change', async (e) => {
      _adminQuestionTarget = e.target.value;
      _adminQuestionPage = 1;
      const data = await getQuestions({ search: _adminQuestionSearch, module: _adminQuestionModule, page: _adminQuestionPage });
      if (data) renderQuestionsTab(container, data);
    });
  }

  // 绑定添加题目表单
  document.getElementById('add-question-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const optionsText = document.getElementById('q-options').value;
    const lines = optionsText.split('\n').map(o => o.trim()).filter(o => o);
    const qType = document.getElementById('q-type').value;
    var parsed = _parseTTFFAnswer(document.getElementById('q-answer').value, qType, lines);

    const question = {
      module: document.getElementById('q-module').value,
      question: document.getElementById('q-text').value,
      subject: document.getElementById('q-subject').value,
      concept: document.getElementById('q-concept').value,
      type: qType,
      options: lines,
      sub_questions: parsed.subQuestions,
      answer: parsed.answer,
      explanation: document.getElementById('q-explanation').value,
      difficulty: parseInt(document.getElementById('q-difficulty').value)
    };

    const result = await addQuestion(question);
    if (result) {
      const btn = e.target.querySelector('.admin-form-submit');
      btn.textContent = '添加成功！';
      btn.style.background = '#22c55e';
      setTimeout(() => {
        btn.textContent = '添加题目';
        btn.style.background = '';
      }, 1500);
      e.target.reset();
      const data = await getQuestions({ search: _adminQuestionSearch, module: _adminQuestionModule, page: _adminQuestionPage });
      if (data) renderQuestionsTab(container, data);
    } else {
      alert('题目添加失败，请重试');
    }
  });
}

/* ===== 全局操作 ===== */
window.handleChangeUserGroup = async function(userId, newGroup) {
  var sb = (typeof window.getSupabase === 'function') ? window.getSupabase() : null;
  if (!sb) { showAdminToast('Supabase 未连接', 'error'); return; }
  try {
    var { error } = await sb.from('profiles').update({ user_group: newGroup }).eq('id', userId);
    if (error) { showAdminToast('更新失败: ' + error.message, 'error'); return; }
    showAdminToast('用户组已设为 ' + {admin:'管理员',premium:'高级会员',verified:'认证会员',member:'普通会员',guest:'访客'}[newGroup], 'success');
  } catch(e) {
    showAdminToast('更新出错: ' + e.message, 'error');
  }
};

window.handleDeleteUser = async function(userId) {
  if (!confirm('确定要删除该用户吗？此操作不可恢复。')) return;
  var sb = (typeof window.getSupabase === 'function') ? window.getSupabase() : null;
  if (!sb) { alert('Supabase 未连接'); return; }
  try {
    var { error } = await sb.from('profiles').delete().eq('id', userId);
    if (error) { alert('删除失败: ' + error.message); return; }
    const users = await getUsers();
    const container = document.getElementById('admin-tab-content');
    if (users && container) renderUsersTab(container, users);
    showAdminToast('用户已删除', 'success');
  } catch(e) {
    alert('删除出错: ' + e.message);
  }
};

window.handleAdjustUserPoints = async function(userId, currentPoints) {
  const amountStr = prompt('调整该用户的积分\n\n当前积分：' + currentPoints + '\n输入正数增加，输入负数扣除，例如：+10 或 -5');
  if (!amountStr) return;
  const amount = parseInt(amountStr, 10);
  if (isNaN(amount) || amount === 0) {
    showAdminToast('请输入有效的调整数值', 'error');
    return;
  }
  const reason = prompt('调整原因（必填）：') || '管理员手动调整';
  try {
    var result;
    if (typeof window.adjustUserPoints === 'function') {
      result = await window.adjustUserPoints(amount, reason, { userId: userId, source: 'admin' });
    } else if (typeof adjustUserPoints === 'function') {
      result = await adjustUserPoints(amount, reason, { userId: userId, source: 'admin' });
    } else {
      showAdminToast('积分调整功能未加载', 'error');
      return;
    }
    if (result && result.ok) {
      const crCell = document.getElementById('points-' + userId);
      if (crCell) crCell.textContent = result.points;
      showAdminToast('已调整用户积分为 ' + result.points, 'success');
    } else {
      showAdminToast('调整失败：' + (result && result.error ? result.error : '未知错误'), 'error');
    }
  } catch (e) {
    showAdminToast('调整出错：' + e.message, 'error');
  }
};

window.handleResolveAppeal = async function(appealId, action) {
  if (!appealId || !action) return;
  var adminNote = prompt(action === 'approve' ? '通过申诉的备注（可选）：' : '驳回申诉的原因（可选）：') || '';
  try {
    var resolveFn = (typeof window.resolveCRAppeal === 'function') ? window.resolveCRAppeal : (typeof resolveCRAppeal === 'function' ? resolveCRAppeal : null);
    if (!resolveFn) {
      showAdminToast('申诉处理功能未加载', 'error');
      return;
    }
    var result = await resolveFn(appealId, action, adminNote);
    if (result && result.ok) {
      showAdminToast(action === 'approve' ? '申诉已通过，已恢复用户积分' : '申诉已驳回', 'success');
      // 刷新当前标签
      var contentEl = document.getElementById('admin-tab-content');
      if (contentEl) renderAppealsTab(contentEl);
    } else {
      showAdminToast('处理失败：' + (result && result.error ? result.error : '未知错误'), 'error');
    }
  } catch (e) {
    showAdminToast('处理出错：' + e.message, 'error');
  }
};

window.handleEditUser = function(userId, username, displayName, bioScore, totalAnswered, totalCorrect, accuracy, points) {
  const modal = document.getElementById('admin-user-modal');
  if (!modal) return;
  document.getElementById('edit-username').value = username || '';
  document.getElementById('edit-display-name').value = displayName || '';
  document.getElementById('edit-bio-score').value = bioScore;
  document.getElementById('edit-points').value = (typeof points === 'number') ? points : 0;
  document.getElementById('edit-total-answered').value = totalAnswered;
  document.getElementById('edit-total-correct').value = totalCorrect;
  document.getElementById('edit-accuracy').value = accuracy;
  document.getElementById('edit-new-password').value = '';
  modal.style.display = 'flex';

  // 绑定表单提交
  const form = document.getElementById('admin-user-edit-form');
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);
  newForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    var sb = (typeof window.getSupabase === 'function') ? window.getSupabase() : null;
    if (!sb) { showAdminToast('Supabase 未连接', 'error'); return; }
    const newUsername = document.getElementById('edit-username').value.trim();
    const newDisplayName = document.getElementById('edit-display-name').value.trim();
    const updates = {
      username: newUsername || undefined,
      display_name: newDisplayName || undefined,
      bio_score: parseInt(document.getElementById('edit-bio-score').value),
      points: parseInt(document.getElementById('edit-points').value),
      total_answered: parseInt(document.getElementById('edit-total-answered').value),
      total_correct: parseInt(document.getElementById('edit-total-correct').value),
      accuracy: parseFloat(document.getElementById('edit-accuracy').value)
    };
    // 移除空字符串字段，避免覆盖为空
    if (!newUsername) delete updates.username;
    if (!newDisplayName) delete updates.display_name;
    if (isNaN(updates.points)) delete updates.points;
    try {
      var { error } = await sb.from('profiles').update(updates).eq('id', userId);
      if (error) { showAdminToast('更新失败: ' + parseSupabaseError(error), 'error'); return; }
      closeUserModal();
      const users = await getUsers();
      const container = document.getElementById('admin-tab-content');
      if (users && container) renderUsersTab(container, users);
      showAdminToast('用户信息已更新', 'success');
    } catch(e) {
      showAdminToast('更新出错: ' + e.message, 'error');
    }
  });
};

window.closeUserModal = function() {
  const modal = document.getElementById('admin-user-modal');
  if (modal) modal.style.display = 'none';
};

window.handleResetPassword = async function(userId) {
  const newPwd = prompt('重置该用户的密码：', '123456');
  if (newPwd) {
    showAdminToast('密码重置功能需要 Supabase Admin API，暂不可用', 'error');
  }
};

window.handleDeleteQuestion = async function(id) {
  if (confirm('确定要删除这个题目吗？')) {
    const success = await deleteQuestion(id);
    if (success) {
      const data = await getQuestions({ search: _adminQuestionSearch, module: _adminQuestionModule, page: _adminQuestionPage });
      const container = document.getElementById('admin-tab-content');
      if (data && container) renderQuestionsTab(container, data);
    } else {
      alert('删除失败');
    }
  }
};

/* ===== 题目编辑相关 ===== */
let _editQuestionTags = [];

/**
 * 将存储格式的答案转换为 TTFF 格式（用于编辑表单显示）
 * 支持的存储格式：
 *   - 单选/多选：answer = "A" / "AB" / "ACD"（字母组合）
 *   - 判断题：answer = "T" / "F"
 *   - MTF：sub_questions = [{answer: true/false}, ...]
 *   - 对象格式：answer = {"A": true, "B": false, ...}
 * @returns {string} TTFF 字符串（如 "TTFF"）
 */
function _answerToTTFF(answer, qType, optionCount, subQuestions) {
  // MTF：从 sub_questions 转换
  if (Array.isArray(subQuestions) && subQuestions.length > 0) {
    return subQuestions.map(function (s) {
      return s.answer === true ? 'T' : 'F';
    }).join('');
  }
  // 对象格式：{"A": true, "B": false, ...}
  if (answer && typeof answer === 'object' && !Array.isArray(answer)) {
    var keys = Object.keys(answer).sort();
    return keys.map(function (k) {
      return answer[k] === true ? 'T' : 'F';
    }).join('');
  }
  var ans = String(answer || '').toUpperCase().trim();
  if (!ans) return '';
  // 判断题：T/F 直接返回
  if (qType === 'judgment' || (ans.length === 1 && (ans === 'T' || ans === 'F'))) {
    return ans;
  }
  // 已经是 TTFF 格式（纯 T/F 组成）
  if (/^[TF]+$/i.test(ans)) {
    return ans.toUpperCase();
  }
  // 字母格式：A/B/C/D → TTFF
  if (/^[A-Z]+$/.test(ans)) {
    var n = optionCount || ans.length;
    var arr = new Array(n).fill('F');
    for (var i = 0; i < ans.length; i++) {
      var idx = ans.charCodeAt(i) - 65; // A=0, B=1, ...
      if (idx >= 0 && idx < n) arr[idx] = 'T';
    }
    return arr.join('');
  }
  // 逗号分隔格式：A:T,B:F → TTFF
  if (ans.indexOf(':') >= 0 || ans.indexOf('，') >= 0 || ans.indexOf(',') >= 0) {
    var parts = ans.split(/[,，]/);
    var map = {};
    parts.forEach(function (p) {
      var m = p.match(/([A-Z])\s*[:：]\s*([TF])/i);
      if (m) map[m[1].toUpperCase()] = m[2].toUpperCase();
    });
    var keys2 = Object.keys(map).sort();
    return keys2.map(function (k) { return map[k] || 'F'; }).join('');
  }
  return ans;
}

/**
 * 将 TTFF 格式的答案输入转换为存储格式
 * @returns {{answer: string, subQuestions: Array|undefined}}
 */
function _parseTTFFAnswer(ttff, qType, optionLines) {
  var raw = String(ttff || '').toUpperCase().trim();
  var n = optionLines.length;
  var result = { answer: '', subQuestions: undefined };

  if (!raw) return result;

  // 确保只含 T/F
  var clean = raw.replace(/[^TF]/gi, '').toUpperCase();
  if (!clean) return result;

  // 判断题：直接存 T/F
  if (qType === 'judgment' || n === 1) {
    result.answer = clean.charAt(0);
    return result;
  }

  // MTF：转换为 sub_questions
  if (qType === 'mtf' || qType === 'multi_judge') {
    var subs = [];
    for (var i = 0; i < n && i < clean.length; i++) {
      subs.push({
        label: String.fromCharCode(65 + i),
        text: optionLines[i] || '',
        answer: clean.charAt(i) === 'T'
      });
    }
    result.subQuestions = subs;
    result.answer = ''; // MTF 不用 answer 字段
    return result;
  }

  // 单选/多选：TTFF → 字母组合
  var letters = '';
  for (var j = 0; j < n && j < clean.length; j++) {
    if (clean.charAt(j) === 'T') {
      letters += String.fromCharCode(65 + j);
    }
  }
  result.answer = letters;
  return result;
}

window.handleEditQuestion = function(qData) {
  const modal = document.getElementById('admin-question-modal');
  if (!modal) return;

  document.getElementById('eq-id').value = qData.id || '';
  document.getElementById('eq-module').value = qData.module || 'module_1';
  document.getElementById('eq-question').value = qData.question || qData.stem || '';
  document.getElementById('eq-type').value = qData.type || 'single';
  document.getElementById('eq-subject').value = qData.subject || '';
  document.getElementById('eq-concept').value = qData.concept || '';
  document.getElementById('eq-explanation').value = qData.explanation || qData.analysis || '';

  // 选项（兼容数组、对象、sub_questions 三种格式）
  const options = qData.options;
  const subQuestions = qData.sub_questions || qData.subQuestions;
  let optionsText = '';
  let optionCount = 0;
  if (Array.isArray(options) && options.length > 0) {
    optionsText = options.join('\n');
    optionCount = options.length;
  } else if (options && typeof options === 'object' && !Array.isArray(options) && Object.keys(options).length > 0) {
    var sortedKeys = Object.keys(options).sort();
    optionsText = sortedKeys.map(function (k) { return options[k]; }).join('\n');
    optionCount = sortedKeys.length;
  } else if (Array.isArray(subQuestions) && subQuestions.length > 0) {
    // MTF：只回填选项文字，对错统一在答案字段用 TTFF 表示
    optionsText = subQuestions.map(function (s) { return (s.text || ''); }).join('\n');
    optionCount = subQuestions.length;
  }
  document.getElementById('eq-options').value = optionsText;

  // 答案：将存储格式转换为 TTFF 格式显示
  document.getElementById('eq-answer').value = _answerToTTFF(qData.answer, qData.type, optionCount, subQuestions);

  // 难度
  const diff = qData.difficulty || 3;
  document.getElementById('eq-difficulty').value = diff;
  updateDifficultyStars(diff);

  // 标签
  _editQuestionTags = Array.isArray(qData.tags) ? [...qData.tags] : [];
  renderEditTags();

  // 图片
  const imgVal = qData.image || '';
  document.getElementById('eq-image').value = imgVal;
  const preview = document.getElementById('eq-image-preview');
  const previewImg = document.getElementById('eq-image-preview-img');
  if (imgVal) {
    previewImg.src = imgVal;
    preview.style.display = '';
  } else {
    preview.style.display = 'none';
    previewImg.src = '';
  }
  document.getElementById('eq-image-file').value = '';

  modal.style.display = 'flex';

  // 绑定难度星标点击
  document.querySelectorAll('#eq-difficulty-stars .admin-diff-star').forEach(btn => {
    btn.onclick = function() {
      const d = parseInt(this.dataset.diff);
      document.getElementById('eq-difficulty').value = d;
      updateDifficultyStars(d);
    };
  });

  // 标签输入回车
  const tagInput = document.getElementById('eq-tag-input');
  tagInput.onkeydown = function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEditTag();
    }
  };

  // 绑定表单提交
  const form = document.getElementById('admin-question-edit-form');
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);
  newForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('eq-submit-btn');
    const qid = document.getElementById('eq-id').value;
    const optionsText = document.getElementById('eq-options').value;
    const qType = document.getElementById('eq-type').value;
    
    // 解析选项文本 + TTFF 答案
    const lines = optionsText.split('\n').map(o => o.trim()).filter(o => o);
    let options = [];
    let subQuestions = [];
    var ttffInput = document.getElementById('eq-answer').value;
    var parsed = _parseTTFFAnswer(ttffInput, qType, lines);

    if (qType === 'mtf' || qType === 'multi_judge') {
      // MTF：选项为纯文字数组，答案在 sub_questions
      subQuestions = parsed.subQuestions || lines.map(function(line, i) {
        return { label: String.fromCharCode(65 + i), text: line, answer: null };
      });
      options = [];
    } else {
      // 单选/判断/多选：选项为数组，答案为字母组合或 T/F
      options = lines;
    }

    const updateData = {
      module: document.getElementById('eq-module').value,
      question: document.getElementById('eq-question').value,
      subject: document.getElementById('eq-subject').value,
      concept: document.getElementById('eq-concept').value,
      type: qType,
      options: options,
      sub_questions: subQuestions.length > 0 ? subQuestions : undefined,
      answer: parsed.answer,
      explanation: document.getElementById('eq-explanation').value,
      difficulty: parseInt(document.getElementById('eq-difficulty').value),
      tags: _editQuestionTags,
      image: document.getElementById('eq-image').value || undefined,
    };

    submitBtn.textContent = '保存中...';
    submitBtn.disabled = true;

    const result = await updateQuestion(qid, updateData);
    if (result) {
      showAdminToast('题目更新成功！', 'success');
      closeQuestionModal();
      const data = await getQuestions({ search: _adminQuestionSearch, module: _adminQuestionModule, page: _adminQuestionPage });
      const container = document.getElementById('admin-tab-content');
      if (data && container) renderQuestionsTab(container, data);
    } else {
      showAdminToast('更新失败，请重试', 'error');
      submitBtn.textContent = '保存修改';
      submitBtn.disabled = false;
    }
  });
};

function updateDifficultyStars(diff) {
  document.querySelectorAll('#eq-difficulty-stars .admin-diff-star').forEach(btn => {
    const d = parseInt(btn.dataset.diff);
    if (d <= diff) {
      btn.style.background = 'var(--color-amber, #c4956a)';
      btn.style.color = '#fff';
      btn.style.borderColor = 'var(--color-amber, #c4956a)';
    } else {
      btn.style.background = 'var(--surface-secondary, #faf7f2)';
      btn.style.color = '';
      btn.style.borderColor = 'var(--border-light, #ece8e1)';
    }
  });
}

function renderEditTags() {
  const container = document.getElementById('eq-tags-container');
  if (!container) return;
  container.innerHTML = _editQuestionTags.map((tag, i) =>
    `<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:rgba(90,125,92,0.1);color:var(--color-sage,#5a7d5c);border-radius:8px;font-size:0.78rem;font-weight:500;">
      ${tag}
      <button type="button" onclick="removeEditTag(${i})" style="background:none;border:none;cursor:pointer;color:var(--color-error,#c0553a);font-size:0.85rem;padding:0 2px;">&times;</button>
    </span>`
  ).join('');
}

window.addEditTag = function() {
  const input = document.getElementById('eq-tag-input');
  const tag = input.value.trim();
  if (tag && !_editQuestionTags.includes(tag)) {
    _editQuestionTags.push(tag);
    renderEditTags();
  }
  input.value = '';
  input.focus();
};

window.removeEditTag = function(index) {
  _editQuestionTags.splice(index, 1);
  renderEditTags();
};

window.closeQuestionModal = function() {
  const modal = document.getElementById('admin-question-modal');
  if (modal) modal.style.display = 'none';
};

window.handleQuestionImageUpload = function(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (file.size > ADMIN_IMAGE_MAX_BYTES) {
    showAdminToast('图片大小不能超过 2MB', 'error');
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    document.getElementById('eq-image').value = base64;
    const preview = document.getElementById('eq-image-preview');
    const previewImg = document.getElementById('eq-image-preview-img');
    previewImg.src = base64;
    preview.style.display = '';
  };
  reader.readAsDataURL(file);
};

window.adminGoQuestionPage = async function(page) {
  if (page < 1) return;
  _adminQuestionPage = page;
  const data = await getQuestions({ search: _adminQuestionSearch, module: _adminQuestionModule, page: _adminQuestionPage });
  const container = document.getElementById('admin-tab-content');
  if (data && container) renderQuestionsTab(container, data);
};

/* ===== 卡片全局操作 ===== */
window.openCardModal = function(cardData) {
  const modal = document.getElementById('admin-card-modal');
  if (!modal) return;

  document.getElementById('admin-card-modal-title').textContent = cardData ? '编辑卡片' : '添加卡片';
  document.getElementById('card-edit-id').value = cardData ? (cardData.id || '') : '';
  document.getElementById('card-category').value = cardData ? (cardData.category || '') : '';
  document.getElementById('card-new-category').value = '';
  document.getElementById('new-category-group').style.display = 'none';
  document.getElementById('card-title').value = cardData ? (cardData.title || '') : '';
  document.getElementById('card-question').value = cardData ? (cardData.question || '') : '';
  document.getElementById('card-answer').value = cardData ? (cardData.answer || '') : '';
  document.getElementById('card-submit-btn').textContent = '保存卡片';
  document.getElementById('card-submit-btn').disabled = false;
  modal.style.display = 'flex';
};

window.closeCardModal = function() {
  const modal = document.getElementById('admin-card-modal');
  if (modal) modal.style.display = 'none';
};

window.handleEditCard = function(cardData) {
  openCardModal(cardData);
};

window.handleDeleteCard = async function(id) {
  if (confirm(`确定要删除该知识卡片吗？（ID: ${id.slice(0, 12)}...）此操作不可恢复。`)) {
    const success = await deleteCard(id);
    if (success) {
      showAdminToast('卡片已删除', 'success');
      const data = await getCards({ search: _adminCardSearch, category: _adminCardCategory, page: _adminCardPage });
      const container = document.getElementById('admin-tab-content');
      if (data && container) renderCardsTab(container, data);
    } else {
      showAdminToast('删除失败，请重试', 'error');
    }
  }
};

window.adminGoCardPage = async function(page) {
  if (page < 1) return;
  _adminCardPage = page;
  const data = await getCards({ search: _adminCardSearch, category: _adminCardCategory, page: _adminCardPage });
  const container = document.getElementById('admin-tab-content');
  if (data && container) renderCardsTab(container, data);
};

/* ===== 社区管理全局操作 ===== */
window.handleDeleteCommunityPost = async function(id) {
  if (confirm('确定要删除该帖子吗？')) {
    const success = await deleteCommunityPost(id);
    if (success) {
      showAdminToast('帖子已删除', 'success');
      const container = document.getElementById('admin-tab-content');
      if (container) await renderCommunityTab(container);
    } else {
      showAdminToast('删除失败，请重试', 'error');
    }
  }
};

// 驳回指定帖子的所有举报（保留帖子，仅清除举报记录）
window.handleDismissReport = async function(postId) {
  if (!postId) return;
  if (!confirm('确定驳回此帖子的所有举报？举报记录将被清除，帖子保留。')) return;
  const ok = await dismissReportsByPostId(postId);
  if (ok) {
    showAdminToast('已驳回该帖子的所有举报', 'success');
    const container = document.getElementById('admin-tab-content');
    if (container) await renderCommunityTab(container);
  } else {
    showAdminToast('驳回失败，请重试', 'error');
  }
};

// 删除被举报的帖子（帖子删除后举报记录由 ON DELETE CASCADE 自动清除）
window.handleDeleteReportedPost = async function(postId) {
  if (!postId) return;
  if (!confirm('确定删除此被举报的帖子？此操作不可恢复。')) return;
  const success = await deleteCommunityPost(postId);
  if (success) {
    showAdminToast('帖子已删除', 'success');
    const container = document.getElementById('admin-tab-content');
    if (container) await renderCommunityTab(container);
  } else {
    showAdminToast('删除失败，请重试', 'error');
  }
};

// 查看帖子详情
window.handleViewPostDetail = async function(postId) {
  // 从当前渲染的表格行获取帖子数据
  var row = document.querySelector('tr[data-post-id="' + postId + '"]');
  var posts = window._adminCurrentPosts || [];
  var post = posts.filter(function(p) { return p.id === postId; })[0];
  if (!post) {
    showAdminToast('未找到帖子数据', 'error');
    return;
  }

  var tags = Array.isArray(post.tags) ? post.tags : [];
  var isPinned = post.pinned || post.is_pinned || false;
  var isDeleted = post.is_deleted || false;

  // 加载评论
  var comments = await getCommunityPostComments(postId);
  var commentsHtml = '';
  if (comments && comments.length > 0) {
    commentsHtml = comments.map(function(c) {
      return '<div style="padding:10px 12px;border-bottom:1px solid var(--border-light,#ece8e1);">' +
        '<div style="font-size:0.8rem;color:var(--text-primary,#1a2f1d);word-break:break-all;margin-bottom:4px;" id="comment-content-' + c.id + '">' + (window.renderMarkdown ? window.renderMarkdown(c.content || '') : escapeHtml(c.content || '')) + '</div>' +
        '<div style="font-size:0.7rem;color:var(--text-muted,#8a8a8a);margin-bottom:6px;">' + escapeHtml(c.author_id || '') + ' · ' + (c.created_at ? new Date(c.created_at).toLocaleString('zh-CN') : '') + '</div>' +
        '<div style="display:flex;gap:6px;">' +
          '<button class="admin-btn admin-btn--ghost" style="padding:3px 10px;font-size:0.72rem;" onclick="handleEditComment(\'' + c.id + '\',\'' + postId + '\')">编辑</button>' +
          '<button class="admin-btn admin-btn--danger" style="padding:3px 10px;font-size:0.72rem;" onclick="handleDeleteComment(\'' + c.id + '\',\'' + postId + '\')">删除</button>' +
        '</div>' +
      '</div>';
    }).join('');
  } else {
    commentsHtml = '<div style="color:var(--text-muted,#8a8a8a);padding:20px;text-align:center;">暂无评论</div>';
  }

  var modalHtml = `
    <div class="admin-modal-overlay" id="admin-post-detail-modal" style="display:flex;">
      <div class="admin-modal" style="max-width:680px;max-height:85vh;overflow-y:auto;">
        <div class="admin-modal-header">
          <h3 class="admin-modal-title">帖子详情</h3>
          <button class="admin-modal-close" onclick="closePostDetailModal()">×</button>
        </div>
        <div class="admin-modal-body" style="padding:20px;">
          <div style="margin-bottom:16px;">
            <div style="font-size:0.75rem;color:var(--text-muted,#8a8a8a);margin-bottom:4px;">作者ID：${escapeHtml(post.author_id || '')}</div>
            <div style="font-size:0.75rem;color:var(--text-muted,#8a8a8a);margin-bottom:4px;">时间：${post.created_at ? new Date(post.created_at).toLocaleString('zh-CN') : ''}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
              ${tags.map(function(t) { return '<span class="admin-q-tag admin-q-tag--module">' + escapeHtml(t) + '</span>'; }).join('')}
              ${isPinned ? '<span class="admin-q-tag" style="background:rgba(196,149,106,0.12);color:var(--color-amber,#c4956a);">置顶</span>' : ''}
              ${isDeleted ? '<span class="admin-q-tag" style="background:rgba(192,85,58,0.12);color:var(--color-error,#c0553a);">已删除</span>' : ''}
            </div>
            <div style="font-size:0.75rem;color:var(--text-muted,#8a8a8a);margin-bottom:12px;">点赞 ${post.like_count || 0} · 评论 ${post.comment_count || 0}</div>
          </div>
          <div style="background:var(--surface-secondary,#faf7f2);border-radius:10px;padding:16px;margin-bottom:20px;">
            <div style="font-size:0.82rem;font-weight:600;color:var(--color-deep,#1a3a2a);margin-bottom:8px;">帖子内容</div>
            <div style="font-size:0.85rem;line-height:1.7;color:var(--text-primary,#1a2f1d);word-break:break-word;">
              ${(window.renderMarkdown ? window.renderMarkdown(post.content || '') : escapeHtml(post.content || ''))}
            </div>
          </div>
          <div>
            <div style="font-size:0.82rem;font-weight:600;color:var(--color-deep,#1a3a2a);margin-bottom:10px;">评论列表（可编辑/删除）</div>
            ${commentsHtml}
          </div>
        </div>
      </div>
    </div>
  `;

  var old = document.getElementById('admin-post-detail-modal');
  if (old) old.remove();
  var div = document.createElement('div');
  div.innerHTML = modalHtml;
  document.body.appendChild(div.firstElementChild);
};

window.closePostDetailModal = function() {
  var modal = document.getElementById('admin-post-detail-modal');
  if (modal) modal.remove();
};

// 编辑评论内容
window.handleEditComment = async function(commentId, postId) {
  var contentEl = document.getElementById('comment-content-' + commentId);
  if (!contentEl) return;
  var oldContent = contentEl.textContent || '';

  var overlay = document.createElement('div');
  overlay.className = 'admin-modal-overlay';
  overlay.style.display = 'flex';
  overlay.style.zIndex = '10050';
  overlay.innerHTML =
    '<div class="admin-modal" style="max-width:460px;">' +
      '<div class="admin-modal-header"><h3 class="admin-modal-title">编辑评论</h3><button class="admin-modal-close" onclick="this.closest(\'.admin-modal-overlay\').remove()">×</button></div>' +
      '<div class="admin-modal-body" style="padding:20px;">' +
        '<textarea id="edit-comment-textarea" style="width:100%;box-sizing:border-box;min-height:100px;padding:10px 14px;border:1px solid var(--border-light,#e3e0d8);border-radius:10px;font-size:0.88rem;outline:none;background:var(--surface-primary,#fff);color:var(--text-primary,#1a2f1d);resize:vertical;" placeholder="评论内容">' + escapeHtml(oldContent) + '</textarea>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">' +
          '<button class="admin-btn admin-btn--ghost" onclick="this.closest(\'.admin-modal-overlay\').remove()">取消</button>' +
          '<button class="admin-btn admin-btn--primary" id="edit-comment-save">保存</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  var ta = overlay.querySelector('#edit-comment-textarea');
  setTimeout(function() { ta.focus(); ta.select(); }, 30);

  overlay.querySelector('#edit-comment-save').addEventListener('click', async function() {
    var newContent = ta.value.trim();
    if (!newContent) { showAdminToast('评论内容不能为空', 'error'); return; }
    if (newContent === oldContent) { overlay.remove(); return; }

    // 通过 Supabase 直接更新评论内容
    var sb = (typeof window.getSupabase === 'function') ? window.getSupabase() : null;
    if (!sb) { showAdminToast('数据服务不可用', 'error'); return; }

    try {
      var { data, error } = await sb.from('community_comments')
        .update({ content: newContent, updated_at: new Date().toISOString() })
        .eq('id', commentId);
      if (error) throw error;
      showAdminToast('评论已更新', 'success');
      overlay.remove();
      // 刷新详情弹窗中的评论
      window.handleViewPostDetail(postId);
    } catch(e) {
      showAdminToast('更新失败：' + (e.message || e), 'error');
    }
  });
};

window.handleTogglePin = async function(id) {
  const result = await toggleCommunityPostPin(id);
  if (result) {
    showAdminToast('操作成功', 'success');
    const container = document.getElementById('admin-tab-content');
    if (container) await renderCommunityTab(container);
  } else {
    showAdminToast('操作失败，请重试', 'error');
  }
};

window.openPostStatModal = function(postId, field, currentValue) {
  var fieldLabel = field === 'like_count' ? '点赞数' : '评论数';
  var modal = document.getElementById('admin-post-stat-modal');
  var title = document.getElementById('admin-post-stat-title');
  var label = document.getElementById('admin-post-stat-label');
  var valueInput = document.getElementById('admin-post-stat-value');
  var postIdInput = document.getElementById('admin-post-stat-post-id');
  var fieldInput = document.getElementById('admin-post-stat-field');
  var submitBtn = document.getElementById('admin-post-stat-submit');
  if (!modal) return;
  if (title) title.textContent = '修改' + fieldLabel;
  if (label) label.textContent = fieldLabel + '（当前: ' + currentValue + '）';
  if (valueInput) {
    valueInput.value = currentValue;
    valueInput.focus();
  }
  if (postIdInput) postIdInput.value = postId;
  if (fieldInput) fieldInput.value = field;
  if (submitBtn) {
    submitBtn.textContent = '保存';
    submitBtn.disabled = false;
  }
  modal.style.display = 'flex';
};

window.closePostStatModal = function() {
  var modal = document.getElementById('admin-post-stat-modal');
  if (modal) modal.style.display = 'none';
};

window.handleEditPostStat = async function(postId, field, currentValue) {
  window.openPostStatModal(postId, field, currentValue);
};

window.handleManagePostComments = async function(postId) {
  var comments = await getCommunityPostComments(postId);
  if (!comments) {
    showAdminToast('无法加载评论列表', 'error');
    return;
  }

  var commentListHtml = comments.length === 0
    ? '<div style="color:var(--text-muted,#8a8a8a);padding:12px;text-align:center;">暂无评论</div>'
    : comments.map(function(c) {
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid var(--border-light,#ece8e1);gap:10px;">' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:0.8rem;color:var(--text-secondary,#4a4a4a);word-break:break-all;">' + (c.content || '').substring(0, 200) + '</div>' +
            '<div style="font-size:0.7rem;color:var(--text-muted,#8a8a8a);margin-top:4px;">' + (c.author_id || '') + ' · ' + (c.created_at ? new Date(c.created_at).toLocaleString('zh-CN') : '') + '</div>' +
          '</div>' +
          '<button class="admin-btn admin-btn--danger" style="padding:4px 10px;font-size:0.75rem;white-space:nowrap;flex-shrink:0;" onclick="handleDeleteComment(\'' + c.id + '\',\'' + postId + '\')">' + ICONS.trash + ' 删除</button>' +
        '</div>';
      }).join('');

  var modalHtml = `
    <div class="admin-modal-overlay" id="admin-comments-modal" style="display:flex;">
      <div class="admin-modal" style="max-width:560px;">
        <div class="admin-modal-header">
          <div class="admin-modal-title">帖子评论管理</div>
          <button class="admin-modal-close" onclick="closeCommentsModal()">&times;</button>
        </div>
        <div style="max-height:400px;overflow-y:auto;border:1px solid var(--border-light,#ece8e1);border-radius:10px;">
          ${commentListHtml}
        </div>
        <div style="margin-top:16px;font-size:0.78rem;color:var(--text-muted,#8a8a8a);">共 ${comments.length} 条评论</div>
      </div>
    </div>
  `;

  // Remove existing modal if any
  var existing = document.getElementById('admin-comments-modal');
  if (existing) existing.remove();

  var tempDiv = document.createElement('div');
  tempDiv.innerHTML = modalHtml;
  document.body.appendChild(tempDiv.firstElementChild);
};

window.handleDeleteComment = async function(commentId, postId) {
  if (!confirm('确定要删除该评论吗？')) return;
  var success = await deleteCommunityComment(commentId);
  if (success) {
    showAdminToast('评论已删除', 'success');
    // 更新评论数
    var comments = await getCommunityPostComments(postId);
    if (comments !== null) {
      await updateCommunityPost(postId, { comment_count: comments.length });
    }
    // 关闭并重新打开评论管理弹窗
    closeCommentsModal();
    await handleManagePostComments(postId);
  } else {
    showAdminToast('删除评论失败，请重试', 'error');
  }
};

window.closeCommentsModal = function() {
  var modal = document.getElementById('admin-comments-modal');
  if (modal) modal.remove();
};

window.handleUnmuteUser = async function(userId) {
  if (confirm(`确定要解除用户 "${userId}" 的禁言吗？`)) {
    const success = await unmuteCommunityUser(userId);
    if (success) {
      showAdminToast('已解除禁言', 'success');
      const container = document.getElementById('admin-tab-content');
      if (container) await renderCommunityTab(container);
    } else {
      showAdminToast('操作失败，请重试', 'error');
    }
  }
};

window.openMuteModal = function() {
  const modal = document.getElementById('admin-mute-modal');
  if (!modal) return;
  document.getElementById('mute-user-id').value = '';
  document.getElementById('mute-reason').value = '';
  document.getElementById('mute-duration').value = '24';
  document.getElementById('mute-submit-btn').textContent = '确认禁言';
  document.getElementById('mute-submit-btn').disabled = false;
  modal.style.display = 'flex';
};

window.closeMuteModal = function() {
  const modal = document.getElementById('admin-mute-modal');
  if (modal) modal.style.display = 'none';
};

window.adminGoCommunityPostPage = async function(page) {
  if (page < 1) return;
  _adminCommunityPostPage = page;
  const container = document.getElementById('admin-tab-content');
  if (container) await renderCommunityTab(container);
};

/* ===== 电子书管理标签 ===== */
async function renderEbookTab(container) {
  const PARTS = [
    { id: 'part1', name: '第1篇 细胞', chapters: 5, sections: 13 },
    { id: 'part2', name: '第2篇 动物的形态与功能', chapters: 11, sections: 23 },
    { id: 'part3', name: '第3篇 植物的形态与功能', chapters: 3, sections: 7 },
    { id: 'part4', name: '第4篇 遗传与变异', chapters: 4, sections: 9 },
    { id: 'part5', name: '第5篇 生物进化', chapters: 3, sections: 6 },
    { id: 'part6', name: '第6篇 生态学', chapters: 4, sections: 8 }
  ];

  const totalChapters = PARTS.reduce((s, p) => s + p.chapters, 0);
  const totalSections = PARTS.reduce((s, p) => s + p.sections, 0);

  // Load any saved edits
  let savedEdits = {};
  try {
    const raw = localStorage.getItem('bioquest_ebook_edits');
    if (raw) savedEdits = JSON.parse(raw);
  } catch(e) {}

  let html = `
    <div class="admin-stats-row">
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--green">${ICONS.ebook}</div>
        <div>
          <div class="admin-stat-num">${totalChapters}</div>
          <div class="admin-stat-label">章节数</div>
        </div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--amber">${ICONS.layers}</div>
        <div>
          <div class="admin-stat-num">${totalSections}</div>
          <div class="admin-stat-label">小节数</div>
        </div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--blue">${ICONS.book}</div>
        <div>
          <div class="admin-stat-num">6</div>
          <div class="admin-stat-label">篇</div>
        </div>
      </div>
    </div>

    <div class="admin-section">
      <div class="admin-section-header">
        <div class="admin-section-title">
          ${ICONS.ebook}
          笔记结构 — 陈阅增《普通生物学》第4版
        </div>
        <div style="display:flex;gap:8px;">
          <a href="ebook.html" target="_blank" class="admin-btn admin-btn--primary" style="text-decoration:none;">
            预览电子书
          </a>
        </div>
      </div>

      <div class="admin-table-wrap" style="margin-bottom:24px;">
        <table class="admin-table">
          <thead>
            <tr>
              <th>篇</th>
              <th>章节数</th>
              <th>小节数</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            ${PARTS.map(p => `
              <tr>
                <td class="admin-table-name">${p.name}</td>
                <td>${p.chapters}</td>
                <td>${p.sections}</td>
                <td><span class="admin-q-tag admin-q-tag--module">已发布</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="admin-section">
      <div class="admin-section-header">
        <div class="admin-section-title">
          ${ICONS.settings}
          内容编辑
        </div>
        <span class="admin-section-badge">本地编辑</span>
      </div>

      <div style="background:var(--surface-secondary,#faf7f2);border-radius:12px;padding:16px;margin-bottom:20px;font-size:0.85rem;color:var(--text-secondary,#4a4a4a);line-height:1.6;">
        编辑内容保存在浏览器本地存储中。如需永久修改，请编辑 <code style="background:rgba(90,125,92,0.1);padding:2px 6px;border-radius:4px;font-family:var(--font-mono);">js/ebook.js</code> 中的 BOOK_DATA。
      </div>

      <form id="admin-ebook-edit-form" class="admin-form-grid">
        <div class="admin-form-group">
          <label class="admin-form-label">选择篇</label>
          <select class="admin-form-select" id="ebook-part-select">
            ${PARTS.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">选择章</label>
          <select class="admin-form-select" id="ebook-chapter-select">
            <option>请先选择篇</option>
          </select>
        </div>
        <div class="admin-form-group full">
          <label class="admin-form-label">选择小节</label>
          <select class="admin-form-select" id="ebook-section-select">
            <option>请先选择章</option>
          </select>
        </div>
        <div class="admin-form-group full">
          <label class="admin-form-label">内容</label>
          <textarea class="admin-form-textarea" id="ebook-content-edit" style="min-height:200px;font-size:0.88rem;line-height:1.8;" placeholder="选择小节后，内容将显示在此处..."></textarea>
        </div>
        <div class="admin-form-group full">
          <button type="submit" class="admin-form-submit" id="ebook-save-btn">保存修改</button>
        </div>
      </form>

      <div style="margin-top:16px;">
        <h4 style="font-size:0.92rem;font-weight:600;margin-bottom:8px;color:var(--color-deep,#1a3a2a);">已保存的编辑</h4>
        <div id="ebook-saved-edits" style="font-size:0.85rem;color:var(--text-secondary,#4a4a4a);">
          ${Object.keys(savedEdits).length === 0 ? '<span style="color:var(--text-muted,#8a8a8a);">暂无本地编辑</span>' :
            Object.keys(savedEdits).map(key => `<div style="padding:6px 0;border-bottom:1px solid var(--border-light,#ece8e1);display:flex;justify-content:space-between;align-items:center;"><span>${key}</span><button class="admin-btn admin-btn--danger" style="padding:4px 10px;font-size:0.75rem;" onclick="deleteEbookEdit('${key}')">删除</button></div>`).join('')}
        </div>
      </div>
    </div>

    <div class="admin-section">
      <div class="admin-section-header">
        <div class="admin-section-title">
          ${ICONS.ebook}
          PDF管理
        </div>
        <span class="admin-section-badge">Supabase Storage</span>
      </div>

      <div style="background:var(--surface-secondary,#faf7f2);border-radius:12px;padding:16px;margin-bottom:20px;font-size:0.85rem;color:var(--text-secondary,#4a4a4a);line-height:1.6;">
        <strong>使用说明：</strong><br>
        1. 需要在 Supabase 中创建名为 <code style="background:rgba(90,125,92,0.1);padding:2px 6px;border-radius:4px;font-family:var(--font-mono);">bioquest-ebooks</code> 的 Storage Bucket<br>
        2. Bucket 应设置为 <strong>私有（Private）</strong>，不要设为公开<br>
        3. PDF 文件大小建议不超过 <strong>50MB</strong>
      </div>

      <div style="background:var(--surface-secondary,#faf7f2);border-radius:12px;padding:16px;margin-bottom:20px;">
        <h4 style="font-size:0.92rem;font-weight:600;margin-bottom:12px;color:var(--color-deep,#1a3a2a);">添加新书</h4>
        <form id="admin-custom-ebook-form" class="admin-form-grid" style="gap:10px;">
          <div class="admin-form-group">
            <label class="admin-form-label">书名</label>
            <input type="text" class="admin-form-input" id="custom-ebook-title" placeholder="输入书名" required />
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">作者/版本</label>
            <input type="text" class="admin-form-input" id="custom-ebook-author" placeholder="如：第3版 / 张三" />
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">分类</label>
            <select class="admin-form-select" id="custom-ebook-category">
              <option value="生物竞赛教材">生物竞赛教材</option>
              <option value="遗传学">遗传学</option>
              <option value="生态学">生态学</option>
              <option value="生物化学">生物化学</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">PDF文件</label>
            <input type="file" accept="application/pdf" id="custom-ebook-file" required style="font-size:0.85rem;" />
          </div>
          <div class="admin-form-group full">
            <button type="submit" class="admin-form-submit" id="custom-ebook-submit-btn">上传新书</button>
          </div>
        </form>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>书名</th>
              <th>PDF状态</th>
              <th>上传</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody id="admin-pdf-tbody">
          </tbody>
        </table>
      </div>

      <div id="admin-custom-ebooks-section" style="margin-top:24px;">
        <h4 style="font-size:0.92rem;font-weight:600;margin-bottom:10px;color:var(--color-deep,#1a3a2a);">自定义上传的书籍</h4>
        <div id="admin-custom-ebooks-list"></div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Load BOOK_DATA from ebook.js for the cascading selects
  const partSelect = document.getElementById('ebook-part-select');
  const chapterSelect = document.getElementById('ebook-chapter-select');
  const sectionSelect = document.getElementById('ebook-section-select');
  const contentEdit = document.getElementById('ebook-content-edit');

  // 安全加载 ALL_BOOKS：优先读全局变量，无则动态加载脚本
  let bookData = null;
  try {
    if (typeof window.ALL_BOOKS !== 'undefined' && window.ALL_BOOKS) {
      // ebook.js 已加载，直接读取全局变量
      bookData = { parts: window.ALL_BOOKS };
    } else {
      // 动态加载 ebook.js 脚本，然后读取 window.ALL_BOOKS
      await new Promise(function(resolve, reject) {
        var script = document.createElement('script');
        script.src = 'js/ebook.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      if (typeof window.ALL_BOOKS !== 'undefined' && window.ALL_BOOKS) {
        bookData = { parts: window.ALL_BOOKS };
      }
    }
  } catch(e) {
    console.warn('[Admin] 无法加载笔记数据:', e);
  }

  function updateChapters() {
    const partId = partSelect.value;
    chapterSelect.innerHTML = '<option>请选择章</option>';
    sectionSelect.innerHTML = '<option>请先选择章</option>';
    contentEdit.value = '';

    if (!bookData || !bookData.parts) return;
    const part = bookData.parts.find(p => p.id === partId);
    if (!part || !part.chapters) return;

    part.chapters.forEach((ch, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = ch.title || ('第' + (i+1) + '章');
      chapterSelect.appendChild(opt);
    });
  }

  function updateSections() {
    const partId = partSelect.value;
    const chIdx = parseInt(chapterSelect.value);
    sectionSelect.innerHTML = '<option>请选择小节</option>';
    contentEdit.value = '';

    if (isNaN(chIdx) || !bookData || !bookData.parts) return;
    const part = bookData.parts.find(p => p.id === partId);
    if (!part || !part.chapters || !part.chapters[chIdx]) return;

    const ch = part.chapters[chIdx];
    if (!ch.sections) return;

    ch.sections.forEach((sec, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = sec.title || ('小节 ' + (i+1));
      sectionSelect.appendChild(opt);
    });
  }

  function loadSectionContent() {
    const partId = partSelect.value;
    const chIdx = parseInt(chapterSelect.value);
    const secIdx = parseInt(sectionSelect.value);

    if (isNaN(chIdx) || isNaN(secIdx) || !bookData || !bookData.parts) return;
    const part = bookData.parts.find(p => p.id === partId);
    if (!part || !part.chapters || !part.chapters[chIdx] || !part.chapters[chIdx].sections) return;
    const sec = part.chapters[chIdx].sections[secIdx];
    if (!sec) return;

    // Check for saved edit first
    const editKey = partId + '/ch' + chIdx + '/sec' + secIdx;
    if (savedEdits[editKey]) {
      contentEdit.value = savedEdits[editKey];
    } else {
      contentEdit.value = sec.content || '';
    }
  }

  partSelect.addEventListener('change', updateChapters);
  chapterSelect.addEventListener('change', updateSections);
  sectionSelect.addEventListener('change', loadSectionContent);

  // Initialize chapters if bookData loaded
  if (bookData) {
    updateChapters();
  }

  // Save edit
  document.getElementById('admin-ebook-edit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const partId = partSelect.value;
    const chIdx = chapterSelect.value;
    const secIdx = sectionSelect.value;

    if (!partId || chIdx === '请选择章' || secIdx === '请选择小节') {
      showAdminToast('请先选择篇、章、小节', 'error');
      return;
    }

    const editKey = partId + '/ch' + chIdx + '/sec' + secIdx;
    savedEdits[editKey] = contentEdit.value;
    localStorage.setItem('bioquest_ebook_edits', JSON.stringify(savedEdits));
    showAdminToast('内容已保存到本地存储', 'success');

    // Refresh saved edits display
    const editsDiv = document.getElementById('ebook-saved-edits');
    if (editsDiv) {
      editsDiv.innerHTML = Object.keys(savedEdits).map(key =>
        `<div style="padding:6px 0;border-bottom:1px solid var(--border-light,#ece8e1);display:flex;justify-content:space-between;align-items:center;"><span>${key}</span><button class="admin-btn admin-btn--danger" style="padding:4px 10px;font-size:0.75rem;" onclick="deleteEbookEdit('${key}')">删除</button></div>`
      ).join('');
    }
  });

  // ===== PDF管理 =====
  var PDF_BOOKS = [
    { name: '陈阅增普通生物学 (第4版)', key: 'chen_biology_4th' },
    { name: '陈祖洞遗传学', key: 'chen_genetics' },
    { name: '植物生理学', key: 'plant_physiology' },
    { name: '微生物学', key: 'microbiology' },
    { name: '王镜岩生物化学', key: 'wang_biochemistry' },
    { name: '动物生物学', key: 'animal_biology' }
  ];

  function getCustomEbooks() {
    try {
      var raw = localStorage.getItem('bioquest_custom_ebooks');
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return [];
  }

  function saveCustomEbooks(ebooks) {
    localStorage.setItem('bioquest_custom_ebooks', JSON.stringify(ebooks));
  }

  function getPdfStatus() {
    var status = {};
    try {
      var raw = localStorage.getItem('bioquest_ebook_pdf_status');
      if (raw) status = JSON.parse(raw);
    } catch(e) {}
    // Also check custom ebooks
    var customEbooks = getCustomEbooks();
    customEbooks.forEach(function(eb) {
      status[eb.id] = true;
    });
    return status;
  }

  function setPdfStatus(key, hasPdf) {
    var status = {};
    try {
      var raw = localStorage.getItem('bioquest_ebook_pdf_status');
      if (raw) status = JSON.parse(raw);
    } catch(e) {}
    status[key] = hasPdf;
    localStorage.setItem('bioquest_ebook_pdf_status', JSON.stringify(status));
  }

  function sanitizeBookName(name) {
    return name.replace(/[^a-zA-Z0-9\u4e00-\u9fff_()]/g, '_').replace(/_+/g, '_');
  }

  function renderPdfTable() {
    var status = getPdfStatus();
    var tbody = document.getElementById('admin-pdf-tbody');
    if (!tbody) return;

    var rows = PDF_BOOKS.map(function(book) {
      var hasPdf = !!status[book.key];
      // 注意：filePath 不应包含 bucket 名前缀，因为 .from('bioquest-ebooks') 已指定 bucket
      var filePath = sanitizeBookName(book.name) + '.pdf';
      return '<tr>' +
        '<td class="admin-table-name">' + book.name + '</td>' +
        '<td>' + (hasPdf
          ? '<span class="admin-q-tag admin-q-tag--module">已上传</span>'
          : '<span class="admin-q-tag admin-q-tag--difficulty">未上传</span>') +
        '</td>' +
        '<td>' +
          '<label class="admin-btn admin-btn--primary" style="padding:4px 12px;font-size:0.78rem;cursor:pointer;margin:0;">' +
            '选择PDF' +
            '<input type="file" accept="application/pdf" style="display:none;" data-book-key="' + book.key + '" data-book-name="' + book.name + '" data-file-path="' + filePath + '" class="admin-pdf-file-input" />' +
          '</label>' +
        '</td>' +
        '<td>' +
          (hasPdf
            ? '<button class="admin-btn admin-btn--danger admin-pdf-delete-btn" style="padding:4px 12px;font-size:0.78rem;" data-book-key="' + book.key + '" data-file-path="' + filePath + '" onclick="adminDeletePdf(\'' + book.key + '\',\'' + filePath + '\')">删除</button>'
            : '<span style="color:var(--text-muted,#8a8a8a);font-size:0.8rem;">—</span>') +
        '</td>' +
      '</tr>';
    });

    // Add custom books to the table
    var customEbooks = getCustomEbooks();
    customEbooks.forEach(function(eb) {
      var hasPdf = !!status[eb.id];
      rows.push('<tr style="background:rgba(90,125,92,0.04);">' +
        '<td class="admin-table-name">' + eb.title + (eb.author ? ' <span style="color:var(--text-muted,#8a8a8a);font-size:0.78rem;">(' + eb.author + ')</span>' : '') + ' <span class="admin-q-tag admin-q-tag--module" style="font-size:0.7rem;">' + eb.category + '</span></td>' +
        '<td>' + (hasPdf
          ? '<span class="admin-q-tag admin-q-tag--module">已上传</span>'
          : '<span class="admin-q-tag admin-q-tag--difficulty">未上传</span>') +
        '</td>' +
        '<td>' +
          '<label class="admin-btn admin-btn--primary" style="padding:4px 12px;font-size:0.78rem;cursor:pointer;margin:0;">' +
            '选择PDF' +
            '<input type="file" accept="application/pdf" style="display:none;" data-book-key="' + eb.id + '" data-book-name="' + eb.title + '" data-file-path="' + eb.filePath + '" data-custom-id="' + eb.id + '" class="admin-pdf-file-input" />' +
          '</label>' +
        '</td>' +
        '<td>' +
          '<button class="admin-btn admin-btn--danger" style="padding:4px 12px;font-size:0.78rem;" onclick="adminDeletePdf(\'' + eb.id + '\',\'' + eb.filePath + '\',true)">删除</button>' +
        '</td>' +
      '</tr>');
    });

    tbody.innerHTML = rows.join('');

    // Bind file input change events
    var fileInputs = tbody.querySelectorAll('.admin-pdf-file-input');
    fileInputs.forEach(function(input) {
      input.addEventListener('change', async function(e) {
        var file = e.target.files[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
          showAdminToast('请选择 PDF 文件', 'error');
          return;
        }
        if (file.size > ADMIN_EBOOK_MAX_BYTES) {
          showAdminToast('文件大小超过 50MB 限制', 'error');
          return;
        }

        var bookKey = this.getAttribute('data-book-key');
        var filePath = this.getAttribute('data-file-path');
        var bookName = this.getAttribute('data-book-name');

        var sb = (typeof window.getSupabase === 'function') ? window.getSupabase() : null;
        if (!sb) {
          showAdminToast('Supabase 未连接', 'error');
          return;
        }

        try {
          showAdminToast('正在上传 ' + bookName + '...', 'info');
          // 通过 server.py 代理上传（使用 service role key 绕过 RLS）
          const fileB64 = await _ocrReadFileAsBase64(file);

          // 大文件上传带超时和重试，避免 ERR_CONNECTION_RESET
          const MAX_RETRY = 3;
          let success = false;
          for (let attempt = 0; attempt < MAX_RETRY && !success; attempt++) {
            try {
              const ctrl = new AbortController();
              const timeoutId = setTimeout(() => ctrl.abort(), ADMIN_EBOOK_UPLOAD_TIMEOUT_MS); // 5 分钟超时
              const res = await fetch('/admin/ebook-upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Admin-Key': _adminSecretKey || '' },
                body: JSON.stringify({ file_path: filePath, file_b64: fileB64, content_type: 'application/pdf' }),
                signal: ctrl.signal,
                keepalive: true
              });
              clearTimeout(timeoutId);
              const data = await res.json().catch(() => ({ error: '响应解析失败' }));
              if (!res.ok || !data.ok) {
                var errMsg = data.error || ('HTTP ' + res.status);
                if (errMsg.indexOf('Bucket not found') >= 0 || errMsg.indexOf('bucket') >= 0) {
                  errMsg = 'Storage bucket "bioquest-ebooks" 不存在，请在 Supabase Dashboard → Storage 中创建';
                }
                if (attempt >= MAX_RETRY - 1) {
                  showAdminToast('上传失败: ' + errMsg, 'error');
                  return;
                }
                throw new Error(errMsg);
              }
              success = true;
            } catch (chunkErr) {
              if (attempt >= MAX_RETRY - 1) {
                showAdminToast('上传失败: ' + (chunkErr.message || '网络错误'), 'error');
                return;
              }
              showAdminToast('重试上传 (' + (attempt + 1) + '/3)...', 'info');
              await new Promise(r => setTimeout(r, ADMIN_EBOOK_RETRY_BASE_DELAY_MS * (attempt + 1)));
            }
          }

          setPdfStatus(bookKey, true);
          showAdminToast(bookName + ' PDF 上传成功', 'success');
          renderPdfTable();
        } catch(err) {
          console.error('[PDF Upload] Exception:', err);
          showAdminToast('上传出错: ' + (err.message || String(err)), 'error');
        }
      });
    });
  }

  function renderCustomEbooksList() {
    var listEl = document.getElementById('admin-custom-ebooks-list');
    if (!listEl) return;

    var customEbooks = getCustomEbooks();
    if (customEbooks.length === 0) {
      listEl.innerHTML = '<span style="color:var(--text-muted,#8a8a8a);font-size:0.85rem;">暂无自定义上传的书籍</span>';
      return;
    }

    listEl.innerHTML = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
      '<th>书名</th><th>作者/版本</th><th>分类</th><th>上传日期</th><th>操作</th>' +
      '</tr></thead><tbody>' +
      customEbooks.map(function(eb) {
        return '<tr>' +
          '<td class="admin-table-name">' + eb.title + '</td>' +
          '<td>' + (eb.author || '—') + '</td>' +
          '<td><span class="admin-q-tag admin-q-tag--module">' + eb.category + '</span></td>' +
          '<td style="font-size:0.82rem;">' + (eb.uploadDate ? new Date(eb.uploadDate).toLocaleDateString('zh-CN') : '—') + '</td>' +
          '<td>' +
            '<button class="admin-btn admin-btn--danger" style="padding:4px 12px;font-size:0.78rem;" onclick="adminDeletePdf(\'' + eb.id + '\',\'' + eb.filePath + '\',true)">删除</button>' +
          '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  // Bind custom ebook form
  var customForm = document.getElementById('admin-custom-ebook-form');
  if (customForm) {
    customForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      var title = document.getElementById('custom-ebook-title').value.trim();
      var author = document.getElementById('custom-ebook-author').value.trim();
      var category = document.getElementById('custom-ebook-category').value;
      var fileInput = document.getElementById('custom-ebook-file');
      var file = fileInput.files[0];

      if (!title) {
        showAdminToast('请输入书名', 'error');
        return;
      }
      if (!file) {
        showAdminToast('请选择 PDF 文件', 'error');
        return;
      }
      if (file.type !== 'application/pdf') {
        showAdminToast('请选择 PDF 文件', 'error');
        return;
      }
      if (file.size > ADMIN_EBOOK_MAX_BYTES) {
        showAdminToast('文件大小超过 50MB 限制', 'error');
        return;
      }

      var sb = (typeof window.getSupabase === 'function') ? window.getSupabase() : null;
      if (!sb) {
        showAdminToast('Supabase 未连接', 'error');
        return;
      }

      var timestamp = Date.now();
      var sanitized = sanitizeBookName(title);
      var filePath = 'custom/' + timestamp + '_' + sanitized + '.pdf';
      var bookId = 'custom-' + timestamp;

      try {
        showAdminToast('正在上传 ' + title + '...', 'info');
        // 通过 server.py 代理上传（使用 service role key 绕过 RLS）
        const fileB64 = await _ocrReadFileAsBase64(file);

        // 大文件上传带超时和重试
        const MAX_RETRY = 3;
        let success = false;
        for (let attempt = 0; attempt < MAX_RETRY && !success; attempt++) {
          try {
            const ctrl = new AbortController();
            const timeoutId = setTimeout(() => ctrl.abort(), ADMIN_EBOOK_UPLOAD_TIMEOUT_MS);
            const result = await fetch('/admin/ebook-upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Admin-Key': _adminSecretKey || '' },
              body: JSON.stringify({ file_path: filePath, file_b64: fileB64, content_type: 'application/pdf' }),
              signal: ctrl.signal,
              keepalive: true
            });
            clearTimeout(timeoutId);
            const uploadData = await result.json().catch(() => ({ error: '响应解析失败' }));
            if (!result.ok || !uploadData.ok) {
              if (attempt >= MAX_RETRY - 1) {
                showAdminToast('上传失败: ' + (uploadData.error || '未知错误'), 'error');
                return;
              }
              throw new Error(uploadData.error || ('HTTP ' + result.status));
            }
            success = true;
          } catch (e) {
            if (attempt >= MAX_RETRY - 1) {
              showAdminToast('上传失败: ' + (e.message || '网络错误'), 'error');
              return;
            }
            showAdminToast('重试上传 (' + (attempt + 1) + '/3)...', 'info');
            await new Promise(r => setTimeout(r, ADMIN_EBOOK_RETRY_BASE_DELAY_MS * (attempt + 1)));
          }
        }

        // Save to localStorage
        var customEbooks = getCustomEbooks();
        customEbooks.push({
          id: bookId,
          title: title,
          author: author,
          category: category,
          filePath: filePath,
          uploadDate: new Date().toISOString()
        });
        saveCustomEbooks(customEbooks);

        // Try to insert into Supabase table
        try {
          var { data: userData } = await sb.auth.getUser();
          var uploadedBy = userData && userData.user ? userData.user.id : null;
          await sb.from('ebook_pdfs').insert([{
            id: bookId,
            title: title,
            author: author,
            category: category,
            file_path: filePath,
            uploaded_by: uploadedBy,
            created_at: new Date().toISOString()
          }]);
        } catch(tableErr) {
          // Table might not exist, just use localStorage
          console.warn('Could not insert into ebook_pdfs table:', tableErr.message);
        }

        setPdfStatus(bookId, true);
        showAdminToast(title + ' 上传成功', 'success');

        // Reset form
        customForm.reset();
        renderPdfTable();
        renderCustomEbooksList();
      } catch(err) {
        showAdminToast('上传出错: ' + err.message, 'error');
      }
    });
  }

  renderPdfTable();
  renderCustomEbooksList();
}

window.adminDeletePdf = async function(bookKey, filePath, isCustom) {
  try {
    // 通过 server.py 代理删除（使用 service role key 绕过 RLS）
    const res = await fetch('/admin/ebook-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': _adminSecretKey || ''
      },
      body: JSON.stringify({ file_path: filePath })
    });
    const data = await res.json().catch(() => ({ error: '响应解析失败' }));
    if (!res.ok || !data.ok) {
      showAdminToast('删除失败: ' + (data.error || '未知错误'), 'error');
      return;
    }

    var status = {};
    try {
      var raw = localStorage.getItem('bioquest_ebook_pdf_status');
      if (raw) status = JSON.parse(raw);
    } catch(e) {}
    status[bookKey] = false;
    localStorage.setItem('bioquest_ebook_pdf_status', JSON.stringify(status));

    // If custom book, also remove from custom ebooks list
    if (isCustom) {
      var customEbooks = [];
      try {
        var rawEbooks = localStorage.getItem('bioquest_custom_ebooks');
        if (rawEbooks) customEbooks = JSON.parse(rawEbooks);
      } catch(e) {}
      customEbooks = customEbooks.filter(function(eb) { return eb.id !== bookKey; });
      localStorage.setItem('bioquest_custom_ebooks', JSON.stringify(customEbooks));
    }

    showAdminToast('PDF 已删除', 'success');

    // Refresh the tab
    var container = document.getElementById('admin-tab-content');
    if (container) renderEbookTab(container);
  } catch(err) {
    showAdminToast('删除出错: ' + err.message, 'error');
  }
};

window.deleteEbookEdit = function(key) {
  let savedEdits = {};
  try {
    const raw = localStorage.getItem('bioquest_ebook_edits');
    if (raw) savedEdits = JSON.parse(raw);
  } catch(e) {}
  delete savedEdits[key];
  localStorage.setItem('bioquest_ebook_edits', JSON.stringify(savedEdits));
  showAdminToast('编辑已删除', 'success');
  // Refresh the tab
  const container = document.getElementById('admin-tab-content');
  if (container) renderEbookTab(container);
};

/* ===== 反馈管理标签 ===== */
async function renderFeedbacksTab(container) {
  container.innerHTML = `<div class="admin-loading"><div class="admin-spinner"></div><div class="admin-loading-text">加载反馈中...</div></div>`;

  var feedbacks = [];
  var sourceLabel = '';

  // 优先从 Supabase feedbacks 表加载
  try {
    var fbData = await getFeedbacks();
    if (fbData && fbData.feedbacks && fbData.feedbacks.length > 0) {
      feedbacks = fbData.feedbacks;
      sourceLabel = '（来自 Supabase）';
    } else if (fbData && fbData._missing_table) {
      sourceLabel = '（feedbacks 表未创建，从本地加载）';
    }
  } catch (e) {
    console.warn('[Admin] 从 Supabase 加载反馈失败:', e);
  }

  // Fallback: 从 localStorage 加载
  if (feedbacks.length === 0) {
    try {
      var raw = localStorage.getItem('bioquest_feedbacks');
      if (raw) {
        var localData = JSON.parse(raw);
        if (Array.isArray(localData)) feedbacks = localData;
      }
    } catch (e) { /* ignore */ }
    if (feedbacks.length > 0 && !sourceLabel) {
      sourceLabel = '（来自本地缓存）';
    }
  }

  // 按时间倒序
  feedbacks.sort(function(a, b) {
    return new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0);
  });

  var typeMap = { bug: 'Bug 报告', feature: '功能建议', suggestion: '其他建议' };
  var typeColors = { bug: 'var(--color-error)', feature: 'var(--color-sage)', suggestion: 'var(--color-amber)' };

  var html = `
    <div class="admin-stats-row">
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--green">${ICONS.messageCircle}</div>
        <div>
          <div class="admin-stat-num">${feedbacks.length}</div>
          <div class="admin-stat-label">反馈总数</div>
        </div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--amber">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div>
          <div class="admin-stat-num">${feedbacks.filter(function(f) { return f.type === 'feature'; }).length}</div>
          <div class="admin-stat-label">功能建议</div>
        </div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--blue">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div>
          <div class="admin-stat-num">${feedbacks.filter(function(f) { return f.type === 'bug'; }).length}</div>
          <div class="admin-stat-label">Bug 报告</div>
        </div>
      </div>
    </div>

    <div class="admin-section">
      <div class="admin-section-header">
        <div class="admin-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          用户反馈
        </div>
        <span class="admin-section-badge">${feedbacks.length} 条${sourceLabel}</span>
      </div>
  `;

  if (feedbacks.length === 0) {
    html += `<div class="admin-empty"><div class="admin-empty-icon">${ICONS.inbox}</div><div class="admin-empty-text">暂无用户反馈</div><div class="admin-empty-hint">用户提交的反馈会同步到 Supabase feedbacks 表，同时保留本地 localStorage 备份。</div></div>`;
  } else {
    html += `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>类型</th>
              <th>标题</th>
              <th>详细描述</th>
              <th>用户</th>
              <th>联系方式</th>
              <th>时间</th>
              <th>页面</th>
            </tr>
          </thead>
          <tbody>
            ${feedbacks.map(function(fb) {
              var tLabel = typeMap[fb.type] || fb.type;
              var tColor = typeColors[fb.type] || 'var(--text-muted)';
              var userName = fb.user ? (fb.user.username || fb.user.id || '匿名') : '访客';
              var dateStr = (fb.created_at || fb.createdAt) ? new Date(fb.created_at || fb.createdAt).toLocaleString('zh-CN', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
              var urlShort = fb.url ? fb.url.replace(/^.*#/,'#') : '';
              return `
                <tr>
                  <td><span class="admin-q-tag" style="background:${tColor}15;color:${tColor};font-size:0.75rem;">${tLabel}</span></td>
                  <td style="font-weight:600;max-width:180px;" title="${escapeHtml(fb.title || '')}">${escapeHtml((fb.title || '').slice(0,30))}</td>
                  <td style="max-width:260px;color:var(--text-secondary);font-size:0.82rem;" title="${escapeHtml(fb.description || '')}">${escapeHtml((fb.description || '').slice(0,60))}${(fb.description || '').length > 60 ? '...' : ''}</td>
                  <td style="font-size:0.82rem;">${escapeHtml(userName)}</td>
                  <td style="font-size:0.82rem;color:var(--text-muted);">${escapeHtml(fb.contact || '--')}</td>
                  <td style="font-size:0.78rem;color:var(--text-muted);white-space:nowrap;">${dateStr}</td>
                  <td style="font-size:0.75rem;color:var(--text-muted);max-width:120px;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(fb.url || '')}">${escapeHtml(urlShort)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;
}

/* ===== 积分申诉管理标签 ===== */
async function renderAppealsTab(container) {
  container.innerHTML = `<div class="admin-loading"><div class="admin-spinner"></div><div class="admin-loading-text">加载申诉中...</div></div>`;

  var appeals = [];
  try {
    var fn = (typeof window.getPendingCRAppeals === 'function') ? window.getPendingCRAppeals : (typeof getPendingCRAppeals === 'function' ? getPendingCRAppeals : null);
    if (fn) appeals = await fn();
  } catch (e) {
    console.error('[Admin] 加载申诉失败:', e);
  }

  var pendingCount = appeals.filter(function(a) { return a.status === 'pending'; }).length;
  var approvedCount = appeals.filter(function(a) { return a.status === 'approved'; }).length;
  var rejectedCount = appeals.filter(function(a) { return a.status === 'rejected'; }).length;

  var html = `
    <div class="admin-stats-row">
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--amber">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div>
          <div class="admin-stat-num">${pendingCount}</div>
          <div class="admin-stat-label">待处理</div>
        </div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--green">${ICONS.check}</div>
        <div>
          <div class="admin-stat-num">${approvedCount}</div>
          <div class="admin-stat-label">已通过</div>
        </div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--red">${ICONS.x}</div>
        <div>
          <div class="admin-stat-num">${rejectedCount}</div>
          <div class="admin-stat-label">已驳回</div>
        </div>
      </div>
    </div>

    <div class="admin-section">
      <div class="admin-section-header">
        <div class="admin-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          积分申诉列表
        </div>
        <span class="admin-section-badge">${appeals.length} 条</span>
      </div>
  `;

  if (appeals.length === 0) {
    html += `<div class="admin-empty"><div class="admin-empty-icon">${ICONS.inbox}</div><div class="admin-empty-text">暂无申诉记录</div><div class="admin-empty-hint">用户在被不文明检测扣分后可提交申诉，管理员复核后处理。</div></div>`;
  } else {
    html += `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>状态</th>
              <th>用户</th>
              <th>来源</th>
              <th>触发词</th>
              <th>扣分</th>
              <th>内容</th>
              <th>申诉说明</th>
              <th>时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${appeals.map(function(a) {
              var profile = a.profiles || {};
              var username = profile.username || profile.display_name || a.user_id || '未知用户';
              var statusMap = { pending: { label: '待处理', color: '#e8a830' }, approved: { label: '已通过', color: '#3a8c5c' }, rejected: { label: '已驳回', color: '#c0553a' } };
              var statusInfo = statusMap[a.status] || statusMap.pending;
              var sourceLabel = (a.source || '').indexOf('comment') !== -1 ? '评论' : '发帖';
              var dateStr = a.created_at ? new Date(a.created_at).toLocaleString('zh-CN', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
              var resolvedStr = a.resolved_at ? new Date(a.resolved_at).toLocaleString('zh-CN', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
              return `
                <tr data-appeal-id="${a.id}">
                  <td><span class="admin-q-tag" style="background:${statusInfo.color}15;color:${statusInfo.color};font-size:0.75rem;">${statusInfo.label}</span></td>
                  <td style="font-size:0.82rem;">${escapeHtml(username)}</td>
                  <td style="font-size:0.82rem;">${sourceLabel}</td>
                  <td style="font-size:0.82rem;color:var(--color-error);">${escapeHtml(a.detected_word || '')}</td>
                  <td style="font-size:0.82rem;font-weight:600;">${a.amount || 0}</td>
                  <td style="max-width:220px;color:var(--text-secondary);font-size:0.82rem;" title="${escapeHtml(a.content || '')}">${escapeHtml((a.content || '').slice(0,50))}${(a.content || '').length > 50 ? '...' : ''}</td>
                  <td style="max-width:180px;color:var(--text-secondary);font-size:0.82rem;" title="${escapeHtml(a.user_note || '')}">${escapeHtml((a.user_note || '').slice(0,40))}${(a.user_note || '').length > 40 ? '...' : ''}</td>
                  <td style="font-size:0.78rem;color:var(--text-muted);white-space:nowrap;">${dateStr}${resolvedStr ? '<br><span style="color:var(--text-muted);">处理: ' + resolvedStr + '</span>' : ''}</td>
                  <td>
                    ${a.status === 'pending' ? `
                    <div class="admin-table-actions">
                      <button class="admin-btn admin-btn--primary" onclick="handleResolveAppeal('${a.id}', 'approve')">通过</button>
                      <button class="admin-btn admin-btn--danger" onclick="handleResolveAppeal('${a.id}', 'reject')">驳回</button>
                    </div>
                    ` : `<span style="font-size:0.78rem;color:var(--text-muted);">${a.admin_note ? escapeHtml((a.admin_note || '').slice(0,20)) : '--'}</span>`}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;
}

/* ===== OCR 录题标签 ===== */
function renderOcrTab(container) {
  // 缓存：审核中题目（每次切到 tab 都清空，避免状态污染）
  _ocrPendingQueue = [];

  container.innerHTML = `
    <div class="admin-section">
      <div class="admin-section-header">
        <h3>OCR 拍照录题</h3>
        <p style="color:#666;margin-top:4px;font-size:13px;">
          上传题目图片（生物竞赛题目、试卷截图等），AI 自动识别文字并生成选项/答案/解析。
          识别后可逐题审核编辑，确认后入库。
        </p>
      </div>

      <div class="admin-ocr-layout" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
        <!-- 左：上传 + 处理 -->
        <div class="admin-ocr-left">
          <div id="ocr-dropzone" class="ocr-dropzone" style="
            border:2px dashed #5a7d5c;border-radius:12px;padding:32px 20px;text-align:center;
            background:rgba(90,125,92,0.05);cursor:pointer;transition:all .2s;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#5a7d5c" stroke-width="1.5" style="margin:0 auto 8px;display:block;">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <div style="font-weight:600;color:#3a6b4a;">点击或拖拽上传题目图片</div>
            <div style="font-size:12px;color:#888;margin-top:4px;">支持 PNG / JPG / WEBP / GIF · 单张 ≤ 5MB</div>
            <input type="file" id="ocr-file-input" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" style="display:none;" />
          </div>

          <div style="margin-top:12px;display:flex;gap:8px;">
            <button id="ocr-batch-btn" class="admin-btn-secondary" style="flex:1;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              批量上传（最多 10 张）
            </button>
            <button id="ocr-clear-btn" class="admin-btn-secondary" style="flex:1;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              清空
            </button>
          </div>

          <div style="margin-top:16px;padding:10px 12px;background:#fff8e1;border-radius:8px;font-size:12px;color:#8b6e00;">
            <strong>提示：</strong>图片识别依赖 vision 模型，识别后请仔细核对题干和选项，确认无误后入库。
            题目入库时会自动打上 <code>ocr_uploaded</code> 标签，可通过同步模块追溯。
          </div>

          <div id="ocr-status" style="margin-top:12px;display:none;"></div>
        </div>

        <!-- 右：识别进度 + 队列 -->
        <div class="admin-ocr-right">
          <h4 style="margin:0 0 12px;">识别进度</h4>
          <div id="ocr-progress" style="display:none;background:#f5f5f5;padding:12px;border-radius:8px;margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span id="ocr-progress-text">处理中...</span>
              <span id="ocr-progress-pct" style="font-weight:600;color:#3a6b4a;">0%</span>
            </div>
            <div style="height:6px;background:#e0e0e0;border-radius:3px;overflow:hidden;">
              <div id="ocr-progress-bar" style="height:100%;background:linear-gradient(90deg,#5a7d5c,#3a6b4a);width:0%;transition:width .3s;"></div>
            </div>
          </div>

          <h4 style="margin:0 0 12px;">待审核题目 (<span id="ocr-queue-count">0</span>)</h4>
          <div id="ocr-queue" style="max-height:500px;overflow-y:auto;">
            <div style="padding:20px;text-align:center;color:#999;font-size:13px;">
              还没有待审核题目。点击左侧上传图片开始。
            </div>
          </div>

          <div id="ocr-batch-actions" style="display:none;margin-top:12px;display:flex;gap:8px;">
            <button id="ocr-approve-all-btn" class="admin-btn-primary" style="flex:1;">
              ✓ 全部确认入库
            </button>
            <button id="ocr-reject-all-btn" class="admin-btn-secondary" style="flex:1;">
              ✗ 全部拒绝
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // 绑定事件
  const dropzone = document.getElementById('ocr-dropzone');
  const fileInput = document.getElementById('ocr-file-input');
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.background = 'rgba(90,125,92,0.15)'; });
    dropzone.addEventListener('dragleave', () => { dropzone.style.background = 'rgba(90,125,92,0.05)'; });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.background = 'rgba(90,125,92,0.05)';
      const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
      if (files.length) _ocrProcessFiles(files);
    });
    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length) _ocrProcessFiles(files);
      e.target.value = ''; // 允许同一文件再次选择
    });
  }

  const batchBtn = document.getElementById('ocr-batch-btn');
  if (batchBtn) {
    batchBtn.addEventListener('click', () => fileInput && fileInput.click());
  }

  const clearBtn = document.getElementById('ocr-clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      _ocrPendingQueue = [];
      _ocrUpdateQueueUI();
      _ocrShowStatus('已清空所有待审核题目', 'info');
    });
  }

  const approveAllBtn = document.getElementById('ocr-approve-all-btn');
  if (approveAllBtn) {
    approveAllBtn.addEventListener('click', () => _ocrApproveAll());
  }

  const rejectAllBtn = document.getElementById('ocr-reject-all-btn');
  if (rejectAllBtn) {
    rejectAllBtn.addEventListener('click', () => {
      _ocrPendingQueue = [];
      _ocrUpdateQueueUI();
      _ocrShowStatus('已清空所有待审核题目', 'info');
    });
  }

  // 检查 vision 模型可用性
  _ocrCheckVisionStatus();
}

// 缓存待审核题目
let _ocrPendingQueue = [];

async function _ocrCheckVisionStatus() {
  try {
    const res = await fetch('/admin/vision-status', {
      headers: { 'X-Admin-Key': _adminSecretKey || '' }
    });
    if (!res.ok) return;
    const data = await res.json();
    const count = (data && data.available) ? data.available.length : 0;
    if (count === 0) {
      _ocrShowStatus('⚠️ 当前未配置任何 vision 模型，OCR 功能不可用。请在 server.py 配置 ZHIPU_API_KEY / QWEN_API_KEY / SILICONFLOW_API_KEY / NVIDIA_API_KEY / OPENAI_API_KEY 中至少一个。', 'error', 15000);
    } else {
      _ocrShowStatus(`✅ 已配置 ${count} 个 vision 模型：${data.available.map(v => v.model).join(', ')}`, 'success', 6000);
    }
  } catch (e) {
    console.warn('[OCR] 检查 vision 状态失败:', e);
  }
}

function _ocrShowStatus(text, type, duration = 4000) {
  const el = document.getElementById('ocr-status');
  if (!el) return;
  const colors = {
    info: { bg: '#e3f2fd', fg: '#1565c0', border: '#90caf9' },
    success: { bg: '#e8f5e9', fg: '#2e7d32', border: '#81c784' },
    error: { bg: '#ffebee', fg: '#c62828', border: '#ef9a9a' }
  };
  const c = colors[type] || colors.info;
  el.style.cssText = `display:block;padding:10px 12px;border-radius:8px;background:${c.bg};color:${c.fg};border:1px solid ${c.border};font-size:13px;`;
  el.textContent = text;
  if (duration > 0) setTimeout(() => { if (el.textContent === text) el.style.display = 'none'; }, duration);
}

function _ocrShowProgress(text, pct) {
  const wrap = document.getElementById('ocr-progress');
  const bar = document.getElementById('ocr-progress-bar');
  const txt = document.getElementById('ocr-progress-text');
  const pctEl = document.getElementById('ocr-progress-pct');
  if (!wrap || !bar || !txt || !pctEl) return;
  wrap.style.display = 'block';
  txt.textContent = text;
  pctEl.textContent = pct + '%';
  bar.style.width = pct + '%';
}

function _ocrHideProgress() {
  const wrap = document.getElementById('ocr-progress');
  if (wrap) wrap.style.display = 'none';
}

async function _ocrProcessFiles(files) {
  // 限制：单次最多 OCR_MAX_IMAGES 张
  const limited = files.slice(0, OCR_MAX_IMAGES);
  if (files.length > OCR_MAX_IMAGES) {
    _ocrShowStatus(`提示：单次最多处理 ${OCR_MAX_IMAGES} 张图片，已截取前 ${OCR_MAX_IMAGES} 张`, 'info', 3000);
  }

  for (let i = 0; i < limited.length; i++) {
    const file = limited[i];
    if (file.size > OCR_IMAGE_MAX_BYTES) {
      _ocrShowStatus(`跳过 ${file.name}（超过 5MB）`, 'error', 4000);
      continue;
    }
    const basePct = (i / limited.length) * 100;
    const perPct = 100 / limited.length;
    _ocrShowProgress(`处理 ${i+1}/${limited.length}: ${file.name}`, basePct);

    try {
      // 读取为 base64
      const b64 = await _ocrReadFileAsBase64(file);
      _ocrShowProgress(`上传并识别 ${i+1}/${limited.length}: ${file.name}`, basePct + perPct * 0.5);

      // 调用后端 OCR API
      const res = await fetch('/admin/ocr-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': _adminSecretKey || ''
        },
        body: JSON.stringify({
          image: b64,
          mime: file.type || 'image/png',
          text: ''
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '请求失败' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      _ocrShowProgress(`解析 ${i+1}/${limited.length}: ${file.name}`, basePct + perPct * 0.85);

      if (data && data.question) {
        _ocrPendingQueue.push({
          id: data.question.id,
          stem: data.question.stem,
          options: data.question.options || {},
          answer: data.question.answer || '',
          analysis: data.question.analysis || '',
          module: data.question.module || 'module_1',
          difficulty: data.question.difficulty || 'league',
          target: data.question.target || 'competition',
          subject: data.question.subject || '',
          concept: data.question.concept || '',
          tags: data.question.tags || [],
          ocr_text: data.question.ocr_text || '',
          filename: file.name
        });
        _ocrUpdateQueueUI();
      }
      _ocrShowProgress(`完成 ${i+1}/${limited.length}`, basePct + perPct);
    } catch (e) {
      console.error(`[OCR] 处理 ${file.name} 失败:`, e);
      _ocrShowStatus(`处理 ${file.name} 失败：${e.message}`, 'error', 5000);
    }
  }

  _ocrHideProgress();
}

function _ocrReadFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result || '';
      // 去掉 data:image/...;base64, 前缀
      const b64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(b64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function _ocrUpdateQueueUI() {
  const queue = document.getElementById('ocr-queue');
  const count = document.getElementById('ocr-queue-count');
  const batchActions = document.getElementById('ocr-batch-actions');
  if (!queue || !count) return;
  count.textContent = _ocrPendingQueue.length;
  if (batchActions) {
    batchActions.style.display = _ocrPendingQueue.length > 0 ? 'flex' : 'none';
  }
  if (_ocrPendingQueue.length === 0) {
    queue.innerHTML = `<div style="padding:20px;text-align:center;color:#999;font-size:13px;">还没有待审核题目。点击左侧上传图片开始。</div>`;
    return;
  }

  queue.innerHTML = _ocrPendingQueue.map((q, idx) => `
    <div class="ocr-queue-item" data-idx="${idx}" style="
      border:1px solid #e0e0e0;border-radius:10px;padding:12px;margin-bottom:10px;background:#fff;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-size:11px;color:#888;">${escapeHtml(q.filename || '')} · ID: ${q.id}</div>
        <div style="display:flex;gap:6px;">
          <button class="admin-btn-small ocr-edit-btn" data-idx="${idx}" style="background:#5a7d5c;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:12px;">编辑</button>
          <button class="admin-btn-small ocr-approve-btn" data-idx="${idx}" style="background:#2e7d32;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:12px;">入库</button>
          <button class="admin-btn-small ocr-reject-btn" data-idx="${idx}" style="background:#c62828;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:12px;">删除</button>
        </div>
      </div>
      <div style="font-weight:600;color:#222;margin-bottom:6px;font-size:14px;">${escapeHtml(q.stem || '(空)')}</div>
      <div style="font-size:12px;color:#444;margin-bottom:4px;">
        ${Object.entries(q.options || {}).map(([k, v]) => `<div style="margin-left:8px;"><strong>${k}.</strong> ${escapeHtml(String(v))}</div>`).join('')}
      </div>
      <div style="font-size:11px;color:#666;margin-top:4px;">
        答案: <strong style="color:#2e7d32;">${escapeHtml(q.answer || '?')}</strong> · 标签: ${(q.tags || []).map(t => `<code style="background:#f0f0f0;padding:1px 4px;border-radius:2px;">${escapeHtml(t)}</code>`).join(' ')}
      </div>
    </div>
  `).join('');

  // 绑定按钮
  queue.querySelectorAll('.ocr-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'));
      _ocrEditItem(idx);
    });
  });
  queue.querySelectorAll('.ocr-approve-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'));
      _ocrApproveItem(idx);
    });
  });
  queue.querySelectorAll('.ocr-reject-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'));
      _ocrPendingQueue.splice(idx, 1);
      _ocrUpdateQueueUI();
    });
  });
}

function _ocrEditItem(idx) {
  const q = _ocrPendingQueue[idx];
  if (!q) return;
  const modal = document.createElement('div');
  modal.className = 'lmc-modal-backdrop';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
  const optText = Object.entries(q.options || {}).map(([k, v]) => `${k}: ${v}`).join('\n');
  modal.innerHTML = `
    <div class="lmc-modal" style="background:#fff;border-radius:12px;max-width:640px;width:90%;max-height:90vh;overflow:auto;padding:24px;">
      <h3 style="margin:0 0 16px;">编辑题目</h3>
      <div style="margin-bottom:12px;">
        <label style="font-size:12px;color:#666;display:block;margin-bottom:4px;">题干</label>
        <textarea id="ocr-edit-stem" style="width:100%;min-height:80px;padding:8px;border:1px solid #ccc;border-radius:6px;font-family:inherit;font-size:14px;">${escapeHtml(q.stem || '')}</textarea>
      </div>
      <div style="margin-bottom:12px;">
        <label style="font-size:12px;color:#666;display:block;margin-bottom:4px;">选项（A-D，每行一个）</label>
        <textarea id="ocr-edit-options" style="width:100%;min-height:80px;padding:8px;border:1px solid #ccc;border-radius:6px;font-family:inherit;font-size:14px;">${escapeHtml(optText)}</textarea>
      </div>
      <div style="margin-bottom:12px;display:flex;gap:12px;">
        <div style="flex:1;">
          <label style="font-size:12px;color:#666;display:block;margin-bottom:4px;">答案 (A/B/C/D)</label>
          <input id="ocr-edit-answer" value="${escapeHtml(q.answer || '')}" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;" />
        </div>
        <div style="flex:1;">
          <label style="font-size:12px;color:#666;display:block;margin-bottom:4px;">难度</label>
          <select id="ocr-edit-difficulty" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;">
            <option value="basic" ${q.difficulty === 'basic' ? 'selected' : ''}>基础</option>
            <option value="league" ${q.difficulty === 'league' ? 'selected' : ''}>联赛</option>
            <option value="national" ${q.difficulty === 'national' ? 'selected' : ''}>国赛</option>
            <option value="ibo" ${q.difficulty === 'ibo' ? 'selected' : ''}>IBO</option>
          </select>
        </div>
      </div>
      <div style="margin-bottom:12px;">
        <label style="font-size:12px;color:#666;display:block;margin-bottom:4px;">解析</label>
        <textarea id="ocr-edit-analysis" style="width:100%;min-height:80px;padding:8px;border:1px solid #ccc;border-radius:6px;font-family:inherit;font-size:14px;">${escapeHtml(q.analysis || '')}</textarea>
      </div>
      <div style="margin-bottom:12px;">
        <label style="font-size:12px;color:#666;display:block;margin-bottom:4px;">OCR 原文（仅参考）</label>
        <div style="padding:8px;background:#f5f5f5;border-radius:6px;font-size:12px;color:#666;max-height:100px;overflow:auto;">${escapeHtml(q.ocr_text || '')}</div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button id="ocr-edit-cancel" class="admin-btn-secondary" style="padding:8px 16px;border-radius:6px;cursor:pointer;border:1px solid #ccc;background:#fff;">取消</button>
        <button id="ocr-edit-save" class="admin-btn-primary" style="padding:8px 16px;border-radius:6px;cursor:pointer;background:#3a6b4a;color:#fff;border:none;">保存</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('ocr-edit-cancel').addEventListener('click', () => modal.remove());
  document.getElementById('ocr-edit-save').addEventListener('click', () => {
    q.stem = document.getElementById('ocr-edit-stem').value.trim();
    const optsRaw = document.getElementById('ocr-edit-options').value.trim();
    q.options = {};
    optsRaw.split('\n').forEach(line => {
      const m = line.match(/^([A-D])[:：．\.]\s*(.+)$/);
      if (m) q.options[m[1]] = m[2].trim();
    });
    q.answer = document.getElementById('ocr-edit-answer').value.trim().toUpperCase();
    q.difficulty = document.getElementById('ocr-edit-difficulty').value;
    q.analysis = document.getElementById('ocr-edit-analysis').value.trim();
    modal.remove();
    _ocrUpdateQueueUI();
  });
}

async function _ocrApproveItem(idx) {
  const q = _ocrPendingQueue[idx];
  if (!q) return;
  try {
    const res = await fetch('/admin/update-question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': _adminSecretKey || ''
      },
      body: JSON.stringify({
        id: q.id,
        stem: q.stem,
        options: q.options,
        answer: q.answer,
        analysis: q.analysis,
        module: q.module,
        difficulty: q.difficulty,
        target: q.target,
        subject: q.subject,
        concept: q.concept,
        tags: q.tags.filter(t => t !== 'pending_review' && t !== 'ocr_uploaded')
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: '请求失败' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    _ocrPendingQueue.splice(idx, 1);
    _ocrUpdateQueueUI();
    _ocrShowStatus(`✓ 题目已入库：${q.stem.slice(0, 30)}...`, 'success', 4000);
  } catch (e) {
    _ocrShowStatus(`入库失败：${e.message}`, 'error', 6000);
  }
}

async function _ocrApproveAll() {
  if (_ocrPendingQueue.length === 0) return;
  if (!confirm(`确认将 ${_ocrPendingQueue.length} 道题目全部入库？`)) return;
  let ok = 0, fail = 0;
  _ocrShowProgress('批量入库中...', 0);
  for (let i = 0; i < _ocrPendingQueue.length; i++) {
    const q = _ocrPendingQueue[i];
    try {
      const res = await fetch('/admin/update-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': _adminSecretKey || ''
        },
        body: JSON.stringify({
          id: q.id,
          stem: q.stem, options: q.options, answer: q.answer, analysis: q.analysis,
          module: q.module, difficulty: q.difficulty, target: q.target,
          subject: q.subject, concept: q.concept,
          tags: q.tags.filter(t => t !== 'pending_review' && t !== 'ocr_uploaded')
        })
      });
      if (res.ok) { ok++; _ocrPendingQueue.splice(i, 1); i--; }
      else fail++;
    } catch { fail++; }
    _ocrShowProgress(`批量入库中... ${ok + fail}/${_ocrPendingQueue.length + ok}`, (ok + fail) / (_ocrPendingQueue.length + ok) * 100);
  }
  _ocrHideProgress();
  _ocrUpdateQueueUI();
  _ocrShowStatus(`批量入库完成：✓ ${ok} 成功 · ✗ ${fail} 失败`, fail > 0 ? 'error' : 'success', 5000);
}

/* ===== 数据同步标签 ===== */
function renderSyncTab(container) {
  container.innerHTML = `
    <div class="admin-section">
      <div class="admin-section-header">
        <h3>数据同步</h3>
        <p style="color:var(--text-secondary);font-size:14px;margin:4px 0 0;">
          将本地 JSON 数据同步到 Supabase 数据库（题目、卡片、资源）
        </p>
      </div>

      <div class="admin-stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 24px;">
        <div class="admin-stat-card">
          <div class="admin-stat-value" style="color:var(--color-sage);">自动</div>
          <div class="admin-stat-label">每30分钟自动同步</div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-value" style="color:var(--color-amber);">启动时</div>
          <div class="admin-stat-label">服务器启动自动同步</div>
        </div>
      </div>

      <div style="background:var(--surface-secondary);border-radius:12px;padding:24px;margin-bottom:16px;">
        <h4 style="margin:0 0 12px;font-size:15px;">手动同步</h4>
        <p style="color:var(--text-secondary);font-size:13px;margin:0 0 16px;">
          点击按钮立即将本地数据同步到 Supabase。同步在后台执行，不会影响正常使用。
        </p>
        <button id="admin-sync-btn" class="admin-btn admin-btn-primary" style="padding:10px 24px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:6px;"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
          立即同步
        </button>
        <div id="admin-sync-status" style="margin-top:12px;font-size:13px;color:var(--text-secondary);"></div>
      </div>

      <div style="background:var(--surface-secondary);border-radius:12px;padding:24px;">
        <h4 style="margin:0 0 12px;font-size:15px;">说明</h4>
        <ul style="color:var(--text-secondary);font-size:13px;margin:0;padding-left:20px;line-height:2;">
          <li>同步会将本地 <code>data/</code> 目录下的 JSON 数据上传到 Supabase</li>
          <li>使用 <code>--force</code> 模式：先删除旧数据再插入新数据</li>
          <li>如果 Supabase 表不存在，同步会失败（需先在 Supabase SQL Editor 中执行 schema.sql）</li>
          <li>即使同步失败，网站仍可正常使用本地数据</li>
        </ul>
      </div>
    </div>
  `;

  const syncBtn = document.getElementById('admin-sync-btn');
  const syncStatus = document.getElementById('admin-sync-status');
  syncBtn.addEventListener('click', async () => {
    syncBtn.disabled = true;
    syncBtn.textContent = '同步中...';
    syncStatus.textContent = '正在触发同步，请稍候...';
    syncStatus.style.color = 'var(--color-amber)';

    try {
      const result = await adminApiCall('POST', '/admin/sync');
      if (result.ok) {
        syncStatus.textContent = '同步已触发，后台执行中。大约需要几分钟完成。';
        syncStatus.style.color = 'var(--color-sage)';
      } else {
        syncStatus.textContent = '触发失败：' + (result.data.error || '未知错误');
        syncStatus.style.color = '#e74c3c';
      }
    } catch (e) {
      syncStatus.textContent = '网络错误：' + e.message;
      syncStatus.style.color = '#e74c3c';
    }

    syncBtn.disabled = false;
    syncBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:6px;"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>立即同步';
  });
}

/* ===== 公告管理标签 ===== */
async function renderAnnouncementsTab(container) {
  container.innerHTML = `
    <div class="admin-section-header">
      <div class="admin-section-title">公告管理</div>
      <button class="admin-section-btn" id="announcement-create-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        新建公告
      </button>
    </div>
    <div id="announcement-list">
      <div class="admin-loading"><div class="admin-spinner"></div><div class="admin-loading-text">加载中...</div></div>
    </div>
    <div id="announcement-editor" style="display:none;"></div>
  `;

  // 新建按钮
  document.getElementById('announcement-create-btn').addEventListener('click', function() {
    showAnnouncementEditor(container, null);
  });

  // 加载列表
  await refreshAnnouncementList(container);
}

async function refreshAnnouncementList(container) {
  var listEl = document.getElementById('announcement-list');
  if (!listEl) return;

  listEl.innerHTML = '<div class="admin-loading"><div class="admin-spinner"></div><div class="admin-loading-text">加载中...</div></div>';

  try {
    var announcements = [];
    // 优先使用 adminApiCall，回退到 window.getAnnouncements
    try {
      var apiResult = await adminApiCall('GET', '/admin/announcements');
      if (apiResult.ok && apiResult.data && Array.isArray(apiResult.data.announcements)) {
        announcements = apiResult.data.announcements;
      }
    } catch (apiErr) {
      console.warn('[Admin] adminApiCall 获取公告失败，尝试 window.getAnnouncements:', apiErr);
    }
    if (announcements.length === 0 && typeof window.getAnnouncements === 'function') {
      announcements = await window.getAnnouncements({ onlyActive: false, limit: ADMIN_ANNOUNCEMENT_LIMIT });
    }

    if (!announcements || announcements.length === 0) {
      listEl.innerHTML = '<div class="admin-empty"><div class="admin-empty-icon">暂无公告</div><div class="admin-empty-text">尚未创建任何公告</div></div>';
      return;
    }

    var html = '<div style="display:flex;flex-direction:column;gap:12px;">';
    for (var i = 0; i < announcements.length; i++) {
      var a = announcements[i];
      var statusBadge = a.is_active ? '<span style="background:#3a8c5c;color:#fff;font-size:0.7rem;padding:2px 8px;border-radius:10px;">已发布</span>' : '<span style="background:#888;color:#fff;font-size:0.7rem;padding:2px 8px;border-radius:10px;">已下架</span>';
      var pinBadge = a.is_pinned ? '<span style="background:#e8a830;color:#fff;font-size:0.7rem;padding:2px 8px;border-radius:10px;">置顶</span>' : '';
      var dateStr = a.created_at ? new Date(a.created_at).toLocaleString('zh-CN') : '';
      html += '<div style="background:var(--surface-secondary,#faf7f2);border:1px solid var(--border-light,#ece8e1);border-radius:12px;padding:16px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<strong style="font-size:1rem;color:var(--color-deep,#1a3a2a);">' + escapeHtml(a.title || '无标题') + '</strong>' +
            pinBadge + statusBadge +
          '</div>' +
          '<div style="display:flex;gap:8px;">' +
            '<button class="admin-announce-edit-btn" data-id="' + a.id + '" style="background:var(--color-sage,#5a7d5c);color:#fff;border:none;padding:4px 12px;border-radius:8px;cursor:pointer;font-size:0.8rem;">编辑</button>' +
            '<button class="admin-announce-delete-btn" data-id="' + a.id + '" style="background:#e53e3e;color:#fff;border:none;padding:4px 12px;border-radius:8px;cursor:pointer;font-size:0.8rem;">删除</button>' +
          '</div>' +
        '</div>' +
        '<div style="font-size:0.85rem;color:var(--text-secondary,#6b7f74);line-height:1.6;white-space:pre-wrap;">' + escapeHtml(a.content || '').substring(0, 200) + (a.content && a.content.length > 200 ? '...' : '') + '</div>' +
        '<div style="font-size:0.75rem;color:var(--text-muted,#8a8a8a);margin-top:8px;">' + dateStr + '</div>' +
      '</div>';
    }
    html += '</div>';
    listEl.innerHTML = html;

    // 编辑按钮
    var editBtns = listEl.querySelectorAll('.admin-announce-edit-btn');
    editBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = this.dataset.id;
        var ann = announcements.find(function(a) { return String(a.id) === id; });
        showAnnouncementEditor(container, ann);
      });
    });

    // 删除按钮
    var deleteBtns = listEl.querySelectorAll('.admin-announce-delete-btn');
    deleteBtns.forEach(function(btn) {
      btn.addEventListener('click', async function() {
        if (!confirm('确定要删除该公告吗？此操作不可撤销。')) return;
        var id = this.dataset.id;
        var result;
        try {
          result = await adminApiCall('DELETE', '/admin/announcements/' + id);
        } catch (e) {
          result = { ok: false, error: e.message };
        }
        if (result && result.ok) {
          if (typeof showToast === 'function') showToast('公告已删除');
          await refreshAnnouncementList(container);
        } else {
          if (typeof showToast === 'function') showToast('删除失败：' + (result.error || '未知错误'));
        }
      });
    });
  } catch (e) {
    listEl.innerHTML = '<div class="admin-empty"><div class="admin-empty-text">加载失败：' + escapeHtml(e.message || '') + '</div></div>';
  }
}

function showAnnouncementEditor(container, announcement) {
  var editorEl = document.getElementById('announcement-editor');
  var listEl = document.getElementById('announcement-list');
  if (!editorEl || !listEl) return;

  var isEdit = !!announcement;
  editorEl.style.display = 'block';
  listEl.style.display = 'none';

  editorEl.innerHTML = `
    <div style="background:var(--surface-primary,#fff);border:1px solid var(--border-light,#ece8e1);border-radius:16px;padding:24px;">
      <h3 style="font-size:1.1rem;margin-bottom:20px;color:var(--color-deep,#1a3a2a);">${isEdit ? '编辑公告' : '新建公告'}</h3>
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div>
          <label style="font-size:0.85rem;color:var(--text-secondary,#6b7f74);display:block;margin-bottom:6px;">标题</label>
          <input type="text" id="announce-title" class="admin-login-input" style="width:100%;box-sizing:border-box;" value="${escapeHtml(announcement?.title || '')}" placeholder="公告标题">
        </div>
        <div>
          <label style="font-size:0.85rem;color:var(--text-secondary,#6b7f74);display:block;margin-bottom:6px;">内容</label>
          <textarea id="announce-content" class="admin-login-input" style="width:100%;box-sizing:border-box;min-height:150px;resize:vertical;font-family:inherit;" placeholder="公告内容...">${escapeHtml(announcement?.content || '')}</textarea>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;cursor:pointer;">
            <input type="checkbox" id="announce-pinned" ${announcement?.is_pinned ? 'checked' : ''}>
            置顶
          </label>
          ${isEdit ? '<label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;cursor:pointer;"><input type="checkbox" id="announce-active" ' + (announcement?.is_active ? 'checked' : '') + '> 已发布</label>' : ''}
        </div>
        <div style="display:flex;gap:12px;margin-top:8px;">
          <button id="announce-save-btn" style="background:var(--color-sage,#5a7d5c);color:#fff;border:none;padding:10px 24px;border-radius:10px;cursor:pointer;font-size:0.9rem;">${isEdit ? '保存修改' : '发布公告'}</button>
          <button id="announce-cancel-btn" style="background:transparent;border:1px solid var(--border-light,#ece8e1);padding:10px 24px;border-radius:10px;cursor:pointer;font-size:0.9rem;color:var(--text-secondary,#6b7f74);">取消</button>
        </div>
        <p id="announce-editor-error" style="color:#e53e3e;font-size:0.85rem;display:none;"></p>
      </div>
    </div>
  `;

  document.getElementById('announce-cancel-btn').addEventListener('click', function() {
    editorEl.style.display = 'none';
    listEl.style.display = 'block';
  });

  document.getElementById('announce-save-btn').addEventListener('click', async function() {
    var title = document.getElementById('announce-title').value.trim();
    var content = document.getElementById('announce-content').value.trim();
    var isPinned = document.getElementById('announce-pinned').checked;
    var errorEl = document.getElementById('announce-editor-error');

    if (!title || !content) {
      errorEl.textContent = '标题和内容不能为空';
      errorEl.style.display = 'block';
      return;
    }

    errorEl.style.display = 'none';
    var btn = document.getElementById('announce-save-btn');
    btn.disabled = true;
    btn.textContent = '保存中...';

    var result;
    if (isEdit) {
      var updates = { title: title, content: content, is_pinned: isPinned };
      var activeCb = document.getElementById('announce-active');
      if (activeCb) updates.is_active = activeCb.checked;
      result = await window.updateAnnouncement(announcement.id, updates);
    } else {
      result = await window.createAnnouncement(title, content, isPinned);
    }

    btn.disabled = false;
    btn.textContent = isEdit ? '保存修改' : '发布公告';

    if (result.ok) {
      if (typeof showToast === 'function') showToast(isEdit ? '公告已更新' : '公告已发布');
      editorEl.style.display = 'none';
      listEl.style.display = 'block';
      await refreshAnnouncementList(container);
    } else {
      errorEl.textContent = result.error || '操作失败';
      errorEl.style.display = 'block';
    }
  });
}

/* ===== AI 出题功能 ===== */
var _aiGenState = {
  generating: false,
  generatedQuestions: [],
  currentTopic: '',
  currentModule: 'module1',
  currentDifficulty: 'league',
  needImage: true
};

function renderAiGenTab(container) {
  _aiGenState.generatedQuestions = [];

  var hasImg = typeof window.AiClient !== 'undefined' && typeof window.AiClient.generateImage === 'function';
  var hasChat = typeof window.AiClient !== 'undefined' && typeof window.AiClient.chat === 'function';

  container.innerHTML = `
    <div class="admin-section">
      <div class="admin-section-header">
        <h3>AI 智能出题</h3>
        <p style="color:#666;margin-top:4px;font-size:13px;">
          输入主题/知识点，AI 自动生成生物题目（支持配图），预览后可直接入库到 Supabase。
        </p>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:16px;">
        <!-- 左：配置面板 -->
        <div style="background:#f8f9fa;border-radius:12px;padding:20px;">
          <h4 style="margin:0 0 16px;font-size:15px;">出题配置</h4>

          <div style="margin-bottom:14px;">
            <label style="font-size:13px;color:#555;display:block;margin-bottom:6px;font-weight:600;">知识点/主题 *</label>
            <input type="text" id="aigen-topic" placeholder="例如：细胞呼吸、光合作用、遗传学连锁互换..."
              style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;">
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
            <div>
              <label style="font-size:13px;color:#555;display:block;margin-bottom:6px;font-weight:600;">模块</label>
              <select id="aigen-module" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;">
                <option value="module1">模块1：生化细胞</option>
                <option value="module2">模块2：植物动物</option>
                <option value="module3">option value="module3">模块3：遗传进化</option>
                <option value="module4">模块4：生态行为</option>
              </select>
            </div>
            <div>
              <label style="font-size:13px;color:#555;display:block;margin-bottom:6px;font-weight:600;">难度</label>
              <select id="aigen-difficulty" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;">
                <option value="basic">基础</option>
                <option value="league" selected>联赛</option>
                <option value="national">国赛</option>
                <option value="ibo">IBO</option>
              </select>
            </div>
          </div>

          <div style="margin-bottom:14px;">
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
              <input type="checkbox" id="aigen-need-image" checked style="width:16px;height:16px;">
              <span>生成题目配图（文生图）</span>
            </label>
            ${!hasImg ? '<div style="font-size:12px;color:#c62828;margin-top:4px;">⚠️ 文生图需要配置 AI API Key（推荐智谱 CogView-3-Flash，免费）</div>' : ''}
          </div>

          <div style="margin-bottom:14px;">
            <label style="font-size:13px;color:#555;display:block;margin-bottom:6px;font-weight:600;">题目数量</label>
            <select id="aigen-count" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;">
              <option value="1">1 题</option>
              <option value="3" selected>3 题</option>
              <option value="5">5 题</option>
            </select>
          </div>

          <button id="aigen-generate-btn"
            style="width:100%;padding:12px;background:linear-gradient(135deg,#5a7d5c,#3a6b4a);color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
            AI 生成题目
          </button>

          <div id="aigen-status" style="margin-top:12px;display:none;"></div>
          <div id="aigen-progress" style="display:none;margin-top:12px;">
            <div style="font-size:13px;color:#555;margin-bottom:6px;" id="aigen-progress-text">初始化中...</div>
            <div style="height:6px;background:#e0e0e0;border-radius:3px;overflow:hidden;">
              <div id="aigen-progress-bar" style="height:100%;background:linear-gradient(90deg,#5a7d5c,#3a6b4a);width:0%;transition:width .3s;"></div>
            </div>
          </div>
        </div>

        <!-- 右：预览队列 -->
        <div>
          <h4 style="margin:0 0 12px;font-size:15px;">生成预览 (<span id="aigen-count">0</span>)</h4>
          <div id="aigen-queue" style="max-height:600px;overflow-y:auto;">
            <div style="padding:40px 20px;text-align:center;color:#999;font-size:13px;background:#f8f9fa;border-radius:12px;">
              配置左侧参数后点击「AI 生成题目」开始
            </div>
          </div>
          <div id="aigen-batch-actions" style="display:none;margin-top:12px;gap:8px;display:none;">
            <button id="aigen-approve-all-btn" class="admin-btn-primary" style="flex:1;">
              ✓ 全部入库到 Supabase
            </button>
            <button id="aigen-clear-btn" class="admin-btn-secondary" style="flex:1;">
              清空
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // 修复模块选项的HTML错误
  var moduleSel = document.getElementById('aigen-module');
  if (moduleSel) {
    moduleSel.innerHTML = `
      <option value="module1">模块1：生化细胞</option>
      <option value="module2">模块2：植物动物</option>
      <option value="module3">模块3：遗传进化</option>
      <option value="module4">模块4：生态行为</option>
    `;
  }

  document.getElementById('aigen-generate-btn').addEventListener('click', _aiGenGenerate);
  document.getElementById('aigen-clear-btn')?.addEventListener('click', function() {
    _aiGenState.generatedQuestions = [];
    _aiGenUpdateQueueUI();
  });
  document.getElementById('aigen-approve-all-btn')?.addEventListener('click', _aiGenApproveAll);
}

function _aiGenShowStatus(text, type, duration) {
  duration = duration || 5000;
  var el = document.getElementById('aigen-status');
  if (!el) return;
  var colors = {
    info: { bg: '#e3f2fd', fg: '#1565c0', border: '#90caf9' },
    success: { bg: '#e8f5e9', fg: '#2e7d32', border: '#81c784' },
    error: { bg: '#ffebee', fg: '#c62828', border: '#ef9a9a' }
  };
  var c = colors[type] || colors.info;
  el.style.cssText = 'display:block;padding:10px 12px;border-radius:8px;background:' + c.bg + ';color:' + c.fg + ';border:1px solid ' + c.border + ';font-size:13px;';
  el.textContent = text;
  if (duration > 0) setTimeout(function() { if (el.textContent === text) el.style.display = 'none'; }, duration);
}

function _aiGenShowProgress(text, pct) {
  var wrap = document.getElementById('aigen-progress');
  var bar = document.getElementById('aigen-progress-bar');
  var txt = document.getElementById('aigen-progress-text');
  if (!wrap || !bar || !txt) return;
  wrap.style.display = 'block';
  txt.textContent = text;
  if (typeof pct === 'number') bar.style.width = Math.min(100, Math.max(0, pct)) + '%';
}

function _aiGenHideProgress() {
  var wrap = document.getElementById('aigen-progress');
  if (wrap) wrap.style.display = 'none';
}

async function _aiGenGenerate() {
  if (_aiGenState.generating) return;

  var topic = (document.getElementById('aigen-topic')?.value || '').trim();
  var module = document.getElementById('aigen-module')?.value || 'module1';
  var difficulty = document.getElementById('aigen-difficulty')?.value || 'league';
  var needImage = document.getElementById('aigen-need-image')?.checked ?? true;
  var count = parseInt(document.getElementById('aigen-count')?.value || '3', 10);

  if (!topic) {
    _aiGenShowStatus('请输入知识点/主题', 'error');
    return;
  }

  var btn = document.getElementById('aigen-generate-btn');
  btn.disabled = true;
  btn.style.opacity = '0.6';
  _aiGenState.generating = true;
  _aiGenShowStatus('AI 出题中，请稍候...', 'info', 0);

  try {
    var moduleLabels = { module1: '生化细胞', module2: '植物动物', module3: '遗传进化', module4: '生态行为' };
    var diffLabels = { basic: '基础', league: '联赛', national: '国赛', ibo: 'IBO' };

    var systemPrompt = '你是一位经验丰富的生物竞赛出题专家。请根据用户给的知识点，生成高质量的生物竞赛题。\n\n' +
      '要求：\n' +
      '1. 生成的题目必须是判断题形式，包含4个子问题（sub_questions），每个子问题是一个陈述，用户判断对/错\n' +
      '2. 题目内容要准确，符合生物竞赛难度\n' +
      '3. 如果用户要求配图，请生成一个适合作为题目的配图提示词（image_prompt字段），用于AI文生图。配图应该是生物结构示意图、过程图、图表等教学用图\n' +
      '4. 严格返回JSON格式，不要加任何其他说明文字\n\n' +
      '返回格式（数组，count道题）：\n' +
      '```json\n' +
      '[\n' +
      '  {\n' +
      '    "question": "题干（完整的题目描述）",\n' +
      '    "sub_questions": [\n' +
      '      {"text": "陈述1", "answer": true},\n' +
      '      {"text": "陈述2", "answer": false},\n' +
      '      {"text": "陈述3", "answer": true},\n' +
      '      {"text": "陈述4", "answer": false}\n' +
      '    ],\n' +
      '    "answer": "答案说明",\n' +
      '    "explanation": "详细解析",\n' +
      '    "subject": "细分学科（如细胞生物学/遗传学/生态学等）",\n' +
      '    "concept": "核心概念",\n' +
      '    "image_prompt": "配图提示词（英文，详细描述生物结构图，适合文生图模型理解。如果不需要配图则为空字符串）"\n' +
      '  }\n' +
      ']\n' +
      '```';

    var userPrompt = '请生成 ' + count + ' 道关于「' + topic + '」的生物' + diffLabels[difficulty] + '难度题目，模块：' + moduleLabels[module] + '。' +
      (needImage ? '请为题目生成合适的配图提示词。' : '不需要配图，image_prompt留空。');

    _aiGenShowProgress('AI 生成题目内容...', 10);

    var chatResult;
    if (window.AiClient && window.AiClient.chat) {
      var canUseCheck = window.AiClient.canUse();
      if (!canUseCheck.ok) {
        throw new Error(canUseCheck.reason);
      }
      chatResult = await window.AiClient.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        maxTokens: AI_GEN_MAX_TOKENS
      });
    } else {
      throw new Error('AI 客户端未就绪');
    }

    var content = '';
    try {
      content = chatResult.choices[0].message.content || '';
    } catch(e) {
      throw new Error('AI 返回格式异常');
    }

    content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
    var questions;
    try {
      questions = JSON.parse(content);
    } catch(e) {
      console.error('[AI Gen] JSON解析失败，原始内容:', content);
      var jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('AI 返回内容不是有效的 JSON 格式');
      }
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('AI 未生成有效题目');
    }

    var generated = [];
    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      var qid = 'ai_' + module + '_' + Date.now().toString(36) + '_' + i;
      var moduleDb = module.replace('module', 'module_');
      var labels = ['A', 'B', 'C', 'D', 'E', 'F'];

      var subQs = [];
      if (Array.isArray(q.sub_questions)) {
        for (var si = 0; si < q.sub_questions.length && si < 6; si++) {
          var sq = q.sub_questions[si];
          var ans = false;
          if (sq.answer !== undefined) ans = !!sq.answer;
          else if (sq.is_true !== undefined) ans = !!sq.is_true;
          subQs.push({
            label: labels[si],
            text: sq.text || '',
            answer: ans
          });
        }
      }

      var item = {
        id: qid,
        question: q.question || '',
        sub_questions: subQs,
        answer: q.answer || '',
        explanation: q.explanation || '',
        module: moduleDb,
        type: 'mtf',
        difficulty: difficulty,
        subject: q.subject || topic,
        concept: q.concept || topic,
        tags: ['ai_generated', moduleDb],
        chart: '',
        image_prompt: q.image_prompt || '',
        source: 'ai_generated'
      };

      _aiGenShowProgress('处理题目 ' + (i+1) + '/' + questions.length + '...', 20 + (i/questions.length) * (needImage ? 50 : 70));

      if (needImage && q.image_prompt && window.AiClient && window.AiClient.generateImage) {
        try {
          _aiGenShowProgress('生成配图 ' + (i+1) + '/' + questions.length + '...', 20 + (i/questions.length) * 50);
          var imgResult = await window.AiClient.generateImage({
            prompt: 'Educational biology diagram for exam question, white background, clear scientific illustration, textbook style, high quality, detailed: ' + q.image_prompt,
            size: '1024x1024'
          });
          if (imgResult && imgResult.url) {
            _aiGenShowProgress('上传配图到 Supabase Storage...', 20 + (i/questions.length) * 50 + 20);
            var uploadResult = await window.uploadQuestionImage(imgResult.url, qid);
            if (uploadResult && uploadResult.url) {
              item.chart = uploadResult.url;
            } else if (imgResult.url) {
              item.chart = imgResult.url;
            }
          }
        } catch(imgErr) {
          console.warn('[AI Gen] 生成/上传配图失败:', imgErr);
        }
      }

      generated.push(item);
    }

    _aiGenState.generatedQuestions = _aiGenState.generatedQuestions.concat(generated);
    _aiGenUpdateQueueUI();
    _aiGenShowProgress('完成！', 100);
    setTimeout(_aiGenHideProgress, 1000);
    _aiGenShowStatus('✅ 成功生成 ' + generated.length + ' 道题目！请预览后入库。', 'success');

  } catch(err) {
    console.error('[AI Gen] 生成失败:', err);
    _aiGenShowStatus('生成失败：' + (err.message || err), 'error', 8000);
    _aiGenHideProgress();
  } finally {
    btn.disabled = false;
    btn.style.opacity = '1';
    _aiGenState.generating = false;
  }
}

function _aiGenUpdateQueueUI() {
  var queue = document.getElementById('aigen-queue');
  var countEl = document.getElementById('aigen-count');
  var batchActions = document.getElementById('aigen-batch-actions');
  if (!queue || !countEl) return;

  var qs = _aiGenState.generatedQuestions;
  countEl.textContent = qs.length;

  if (batchActions) {
    batchActions.style.display = qs.length > 0 ? 'flex' : 'none';
  }

  if (qs.length === 0) {
    queue.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#999;font-size:13px;background:#f8f9fa;border-radius:12px;">配置左侧参数后点击「AI 生成题目」开始</div>';
    return;
  }

  queue.innerHTML = qs.map(function(q, idx) {
    var subHtml = '';
    if (Array.isArray(q.sub_questions)) {
      subHtml = q.sub_questions.map(function(sq, si) {
        var letter = sq.label || String.fromCharCode(65 + si);
        var ans = false;
        if (sq.answer !== undefined) ans = !!sq.answer;
        else if (sq.is_true !== undefined) ans = !!sq.is_true;
        var tfIcon = ans ? '✓' : '✗';
        var tfColor = ans ? '#2e7d32' : '#c62828';
        return '<div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;font-size:13px;border-bottom:1px dashed #eee;">' +
          '<span style="font-weight:600;color:#555;min-width:20px;">' + letter + '.</span>' +
          '<span style="flex:1;">' + escapeHtml(sq.text || '') + '</span>' +
          '<span style="color:' + tfColor + ';font-weight:600;">' + tfIcon + '</span>' +
        '</div>';
      }).join('');
    }

    var imgPreview = '';
    if (q.chart) {
      imgPreview = '<div style="margin:8px 0;"><img src="' + escapeHtml(q.chart) + '" style="max-width:100%;max-height:200px;border-radius:8px;border:1px solid #ddd;" alt="题目配图"></div>';
    } else if (q.image_prompt) {
      imgPreview = '<div style="margin:8px 0;padding:8px;background:#fff3e0;border-radius:6px;font-size:12px;color:#e65100;">⚠️ 配图未生成/上传</div>';
    }

    return '<div style="border:1px solid #e0e0e0;border-radius:10px;padding:14px;margin-bottom:10px;background:#fff;">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
          '<span style="padding:2px 8px;background:#e8f5e9;color:#2e7d32;border-radius:4px;font-size:11px;">AI生成</span>' +
          '<span style="padding:2px 8px;background:#e3f2fd;color:#1565c0;border-radius:4px;font-size:11px;">' + escapeHtml(q.module) + '</span>' +
          '<span style="padding:2px 8px;background:#f3e5f5;color:#7b1fa2;border-radius:4px;font-size:11px;">' + escapeHtml(q.difficulty) + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:6px;">' +
          '<button class="aigen-del-btn" data-idx="' + idx + '" style="padding:4px 10px;border:1px solid #ef9a9a;background:#ffebee;color:#c62828;border-radius:6px;cursor:pointer;font-size:12px;">删除</button>' +
          '<button class="aigen-approve-btn" data-idx="' + idx + '" style="padding:4px 10px;border:none;background:#5a7d5c;color:#fff;border-radius:6px;cursor:pointer;font-size:12px;">入库</button>' +
        '</div>' +
      '</div>' +
      '<div style="font-size:14px;margin-bottom:8px;line-height:1.5;">' + escapeHtml(q.question) + '</div>' +
      imgPreview +
      subHtml +
      '<div style="margin-top:8px;padding:8px;background:#f5f5f5;border-radius:6px;font-size:12px;color:#555;">' +
        '<strong>解析：</strong>' + escapeHtml(q.explanation || q.answer || '') +
      '</div>' +
      (q.subject ? '<div style="margin-top:4px;font-size:11px;color:#888;">学科：' + escapeHtml(q.subject) + ' | 概念：' + escapeHtml(q.concept || '') + '</div>' : '') +
    '</div>';
  }).join('');

  queue.querySelectorAll('.aigen-del-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      var idx = parseInt(e.target.getAttribute('data-idx'));
      _aiGenState.generatedQuestions.splice(idx, 1);
      _aiGenUpdateQueueUI();
    });
  });

  queue.querySelectorAll('.aigen-approve-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      var idx = parseInt(e.target.getAttribute('data-idx'));
      _aiGenApproveItem(idx);
    });
  });
}

async function _aiGenApproveItem(idx) {
  var q = _aiGenState.generatedQuestions[idx];
  if (!q) return;

  try {
    var subQuestions = [];
    var labels = ['A', 'B', 'C', 'D', 'E', 'F'];
    if (Array.isArray(q.sub_questions)) {
      for (var i = 0; i < q.sub_questions.length && i < 6; i++) {
        var sq = q.sub_questions[i];
        var ans = false;
        if (sq.answer !== undefined) ans = !!sq.answer;
        else if (sq.is_true !== undefined) ans = !!sq.is_true;
        subQuestions.push({
          label: sq.label || labels[i],
          text: sq.text || '',
          answer: ans
        });
      }
    }

    var moduleVal = q.module || 'module_1';
    if (moduleVal.match(/^module[0-9]$/)) {
      moduleVal = moduleVal.replace('module', 'module_');
    }

    var insertData = {
      id: q.id,
      module: moduleVal,
      type: q.type || 'mtf',
      question: q.question || '',
      subject: q.subject || '',
      concept: q.concept || '',
      difficulty: q.difficulty || 'medium',
      answer: q.answer || '',
      explanation: q.explanation || '',
      options: [],
      sub_questions: subQuestions,
      tags: q.tags || ['ai_generated', moduleVal],
      chart: q.chart || '',
      source: q.source || 'ai_generated'
    };

    var result = await window.sbInsert('questions', insertData);
    if (result.error) {
      throw new Error(result.error.message || JSON.stringify(result.error));
    }

    _aiGenState.generatedQuestions.splice(idx, 1);
    _aiGenUpdateQueueUI();
    _aiGenShowStatus('✓ 题目已成功入库到 Supabase！', 'success', 3000);
  } catch(err) {
    console.error('[AI Gen] 入库失败:', err);
    _aiGenShowStatus('入库失败：' + (err.message || err), 'error', 6000);
  }
}

async function _aiGenApproveAll() {
  if (_aiGenState.generatedQuestions.length === 0) return;
  if (!confirm('确认将 ' + _aiGenState.generatedQuestions.length + ' 道题目全部入库到 Supabase？')) return;

  var ok = 0, fail = 0;
  for (var i = _aiGenState.generatedQuestions.length - 1; i >= 0; i--) {
    try {
      await _aiGenApproveItem(i);
      ok++;
    } catch(e) {
      fail++;
    }
  }
  _aiGenShowStatus('批量入库完成：成功 ' + ok + ' 题，失败 ' + fail + ' 题', fail > 0 ? 'info' : 'success');
}

/* ===== 入口函数 ===== */
var _adminRenderGuard = false;
function renderAdminPage(target) {
  if (_adminRenderGuard) {
    console.warn('[Admin] renderAdminPage 重入检测，已阻止');
    return;
  }
  _adminRenderGuard = true;
  try {
    injectAdminStyles();
    if (_adminAuthenticated) {
      renderAdminDashboard(target);
    } else {
      renderAdminLoginPage(target);
    }
  } finally {
    _adminRenderGuard = false;
  }
}

var _adminInitGuard = false;
function initAdmin(target) {
  if (_adminInitGuard) {
    console.warn('[Admin] initAdmin 重入检测，已阻止');
    return;
  }
  _adminInitGuard = true;
  try {
    injectAdminStyles();
    if (!target) {
      if (typeof AppState !== 'undefined' && AppState.rootElement) {
        target = AppState.rootElement;
      } else {
        target = document.getElementById('page-content');
      }
    }
    renderAdminPage(target);
  } finally {
    _adminInitGuard = false;
  }
}

window.initAdmin = initAdmin;
window.renderAdminPage = renderAdminPage;
