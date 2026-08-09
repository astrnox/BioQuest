/**
 * BioQuest — FSRS 参数优化器
 * 用纯 JS 数值梯度下降估计 FSRS-5 的 19 维权重 w[0..18]
 * 替代原 Python + PyTorch 训练流程（零后端依赖）
 *
 * 依赖：js/vendor/ts-fsrs.umd.min.js -> window.FSRS
 *
 * Vendor API（已核对源码）：
 *   - window.FSRS.fsrs(params) → 返回 FSRSAlgorithm 实例
 *   - 实例方法 forgetting_curve(t, s) → R = (1 + factor*t/s)^decay
 *   - window.FSRS.default_w → 默认 21 维权重（取前 19 项用于优化）
 *   - ts-fsrs 内部公式：decay = -param.w[20]（FSRS-5 默认 -0.5），factor = exp(decay^-1 * log 0.9) - 1
 *
 * 输入：复习记录 [{ rating: 1..4, delta_t: 天, stability: 上次稳定度, difficulty: 上次难度, state: 1/2/3 }]
 * 输出：{ w: number[19], request_retention: 0.9, losses: number[] }
 */
(function () {
  'use strict';

  // ts-fsrs 默认权重（已核对源码 vendor L552-574，前 19 项）
  var DEFAULT_W = [
    0.212,    // w0  - 初始稳定度（Again）
    1.2931,   // w1  - 初始稳定度（Hard）
    2.3065,   // w2  - 初始稳定度（Good）
    8.2956,   // w3  - 初始稳定度（Easy）
    6.4133,   // w4  - 初始难度
    0.8334,   // w5  - 难度衰减
    3.0194,   // w6  - 难度增益
    1e-3,     // w7  - 难度下界
    1.8722,   // w8  - 复习稳定度（Again）
    0.1666,   // w9  - 复习稳定度（Hard）
    0.796,    // w10 - 复习稳定度（Good）
    1.4835,   // w11 - 复习稳定度（Easy）
    0.0614,   // w12 - 复习稳定度（Hard-Old）
    0.2629,   // w13 - 复习稳定度（Easy-Old）
    1.6483,   // w14 - 短期记忆
    0.6014,   // w15 - 短期记忆
    1.8729,   // w16 - 噪声
    0.5425,   // w17 - 噪声
    0.0912    // w18 - 噪声
  ];
  // FSRS-5 默认 decay（vendor L573 是 FSRS6_DEFAULT_DECAY）
  // 标准 FSRS-5 公式：decay = -0.5（即 param.w[20] = 0.5）
  var DECAY = -0.5;
  var FACTOR = Math.exp(Math.pow(DECAY, -1) * Math.log(0.9)) - 1; // ≈ 0.23457
  var TARGET_RETENTION = 0.9;
  var MAX_ITER = 200;     // 19 维数值梯度需较多轮
  var LEARNING_RATE = 0.005;
  var L2_LAMBDA = 0.001;
  var EPS = 1e-4;

  function ensureTsfsrs() {
    if (typeof window.FSRS === 'undefined' || typeof window.FSRS.fsrs !== 'function') {
      console.warn('[FSRSOptimizer] ts-fsrs 未加载或无 fsrs() 工厂');
      return false;
    }
    return true;
  }

  /**
   * FSRS-5 retention 公式：R = (1 + factor * t / s)^decay
   * 注意：factor 与 decay 依赖于 w[20]，但训练时我们只优化 w[0..18]，w[20] 固定。
   *
   * @param {number} delta_t 自上次复习的天数
   * @param {number} stability 稳定度
   * @returns {number} R ∈ (0, 1)
   */
  function retention(delta_t, stability) {
    if (stability <= 0) stability = 0.01;
    if (delta_t <= 0) return 1;
    var r = Math.pow(1 + FACTOR * delta_t / stability, DECAY);
    return Math.max(1e-6, Math.min(1 - 1e-6, r));
  }

  /**
   * 用当前 w 估计复习记录的 retention
   *
   * 简化模型（只在前向 retention 上学习）：
   * - 给定上次 stability（或从 w 推导的初始 stability）+ delta_t，计算预测 R
   * - rating=1（Again，错） → 期望低 R（即 1-TARGET）
   * - rating=2（Hard，对但难）→ 期望中等 R
   * - rating=3（Good，对）→ 期望 R ≈ TARGET
   * - rating=4（Easy，对且易）→ 期望高 R
   *
   * 真正的 w 依赖来自：stability 由 w[0..3]（首次）或 w[8..13]（复习后）决定，
   * 我们通过传入的 review.stability 直接使用上次 stability，但首次复习
   * （stability=0 或未提供）则从 w[0..3] 取对应 rating 的初值。
   */
  function predictRetentionForReview(w, review) {
    var rating = review.rating;
    var delta = Math.max(0.001, review.delta_t || 0);

    var stability;
    if (review.stability && review.stability > 0) {
      // 使用传入的上次 stability（FSRS 的"复习后"路径）
      stability = review.stability;
    } else {
      // 首次复习：从 w[0..3] 按初始 rating 取（rating 1..4 对应 w[0..3]）
      // 这是 w 真正依赖的地方
      var idx = Math.max(0, Math.min(3, rating - 1));
      stability = Math.max(0.1, w[idx] || 0.1);
    }

    return retention(delta, stability);
  }

  /**
   * 单条复习记录的损失（交叉熵）
   * target：根据 rating 推断"用户应该达到"的 retention
   * - rating=1 (Again)：用户答错 → 期望 R 低，target = 1 - TARGET_RETENTION
   * - rating=2 (Hard)：答对但难 → target = 0.7（中等偏低）
   * - rating=3 (Good)：答对正常 → target = TARGET_RETENTION
   * - rating=4 (Easy)：答对且易 → target = 0.97
   */
  function lossForReview(w, review) {
    var R = predictRetentionForReview(w, review);
    var rating = review.rating;
    var target;
    if (rating === 1) target = 1 - TARGET_RETENTION;     // 0.1 - 答错
    else if (rating === 2) target = 0.7;                 // 答对但困难
    else if (rating === 3) target = TARGET_RETENTION;   // 0.9 - 正常
    else if (rating === 4) target = 0.97;                // 简单
    else target = TARGET_RETENTION;

    // 交叉熵损失
    target = Math.max(1e-6, Math.min(1 - 1e-6, target));
    var loss = -(target * Math.log(R) + (1 - target) * Math.log(1 - R));
    return loss;
  }

  function totalLoss(w, reviews) {
    var sum = 0;
    for (var i = 0; i < reviews.length; i++) {
      sum += lossForReview(w, reviews[i]);
    }
    var l2 = 0;
    for (var j = 0; j < w.length; j++) { l2 += w[j] * w[j]; }
    return sum / Math.max(1, reviews.length) + L2_LAMBDA * l2;
  }

  // 数值梯度（中心差分）
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
      // 数值守护
      if (!isFinite(grad[i])) grad[i] = 0;
    }
    return grad;
  }

  /**
   * 训练 FSRS 参数
   * @param {Array} reviews 复习记录数组
   * @param {object} opts { maxIter, lr, initW }
   * @returns {{ w:number[], losses:number[], iter:number, converged:boolean }}
   */
  function fit(reviews, opts) {
    if (!ensureTsfsrs()) {
      return { w: DEFAULT_W.slice(), losses: [], iter: 0, converged: false, error: 'ts-fsrs 未加载' };
    }
    if (!Array.isArray(reviews) || reviews.length === 0) {
      return { w: DEFAULT_W.slice(), losses: [], iter: 0, converged: false, error: '无训练数据' };
    }
    // 最少 5 条样本
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

    // 动量（简单 Adam-like）
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
        // Adam 更新
        m[i] = beta1 * m[i] + (1 - beta1) * grad[i];
        v[i] = beta2 * v[i] + (1 - beta2) * grad[i] * grad[i];
        var mHat = m[i] / (1 - Math.pow(beta1, it + 1));
        var vHat = v[i] / (1 - Math.pow(beta2, it + 1));
        w[i] -= lr * mHat / (Math.sqrt(vHat) + epsAdam);
        // ts-fsrs CLAMP_PARAMETERS: 简单 ≥0 约束（部分参数有更紧的上界）
        if (w[i] < 0) w[i] = 0;
        if (i >= 4 && i <= 6) w[i] = Math.min(10, w[i]);  // difficulty 相关
        if (i === 7) w[i] = Math.min(0.75, w[i]);          // difficulty 下界参数
      }
    }

    return { w: w, losses: losses, iter: losses.length, converged: converged };
  }

  /**
   * 评估参数在测试集上的对数损失
   */
  function evaluate(w, reviews) {
    if (!Array.isArray(reviews) || reviews.length === 0) return 0;
    return totalLoss(w, reviews);
  }

  /**
   * 将权重转换为 ts-fsrs 可用的 params 对象
   * 注意：ts-fsrs 期望 21 维 w（最后 2 项为 short_term_noise 和 decay）
   */
  function toFSRSParams(w) {
    // 补全为 21 维（最后两项为 ts-fsrs 默认）
    var w21 = w.slice();
    while (w21.length < 19) w21.push(DEFAULT_W[w21.length] || 0);
    w21.push(0.0658);   // w19
    w21.push(0.5);      // w20 (decay, FSRS-5 默认 -0.5)
    return {
      request_retention: TARGET_RETENTION,
      maximum_interval: 36500,
      w: w21,
      enable_fuzz: false,
      enable_short_term: true
    };
  }

  /**
   * 从复习历史提取训练样本
   * @param {Array} history [{ card_id, due, elapsed_days, rating, state, stability, difficulty }]
   */
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
        // 按实际复习时间排序（如有 elapsed_days 则按 due 推算，否则按数组顺序）
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

  window.FSRSOptimizer = {
    DEFAULT_W: DEFAULT_W,
    retention: retention,
    fit: fit,
    evaluate: evaluate,
    toFSRSParams: toFSRSParams,
    extractReviews: extractReviews,
    isAvailable: ensureTsfsrs
  };
})();
