/**
 * ============================================================
 * BioQuest — 可访问性工具模块（a11y utilities）
 * 提供：
 *   1. 模态焦点陷阱（trapFocus）—— Tab/Shift+Tab 在模态内循环，ESC 触发回调
 *   2. aria-live 通告区（createLiveRegion / announce）—— 屏幕阅读器友好的动态内容播报
 *
 * 设计原则：
 *   - 零依赖，纯原生 JS，兼容至 ES5
 *   - 不破坏已有 modal 逻辑，仅作为增强
 *   - 陷阱句柄带 release() 方法，确保焦点可恢复
 * ============================================================
 */

(function () {
  'use strict';

  /** 可聚焦元素选择器（WAI-ARIA 标准集合） */
  var FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
    'summary'
  ].join(',');

  /**
   * 获取容器内所有可见且可聚焦的元素（顺序按 DOM）
   * @param {HTMLElement} container
   * @returns {Array<HTMLElement>}
   */
  function _getFocusable(container) {
    if (!container) return [];
    var els = container.querySelectorAll(FOCUSABLE_SELECTOR);
    var result = [];
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      // 排除不可见元素（display:none / visibility:hidden / 零尺寸且非当前焦点）
      if (el.offsetWidth === 0 && el.offsetHeight === 0 && el !== document.activeElement) continue;
      var style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      result.push(el);
    }
    return result;
  }

  /**
   * 在容器内设置焦点陷阱
   * - Tab 在最后一个可聚焦元素时回到第一个
   * - Shift+Tab 在第一个可聚焦元素时到最后一个
   * - ESC 触发 opts.onEscape（通常用于关闭模态）
   * - 释放时自动恢复焦点到陷阱前的元素
   *
   * @param {HTMLElement} container - 模态/遮罩根元素
   * @param {Object} [opts]
   *   - {Function} onEscape - ESC 键回调
   *   - {HTMLElement} initialFocus - 初始聚焦元素（默认第一个可聚焦元素）
   *   - {boolean} autoReleaseOnDetach - 容器从 DOM 移除时自动释放（默认 true）
   * @returns {{release: Function, container: HTMLElement}} 陷阱句柄
   */
  function trapFocus(container, opts) {
    opts = opts || {};
    // 防御性检查：container 为 null/undefined 时返回 noop 句柄，避免 addEventListener 抛错
    if (!container) {
      return {
        container: null,
        release: function () { /* noop */ }
      };
    }
    var previouslyFocused = document.activeElement;

    // 初始聚焦
    setTimeout(function () {
      if (!container || !container.parentNode) return; // 容器已被移除
      var toFocus = opts.initialFocus;
      if (!toFocus) {
        var focusable = _getFocusable(container);
        toFocus = focusable.length > 0 ? focusable[0] : container;
      }
      if (toFocus && typeof toFocus.focus === 'function') {
        try { toFocus.focus(); } catch (e) { /* 静默 */ }
      }
    }, 50);

    function onKeyDown(e) {
      // ESC 处理
      if (e.key === 'Escape' || e.keyCode === 27) {
        if (typeof opts.onEscape === 'function') {
          e.preventDefault();
          e.stopPropagation();
          opts.onEscape();
        }
        return;
      }
      // Tab 循环
      if (e.key !== 'Tab' && e.keyCode !== 9) return;

      var focusable = _getFocusable(container);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      var active = document.activeElement;

      if (e.shiftKey) {
        // Shift+Tab：从第一个跳到最后一个
        if (active === first || active === container || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab：从最后一个跳到第一个
        if (active === last || active === container || !container.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    // 在捕获阶段监听，确保早于其他 keydown 处理器
    container.addEventListener('keydown', onKeyDown, true);

    // 可选：容器从 DOM 移除时自动释放
    var detachObserver = null;
    if (opts.autoReleaseOnDetach !== false && typeof MutationObserver !== 'undefined') {
      detachObserver = new MutationObserver(function (records) {
        for (var i = 0; i < records.length; i++) {
          var removed = records[i].removedNodes;
          for (var j = 0; j < removed.length; j++) {
            if (removed[j] === container || (removed[j].contains && removed[j].contains(container))) {
              handle.release();
              return;
            }
          }
        }
      });
      detachObserver.observe(document.body, { childList: true, subtree: true });
    }

    var released = false;
    var handle = {
      container: container,
      release: function () {
        if (released) return;
        released = true;
        container.removeEventListener('keydown', onKeyDown, true);
        if (detachObserver) { detachObserver.disconnect(); detachObserver = null; }
        // 恢复焦点到陷阱前的元素
        if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
          // 确保元素仍在 DOM 中且可聚焦
          if (document.body.contains(previouslyFocused)) {
            try { previouslyFocused.focus(); } catch (e) { /* 静默 */ }
          }
        }
      }
    };

    return handle;
  }

  /**
   * 创建一个视觉隐藏但屏幕阅读器可读的 aria-live 通告区
   * @param {string} [level='polite'] - 'polite' 或 'assertive'
   * @param {HTMLElement} [parent=document.body]
   * @returns {HTMLElement} live region 元素
   */
  function createLiveRegion(level, parent) {
    var region = document.createElement('div');
    region.setAttribute('aria-live', level || 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('role', 'status');
    // 视觉隐藏（screen-reader-only 样式）
    region.style.position = 'absolute';
    region.style.width = '1px';
    region.style.height = '1px';
    region.style.overflow = 'hidden';
    region.style.clip = 'rect(0 0 0 0)';
    region.style.clipPath = 'inset(50%)';
    region.style.whiteSpace = 'nowrap';
    region.style.padding = '0';
    region.style.margin = '-1px';
    region.style.border = '0';
    (parent || document.body).appendChild(region);
    return region;
  }

  // 共享的通告区（懒加载，避免未使用时占用 DOM）
  var _politeRegion = null;
  var _assertiveRegion = null;

  /**
   * 向屏幕阅读器播报一条消息
   * @param {string} message - 要播报的文本
   * @param {string} [level='polite'] - 'polite'（等待用户空闲）或 'assertive'（立即打断）
   */
  function announce(message, level) {
    if (!message) return;
    if (!_politeRegion) _politeRegion = createLiveRegion('polite');
    if (!_assertiveRegion) _assertiveRegion = createLiveRegion('assertive');
    var region = (level === 'assertive') ? _assertiveRegion : _politeRegion;
    // 先清空再赋值，确保相同文本也能重新触发播报
    region.textContent = '';
    setTimeout(function () { region.textContent = String(message); }, 50);
  }

  /**
   * 给动态内容容器添加 aria-live 属性（用于流式输出区域）
   * @param {HTMLElement} el - 容器元素
   * @param {string} [level='polite']
   */
  function makeLive(el, level) {
    if (!el) return;
    el.setAttribute('aria-live', level || 'polite');
    el.setAttribute('aria-atomic', 'false');
    if (!el.getAttribute('role')) el.setAttribute('role', 'log');
  }

  // 暴露到全局
  window.BioQuestA11y = {
    trapFocus: trapFocus,
    createLiveRegion: createLiveRegion,
    announce: announce,
    makeLive: makeLive,
    FOCUSABLE_SELECTOR: FOCUSABLE_SELECTOR
  };

})();
