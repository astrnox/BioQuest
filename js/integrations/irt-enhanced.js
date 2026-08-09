/**
 * BioQuest — IRT (项目反应理论) 增强模块
 * 包装 @geekie/irt 库（3PL 模型），提供：
 *   - ability 估计（EAP / 最大似然）
 *   - 题目信息曲线 I(θ)
 *   - 测验信息函数
 * 依赖：js/vendor/irt.umd.js -> window.IRT
 *
 * Vendor API（已核对源码）：
 *   - estimateAbilityEAP(answers:number[], zeta:[{a,b,c}]) -> number  (无 D 缩放)
 *   - itemResponseFunction(zeta:{a,b,c}, theta) -> number
 *   - information(zeta, theta) -> number
 *   注：vendor 不使用 D 缩放，公式为 P(θ) = c + (1-c)/(1+exp(-a*(θ-b)))
 */
(function () {
  'use strict';

  var V = '20260723d';
  var _loadingPromise = null;
  // EAP quadrature 节点（与 vendor 保持一致：[-10, 10]，101 节点）
  var EAP_MIN = -3, EAP_MAX = 3, EAP_NODES = 49;

  function loadScript(src) {
    return window.loadScriptOnce(src);
  }

  /**
   * 懒加载 irt.umd.js（仅 6KB）
   * @returns {Promise<boolean>}
   */
  function ensureLoaded() {
    if (typeof window.IRT !== 'undefined') return Promise.resolve(true);
    if (_loadingPromise) return _loadingPromise;
    _loadingPromise = loadScript('js/vendor/irt.umd.js?v=' + V).then(function () {
      if (typeof window.IRT === 'undefined' || typeof window.IRT.estimateAbilityEAP !== 'function') {
        throw new Error('IRT 加载后 estimateAbilityEAP 不可用');
      }
      return true;
    }).catch(function (e) {
      console.warn('[IRTEnhanced] @geekie/irt 加载失败:', e.message);
      _loadingPromise = null; // 允许下次重试
      return false;
    });
    return _loadingPromise;
  }

  function isAvailable() {
    return typeof window.IRT !== 'undefined' && typeof window.IRT.estimateAbilityEAP === 'function';
  }

  /**
   * 把外部题目格式 {difficulty, discrimination, guessing, D} 转为 vendor 期望的 {a, b, c}
   * 由于 vendor 不使用 D，我们把 D*a 折算进 a 中（等价变换）
   */
  function toLibItem(it) {
    var a = it.discrimination != null ? it.discrimination : 1.0;
    var b = it.difficulty != null ? it.difficulty : 0;
    var c = it.guessing != null ? it.guessing : 0;
    var D = it.D != null ? it.D : 1.7;
    return { a: a * D, b: b, c: c };
  }

  /**
   * EAP 能力估计（异步版）
   * @param {Array} items [{ difficulty, discrimination, guessing, D? }]
   * @param {Array<number>} responses 0/1 数组
   * @returns {Promise<{ ability:number, se:number }>}
   */
  function estimateAbility(items, responses) {
    if (!Array.isArray(items) || !Array.isArray(responses) || items.length !== responses.length) {
      console.warn('[IRTEnhanced] items/responses 长度不一致或无效');
      return Promise.resolve({ ability: 0, se: 1 });
    }
    if (items.length === 0) return Promise.resolve({ ability: 0, se: 1 });
    // 规范 responses 为 0/1
    var ans = responses.map(function (r) { return r ? 1 : 0; });
    var zeta = items.map(toLibItem);

    return ensureLoaded().then(function (ok) {
      if (!ok) return eapFallback(items, ans);
      try {
        var ability = window.IRT.estimateAbilityEAP(ans, zeta);
        if (typeof ability !== 'number' || !isFinite(ability)) {
          return eapFallback(items, ans);
        }
        // SE = 1 / sqrt(testInfo(ability))
        var info = testInfo(items, ability);
        var se = info > 0 ? 1 / Math.sqrt(info) : 1;
        return { ability: ability, se: se };
      } catch (e) {
        console.warn('[IRTEnhanced] EAP 估计异常:', e);
        return eapFallback(items, ans);
      }
    });
  }

  /**
   * 同步版（仅在 IRT 已加载时可用，否则用兜底）
   */
  function estimateAbilitySync(items, responses) {
    if (!Array.isArray(items) || !Array.isArray(responses) || items.length !== responses.length) {
      return { ability: 0, se: 1 };
    }
    if (items.length === 0) return { ability: 0, se: 1 };
    var ans = responses.map(function (r) { return r ? 1 : 0; });
    var zeta = items.map(toLibItem);

    if (!isAvailable()) return eapFallback(items, ans);
    try {
      var ability = window.IRT.estimateAbilityEAP(ans, zeta);
      if (typeof ability !== 'number' || !isFinite(ability)) {
        return eapFallback(items, ans);
      }
      var info = testInfo(items, ability);
      var se = info > 0 ? 1 / Math.sqrt(info) : 1;
      return { ability: ability, se: se };
    } catch (e) {
      return eapFallback(items, ans);
    }
  }

  /**
   * EAP 兜底实现（log-sum-exp 防下溢）
   * quadrature on [-3, 3]，49 节点，N(0,1) 先验
   */
  function eapFallback(items, responses) {
    var step = (EAP_MAX - EAP_MIN) / (EAP_NODES - 1);
    var thetas = [];
    var logPriorPlusLogL = [];
    for (var i = 0; i < EAP_NODES; i++) {
      var theta = EAP_MIN + i * step;
      thetas.push(theta);
      var logPrior = -theta * theta / 2 - Math.log(Math.sqrt(2 * Math.PI));
      var logL = logLikelihoodAt(items, responses, theta);
      logPriorPlusLogL.push(logPrior + logL);
    }
    // log-sum-exp 归一化
    var maxLL = Math.max.apply(null, logPriorPlusLogL);
    var weights = logPriorPlusLogL.map(function (x) {
      return Math.exp(x - maxLL);
    });
    var den = weights.reduce(function (a, b) { return a + b; }, 0);
    if (den === 0 || !isFinite(den)) return { ability: 0, se: 1 };
    var ability = 0;
    for (var k = 0; k < EAP_NODES; k++) {
      ability += thetas[k] * weights[k];
    }
    ability = ability / den;
    // 标准误
    var varSum = 0;
    for (var j = 0; j < EAP_NODES; j++) {
      varSum += Math.pow(thetas[j] - ability, 2) * weights[j];
    }
    var se = den > 0 ? Math.sqrt(varSum / den) : 1;
    if (!isFinite(se) || se <= 0) se = 1;
    return { ability: ability, se: se };
  }

  // 使用 log-likelihood 避免长测验下溢
  function logLikelihoodAt(items, responses, theta) {
    var logL = 0;
    for (var i = 0; i < items.length; i++) {
      var p = itemResponse(items[i], theta);
      // 数值守护
      p = Math.max(1e-12, Math.min(1 - 1e-12, p));
      var r = responses[i] ? 1 : 0;
      logL += r ? Math.log(p) : Math.log(1 - p);
    }
    return logL;
  }

  // 3PL 模型 P(θ) = c + (1 - c) / (1 + exp(-D * a * (θ - b)))
  function itemResponse(item, theta) {
    var a = item.discrimination != null ? item.discrimination : 1.0;
    var b = item.difficulty != null ? item.difficulty : 0;
    var c = item.guessing != null ? item.guessing : 0;
    var D = item.D != null ? item.D : 1.7;
    var p = c + (1 - c) / (1 + Math.exp(-D * a * (theta - b)));
    return Math.max(1e-12, Math.min(1 - 1e-12, p));
  }

  /**
   * 单题信息函数 I(θ) = D² * a² * (1-P) / P * ((P-c)/(1-c))²
   */
  function itemInfo(item, theta) {
    var a = item.discrimination != null ? item.discrimination : 1.0;
    var b = item.difficulty != null ? item.difficulty : 0;
    var c = item.guessing != null ? item.guessing : 0;
    var D = item.D != null ? item.D : 1.7;
    var P = itemResponse(item, theta);
    var Q = 1 - P;
    var oneMinusC = Math.max(1e-12, 1 - c);
    var ratio = (P - c) / oneMinusC;
    return D * D * a * a * Q / P * ratio * ratio;
  }

  /**
   * 测验信息函数 = Σ I_i(θ)
   */
  function testInfo(items, theta) {
    var sum = 0;
    for (var i = 0; i < items.length; i++) {
      sum += itemInfo(items[i], theta);
    }
    return sum;
  }

  /**
   * 生成题目信息曲线数据点
   */
  function itemInfoCurve(item, thetaMin, thetaMax, step) {
    thetaMin = thetaMin == null ? -3 : thetaMin;
    thetaMax = thetaMax == null ? 3 : thetaMax;
    step = step == null ? 0.1 : step;
    var points = [];
    var n = Math.floor((thetaMax - thetaMin) / step) + 1;
    for (var i = 0; i <= n; i++) {
      var t = thetaMin + i * step;
      if (t > thetaMax + 1e-9) break;
      points.push({ theta: Math.round(t * 1000) / 1000, info: itemInfo(item, t), p: itemResponse(item, t) });
    }
    return points;
  }

  /**
   * 计算能力估计的 95% 置信区间
   */
  function confidenceInterval(estimate, se) {
    return { lower: estimate - 1.96 * se, upper: estimate + 1.96 * se };
  }

  /**
   * IRT（项目反应理论）增强模块对外接口，包装 @geekie/irt 库（3PL 模型）提供能力估计、题目/测验信息曲线与置信区间计算能力。
   * @type {Object}
   */
  window.IRTEnhanced = {
    estimateAbility: estimateAbility,
    estimateAbilitySync: estimateAbilitySync,
    itemResponse: itemResponse,
    itemInfo: itemInfo,
    testInfo: testInfo,
    itemInfoCurve: itemInfoCurve,
    confidenceInterval: confidenceInterval,
    ensureLoaded: ensureLoaded,
    isAvailable: isAvailable
  };
})();
