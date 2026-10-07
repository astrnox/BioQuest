/**
 * 首屏骨架遮罩：加载动画展示 → 等应用首屏渲染完成（Hero/倒计时/布局已提交） → 平滑淡出进入主页面。
 * 遮罩在页面内容真正就绪后才消失，避免"内容还没渲染就过早撤遮罩"导致的卡顿/空白/下拉卡一下。
 * 加载动画本身是纯 CSS 的碱基配对（见 index.html 内联样式），这里只负责"何时撤除遮罩"：
 *   - 真实完成节点：bioquest:app-ready（SPA 路由首帧渲染完成后派发）
 *   - 兜底超时后：只有确认页面内容已渲染才淡出；如果应用脚本根本没启动
 *     （脚本加载/解析失败），则原地展示错误重试，而不是淡出成一页空白。
 */
(function () {
  var mask = document.getElementById('bq-boot-mask');
  if (!mask) return;
  var done = false;
  var startTime = Date.now();

  /** 确认页面内容真的渲染出来了（而不是一页空白） */
  function hasRenderedContent() {
    try {
      if (document.getElementById('page-content') && document.getElementById('page-content').children.length > 0) return true;
      var hero = document.querySelector('.hero') || document.getElementById('main-content');
      if (hero && hero.children.length > 0) return true;
    } catch (e) { /* ignore */ }
    return false;
  }

  /** 应用脚本是否已经开始执行（app.js 首行写入 window.__appBooted） */
  function appStarted() {
    return typeof window.__appBooted !== 'undefined' || typeof window.initApp === 'function';
  }

  /** 兜底超时仍无内容：展示错误重试而不是淡出到空白页 */
  var bootErrorShown = false; // 错误兜底已展示（app-ready 晚到时用于撤销，防止卡死）

  function showBootError() {
    if (done) return;
    done = true;
    bootErrorShown = true;
    // 在遮罩内渲染一个轻量错误卡片（纯 DOM API，无内联脚本，符合 CSP）
    try {
      var box = document.createElement('div');
      box.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;max-width:300px;';
      var title = document.createElement('div');
      title.textContent = '页面加载失败';
      title.style.cssText = 'font-family:var(--font-serif);font-size:1.05rem;font-weight:600;color:#2c3e30;';
      var tip = document.createElement('div');
      tip.textContent = '加载资源超时，请检查网络后重试。';
      tip.style.cssText = 'font-size:0.85rem;color:#7a877d;';
      var btn = document.createElement('button');
      btn.textContent = '刷新重试';
      btn.type = 'button';
      btn.style.cssText = 'border:1px solid #3a6b4a;background:#3a6b4a;color:#fff;border-radius:18px;padding:8px 22px;font-size:0.88rem;cursor:pointer;';
      btn.addEventListener('click', function () { try { window.location.reload(); } catch (e) {} });
      box.appendChild(title);
      box.appendChild(tip);
      box.appendChild(btn);
      var logo = document.getElementById('bq-boot-logo');
      var label = document.getElementById('bq-boot-label');
      var pairs = document.getElementById('bq-boot-pairs');
      [pairs, label, logo].forEach(function (el) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
      mask.appendChild(box);
    } catch (e) { /* 展示失败也不抛异常 */ }
  }

  function fadeOut() {
    if (done) return;
    done = true;
    // 核心：确保撤遮罩前，浏览器已完成首屏布局与绘制。
    // 两轮 rAF 保证至少一次 layout + paint 已提交；再强制一次 reflow 读取，
    // 确保页面高度/滚动条已存在，避免"进主页后拉不动一会"的现象。
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        try {
          // 强制 reflow：读取首屏元素尺寸，触发浏览器完成 layout 计算
          var h = document.getElementById('main-content') || document.querySelector('.hero');
          if (h) void h.offsetHeight;
          var pc = document.getElementById('page-content');
          if (pc) void pc.scrollHeight;
          // 确保 body 可滚动
          document.body.style.overflowY = '';
          if (document.documentElement) {
            document.documentElement.style.overflowY = '';
          }
        } catch (e) {}
        // 再加一轮 rAF + 微延迟，给移动端布局提交留缓冲
        requestAnimationFrame(function () {
          setTimeout(function () {
            mask.classList.add('is-ready');
            // 淡出过渡结束后立即从 DOM 移除，避免残留的 fixed 遮罩干扰移动端首次滚动
            var removed = false;
            function removeMask() {
              if (removed) return;
              removed = true;
              if (mask && mask.parentNode) mask.parentNode.removeChild(mask);
            }
            mask.addEventListener('transitionend', function onEnd(e) {
              if (e.propertyName === 'opacity' || e.propertyName === 'visibility') removeMask();
            });
            setTimeout(removeMask, 400); // 兜底：过渡结束后即便没触发 transitionend 也移除
          }, 30);
        });
      });
    });
  }

  function startFadeOut() {
    // 仅作为"最短展示时间"下限：让动画至少可见约 500ms，让用户看到"在加载"。
    var elapsed = Date.now() - startTime;
    var MIN_VISIBLE = 500;
    if (elapsed >= MIN_VISIBLE) fadeOut();
    else setTimeout(fadeOut, MIN_VISIBLE - elapsed);
  }

  /** 应用「已启动但内容迟迟没渲染」或「完全没启动」时的兜底判定 */
  function bootIsBroken() {
    // 罕见但致命的情形：app.js 没能执行（解析失败/网络失败被缓存污染等），
    // 此时淡出只能看到一页静态骨架 —— 直接进入错误重试界面。
    if (!appStarted()) return true;
    // app.js 已启动但路由没有产出任何内容 —— 大概率渲染链路出错，同样不淡出到空白。
    return !hasRenderedContent();
  }

  // ---- 就绪判定 ----
  // 遮罩只在"页面可交互"后撤除：bioquest:app-ready 由 SPA 路由在首帧渲染完成后派发，
  // 此时全部 defer 脚本已按序执行完毕、首屏已绘制，页面可点击。
  // 不再等待 window.load —— 它会被 7.6MB 字体/图片等资源无限期拖住，造成
  // "内容ready了但遮罩还在"的错位感（字体走 font-display:swap 异步加载，不影响交互）。
  var contentReady = false;  // bioquest:app-ready 已收到
  var APP_READY_CAP = 15000; // 正常路径兜底：app-ready 未派发也不让遮罩永久卡死

  function bootTick() {
    var elapsed = Date.now() - startTime;
    var capReached = elapsed >= APP_READY_CAP;
    // 兜底时间到：先检查内容是否真的渲染了 —— 是则淡出，否则错误重试
    if (capReached && !contentReady && bootIsBroken()) {
      showBootError();
      return;
    }
    if (contentReady || capReached) {
      startFadeOut();
    }
  }

  // 主信号：应用首屏渲染/路由完成 → 页面已可交互，撤遮罩。
  document.addEventListener('bioquest:app-ready', function () {
    contentReady = true;
    // 竞态撤销：弱网/慢终端下 15s 兜底可能已展示"刷新重试"错误页，
    // 而应用此刻才真正加载完成。此时应撤销 done 标记，改走正常淡出，
    // 绝不让用户卡死在错误页（加载完成却被误报失败）。
    if (done && bootErrorShown) {
      done = false;
      bootErrorShown = false;
    }
    // 给最后一帧布局/绘制留一点缓冲，避免淡出瞬间卡顿
    setTimeout(bootTick, 40);
  });

  var onDOMReady = function () {
    bootTick();
  };
  if (document.readyState === 'interactive' || document.readyState === 'complete') onDOMReady();
  else document.addEventListener('DOMContentLoaded', onDOMReady);

  // 兜底：极长时间仍未就绪（异常路径），避免遮罩永久卡死；但绝不淡出到空白页
  // （不在这里置 contentReady —— bootTick 会根据 elapsed 决定走淡出还是错误重试）。
  setTimeout(function () {
    if (!done) bootTick();
  }, APP_READY_CAP);
})();