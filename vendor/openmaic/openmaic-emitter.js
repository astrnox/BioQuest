/**
 * ============================================================
 * OpenMAIC Emitter — 事件总线（移植自 lib/utils/emitter.ts）
 * ------------------------------------------------------------
 * 原版依赖 mitt（npm 包），本文件用纯 JS 重新实现。
 *
 * 用法：
 *   var emitter = new OpenMAICEmitter();
 *   emitter.on('eventName', function(data) { ... });
 *   emitter.emit('eventName', payload);
 *   emitter.off('eventName', handler);
 * ============================================================
 */
(function (global) {
  'use strict';

  function Emitter() {
    this._listeners = Object.create(null);
  }

  Emitter.prototype.on = function (event, handler) {
    if (typeof handler !== 'function') return;
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(handler);
  };

  Emitter.prototype.once = function (event, handler) {
    var self = this;
    function wrap() {
      self.off(event, wrap);
      handler.apply(null, arguments);
    }
    wrap._origin = handler;
    this.on(event, wrap);
  };

  Emitter.prototype.off = function (event, handler) {
    var list = this._listeners[event];
    if (!list) return;
    if (!handler) {
      delete this._listeners[event];
      return;
    }
    for (var i = list.length - 1; i >= 0; i--) {
      if (list[i] === handler || list[i]._origin === handler) {
        list.splice(i, 1);
      }
    }
  };

  Emitter.prototype.emit = function (event) {
    var list = this._listeners[event];
    if (!list || list.length === 0) return;
    var args = Array.prototype.slice.call(arguments, 1);
    // 复制一份避免回调中 off 导致跳过
    var snapshot = list.slice();
    for (var i = 0; i < snapshot.length; i++) {
      try {
        snapshot[i].apply(null, args);
      } catch (e) {
        if (global.console && console.error) console.error('[Emitter]', event, e);
      }
    }
  };

  Emitter.prototype.clear = function () {
    this._listeners = Object.create(null);
  };

  // ============== 预定义事件名（与原 lib/utils/emitter.ts 对齐） ==============
  Emitter.Events = {
    RICH_TEXT_COMMAND: 'RICH_TEXT_COMMAND',
    SYNC_RICH_TEXT_ATTRS_TO_STORE: 'SYNC_RICH_TEXT_ATTRS_TO_STORE',
    OPEN_CHART_DATA_EDITOR: 'OPEN_CHART_DATA_EDITOR',
    OPEN_LATEX_EDITOR: 'OPEN_LATEX_EDITOR',
  };

  // ============== 全局单例 ==============
  var globalEmitter = new Emitter();

  global.OpenMAICEmitter = Emitter;
  global.OpenMAICEmitterGlobal = globalEmitter;
})(typeof window !== 'undefined' ? window : globalThis);
