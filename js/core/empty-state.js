/**
 * ============================================================
 * BioQuest — 统一「温暖空状态」组件（Issue #125）
 * 为各数据区域（错题/收藏/排行/点数流水等）提供一致的空状态：
 * 生物主题 icon + 标题 + 提示 + 可选行动按钮。
 *
 * 用法：
 *   container.innerHTML = BioQuest.emptyStateHTML({
 *     icon: '🧪',              // 自定义 emoji/SVG，缺省按 title 自动挑选
 *     title: '暂无错题记录',
 *     hint: '练习时答错的题目会自动收录到这里',
 *     action: { label: '去练习', onClick: function () {} }
 *   });
 * ============================================================
 */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  var ICONS = {
    book: '📗', star: '⭐', flask: '🧪', dna: '🧬', bug: '🐞',
    chart: '📈', clock: '⏰', fire: '🔥', leaf: '🍃', inbox: '📥'
  };

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function pickIcon(title, icon) {
    if (icon) return icon;
    var t = String(title || '');
    if (/收藏|favorite/i.test(t)) return ICONS.star;
    if (/错题|wrong/i.test(t)) return ICONS.bug;
    if (/排行|榜|leaderboard/i.test(t)) return ICONS.chart;
    if (/打卡|习惯|streak/i.test(t)) return ICONS.fire;
    if (/卡片|card/i.test(t)) return ICONS.leaf;
    if (/记录|练习|record/.test(t)) return ICONS.flask;
    return ICONS.inbox;
  }

  /**
   * 生成空状态 HTML 字符串。
   * @param {Object} opts - { icon, title, hint, action: { label, onClick }, className }
   * @returns {string}
   */
  function emptyStateHTML(opts) {
    opts = opts || {};
    var title = opts.title || '这里还空空的';
    var icon = pickIcon(title, opts.icon);
    var hint = opts.hint || '';
    var actionHTML = '';
    if (opts.action && opts.action.label) {
      actionHTML = '<button type="button" class="bq-empty-cta" data-empty-action="' +
        escapeHtml(opts.action.label) + '">' + escapeHtml(opts.action.label) + '</button>';
    }
    var cls = 'bq-empty-state' + (opts.className ? ' ' + opts.className : '');
    // 若 opts.action 同时携带 onClick，则同步注册到全局委托表
    // （emptyStateHTML 也支持可点击的行动按钮，与 renderEmptyState 行为一致）
    if (opts.action && opts.action.onClick && opts.action.label) {
      actionHandlers[String(opts.action.label)] = opts.action.onClick;
    }
    return (
      '<div class="' + cls + '" role="status">' +
        '<div class="bq-empty-icon" aria-hidden="true">' + icon + '</div>' +
        '<p class="bq-empty-title">' + escapeHtml(title) + '</p>' +
        (hint ? '<p class="bq-empty-hint">' + escapeHtml(hint) + '</p>' : '') +
        actionHTML +
      '</div>'
    );
  }

  // 全局按钮委托：action 不渲染成内联脚本，事件经委托表触发（与 CSP 兼容）
  var actionHandlers = {};
  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('[data-empty-action]') : null;
    if (!btn) return;
    var fn = actionHandlers[btn.getAttribute('data-empty-action')];
    if (typeof fn === 'function') fn.call(btn, e);
  });

  /**
   * 渲染到容器（返回是否插入了空状态）。
   */
  function renderEmptyState(container, opts) {
    if (!container) return false;
    container.innerHTML = emptyStateHTML(opts);
    if (opts.action && opts.action.onClick && opts.action.label) {
      actionHandlers[String(opts.action.label)] = opts.action.onClick;
    }
    return true;
  }

  var api = { emptyStateHTML: emptyStateHTML, renderEmptyState: renderEmptyState };
  window.BioQuest = window.BioQuest || {};
  window.BioQuest.emptyStateHTML = emptyStateHTML;
  window.BioQuest.renderEmptyState = renderEmptyState;
})();