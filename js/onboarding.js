/**
 * ============================================================
 * BioQuest — PRD §3.1：3步Onboarding引导（已禁用）
 * 用户反馈引导弹窗仍会挡住下拉操作，彻底禁用：
 *  - 所有新老用户直接标记为"已完成引导"
 *  - 永不创建遮罩/卡片/任何 UI 元素
 *  - 仅保留 API 占位，不影响其他模块调用
 * ============================================================
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'bioquest_onboarding_done';

  function isDone() {
    try {
      // 永远视为已完成，避免任何条件下弹出引导
      if (localStorage.getItem(STORAGE_KEY) !== 'true') {
        localStorage.setItem(STORAGE_KEY, 'true');
      }
      return true;
    } catch (e) { return true; }
  }

  function markDone() {
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch (e) {}
  }

  // 启动时立刻标记为已完成，永不渲染任何 UI
  markDone();

  // 暴露全局（兼容其他模块可能的调用）
  window.Onboarding = {
    start: function () { markDone(); /* 无操作 */ },
    isDone: isDone
  };

  console.log('[BioQuest] Onboarding 引导已禁用');
})();