/**
 * BioQuest — FSRS 参数优化器（Issue #14：Web Worker 化）
 *
 * 本文件是「客户端壳」：
 *  - 优先把重计算（19 维梯度下降 fit / 批量调度 / 分片 SHA-256）postMessage 给 Web Worker
 *    （js/fsrs.worker.js，自包含纯函数，不依赖 window.FSRS UMD），避免主线程 Long Task。
 *  - Worker 加载/初始化失败时，自动回退到主线程同步执行（window.FSRSWorkerCore，
 *    与 Worker 同一份实现，保证结果一致）。
 *  - 保留旧同步 API（fit / evaluate / extractReviews / toFSRSParams / retention），
 *    新增 Async 变体（fitAsync / evaluateAsync / scheduleDueAsync / sha256HexAsync）。
 *
 * 输入：复习记录 [{ rating: 1..4, delta_t: 天, stability, difficulty, state }]
 * 输出：fit → { w: number[19], request_retention: 0.9, losses: number[] }
 */
(function () {
  'use strict';

  var REQUEST_TIMEOUT = 4000;      // Worker 单请求超时（ms），超时回退主线程
  var _worker = null;
  var _workerError = false;        // 一旦失败即永久回退，避免反复尝试
  var _seq = 0;
  var _pending = {};               // id -> { resolve, reject }

  function core() {
    return (typeof window !== 'undefined' && window.FSRSWorkerCore) || null;
  }

  /* ---------------- Worker 生命周期 ---------------- */

  function _createWorker() {
    if (_workerError) return null;
    if (_worker) return _worker;
    if (typeof Worker === 'undefined' || typeof URL === 'undefined') {
      _workerError = true;
      return null;
    }
    try {
      var w = new Worker('js/fsrs.worker.js');
      w.onmessage = function (e) {
        var d = e.data || {};
        var p = _pending[d.id];
        if (!p) return;
        delete _pending[d.id];
        clearTimeout(p.timer);
        if (d.ok) p.resolve(d.result);
        else p.reject(new Error(d.error || 'worker 错误'));
      };
      w.onerror = function () {
        // 初始化/脚本错误 → 永久回退主线程；挂起请求逐一用主线程实现兜底
        _workerError = true;
        for (var id in _pending) {
          if (_pending.hasOwnProperty(id)) {
            var p = _pending[id];
            clearTimeout(p.timer);
            try {
              p.fallback().then(p.resolve, p.reject);
            } catch (e) { p.reject(e); }
          }
        }
        _pending = {};
        if (_worker) { try { _worker.terminate(); } catch (e) {} }
        _worker = null;
      };
      _worker = w;
      return w;
    } catch (e) {
      _workerError = true;
      return null;
    }
  }

  /**
   * 把主线程兜底回调用 Promise 包裹，保证任何同步异常都转换为 rejected Promise，
   * 而不会在 _call 内部同步抛出（否则会破坏调用方 .then/.catch 链）。
   */
  function _runFallback(mainThreadFallback) {
    try {
      return Promise.resolve(mainThreadFallback());
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * 通用 Worker 调用：返回 Promise；Worker 不可用、超时或请求出错，则调用 fallback 主线程实现。
   */
  function _call(msg, mainThreadFallback) {
    var w = _createWorker();
    if (!w) return _runFallback(mainThreadFallback);

    return new Promise(function (resolve, reject) {
      var id = ++_seq;
      var timer = setTimeout(function () {
        delete _pending[id];
        // 超时按 worker 不可用处理（本次回退，但保留 worker 供下次）
        _runFallback(mainThreadFallback).then(resolve, reject);
      }, REQUEST_TIMEOUT);
      _pending[id] = {
        resolve: resolve,
        reject: reject,
        timer: timer,
        fallback: mainThreadFallback
      };
      msg.id = id;
      try {
        w.postMessage(msg);
      } catch (e) {
        clearTimeout(timer);
        delete _pending[id];
        _runFallback(mainThreadFallback).then(resolve, reject);
      }
    });
  }

  /* ---------------- 纯函数取用（主线程桶底） ---------------- */

  function _syncFit(reviews, opts) {
    var c = core();
    if (c && c.fit) return Promise.resolve(c.fit(reviews, opts));
    // 极端情况：核心未随 html 加载，仍给出可用结果
    return Promise.resolve({ w: (c && c.DEFAULT_W || []).slice(), losses: [], iter: 0, converged: false, error: '核心未就绪' });
  }

  function _syncEvaluate(w, reviews) {
    var c = core();
    return Promise.resolve(c && c.evaluate ? c.evaluate(w, reviews) : 0);
  }

  function _syncExtract(history) {
    var c = core();
    return Promise.resolve(c && c.extractReviews ? c.extractReviews(history) : []);
  }

  function _syncSchedule(cards, now) {
    var c = core();
    return Promise.resolve(c && c.scheduleDue ? c.scheduleDue(cards, now) : { due: [], newCards: [] });
  }

  function _syncSha256(text) {
    var c = core();
    if (c && c.sha256Hex) return c.sha256Hex(text);
    return Promise.resolve(null);
  }

  /* ---------------- Async（Worker 优先） ---------------- */

  function fitAsync(reviews, opts) {
    return _call({ type: 'fit', reviews: reviews, opts: opts || {} }, function () {
      return _syncFit(reviews, opts);
    });
  }

  function evaluateAsync(w, reviews) {
    return _call({ type: 'evaluate', w: w, reviews: reviews }, function () {
      return _syncEvaluate(w, reviews);
    });
  }

  function extractReviewsAsync(history) {
    return _call({ type: 'extractReviews', history: history }, function () {
      return _syncExtract(history);
    });
  }

  function scheduleDueAsync(cards, now) {
    return _call({ type: 'scheduleDue', cards: cards, now: typeof now === 'number' ? now : Date.now() }, function () {
      return _syncSchedule(cards, now);
    });
  }

  function sha256HexAsync(text) {
    return _call({ type: 'sha256Hex', text: text }, function () {
      return _syncSha256(text);
    });
  }

  /* ---------------- 同步（主线程实现，供未 Worker 化场景/兼容） ---------------- */

  function fit(reviews, opts) {
    var c = core();
    if (!c || !c.fit) return { w: [], losses: [], iter: 0, converged: false, error: '核心未就绪' };
    return c.fit(reviews, opts);
  }

  function evaluate(w, reviews) {
    var c = core();
    if (!c || !c.evaluate) return 0;
    return c.evaluate(w, reviews);
  }

  function extractReviews(history) {
    var c = core();
    if (!c || !c.extractReviews) return [];
    return c.extractReviews(history);
  }

  function toFSRSParams(w) {
    var c = core();
    if (!c || !c.toFSRSParams) return null;
    return c.toFSRSParams(w);
  }

  function retention(delta_t, stability) {
    var c = core();
    if (!c || !c.retention) return 1;
    return c.retention(delta_t, stability);
  }

  function isAvailable() {
    return !!(core() || _createWorker());
  }

  /**
   * 强制终止 Worker（页面卸载等场景；随后可重新创建）。
   */
  function dispose() {
    if (_worker) {
      try { _worker.terminate(); } catch (e) {}
      _worker = null;
      _workerError = false;
    }
  }

  window.FSRSOptimizer = {
    DEFAULT_W: (core() && core().DEFAULT_W) || [],
    retention: retention,
    fit: fit,
    evaluate: evaluate,
    toFSRSParams: toFSRSParams,
    extractReviews: extractReviews,
    isAvailable: isAvailable,
    // Issue #14：Async（Worker 优先）
    fitAsync: fitAsync,
    evaluateAsync: evaluateAsync,
    extractReviewsAsync: extractReviewsAsync,
    scheduleDueAsync: scheduleDueAsync,
    sha256HexAsync: sha256HexAsync,
    dispose: dispose
  };
})();