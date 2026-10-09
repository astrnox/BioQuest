/**
 * ============================================================
 * TATABOX — 统一「温暖空状态」组件（Issue #125）
 * 为各数据区域（错题/收藏/排行/点数流水等）提供一致的空状态：
 * 标题 + 提示 + 可选行动按钮。
 *
 * 用法：
 *   container.innerHTML = BioQuest.emptyStateHTML({
 *     title: '暂无错题记录',
 *     hint: '练习时答错的题目会自动收录到这里',
 *     action: { label: '去练习', onClick: function () {} }
 *   });
 * ============================================================
 */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  var escapeHtml = (typeof window !== 'undefined' ? window : globalThis).escapeHtml; // 规范实现见 js/core/utils.js（Q-01 统一）

  /**
   * 生成空状态 HTML 字符串。
   * @param {Object} opts - { title, hint, action: { label, onClick }, className }
   * @returns {string}
   */
  function emptyStateHTML(opts) {
    opts = opts || {};
    var title = opts.title || '这里还空空的';
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