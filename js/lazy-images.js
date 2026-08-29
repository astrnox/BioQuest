/**
 * #116 [P3-14] 无图片懒加载
 * 为「不在首屏」的 <img> 补充原生 loading="lazy" + decoding="async"，
 * 并监听动态插入的 <img>（MutationObserver，200ms 节流）。
 *
 * 规则：
 *  - 判定「不在首屏」：img 带 data-bq-lazy 属性，或 getBoundingClientRect().top > 视口高度。
 *  - 对未加 loading 属性且不在首屏的 img：补 loading="lazy" + decoding="async"。
 *  - 首屏 img 保持 eager（不强制改）；已带 loading 属性的 img 尊重作者意图不去覆盖。
 *  - 尊重 prefers-reduced-motion：减弱动效用户禁用滚动触发的懒加载，保持全量立即加载。
 *  - 暴露 window.LazyImages.scan(container)，可手动触发全量扫描。
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  function isBelowFold(img) {
    try {
      var rect = img.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight || 0;
      return rect.top > vh;
    } catch (e) {
      return false;
    }
  }

  function applyToImg(img) {
    // 已带 loading 属性的不覆盖（首屏 eager 即保持修改前状态）
    if (img.getAttribute('loading') !== null) return;
    if (img.hasAttribute('data-bq-lazy') || isBelowFold(img)) {
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
    }
    // 首屏无 loading 属性的 img：保持 eager，不新增属性
  }

  function scan(container) {
    var root = container || document;
    if (!root || !root.querySelectorAll) return;
    var imgs = root.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) applyToImg(imgs[i]);
  }

  // 暴露公共 API（供其它模块在特定容器插入图片后手动触发）
  window.LazyImages = { scan: scan };

  // 尊重 prefers-reduced-motion：减弱动效时不启用滚动触发懒加载
  if (reduceMotion && reduceMotion.matches) return;

  // 首次扫描既有图片
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { scan(); });
  } else {
    scan();
  }

  // 监听 body 上动态新增的 <img>，200ms 节流后统一扫描
  var timer = null;
  function scheduleScan() {
    if (timer) return;
    timer = setTimeout(function () {
      timer = null;
      scan();
    }, 200);
  }

  var MutationCtor = window.MutationObserver || window.WebKitMutationObserver;
  if (MutationCtor && document.body) {
    var observer = new MutationCtor(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'childList' && m.addedNodes.length) {
          scheduleScan();
          break;
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // 运行期间用户开启减弱动效：停止后续懒加载行为并清掉待执行扫描
  if (reduceMotion && typeof reduceMotion.addEventListener === 'function') {
    reduceMotion.addEventListener('change', function (e) {
      if (e.matches) {
        if (timer) { clearTimeout(timer); timer = null; }
        if (observer) { try { observer.disconnect(); } catch (err) {} observer = null; }
      }
    });
  }
})();