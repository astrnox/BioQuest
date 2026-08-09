/**
 * ============================================================
 * BioQuest — 社区模块
 * 提供帖子发布、评论、点赞、标签筛选等功能
 * ============================================================
 */

(function () {
  'use strict';

  // 先暴露一个安全的 initCommunity，防止 IIFE 内部任何错误导致函数未定义
  function _initCommunitySafe(target) {
    if (!target) {
      if (typeof AppState !== 'undefined' && AppState.rootElement) {
        target = AppState.rootElement;
      } else {
        target = document.getElementById('page-content');
      }
    }
    if (target) {
      target.innerHTML = '<div style="text-align:center;padding:60px 20px;">' +
        '<p style="color:var(--color-error);font-size:1.1rem;margin-bottom:8px;">社区模块加载失败</p>' +
        '<p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:16px;">请刷新页面或稍后重试</p>' +
        '<button onclick="location.reload()" style="padding:8px 20px;background:var(--color-sage);color:#fff;border:none;border-radius:8px;cursor:pointer;">刷新页面</button>' +
        '</div>';
    }
  }
  window.initCommunity = _initCommunitySafe;

  // ===== 状态管理 =====
  var _communityState = {
    posts: [],
    currentPage: 1,
    totalPages: 1,
    totalPosts: 0,
    currentTag: '',
    activeTab: 'recommend',   // 'follow' | 'recommend' | 'hot'
    hasMore: true,
    loading: false,
    expandedPostId: null,
    commentsCache: {},
    commentsExpanded: {}      // { postId: true/false }  — 是否展开全部评论
  };

  var TAG_LIST = [
    { key: '', label: '全部', color: 'var(--color-sage)' },
    { key: '求助', label: '求助', color: '#e8a830' },
    { key: '经验分享', label: '经验分享', color: '#3a8c5c' },
    { key: '讨论', label: '讨论', color: '#5a7d5c' },
    { key: '笔记', label: '笔记', color: '#c4956a' }
  ];

  // ===== 工具函数 =====

  function _showToast(msg) {
    var existing = document.getElementById('community-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'community-toast';
    toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--color-error);color:#fff;padding:12px 24px;border-radius:12px;font-size:14px;z-index:10000;animation:fadeInUp 0.3s ease;max-width:90%;text-align:center;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 3000);
  }

  function _showAppealToast(msg, appealId) {
    var existing = document.getElementById('community-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'community-toast';
    toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--color-error);color:#fff;padding:14px 20px;border-radius:12px;font-size:14px;z-index:10000;animation:fadeInUp 0.3s ease;max-width:92%;text-align:center;display:flex;flex-direction:column;gap:10px;align-items:center;';
    toast.innerHTML = '<div>' + escapeHtml(msg) + '</div>' +
      '<button id="community-appeal-btn" style="background:#fff;color:var(--color-error);border:none;padding:6px 16px;border-radius:9999px;font-size:13px;font-weight:600;cursor:pointer;">我觉得被误判，提交申诉</button>';
    document.body.appendChild(toast);

    var appealBtn = document.getElementById('community-appeal-btn');
    if (appealBtn) {
      appealBtn.addEventListener('click', async function() {
        // 修复 P0-3：用模态对话框替代原生 prompt（项目硬约束）
        var note = await _showAppealModal();
        if (note === null) return;
        var updateFn = (typeof window.updateCRAppeal === 'function') ? window.updateCRAppeal : (typeof updateCRAppeal === 'function' ? updateCRAppeal : null);
        if (!updateFn || !appealId) {
          _showToast('申诉功能暂不可用');
          return;
        }
        var result = await updateFn(appealId, note);
        if (result && result.ok) {
          _showToast('申诉已提交，管理员复核后将恢复信用分');
        } else {
          _showToast('申诉提交失败：' + (result && result.error ? result.error : '未知错误'));
        }
      });
    }
    setTimeout(function() { if (toast.parentNode) toast.remove(); }, 8000);
  }

  /**
   * 申诉模态对话框（替代原生 prompt，遵循项目硬约束）
   * @returns {Promise<string|null>} 用户输入的申诉说明，null 表示取消
   */
  function _showAppealModal() {
    return new Promise(function(resolve) {
      // 移除已有模态
      var existing = document.getElementById('community-appeal-modal');
      if (existing) existing.remove();

      var overlay = document.createElement('div');
      overlay.id = 'community-appeal-modal';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px;';

      var panel = document.createElement('div');
      panel.style.cssText = 'background:var(--color-white,#fff);border-radius:var(--radius-lg,20px);box-shadow:var(--shadow-lg,0 8px 32px rgba(0,0,0,0.2));max-width:480px;width:100%;padding:24px;';
      panel.innerHTML =
        '<h3 style="margin:0 0 8px 0;font-size:1.15rem;color:var(--color-deep,#1a3a2a);">提交申诉</h3>' +
        '<p style="margin:0 0 16px 0;font-size:0.9rem;color:var(--text-secondary,#4a4a4a);">请说明为什么你认为这条内容没有违规（可选）</p>' +
        '<textarea id="community-appeal-input" rows="4" placeholder="例如：该内容是学术讨论，不含违规信息..." style="width:100%;box-sizing:border-box;padding:10px 14px;border:1px solid var(--border-default,#ddd);border-radius:var(--radius-sm,6px);font-size:0.9rem;font-family:inherit;resize:vertical;outline:none;"></textarea>' +
        '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">' +
          '<button id="community-appeal-cancel" type="button" style="padding:8px 18px;border:1px solid var(--border-default,#ddd);background:transparent;color:var(--text-secondary,#4a4a4a);border-radius:var(--radius-sm,6px);cursor:pointer;font-size:0.9rem;">取消</button>' +
          '<button id="community-appeal-submit" type="button" style="padding:8px 18px;border:none;background:var(--color-primary,#4a7c59);color:#fff;border-radius:var(--radius-sm,6px);cursor:pointer;font-size:0.9rem;font-weight:600;">提交申诉</button>' +
        '</div>';

      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      var input = document.getElementById('community-appeal-input');
      var cancelBtn = document.getElementById('community-appeal-cancel');
      var submitBtn = document.getElementById('community-appeal-submit');

      // 焦点陷阱：打开时聚焦输入框
      setTimeout(function() { if (input) input.focus(); }, 50);

      function close(value) {
        overlay.remove();
        document.removeEventListener('keydown', onKeydown);
        resolve(value);
      }
      function onKeydown(e) {
        if (e.key === 'Escape') { e.preventDefault(); close(null); }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); close(input.value || ''); }
      }
      cancelBtn.addEventListener('click', function() { close(null); });
      submitBtn.addEventListener('click', function() { close(input.value || ''); });
      overlay.addEventListener('click', function(e) { if (e.target === overlay) close(null); });
      document.addEventListener('keydown', onKeydown);
    });
  }

  var escapeHtml = window.escapeHtml;

  // 暴露给 admin 等模块调用
  window.renderMarkdown = renderMarkdown;
  window.communityEscapeHtml = escapeHtml;

  function renderMarkdown(text) {
    if (!text) return '';
    var html = escapeHtml(text);
    // Bold: **text** or __text__
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    // Italic: *text* or _text_ (but not inside words like some_text)
    html = html.replace(/\B\*(.+?)\*\B/g, '<em>$1</em>');
    html = html.replace(/\B_(.+?)_\B/g, '<em>$1</em>');
    // Code: `text`
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    // Images: ![alt](src) — must be before links
    // 懒加载策略：不直接加载图片，显示占位符，点击后加载（避免社区进入时大量图片请求导致卡顿）
    // 重要：占位符 div 不使用内联 onclick 字符串拼接（防止外层属性被注入的引号截断）
    html = html.replace(/!\[(.+?)\]\((.+?)\)/g, function (match, alt, src) {
      var safeSrc = src.trim();
      if (/^\s*(javascript|vbscript)\s*:/i.test(safeSrc)) return escapeHtml(alt);
      var dataUri = safeSrc.indexOf('data:') === 0;
      // data: 直接渲染（本地上传的小图），http(s) 走点击加载
      if (dataUri) {
        return '<img src="' + escapeHtml(safeSrc) + '" alt="' + escapeHtml(alt) + '" style="max-width:100%;max-height:480px;object-fit:contain;border-radius:8px;margin:8px 0;cursor:pointer;loading:lazy;" class="community-img-clickable">';
      }
      return '<div class="community-img-placeholder" data-img-src="' + escapeHtml(safeSrc) + '" data-img-alt="' + escapeHtml(alt) + '" ' +
        'style="display:flex;align-items:center;justify-content:center;gap:8px;padding:24px;margin:8px 0;border:1px dashed var(--border-light,#ddd);border-radius:8px;cursor:pointer;color:var(--text-muted,#8a8a8a);font-size:0.85rem;background:var(--color-cream-dark,#f9fafb);transition:all 0.2s;">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>' +
        '<span>点击加载图片</span></div>';
    });
    // Links: [text](url) — 过滤 javascript: 等危险协议防 XSS
    // 安全修复（P1 XSS）：URL 必须先转义再插入 href 属性，防止 " 字符截断属性造成属性注入
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, function (match, text, url) {
      var trimmed = url.trim();
      if (/^\s*(javascript|data|vbscript)\s*:/i.test(trimmed)) {
        return text; // 移除危险链接，仅保留文本
      }
      // 仅允许 http/https/相对路径/mailto，其他协议一律拒绝
      if (!/^(https?:\/\/|mailto:|\/|#|\.)/i.test(trimmed)) {
        return text;
      }
      var safeHref = trimmed.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return '<a href="' + safeHref + '" target="_blank" rel="noopener noreferrer nofollow">' + text + '</a>';
    });
    // Headers: # text (must be at start of line)
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
    // Lists: - item or * item
    html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    // Blockquotes: > text
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    // Clean up <br> inside block elements
    html = html.replace(/<h([234])><br>/g, '<h$1>');
    html = html.replace(/<\/h([234])><br>/g, '</h$1>');
    html = html.replace(/<ul><br>/g, '<ul>');
    html = html.replace(/<\/ul><br>/g, '</ul>');
    html = html.replace(/<li><br>/g, '<li>');
    html = html.replace(/<blockquote><br>/g, '<blockquote>');
    html = html.replace(/<\/blockquote><br>/g, '</blockquote>');
    return html;
  }

  function relativeTime(dateStr) {
    if (!dateStr) return '';
    var now = Date.now();
    var then = new Date(dateStr).getTime();
    if (isNaN(then)) return dateStr;
    var diff = Math.max(0, now - then);
    var seconds = Math.floor(diff / 1000);
    if (seconds < 60) return '刚刚';
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + '分钟前';
    var hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + '小时前';
    var days = Math.floor(hours / 24);
    if (days < 30) return days + '天前';
    var months = Math.floor(days / 30);
    if (months < 12) return months + '个月前';
    return Math.floor(months / 12) + '年前';
  }

  function getAvatarColor(name) {
    var colors = ['#3a8c5c', '#5a7d5c', '#c4956a', '#e8a830', '#2d5a3f', '#8ba888', '#c0553a', '#d4a574'];
    var hash = 0;
    for (var i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  function getInitial(name) {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  }

  function isUserLoggedIn() {
    return typeof isLoggedIn === 'function' && isLoggedIn();
  }

  function getCurrentUserInfo() {
    if (typeof getCurrentUser === 'function') {
      var user = getCurrentUser();
      if (user) return { username: user.username || '', display_name: user.display_name || user.username || '' };
    }
    return { username: '', display_name: '' };
  }

  // ===== 样式注入 =====

  function injectCommunityStyles() {
    var styleId = 'community-styles';
    if (document.getElementById(styleId)) return;

    var style = document.createElement('style');
    style.id = styleId;
    style.textContent = '\
      /* ===== 社区页面布局（双栏） ===== */\
      .community-page {\
        max-width: 1040px;\
        margin: 0 auto;\
        padding: 32px 20px 60px;\
        display: flex;\
        gap: 28px;\
        align-items: flex-start;\
      }\
\
      .community-main {\
        flex: 1;\
        min-width: 0;\
      }\
\
      .community-sidebar {\
        width: 280px;\
        flex-shrink: 0;\
        display: flex;\
        flex-direction: column;\
        gap: 16px;\
        position: sticky;\
        top: 88px;\
      }\
\
      .community-sidebar-card {\
        background: var(--surface-primary);\
        border: 1px solid var(--border-light);\
        border-radius: var(--radius-md);\
        padding: 18px;\
      }\
\
      .community-sidebar-card-title {\
        font-size: 0.88rem;\
        font-weight: 600;\
        color: var(--text-primary);\
        margin: 0 0 12px 0;\
        padding-bottom: 10px;\
        border-bottom: 1px solid var(--border-light);\
        display: flex;\
        align-items: center;\
        gap: 6px;\
      }\
\
      .community-hot-tag {\
        display: inline-flex;\
        align-items: center;\
        gap: 4px;\
        padding: 5px 12px;\
        border-radius: var(--radius-full);\
        font-size: 0.78rem;\
        cursor: pointer;\
        border: 1px solid transparent;\
        transition: all 0.15s ease;\
        margin: 3px;\
      }\
\
      .community-hot-tag:hover {\
        transform: translateY(-1px);\
      }\
\
      .community-sidebar-stat {\
        display: flex;\
        justify-content: space-between;\
        align-items: center;\
        padding: 8px 0;\
        font-size: 0.82rem;\
        color: var(--text-secondary);\
      }\
\
      .community-sidebar-stat-value {\
        font-weight: 600;\
        color: var(--text-primary);\
      }\
\
      .community-sidebar-guide {\
        font-size: 0.8rem;\
        color: var(--text-muted);\
        line-height: 1.6;\
      }\
\
      .community-sidebar-guide li {\
        margin-bottom: 4px;\
      }\
\
      /* ===== 顶部栏 ===== */\
      .community-header {\
        display: flex;\
        align-items: center;\
        justify-content: space-between;\
        margin-bottom: 20px;\
      }\
\
      .community-title {\
        font-family: var(--font-serif, "Noto Serif SC", serif);\
        font-size: 1.6rem;\
        font-weight: 700;\
        color: var(--text-primary);\
        margin: 0;\
      }\
\
      .community-post-btn {\
        background: var(--color-sage);\
        color: #fff;\
        border: none;\
        padding: 9px 22px;\
        border-radius: var(--radius-full);\
        font-size: 0.88rem;\
        font-weight: 500;\
        cursor: pointer;\
        transition: all 0.2s ease;\
        display: flex;\
        align-items: center;\
        gap: 6px;\
      }\
\
      .community-post-btn:hover {\
        transform: translateY(-1px);\
        box-shadow: 0 4px 14px rgba(90, 125, 92, 0.35);\
      }\
\
      .community-login-banner {\
        background: linear-gradient(135deg, rgba(90,125,92,0.06), rgba(90,125,92,0.02));\
        border: 1px solid rgba(90,125,92,0.15);\
        border-radius: var(--radius-md);\
        padding: 14px 18px;\
        margin-bottom: 18px;\
        display: flex;\
        align-items: center;\
        justify-content: space-between;\
        gap: 12px;\
      }\
\
      .community-login-banner-text {\
        font-size: 0.85rem;\
        color: var(--text-secondary);\
      }\
\
      .community-login-banner-btn {\
        background: var(--color-sage);\
        color: #fff;\
        border: none;\
        padding: 7px 18px;\
        border-radius: var(--radius-full);\
        font-size: 0.8rem;\
        font-weight: 500;\
        cursor: pointer;\
        white-space: nowrap;\
        transition: all 0.2s ease;\
      }\
\
      .community-login-banner-btn:hover {\
        box-shadow: 0 2px 8px rgba(90, 125, 92, 0.3);\
      }\
\
      /* ===== 标签筛选 ===== */\
      .community-tags {\
        display: flex;\
        gap: 8px;\
        margin-bottom: 20px;\
        overflow-x: auto;\
        padding-bottom: 4px;\
        -webkit-overflow-scrolling: touch;\
      }\
\
      .community-tags::-webkit-scrollbar {\
        display: none;\
      }\
\
      .community-tag-chip {\
        padding: 6px 16px;\
        border-radius: var(--radius-full);\
        font-size: 0.82rem;\
        font-weight: 500;\
        cursor: pointer;\
        border: 1.5px solid var(--border-default);\
        background: var(--surface-primary);\
        color: var(--text-secondary);\
        transition: all 0.2s ease;\
        white-space: nowrap;\
        user-select: none;\
      }\
\
      .community-tag-chip:hover {\
        border-color: var(--color-sage);\
        color: var(--color-sage);\
      }\
\
      .community-tag-chip.active {\
        background: var(--color-sage);\
        color: #fff;\
        border-color: var(--color-sage);\
      }\
\
      /* ===== 知乎风格 Tab 栏 ===== */\
      .community-tab-bar {\
        display: flex;\
        gap: 0;\
        margin-bottom: 20px;\
        border-bottom: 1px solid var(--border-light);\
        position: relative;\
      }\
\
      .community-tab-item {\
        padding: 10px 20px;\
        font-size: 0.92rem;\
        font-weight: 500;\
        color: var(--text-muted);\
        cursor: pointer;\
        border: none;\
        background: none;\
        transition: color 0.2s ease;\
        position: relative;\
        white-space: nowrap;\
      }\
\
      .community-tab-item:hover {\
        color: var(--text-primary);\
      }\
\
      .community-tab-item.active {\
        color: var(--text-primary);\
        font-weight: 600;\
      }\
\
      .community-tab-item.active::after {\
        content: "";\
        position: absolute;\
        bottom: -1px;\
        left: 50%;\
        transform: translateX(-50%);\
        width: 24px;\
        height: 3px;\
        background: var(--color-sage);\
        border-radius: 2px;\
      }\
\
      /* ===== 帖子列表 ===== */\
      .community-feed {\
        display: flex;\
        flex-direction: column;\
        gap: 0;\
      }\
\
      /* 知乎风格帖子卡片 */\
      .community-post-card {\
        background: var(--surface-primary);\
        display: flex;\
        gap: 0;\
        padding: 16px 0;\
        border-bottom: 1px solid var(--border-light);\
        transition: background 0.15s ease;\
        cursor: default;\
      }\
\
      .community-post-card:hover {\
        background: rgba(0,0,0,0.01);\
      }\
\
      .community-post-card.pinned {\
        background: linear-gradient(135deg, rgba(196,149,106,0.03), var(--surface-primary));\
        border-left: 0;\
      }\
\
      /* 左侧投票栏 */\
      .community-post-vote {\
        width: 52px;\
        flex-shrink: 0;\
        display: flex;\
        flex-direction: column;\
        align-items: center;\
        padding-top: 6px;\
        gap: 2px;\
        user-select: none;\
      }\
\
      .community-vote-btn {\
        width: 30px;\
        height: 30px;\
        border: none;\
        background: transparent;\
        cursor: pointer;\
        border-radius: 50%;\
        display: flex;\
        align-items: center;\
        justify-content: center;\
        color: var(--text-muted);\
        transition: all 0.15s ease;\
        padding: 0;\
      }\
\
      .community-vote-btn:hover {\
        background: rgba(90,125,92,0.08);\
        color: var(--color-sage);\
      }\
\
      .community-vote-btn.voted {\
        color: var(--color-sage);\
        background: rgba(90,125,92,0.1);\
      }\
\
      .community-vote-count {\
        font-size: 0.85rem;\
        font-weight: 600;\
        color: var(--text-primary);\
        line-height: 1.2;\
        min-width: 20px;\
        text-align: center;\
      }\
\
      .community-vote-count.voted {\
        color: var(--color-sage);\
      }\
\
      /* 右侧内容区 */\
      .community-post-body {\
        flex: 1;\
        min-width: 0;\
        padding-right: 4px;\
      }\
\
      .community-post-header {\
        display: flex;\
        align-items: center;\
        gap: 8px;\
        margin-bottom: 8px;\
      }\
\
      .community-avatar {\
        width: 24px;\
        height: 24px;\
        border-radius: 50%;\
        display: flex;\
        align-items: center;\
        justify-content: center;\
        color: #fff;\
        font-size: 0.65rem;\
        font-weight: 600;\
        flex-shrink: 0;\
      }\
\
      .community-post-author {\
        font-size: 0.82rem;\
        font-weight: 600;\
        color: var(--text-primary);\
      }\
\
      .community-post-badge {\
        font-size: 0.65rem;\
        padding: 1px 7px;\
        border-radius: var(--radius-full);\
        font-weight: 500;\
        white-space: nowrap;\
      }\
\
      .community-post-badge.pin-badge {\
        background: rgba(196,149,106,0.12);\
        color: var(--color-amber, #c4956a);\
      }\
\
      .community-post-badge.hot-badge {\
        background: rgba(232,168,48,0.12);\
        color: #e8a830;\
      }\
\
      .community-post-time {\
        font-size: 0.72rem;\
        color: var(--text-muted);\
        margin-left: auto;\
        white-space: nowrap;\
      }\
\
      .community-post-content {\
        font-size: 0.92rem;\
        line-height: 1.75;\
        color: var(--text-primary);\
        margin-bottom: 8px;\
        word-break: break-word;\
        cursor: pointer;\
      }\
\
      .community-post-content:hover {\
        color: var(--text-secondary);\
      }\
\
      .community-post-tags {\
        display: flex;\
        gap: 6px;\
        flex-wrap: wrap;\
        margin-bottom: 10px;\
      }\
\
      .community-post-tag {\
        font-size: 0.72rem;\
        padding: 2px 8px;\
        border-radius: var(--radius-full);\
        font-weight: 500;\
        transition: all 0.15s ease;\
        cursor: pointer;\
      }\
\
      .community-post-tag:hover {\
        filter: brightness(0.95);\
      }\
\
      /* 底部操作栏 */\
      .community-post-actions {\
        display: flex;\
        gap: 28px;\
        align-items: center;\
      }\
\
      .community-action-btn {\
        display: flex;\
        align-items: center;\
        gap: 4px;\
        background: none;\
        border: none;\
        color: var(--text-muted);\
        font-size: 0.8rem;\
        cursor: pointer;\
        padding: 2px 0;\
        transition: color 0.15s ease;\
      }\
\
      .community-action-btn:hover {\
        color: var(--color-sage);\
      }\
\
      .community-action-btn.liked {\
        color: #e8a830;\
      }\
\
      .community-action-btn svg {\
        width: 16px;\
        height: 16px;\
      }\
\
      /* 评论区域 */\
      .community-comments-inline {\
        margin-top: 10px;\
        padding: 10px 12px;\
        background: var(--surface-secondary, #fafaf8);\
        border-radius: 8px;\
      }\
\
      .community-comment {\
        display: flex;\
        gap: 8px;\
        margin-bottom: 10px;\
      }\
\
      .community-comment:last-child {\
        margin-bottom: 0;\
      }\
\
      .community-comment-avatar {\
        width: 22px;\
        height: 22px;\
        border-radius: 50%;\
        display: flex;\
        align-items: center;\
        justify-content: center;\
        color: #fff;\
        font-size: 0.6rem;\
        font-weight: 600;\
        flex-shrink: 0;\
      }\
\
      .community-comment-body {\
        flex: 1;\
        min-width: 0;\
      }\
\
      .community-comment-author {\
        font-size: 0.78rem;\
        font-weight: 600;\
        color: var(--text-primary);\
      }\
\
      .community-comment-text {\
        font-size: 0.84rem;\
        color: var(--text-secondary);\
        line-height: 1.55;\
        word-break: break-word;\
      }\
\
      .community-comment-time {\
        font-size: 0.68rem;\
        color: var(--text-muted);\
        margin-top: 2px;\
      }\
\
      /* 展开全部评论 */\
      .community-expand-comments-btn {\
        display: block;\
        width: 100%;\
        padding: 8px 0;\
        margin-top: 8px;\
        background: none;\
        border: none;\
        border-top: 1px solid var(--border-light);\
        color: var(--text-muted);\
        font-size: 0.8rem;\
        cursor: pointer;\
        transition: color 0.15s ease;\
        text-align: center;\
      }\
\
      .community-expand-comments-btn:hover {\
        color: var(--color-sage);\
      }\
\
      /* 评论输入 */\
      .community-comment-input-area {\
        display: flex;\
        gap: 8px;\
        margin-top: 10px;\
      }\
\
      .community-comment-input {\
        flex: 1;\
        padding: 7px 12px;\
        border: 1px solid var(--border-light);\
        border-radius: 20px;\
        font-size: 0.82rem;\
        background: var(--surface-secondary, #fafaf8);\
        color: var(--text-primary);\
        outline: none;\
        transition: border-color 0.2s ease;\
      }\
\
      .community-comment-input:focus {\
        border-color: var(--color-sage);\
        background: var(--surface-primary);\
      }\
\
      .community-comment-submit {\
        background: var(--color-sage);\
        color: #fff;\
        border: none;\
        padding: 7px 14px;\
        border-radius: 20px;\
        font-size: 0.8rem;\
        font-weight: 500;\
        cursor: pointer;\
        transition: all 0.2s ease;\
        white-space: nowrap;\
      }\
\
      .community-comment-submit:hover {\
        box-shadow: 0 2px 8px rgba(90, 125, 92, 0.3);\
      }\
\
      /* 浮动发布按钮 */\
      .community-float-publish {\
        position: fixed;\
        bottom: 32px;\
        right: 32px;\
        z-index: 9999;\
        width: 52px;\
        height: 52px;\
        border-radius: 50%;\
        background: var(--color-sage);\
        color: #fff;\
        border: none;\
        cursor: pointer;\
        display: flex;\
        align-items: center;\
        justify-content: center;\
        box-shadow: 0 4px 16px rgba(90,125,92,0.4);\
        transition: all 0.25s ease;\
      }\
\
      .community-float-publish:hover {\
        transform: translateY(-2px) scale(1.05);\
        box-shadow: 0 6px 22px rgba(90,125,92,0.5);\
      }\
\
      .community-float-publish svg {\
        width: 22px;\
        height: 22px;\
      }\
\
      /* 发帖弹窗 */\
      .community-compose-overlay {\
        position: fixed;\
        inset: 0;\
        z-index: 10000;\
        display: flex;\
        align-items: center;\
        justify-content: center;\
        background: rgba(5, 10, 7, 0.5);\
        backdrop-filter: blur(8px);\
        animation: communityFadeIn 0.2s ease;\
      }\
\
      .community-compose-overlay.closing {\
        animation: communityFadeOut 0.15s ease forwards;\
      }\
\
      @keyframes communityFadeIn {\
        from { opacity: 0; }\
        to { opacity: 1; }\
      }\
\
      @keyframes communityFadeOut {\
        from { opacity: 1; }\
        to { opacity: 0; }\
      }\
\
      .community-compose-modal {\
        width: 90vw;\
        max-width: 520px;\
        background: var(--surface-primary);\
        border-radius: var(--radius-lg);\
        padding: 28px 24px 20px;\
        box-shadow: var(--shadow-lg);\
        animation: communitySlideUp 0.25s ease;\
      }\
\
      @keyframes communitySlideUp {\
        from { opacity: 0; transform: translateY(16px); }\
        to { opacity: 1; transform: translateY(0); }\
      }\
\
      .community-compose-header {\
        display: flex;\
        align-items: center;\
        justify-content: space-between;\
        margin-bottom: 16px;\
      }\
\
      .community-compose-title {\
        font-size: 1.1rem;\
        font-weight: 600;\
        color: var(--text-primary);\
      }\
\
      .community-compose-close {\
        width: 32px;\
        height: 32px;\
        border: none;\
        background: var(--surface-secondary);\
        border-radius: 50%;\
        font-size: 1.2rem;\
        cursor: pointer;\
        display: flex;\
        align-items: center;\
        justify-content: center;\
        color: var(--text-muted);\
        transition: all 0.15s ease;\
      }\
\
      .community-compose-close:hover {\
        background: var(--border-light);\
        color: var(--text-primary);\
      }\
\
      .community-compose-textarea {\
        width: 100%;\
        min-height: 140px;\
        padding: 12px;\
        border: 1.5px solid var(--border-default);\
        border-radius: var(--radius-sm);\
        font-size: 0.9rem;\
        font-family: inherit;\
        resize: vertical;\
        background: var(--surface-secondary);\
        color: var(--text-primary);\
        outline: none;\
        box-sizing: border-box;\
        transition: border-color 0.2s ease;\
      }\
\
      .community-compose-textarea:focus {\
        border-color: var(--color-sage);\
        background: var(--surface-primary);\
      }\
\
      .community-compose-tags-area {\
        margin-top: 12px;\
        display: flex;\
        flex-wrap: wrap;\
        gap: 6px;\
        align-items: center;\
      }\
\
      .community-compose-tag-option {\
        padding: 4px 12px;\
        border-radius: var(--radius-full);\
        font-size: 0.78rem;\
        cursor: pointer;\
        border: 1.5px solid var(--border-default);\
        background: var(--surface-primary);\
        color: var(--text-secondary);\
        transition: all 0.15s ease;\
        user-select: none;\
      }\
\
      .community-compose-tag-option.selected {\
        background: var(--color-sage);\
        color: #fff;\
        border-color: var(--color-sage);\
      }\
\
      .community-compose-footer {\
        display: flex;\
        justify-content: flex-end;\
        gap: 10px;\
        margin-top: 16px;\
      }\
\
      .community-compose-cancel {\
        padding: 8px 18px;\
        border: 1.5px solid var(--border-default);\
        background: transparent;\
        color: var(--text-secondary);\
        border-radius: var(--radius-full);\
        font-size: 0.85rem;\
        cursor: pointer;\
      }\
\
      .community-compose-submit-btn {\
        padding: 8px 22px;\
        border: none;\
        background: var(--color-sage);\
        color: #fff;\
        border-radius: var(--radius-full);\
        font-size: 0.85rem;\
        font-weight: 500;\
        cursor: pointer;\
        transition: all 0.2s ease;\
      }\
\
      .community-compose-submit-btn:hover {\
        box-shadow: 0 2px 10px rgba(90,125,92,0.3);\
      }\
\
      .community-compose-submit-btn:disabled {\
        opacity: 0.5;\
        cursor: not-allowed;\
      }\
\
      .community-compose-toolbar {\
        display: flex;\
        align-items: center;\
        gap: 8px;\
        margin-top: 10px;\
      }\
\
      .community-compose-img-btn {\
        padding: 6px 14px;\
        border: 1px solid var(--border-default);\
        background: var(--surface-secondary);\
        color: var(--text-secondary);\
        border-radius: var(--radius-sm);\
        font-size: 0.82rem;\
        cursor: pointer;\
        transition: all 0.15s ease;\
      }\
\
      .community-compose-img-btn:hover {\
        border-color: var(--color-sage);\
        color: var(--color-sage);\
      }\
\
      .community-md-btn:hover {\
        background: rgba(90,125,92,0.1) !important;\
        color: var(--color-sage) !important;\
      }\
\
      /* 空状态 */\
      .community-empty {\
        text-align: center;\
        padding: 50px 20px;\
        color: var(--text-muted);\
      }\
\
      .community-empty-icon {\
        width: 64px;\
        height: 64px;\
        margin: 0 auto 16px;\
        border-radius: 50%;\
        background: var(--surface-secondary);\
        display: flex;\
        align-items: center;\
        justify-content: center;\
        font-size: 28px;\
      }\
\
      .community-empty-title {\
        font-size: 1rem;\
        font-weight: 600;\
        color: var(--text-secondary);\
        margin-bottom: 6px;\
      }\
\
      .community-empty-desc {\
        font-size: 0.85rem;\
        color: var(--text-muted);\
      }\
\
      /* 骨架屏 */\
      .community-skeleton {\
        background: var(--surface-primary);\
        border: 1px solid var(--border-light);\
        border-radius: var(--radius-md);\
        padding: 20px 22px;\
      }\
\
      .community-skeleton-header {\
        display: flex;\
        align-items: center;\
        gap: 10px;\
        margin-bottom: 12px;\
      }\
\
      .community-skeleton-avatar {\
        width: 38px;\
        height: 38px;\
        border-radius: 50%;\
        background: var(--surface-secondary);\
        animation: communityShimmer 1.5s infinite;\
      }\
\
      .community-skeleton-name {\
        width: 80px;\
        height: 14px;\
        border-radius: 4px;\
        background: var(--surface-secondary);\
        animation: communityShimmer 1.5s infinite;\
      }\
\
      .community-skeleton-line {\
        height: 13px;\
        border-radius: 4px;\
        background: var(--surface-secondary);\
        animation: communityShimmer 1.5s infinite;\
        margin-bottom: 8px;\
      }\
\
      .community-skeleton-line:last-child {\
        width: 60%;\
        margin-bottom: 0;\
      }\
\
      @keyframes communityShimmer {\
        0% { opacity: 0.5; }\
        50% { opacity: 0.8; }\
        100% { opacity: 0.5; }\
      }\
\
      /* 加载更多（保留兼容） */\
      .community-load-more {\
        text-align: center;\
        margin-top: 20px;\
      }\
\
      .community-load-more-btn {\
        background: var(--surface-secondary);\
        border: 1px solid var(--border-default);\
        color: var(--text-secondary);\
        padding: 10px 32px;\
        border-radius: var(--radius-full);\
        font-size: 0.85rem;\
        cursor: pointer;\
        transition: all 0.2s ease;\
      }\
\
      .community-load-more-btn:hover {\
        background: var(--surface-primary);\
        border-color: var(--color-sage);\
        color: var(--color-sage);\
      }\
\
      /* 分页器 */\
      .community-pagination {\
        display: flex;\
        justify-content: center;\
        align-items: center;\
        gap: 6px;\
        margin-top: 24px;\
        padding: 16px 0;\
        flex-wrap: wrap;\
      }\
      .community-page-btn {\
        padding: 6px 12px;\
        border: 1px solid var(--border-light, #ddd);\
        background: var(--surface-primary, #fff);\
        color: var(--text-secondary, #4a4a4a);\
        border-radius: 8px;\
        font-size: 0.82rem;\
        cursor: pointer;\
        transition: all 0.15s ease;\
        min-width: 36px;\
      }\
      .community-page-btn:hover:not(.disabled):not(:disabled) {\
        border-color: var(--color-sage, #5a7d5c);\
        color: var(--color-sage, #5a7d5c);\
      }\
      .community-page-btn.active {\
        background: var(--color-sage, #5a7d5c);\
        color: #fff;\
        border-color: var(--color-sage, #5a7d5c);\
      }\
      .community-page-btn.disabled, .community-page-btn:disabled {\
        opacity: 0.4;\
        cursor: not-allowed;\
      }\
      .community-page-ellipsis {\
        color: var(--text-muted, #8a8a8a);\
        padding: 0 4px;\
      }\
      .community-page-info {\
        color: var(--text-muted, #8a8a8a);\
        font-size: 0.78rem;\
        margin-left: 8px;\
      }\
\
      /* 响应式 */\
      @media (max-width: 860px) {\
        .community-sidebar {\
          display: none;\
        }\
\
        .community-page {\
          padding: 24px 16px 48px;\
        }\
\
        .community-post-card {\
          padding: 14px 0;\
        }\
\
        .community-post-vote {\
          width: 40px;\
        }\
\
        .community-float-publish {\
          bottom: 24px;\
          right: 20px;\
          width: 46px;\
          height: 46px;\
        }\
      }\
\
      @media (max-width: 640px) {\
        .community-title {\
          font-size: 1.35rem;\
        }\
\
        .community-post-vote {\
          width: 36px;\
        }\
\
        .community-vote-btn {\
          width: 24px;\
          height: 24px;\
        }\
\
        .community-vote-count {\
          font-size: 0.75rem;\
        }\
\
        .community-post-content {\
          font-size: 0.88rem;\
        }\
\
        .community-post-actions {\
          gap: 16px;\
          flex-wrap: wrap;\
        }\
\
        .community-action-btn span {\
          font-size: 0.75rem;\
        }\
\
        .community-comment-input-area {\
          flex-wrap: wrap;\
        }\
\
        .community-comment-submit {\
          width: 100%;\
          text-align: center;\
        }\
\
        .community-tab-item {\
          padding: 8px 14px;\
          font-size: 0.85rem;\
        }\
\
        .community-float-publish {\
          bottom: 20px;\
          right: 16px;\
          width: 44px;\
          height: 44px;\
        }\
\
        .community-compose-modal {\
          width: 95vw;\
          padding: 20px 16px 16px;\
          margin: 10px;\
          max-height: 90vh;\
          overflow-y: auto;\
        }\
\
        .community-header {\
          flex-wrap: wrap;\
          gap: 10px;\
        }\
\
        .community-post-btn {\
          padding: 8px 16px;\
          font-size: 0.82rem;\
        }\
      }\
    ';
    document.head.appendChild(style);
  }

  // ===== 示例数据（后端不可用时使用） =====

  var _SAMPLE_POSTS = [
    {
      id: 'sample-1',
      author: { display_name: '生物竞赛达人', username: 'bio_master' },
      content: '分享一下我的**细胞呼吸**学习笔记：有氧呼吸分为三个阶段，糖酵解、柠檬酸循环和氧化磷酸化。其中**ATP产量最多**的是第三阶段，通过电子传递链产生大量ATP。建议配合代谢图一起记忆！',
      tags: ['经验分享', '笔记'],
      likes: 42,
      comment_count: 8,
      liked_by_me: false,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'sample-2',
      author: { display_name: '生竞萌新', username: 'bio_newbie' },
      content: '**求助**：遗传学中的连锁互换率怎么计算？如果两个基因之间的交换率是15%，那么F2代中重组型的比例是多少？求大佬指点！',
      tags: ['求助'],
      likes: 12,
      comment_count: 5,
      liked_by_me: false,
      created_at: new Date(Date.now() - 3600000 * 8).toISOString()
    },
    {
      id: 'sample-3',
      author: { display_name: '实验小能手', username: 'lab_lover' },
      content: '关于**光合作用**的光反应和暗反应，我整理了一个对比表：\n\n| | 光反应 | 暗反应 |\n|---|---|---|\n| 场所 | 类囊体薄膜 | 叶绿体基质 |\n| 条件 | 光、色素、酶 | 酶、ATP、[H] |\n| 产物 | O₂、ATP、[H] | 有机物、C₅ |\n\n希望对大家有帮助~',
      tags: ['笔记', '经验分享'],
      likes: 67,
      comment_count: 14,
      liked_by_me: false,
      created_at: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      id: 'sample-4',
      author: { display_name: '生态观察者', username: 'eco_watcher' },
      content: '讨论一下种群增长模型：**"S"型曲线**的K值（环境容纳量）在实际生态中如何测定？我们实验室用的是标记重捕法，但误差好像挺大的，大家有什么好方法吗？',
      tags: ['讨论'],
      likes: 23,
      comment_count: 11,
      liked_by_me: false,
      created_at: new Date(Date.now() - 3600000 * 48).toISOString()
    }
  ];

  // ===== API 调用 =====

  async function fetchPosts(page, tag) {
    // 使用 Supabase 直连
    if (typeof window.getCommunityPosts === 'function' && typeof window.getSupabase === 'function') {
      var sb = window.getSupabase();
      if (sb) {
        var result = await window.getCommunityPosts(page, tag);
        if (result && result.posts && result.posts.length > 0) {
          return result;
        }
        // 修复 P1-5：Supabase 返回空结果时降级到本地 seed 数据，避免冷启动死寂
        return _loadSeedPosts(page, tag);
      }
    }
    // Supabase 未配置 → 直接走 seed
    return _loadSeedPosts(page, tag);
  }

  /**
   * 从 data/community.json 加载种子帖（修复 P1-5 社区冷启动）
   * 仅在 Supabase 无数据时使用，不替代真实社区
   */
  var _seedCache = null;
  function _loadSeedPosts(page, tag) {
    page = page || 1;
    return new Promise(function (resolve) {
      function applyFilter(data) {
        var posts = (data && data.posts) || [];
        if (tag && tag !== 'all') {
          posts = posts.filter(function (p) { return p.tags && p.tags.indexOf(tag) >= 0; });
        }
        // 按置顶 + 时间排序
        posts.sort(function (a, b) {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          return new Date(b.created_at) - new Date(a.created_at);
        });
        var pageSize = 7;
        var start = (page - 1) * pageSize;
        var paged = posts.slice(start, start + pageSize);
        resolve({ posts: paged, has_more: start + pageSize < posts.length, total: posts.length });
      }
      if (_seedCache) { applyFilter(_seedCache); return; }
      fetch('data/community.json?v=20260629a', { cache: 'force-cache' })
        .then(function (r) { return r.json(); })
        .then(function (data) { _seedCache = data; applyFilter(data); })
        .catch(function () { resolve({ posts: [], has_more: false }); });
    });
  }

  async function createPost(content, tags) {
    // 使用 Supabase 直连
    if (typeof window.createCommunityPost === 'function' && typeof window.getSupabase === 'function') {
      var sb = window.getSupabase();
      if (sb) {
        try {
          var result = await window.createCommunityPost(content, tags);
          // 兼容旧版返回布尔值
          var ok = (result && typeof result === 'object') ? result.ok : !!result;
          if (ok) {
            // 触发社区成就 - 查询用户实际发帖数
            if (typeof window.checkAchievement === 'function') {
              try {
                var sb2 = typeof window.getSupabase === 'function' ? window.getSupabase() : null;
                var user = typeof window.getCurrentUser === 'function' ? window.getCurrentUser() : null;
                if (sb2 && user) {
                  var { count } = await sb2.from('community_posts')
                    .select('id', { count: 'exact', head: true })
                    .eq('author_id', user.id);
                  window.checkAchievement('community', count || 1);
                } else {
                  window.checkAchievement('community', 1);
                }
              } catch (e) {
                window.checkAchievement('community', 1);
              }
            }
            return true;
          }
          // 不文明检测导致的失败，提供申诉入口
          if (result && result.appeal_id) {
            _showAppealToast((result && result.error) ? result.error : '发帖失败，请稍后重试', result.appeal_id);
          } else {
            _showToast((result && result.error) ? result.error : '发帖失败，请稍后重试');
          }
          return false;
        } catch (e) {
          _showToast('发帖出错，请稍后重试');
          return false;
        }
      }
    }
    // Supabase 未配置
    _showToast('Supabase 未配置，无法发帖');
    return false;
  }

  async function toggleLike(postId) {
    // 使用 Supabase 直连
    if (typeof window.togglePostLike === 'function' && typeof window.getSupabase === 'function') {
      var sb = window.getSupabase();
      if (sb) {
        var result = await window.togglePostLike(postId);
        if (result !== null) {
          return result;
        }
      }
    }
    return null;
  }

  async function fetchComments(postId) {
    // 使用 Supabase 直连
    if (typeof window.getPostComments === 'function' && typeof window.getSupabase === 'function') {
      var sb = window.getSupabase();
      if (sb) {
        var result = await window.getPostComments(postId);
        if (result && result.comments) {
          return result;
        }
        // Supabase 可用但返回空结果
        return { comments: [] };
      }
    }
    return null;
  }

  async function addComment(postId, content) {
    // 使用 Supabase 直连
    if (typeof window.addPostComment === 'function' && typeof window.getSupabase === 'function') {
      var sb = window.getSupabase();
      if (sb) {
        try {
          var result = await window.addPostComment(postId, content);
          // 兼容旧版返回布尔值
          var ok = (result && typeof result === 'object') ? result.ok : !!result;
          if (ok) {
            return true;
          }
          // 不文明检测导致的失败，提供申诉入口
          if (result && result.appeal_id) {
            _showAppealToast((result && result.error) ? result.error : '评论失败，请稍后重试', result.appeal_id);
          } else {
            _showToast((result && result.error) ? result.error : '评论失败，请稍后重试');
          }
          return false;
        } catch (e) {
          _showToast('评论出错，请稍后重试');
          return false;
        }
      }
    }
    // Supabase 未配置
    _showToast('Supabase 未配置，无法评论');
    return false;
  }

  // ===== 图片灯箱 =====

  function _showImageLightbox(src, alt) {
    var existing = document.getElementById('community-lightbox');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'community-lightbox';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10002;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:20px;animation:communityFadeIn 0.2s ease;';
    overlay.innerHTML = '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(alt || '') + '" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.5);">';
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    function close() {
      overlay.remove();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeydown);
    }
    function onKeydown(e) {
      if (e.key === 'Escape') close();
    }
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', onKeydown);
  }

  // ===== 渲染函数 =====

  function renderSkeletons(count) {
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<div class="community-skeleton">';
      html += '<div class="community-skeleton-header">';
      html += '<div class="community-skeleton-avatar"></div>';
      html += '<div class="community-skeleton-name"></div>';
      html += '</div>';
      html += '<div class="community-skeleton-line"></div>';
      html += '<div class="community-skeleton-line"></div>';
      html += '<div class="community-skeleton-line"></div>';
      html += '</div>';
    }
    return html;
  }

  function renderTagChips() {
    var html = '';
    for (var i = 0; i < TAG_LIST.length; i++) {
      var tag = TAG_LIST[i];
      var active = _communityState.currentTag === tag.key ? ' active' : '';
      html += '<span class="community-tag-chip' + active + '" data-community-tag="' + escapeHtml(tag.key) + '">' + escapeHtml(tag.label) + '</span>';
    }
    return html;
  }

  // Tag color palette
  var TAG_COLORS = {
    '求助': { bg: 'rgba(232,168,48,0.1)', color: '#b8860b' },
    '经验分享': { bg: 'rgba(58,140,92,0.1)', color: '#2d6a4f' },
    '备考': { bg: 'rgba(90,125,92,0.1)', color: '#4a7c59' },
    '学习笔记': { bg: 'rgba(74,124,89,0.1)', color: '#3a6b4a' },
    '讨论': { bg: 'rgba(90,125,92,0.1)', color: '#5a7d5c' },
    '真题讨论': { bg: 'rgba(196,149,106,0.1)', color: '#a0784a' },
    '科普': { bg: 'rgba(100,140,180,0.1)', color: '#4a7a9e' },
    '体验': { bg: 'rgba(140,120,180,0.1)', color: '#6b5b8a' },
    '计划': { bg: 'rgba(180,130,100,0.1)', color: '#9e6b4a' },
    '植物学': { bg: 'rgba(100,160,100,0.1)', color: '#4a8a4a' },
    '遗传学': { bg: 'rgba(140,120,160,0.1)', color: '#6b5a8a' },
    '生物化学': { bg: 'rgba(180,140,100,0.1)', color: '#9e7a4a' },
    '免疫学': { bg: 'rgba(180,100,100,0.1)', color: '#9e4a4a' },
    '细胞生物学': { bg: 'rgba(100,140,140,0.1)', color: '#4a7a7a' },
    '分子生物学': { bg: 'rgba(120,140,160,0.1)', color: '#5a6a8a' },
    '神经系统': { bg: 'rgba(160,120,140,0.1)', color: '#8a5a7a' },
    '微生物学': { bg: 'rgba(140,160,120,0.1)', color: '#6a8a5a' },
    '生态学': { bg: 'rgba(100,160,140,0.1)', color: '#4a8a6a' },
    '实验': { bg: 'rgba(160,140,180,0.1)', color: '#8a6a9e' },
    'FSRS': { bg: 'rgba(180,160,120,0.1)', color: '#9e8a4a' },
    'AI导师': { bg: 'rgba(120,100,180,0.1)', color: '#5a4a9e' },
    'PCR': { bg: 'rgba(100,160,160,0.1)', color: '#4a8a8a' },
    '光合作用': { bg: 'rgba(100,180,100,0.1)', color: '#4a9e4a' },
    '植物激素': { bg: 'rgba(140,180,100,0.1)', color: '#6a9e4a' },
    '减数分裂': { bg: 'rgba(160,120,160,0.1)', color: '#8a5a8a' },
    '细胞器': { bg: 'rgba(140,140,180,0.1)', color: '#6a6a9e' },
    '孟德尔': { bg: 'rgba(180,160,140,0.1)', color: '#9e8a6a' },
    '群体遗传': { bg: 'rgba(160,160,140,0.1)', color: '#8a8a6a' },
    '虚拟实验室': { bg: 'rgba(100,140,180,0.1)', color: '#4a6a9e' },
    '糖酵解': { bg: 'rgba(180,140,120,0.1)', color: '#9e7a5a' }
  };

  function getTagStyle(tagName) {
    var c = TAG_COLORS[tagName];
    if (c) return 'background:' + c.bg + ';color:' + c.color + ';';
    return 'background:rgba(90,125,92,0.08);color:var(--color-sage);';
  }

  function renderPostCard(post) {
    var authorName = post.author_name || (post.author ? (post.author.display_name || post.author.username || '匿名用户') : '匿名用户');
    var authorInitial = getInitial(authorName);
    var avatarColor = getAvatarColor(authorName);
    var likedClass = post.liked_by_me ? ' liked' : '';
    var heartFill = post.liked_by_me ? 'currentColor' : 'none';
    var isPinned = post.is_pinned || post.pinned;
    var likeCount = post.like_count || post.likes || 0;
    var isHot = likeCount >= 15;
    var votedClass = post.liked_by_me ? ' voted' : '';
    var commentCount = post.comment_count || 0;

    var html = '<div class="community-post-card' + (isPinned ? ' pinned' : '') + '" data-post-id="' + escapeHtml(post.id) + '">';

    // 左侧投票栏（知乎风格）
    html += '<div class="community-post-vote">';
    html += '<button class="community-vote-btn community-vote-up' + votedClass + '" data-post-id="' + escapeHtml(post.id) + '" title="赞同">';
    html += '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>';
    html += '</button>';
    html += '<span class="community-vote-count' + votedClass + '">' + likeCount + '</span>';
    html += '<button class="community-vote-btn community-vote-down" data-post-id="' + escapeHtml(post.id) + '" title="反对">';
    html += '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
    html += '</button>';
    html += '</div>';

    // 右侧内容区
    html += '<div class="community-post-body">';

    // 头部：头像、作者、徽章、时间
    html += '<div class="community-post-header">';
    html += '<div class="community-avatar" style="background:' + avatarColor + '">' + escapeHtml(authorInitial) + '</div>';
    html += '<span class="community-post-author">' + escapeHtml(authorName) + '</span>';
    if (isPinned) {
      html += '<span class="community-post-badge pin-badge">置顶</span>';
    }
    if (isHot && !isPinned) {
      html += '<span class="community-post-badge hot-badge">热门</span>';
    }
    html += '<span class="community-post-time">' + relativeTime(post.created_at) + '</span>';
    html += '</div>';

    // 内容
    html += '<div class="community-post-content">' + renderMarkdown(post.content) + '</div>';

    // 标签
    if (post.tags && post.tags.length > 0) {
      html += '<div class="community-post-tags">';
      for (var i = 0; i < post.tags.length; i++) {
        html += '<span class="community-post-tag" style="' + getTagStyle(post.tags[i]) + '">' + escapeHtml(post.tags[i]) + '</span>';
      }
      html += '</div>';
    }

    // 底部操作栏（知乎风格：评论、分享、收藏、举报）
    html += '<div class="community-post-actions">';
    // 评论按钮
    html += '<button class="community-action-btn community-comment-toggle-btn" data-post-id="' + escapeHtml(post.id) + '">';
    html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    html += '<span>' + commentCount + ' 条评论</span>';
    html += '</button>';

    // 分享按钮
    html += '<button class="community-action-btn community-share-btn" data-post-id="' + escapeHtml(post.id) + '" title="分享">';
    html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
    html += '<span>分享</span>';
    html += '</button>';

    // 收藏按钮
    html += '<button class="community-action-btn community-bookmark-btn" data-post-id="' + escapeHtml(post.id) + '" title="收藏">';
    html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
    html += '<span>收藏</span>';
    html += '</button>';

    // 举报按钮（不显示在自己的帖子上）
    var currentUserId = (typeof getCurrentUser === 'function' && getCurrentUser()) ? getCurrentUser().id : null;
    if (currentUserId && post.author_id !== currentUserId) {
      html += '<button class="community-action-btn community-report-btn" data-post-id="' + escapeHtml(post.id) + '" title="举报" style="margin-left:auto;">';
      html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>';
      html += '<span>举报</span>';
      html += '</button>';
    }
    html += '</div>';

    // 评论区（始终可见）
    html += renderCommentsSection(post);

    html += '</div>'; // .community-post-body
    html += '</div>'; // .community-post-card
    return html;
  }

  function renderCommentsSection(post) {
    var html = '';
    var comments = _communityState.commentsCache[post.id] || null;
    var totalComments = post.comment_count || 0;
    var isExpanded = _communityState.commentsExpanded[post.id] || false;
    var PREVIEW_LIMIT = 3;

    // 如果没有评论且评论未加载，仅显示评论输入（登录用户）
    if (!comments || comments.length === 0) {
      if (isUserLoggedIn()) {
        html += '<div class="community-comment-input-area" style="margin-top:12px;">';
        html += '<input type="text" class="community-comment-input" placeholder="写下你的评论..." data-post-id="' + escapeHtml(post.id) + '" />';
        html += '<button class="community-comment-submit" data-post-id="' + escapeHtml(post.id) + '">发送</button>';
        html += '</div>';
      }
      return html;
    }

    html += '<div class="community-comments-inline">';

    if (comments.length > 0) {
      var showCount = isExpanded ? comments.length : Math.min(comments.length, PREVIEW_LIMIT);
      for (var i = 0; i < showCount; i++) {
        var cmt = comments[i];
        var cmtAuthor = cmt.author ? (cmt.author.display_name || cmt.author.username || '匿名') : '匿名';
        var cmtColor = getAvatarColor(cmtAuthor);
        var cmtInitial = getInitial(cmtAuthor);

        html += '<div class="community-comment">';
        html += '<div class="community-comment-avatar" style="background:' + cmtColor + '">' + escapeHtml(cmtInitial) + '</div>';
        html += '<div class="community-comment-body">';
        html += '<span class="community-comment-author">' + escapeHtml(cmtAuthor) + '</span>';
        html += '<div class="community-comment-text">' + renderMarkdown(cmt.content) + '</div>';
        html += '<div class="community-comment-time">' + relativeTime(cmt.created_at) + '</div>';
        html += '</div>';
        html += '</div>';
      }
    }

    // 查看全部评论按钮
    if (comments.length > PREVIEW_LIMIT && !isExpanded) {
      html += '<button class="community-expand-comments-btn" data-post-id="' + escapeHtml(post.id) + '">查看全部 ' + comments.length + ' 条评论</button>';
    }

    // 收起评论按钮
    if (isExpanded && comments.length > PREVIEW_LIMIT) {
      html += '<button class="community-expand-comments-btn" data-post-id="' + escapeHtml(post.id) + '" data-collapse="1">收起评论</button>';
    }

    html += '</div>'; // .community-comments-inline

    // 评论输入（仅登录用户，始终可见）
    if (isUserLoggedIn()) {
      html += '<div class="community-comment-input-area">';
      html += '<input type="text" class="community-comment-input" placeholder="写下你的评论..." data-post-id="' + escapeHtml(post.id) + '" />';
      html += '<button class="community-comment-submit" data-post-id="' + escapeHtml(post.id) + '">发送</button>';
      html += '</div>';
    }

    return html;
  }

  function renderEmptyState() {
    return '<div class="community-empty">' +
      '<div class="community-empty-icon"></div>' +
      '<div class="community-empty-title">还没有帖子</div>' +
      '<div class="community-empty-desc">成为第一个发帖的人，分享你的学习心得吧</div>' +
      '</div>';
  }

  function renderLoginPage() {
    return '<div class="animate-fade-in" style="display:flex;align-items:center;justify-content:center;min-height:60vh;">' +
      '<div style="text-align:center;max-width:400px;padding:40px;">' +
      '<div style="font-size:48px;margin-bottom:16px;opacity:0.3;"></div>' +
      '<h2 style="font-size:22px;font-weight:600;margin-bottom:8px;color:var(--text-primary);">社区需要登录</h2>' +
      '<p style="font-size:14px;color:var(--text-secondary);margin-bottom:24px;line-height:1.6;">登录后即可参与讨论、发帖和评论</p>' +
      '<button onclick="window.showAuthModal && window.showAuthModal()" style="' +
      'background:var(--color-sage);color:#fff;border:none;padding:12px 32px;border-radius:var(--radius-full);' +
      'font-size:15px;font-weight:500;cursor:pointer;transition:all 0.2s;' +
      '" onmouseover="this.style.transform=\'translateY(-1px)\';this.style.boxShadow=\'0 4px 12px rgba(90,125,92,0.3)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\'">立即登录</button>' +
      '</div></div>';
  }

  function renderSidebar() {
    var html = '';

    // 热门话题
    html += '<div class="community-sidebar-card">';
    html += '<div class="community-sidebar-card-title">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' +
      '热门话题</div>';
    var hotTags = ['备考', '求助', '经验分享', '遗传学', '生物化学', '细胞生物学', '免疫学', '真题讨论'];
    for (var i = 0; i < hotTags.length; i++) {
      var tag = hotTags[i];
      var tagStyle = getTagStyle(tag);
      html += '<span class="community-hot-tag" style="' + tagStyle + 'border-color:' + (TAG_COLORS[tag] ? TAG_COLORS[tag].color + '30' : 'var(--border-light)') + ';" data-community-tag="' + tag + '">' + tag + '</span>';
    }
    html += '</div>';

    // 社区统计
    var totalPosts = _communityState.posts ? _communityState.posts.length : 0;
    var totalLikes = 0;
    if (_communityState.posts) {
      for (var j = 0; j < _communityState.posts.length; j++) {
        totalLikes += (_communityState.posts[j].like_count || _communityState.posts[j].likes || 0);
      }
    }
    html += '<div class="community-sidebar-card">';
    html += '<div class="community-sidebar-card-title">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
      '社区动态</div>';
    html += '<div class="community-sidebar-stat"><span>帖子总数</span><span class="community-sidebar-stat-value">' + totalPosts + '</span></div>';
    html += '<div class="community-sidebar-stat"><span>累计点赞</span><span class="community-sidebar-stat-value">' + totalLikes + '</span></div>';
    html += '<div class="community-sidebar-stat"><span>在线用户</span><span class="community-sidebar-stat-value">--</span></div>';
    html += '</div>';

    // 发帖指南
    html += '<div class="community-sidebar-card">';
    html += '<div class="community-sidebar-card-title">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
      '发帖指南</div>';
    html += '<ul class="community-sidebar-guide" style="margin:0;padding-left:16px;">';
    html += '<li>求助帖请描述清楚问题</li>';
    html += '<li>经验分享建议带上具体方法</li>';
    html += '<li>禁止发布无关广告内容</li>';
    html += '<li>友善交流，尊重他人</li>';
    html += '</ul>';
    html += '</div>';

    return html;
  }

  function renderTabBar() {
    var tabs = [
      { key: 'follow', label: '关注' },
      { key: 'recommend', label: '推荐' },
      { key: 'hot', label: '热榜' }
    ];
    var html = '<div class="community-tab-bar" id="community-tab-bar">';
    for (var i = 0; i < tabs.length; i++) {
      var active = _communityState.activeTab === tabs[i].key ? ' active' : '';
      html += '<button class="community-tab-item' + active + '" data-community-tab="' + tabs[i].key + '">' + tabs[i].label + '</button>';
    }
    html += '</div>';
    return html;
  }

  function renderFloatingPublishBtn() {
    return '<button class="community-float-publish" id="community-float-publish-btn" title="发布帖子">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>' +
      '</svg></button>';
  }

  // ===== 主渲染函数 =====

  function renderCommunityPage(target) {
    if (!target) return;

    try {
      injectCommunityStyles();

      _communityState = {
        posts: [],
        currentPage: 1,
        totalPages: 1,
        totalPosts: 0,
        currentTag: '',
        activeTab: 'recommend',
        hasMore: true,
        loading: false,
        expandedPostId: null,
        commentsCache: {},
        commentsExpanded: {}
      };

      var loggedIn = isUserLoggedIn();

      var html = '<div class="community-page">';

      // 主内容区
      html += '<div class="community-main">';

      html += '<div class="community-header">';
      html += '<h1 class="community-title">学习社区</h1>';
      if (loggedIn) {
        html += '<button class="community-post-btn" id="community-compose-btn">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
          '发帖</button>';
      }
      html += '</div>';

      if (!loggedIn) {
        html += '<div class="community-login-banner">';
        html += '<span class="community-login-banner-text">登录后参与讨论、发帖和评论</span>';
        html += '<button class="community-login-banner-btn" onclick="window.showAuthModal && window.showAuthModal()">立即登录</button>';
        html += '</div>';
      }

      // 知乎风格 Tab 栏
      html += renderTabBar();

      // 标签筛选
      html += '<div class="community-tags" id="community-tags">';
      html += renderTagChips();
      html += '</div>';

      html += '<div class="community-feed" id="community-feed">';
      html += renderSkeletons(3);
      html += '</div>';

      html += '<div class="community-pagination" id="community-pagination" style="display:none;">';
      html += '</div>';

      html += '</div>'; // .community-main

      // 侧边栏
      html += '<div class="community-sidebar" id="community-sidebar">';
      html += renderSidebar();
      html += '</div>';

      html += '</div>'; // .community-page

      // 浮动发布按钮（仅登录用户）
      if (loggedIn) {
        html += renderFloatingPublishBtn();
      }

      target.innerHTML = html;

      bindCommunityEvents(target);
      loadPosts();
    } catch (err) {
      console.error('[BioQuest Community] renderCommunityPage 异常:', err);
      target.innerHTML = '<div style="text-align:center;padding:60px 20px;">' +
        '<p style="color:var(--color-error);font-size:1.1rem;margin-bottom:8px;">社区页面渲染失败</p>' +
        '<p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:16px;">请刷新页面或稍后重试</p>' +
        '<button onclick="location.reload()" style="padding:8px 20px;background:var(--color-sage);color:#fff;border:none;border-radius:8px;cursor:pointer;">刷新页面</button>' +
        '</div>';
    }
  }

  // ===== 事件绑定 =====

  function bindCommunityEvents(target) {
    // 发帖按钮
    var composeBtn = document.getElementById('community-compose-btn');
    if (composeBtn) {
      composeBtn.addEventListener('click', function () {
        showComposeModal();
      });
    }

    // 浮动发布按钮
    var floatBtn = document.getElementById('community-float-publish-btn');
    if (floatBtn) {
      floatBtn.addEventListener('click', function () {
        showComposeModal();
      });
    }

    // Tab 栏切换
    var tabBar = document.getElementById('community-tab-bar');
    if (tabBar) {
      tabBar.addEventListener('click', function (e) {
        var tab = e.target.closest('.community-tab-item');
        if (!tab) return;
        var tabKey = tab.getAttribute('data-community-tab') || 'recommend';
        _communityState.activeTab = tabKey;
        _communityState.currentPage = 1;
        _communityState.posts = [];
        _communityState.totalPages = 1;
        _communityState.commentsExpanded = {};

        // 更新 tab 高亮
        tabBar.querySelectorAll('.community-tab-item').forEach(function (t) {
          t.classList.toggle('active', t.getAttribute('data-community-tab') === tabKey);
        });

        loadPosts();
      });
    }

    // 标签筛选
    var tagsContainer = document.getElementById('community-tags');
    if (tagsContainer) {
      tagsContainer.addEventListener('click', function (e) {
        var chip = e.target.closest('.community-tag-chip');
        if (!chip) return;
        var tag = chip.getAttribute('data-community-tag') || '';
        _communityState.currentTag = tag;
        _communityState.currentPage = 1;
        _communityState.posts = [];
        _communityState.totalPages = 1;
        _communityState.commentsExpanded = {};

        // 更新标签高亮
        tagsContainer.querySelectorAll('.community-tag-chip').forEach(function (c) {
          c.classList.toggle('active', c.getAttribute('data-community-tag') === tag);
        });

        loadPosts();
      });
    }

    // 侧边栏热门标签点击
    var sidebar = document.getElementById('community-sidebar');
    if (sidebar) {
      sidebar.addEventListener('click', function (e) {
        var hotTag = e.target.closest('.community-hot-tag');
        if (!hotTag) return;
        var tag = hotTag.getAttribute('data-community-tag') || '';
        _communityState.currentTag = tag;
        _communityState.currentPage = 1;
        _communityState.posts = [];
        _communityState.totalPages = 1;
        _communityState.commentsExpanded = {};

        var tagsContainer = document.getElementById('community-tags');
        if (tagsContainer) {
          tagsContainer.querySelectorAll('.community-tag-chip').forEach(function (c) {
            c.classList.toggle('active', c.getAttribute('data-community-tag') === tag);
          });
        }

        loadPosts();
      });
    }

    // 帖子列表事件委托
    var feed = document.getElementById('community-feed');
    if (feed) {
      feed.addEventListener('click', function (e) {
        // 投票按钮（赞同）
        var voteUpBtn = e.target.closest('.community-vote-up');
        if (voteUpBtn) {
          var postId = voteUpBtn.getAttribute('data-post-id');
          handleVote(postId, true);
          return;
        }

        // 投票按钮（反对）
        var voteDownBtn = e.target.closest('.community-vote-down');
        if (voteDownBtn) {
          var postId = voteDownBtn.getAttribute('data-post-id');
          handleVote(postId, false);
          return;
        }

        // 评论展开/收起（现在用于滚动到评论）
        var commentBtn = e.target.closest('.community-comment-toggle-btn');
        if (commentBtn) {
          var postId = commentBtn.getAttribute('data-post-id');
          handleScrollToComments(postId);
          return;
        }

        // 展开/收起全部评论
        var expandBtn = e.target.closest('.community-expand-comments-btn');
        if (expandBtn) {
          var postId = expandBtn.getAttribute('data-post-id');
          handleToggleCommentsExpand(postId, expandBtn);
          return;
        }

        // 评论提交
        var submitBtn = e.target.closest('.community-comment-submit');
        if (submitBtn) {
          var postId = submitBtn.getAttribute('data-post-id');
          handleSubmitComment(postId);
          return;
        }

        // 分享
        var shareBtn = e.target.closest('.community-share-btn');
        if (shareBtn) {
          var postId = shareBtn.getAttribute('data-post-id');
          handleShare(postId);
          return;
        }

        // 收藏
        var bookmarkBtn = e.target.closest('.community-bookmark-btn');
        if (bookmarkBtn) {
          var postId = bookmarkBtn.getAttribute('data-post-id');
          handleBookmark(postId);
          return;
        }

        // 举报帖子
        var reportBtn = e.target.closest('.community-report-btn');
        if (reportBtn) {
          var reportPostId = reportBtn.getAttribute('data-post-id');
          showReportModal(reportPostId);
          return;
        }

        // 图片占位符点击加载
        var imgPlaceholder = e.target.closest('.community-img-placeholder');
        if (imgPlaceholder) {
          var src = imgPlaceholder.getAttribute('data-img-src');
          var alt = imgPlaceholder.getAttribute('data-img-alt') || '';
          if (src) {
            var img = document.createElement('img');
            img.src = src;
            img.alt = alt;
            img.style.cssText = 'max-width:100%;max-height:480px;object-fit:contain;border-radius:8px;margin:8px 0;cursor:pointer;display:block;';
            img.className = 'community-img-clickable';
            img.loading = 'lazy';
            imgPlaceholder.parentNode.replaceChild(img, imgPlaceholder);
          }
          return;
        }

        // 图片点击放大查看
        var clickableImg = e.target.closest('.community-img-clickable');
        if (clickableImg) {
          _showImageLightbox(clickableImg.src, clickableImg.alt);
          return;
        }
      });

      // 评论输入回车
      feed.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && e.target.classList.contains('community-comment-input')) {
          var postId = e.target.getAttribute('data-post-id');
          handleSubmitComment(postId);
        }
      });
    }

    // 分页按钮事件委托
    var pagination = document.getElementById('community-pagination');
    if (pagination) {
      pagination.addEventListener('click', function (e) {
        var btn = e.target.closest('.community-page-btn');
        if (!btn || btn.disabled) return;
        var page = parseInt(btn.getAttribute('data-page'));
        if (isNaN(page) || page < 1 || page > _communityState.totalPages) return;
        _communityState.currentPage = page;
        _communityState.commentsExpanded = {};
        loadPosts();
        // 滚动到顶部
        var feedEl = document.getElementById('community-feed');
        if (feedEl) feedEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  // ===== 交互处理 =====

  async function handleVote(postId, isUpvote) {
    if (!isUserLoggedIn()) {
      if (typeof window.showAuthModal === 'function') window.showAuthModal();
      return;
    }

    // 投票复用现有的点赞 API
    try {
      var result = await toggleLike(postId);
      if (result) {
        var post = _communityState.posts.find(function (p) { return p.id === postId; });
        if (post) {
          post.liked_by_me = result.liked;
          post.likes = result.likes;
        }

        // 更新 UI：投票计数和按钮状态
        var card = document.querySelector('.community-post-card[data-post-id="' + postId + '"]');
        if (card) {
          var countEl = card.querySelector('.community-vote-count');
          var upBtn = card.querySelector('.community-vote-up');
          var downBtn = card.querySelector('.community-vote-down');
          if (countEl) {
            countEl.textContent = result.likes || 0;
            countEl.classList.toggle('voted', !!result.liked);
          }
          if (upBtn) upBtn.classList.toggle('voted', !!result.liked);
          if (downBtn) downBtn.classList.remove('voted');
        }
      } else {
        _showToast('操作失败，请稍后重试');
      }
    } catch (e) {
      _showToast('操作出错，请稍后重试');
    }
  }

  // 保留旧的 handleLike 供兼容（部分代码可能引用）
  async function handleLike(btn) {
    if (!isUserLoggedIn()) {
      if (typeof window.showAuthModal === 'function') window.showAuthModal();
      return;
    }
    var postId = btn.getAttribute('data-post-id');
    if (!postId || btn.disabled) return;
    btn.disabled = true;
    try {
      var result = await toggleLike(postId);
      if (result) {
        var post = _communityState.posts.find(function (p) { return p.id === postId; });
        if (post) {
          post.liked_by_me = result.liked;
          post.likes = result.likes;
        }
        refreshFeed();
      } else {
        _showToast('操作失败，请稍后重试');
      }
    } catch (e) {
      _showToast('操作出错，请稍后重试');
    }
    btn.disabled = false;
  }

  async function handleScrollToComments(postId) {
    // 如果评论尚未加载，先加载
    if (!_communityState.commentsCache[postId]) {
      var result = await fetchComments(postId);
      _communityState.commentsCache[postId] = (result && result.comments) ? result.comments : [];
      refreshFeed();
    }
    // 滚动到评论区
    var card = document.querySelector('.community-post-card[data-post-id="' + postId + '"]');
    if (card) {
      var target = card.querySelector('.community-comments-inline') || card.querySelector('.community-comment-input-area');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  async function handleToggleCommentsExpand(postId, btn) {
    var isCollapse = btn.getAttribute('data-collapse') === '1';
    if (isCollapse) {
      _communityState.commentsExpanded[postId] = false;
    } else {
      // 加载评论（如果尚未缓存）
      if (!_communityState.commentsCache[postId]) {
        var result = await fetchComments(postId);
        _communityState.commentsCache[postId] = (result && result.comments) ? result.comments : [];
      }
      _communityState.commentsExpanded[postId] = true;
    }
    refreshFeed();
  }

  async function handleSubmitComment(postId) {
    if (!isUserLoggedIn()) return;

    var input = document.querySelector('.community-comment-input[data-post-id="' + postId + '"]');
    if (!input) return;

    var content = input.value.trim();
    if (!content) return;

    input.disabled = true;
    var ok = await addComment(postId, content);
    input.disabled = false;

    if (ok) {
      input.value = '';
      // 刷新评论
      var result = await fetchComments(postId);
      if (result && result.comments) {
        _communityState.commentsCache[postId] = result.comments;
      }
      // 更新评论数
      var post = _communityState.posts.find(function (p) { return p.id === postId; });
      if (post) {
        post.comment_count = (post.comment_count || 0) + 1;
      }
      refreshFeed();
    }
  }

  function handleShare(postId) {
    // 复制帖子链接到剪贴板
    var url = window.location.origin + window.location.pathname + '?post=' + postId;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        _showToast('链接已复制到剪贴板');
      }).catch(function () {
        _showToast('分享链接：' + url);
      });
    } else {
      _showToast('分享链接：' + url);
    }
  }

  function handleBookmark(postId) {
    _showToast('收藏功能开发中，敬请期待');
  }

  // ===== 举报功能 =====

  function showReportModal(postId) {
    if (!isUserLoggedIn()) {
      if (typeof window.showAuthModal === 'function') window.showAuthModal();
      return;
    }
    var existing = document.getElementById('community-report-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'community-report-overlay';
    overlay.className = 'community-compose-overlay';

    var reasons = [
      { key: 'spam', label: '垃圾广告/营销' },
      { key: 'abuse', label: '辱骂/人身攻击' },
      { key: 'irrelevant', label: '与生物学习无关' },
      { key: 'incorrect', label: '错误信息/误导' },
      { key: 'other', label: '其他' }
    ];

    var reasonsHtml = reasons.map(function(r) {
      return '<label style="display:flex;align-items:center;gap:8px;padding:8px 0;cursor:pointer;font-size:0.88rem;color:var(--text-primary);">' +
        '<input type="radio" name="report-reason" value="' + escapeHtml(r.label) + '" style="cursor:pointer;">' +
        escapeHtml(r.label) + '</label>';
    }).join('');

    overlay.innerHTML = '<div class="community-compose-modal" style="max-width:420px;">' +
      '<div class="community-compose-header">' +
      '<span class="community-compose-title">举报帖子</span>' +
      '<button class="community-compose-close" id="community-report-close">&times;</button>' +
      '</div>' +
      '<div style="padding:16px 20px;">' +
      '<div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:12px;">请选择举报原因：</div>' +
      '<div>' + reasonsHtml + '</div>' +
      '<div style="margin-top:12px;">' +
      '<textarea id="report-detail" placeholder="补充说明（可选）" style="width:100%;min-height:60px;padding:10px 12px;border:1px solid var(--border-light,#ddd);border-radius:8px;font-size:0.85rem;resize:vertical;font-family:inherit;"></textarea>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:16px;">' +
      '<button id="community-report-cancel" class="admin-btn admin-btn--ghost" style="flex:1;padding:10px;border:1px solid var(--border-light,#ddd);background:transparent;border-radius:8px;cursor:pointer;font-size:0.88rem;">取消</button>' +
      '<button id="community-report-submit" style="flex:1;padding:10px;background:var(--color-error,#c0553a);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:0.88rem;font-weight:500;">提交举报</button>' +
      '</div>' +
      '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    overlay.style.display = 'flex';

    // v4.0 a11y：补全对话框语义
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'community-report-title');
    var reportTitleEl = overlay.querySelector('.community-compose-title');
    if (reportTitleEl) reportTitleEl.id = 'community-report-title';

    var _reportFocusTrap = null;
    function closeReport() {
      if (_reportFocusTrap) { _reportFocusTrap.release(); _reportFocusTrap = null; }
      overlay.remove();
    }

    document.getElementById('community-report-close').addEventListener('click', closeReport);
    document.getElementById('community-report-cancel').addEventListener('click', closeReport);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeReport();
    });

    // v4.0 a11y：焦点陷阱 + ESC 关闭
    if (typeof window.BioQuestA11y === 'object' && window.BioQuestA11y &&
        typeof window.BioQuestA11y.trapFocus === 'function') {
      _reportFocusTrap = window.BioQuestA11y.trapFocus(overlay, {
        onEscape: closeReport,
        initialFocus: overlay.querySelector('input[name="report-reason"]')
      });
    }

    document.getElementById('community-report-submit').addEventListener('click', async function() {
      var selected = document.querySelector('input[name="report-reason"]:checked');
      var reason = selected ? selected.value : '';
      var detail = document.getElementById('report-detail').value.trim();
      var fullReason = detail ? (reason ? reason + '：' + detail : detail) : reason;

      if (!fullReason) {
        _showToast('请选择举报原因');
        return;
      }

      var btn = this;
      btn.disabled = true;
      btn.textContent = '提交中...';

      if (typeof window.reportCommunityPost !== 'function') {
        _showToast('举报功能未加载，请刷新页面');
        btn.disabled = false;
        btn.textContent = '提交举报';
        return;
      }

      var result = await window.reportCommunityPost(postId, fullReason);
      if (result.ok) {
        closeReport();
        _showToast('举报已提交，管理员将尽快处理');
      } else {
        _showToast(result.error || '举报失败，请稍后重试');
        btn.disabled = false;
        btn.textContent = '提交举报';
      }
    });
  }

  function refreshFeed() {
    var feed = document.getElementById('community-feed');
    if (!feed) return;

    if (_communityState.posts.length === 0) {
      feed.innerHTML = renderEmptyState();
      return;
    }

    var html = '';
    for (var i = 0; i < _communityState.posts.length; i++) {
      html += renderPostCard(_communityState.posts[i]);
    }
    feed.innerHTML = html;
  }

  async function loadPosts() {
    if (_communityState.loading) return;
    _communityState.loading = true;

    var feed = document.getElementById('community-feed');
    var pagination = document.getElementById('community-pagination');

    if (feed) {
      feed.innerHTML = renderSkeletons(3);
    }

    var result = await fetchPosts(_communityState.currentPage, _communityState.currentTag);

    _communityState.loading = false;

    if (result) {
      var posts = Array.isArray(result.posts) ? result.posts : [];
      _communityState.posts = posts;
      _communityState.totalPosts = result.total || posts.length;
      _communityState.totalPages = Math.max(1, Math.ceil(_communityState.totalPosts / 7));
    } else {
      _communityState.posts = [];
      _communityState.totalPosts = 0;
      _communityState.totalPages = 1;
    }

    refreshFeed();
    renderPagination();

    // 更新侧边栏统计
    var sidebarEl = document.getElementById('community-sidebar');
    if (sidebarEl) {
      sidebarEl.innerHTML = renderSidebar();
    }

    // 异步加载当前页帖子的评论
    loadCommentsForVisiblePosts();
  }

  async function loadCommentsForVisiblePosts() {
    var posts = _communityState.posts;
    if (!posts || posts.length === 0) return;

    var promises = [];
    var postIds = [];
    for (var i = 0; i < posts.length; i++) {
      var post = posts[i];
      if ((post.comment_count || 0) > 0 && !_communityState.commentsCache[post.id]) {
        promises.push(fetchComments(post.id));
        postIds.push(post.id);
      }
    }
    if (promises.length === 0) return;

    try {
      var results = await Promise.all(promises.map(function(p) { return p.catch(function() { return null; }); }));
      for (var j = 0; j < results.length; j++) {
        var result = results[j];
        _communityState.commentsCache[postIds[j]] = (result && result.comments) ? result.comments : [];
      }
    } catch (e) {
      // fallback: individual error handling already done via .catch
    }

    refreshFeed();
  }

  function renderPagination() {
    var pagination = document.getElementById('community-pagination');
    if (!pagination) return;

    var page = _communityState.currentPage;
    var totalPages = _communityState.totalPages;

    if (totalPages <= 1) {
      pagination.style.display = 'none';
      return;
    }

    pagination.style.display = 'flex';

    var html = '';
    html += '<button class="community-page-btn' + (page <= 1 ? ' disabled' : '') + '" data-page="' + (page - 1) + '" ' + (page <= 1 ? 'disabled' : '') + '>上一页</button>';

    // 页码按钮：显示当前页前后各 2 页，首尾必显示
    var startPage = Math.max(1, page - 2);
    var endPage = Math.min(totalPages, page + 2);
    if (startPage > 1) {
      html += '<button class="community-page-btn" data-page="1">1</button>';
      if (startPage > 2) html += '<span class="community-page-ellipsis">...</span>';
    }
    for (var i = startPage; i <= endPage; i++) {
      html += '<button class="community-page-btn' + (i === page ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>';
    }
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += '<span class="community-page-ellipsis">...</span>';
      html += '<button class="community-page-btn" data-page="' + totalPages + '">' + totalPages + '</button>';
    }

    html += '<button class="community-page-btn' + (page >= totalPages ? ' disabled' : '') + '" data-page="' + (page + 1) + '" ' + (page >= totalPages ? 'disabled' : '') + '>下一页</button>';
    html += '<span class="community-page-info">' + page + ' / ' + totalPages + ' 页（共 ' + _communityState.totalPosts + ' 帖）</span>';

    pagination.innerHTML = html;
  }

  // ===== 发帖弹窗 =====

  function showComposeModal() {
    var existing = document.getElementById('community-compose-overlay');
    if (existing) return;

    var selectedTags = [];

    var overlay = document.createElement('div');
    overlay.id = 'community-compose-overlay';
    overlay.className = 'community-compose-overlay';

    var tagsHtml = '';
    for (var i = 1; i < TAG_LIST.length; i++) {
      tagsHtml += '<span class="community-compose-tag-option" data-compose-tag="' + escapeHtml(TAG_LIST[i].key) + '">' + escapeHtml(TAG_LIST[i].label) + '</span>';
    }

    overlay.innerHTML = '<div class="community-compose-modal">' +
      '<div class="community-compose-header">' +
      '<span class="community-compose-title">发帖</span>' +
      '<button class="community-compose-close" id="community-compose-close">&times;</button>' +
      '</div>' +
      '<div class="community-compose-md-toolbar" style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;padding:6px;background:var(--color-cream-dark,#f0ebe0);border-radius:8px;">' +
        '<button type="button" class="community-md-btn" data-md="bold" title="加粗 (Ctrl+B)" style="padding:4px 10px;border:none;background:transparent;border-radius:6px;cursor:pointer;font-weight:700;font-size:0.85rem;color:var(--text-primary);"><b>B</b></button>' +
        '<button type="button" class="community-md-btn" data-md="italic" title="斜体 (Ctrl+I)" style="padding:4px 10px;border:none;background:transparent;border-radius:6px;cursor:pointer;font-style:italic;font-size:0.85rem;color:var(--text-primary);"><i>I</i></button>' +
        '<button type="button" class="community-md-btn" data-md="code" title="行内代码" style="padding:4px 10px;border:none;background:transparent;border-radius:6px;cursor:pointer;font-family:monospace;font-size:0.85rem;color:var(--text-primary);">&lt;/&gt;</button>' +
        '<button type="button" class="community-md-btn" data-md="h2" title="标题" style="padding:4px 10px;border:none;background:transparent;border-radius:6px;cursor:pointer;font-size:0.85rem;color:var(--text-primary);">H</button>' +
        '<button type="button" class="community-md-btn" data-md="quote" title="引用" style="padding:4px 10px;border:none;background:transparent;border-radius:6px;cursor:pointer;font-size:0.85rem;color:var(--text-primary);">❝</button>' +
        '<button type="button" class="community-md-btn" data-md="list" title="列表" style="padding:4px 10px;border:none;background:transparent;border-radius:6px;cursor:pointer;font-size:0.85rem;color:var(--text-primary);">•</button>' +
        '<button type="button" class="community-md-btn" data-md="link" title="链接" style="padding:4px 10px;border:none;background:transparent;border-radius:6px;cursor:pointer;font-size:0.85rem;color:var(--text-primary);">🔗</button>' +
        '<button type="button" class="community-md-btn" data-md="image" title="图片" style="padding:4px 10px;border:none;background:transparent;border-radius:6px;cursor:pointer;font-size:0.85rem;color:var(--text-primary);">🖼</button>' +
      '</div>' +
      '<textarea class="community-compose-textarea" id="community-compose-textarea" placeholder="分享你的学习心得、提问或讨论...&#10;&#10;支持 Markdown：**加粗** *斜体* `代码` # 标题 > 引用 - 列表 [链接](url) ![图片](url)"></textarea>' +
      '<div class="community-compose-toolbar">' +
      '<button class="community-compose-img-btn" id="community-compose-img-btn" type="button">图片</button>' +
      '<input type="file" id="community-compose-img-input" accept="image/*" style="display:none">' +
      '<span style="font-size:0.72rem;color:var(--text-muted,#8a8a8a);margin-left:auto;">支持 Markdown · Ctrl+Enter 发布</span>' +
      '</div>' +
      '<div class="community-compose-tags-area" id="community-compose-tags">' + tagsHtml + '</div>' +
      '<div class="community-compose-footer">' +
      '<button class="community-compose-cancel" id="community-compose-cancel" type="button">取消</button>' +
      '<button class="community-compose-submit-btn" id="community-compose-submit" type="button">发布</button>' +
      '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // v4.0 a11y：补全对话框语义
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'community-compose-title');
    var composeTitleEl = overlay.querySelector('.community-compose-title');
    if (composeTitleEl) composeTitleEl.id = 'community-compose-title';

    // 关闭
    var _composeFocusTrap = null;
    var closeCompose = function () {
      if (_composeFocusTrap) { _composeFocusTrap.release(); _composeFocusTrap = null; }
      overlay.classList.add('closing');
      overlay.addEventListener('animationend', function () {
        overlay.remove();
        document.body.style.overflow = '';
      }, { once: true });
    };

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeCompose();
    });

    document.getElementById('community-compose-close').addEventListener('click', closeCompose);
    var cancelBtn = document.getElementById('community-compose-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', closeCompose);

    // v4.0 a11y：焦点陷阱 + ESC 关闭
    if (typeof window.BioQuestA11y === 'object' && window.BioQuestA11y &&
        typeof window.BioQuestA11y.trapFocus === 'function') {
      _composeFocusTrap = window.BioQuestA11y.trapFocus(overlay, {
        onEscape: closeCompose,
        initialFocus: document.getElementById('community-compose-textarea')
      });
    }

    // 标签选择
    var composeTags = document.getElementById('community-compose-tags');
    composeTags.addEventListener('click', function (e) {
      var tag = e.target.closest('.community-compose-tag-option');
      if (!tag) return;
      var tagKey = tag.getAttribute('data-compose-tag');
      var idx = selectedTags.indexOf(tagKey);
      if (idx >= 0) {
        selectedTags.splice(idx, 1);
        tag.classList.remove('selected');
      } else {
        selectedTags.push(tagKey);
        tag.classList.add('selected');
      }
    });

    // 图片上传
    var imgBtn = document.getElementById('community-compose-img-btn');
    var imgInput = document.getElementById('community-compose-img-input');
    if (imgBtn && imgInput) {
      imgBtn.addEventListener('click', function () { imgInput.click(); });
      imgInput.addEventListener('change', function () {
        var file = imgInput.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { _showToast('图片不能超过2MB'); return; }
        var reader = new FileReader();
        reader.onload = function (e) {
          var textarea = document.getElementById('community-compose-textarea');
          var imgMd = '\n![' + file.name + '](' + e.target.result + ')\n';
          textarea.value += imgMd;
        };
        reader.readAsDataURL(file);
      });
    }

    // Markdown 工具栏：在选区周围插入对应语法
    var mdToolbar = document.querySelector('.community-compose-md-toolbar');
    if (mdToolbar) {
      mdToolbar.addEventListener('click', function (e) {
        var btn = e.target.closest('.community-md-btn');
        if (!btn) return;
        var textarea = document.getElementById('community-compose-textarea');
        if (!textarea) return;
        var type = btn.dataset.md;
        var start = textarea.selectionStart, end = textarea.selectionEnd;
        var sel = textarea.value.substring(start, end);
        var before = textarea.value.substring(0, start);
        var after = textarea.value.substring(end);
        var wrap = {
          bold:   { pre: '**', post: '**', placeholder: '加粗文字' },
          italic: { pre: '*',  post: '*',  placeholder: '斜体文字' },
          code:   { pre: '`',  post: '`',  placeholder: '代码' },
          h2:     { pre: '## ',post: '',    placeholder: '标题' },
          quote:  { pre: '> ', post: '',    placeholder: '引用' },
          list:   { pre: '- ', post: '',    placeholder: '列表项' },
          link:   { pre: '[',  post: '](https://)', placeholder: '链接文字' },
          image:  { pre: '![', post: '](https://)', placeholder: '图片描述' }
        }[type];
        if (!wrap) return;
        var insertText = sel || wrap.placeholder;
        var newText = before + wrap.pre + insertText + wrap.post + after;
        textarea.value = newText;
        var newCursorStart = start + wrap.pre.length;
        var newCursorEnd = newCursorStart + insertText.length;
        textarea.focus();
        textarea.setSelectionRange(newCursorStart, newCursorEnd);
      });
    }

    // Ctrl+Enter 发布 + Ctrl+B/I 快捷键
    var composeTextarea = document.getElementById('community-compose-textarea');
    if (composeTextarea) {
      composeTextarea.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          document.getElementById('community-compose-submit').click();
        }
      });
    }

    // 发布
    document.getElementById('community-compose-submit').addEventListener('click', async function () {
      var textarea = document.getElementById('community-compose-textarea');
      var content = textarea.value.trim();
      if (!content) return;

      var submitBtn = document.getElementById('community-compose-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = '发布中...';

      try {
        var ok = await createPost(content, selectedTags);
        if (ok) {
          closeCompose();
          // 刷新列表
          _communityState.currentPage = 1;
          _communityState.posts = [];
          _communityState.commentsExpanded = {};
          loadPosts();
        } else {
          submitBtn.disabled = false;
          submitBtn.textContent = '发布';
          // Error toast is already shown by createPost
        }
      } catch (e) {
        submitBtn.disabled = false;
        submitBtn.textContent = '发布';
        _showToast('发帖出错，请稍后重试');
      }
    });

    // ESC 关闭
    var onKeydown = function (e) {
      if (e.key === 'Escape') {
        closeCompose();
        document.removeEventListener('keydown', onKeydown);
      }
    };
    document.addEventListener('keydown', onKeydown);

    // 聚焦
    setTimeout(function () {
      var ta = document.getElementById('community-compose-textarea');
      if (ta) ta.focus();
    }, 100);
  }

  // ===== 初始化函数 =====

  function initCommunity(target) {
    try {
      if (!target) {
        if (typeof AppState !== 'undefined' && AppState.rootElement) {
          target = AppState.rootElement;
        } else {
          target = document.getElementById('page-content');
        }
      }
      if (!target) {
        console.error('[BioQuest Community] initCommunity 找不到目标容器');
        return;
      }
      renderCommunityPage(target);
    } catch (err) {
      console.error('[BioQuest Community] initCommunity 异常:', err);
      if (target) {
        target.innerHTML = '<div style="text-align:center;padding:60px 20px;">' +
          '<p style="color:var(--color-error);font-size:1.1rem;margin-bottom:8px;">社区模块初始化失败</p>' +
          '<p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:16px;">请刷新页面或稍后重试</p>' +
          '<button onclick="location.reload()" style="padding:8px 20px;background:var(--color-sage);color:#fff;border:none;border-radius:8px;cursor:pointer;">刷新页面</button>' +
          '</div>';
      }
    }
  }

  // ===== 暴露到全局 =====
  window.renderCommunityPage = renderCommunityPage;
  window.initCommunity = initCommunity;

})();
