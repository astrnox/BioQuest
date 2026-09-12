/**
 * 首屏骨架遮罩：加载动画展示 → 等应用首屏渲染完成（Hero/倒计时/布局已提交） → 平滑淡出进入主页面。
 * 遮罩在页面内容真正就绪后才消失，避免"内容还没渲染就过早撤遮罩"导致的卡顿/空白/下拉卡一下。
 * 进度条：加权步骤 + 渐进逼近，只增不减、不提前到 100%，动画时长随真实加载时长走。
 */
(function () {
  var mask = document.getElementById('bq-boot-mask');
  if (!mask) return;
  var done = false;
  var startTime = Date.now();

  // ---- 加载进度估算器 ----
  // 参考 GitHub 现成实现 load-time-estimate / fake-progress 的思想：
  //   真实完成节点标记权重 → 进度只增不减（ever-increasing）→ 用渐进曲线逼近档位上限，
  //   且永不提前到 100%（除非收到 app-ready 真正完成的信号）。
  var BootProgress = {
    done: 0,   // 已完成的加权和
    cap: 0,    // 当前"档位上限"（不会显示超过该值）
    show: 0,   // 当前已显示的百分比
    max: 100,
    fill: document.getElementById('bq-boot-progress-fill'),
    pct: document.getElementById('bq-boot-percent'),
    _timer: null,
    _ended: false,
    addWeight: function (w, hi) {
      if (this._ended) return;
      this.done = Math.min(this.max, this.done + (w || 0));
      var c = Math.max(this.cap, this.done);
      if (typeof hi === 'number') c = Math.max(c, hi);
      this.cap = Math.min(this.max, c);
      this._tick();
      this._schedule();
    },
    set: function (p) {
      if (this._ended) return;
      p = Math.min(this.max, Math.max(p, this.done));
      this.done = p;
      if (this.cap < p) this.cap = p;
      this._tick();
      this._schedule();
    },
    complete: function () {
      this._ended = true;
      if (this._timer) { clearTimeout(this._timer); this._timer = null; }
      this._animate();
    },
    _schedule: function () {
      var self = this;
      if (this._timer || this._ended) return;
      if (this.cap <= this.show || this.cap >= this.max) return;
      this._timer = setTimeout(function () {
        self._timer = null;
        self._tick();
        if (self.cap > self.show && self.cap < self.max) self._schedule();
      }, 110);
    },
    _tick: function () {
      if (this.cap <= this.show) return;
      // 渐进逼近上限：越快越慢，符合"前期快、后期慢"的直觉
      this._setShow(this.show + Math.max(0.4, (this.cap - this.show) * 0.10));
    },
    _animate: function () {
      var self = this;
      (function step() {
        var gap = 100 - self.show;
        if (gap <= 0.5) { self._setShow(100); return; }
        self._setShow(self.show + Math.max(0.4, gap * 0.22));
        requestAnimationFrame(step);
      })();
    },
    _setShow: function (v) {
      this.show = Math.min(this.max, v);
      if (this.pct) { try { this.pct.textContent = Math.floor(this.show) + '%'; } catch (e) {} }
      if (this.fill) { this.fill.style.width = this.show + '%'; }
    }
  };
  window.BootProgress = BootProgress;
  window.__bootWeight = function (w, hi) { if (BootProgress) BootProgress.addWeight(w, hi); };

  function fadeOut() {
    if (done) return;
    done = true;
    // 开始淡出时把进度补足到 100%
    if (BootProgress) BootProgress.complete();
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

  // ---- 就绪判定 ----
  // 遮罩只在"页面可交互"后撤除：bioquest:app-ready 由 SPA 路由在首帧渲染完成后派发，
  // 此时全部 defer 脚本已按序执行完毕、首屏已绘制，页面可点击。
  // 不再等待 window.load —— 它会被 7.6MB 字体/图片等资源无限期拖住，造成
  // "进度条走完但页面还在加载/卡"的错位感（字体走 font-display:swap 异步加载，不影响交互）。
  var contentReady = false;  // bioquest:app-ready 已收到
  var APP_READY_CAP = 15000; // 兜底：异常路径（app-ready 未派发）也不让遮罩永久卡死

  function bootTick() {
    var capReached = Date.now() - startTime >= APP_READY_CAP;
    if (contentReady || capReached) {
      startFadeOut();
    } else if (BootProgress) {
      BootProgress._schedule(); // 未就绪时保持进度条继续渐进逼近
    }
  }

  // 主信号：应用首屏渲染/路由完成 → 页面已可交互，撤遮罩（进度同时补足到 100%）。
  document.addEventListener('bioquest:app-ready', function () {
    contentReady = true;
    if (window.BootProgress) BootProgress.addWeight(40, 92);
    // 给最后一帧布局/绘制留一点缓冲，避免淡出瞬间卡顿
    setTimeout(bootTick, 40);
  });

  // 进度标记：HTML/CSS/脚本解析阶段
  var onDOMReady = function () {
    if (window.BootProgress) BootProgress.addWeight(15, 20);
    bootTick();
  };
  if (document.readyState === 'interactive' || document.readyState === 'complete') onDOMReady();
  else document.addEventListener('DOMContentLoaded', onDOMReady);

  // 兜底：极长时间仍未就绪（异常路径），避免遮罩永久卡死。
  setTimeout(function () { contentReady = true; if (!done) startFadeOut(); }, APP_READY_CAP);
})();
