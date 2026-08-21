/**
 * PWA Service Worker 注册（外部化，defer 加载）。
 * DOMContentLoaded 立即启动，避免 window load 太晚导致
 * SW install/warmup 被图片/字体等大资源挤占下载带宽；配 6s 硬超时兜底
 * 防止首次启动时 SW 注册 pending 导致用户感知"卡住/需手动刷新"。
 */
(function () {
  if ('serviceWorker' in navigator) {
    var registerFn = function () {
      // 低电量 / 2G / 用户明确设置 reduce-data 时就不注册 SW，避免"慢"
      var conn = (navigator.connection || navigator.mozConnection || navigator.webkitConnection);
      if (conn && (conn.saveData ||
        (conn.effectiveType && /^2g$/.test(conn.effectiveType)) ||
        (conn.downlink != null && conn.downlink < 0.4))) {
        console.info('[SW] 低带宽/省流模式，跳过 SW 注册');
        return;
      }
      // 超时保护：navigator.serviceWorker.register 理论上永不超时，
      // 这里 AbortController 不能作用于它，用 Promise.race + 标记跳过即可
      var timeoutMs = 6000;
      var timedOut = false;
      var timer = setTimeout(function () {
        timedOut = true;
        console.warn('[SW] 注册超过 ' + timeoutMs + 'ms，暂时放弃，不阻塞页面');
      }, timeoutMs);
      var regPromise = navigator.serviceWorker.register('sw.js');
      regPromise.then(function (registration) {
        if (timedOut) return;
        clearTimeout(timer);
        console.log('[SW] 注册成功:', registration.scope);
      }).catch(function (error) {
        if (timedOut) return;
        clearTimeout(timer);
        console.warn('[SW] 注册失败:', error);
      });
    };
    // DOMContentLoaded 立即开始，不再等 window load（那会被 7.7MB woff2 等阻塞）
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      setTimeout(registerFn, 0);
    } else {
      document.addEventListener('DOMContentLoaded', function () { setTimeout(registerFn, 0); });
    }
  }
})();
