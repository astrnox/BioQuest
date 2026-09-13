/**
 * ============================================================
 * BioQuest — 题目评分核心算法（纯函数模块）
 *
 * 用途：
 *   1. 基于用户点赞/点踩，用 Wilson 区间下界（95% 置信）计算题目质量分
 *      （统计学上可比「好评率」更稳健：票数越少，置信下界越保守，避免
 *      少数几票就把题目分数拉满/拉崩）；
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
  var Z = 1.96;                          // 95% 置信区间 z 值
  var WEIGHT_MIN = 0.7;                  // 出现率权重下限（基础权重 1.0 的 70%）
  var WEIGHT_MAX = 1.3;                  // 出现率权重上限（基础权重 1.0 的 130%）
  var WEIGHT_SENSITIVITY = 1.2;          // 评分 → 权重映射灵敏度（(score-0.5)*1.2）
  var RECYCLE_SCORE_THRESHOLD = 0.35;    // 评分低于该值（0~1）判为低分
  var RECYCLE_MIN_VOTES = 5;             // 至少积累多少票才触发回收判定（防单票误杀）

  /**
   * Wilson 得分区间下界（lower bound）→ 0..1。
   * 公式：(p + z²/2n − z·√(p(1−p)/n + z²/4n²)) / (1 + z²/n)
   * 无票（n=0）时返回 0.5（中性分，不偏向任何一方）。
   * @param {number} up   点赞数
   * @param {number} down 点踩数
   * @param {number} [z]  z 值（默认 1.96）
   * @returns {number} 0..1
   */
  function wilsonScore(up, down, z) {
    up = Number(up) || 0;
    down = Number(down) || 0;
    if (up < 0) up = 0;
    if (down < 0) down = 0;
    var n = up + down;
    if (n === 0) return 0.5;
    var zz = (typeof z === 'number' && z > 0) ? z : Z;
    var p = up / n;
    var denom = 1 + zz * zz / n;
    var center = p + zz * zz / (2 * n);
    var margin = zz * Math.sqrt((p * (1 - p)) / n + zz * zz / (4 * n * n));
    var lo = (center - margin) / denom;
    if (isNaN(lo)) lo = p;      // 数值兜底
    return Math.max(0, Math.min(1, lo));
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
   * 展示用评分：把 0..1 的 Wilson 评分映射到 1~5 星制（保留 1 位小数）。
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
