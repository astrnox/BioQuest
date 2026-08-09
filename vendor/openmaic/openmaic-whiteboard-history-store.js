/**
 * ============================================================
 * OpenMAIC Whiteboard History Store — 撤销/重做历史（移植自 lib/store/whiteboard-history.ts）
 * ------------------------------------------------------------
 * 用 OpenMAIC 元素指纹（elementFingerprint）做快照去重，
 * 替代 zustand 版。配合 openmaic-element.js。
 *
 * 用法：
 *   var H = window.OpenMAICWhiteboardHistoryStore;
 *   H.getState().pushSnapshot(elements);
 *   if (H.getState().canUndo()) H.getState().undo();
 * ============================================================
 */
(function (global) {
  'use strict';

  var Store = global.OpenMAICStore;
  var Element = global.OpenMAICElement;

  var initial = {
    past: [],
    future: [],
    limit: 50,
  };

  var actions = {
    pushSnapshot: function (s, elements) {
      var fp = Element.elementFingerprint(elements || []);
      // 去重：与最近一次快照相同则不记录
      if (s.past.length && s.past[s.past.length - 1].fingerprint === fp) return;
      s.past = s.past.concat([{ elements: JSON.parse(JSON.stringify(elements || [])), fingerprint: fp, at: Date.now() }]);
      if (s.past.length > s.limit) s.past = s.past.slice(-s.limit);
      // 新操作清空 redo 栈
      s.future = [];
    },
    undo: function (s) {
      if (s.past.length < 2) return null; // 至少 2 个才能 undo
      var cur = s.past.pop();
      s.future = s.future.concat([cur]);
      return s.past[s.past.length - 1].elements;
    },
    redo: function (s) {
      if (!s.future.length) return null;
      var next = s.future.pop();
      s.past = s.past.concat([next]);
      return next.elements;
    },
    canUndo: function (s) { return s.past.length > 1; },
    canRedo: function (s) { return s.future.length > 0; },
    clear: function (s) { s.past = []; s.future = []; },
  };

  var store = Store.create(initial, actions);
  Store.createSelectors(store);

  global.OpenMAICWhiteboardHistoryStore = store;
})(typeof window !== 'undefined' ? window : globalThis);
