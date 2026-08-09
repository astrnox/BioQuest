/**
 * ============================================================
 * BioQuest v3.1 — IRT 自适应学习引擎（T0-5/T0-6）
 * 项目反应理论（Item Response Theory）三参数逻辑斯谛模型
 * 实时 θ 估计 + 自适应抽题 + 模考分数预测
 * 纯前端零依赖，与现有 BKT 引擎互补
 * ============================================================
 *
 * 三参数模型（3PL）：
 *   P(答对|θ) = c + (1 - c) * 1 / (1 + exp(-a * (θ - b)))
 *   a: 区分度 (0-2)
 *   b: 难度   (-3 to 3)
 *   c: 猜测率 (0-0.5)
 *   θ: 受测者能力 (-3 to 3)
 *
 * 参考：Lord (1980) "Applications of Item Response Theory to Practical Testing Problems"
 */

(function () {
  'use strict';

  if (window.IrtEngine) return;

  var STORAGE_KEY = 'bioquest_irt_state';
  var PARAMS_KEY = 'bioquest_irt_params';  // 题库参数缓存

  // ====== 题目参数管理 ======

  /**
   * 从题库推断 IRT 参数（启发式估计，无需人工标注）
   * 实际生产建议用 EM 算法标定，这里用题库元数据启发式
   * @param {Object} question - 题目对象 { difficulty?, type?, options? }
   * @returns {{a: number, b: number, c: number}}
   */
  function inferParams(question) {
    // 难度 b：题库的 difficulty (0-1) 映射到 (-2.5, 2.5)
    var diff = question.difficulty;
    if (typeof diff !== 'number') {
      // 无标注时按题型推断
      if (question.type === 'mcq') diff = 0.4;
      else if (question.type === 'fill') diff = 0.55;
      else if (question.type === 'essay' || question.type === 'experiment') diff = 0.7;
      else diff = 0.5;
    }
    var b = (diff - 0.5) * 5;  // 0→-2.5, 0.5→0, 1→2.5

    // 区分度 a：选项数越多、题干越长，区分度越高
    var a = 1.0;
    if (question.options && question.options.length >= 4) a = 1.2;
    if (question.type === 'essay') a = 1.5;
    if (question.type === 'mcq' && question.options && question.options.length === 2) a = 0.6;
    a = Math.min(2.0, Math.max(0.3, a));

    // 猜测率 c：选择题按 1/选项数，非选择题为 0
    var c = 0;
    if (question.type === 'mcq' && question.options) {
      c = 1 / question.options.length;
      c = Math.min(0.4, c);
    } else if (question.type === 'judgment') {
      c = 0.5;
    }

    return { a: a, b: b, c: c };
  }

  /**
   * 批量计算题库的 IRT 参数，缓存到 localStorage
   * @param {Array} questions
   */
  function buildParamsCache(questions) {
    var cache = {};
    questions.forEach(function (q) {
      cache[q.id] = inferParams(q);
    });
    try { localStorage.setItem(PARAMS_KEY, JSON.stringify(cache)); } catch (e) {}
    return cache;
  }

  function loadParamsCache() {
    try {
      var raw = localStorage.getItem(PARAMS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function getParam(questionId, cache) {
    cache = cache || loadParamsCache();
    return cache[questionId] || { a: 1.0, b: 0, c: 0.25 };
  }

  // ====== θ 估计（贝叶斯后验更新） ======

  /**
   * 三参数逻辑斯谛模型的答对概率
   */
  function probCorrect(theta, params) {
    var a = params.a, b = params.b, c = params.c;
    var z = a * (theta - b);
    var p = c + (1 - c) / (1 + Math.exp(-z));
    return Math.min(0.999, Math.max(0.001, p));
  }

  /**
   * 加载用户 θ 状态
   * @returns {{theta: number, totalAnswered: number, byModule: Object, history: Array}}
   */
  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { theta: 0, totalAnswered: 0, byModule: {}, history: [] };
  }

  function saveState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  /**
   * 用一道题的答题结果贝叶斯更新 θ
   * 先验 N(θ_prior, 1)，似然用 3PL，后验用数值积分
   *
   * @param {number} thetaPrior - 更新前的 θ
   * @param {boolean} correct - 是否答对
   * @param {Object} params - 题目 IRT 参数 {a, b, c}
   * @param {number} [stepSize=0.5] - 更新步长上限（避免单题震荡过大）
   * @returns {number} 更新后的 θ
   */
  function updateTheta(thetaPrior, correct, params, stepSize) {
    stepSize = stepSize || 0.5;
    // 似然：P(response|θ) = P^correct * (1-P)^(1-correct)
    var logLik = function (theta) {
      var p = probCorrect(theta, params);
      return correct ? Math.log(p) : Math.log(1 - p);
    };
    // 先验：标准正态 log N(0, 1)，但锚定到 thetaPrior 而非 0（在线学习）
    var logPrior = function (theta) {
      var d = theta - thetaPrior;
      return -0.5 * d * d;
    };

    // 网格搜索后验众数（MAP）
    var best = thetaPrior, bestLog = -Infinity;
    for (var t = -3; t <= 3; t += 0.05) {
      var l = logLik(t) + logPrior(t);
      if (l > bestLog) { bestLog = l; best = t; }
    }

    // 限制单步更新幅度（在线学习稳定性）
    var delta = best - thetaPrior;
    if (Math.abs(delta) > stepSize) {
      best = thetaPrior + Math.sign(delta) * stepSize;
    }
    return Math.max(-3, Math.min(3, best));
  }

  /**
   * 记录一次答题并更新全局 θ 与模块 θ
   * @param {string} questionId
   * @param {boolean} correct
   * @param {Object} question - 题目对象（用于推断参数和模块）
   * @param {string} [module] - 模块名（如 'genetics'）
   */
  function recordAnswer(questionId, correct, question, module) {
    var state = loadState();
    var cache = loadParamsCache();
    if (!cache[questionId] && question) {
      cache[questionId] = inferParams(question);
      try { localStorage.setItem(PARAMS_KEY, JSON.stringify(cache)); } catch (e) {}
    }
    var params = getParam(questionId, cache);

    state.theta = updateTheta(state.theta, correct, params);
    state.totalAnswered++;

    if (module) {
      if (!state.byModule[module]) state.byModule[module] = { theta: 0, answered: 0 };
      var m = state.byModule[module];
      m.theta = updateTheta(m.theta, correct, params);
      m.answered++;
    }

    state.history.push({
      ts: Date.now(),
      questionId: questionId,
      correct: correct,
      thetaAfter: state.theta
    });
    // 只保留最近 200 条
    if (state.history.length > 200) state.history = state.history.slice(-200);

    saveState(state);
    return state;
  }

  // ====== 自适应抽题 ======

  /**
   * 按最大信息量原则选题（最简单实现：从候选题中选信息函数最大的）
   * 信息函数 I(θ) = a^2 * (1-p) / (1-c)^2 * (p - c)^2 / p
   *
   * @param {Array} candidates - 候选题 [{id, ...}]
   * @param {number} theta - 当前能力值
   * @param {Object} [options] - { excludeIds?: [], targetDifficulty?: 'easy'|'normal'|'hard' }
   * @returns {Object|null} 选中的题目
   */
  function selectNext(candidates, theta, options) {
    options = options || {};
    var exclude = {};
    (options.excludeIds || []).forEach(function (id) { exclude[id] = true; });
    var cache = loadParamsCache();

    var scored = candidates
      .filter(function (q) { return !exclude[q.id]; })
      .map(function (q) {
        var params = getParam(q.id, cache) || inferParams(q);
        var p = probCorrect(theta, params);
        var info = params.a * params.a * (1 - p) / Math.pow(1 - params.c, 2) * Math.pow(p - params.c, 2) / p;
        // 难度过滤：easy→θ-1, normal→θ, hard→θ+1
        var targetB = theta;
        if (options.targetDifficulty === 'easy') targetB = theta - 1;
        if (options.targetDifficulty === 'hard') targetB = theta + 1;
        var distancePenalty = Math.abs(params.b - targetB);
        return { q: q, info: info, score: info - 0.3 * distancePenalty };
      })
      .filter(function (x) { return x.info > 0; })
      .sort(function (a, b) { return b.score - a.score; });

    // 从前 3 名中随机选 1（增加多样性，避免总是同一题）
    var top = scored.slice(0, Math.min(3, scored.length));
    if (!top.length) return candidates[0] || null;
    return top[Math.floor(Math.random() * top.length)].q;
  }

  /**
   * 生成一组自适应题（5-10 题）
   * @param {Array} pool - 题库
   * @param {number} count - 题数
   * @param {Object} [options]
   * @returns {Array} 选中的题目数组
   */
  function buildAdaptiveSet(pool, count, options) {
    options = options || {};
    var state = loadState();
    var theta = state.theta;
    var selected = [];
    var excludeIds = (options.excludeIds || []).slice();
    // 前 2 题中等难度，根据答题动态调整
    var simTheta = theta;
    for (var i = 0; i < count; i++) {
      var targetDifficulty = i < 2 ? 'normal' : null;  // 后续按信息量
      var q = selectNext(pool, simTheta, {
        excludeIds: excludeIds.concat(selected.map(function (x) { return x.id; })),
        targetDifficulty: targetDifficulty
      });
      if (!q) break;
      selected.push(q);
      // 模拟假设答对（实际生产用真实答题后再抽下一题）
      var params = getParam(q.id) || inferParams(q);
      simTheta = updateTheta(simTheta, true, params, 0.3);
    }
    return selected;
  }

  // ====== 预测分析 ======

  /**
   * 预测联赛得分（基于 θ 与历史数据）
   * 简化：θ=-3→0分，θ=0→60分，θ=3→100分，置信度随答题量提升
   * @returns {{score: number, low: number, high: number, confidence: number}}
   */
  function predictScore() {
    var state = loadState();
    var theta = state.theta;
    var n = state.totalAnswered;

    // θ → 分数映射（联赛满分 100）
    var score = 50 + (theta / 3) * 50;
    score = Math.max(0, Math.min(100, score));

    // 置信度：答 0 题为 0%，答 30 题约 70%，答 100 题约 95%
    var confidence = 1 - Math.exp(-n / 30);
    // 置信区间（θ 估计标准差近似 1/sqrt(n)）
    var sd = n > 0 ? 1 / Math.sqrt(n) : 3;
    var margin = sd * 16.67;  // θ 转 分数系数

    return {
      score: Math.round(score),
      low: Math.max(0, Math.round(score - 1.96 * margin)),
      high: Math.min(100, Math.round(score + 1.96 * margin)),
      confidence: Math.round(confidence * 100)
    };
  }

  /**
   * 生成能力等级描述
   * @param {number} theta
   * @returns {{level: string, percentile: number, desc: string}}
   */
  function describeAbility(theta) {
    // θ 对应正态分布百分位
    // 用近似 erf 函数
    function erf(x) {
      var t = 1 / (1 + 0.3275911 * Math.abs(x));
      var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
      return x >= 0 ? y : -y;
    }
    var percentile = 0.5 * (1 + erf(theta / Math.sqrt(2)));
    percentile = Math.round(percentile * 100);

    var level, desc;
    if (theta < -1.5) { level = '入门'; desc = '建议从基础概念开始，多看动画和卡片'; }
    else if (theta < -0.5) { level = '基础'; desc = '掌握主干知识，重点补薄弱模块'; }
    else if (theta < 0.5) { level = '进阶'; desc = '稳定中游，可挑战中等难度题'; }
    else if (theta < 1.5) { level = '熟练'; desc = '可冲击高分，注意细节与综合题'; }
    else { level = '精通'; desc = '已达优秀水平，重点训练竞赛压轴题'; }

    return { level: level, percentile: percentile, desc: desc };
  }

  // ====== 暴露 API ======
  window.IrtEngine = {
    inferParams: inferParams,
    buildParamsCache: buildParamsCache,
    loadParamsCache: loadParamsCache,
    probCorrect: probCorrect,
    loadState: loadState,
    saveState: saveState,
    recordAnswer: recordAnswer,
    selectNext: selectNext,
    buildAdaptiveSet: buildAdaptiveSet,
    predictScore: predictScore,
    describeAbility: describeAbility
  };

})();
