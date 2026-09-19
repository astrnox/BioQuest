/**
 * 旧内核浏览器兼容探测（同步，必须在任何 defer 脚本之前加载）。
 *
 * 目的：识别无法解析现代 JS 语法的老内核 WebView（如 Android 老系统上的
 * Via / 微信内置浏览器等，Chrome < 80 不支持 ?. / ??，Chrome < 55 不支持
 * async/await，Chrome < 42 无 fetch）。
 *
 * 机制：本文件故意使用现代语法（?. / ?? / 展开 / async）。
 *  - 现代浏览器：文件正常解析执行 → 设置 window.__bqProbeParsed = true，
 *    并综合语法 + API 检查设置 window.__bqModern。
 *  - 老内核浏览器：文件整体解析失败 → 两个标记均保持 undefined，
 *    legacy-fallback.js 据此判定并展示降级提示、揭开静态内容。
 *
 * 注意：本文件不得使用 eval / new Function（CSP 已移除 unsafe-eval），
 *      语法能力只能通过「文件能否被解析」这一事实来探测。
 */
(function () {
  // 能执行到这里，说明现代语法（?. ?? 展开 async）已可解析
  window.__bqProbeParsed = true;

  var syntaxOk = (function () {
    var o = null;
    var a = o ? o.x ?? 1 : 1;
    var s = [...[1], 2];
    var f = async function () { return 1; };
    return a === 1 && s.length === 2 && typeof f === 'function';
  })();

  // 应用运行所需的关键 API 齐备性（fetch / AbortController 等）
  var apisOk = !!(
    window.Promise && window.fetch && window.AbortController &&
    window.Map && window.Set && window.Symbol &&
    Object.assign && String.prototype.includes &&
    Array.prototype.find && window.requestAnimationFrame
  );

  window.__bqModern = !!(syntaxOk && apisOk);
})();
