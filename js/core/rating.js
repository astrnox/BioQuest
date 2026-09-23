/**
 * ============================================================
 * BioQuest — 题目评分核心算法（纯函数模块）
 *
 * 用途：
 *   1. 基于用户点赞/点踩，用「带中性先验的平滑均值」（Bayesian mean）计算题目质量分：
 *      无票=0.5 中性分，评分从中间值起步，票数越多越收敛到真实好评率。
 *      （替代原 Wilson 95% 置信区间下界：低票数时它过度保守——仅 1 个点赞
 *      就把评分压到 1.8 分、出现率反而降到 0.7，与直觉相反，故改为先验平滑。）
 *   2. 把评分映射为「出现率权重」（0.7 ~ 1.3 浮动，高分多出现、低分少出现，
 *      但浮动受限，避免用户长期刷不到差题 / 一直刷那几道好题）；
 *   3. 低分题（评分低于阈值且票数足够）判定为应移入回收站。
 *
 * 本模块不依赖 DOM / localStorage，可在 Node 中直接单元测试。
 * 浏览器端由 app.js 动态加载（挂到 window.RatingCore）。
 * ============================================================ */
'use strict';

var RatingCore = (function () {

  // ===== 可调参数 =====
  var Z = 1.96;                          // （保留签名用）原 Wilson 的 95% 置信 z 值，平滑均值下不参与计算
  var PRIOR_VOTES = 4;                   // 中性先验票数（默认 2 赞 + 2 踩）：评分从中位 0.5 起步
  var WEIGHT_MIN = 0.7;                  // 出现率权重下限（基础权重 1.0 的 70%）
  var WEIGHT_MAX = 1.3;                  // 出现率权重上限（基础权重 1.0 的 130%）
  var WEIGHT_SENSITIVITY = 1.2;          // 评分 → 权重映射灵敏度（(score-0.5)*1.2）
  var RECYCLE_SCORE_THRESHOLD = 0.35;    // 评分低于该值（0~1）判为低分
  var RECYCLE_MIN_VOTES = 5;             // 至少积累多少票才触发回收判定（防单票误杀）

  /**
   * 质量分 → 0..1（带中性先验的平滑均值 / Bayesian mean）。
   * 公式：score = (up + PRIOR_VOTES/2) / (up + down + PRIOR_VOTES)
   *  - 无票（n=0）返回 0.5（中性分，不偏向任何一方）；
   *  - 前几票被先验大量「吸收」→ 评分从中间值起步：1 个点赞 ≈ 0.6 分
   *    （5 星 ≈ 3.4、出现率权重 ≈ 1.12），不再出现「1 赞 → 1.8 分、
   *    出现率反降」的反直觉结果；
   *  - 票数增多后先验影响衰减，评分收敛到真实好评率
   *    （100 赞 ≈ 0.98、100 踩 ≈ 0.02、80% 好评率 100 票 ≈ 0.79）。
   * @param {number} up   点赞数
   * @param {number} down 点踩数
   * @param {number} [z]  （历史签名保留）原 Wilson 的 z 值，已不参与计算
   * @returns {number} 0..1
   */
  function wilsonScore(up, down, z) {
    up = Number(up) || 0;
    down = Number(down) || 0;
    if (up < 0) up = 0;
    if (down < 0) down = 0;
    var n = up + down;
    if (n === 0) return 0.5;
    var prior = (typeof PRIOR_VOTES === 'number' && PRIOR_VOTES > 0) ? PRIOR_VOTES : 0;
    return (up + prior / 2) / (up + down + prior);
  }

  /**
   * 评分 → 出现率权重（钳制在 [0.7, 1.3]）。
   * 权重 = clamp(0.7, 1.3, 1 + (score01 - 0.5) * SENSITIVITY)
   *  - 高分（→1.0）：权重 → 1.3，出现率最多提高 30%；
   *  - 低分（→0.0）：权重 → 0.7，出现率最多降低 30%；
   *  - 中性/无票（0.5）：权重 = 1.0。
   * @param {number} score01 0..1 的 Wilson 评分
   * @returns {number}
   */
  function ratingWeight(score01) {
    score01 = Number(score01);
    if (isNaN(score01)) return 1;
    var w = 1 + (score01 - 0.5) * WEIGHT_SENSITIVITY;
    return Math.max(WEIGHT_MIN, Math.min(WEIGHT_MAX, w));
  }

  /**
   * 是否应移入回收站：评分低于阈值 且 票数达到最低要求。
   * 需要最低票数是为了防止「单条点踩」就把一道题误杀。
   * @param {number} up
   * @param {number} down
   * @param {Object} [opts] { scoreThreshold, minVotes, z }
   * @returns {boolean}
   */
  function shouldRecycleQuestion(up, down, opts) {
    opts = opts || {};
    up = Number(up) || 0;
    down = Number(down) || 0;
    var minVotes = (opts.minVotes === undefined) ? RECYCLE_MIN_VOTES : opts.minVotes;
    var threshold = (opts.scoreThreshold === undefined) ? RECYCLE_SCORE_THRESHOLD : opts.scoreThreshold;
    if (up + down < minVotes) return false;
    return wilsonScore(up, down, opts.z) < threshold;
  }

  /**
   * 展示用评分：把 0..1 的质量分映射到 1~5 星制（保留 1 位小数）。
   * 无票时评分为 0.5 → 3.0（中性），避免「0 票显示 0 分」误导。
   * @param {number} score01
   * @returns {string} 如 "3.0" / "4.6"
   */
  function formatQuestionScore(score01) {
    score01 = Number(score01);
    if (isNaN(score01)) return '3.0';
    return (1 + score01 * 4).toFixed(1);
  }

  /**
   * 带权不放回抽取：按权重随机抽取 count 项（Fisher–Yates 思想的加权版）。
   * 每次抽取概率 ∝ 该项权重；抽完后移除，保证同一套题内不重复。
   * @param {Array} items 原始数组（不会被修改）
   * @param {Function} getWeight 取权重函数 (item, index) => number
   * @param {number} count 抽取数量
   * @param {Function} [rng] 随机数生成器（测试用），默认 Math.random
   * @returns {Array} 抽中的项（保持抽取顺序）
   */
  function weightedPick(items, getWeight, count, rng) {
    if (!Array.isArray(items) || items.length === 0) return [];
    var rnd = (typeof rng === 'function') ? rng : Math.random;
    var pool = items.slice();
    var picked = [];
    var n = Math.max(0, Math.min(count, pool.length));
    for (var k = 0; k < n; k++) {
      var total = 0;
      var weights = pool.map(function (it, idx) {
        var w = getWeight(it, idx);
        w = (typeof w === 'number' && isFinite(w) && w > 0) ? w : 0.0001;
        total += w;
        return w;
      });
      if (total <= 0) { picked.push(pool.shift()); continue; }
      var r = rnd() * total;
      var cum = 0;
      var chosen = 0;
      for (var i = 0; i < pool.length; i++) {
        cum += weights[i];
        if (r <= cum) { chosen = i; break; }
        chosen = i;
      }
      picked.push(pool.splice(chosen, 1)[0]);
    }
    return picked;
  }

  /**
   * 带权洗牌：按权重洗乱整个数组（每项被抽到的概率 ∝ 权重）。
   * @param {Array} items
   * @param {Function} getWeight
   * @param {Function} [rng]
   * @returns {Array} 新数组
   */
  function weightedShuffle(items, getWeight, rng) {
    return weightedPick(items, getWeight, items.length, rng);
  }

  return {
    Z: Z,
    PRIOR_VOTES: PRIOR_VOTES,
    WEIGHT_MIN: WEIGHT_MIN,
    WEIGHT_MAX: WEIGHT_MAX,
    RECYCLE_SCORE_THRESHOLD: RECYCLE_SCORE_THRESHOLD,
    RECYCLE_MIN_VOTES: RECYCLE_MIN_VOTES,
    wilsonScore: wilsonScore,
    ratingWeight: ratingWeight,
    shouldRecycleQuestion: shouldRecycleQuestion,
    formatQuestionScore: formatQuestionScore,
    weightedPick: weightedPick,
    weightedShuffle: weightedShuffle
  };
})();

// 浏览器：挂到全局（practice.js / quiz.js / admin 均通过 window.RatingCore 调用）
if (typeof window !== 'undefined') {
  window.RatingCore = RatingCore;
}
// Node（单元测试）：CommonJS 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RatingCore;
}
