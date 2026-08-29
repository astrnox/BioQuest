/**
 * ============================================================
 * BioQuest — 生物主题微交互彩蛋（Issue #128）
 *  - 答题正确：细胞分裂动画爆发（自动检测 .pq-exp.show.correct /
 *    .practice-answer-correct 等元素出现时触发，也支持声明式
 *    [data-egg="cell-division"]）；
 *  - 连续打卡里程碑：DNA 链生长动画（声明式 [data-egg="dna"]，
 *    habits.js 在里程碑时主动调用 BioEggs.dnaGrow(card)）；
 *  - 尊重 prefers-reduced-motion（CSS 层面禁用动画）。
 * ============================================================
 */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  var MAX_BURST = 3;         // 同一时刻最多 3 个，避免刷屏
  var _active = 0;

  function _isReducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }

  function _elRect(anchor) {
    if (!anchor || typeof anchor.getBoundingClientRect !== 'function') {
      return { left: window.innerWidth / 2, top: window.innerHeight / 3 };
    }
    var r = anchor.getBoundingClientRect();
    // 彩蛋使用 position:fixed（视口坐标系），直接取视口坐标，
    // 不要再叠加 scrollX/scrollY，否则页面滚动后彩蛋位置会漂移。
    return { left: r.left + (r.width || 0) / 2, top: r.top || (window.innerHeight / 3) };
  }

  /**
   * 细胞分裂爆发动画（答题正确时调用）。
   * @param {HTMLElement} [anchor] - 锚点元素（默认屏幕上方 1/3 处）
   */
  function burstCellDivision(anchor) {
    if (_isReducedMotion() || _active >= MAX_BURST) return;
    var pos = _elRect(anchor);
    var el = document.createElement('div');
    el.className = 'bq-egg-cell';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<i></i><em></em>';
    el.style.left = pos.left + 'px';
    el.style.top = pos.top + 'px';
    document.body.appendChild(el);
    _active++;
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
      _active = Math.max(0, _active - 1);
    }, 950);
  }

  /**
   * DNA 链生长动画（连续打卡里程碑时调用）。
   * @param {HTMLElement} [anchor] - 锚点元素
   */
  function dnaGrow(anchor) {
    if (_isReducedMotion()) return;
    var pos = _elRect(anchor);
    var el = document.createElement('div');
    el.className = 'bq-egg-dna';
    el.setAttribute('aria-hidden', 'true');
    // 简单 DNA 双螺旋骨架（静态几何，动画由 CSS 控制生长）
    el.innerHTML =
      '<svg viewBox="0 0 44 120">' +
      '<path class="bq-dna-strand" d="M8,6 C30,16 30,26 8,36 C-14,46 -14,56 8,66 C30,76 30,86 8,96 C-14,106 -6,112 10,118"/>' +
      '<path class="bq-dna-strand" d="M36,6 C14,16 14,26 36,36 C58,46 58,56 36,66 C14,76 14,86 36,96 C58,106 48,112 32,118"/>' +
      '<line class="bq-dna-rung" x1="5" y1="24" x2="39" y2="22"/><line class="bq-dna-rung" x1="5" y1="48" x2="39" y2="46"/>' +
      '<line class="bq-dna-rung" x1="5" y1="72" x2="39" y2="70"/><line class="bq-dna-rung" x1="5" y1="96" x2="39" y2="94"/>' +
      '<circle class="bq-dna-node" cx="8" cy="6" r="2.6"/><circle class="bq-dna-node" cx="36" cy="6" r="2.6"/>' +
      '<circle class="bq-dna-node" cx="10" cy="118" r="2.6"/><circle class="bq-dna-node" cx="32" cy="118" r="2.6"/>' +
      '</svg>';
    el.style.left = pos.left + 'px';
    el.style.top = pos.top + 'px';
    document.body.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1150);
  }

  // ===== 自动触发：动态内容中出现"正确反馈 / data-egg 声明" =====
  var _lastAuto = 0;
  function maybeAutoTrigger(node) {
    if (_isReducedMotion()) return;
    if (typeof node.querySelectorAll !== 'function') return;
    var found = false;
    // ① 答题正确反馈 → 细胞分裂
    var corrects = node.querySelectorAll('.pq-exp.show.correct, .practice-answer-correct.show, .quiz-feedback.correct');
    if (corrects.length && Date.now() - _lastAuto > 600) {
      _lastAuto = Date.now();
      burstCellDivision(corrects[corrects.length - 1]);
      found = true;
    }
    // ② 声明式 [data-egg="dna" | "cell-division"]
    if (!found) {
      node.querySelectorAll('[data-egg="dna"]').forEach(function (el) {
        if (el.dataset.triggered) return;
        el.dataset.triggered = '1';
        dnaGrow(el);
        found = true;
      });
      node.querySelectorAll('[data-egg="cell-division"]').forEach(function (el) {
        if (el.dataset.triggered) return;
        el.dataset.triggered = '1';
        burstCellDivision(el);
        found = true;
      });
    }
    return found;
  }

  if (typeof MutationObserver === 'function') {
    var observer = new MutationObserver(function (mutations) {
      var throttled = (Date.now() - _lastAuto) > 300;
      if (!throttled) return;
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          maybeAutoTrigger(node);
        });
      });
    });
    // 等 DOM ready 后开始观察 body
    function startObserve() {
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startObserve);
    } else {
      startObserve();
    }
  }

  window.BioEggs = { burstCellDivision: burstCellDivision, dnaGrow: dnaGrow };
})();