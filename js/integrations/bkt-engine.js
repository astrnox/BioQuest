/**
 * BioQuest — 贝叶斯知识追踪（BKT）引擎
 * 4 参数模型：L0（初始掌握概率）、T（习得）、S（失误）、G（猜测）
 * 使用 EM 算法（前向-后向）从观测序列估计参数；并提供前向预测
 * 纯 JavaScript 实现
 *
 * 数学参考：Rabiner 1989 HMM 教程（BKT 是 2 状态 HMM）
 * 状态：L（已掌握）/ N（未掌握）
 * 转移矩阵：P(L→L)=(1-T), P(L→N)=T（一旦掌握不会遗忘——标准 BKT 假设）
 *          P(N→L)=T, P(N→N)=(1-T)
 * 发射模型：P(correct|L)=1-S, P(wrong|L)=S
 *          P(correct|N)=G,   P(wrong|N)=1-G
 */
(function () {
  'use strict';

  var DEFAULTS = { L0: 0.1, T: 0.1, S: 0.2, G: 0.2 };
  // BKT 典型参数范围（Baker、Corbett & Anderson 文献）
  var BOUNDS = {
    L0: [0.01, 0.5],
    T:  [0.01, 0.5],
    S:  [0.01, 0.5],
    G:  [0.01, 0.5]
  };
  // 最小观测数（不足则退化为 DEFAULTS）
  var MIN_OBS = 5;
  var EPS = 1e-10;

  function clamp(v, range) {
    if (v < range[0]) return range[0];
    if (v > range[1]) return range[1];
    return v;
  }

  /**
   * 前向算法：给定参数和观测序列，返回每步 P(L_n | obs_1..n)
   * @param {object} params { L0, T, S, G }
   * @param {Array<number>} obs 0/1 序列
   * @returns {Array<number>}
   */
  function forward(params, obs) {
    var L0 = params.L0, T = params.T, S = params.S, G = params.G;
    var posteriors = [];
    var pL = L0;
    for (var i = 0; i < obs.length; i++) {
      var o = obs[i] ? 1 : 0;
      // 预测：P(L_n | obs_{1..n-1}) = L_{n-1} + (1 - L_{n-1}) * T  （L→L=1-T，N→L=T）
      var pL_pred = pL * (1 - T) + (1 - pL) * T;
      // 发射：P(correct | L_pred) = pL_pred * (1 - S) + (1 - pL_pred) * G
      var pCorrect = pL_pred * (1 - S) + (1 - pL_pred) * G;
      // 后验贝叶斯更新
      var likelihood = o ? pCorrect : (1 - pCorrect);
      if (likelihood < EPS) likelihood = EPS;
      var post = (o ? (pL_pred * (1 - S)) : (pL_pred * S)) / likelihood;
      post = Math.max(EPS, Math.min(1 - EPS, post));
      posteriors.push(post);
      pL = post;
    }
    return posteriors;
  }

  /**
   * 真正的前向-后向算法（Rabiner 1989）
   * 返回：alpha（前向）、beta（后向）、gamma（平滑）以及充分统计量
   */
  function forwardBackward(params, obs) {
    var L0 = params.L0, T = params.T, S = params.S, G = params.G;
    var n = obs.length;
    if (n === 0) {
      return { alphaL: [], alphaN: [], betaL: [], betaN: [], gammaL: [], gammaN: [], logLik: 0 };
    }

    // 转移矩阵（log domain 防下溢）
    // aLL = P(L_n | L_{n-1}) = 1 - T
    // aNL = P(L_n | N_{n-1}) = T
    // aLN = P(N_n | L_{n-1}) = T  （标准 BKT：转移对称）
    // aNN = P(N_n | N_{n-1}) = 1 - T
    var aLL = 1 - T, aNL = T, aLN = T, aNN = 1 - T;

    // 发射概率
    // bL_correct = 1 - S, bL_wrong = S
    // bN_correct = G,     bN_wrong = 1 - G

    var alphaL = new Array(n), alphaN = new Array(n);

    // ===== 前向 =====
    // 使用对数概率避免下溢
    var logL0 = Math.log(L0 + EPS);
    var logN0 = Math.log(1 - L0 + EPS);

    var logAlphaL = new Array(n), logAlphaN = new Array(n);

    function logSumExp(a, b) {
      if (a === -Infinity) return b;
      if (b === -Infinity) return a;
      var mx = Math.max(a, b);
      return mx + Math.log(Math.exp(a - mx) + Math.exp(b - mx));
    }

    // 初始（t=0）：log α_L(1) = log π_L + log b_L(o_1)
    var o0 = obs[0] ? 1 : 0;
    var logBL_o0 = o0 ? Math.log(1 - S + EPS) : Math.log(S + EPS);
    var logBN_o0 = o0 ? Math.log(G + EPS) : Math.log(1 - G + EPS);
    logAlphaL[0] = logL0 + logBL_o0;
    logAlphaN[0] = logN0 + logBN_o0;

    for (var t = 1; t < n; t++) {
      var oT = obs[t] ? 1 : 0;
      var logBL_ot = oT ? Math.log(1 - S + EPS) : Math.log(S + EPS);
      var logBN_ot = oT ? Math.log(G + EPS) : Math.log(1 - G + EPS);
      // log α_L(t) = log( α_L(t-1)*aLL + α_N(t-1)*aNL ) + log b_L(o_t)
      var fromL_L = logAlphaL[t - 1] + Math.log(aLL + EPS);
      var fromN_L = logAlphaN[t - 1] + Math.log(aNL + EPS);
      logAlphaL[t] = logSumExp(fromL_L, fromN_L) + logBL_ot;
      // log α_N(t) = log( α_L(t-1)*aLN + α_N(t-1)*aNN ) + log b_N(o_t)
      var fromL_N = logAlphaL[t - 1] + Math.log(aLN + EPS);
      var fromN_N = logAlphaN[t - 1] + Math.log(aNN + EPS);
      logAlphaN[t] = logSumExp(fromL_N, fromN_N) + logBN_ot;
    }

    // 对数似然 = log(α_L(n) + α_N(n))
    var logLik = logSumExp(logAlphaL[n - 1], logAlphaN[n - 1]);

    // ===== 后向（log domain） =====
    var logBetaL = new Array(n), logBetaN = new Array(n);
    logBetaL[n - 1] = 0;  // log 1
    logBetaN[n - 1] = 0;
    for (var t2 = n - 2; t2 >= 0; t2--) {
      var oNext = obs[t2 + 1] ? 1 : 0;
      var logBL_next = oNext ? Math.log(1 - S + EPS) : Math.log(S + EPS);
      var logBN_next = oNext ? Math.log(G + EPS) : Math.log(1 - G + EPS);
      // log β_L(t) = log( aLL * b_L(o_{t+1}) * β_L(t+1) + aLN * b_N(o_{t+1}) * β_N(t+1) )
      var term1 = Math.log(aLL + EPS) + logBL_next + logBetaL[t2 + 1];
      var term2 = Math.log(aLN + EPS) + logBN_next + logBetaN[t2 + 1];
      logBetaL[t2] = logSumExp(term1, term2);
      // log β_N(t) = log( aNL * b_L(o_{t+1}) * β_L(t+1) + aNN * b_N(o_{t+1}) * β_N(t+1) )
      var term3 = Math.log(aNL + EPS) + logBL_next + logBetaL[t2 + 1];
      var term4 = Math.log(aNN + EPS) + logBN_next + logBetaN[t2 + 1];
      logBetaN[t2] = logSumExp(term3, term4);
    }

    // ===== 平滑 γ_t = α(t) * β(t) / P(obs) =====
    var gammaL = new Array(n), gammaN = new Array(n);
    // 同时计算 ξ（转移统计量）：ξ_t(i, j) = α_t(i) * a_ij * b_j(o_{t+1}) * β_{t+1}(j) / P(obs)
    var xiLL = 0, xiNL = 0, xiLN = 0, xiNN = 0;  // 累加（log domain → 用 logSumExp）

    var logXiLL_acc = -Infinity, logXiNL_acc = -Infinity;
    var logXiLN_acc = -Infinity, logXiNN_acc = -Infinity;

    for (var k = 0; k < n; k++) {
      var logGammaL_k = logAlphaL[k] + logBetaL[k] - logLik;
      var logGammaN_k = logAlphaN[k] + logBetaN[k] - logLik;
      gammaL[k] = Math.exp(logGammaL_k);
      gammaN[k] = Math.exp(logGammaN_k);
      // 归一化（数值上保证 gammaL + gammaN = 1）
      var norm = gammaL[k] + gammaN[k];
      if (norm > 0) {
        gammaL[k] /= norm;
        gammaN[k] /= norm;
      }

      // ξ_t(i, j) for t < n-1
      if (k < n - 1) {
        var oNxt = obs[k + 1] ? 1 : 0;
        var logBL_next_k = oNxt ? Math.log(1 - S + EPS) : Math.log(S + EPS);
        var logBN_next_k = oNxt ? Math.log(G + EPS) : Math.log(1 - G + EPS);

        // log ξ_t(L, L) = log α_L(t) + log aLL + log b_L(o_{t+1}) + log β_L(t+1) - logLik
        logXiLL_acc = logSumExp(logXiLL_acc, logAlphaL[k] + Math.log(aLL + EPS) + logBL_next_k + logBetaL[k + 1] - logLik);
        // log ξ_t(N, L) = log α_N(t) + log aNL + log b_L(o_{t+1}) + log β_L(t+1) - logLik
        logXiNL_acc = logSumExp(logXiNL_acc, logAlphaN[k] + Math.log(aNL + EPS) + logBL_next_k + logBetaL[k + 1] - logLik);
        // log ξ_t(L, N) = log α_L(t) + log aLN + log b_N(o_{t+1}) + log β_N(t+1) - logLik
        logXiLN_acc = logSumExp(logXiLN_acc, logAlphaL[k] + Math.log(aLN + EPS) + logBN_next_k + logBetaN[k + 1] - logLik);
        // log ξ_t(N, N) = log α_N(t) + log aNN + log b_N(o_{t+1}) + log β_N(t+1) - logLik
        logXiNN_acc = logSumExp(logXiNN_acc, logAlphaN[k] + Math.log(aNN + EPS) + logBN_next_k + logBetaN[k + 1] - logLik);
      }
    }

    xiLL = Math.exp(logXiLL_acc);
    xiNL = Math.exp(logXiNL_acc);
    xiLN = Math.exp(logXiLN_acc);
    xiNN = Math.exp(logXiNN_acc);

    return {
      gammaL: gammaL,
      gammaN: gammaN,
      xiLL: xiLL, xiNL: xiNL, xiLN: xiLN, xiNN: xiNN,
      logLik: logLik,
      alphaL: logAlphaL.map(Math.exp),  // 转回线性域（仅用于调试/单步接口）
      alphaN: logAlphaN.map(Math.exp)
    };
  }

  /**
   * 单序列对数似然
   */
  function logLikelihood(params, obs) {
    var L0 = params.L0, T = params.T, S = params.S, G = params.G;
    var pL = L0;
    var ll = 0;
    for (var i = 0; i < obs.length; i++) {
      var o = obs[i] ? 1 : 0;
      var pL_pred = pL * (1 - T) + (1 - pL) * T;
      var pCorrect = pL_pred * (1 - S) + (1 - pL_pred) * G;
      var p = o ? pCorrect : (1 - pCorrect);
      if (p < EPS) p = EPS;
      ll += Math.log(p);
      // 更新后验
      pL = (o ? (pL_pred * (1 - S)) : (pL_pred * S)) / (o ? pCorrect : (1 - pCorrect));
      if (!isFinite(pL)) pL = 0.5;
    }
    return ll;
  }

  /**
   * EM 算法拟合参数
   * @param {Array<Array<number>>} observations 多个学习者的观测序列
   * @param {object} initParams 初始参数
   * @param {number} maxIter 最大迭代
   * @param {number} tol 收敛阈值（相对对数似然变化）
   * @returns {{ L0:number, T:number, S:number, G:number, logLik:number, iter:number, converged:boolean }}
   */
  function fit(observations, initParams, maxIter, tol) {
    if (!Array.isArray(observations) || observations.length === 0) {
      return Object.assign({}, DEFAULTS, { logLik: 0, iter: 0, converged: false, reason: 'no_data' });
    }
    // 小样本退化
    var totalObs = 0;
    observations.forEach(function (o) { totalObs += o.length; });
    if (totalObs < MIN_OBS) {
      return Object.assign({}, DEFAULTS, { logLik: 0, iter: 0, converged: false, reason: 'insufficient_data' });
    }

    initParams = initParams || {};
    maxIter = maxIter || 100;
    tol = tol == null ? 1e-4 : tol;

    var params = {
      L0: initParams.L0 != null ? clamp(initParams.L0, BOUNDS.L0) : DEFAULTS.L0,
      T:  initParams.T  != null ? clamp(initParams.T,  BOUNDS.T)  : DEFAULTS.T,
      S:  initParams.S  != null ? clamp(initParams.S,  BOUNDS.S)  : DEFAULTS.S,
      G:  initParams.G  != null ? clamp(initParams.G,  BOUNDS.G)  : DEFAULTS.G
    };

    var prevLL = -Infinity;
    var iter = 0;
    var converged = false;

    while (iter < maxIter) {
      // E + M 步聚合
      // M 步充分统计量：
      //   L0_new  = γ_1(L)
      //   T_new   = (Σ ξ_t(N, L)) / (Σ (ξ_t(N, L) + ξ_t(N, N)))   [从 N 到 L 的概率]
      //   S_new   = (Σ γ_t(L) * [o_t=wrong]) / (Σ γ_t(L))
      //   G_new   = (Σ γ_t(N) * [o_t=correct]) / (Σ γ_t(N))

      var sumGammaL_first = 0;       // Σ γ_1(L)
      var sumXiNL = 0;               // Σ ξ_t(N, L)
      var sumXiNN = 0;                // Σ ξ_t(N, N)
      var sumGammaL_all = 0;          // Σ γ_t(L) over all t
      var sumGammaL_wrong = 0;        // Σ γ_t(L) when o_t=wrong
      var sumGammaN_all = 0;          // Σ γ_t(N)
      var sumGammaN_correct = 0;      // Σ γ_t(N) when o_t=correct
      var seqCount = observations.length;

      var ll = 0;

      for (var s = 0; s < observations.length; s++) {
        var obs = observations[s];
        if (!obs || obs.length === 0) continue;
        var r = forwardBackward(params, obs);
        ll += r.logLik;

        sumGammaL_first += r.gammaL[0];
        for (var t = 0; t < obs.length; t++) {
          sumGammaL_all += r.gammaL[t];
          sumGammaN_all += r.gammaN[t];
          if (obs[t] === 0 || obs[t] === false) {
            sumGammaL_wrong += r.gammaL[t];
          } else {
            sumGammaN_correct += r.gammaN[t];
          }
        }
        sumXiNL += r.xiNL;
        sumXiNN += r.xiNN;
      }

      // M 步更新
      var newL0 = sumGammaL_first / seqCount;
      var denomT = sumXiNL + sumXiNN;
      var newT = denomT > EPS ? sumXiNL / denomT : params.T;
      var newS = sumGammaL_all > EPS ? sumGammaL_wrong / sumGammaL_all : params.S;
      var newG = sumGammaN_all > EPS ? sumGammaN_correct / sumGammaN_all : params.G;

      params.L0 = clamp(newL0, BOUNDS.L0);
      params.T = clamp(newT, BOUNDS.T);
      params.S = clamp(newS, BOUNDS.S);
      params.G = clamp(newG, BOUNDS.G);

      iter++;

      // 收敛判定：相对对数似然变化
      var absLL = Math.abs(ll);
      var denom = Math.max(1, absLL);
      if (iter > 1 && Math.abs(ll - prevLL) / denom < tol) {
        converged = true;
        prevLL = ll;
        break;
      }
      prevLL = ll;
    }

    return {
      L0: params.L0, T: params.T, S: params.S, G: params.G,
      logLik: prevLL, iter: iter, converged: converged
    };
  }

  /**
   * 预测下一题答对概率
   */
  function predictNext(params, obs) {
    var posteriors = forward(params, obs);
    var pL = posteriors.length ? posteriors[posteriors.length - 1] : params.L0;
    var pL_pred = pL * (1 - params.T) + (1 - pL) * params.T;
    return pL_pred * (1 - params.S) + (1 - pL_pred) * params.G;
  }

  /**
   * 当前掌握概率（最后一题之后）
   */
  function mastery(params, obs) {
    var posteriors = forward(params, obs);
    return posteriors.length ? posteriors[posteriors.length - 1] : params.L0;
  }

  /**
   * 贝叶斯知识追踪（BKT）引擎对外接口，提供前向预测、EM 参数拟合、对数似然与掌握度计算等能力。
   * @type {Object}
   */
  window.BKTEngine = {
    DEFAULTS: DEFAULTS,
    BOUNDS: BOUNDS,
    forward: forward,
    forwardBackward: forwardBackward,
    fit: fit,
    logLikelihood: logLikelihood,
    predictNext: predictNext,
    mastery: mastery
  };
})();
