/**
 * ============================================================
 * OpenMAIC Store — 轻量状态管理（替代 zustand）
 * ------------------------------------------------------------
 * 原版用 zustand（create + useStore），BioQuest 零依赖且不需要
 * React hooks，所以这里用模块单例 + getState/setState + 订阅模式
 * 复刻 zustand 的核心 API：
 *
 *   const store = createStore({ count: 0 }, {
 *     inc: (s) => ({ count: s.count + 1 }),
 *   });
 *   store.getState();            // { count: 0, inc: function }
 *   store.setState({ count: 5 });// 浅合并
 *   store.subscribe((s, p) => …);// 订阅
 *
 * 内部用 emitter 实现，桥接 openmaic-emitter.js 的实例。
 * ============================================================
 */
(function (global) {
  'use strict';

  var Emitter = global.OpenMAICEmitter;

  /**
   * @param {Object} init - 初始 state
   * @param {Object} actions - action 函数，签名 (state, payload?) => partialState
   * @returns {Object} store
   */
  function createStore(init, actions) {
    actions = actions || {};
    var state = Object.assign({}, init);
    var emitter = new Emitter();

    // 把 action 挂到 state 上
    Object.keys(actions).forEach(function (k) {
      var fn = actions[k];
      state[k] = function () {
        var args = Array.prototype.slice.call(arguments);
        var prev = state;
        var partial = fn.apply(null, [prev].concat(args));
        if (partial && typeof partial === 'object') {
          setState(partial);
        }
      };
    });

    function setState(partial, replace) {
      var next = replace ? partial : Object.assign({}, state, partial);
      var prev = state;
      state = next;
      emitter.emit('change', state, prev);
      return state;
    }

    function getState() { return state; }

    function subscribe(listener) {
      emitter.on('change', listener);
      return function unsubscribe() { emitter.off('change', listener); };
    }

    function destroy() { emitter.clear(); }

    return {
      getState: getState,
      setState: setState,
      subscribe: subscribe,
      destroy: destroy,
      _emitter: emitter,
    };
  }

  /**
   * zustand selectors 模式：为 store 自动生成 use.xxx() 函数。
   * 兼容原版 createSelectors 的 API（store.use.foo()）。
   */
  function createSelectors(store) {
    var state = store.getState();
    store.use = {};
    Object.keys(state).forEach(function (k) {
      if (typeof state[k] === 'function') return; // 跳过 action
      store.use[k] = function () { return store.getState()[k]; };
    });
    return store;
  }

  global.OpenMAICStore = {
    create: createStore,
    createSelectors: createSelectors,
  };
})(typeof window !== 'undefined' ? window : globalThis);
