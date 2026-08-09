/**
 * ============================================================
 * OpenMAIC CN — className 拼接工具（移植自 lib/utils/cn.ts）
 * ------------------------------------------------------------
 * 原版用 clsx + tailwind-merge，本文件提供 clsx 兼容实现。
 * BioQuest 不使用 Tailwind，所以去掉 tailwind-merge，仅保留
 * 「支持字符串/对象/数组/null/false」拼接能力。
 *
 * 用法：
 *   cn('a', 'b')                       // "a b"
 *   cn('a', { b: true, c: false })     // "a b"
 *   cn(['a', 'b'], null, undefined)    // "a b"
 * ============================================================
 */
(function (global) {
  'use strict';

  function _toVal(mix) {
    if (typeof mix === 'string' || typeof mix === 'number') return String(mix);
    if (typeof mix !== 'object' || mix === null) return '';
    // 数组：递归
    if (Array.isArray(mix)) {
      var out = [];
      for (var i = 0; i < mix.length; i++) {
        var v = _toVal(mix[i]);
        if (v) out.push(v);
      }
      return out.join(' ');
    }
    // 对象：key 为类名，value 真值则加入
    var parts = [];
    for (var k in mix) {
      if (Object.prototype.hasOwnProperty.call(mix, k) && mix[k]) {
        parts.push(k);
      }
    }
    return parts.join(' ');
  }

  function cn() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) {
      var v = _toVal(arguments[i]);
      if (v) out.push(v);
    }
    return out.join(' ');
  }

  // 保留与 clsx 同名的别名，方便直接替换
  function clsx() {
    return cn.apply(null, arguments);
  }

  global.OpenMAICCn = cn;
  global.OpenMAICClsx = clsx;
})(typeof window !== 'undefined' ? window : globalThis);
