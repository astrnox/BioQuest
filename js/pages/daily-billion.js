/**
 * 每日亿题 — 随机刷题 · TikTok风格
 * v4: 本地题库Fallback · Supabase重试 · 全量审查修复 · UI优化
 */
(function() {
  'use strict';

  var SUPABASE_URL = 'https://qxehkfucvmxuojjkdaqy.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4ZWhrZnVjdm14dW9qamtkYXF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MjU2ODUsImV4cCI6MjEwMjIwMTY4NX0.lbiJxhFvy0t_J4qSeoP6K0r53M4KaEDSKkRlZu03ze8';

  var LOCAL_SAMPLE_QUESTIONS = [
    {
      id: 'local-1',
      question: '所有的原核生物都具有细胞壁。',
      subject: '细胞生物学',
      explanation: '原核生物中，支原体是没有细胞壁的。',
      subQuestions: [
        { label: 'A', text: '所有的原核生物都具有细胞壁。', answer: false }
      ]
    },
    {
      id: 'local-2',
      question: '线粒体是细胞进行有氧呼吸的主要场所。',
      subject: '细胞生物学',
      explanation: '有氧呼吸的第一阶段在细胞质基质中进行，第二、三阶段在线粒体中进行，线粒体是有氧呼吸的主要场所。',
      subQuestions: [
        { label: 'A', text: '线粒体是有氧呼吸的唯一场所。', answer: false },
        { label: 'B', text: '线粒体含有自己的DNA和核糖体。', answer: true }
      ]
    },
    {
      id: 'local-3',
      question: '判断下列关于光合作用的叙述是否正确。',
      subject: '植物生理学',
      explanation: '光反应在类囊体薄膜上进行，暗反应在叶绿体基质中进行。光反应需要光，暗反应有光无光都能进行，但需要光反应提供的ATP和NADPH。',
      subQuestions: [
        { label: 'A', text: '光合作用的光反应只在有光时进行。', answer: true },
        { label: 'B', text: '暗反应必须在黑暗条件下进行。', answer: false },
        { label: 'C', text: '氧气是由光反应产生的。', answer: true }
      ]
    },
    {
      id: 'local-4',
      question: '判断下列关于DNA复制的叙述是否正确。',
      subject: '分子生物学',
      explanation: 'DNA复制是半保留复制，边解旋边复制，需要DNA聚合酶、解旋酶等多种酶参与。',
      subQuestions: [
        { label: 'A', text: 'DNA复制是半保留复制。', answer: true },
        { label: 'B', text: 'DNA复制只发生在细胞核中。', answer: false }
      ]
    },
    {
      id: 'local-5',
      question: '判断下列关于酶的叙述是否正确。',
      subject: '生物化学',
      explanation: '酶是活细胞产生的具有催化作用的有机物，绝大多数酶是蛋白质，少数酶是RNA。酶的催化作用具有高效性、专一性，需要适宜的温度和pH。',
      subQuestions: [
        { label: 'A', text: '所有的酶都是蛋白质。', answer: false },
        { label: 'B', text: '酶在催化反应前后本身不发生变化。', answer: true },
        { label: 'C', text: '温度越高，酶的活性越高。', answer: false },
        { label: 'D', text: '酶只能在细胞内发挥作用。', answer: false }
      ]
    },
    {
      id: 'local-6',
      question: '判断下列关于遗传定律的叙述是否正确。',
      subject: '遗传学',
      explanation: '基因分离定律的实质是等位基因随同源染色体的分开而分离；基因自由组合定律的实质是非同源染色体上的非等位基因自由组合。',
      subQuestions: [
        { label: 'A', text: '等位基因位于同源染色体的相同位置上。', answer: true },
        { label: 'B', text: '基因的自由组合发生在受精作用过程中。', answer: false }
      ]
    },
    {
      id: 'local-7',
      question: '判断下列关于生态系统的叙述是否正确。',
      subject: '生态学',
      explanation: '生态系统的能量流动是单向的、逐级递减的；物质循环是全球性的、循环往复的；信息传递往往是双向的。',
      subQuestions: [
        { label: 'A', text: '生态系统的能量流动是循环的。', answer: false },
        { label: 'B', text: '生产者是生态系统的基石。', answer: true },
        { label: 'C', text: '分解者能将动植物遗体分解成无机物。', answer: true }
      ]
    },
    {
      id: 'local-8',
      question: '判断下列关于神经调节的叙述是否正确。',
      subject: '动物生理学',
      explanation: '神经调节的基本方式是反射，反射的结构基础是反射弧。兴奋在神经纤维上以电信号形式双向传导，在神经元之间通过突触单向传递。',
      subQuestions: [
        { label: 'A', text: '反射弧是反射活动的结构基础。', answer: true },
        { label: 'B', text: '兴奋在突触处的传递是双向的。', answer: false }
      ]
    }
  ];

  var _localQuestions = null;
  var _supabaseRetryCount = 0;
  var _supabaseMaxRetries = 3;

  // ========== 状态管理 ==========
  var state = {
    questions: [],
    loadedIds: {},           // 已加载的题目ID集合，防重复
    totalAnswered: 0,
    totalCorrect: 0,
    totalSubQuestions: 0,
    isLoading: false,
    hasMore: true,
    totalPoolSize: 0,        // Supabase中MTF题目总数
    answeredMap: {},
    submittedMap: {},
    favorites: {},           // 收藏 {questionId: true}
    feedback: {},            // 反馈 {questionId: 'like'|'dislike'}
    error: null,
    usingLocalQuestions: false,
    // 刷太快检测
    lastSubmitTime: 0,
    speedWarnCount: 0
  };

  var targetEl = null;
  var wrapperEl = null;
  var pageEl = null;
  var topBarEl = null;
  var scrollObserver = null;
  var _destroyed = false;
  var _sbClient = null;
  var _touchStartY = 0;
  var _touchStartTime = 0;
  var _progressTimer = null;
  var _progressStart = 0;
  var _toastTimer = null;

  // ========== 工具函数 ==========
  var escapeHtml = window.escapeHtml;

  function waitForSupabaseSDK(timeoutMs) {
    return new Promise(function(resolve) {
      var start = Date.now();
      function check() {
        if (typeof window.supabase !== 'undefined' || typeof getSupabase === 'function') {
          resolve(true);
        } else if (Date.now() - start >= timeoutMs) {
          resolve(false);
        } else {
          setTimeout(check, 100);
        }
      }
      check();
    });
  }

  function getSupabaseClient() {
    if (_sbClient) return _sbClient;
    if (typeof getSupabase === 'function' && typeof window.supabase !== 'undefined') {
      try { _sbClient = getSupabase(); return _sbClient; } catch(e) {}
    }
    if (typeof window.supabase !== 'undefined') {
      try {
        _sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
        });
        return _sbClient;
      } catch(e) {}
    }
    return null;
  }

  function getLocalQuestions() {
    if (!_localQuestions) {
      var mapped = LOCAL_SAMPLE_QUESTIONS.map(function(q) {
        return {
          id: q.id,
          question: q.question,
          subject: q.subject,
          explanation: q.explanation,
          subQuestions: q.subQuestions.map(function(sq) {
            return { label: sq.label, text: sq.text, answer: sq.answer };
          })
        };
      });
      // 本地题库也经过"超长知识讲义型"过滤
      var filterFn = (typeof window.filterQuestionList === 'function') ? window.filterQuestionList : function(x){return x;};
      _localQuestions = filterFn(mapped);
    }
    return _localQuestions;
  }

  function loadQuestionsFromLocal(limit) {
    var pool = getLocalQuestions();
    var shuffled = pool.slice().sort(function() { return Math.random() - 0.5; });
    var result = [];
    var seen = state.loadedIds;
    for (var i = 0; i < shuffled.length && result.length < limit; i++) {
      if (!seen[shuffled[i].id]) {
        result.push(shuffled[i]);
      }
    }
    if (result.length < limit) {
      state.loadedIds = {};
      seen = state.loadedIds;
      for (var j = 0; j < shuffled.length && result.length < limit; j++) {
        if (!seen[shuffled[j].id]) {
          result.push(shuffled[j]);
        }
      }
    }
    state.totalPoolSize = pool.length;
    state.usingLocalQuestions = true;
    return result;
  }

  // ========== 随机加载题目 ==========
  // 云题库查询统一包裹"超时保护"：Supabase 位于韩国，弱网/跨国链路下单请求
  // 可能长时间无响应（表现为进入路由后迟迟不出题、用户等待中切走路由时
  // 在途请求被取消产生 net::ERR_ABORTED）。超时后按失败处理，立即回退本地题库。
  var REQUEST_TIMEOUT_MS = 8000;
  function _withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        clearTimeout(timer);
        reject(Object.assign(new Error('云题库请求超时'), { code: 'REQUEST_TIMEOUT' }));
      }, ms);
      promise.then(
        function (v) { clearTimeout(timer); resolve(v); },
        function (e) { clearTimeout(timer); reject(e); }
      );
    });
  }

  async function loadQuestionsFromSupabase(limit) {
    var sb = getSupabaseClient();
    if (!sb) return null;

    try {
      // 首次获取总数
      if (state.totalPoolSize === 0) {
        var countResult = await _withTimeout(sb.from('questions').select('id', { count: 'exact', head: true }).eq('type', 'mtf'), REQUEST_TIMEOUT_MS);
        if (!countResult.error && countResult.count !== null) {
          state.totalPoolSize = countResult.count;
        }
      }

      // 如果已加载完所有题目，从头循环
      if (Object.keys(state.loadedIds).length >= state.totalPoolSize && state.totalPoolSize > 0) {
        state.loadedIds = {};
        state.hasMore = true;
      }

      // 随机偏移
      var poolSize = state.totalPoolSize > 0 ? state.totalPoolSize : 100;
      var maxOffset = Math.max(0, poolSize - limit);
      var randomOffset = Math.floor(Math.random() * maxOffset);

      var result = await _withTimeout(sb.from('questions')
        .select('id,question,sub_questions,explanation,subject')
        .eq('type', 'mtf')
        .range(randomOffset, randomOffset + limit - 1), REQUEST_TIMEOUT_MS);

      if (result.error) {
        console.warn('[每日亿题] Supabase查询失败:', result.error.message);
        return null;
      }

      if (!result.data || result.data.length === 0) return [];

      // 过滤已加载的ID
      var freshQuestions = result.data.filter(function(q) { return !state.loadedIds[q.id]; });

      // 如果过滤后不够，再随机拉一批
      if (freshQuestions.length < limit && state.totalPoolSize > limit) {
        var retryOffset = Math.floor(Math.random() * Math.max(0, poolSize - limit));
        var retryResult = await _withTimeout(sb.from('questions')
          .select('id,question,sub_questions,explanation,subject')
          .eq('type', 'mtf')
          .range(retryOffset, retryOffset + limit - 1), REQUEST_TIMEOUT_MS);
        if (retryResult.data) {
          var more = retryResult.data.filter(function(q) { return !state.loadedIds[q.id]; });
          var seen = {};
          freshQuestions.forEach(function(q) { seen[q.id] = true; });
          more.forEach(function(q) {
            if (!seen[q.id]) { seen[q.id] = true; freshQuestions.push(q); }
          });
        }
      }

      return freshQuestions.map(function(q) {
        var subQuestions = [];
        try {
          var raw = q.sub_questions;
          if (typeof raw === 'string') raw = JSON.parse(raw);
          if (Array.isArray(raw)) {
            subQuestions = raw.map(function(sq, i) {
              return { label: sq.label || String.fromCharCode(65 + i), text: sq.text || '', answer: Boolean(sq.answer) };
            });
          }
        } catch(e) {}
        return { id: q.id, question: q.question || '', subQuestions: subQuestions, explanation: q.explanation || '', subject: q.subject || '' };
      }).filter(function (q) {
        // Supabase 远程题库超长讲义过滤：null 会被后面的 filterQuestionList 剔除
        var fn = typeof window.filterLectureStyleQuestion === 'function' ? window.filterLectureStyleQuestion : null;
        if (!fn) return true;
        var cleaned = fn(q);
        if (cleaned) { Object.assign(q, cleaned); return true; }
        return false;
      });
    } catch(e) {
      console.warn('[每日亿题] Supabase请求异常:', e.message);
      return null;
    }
  }

  // ========== 加载题目（Supabase优先，本地Fallback） ==========
  async function loadQuestions(limit) {
    if (state.isLoading) return;
    state.isLoading = true;
    state.error = null;

    startProgressBar();

    var newQuestions = null;

    if (state.usingLocalQuestions) {
      newQuestions = loadQuestionsFromLocal(limit);
    } else {
      if (!getSupabaseClient() && _supabaseRetryCount < _supabaseMaxRetries) {
        _supabaseRetryCount++;
        await waitForSupabaseSDK(5000);
      }

      newQuestions = await loadQuestionsFromSupabase(limit);

      if (newQuestions === null || (newQuestions.length === 0 && state.questions.length === 0)) {
        console.log('[每日亿题] 使用本地题库模式');
        newQuestions = loadQuestionsFromLocal(limit);
        if (state.questions.length === 0 && newQuestions.length > 0) {
          showToast('已切换到本地题库模式');
        }
      }
    }

    if (!newQuestions || newQuestions.length === 0) {
      if (state.questions.length === 0) {
        state.error = '题库加载失败，请稍后重试';
      } else {
        state.error = '网络连接失败，无法加载更多题目';
      }
      state.isLoading = false;
      finishProgressBar();
      return;
    }

    newQuestions.forEach(function(q) { state.loadedIds[q.id] = true; });
    state.questions = state.questions.concat(newQuestions);
    state.isLoading = false;
    finishProgressBar();
  }

  // ========== 进度条 ==========
  function startProgressBar() {
    _progressStart = Date.now();
    var bar = wrapperEl && wrapperEl.querySelector('#dbProgressBar');
    if (bar) {
      bar.style.width = '0%';
      bar.style.opacity = '1';
      bar.style.transition = 'none';
    }
    if (_progressTimer) clearInterval(_progressTimer);
    _progressTimer = setInterval(function() {
      var bar2 = wrapperEl && wrapperEl.querySelector('#dbProgressBar');
      if (!bar2) { clearInterval(_progressTimer); _progressTimer = null; return; }
      var elapsed = Date.now() - _progressStart;
      var pct = Math.min(90, elapsed < 2000 ? (elapsed / 2000) * 60 : 60 + (elapsed - 2000) / 8000 * 30);
      bar2.style.transition = 'width 0.3s ease-out';
      bar2.style.width = pct + '%';
    }, 300);
  }

  function finishProgressBar() {
    if (_progressTimer) { clearInterval(_progressTimer); _progressTimer = null; }
    var bar = wrapperEl && wrapperEl.querySelector('#dbProgressBar');
    if (bar) {
      bar.style.transition = 'width 0.2s ease-out, opacity 0.3s ease-out';
      bar.style.width = '100%';
      setTimeout(function() {
        if (bar) { bar.style.opacity = '0'; bar.style.width = '0%'; }
      }, 250);
    }
  }

  // ========== Toast提示 ==========
  function showToast(msg) {
    if (_toastTimer) clearTimeout(_toastTimer);
    if (!wrapperEl) return;
    var existing = wrapperEl.querySelector('#dbToast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'dbToast';
    toast.className = 'db-toast';
    toast.textContent = msg;
    wrapperEl.appendChild(toast);
    requestAnimationFrame(function() { toast.classList.add('show'); });
    _toastTimer = setTimeout(function() {
      toast.classList.remove('show');
      setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300);
    }, 2000);
  }

  // ========== 刷太快检测 ==========
  function checkSpeedWarn() {
    var now = Date.now();
    if (state.lastSubmitTime > 0) {
      var elapsed = now - state.lastSubmitTime;
      if (elapsed < 3000) {
        state.speedWarnCount++;
        if (state.speedWarnCount === 1) {
          showToast('慢一点，想想再答');
        } else if (state.speedWarnCount === 2) {
          showToast('刷太快了，仔细审题');
        } else if (state.speedWarnCount >= 3) {
          showToast('每题至少花3秒思考，质量比数量重要');
        }
      } else if (elapsed > 10000) {
        state.speedWarnCount = Math.max(0, state.speedWarnCount - 1);
      }
    }
    state.lastSubmitTime = now;
  }

  // ========== 渲染顶部栏 ==========
  function renderTopBar() {
    if (!wrapperEl || _destroyed) return;
    var html = '';
    html += '<div class="db-progress-wrap"><div class="db-progress-bar" id="dbProgressBar"></div></div>';
    html += '<div class="db-top-bar" id="dbTopBar">';
    html += '<div class="db-top-bar-left">';
    html += '<a class="db-back-btn" href="#/" data-on=\'["_cspGotoHash","#/"]\' data-prevent-default>';
    html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
    html += '</a>';
    html += '<span class="db-top-bar-title">每日亿题</span>';
    html += '</div>';
    html += '<div class="db-top-bar-right">';
    html += '<button class="db-stop-btn" data-action="stop" title="结束刷题">结束</button>';
    html += '<div class="db-counter-badge" id="dbCounterBadge">';
    html += '<span>已刷</span><span class="db-counter-num" id="dbCounterNum">' + state.totalAnswered + '</span><span>题</span>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    var existing = wrapperEl.querySelector('#dbTopBar');
    if (existing) existing.remove();
    var existingProgress = wrapperEl.querySelector('.db-progress-wrap');
    if (existingProgress) existingProgress.remove();
    wrapperEl.insertAdjacentHTML('afterbegin', html);
    topBarEl = wrapperEl.querySelector('#dbTopBar');
  }

  // ========== 渲染右侧操作栏 ==========
  function renderActionBar(q) {
    var fid = 'fav-' + q.id;
    var isFav = state.favorites[q.id];
    var fb = state.feedback[q.id];
    var html = '';
    html += '<div class="db-action-bar">';
    // 收藏
    html += '<button class="db-action-btn db-fav-btn' + (isFav ? ' active' : '') + '" data-action="fav" data-qid="' + escapeHtml(q.id) + '" title="收藏">';
    html += '<svg viewBox="0 0 24 24" fill="' + (isFav ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
    html += '</button>';
    // 赞
    html += '<button class="db-action-btn db-like-btn' + (fb === 'like' ? ' active' : '') + '" data-action="like" data-qid="' + escapeHtml(q.id) + '" title="赞">';
    html += '<svg viewBox="0 0 24 24" fill="' + (fb === 'like' ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/></svg>';
    html += '</button>';
    // 踩
    html += '<button class="db-action-btn db-dislike-btn' + (fb === 'dislike' ? ' active' : '') + '" data-action="dislike" data-qid="' + escapeHtml(q.id) + '" title="踩">';
    html += '<svg viewBox="0 0 24 24" fill="' + (fb === 'dislike' ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/></svg>';
    html += '</button>';
    // 分享
    html += '<button class="db-action-btn db-share-btn" data-action="share" data-qid="' + escapeHtml(q.id) + '" title="分享">';
    html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
    html += '</button>';
    html += '</div>';
    return html;
  }

  // ========== 渲染单张题目卡片 ==========
  function renderQuestionCard(q, index) {
    var submitted = state.submittedMap[q.id];
    var answers = state.answeredMap[q.id] || {};
    var allAnswered = q.subQuestions.every(function(_, i) { return answers[i] !== undefined; });

    var html = '';
    html += '<div class="db-card" data-question-id="' + escapeHtml(q.id) + '" data-index="' + index + '">';
    html += '<div class="db-card-inner">';

    html += '<div class="db-card-header">';
    html += '<span class="db-card-num">' + (index + 1) + '</span>';
    if (q.subject) html += '<span class="db-card-subject">' + escapeHtml(q.subject) + '</span>';
    // 题目ID（紧贴标签，供管理员后台按ID调题）
    html += '<span class="db-card-qid" title="题目ID（管理员可据此调出本题）">#' + escapeHtml(String(q.id)) + '</span>';
    html += '</div>';

    html += '<div class="db-question-text">' + escapeHtml(q.question) + '</div>';

    html += '<div class="db-sub-list">';
    for (var i = 0; i < q.subQuestions.length; i++) {
      var sq = q.subQuestions[i];
      var userAnswer = answers[i];
      var correctAnswer = sq.answer;
      var itemCls = 'db-sub-item';
      var resultIcon = '';
      if (submitted) {
        itemCls += ' submitted';
        if (userAnswer === correctAnswer) { itemCls += ' result-correct'; resultIcon = '<span class="db-sub-result-icon">&#10003;</span>'; }
        else { itemCls += ' result-wrong'; resultIcon = '<span class="db-sub-result-icon">&#10007;</span>'; }
      }
      html += '<div class="' + itemCls + '" data-sub-idx="' + i + '">';
      html += '<div class="db-sub-head">';
      html += '<span class="db-sub-label">' + escapeHtml(sq.label) + '</span>';
      html += '<span class="db-sub-text">' + escapeHtml(sq.text) + '</span>';
      if (submitted && resultIcon) html += resultIcon;
      html += '</div>';
      html += '<div class="db-sub-toggle">';
      html += '<button class="db-tf-btn' + (userAnswer === true ? ' selected' : '') + '" data-value="true" data-sub-idx="' + i + '">正确</button>';
      html += '<button class="db-tf-btn' + (userAnswer === false ? ' selected' : '') + '" data-value="false" data-sub-idx="' + i + '">错误</button>';
      html += '</div></div>';
    }
    html += '</div>';

    html += '<button class="db-submit-btn" data-action="submit" data-card-idx="' + index + '"' + (allAnswered && !submitted ? '' : ' disabled') + '>';
    html += submitted ? '已提交' : '提交判断';
    html += '</button>';

    if (submitted) {
      var correctCount = 0;
      for (var j = 0; j < q.subQuestions.length; j++) {
        if (answers[j] === q.subQuestions[j].answer) correctCount++;
      }
      var totalSub = q.subQuestions.length;
      var allCorrect = correctCount === totalSub;
      var allWrong = correctCount === 0;
      var summaryCls = 'db-result-summary';
      var summaryIcon = '', summaryText = '';
      if (allCorrect) { summaryCls += ' all-correct'; summaryIcon = '\u2713'; summaryText = '全部正确 ' + correctCount + '/' + totalSub; }
      else if (allWrong) { summaryCls += ' all-wrong'; summaryIcon = '\u2717'; summaryText = '全部错误 ' + correctCount + '/' + totalSub; }
      else { summaryCls += ' partial'; summaryIcon = '\u25D0'; summaryText = '部分正确 ' + correctCount + '/' + totalSub; }

      html += '<div class="db-result">';
      html += '<div class="' + summaryCls + '"><span class="db-result-icon">' + summaryIcon + '</span><span>' + summaryText + '</span></div>';
      if (q.explanation) {
        html += '<div class="db-explanation"><div class="db-explanation-title">解析</div><div class="db-explanation-text">' + escapeHtml(q.explanation) + '</div></div>';
      }
      html += '<div class="db-swipe-hint"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg><span>上滑下一题</span></div>';
      html += '</div>';
    }

    html += '</div>';
    // 右侧操作栏
    html += renderActionBar(q);
    html += '</div>';
    return html;
  }

  function renderLoadingCard() {
    return '<div class="db-loading-card"><div class="db-loading-content"><div class="db-spinner"></div><span>加载题目中...</span></div></div>';
  }

  function renderStopOverlay() {
    var accuracy = state.totalSubQuestions > 0 ? Math.round(state.totalCorrect / state.totalSubQuestions * 100) : 0;
    return '<div class="db-stop-overlay" id="dbStopOverlay">' +
      '<div class="db-stop-card">' +
      '<div class="db-stop-icon">' + (accuracy >= 80 ? '&#9733;' : accuracy >= 60 ? '&#9679;' : '&#9675;') + '</div>' +
      '<div class="db-stop-title">刷题统计</div>' +
      '<div class="db-stop-stats">' +
      '<div class="db-stop-stat"><div class="db-stop-stat-val">' + state.totalAnswered + '</div><div class="db-stop-stat-lbl">刷题数</div></div>' +
      '<div class="db-stop-stat"><div class="db-stop-stat-val">' + state.totalSubQuestions + '</div><div class="db-stop-stat-lbl">总判断</div></div>' +
      '<div class="db-stop-stat"><div class="db-stop-stat-val">' + accuracy + '%</div><div class="db-stop-stat-lbl">正确率</div></div>' +
      '</div>' +
      '<div class="db-stop-actions">' +
      '<button class="db-stop-continue-btn" data-action="continue">继续刷题</button>' +
      '<button class="db-stop-restart-btn" data-action="restart">重新开始</button>' +
      '</div>' +
      '</div></div>';
  }

  function renderErrorCard() {
    return '<div class="db-error-card"><div class="db-error-content">' +
      '<div class="db-error-icon">&#128565;</div>' +
      '<div class="db-error-title">加载失败</div>' +
      '<div class="db-error-desc">' + (state.error || '题目加载出错，请检查网络连接后重试') + '</div>' +
      '<button class="db-error-retry-btn" data-action="retry">重试</button>' +
      '</div></div>';
  }

  // ========== 渲染整页 ==========
  function renderPage() {
    if (!pageEl || _destroyed) return;
    var html = '';
    for (var i = 0; i < state.questions.length; i++) {
      html += renderQuestionCard(state.questions[i], i);
    }
    if (state.isLoading) html += renderLoadingCard();
    else if (state.error && state.questions.length === 0) html += renderErrorCard();
    else if (state.questions.length === 0) html += renderLoadingCard();
    pageEl.innerHTML = html;
    setupScrollObserver();
    updateCounter();
  }

  // ========== 更新计数器 ==========
  function updateCounter() {
    var numEl = wrapperEl && wrapperEl.querySelector('#dbCounterNum');
    if (numEl) numEl.textContent = state.totalAnswered;
  }

  function pulseCounter() {
    var badge = wrapperEl && wrapperEl.querySelector('#dbCounterBadge');
    if (badge) { badge.classList.remove('pulse'); void badge.offsetWidth; badge.classList.add('pulse'); }
  }

  // ========== 事件委托 ==========
  function setupGlobalDelegation() {
    if (!wrapperEl || _destroyed) return;
    wrapperEl.removeEventListener('click', globalClickHandler);
    wrapperEl.addEventListener('click', globalClickHandler);
  }

  function globalClickHandler(e) {
    var target = e.target;
    var tfBtn = target.closest ? target.closest('.db-tf-btn') : (target.classList && target.classList.contains('db-tf-btn') ? target : null);
    if (tfBtn) { handleTFClickDelegated(tfBtn); return; }
    var actionEl = target.closest ? target.closest('[data-action]') : (target.hasAttribute && target.hasAttribute('data-action') ? target : null);
    if (actionEl) {
      var action = actionEl.getAttribute('data-action');
      if (action === 'submit') { handleSubmitDelegated(actionEl); return; }
      if (action === 'stop') { handleStop(); return; }
      if (action === 'continue') { handleContinue(); return; }
      if (action === 'restart') { handleRestart(); return; }
      if (action === 'retry') { handleRetry(); return; }
      if (action === 'fav') { handleFav(actionEl); return; }
      if (action === 'like') { handleFeedback(actionEl, 'like'); return; }
      if (action === 'dislike') { handleFeedback(actionEl, 'dislike'); return; }
      if (action === 'share') { handleShare(actionEl); return; }
    }
  }

  function handleTFClickDelegated(btn) {
    var subIdx = parseInt(btn.dataset.subIdx, 10);
    var value = btn.dataset.value === 'true';
    var cardEl = btn.closest('.db-card');
    if (!cardEl) return;
    var questionId = cardEl.dataset.questionId;
    var cardIdx = parseInt(cardEl.dataset.index, 10);
    var q = state.questions[cardIdx];
    if (!q || q.id !== questionId) return;
    if (state.submittedMap[q.id]) return;

    if (!state.answeredMap[q.id]) state.answeredMap[q.id] = {};
    state.answeredMap[q.id][subIdx] = value;

    var subItem = btn.closest('.db-sub-item');
    if (subItem) {
      var trueBtn = subItem.querySelector('.db-tf-btn[data-value="true"]');
      var falseBtn = subItem.querySelector('.db-tf-btn[data-value="false"]');
      if (trueBtn) trueBtn.classList.remove('selected');
      if (falseBtn) falseBtn.classList.remove('selected');
    }
    btn.classList.add('selected');

    var answers = state.answeredMap[q.id];
    var allAnswered = q.subQuestions.every(function(_, k) { return answers[k] !== undefined; });
    var submitBtn = cardEl.querySelector('.db-submit-btn');
    if (submitBtn && allAnswered) { submitBtn.disabled = false; submitBtn.textContent = '提交判断'; }
    saveState();
  }

  function handleSubmitDelegated(btn) {
    var cardIdx = parseInt(btn.dataset.cardIdx, 10);
    var q = state.questions[cardIdx];
    if (!q) return;
    var cardEl = pageEl.querySelector('.db-card[data-index="' + cardIdx + '"]');
    if (!cardEl) return;

    var answers = state.answeredMap[q.id] || {};
    var allAnswered = q.subQuestions.every(function(_, i) { return answers[i] !== undefined; });
    if (!allAnswered) return;
    if (state.submittedMap[q.id]) return;

    checkSpeedWarn();

    state.submittedMap[q.id] = true;
    state.totalAnswered++;

    var correctCount = 0;
    for (var i = 0; i < q.subQuestions.length; i++) {
      if (answers[i] === q.subQuestions[i].answer) correctCount++;
    }
    state.totalCorrect += correctCount;
    state.totalSubQuestions += q.subQuestions.length;

    saveState();
    updateCounter();
    pulseCounter();

    if (typeof window.recordDailyCheckIn === 'function') { try { window.recordDailyCheckIn(); } catch(e) {} }
    if (typeof window.checkAchievement === 'function') { try { window.checkAchievement('practice', 1); } catch(e) {} }

    cardEl.outerHTML = renderQuestionCard(q, cardIdx);

    setTimeout(function() {
      if (_destroyed || !pageEl) return;
      var newCard = pageEl.querySelector('.db-card[data-index="' + cardIdx + '"]');
      if (newCard) {
        var result = newCard.querySelector('.db-result');
        if (result) result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 150);
  }

  // ========== 收藏 ==========
  function handleFav(btn) {
    var qid = btn.dataset.qid;
    if (state.favorites[qid]) {
      delete state.favorites[qid];
      btn.classList.remove('active');
      var svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', 'none');
    } else {
      state.favorites[qid] = true;
      btn.classList.add('active');
      var svg2 = btn.querySelector('svg');
      if (svg2) svg2.setAttribute('fill', 'currentColor');
      showToast('已收藏');
    }
    saveState();
  }

  // ========== 赞/踩反馈 ==========
  function handleFeedback(btn, type) {
    var qid = btn.dataset.qid;
    // 切换：再次点击取消
    if (state.feedback[qid] === type) {
      delete state.feedback[qid];
      btn.classList.remove('active');
      var svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', 'none');
      // 同时取消另一边的active
      var cardEl = btn.closest('.db-card');
      if (cardEl) {
        var other = cardEl.querySelector('.db-action-btn[data-action="' + (type === 'like' ? 'dislike' : 'like') + '"]');
        if (other) other.classList.remove('active');
        var otherSvg = other && other.querySelector('svg');
        if (otherSvg) otherSvg.setAttribute('fill', 'none');
      }
    } else {
      state.feedback[qid] = type;
      btn.classList.add('active');
      var svg2 = btn.querySelector('svg');
      if (svg2) svg2.setAttribute('fill', 'currentColor');
      // 取消另一边
      var cardEl2 = btn.closest('.db-card');
      if (cardEl2) {
        var other2 = cardEl2.querySelector('.db-action-btn[data-action="' + (type === 'like' ? 'dislike' : 'like') + '"]');
        if (other2) { other2.classList.remove('active'); var os = other2.querySelector('svg'); if (os) os.setAttribute('fill', 'none'); }
      }
      showToast(type === 'like' ? '感谢反馈' : '已记录');
    }
    saveState();
  }

  // ========== 分享 ==========
  function handleShare(btn) {
    var qid = btn.dataset.qid;
    var url = window.location.origin + window.location.pathname + '#/daily-billion?q=' + qid;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function() {
        showToast('链接已复制');
      }).catch(function() {
        showToast('分享链接: ' + url);
      });
    } else {
      showToast('分享链接: ' + url);
    }
  }

  // ========== 滚动监听（懒加载 + 入场动画激活） ==========
  // 缓存：避免重复绑定 scroll fallback
  var _scrollFallbackBound = false;
  var _scrollFallbackTimer = null;
  var _cardAnimObserver = null;    // 控制卡片入场动画：仅对进入视口的卡片播放
  var _initCheckTimer = null;      // 首屏渲染后的延迟兜底检查
  var _lastSettledCheck = 0;       // 防抖：scroll settle 检查节流

  function setupScrollObserver() {
    if (!pageEl || _destroyed) return;
    if (scrollObserver) { scrollObserver.disconnect(); scrollObserver = null; }

    // ========== 动画性能关键：卡片视口可见性控制入场动画 ==========
    // 问题：scroll-snap-mandatory 模式下首屏会同时创建多张卡片 DOM，
    //       浏览器同时排队播放入场动画（dbCardReveal / dbSubItemIn 等）
    //       → 合成线程压力大 → 掉帧 / 卡顿
    // 策略：默认所有卡片用 paused 态（无动画），用 IntersectionObserver 只在卡片
    //       真正进入视口后为其加 .db-card--animate 类，才触发一次入场动画，
    //       离开视口后动画自动结束（不会回退），后续无需再播放。
    if (_cardAnimObserver) { _cardAnimObserver.disconnect(); _cardAnimObserver = null; }
    try {
      _cardAnimObserver = new IntersectionObserver(function (entries) {
        if (_destroyed) return;
        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          var inner = entry.target.querySelector && entry.target.querySelector('.db-card-inner');
          if (!inner) continue;
          if (entry.isIntersecting) {
            // 进入视口 → 加动画类（仅一次，加过就不再回退）
            if (!inner.classList.contains('db-card--animate')) {
              inner.classList.add('db-card--animate');
            }
          }
        }
      }, { root: pageEl, rootMargin: '20% 0px 10% 0px', threshold: 0.02 });
    } catch (e) { _cardAnimObserver = null; }

    // 先把当前所有卡片登记
    var allCards = pageEl.querySelectorAll('.db-card');
    for (var ac = 0; ac < allCards.length; ac++) {
      if (_cardAnimObserver) {
        try { _cardAnimObserver.observe(allCards[ac]); } catch (e) {}
      } else {
        // 不支持 IO 时退化：直接给前 2 张加动画类，后续默认有
        var inr = allCards[ac].querySelector('.db-card-inner');
        if (inr && ac < 3) inr.classList.add('db-card--animate');
      }
    }

    // 额外兜底：滚动事件监听（IntersectionObserver 在极端情况下不触发时的备用）
    if (!_scrollFallbackBound) {
      _scrollFallbackBound = true;
      pageEl.addEventListener('scroll', function onScroll() {
        if (_destroyed || !pageEl) return;
        // 节流：120ms 内只检查一次
        if (_scrollFallbackTimer) return;
        _scrollFallbackTimer = setTimeout(function () {
          _scrollFallbackTimer = null;
          _checkShouldLazyLoadByScroll();
          // 每次滚动后再额外做一次 settled 检查（应对快速滑到底部）
          _throttledSettledCheck();
        }, 120);
      }, { passive: true });
    }

    // 优先观察 loading card（如果存在）
    var loadingCard = pageEl.querySelector('.db-loading-card');
    if (loadingCard && !state.isLoading) {
      // 有 loading 占位卡片但没在加载中 → 异常状态，移除并重新观察最后一题
      loadingCard.remove();
    }
    var targetEl = null;
    var cards = pageEl.querySelectorAll('.db-card');
    if (cards.length === 0 && !loadingCard) return;

    // 选择触发目标：接近末尾的最后一张卡片（或 loading card 本身）
    if (loadingCard) {
      targetEl = loadingCard;
    } else if (cards.length > 0) {
      // 用倒数第 2 张（不是 -3）在移动端更可靠；只有 1 张时用它自己
      var targetIdx = Math.max(0, cards.length - 2);
      targetEl = cards[targetIdx];
    }

    if (targetEl) {
      scrollObserver = new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting && !state.isLoading && state.hasMore) {
          lazyLoadMore();
        }
      }, { root: pageEl, rootMargin: '240px 0px', threshold: [0.01, 0.1, 0.3] });
      try { scrollObserver.observe(targetEl); } catch (e) {}
    }
  }

  // scroll 结束后的延迟二次检查（应对 iOS Safari scroll-snap + IO 冲突）
  function _throttledSettledCheck() {
    var now = Date.now();
    if (now - _lastSettledCheck < 350) return;
    _lastSettledCheck = now;
    setTimeout(function () {
      if (_destroyed) return;
      _checkShouldLazyLoadByScroll();
    }, 380);
  }

  // 兜底：用滚动位置判断是否该懒加载（应对 IntersectionObserver 偶发不触发）
  function _checkShouldLazyLoadByScroll() {
    if (state.isLoading || _destroyed || !state.hasMore || !pageEl) return;
    // 距底部 < 380px 且未在加载 → 触发（阈值调高，移动端体验更稳）
    var distToBottom = pageEl.scrollHeight - pageEl.scrollTop - pageEl.clientHeight;
    if (distToBottom < 380) {
      lazyLoadMore();
    }
  }

  async function lazyLoadMore() {
    if (state.isLoading || _destroyed) return;
    state.isLoading = true; // 先设为 loading（防止上面 fallback 重复触发）
    if (scrollObserver) { scrollObserver.disconnect(); scrollObserver = null; }
    var oldLen = state.questions.length;
    try {
      await loadQuestions(3);
    } catch (loadErr) {
      console.warn('[DailyBillion] lazyLoadMore 异常:', loadErr);
      state.error = loadErr.message || '加载失败，请下拉再试';
    }
    state.isLoading = false;
    if (_destroyed) return;
    var addedCardEls = [];
    if (state.questions.length > oldLen) {
      var loadingCard = pageEl.querySelector('.db-loading-card');
      if (loadingCard) {
        var newHtml = '';
        for (var i = oldLen; i < state.questions.length; i++) newHtml += renderQuestionCard(state.questions[i], i);
        if (state.isLoading) newHtml += renderLoadingCard();
        // 先找到 loading 的前一个（即新卡片将插入后位置的基准），以便稍后收集新增卡片
        var prevSibling = loadingCard.previousElementSibling;
        loadingCard.insertAdjacentHTML('beforebegin', newHtml);
        loadingCard.remove();
        // 收集新增卡片：从 prevSibling 的下一个开始到末尾
        var walker = prevSibling ? prevSibling.nextElementSibling : pageEl.firstElementChild;
        while (walker) {
          if (walker.classList && walker.classList.contains('db-card')) addedCardEls.push(walker);
          walker = walker.nextElementSibling;
        }
      } else {
        var beforeCount = pageEl.children.length;
        var newHtml2 = '';
        for (var k = oldLen; k < state.questions.length; k++) newHtml2 += renderQuestionCard(state.questions[k], k);
        if (state.isLoading) newHtml2 += renderLoadingCard();
        pageEl.insertAdjacentHTML('beforeend', newHtml2);
        // 收集：从 beforeCount 索引开始的后续孩子
        for (var ci = beforeCount; ci < pageEl.children.length; ci++) {
          var ch = pageEl.children[ci];
          if (ch.classList && ch.classList.contains('db-card')) addedCardEls.push(ch);
        }
      }
    } else if (state.error) {
      showToast(state.error);
      state.error = null;
    } else if (state.hasMore === false) {
      // 题库到底：移除 loading 占位，显示结束提示（如果还没显示）
      var loading = pageEl.querySelector('.db-loading-card');
      if (loading) {
        loading.innerHTML = '<div class="db-loading-content"><span>&#127881; 已刷完当前题库，厉害！</span></div>';
      }
    }
    // ========== 关键：为新增卡片注册入场动画观察（避免离屏时也播动画造成卡顿） ==========
    if (_cardAnimObserver && addedCardEls.length > 0) {
      for (var ai = 0; ai < addedCardEls.length; ai++) {
        try { _cardAnimObserver.observe(addedCardEls[ai]); } catch (e) {}
      }
    } else if (addedCardEls.length > 0) {
      // 退化：给全部新加卡片直接加动画类（但只有 1 张会在视口，影响不大）
      for (var aj = 0; aj < addedCardEls.length; aj++) {
        var inr2 = addedCardEls[aj].querySelector && addedCardEls[aj].querySelector('.db-card-inner');
        if (inr2) inr2.classList.add('db-card--animate');
      }
    }
    setupScrollObserver();
  }

  // ========== 触摸滑动 ==========
  function handleTouchStart(e) {
    if (e.touches.length !== 1) return;
    _touchStartY = e.touches[0].clientY;
    _touchStartTime = Date.now();
  }

  function handleTouchEnd(e) {
    if (!pageEl || _destroyed || !_touchStartY) return;
    var dy = e.changedTouches[0].clientY - _touchStartY;
    var dt = Date.now() - _touchStartTime;
    _touchStartY = 0;
    var isGesture = dt <= 500 && Math.abs(dy) >= 50 &&
      !e.target.closest('.db-tf-btn') && !e.target.closest('.db-submit-btn') && !e.target.closest('.db-action-btn');
    if (isGesture) {
      if (dy < 0) scrollToNextCard();
      else scrollToPrevCard();
    }
    // 触摸结束 → 不管有没有滑动手势，都做一次懒加载 + settled 检查
    // （应对"下拉不会加载出动画/题目"：scroll-snap 结束时 IO 偶发不触发）
    setTimeout(function () {
      if (_destroyed) return;
      _checkShouldLazyLoadByScroll();
      _throttledSettledCheck();
    }, isGesture ? 460 : 120);
  }

  // ========== 停止 / 继续 / 重启 ==========
  function handleStop() {
    if (_destroyed || !wrapperEl) return;
    var existing = wrapperEl.querySelector('#dbStopOverlay');
    if (existing) return;
    var overlayHtml = renderStopOverlay();
    wrapperEl.insertAdjacentHTML('beforeend', overlayHtml);
    var actionBars = wrapperEl.querySelectorAll('.db-action-bar');
    for (var i = 0; i < actionBars.length; i++) actionBars[i].style.display = 'none';
  }

  function handleContinue() {
    if (_destroyed || !wrapperEl) return;
    var overlay = wrapperEl.querySelector('#dbStopOverlay');
    if (overlay) overlay.remove();
    var actionBars = wrapperEl.querySelectorAll('.db-action-bar');
    for (var i = 0; i < actionBars.length; i++) actionBars[i].style.display = '';
  }

  function handleRestart() {
    if (_destroyed || !wrapperEl) return;
    var overlay = wrapperEl.querySelector('#dbStopOverlay');
    if (overlay) overlay.remove();
    cleanupDom();
    resetState();
    initDailyBillionCore();
  }

  function handleRetry() {
    if (_destroyed) return;
    cleanupDom();
    resetState();
    initDailyBillionCore();
  }

  function cleanupDom() {
    document.removeEventListener('keydown', handleKeyDown);
    if (wrapperEl) {
      wrapperEl.removeEventListener('click', globalClickHandler);
    }
    if (pageEl) {
      pageEl.removeEventListener('touchstart', handleTouchStart);
      pageEl.removeEventListener('touchend', handleTouchEnd);
    }
    if (scrollObserver) { scrollObserver.disconnect(); scrollObserver = null; }
    if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
    if (_progressTimer) { clearInterval(_progressTimer); _progressTimer = null; }
    if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
    if (wrapperEl && wrapperEl.parentNode) {
      wrapperEl.parentNode.removeChild(wrapperEl);
    }
    wrapperEl = null;
    pageEl = null;
    topBarEl = null;
    _touchStartY = 0;
    _touchStartTime = 0;
  }

  function resetState() {
    state.questions = [];
    state.loadedIds = {};
    state.totalAnswered = 0;
    state.totalCorrect = 0;
    state.totalSubQuestions = 0;
    state.isLoading = false;
    state.hasMore = true;
    state.totalPoolSize = 0;
    state.answeredMap = {};
    state.submittedMap = {};
    state.favorites = {};
    state.feedback = {};
    state.error = null;
    state.usingLocalQuestions = false;
    state.lastSubmitTime = 0;
    state.speedWarnCount = 0;
    _supabaseRetryCount = 0;
    _sbClient = null;
    try { localStorage.removeItem('bioquest_billion_v3'); } catch(e) {}
  }

  // ========== 状态持久化 ==========
  var _saveTimer = null;
  function saveState() {
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(function() {
      _saveTimer = null;
      try {
        var data = {
          totalAnswered: state.totalAnswered,
          totalCorrect: state.totalCorrect,
          totalSubQuestions: state.totalSubQuestions,
          answeredMap: state.answeredMap,
          submittedMap: state.submittedMap,
          favorites: state.favorites,
          feedback: state.feedback
        };
        localStorage.setItem('bioquest_billion_v3', JSON.stringify(data));
      } catch(e) {}
    }, 300);
  }

  function loadPersistedState() {
    try {
      var raw = localStorage.getItem('bioquest_billion_v3');
      if (!raw) return;
      var data = JSON.parse(raw);
      if (data.totalAnswered !== undefined) state.totalAnswered = data.totalAnswered;
      if (data.totalCorrect !== undefined) state.totalCorrect = data.totalCorrect;
      if (data.totalSubQuestions !== undefined) state.totalSubQuestions = data.totalSubQuestions;
      if (data.answeredMap) state.answeredMap = data.answeredMap;
      if (data.submittedMap) state.submittedMap = data.submittedMap;
      if (data.favorites) state.favorites = data.favorites;
      if (data.feedback) state.feedback = data.feedback;
    } catch(e) {}
  }

  // ========== 键盘快捷键 ==========
  function handleKeyDown(e) {
    if (!pageEl || _destroyed) return;
    if (!wrapperEl || !document.body.contains(wrapperEl)) return;
    var activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) return;
    if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); scrollToNextCard(); }
    else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); scrollToPrevCard(); }
  }

  function getCurrentCardIndex() {
    if (!pageEl) return -1;
    var cards = pageEl.querySelectorAll('.db-card');
    if (cards.length === 0) return -1;
    var containerRect = pageEl.getBoundingClientRect();
    var threshold = containerRect.top + containerRect.height * 0.4;
    for (var i = 0; i < cards.length; i++) {
      var rect = cards[i].getBoundingClientRect();
      if (rect.top <= threshold && rect.bottom > containerRect.top + 50) {
        return i;
      }
    }
    return 0;
  }

  function scrollToNextCard() {
    if (!pageEl || _destroyed) return;
    var cards = pageEl.querySelectorAll('.db-card');
    if (cards.length === 0) return;
    var currentIdx = getCurrentCardIndex();
    var nextIdx = Math.min(currentIdx + 1, cards.length - 1);
    if (nextIdx !== currentIdx) cards[nextIdx].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function scrollToPrevCard() {
    if (!pageEl || _destroyed) return;
    var cards = pageEl.querySelectorAll('.db-card');
    if (cards.length === 0) return;
    var currentIdx = getCurrentCardIndex();
    var prevIdx = Math.max(currentIdx - 1, 0);
    if (prevIdx !== currentIdx) cards[prevIdx].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ========== 初始化 ==========
  async function initDailyBillionCore() {
    if (_destroyed) return;
    if (wrapperEl) { cleanupDom(); }
    loadPersistedState();

    wrapperEl = document.createElement('div');
    wrapperEl.id = 'dbWrapper';
    wrapperEl.style.cssText = 'position:fixed;inset:0;z-index:10001;';
    document.body.appendChild(wrapperEl);

    if (targetEl) { targetEl.innerHTML = ''; }

    pageEl = document.createElement('div');
    pageEl.className = 'db-page';
    pageEl.id = 'dbPageScroll';
    wrapperEl.appendChild(pageEl);

    renderTopBar();
    setupGlobalDelegation();
    pageEl.innerHTML = renderLoadingCard();

    await loadQuestions(3);
    if (_destroyed) return;
    renderPage();

    if (state.questions.length > 0) {
      var firstUnsubmittedIdx = -1;
      for (var i = 0; i < state.questions.length; i++) {
        if (!state.submittedMap[state.questions[i].id]) { firstUnsubmittedIdx = i; break; }
      }
      if (firstUnsubmittedIdx > 0) {
        setTimeout(function() {
          var card = pageEl.querySelector('.db-card[data-index="' + firstUnsubmittedIdx + '"]');
          if (card) card.scrollIntoView({ behavior: 'instant' });
        }, 100);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    pageEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    pageEl.addEventListener('touchend', handleTouchEnd, { passive: true });
  }

  // ========== 公开接口 ==========
  function init(target) {
    targetEl = target;
    _destroyed = false;
    if (wrapperEl) { saveState(); cleanupDom(); }
    initDailyBillionCore();
  }

  function destroy() {
    _destroyed = true;
    try {
      var data = {
        totalAnswered: state.totalAnswered,
        totalCorrect: state.totalCorrect,
        totalSubQuestions: state.totalSubQuestions,
        answeredMap: state.answeredMap,
        submittedMap: state.submittedMap,
        favorites: state.favorites,
        feedback: state.feedback
      };
      localStorage.setItem('bioquest_billion_v3', JSON.stringify(data));
    } catch(e) {}
    cleanupDom();
    if (targetEl) { targetEl.innerHTML = ''; targetEl.style.cssText = ''; }
    targetEl = null;
    _sbClient = null;
  }

  window.initDailyBillion = function(target) { init(target); };
  window.destroyDailyBillion = function() { if (wrapperEl) { saveState(); destroy(); } };

})();