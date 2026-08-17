/**
 * BioQuest — FSRS 优化器 / 分片哈希 Web Worker（Issue #14）
 *
 * 设计要点
 *  - 一份纯函数代码同时服务两个上下文：
 *      * 作为经典 Dedicated Worker 运行（new Worker('js/fsrs.worker.js')）：
 *        self.onmessage 处理 { type, id, ... }，回传可序列化结果。
 *      * 作为普通 <script> 在主线程加载：
 *        暴露 window.FSRSWorkerCore / window.FSRSOptimizer（主线程兜底路径）。
 *    因此「Worker 结果」与「主线程兜底结果」来自同一实现，天然一致。
 *  - 完全不依赖 window.FSRS UMD：forgetting_curve 公式与默认权重内联为纯函数，
 *    满足 Worker 无 window 环境的约束。
 *  - SHA-256 使用 crypto.subtle（在 https / localhost 的 Worker 均可用）。
 *
 * 消息协议（type）
 *  - fit              { reviews, opts }            → 19 维梯度下降拟合 { w, losses, iter, converged }
 *  - evaluate         { w, reviews }                → 平均对数损失
 *  - extractReviews   { history }                   → 归一化训练样本
 *  - toFSRSParams     { w }                         → 补全为 21 维 ts-fsrs params
 *  - scheduleDue      { cards, now }                → 批量到期调度（纯函数，主/Worker 一致）
 *  - sha256Hex        { text }                      → SHA-256 十六进制
 *
 * 兜底：Worker 加载/初始化失败时，主线程回退使用 window.FSRSWorkerCore 同步执行。
 * License: CC-BY-NC-SA-4.0（与项目一致）
 */
(function () {
  'use strict';

  // ==================== 纯常量（与 ts-fsrs 默认值一致）====================
  var DEFAULT_W = [
    0.212,    // w0
    1.2931,   // w1
    2.3065,   // w2
    8.2956,   // w3
    6.4133,   // w4
    0.8334,   // w5
    3.0194,   // w6
    1e-3,     // w7
    1.8722,   // w8
    0.1666,   // w9
    0.796,    // w10
    1.4835,   // w11
    0.0614,   // w12
    0.2629,   // w13
    1.6483,   // w14
    0.6014,   // w15
    1.8729,   // w16
    0.5425,   // w17
    0.0912    // w18
  ];
  var DECAY = -0.5;
  var FACTOR = Math.exp(Math.pow(DECAY, -1) * Math.log(0.9)) - 1; // ≈0.23457
  var TARGET_RETENTION = 0.9;
  var MAX_ITER = 200;
  var LEARNING_RATE = 0.005;
  var L2_LAMBDA = 0.001;
  var EPS = 1e-4;

  // ==================== FSRS-5 retention ====================
  function retention(delta_t, stability) {
    if (stability <= 0) stability = 0.01;
    if (delta_t <= 0) return 1;
    var r = Math.pow(1 + FACTOR * delta_t / stability, DECAY);
    return Math.max(1e-6, Math.min(1 - 1e-6, r));
  }

  function predictRetentionForReview(w, review) {
    var rating = review.rating;
    var delta = Math.max(0.001, review.delta_t || 0);
    var stability;
    if (review.stability && review.stability > 0) {
      stability = review.stability;
    } else {
      var idx = Math.max(0, Math.min(3, rating - 1));
      stability = Math.max(0.1, w[idx] || 0.1);
    }
    return retention(delta, stability);
  }

  function lossForReview(w, review) {
    var R = predictRetentionForReview(w, review);
    var rating = review.rating;
    var target;
    if (rating === 1) target = 1 - TARGET_RETENTION;
    else if (rating === 2) target = 0.7;
    else if (rating === 3) target = TARGET_RETENTION;
    else if (rating === 4) target = 0.97;
    else target = TARGET_RETENTION;

    target = Math.max(1e-6, Math.min(1 - 1e-6, target));
    return -(target * Math.log(R) + (1 - target) * Math.log(1 - R));
  }

  function totalLoss(w, reviews) {
    var sum = 0;
    for (var i = 0; i < reviews.length; i++) sum += lossForReview(w, reviews[i]);
    var l2 = 0;
    for (var j = 0; j < w.length; j++) l2 += w[j] * w[j];
    return sum / Math.max(1, reviews.length) + L2_LAMBDA * l2;
  }

  function numericalGradient(w, reviews) {
    var grad = new Array(w.length);
    for (var i = 0; i < w.length; i++) {
      var orig = w[i];
      w[i] = orig + EPS;
      var lp = totalLoss(w, reviews);
      w[i] = orig - EPS;
      var lm = totalLoss(w, reviews);
      w[i] = orig;
      grad[i] = (lp - lm) / (2 * EPS);
      if (!isFinite(grad[i])) grad[i] = 0;
    }
    return grad;
  }

  /**
   * 19 维权重梯度下降（Adam），完全独立于 window。
   * @param {Array} reviews
   * @param {object} [opts] { maxIter, lr, initW }
   */
  function fit(reviews, opts) {
    if (!Array.isArray(reviews) || reviews.length === 0) {
      return { w: DEFAULT_W.slice(), losses: [], iter: 0, converged: false, error: '无训练数据' };
    }
    if (reviews.length < 5) {
      return { w: DEFAULT_W.slice(), losses: [], iter: 0, converged: false, error: '样本不足（需 ≥5）' };
    }

    opts = opts || {};
    var maxIter = opts.maxIter || MAX_ITER;
    var lr = opts.lr || LEARNING_RATE;
    var w = (opts.initW || DEFAULT_W).slice();
    var losses = [];
    var prevLoss = Infinity;
    var converged = false;

    var m = new Array(w.length).fill(0);
    var v = new Array(w.length).fill(0);
    var beta1 = 0.9, beta2 = 0.999, epsAdam = 1e-8;

    for (var it = 0; it < maxIter; it++) {
      var L = totalLoss(w, reviews);
      losses.push(L);
      if (it > 0 && Math.abs(prevLoss - L) / Math.max(1, Math.abs(prevLoss)) < 1e-5) {
        converged = true;
        break;
      }
      prevLoss = L;

      var grad = numericalGradient(w, reviews);
      for (var i = 0; i < w.length; i++) {
        m[i] = beta1 * m[i] + (1 - beta1) * grad[i];
        v[i] = beta2 * v[i] + (1 - beta2) * grad[i] * grad[i];
        var mHat = m[i] / (1 - Math.pow(beta1, it + 1));
        var vHat = v[i] / (1 - Math.pow(beta2, it + 1));
        w[i] -= lr * mHat / (Math.sqrt(vHat) + epsAdam);
        if (w[i] < 0) w[i] = 0;
        if (i >= 4 && i <= 6) w[i] = Math.min(10, w[i]);
        if (i === 7) w[i] = Math.min(0.75, w[i]);
      }
    }

    return { w: w, losses: losses, iter: losses.length, converged: converged };
  }

  function evaluate(w, reviews) {
    if (!Array.isArray(reviews) || reviews.length === 0) return 0;
    return totalLoss(w, reviews);
  }

  function toFSRSParams(w) {
    var w21 = w.slice();
    while (w21.length < 19) w21.push(DEFAULT_W[w21.length] || 0);
    w21.push(0.0658);
    w21.push(0.5);
    return {
      request_retention: TARGET_RETENTION,
      maximum_interval: 36500,
      w: w21,
      enable_fuzz: false,
      enable_short_term: true
    };
  }

  function extractReviews(history) {
    if (!Array.isArray(history)) return [];
    var byCard = {};
    for (var i = 0; i < history.length; i++) {
      var h = history[i];
      if (!h.card_id) continue;
      if (!byCard[h.card_id]) byCard[h.card_id] = [];
      byCard[h.card_id].push(h);
    }
    var reviews = [];
    Object.keys(byCard).forEach(function (cid) {
      var seq = byCard[cid].sort(function (a, b) {
        return (a.due || 0) - (b.due || 0);
      });
      for (var k = 0; k < seq.length; k++) {
        var cur = seq[k];
        var prev = k > 0 ? seq[k - 1] : null;
        reviews.push({
          rating: cur.rating,
          delta_t: cur.elapsed_days || 0,
          stability: prev && prev.stability ? prev.stability : 0,
          difficulty: prev ? (prev.difficulty != null ? prev.difficulty : 5) : 5,
          state: cur.state || 1
        });
      }
    });
    return reviews;
  }

  /**
   * 批量到期调度（纯函数，与 fsrs-algorithm.getDueCards 语义一致，但不碰 localStorage）。
   * @param {Array} cards [{ cardId, state }]
   * @param {number} [now]
   * @returns {{ due:Array, newCards:Array }}
   */
  function scheduleDue(cards, now) {
    var DAY = 24 * 60 * 60 * 1000;
    var nowMs = typeof now === 'number' ? now : Date.now();
    var due = [];
    var newCards = [];
    if (!Array.isArray(cards)) return { due: due, newCards: newCards };

    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var state = c && c.state;
      if (!state || !state.repetitions) {
        newCards.push(c.cardId);
        continue;
      }
      if (state.dueDate != null && state.dueDate <= nowMs) {
        var overdueDays = Math.max(0, Math.floor((nowMs - state.dueDate) / DAY));
        due.push({
          id: c.cardId,
          state: state,
          overdueDays: overdueDays,
          priority: overdueDays * 10 + (state.lapses || 0) * 5
        });
      }
    }
    due.sort(function (a, b) { return b.priority - a.priority; });
    return { due: due, newCards: newCards };
  }

  /**
   * SHA-256 十六进制（crypto.subtle）。
   */
  function sha256Hex(text) {
    var enc = new TextEncoder();
    return crypto.subtle.digest('SHA-256', enc.encode(String(text == null ? '' : text)))
      .then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return ('0' + b.toString(16)).slice(-2);
        }).join('');
      });
  }

  // ==================== 上下文识别 ====================
  // Worker：有 importScripts / self，但无 window；主线程反之。
  // Node/测试：CommonJS 导出便于复用现有 Jest 断言。
  var Core = {
    DEFAULT_W: DEFAULT_W,
    retention: retention,
    fit: fit,
    evaluate: evaluate,
    toFSRSParams: toFSRSParams,
    extractReviews: extractReviews,
    scheduleDue: scheduleDue,
    sha256Hex: sha256Hex
  };

  var IS_WORKER = (typeof importScripts === 'function') &&
    (typeof window === 'undefined') &&
    (typeof self !== 'undefined');

  if (IS_WORKER) {
    self.onmessage = function (e) {
      var msg = e.data || {};
      var id = msg.id;
      function done(result) {
        self.postMessage({ id: id, type: msg.type, ok: true, result: result });
      }
      function fail(err) {
        self.postMessage({ id: id, type: msg.type, ok: false, error: (err && err.message) || String(err) });
      }
      try {
        switch (msg.type) {
          case 'fit': done(Core.fit(msg.reviews, msg.opts)); return;
          case 'evaluate': done(Core.evaluate(msg.w, msg.reviews)); return;
          case 'extractReviews': done(Core.extractReviews(msg.history)); return;
          case 'toFSRSParams': done(Core.toFSRSParams(msg.w)); return;
          case 'scheduleDue': done(Core.scheduleDue(msg.cards, msg.now)); return;
          case 'sha256Hex':
            Core.sha256Hex(msg.text).then(done, fail);
            return;
          default:
            fail(new Error('未知消息类型: ' + msg.type));
        }
      } catch (err) { fail(err); }
    };
    return;
  }

  // 主线程 / CommonJS
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Core;
  }
  var g = (typeof globalThis !== 'undefined') ? globalThis : this;
  g.FSRSWorkerCore = Core;
  g.FSRSOptimizer = Core;
})();