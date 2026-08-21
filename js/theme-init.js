/**
 * 主题初始化（同步执行，必须在首帧渲染前运行，防白屏/闪烁）
 * 由 index.html 在 <head> 中 style 之后、以同步 <script src> 方式加载。
 * 只做"读取并应用主题"这一件事，其余主题逻辑（切换、写入、强调色）留在 app.js。
 */
(function () {
  try {
    var t = localStorage.getItem('bioquest-theme');
    if (t === 'dark' || t === 'light') {
      document.documentElement.setAttribute('data-theme', t);
    } else {
      // 用户没设就跟随系统，避免 paint 一次再被 CSS 覆盖
      var mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
      if (mql && mql.matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }
  } catch (e) {}
})();
