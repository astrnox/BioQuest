/**
 * #127 [P3-34] 暗色/亮色模式切换无过渡动画
 * 监听 <html> 的 data-theme 属性变化，切换后临时给 <html> 加 .bq-theme-anim 类，
 * 使 css/theme-transition.css 中的过渡规则生效，600ms 后再移除。
 *
 * 要点：
 *  - 忽略启动期前 3 秒内的首次设置（theme-init.js 同步 setAttribute 触发），避免首屏出现动画。
 *  - 尊重 prefers-reduced-motion：减弱动效用户不添加动画类。
 *  - 一次性定时器，切换后自动清理，不留残留类。
 */
(function () {
  'use strict';

  var htmlEl = document.documentElement;
  var timer = null;
  var observer = null;
  var startTime = Date.now();
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  function wantsReducedMotion() {
    return !!(reduceMotion && reduceMotion.matches);
  }

  function clearAnim() {
    if (timer) { clearTimeout(timer); timer = null; }
    htmlEl.classList.remove('bq-theme-anim');
  }

  function applyAnim() {
    // 忽略启动期前 3 秒内 theme 的首次设置，避免首屏出现过渡动画
    if (Date.now() - startTime < 3000) return;
    if (wantsReducedMotion()) return;
    if (timer) clearTimeout(timer);
    htmlEl.classList.add('bq-theme-anim');
    timer = setTimeout(function () {
      htmlEl.classList.remove('bq-theme-anim');
      timer = null;
    }, 600);
  }

  var MutationCtor = window.MutationObserver || window.WebKitMutationObserver;
  if (MutationCtor) {
    observer = new MutationCtor(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'attributes' && m.attributeName === 'data-theme') {
          applyAnim();
          break;
        }
      }
    });
    observer.observe(htmlEl, { attributes: true, attributeFilter: ['data-theme'] });
  }

  // 运行期间用户开启减弱动效：立即取消进行中的动画并暂停后续动画
  if (reduceMotion && typeof reduceMotion.addEventListener === 'function') {
    reduceMotion.addEventListener('change', function (e) {
      if (e.matches) {
        clearAnim();
        if (observer) { try { observer.disconnect(); } catch (err) {} observer = null; }
      }
    });
  }
})();