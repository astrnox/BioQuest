/**
 * CSP-safe 事件委托（P1-8 动态内联处理器改造的基础设施）
 *
 * 目标：移除 script-src 的 'unsafe-inline' 后，JS 模板中通过 innerHTML 注入的
 * onclick 内联处理器会被 CSP 拦截。本模块提供统一的委托机制替代：
 *
 *   - data-on="['fnName', arg1, arg2]"  点击时调用 window.fnName(arg1, arg2)
 *       fnName 支持点路径（如 'window.showAuthModal' 或 'location.reload'）
 *       参数为 JSON 数组；arg 可为字符串/数字/布尔/null；true/false 直接可用
 *   - data-stop-propagation   点击时先 e.stopPropagation()
 *   - data-prevent-default    点击时先 e.preventDefault()
 *
 * 兼容 onchange/oninput 等非点击事件：data-on 前缀可指定事件类型，
 * 如 data-on-change='["handleChangeUserGroup", ...]'（见下方 dispatchByType）。
 *
 * 不依赖 eval/Function，只做 window 属性查找，符合 CSP。
 */
(function () {
  'use strict';

  function resolvePath(base, path) {
    var parts = path.split('.');
    var obj = base;
    for (var i = 0; i < parts.length; i++) {
      if (obj == null) return undefined;
      obj = obj[parts[i]];
    }
    return obj;
  }

  function parseArgs(raw) {
    if (!raw) return [];
    try {
      var v = JSON.parse(raw);
      return Array.isArray(v) ? v : [v];
    } catch (e) {
      console.warn('[CSP-Events] data-args 解析失败:', raw);
      return [];
    }
  }

  function runHandler(el, eventName, e) {
    var attrName = (eventName === 'click') ? 'data-on' : 'data-on-' + eventName;
    var raw = el.getAttribute(attrName);
    if (!raw) return false;

    if (el.hasAttribute('data-stop-propagation') && e && e.stopPropagation) {
      e.stopPropagation();
    }
    if (el.hasAttribute('data-prevent-default') && e && e.preventDefault) {
      e.preventDefault();
    }

    var parts = parseArgs(raw);
    var fnName = parts[0];
    if (typeof fnName !== 'string' || !fnName) return false;
    var fn = resolvePath(window, fnName);
    if (typeof fn !== 'function') {
      console.warn('[CSP-Events] 未找到处理器:', fnName);
      return false;
    }
    var args = parts.slice(1);
    // 兼容模板里需要 this 的场景：通过 data-this 传入"当前元素引用"关键字
    for (var i = 0; i < args.length; i++) {
      if (args[i] === '__this') args[i] = el;
    }
    fn.apply(el, args);
    return true;
  }

  // 委托：click 与常见非点击事件
  var EVENT_TYPES = ['click', 'change', 'input', 'keyup', 'submit', 'blur', 'focus', 'mouseover', 'mouseout'];

  for (var t = 0; t < EVENT_TYPES.length; t++) {
    (function (eventName) {
      document.addEventListener(eventName, function (e) {
        // 从事件目标向上找最近的带 data-on 的元素
        var target = e.target;
        if (!target || !target.closest) return;
        var el = target.closest('[' + (eventName === 'click' ? 'data-on' : 'data-on-' + eventName) + ']');
        if (!el) return;
        if (runHandler(el, eventName, e)) {
          // 防止事件继续冒泡到其它同名委托（如 app.js 里已有的全局 click 监听）
          if (eventName === 'click' && el.hasAttribute('data-stop-propagation')) {
            // stopPropagation 已在 runHandler 中调用
          }
        }
      }, true);
    })(EVENT_TYPES[t]);
  }

  window.__cspEvents = {
    runHandler: runHandler,
    parseArgs: parseArgs
  };
})();
