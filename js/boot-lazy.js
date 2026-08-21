/**
 * 启动辅助（defer 加载，非首帧关键）：
 *  - __loadSupabaseFallback / __loadSupabaseSDK：延迟加载 Supabase SDK，不阻塞 DOMContentLoaded
 *  - data-route 点击委托兜底：app.js 未就绪时由本脚本处理 [data-route] 导航
 */
(function () {
  // ---- 异步 CSS 提升 ----
  // 将 <link rel="preload" as="style" data-css-async> 提升为真正生效的样式表（等价于 onload 切换 rel）。
  // 必须在 DOMContentLoaded 前执行；defer 脚本在解析完成后、DOMContentLoaded 前运行，时机满足。
  function promoteAsyncCss() {
    var links = document.querySelectorAll('link[rel="preload"][as="style"][data-css-async]');
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      link.rel = 'stylesheet';
      link.removeAttribute('data-css-async');
    }
  }
  if (document.readyState === 'interactive' || document.readyState === 'complete') promoteAsyncCss();
  else document.addEventListener('DOMContentLoaded', promoteAsyncCss);

  // ---- 首页关键模块：首屏动画立即加载（非关键模块由 app.js 延迟加载）----
  document.addEventListener('DOMContentLoaded', function () {
    if (typeof window.loadModule === 'function') {
      window.loadModule('hero-sketch');
    }
  });

  // ---- Supabase 延迟加载 ----
  window.__supabaseLoaded = false;
  window.__loadSupabaseFallback = function (script) {
    if (window.__supabaseLoaded || typeof window.supabase !== 'undefined') return;
    var s = document.createElement('script');
    s.src = 'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    s.defer = true;
    s.onerror = function () {
      console.warn('[BioQuest] Supabase SDK 镜像加载失败，将使用本地存储模式');
      document.documentElement.classList.add('supabase-fallback');
      if (typeof window.showStorageStatus === 'function') window.showStorageStatus('local');
    };
    document.head.appendChild(s);
  };

  function __loadSupabaseSDK() {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.defer = true;
    s.onload = function () { window.__supabaseLoaded = true; };
    s.onerror = function () { window.__loadSupabaseFallback(this); };
    document.head.appendChild(s);
  }
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(__loadSupabaseSDK, { timeout: 3000 });
  } else {
    setTimeout(__loadSupabaseSDK, 1000);
  }

  // ---- data-route 点击委托兜底 ----
  // app.js 加载后会暴露 navigateTo，此时由 app.js 统一处理；这里仅作兜底
  document.addEventListener('click', function (e) {
    // data-action 委托：调用 window 上的同名函数（如 showFeedbackModal / openDonation）
    var actionEl = e.target.closest('[data-action]');
    if (actionEl && !actionEl.getAttribute('data-route')) {
      var fnName = actionEl.getAttribute('data-action');
      var fn = fnName && window[fnName];
      if (typeof fn === 'function') {
        e.preventDefault();
        fn.call(actionEl);
        return;
      }
    }
    if (typeof window.navigateTo === 'function') return;
    var link = e.target.closest('[data-route]');
    if (link) {
      var route = link.getAttribute('data-route');
      if (route && route.startsWith('/')) {
        e.preventDefault();
        window.location.hash = route;
      }
    }
  });
})();
