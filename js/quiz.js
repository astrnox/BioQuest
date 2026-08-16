'use strict';

let QData = [];         // 基础知识题库
let logicData = [];     // 逻辑推理题库
let currentPaper = [];
let currentPaperTitle = '';
let userAnswers = {};
let submitted = false;
let dataLoaded = false;
let logicLoaded = false;
let selectedCategory = 'basic'; // 'basic' | 'logic' | 'mixed'

const SCORE_SINGLE = 3;
const SCORE_MULTIPLE_FULL = 5;
const SCORE_MULTIPLE_PARTIAL = 2;
const SCORE_JUDGE = 3;
const COUNT_SINGLE = 20;
const COUNT_MULTIPLE = 5;
const COUNT_JUDGE = 5;
const COUNT_LOGIC = 15; // 逻辑推理模式题目数

// HTML 转义 — 统一使用 window.escapeHtml（Q-01，规范实现在 js/utils.js）
var escapeHtml = (typeof window !== 'undefined' && typeof window.escapeHtml === 'function')
  ? window.escapeHtml
  : function(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    };

async function loadQuizData() {
  const btn = document.getElementById('quizCrawlBtn');
  const label = document.getElementById('quizLabel');

  // 如果数据已加载，直接使用缓存
  if (dataLoaded) {
    if (btn) btn.disabled = false;
    if (label) updateCategoryLabel();
    return;
  }

  if (btn) btn.disabled = true;
  if (label) label.textContent = '加载题库中...';

  try {
    // 并行加载两个题库
    const [res, logicRes] = await Promise.all([
      fetch('data/quiz.json'),
      fetch('data/logic_questions.json').catch(function() { return null; })
    ]);

    const qData = await res.json();
    // P0-4: 隔离过滤 → 超长知识讲义过滤 → 清洗（600字选项删；300字+截断；总分4000+删）
    var rawQ = (typeof window._filterQuarantinedQuestions === 'function')
      ? window._filterQuarantinedQuestions(qData.题库 || [])
      : (qData.题库 || []);
    QData = (typeof window.filterQuestionList === 'function')
      ? window.filterQuestionList(rawQ)
      : rawQ;
    dataLoaded = true;

    // 并行加载逻辑题库
    if (logicRes && logicRes.ok) {
      var _logicRaw = await logicRes.json();
      var logicFiltered = (typeof window._filterQuarantinedQuestions === 'function')
        ? window._filterQuarantinedQuestions(_logicRaw)
        : _logicRaw;
      logicData = (typeof window.filterQuestionList === 'function')
        ? window.filterQuestionList(logicFiltered)
        : logicFiltered;
      logicLoaded = true;
    }

    if (label) {
      const singles = QData.filter(q => q.type === 'single' || !q.type).length;
      const multiples = QData.filter(q => q.type === 'multiple').length;
      const judges = QData.filter(q => q.type === 'judge').length;
      label.textContent = `已加载 ${QData.length} 道基础知识题目（单选${singles} 多选${multiples} 判断${judges}）`;
    }
    if (btn) btn.disabled = false;

    updateCategoryLabel();
  } catch (err) {
    console.error('加载题目数据失败', err);
    QData = [];
    if (label) label.textContent = '加载失败，请刷新重试';
    if (btn) btn.disabled = false;
  }
}

function updateCategoryLabel() {
  const label = document.getElementById('quizLabel');
  if (!label) return;

  const basicCount = QData.length;
  const logicCount = logicData.length;

  if (selectedCategory === 'basic') {
    label.textContent = `基础知识模式（${basicCount}题可用）`;
  } else if (selectedCategory === 'logic') {
    label.textContent = `逻辑推理模式（${logicCount}题可用）`;
  } else {
    label.textContent = `混合模式（基础${basicCount} + 推理${logicCount}题）`;
  }
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateNewPaper() {
  if (selectedCategory === 'logic') {
    generateLogicPaper();
  } else if (selectedCategory === 'mixed') {
    generateMixedPaper();
  } else {
    generateBasicPaper();
  }
}

/**
 * Issue #10：解析题目稳定 bioID（与 practice.js getQuestionBioId 同一算法）。
 * 优先级：q.bioId > q.id（分片题库加载时已注入）> 旧 hash 复算并映射。
 * 保证本地收藏/错题引用稳定，刷新、题库增删后不漂移。
 */
function getQuestionBioId(q) {
  if (!q) return '';
  // 自愈：若 bioID 映射表尚未加载，触发后台加载（不阻塞返回）
  if (!window.bioIdMap && typeof window.loadBioIdMap === 'function') {
    try { window.loadBioIdMap(); } catch (e) {}
  }
  var raw = q.bioId || q.id;
  if (raw === undefined || raw === null || raw === '') {
    // 旧 ID 复算（自包含，避免依赖 storage.js；算法与 generate-bio-shards.js 一致）
    var hashFn = (typeof window.hashQuestionId === 'function')
      ? window.hashQuestionId
      : function (str) {
          var h = 0;
          for (var i = 0; i < str.length; i++) {
            h = ((h << 5) - h) + str.charCodeAt(i);
            h = h & h;
          }
          return Math.abs(h);
        };
    raw = String(hashFn((q.question || '') + (q.concept || '')));
  }
  if (typeof window.resolveQuestionBioId === 'function') {
    return String(window.resolveQuestionBioId(raw));
  }
  return String(raw);
}

// 暴露到 window：浏览器经典脚本下本就为全局，显式暴露使 jsdom/单测能调用真实实现
window.getQuestionBioId = getQuestionBioId;

function generateBasicPaper() {
  if (!dataLoaded || QData.length === 0) {
    alert('基础知识题库加载中，请稍候...');
    return;
  }

  const singles = shuffle(QData.filter(q => q.type === 'single' || !q.type));
  const multiples = shuffle(QData.filter(q => q.type === 'multiple'));
  const judges = shuffle(QData.filter(q => q.type === 'judge'));

  const pickedSingles = singles.slice(0, Math.min(COUNT_SINGLE, singles.length));
  const pickedMultiples = multiples.slice(0, Math.min(COUNT_MULTIPLE, multiples.length));
  const pickedJudges = judges.slice(0, Math.min(COUNT_JUDGE, judges.length));

  if (pickedSingles.length + pickedMultiples.length + pickedJudges.length < 5) {
    alert('基础知识题库不足，请补充题库。');
    return;
  }

  currentPaper = shuffle([...pickedSingles, ...pickedMultiples, ...pickedJudges]);
  // 标记题目类别
  currentPaper.forEach(q => { if (!q.category) q.category = 'basic'; });
  startPaper('基础知识模拟试卷');
}

function generateLogicPaper() {
  if (!logicLoaded || logicData.length === 0) {
    alert('逻辑推理题库加载中，请稍候...');
    return;
  }

  const picked = shuffle(logicData).slice(0, Math.min(COUNT_LOGIC, logicData.length));

  if (picked.length < 3) {
    alert('逻辑推理题库不足，请补充题库。');
    return;
  }

  currentPaper = picked;
  startPaper('逻辑推理专项训练');
}

function generateMixedPaper() {
  if ((!dataLoaded || QData.length === 0) && (!logicLoaded || logicData.length === 0)) {
    alert('题库加载中，请稍候...');
    return;
  }

  // 基础知识题：单选10 + 多选3 + 判断3 = 16题
  const singles = shuffle(QData.filter(q => q.type === 'single' || !q.type));
  const multiples = shuffle(QData.filter(q => q.type === 'multiple'));
  const judges = shuffle(QData.filter(q => q.type === 'judge'));

  const pickedSingles = singles.slice(0, Math.min(10, singles.length));
  const pickedMultiples = multiples.slice(0, Math.min(3, multiples.length));
  const pickedJudges = judges.slice(0, Math.min(3, judges.length));

  // 逻辑推理题：10题
  const pickedLogic = shuffle(logicData).slice(0, Math.min(10, logicData.length));

  const basicQuestions = [...pickedSingles, ...pickedMultiples, ...pickedJudges];
  basicQuestions.forEach(q => { if (!q.category) q.category = 'basic'; });
  pickedLogic.forEach(q => { q.category = 'logic'; });

  currentPaper = shuffle([...basicQuestions, ...pickedLogic]);

  if (currentPaper.length < 5) {
    alert('题库不足，请补充题库。');
    return;
  }

  startPaper('综合模拟试卷');
}

function startPaper(title) {
  userAnswers = {};
  submitted = false;

  // 保存试卷标题供 renderPaper 使用
  currentPaperTitle = title;

  document.getElementById('quizEmpty').style.display = 'none';
  const paperEl = document.getElementById('quizPaper');
  paperEl.style.display = 'block';

  renderPaper();

  const label = document.getElementById('quizLabel');
  if (label) label.textContent = '进行中';
}

function getTypeLabel(type) {
  if (type === 'multiple') return '多选题';
  if (type === 'judge') return '判断题';
  return '单选题';
}

function getTypeScore(type) {
  if (type === 'multiple') return SCORE_MULTIPLE_FULL;
  if (type === 'judge') return SCORE_JUDGE;
  return SCORE_SINGLE;
}

function getOptionLabels(type) {
  if (type === 'judge') return ['正确', '错误'];
  return ['A', 'B', 'C', 'D', 'E'];
}

function getCategoryLabel(category) {
  if (category === 'logic') return '逻辑推理';
  return '基础知识';
}

function renderPaper() {
  const paperEl = document.getElementById('quizPaper');
  const answeredCount = Object.keys(userAnswers).filter(k => {
    const ans = userAnswers[k];
    if (Array.isArray(ans)) return ans.length > 0;
    return ans !== undefined && ans !== null;
  }).length;

  const totalQuestions = currentPaper.length;
  const paperTitle = currentPaperTitle || '生物竞赛模拟试卷';

  // 动态计算总分
  let totalScore = 0;
  currentPaper.forEach(q => { totalScore += getTypeScore(q.type || 'single'); });

  let html = `
    <div class="paper-header">
      <div>
        <div class="paper-title">${paperTitle}</div>
        <div class="paper-meta">卷号：${Date.now().toString().slice(-6)} · 共 ${totalQuestions} 题 · 满分 ${totalScore} 分</div>
      </div>
      <div class="paper-info">
        <div class="paper-info-item">
          <div class="paper-info-num">${answeredCount}</div>
          <div class="paper-info-label">已答</div>
        </div>
        <div class="paper-info-item">
          <div class="paper-info-num">${totalQuestions}</div>
          <div class="paper-info-label">总题</div>
        </div>
      </div>
    </div>

    <div class="paper-questions">
  `;

  currentPaper.forEach((q, i) => {
    const qType = q.type || 'single';
    const typeLabel = getTypeLabel(qType);
    const score = getTypeScore(qType);
    const optionLabels = getOptionLabels(qType);
    const options = q.options;
    const isMultiple = qType === 'multiple';
    const isJudge = qType === 'judge';
    const inputType = isMultiple ? 'checkbox' : 'radio';
    const inputName = 'q-' + i;
    const categoryLabel = getCategoryLabel(q.category);

    html += `
      <div class="paper-question" id="pq-${i}">
        <div class="pq-meta">
          第 ${i + 1} 题
          <span class="pq-type-tag pq-type-${qType}">【${typeLabel}】</span>
          <span class="pq-score-badge">${score}分</span>
          ${q.category === 'logic' ? '<span class="pq-type-tag pq-type-logic">【逻辑推理】</span>' : ''}
          ${q.subject ? `<span class="pq-subject-tag">${q.subject}</span>` : ''}
        </div>
        <div class="pq-text">${escapeHtml(q.question).replace(/\n/g, '<br>')}</div>
        ${isMultiple ? '<div class="pq-multi-hint">此题为多选题，请选择所有正确答案</div>' : ''}
        <div class="pq-options">
    `;

    options.forEach((opt, j) => {
      const userAns = userAnswers[i];
      let isSelected = false;

      if (isMultiple) {
        isSelected = Array.isArray(userAns) && userAns.includes(j);
      } else {
        isSelected = userAns === j;
      }

      const isCorrectAnswer = isMultiple
        ? (Array.isArray(q.answer) ? q.answer.includes(j) : q.answer === j)
        : q.answer === j;

      let optionClasses = 'pq-option';
      if (isMultiple) optionClasses += ' pq-option-checkbox';
      if (isSelected && !submitted) optionClasses += ' selected';
      if (submitted && isCorrectAnswer) optionClasses += ' correct-ans';
      if (submitted && isSelected && !isCorrectAnswer) optionClasses += ' wrong-ans';

      const checkedAttr = isSelected ? ' checked' : '';
      const disabledAttr = submitted ? ' disabled' : '';

      html += `
        <label class="${optionClasses}" for="opt-${i}-${j}">
          <input type="${inputType}" name="${inputName}" value="${j}" id="opt-${i}-${j}"
            class="pq-native-input"${checkedAttr}${disabledAttr}>
          <div class="pq-marker">${optionLabels[j]}</div>
          <span>${escapeHtml(opt)}</span>
        </label>
      `;
    });

    html += `</div>`;

    if (submitted) {
      const scoreResult = getSingleQuestionScore(q, i);
      const isCorrect = scoreResult === 'full';
      const isPartial = scoreResult === 'partial';

      let resultHtml = '';
      if (isCorrect) {
        resultHtml = '正确！';
      } else if (isPartial) {
        resultHtml = '△ 部分正确！（得2分）';
      } else {
        const correctAnswerDisplay = isMultiple
          ? (Array.isArray(q.answer) ? q.answer.map(a => optionLabels[a]).join('、') : optionLabels[q.answer])
          : optionLabels[q.answer];
        resultHtml = `错误！正确答案是 ${correctAnswerDisplay}`;
      }

      // v4.0 题-图-卡-错四向联动：错题展示"查看知识图谱"+"加入错题本"按钮
      var linkageBtns = '';
      if (!isCorrect) {
        var conceptLabel = q.subject || q.category || '';
        linkageBtns = '<div class="pq-linkage" style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">' +
          '<button type="button" class="btn btn-secondary btn-sm pq-linkage-btn" data-action="kg" data-concept="' + escapeHtml(conceptLabel) + '">🗺️ 查看知识图谱</button>' +
          '<button type="button" class="btn btn-secondary btn-sm pq-linkage-btn" data-action="wrongbook" data-qidx="' + i + '">📒 加入错题本</button>' +
          '<button type="button" class="btn btn-secondary btn-sm pq-linkage-btn" data-action="card" data-concept="' + escapeHtml(conceptLabel) + '">🃏 生成卡片</button>' +
          '</div>';
      }

      html += `
        <div class="pq-exp show ${isCorrect ? 'correct' : (isPartial ? 'partial' : 'wrong')}" id="pqe-${i}">
          ${resultHtml}
          ${q.explanation ? `<div style="margin-top:8px;font-size:0.85rem;line-height:1.6;">${escapeHtml(q.explanation)}</div>` : ''}
          ${linkageBtns}
        </div>
      `;
    }

    html += `</div>`;
  });

  const scoreData = calculateScore();

  html += `
    </div>

    <div class="paper-footer">
      <div class="paper-score ${submitted ? 'show' : ''}" id="paperScore">
        ${submitted ? `
          <div class="score-breakdown">
            <div class="score-breakdown-title">成绩明细</div>
            ${scoreData.basicTotal > 0 ? `<div class="score-breakdown-row"><span>基础知识</span><span>${scoreData.basicTotal} 分</span></div>` : ''}
            ${scoreData.logicTotal > 0 ? `<div class="score-breakdown-row"><span>逻辑推理</span><span>${scoreData.logicTotal} 分</span></div>` : ''}
            <div class="score-breakdown-row">
              <span>单选题</span>
              <span>${scoreData.single} / ${scoreData.maxSingle} 分</span>
            </div>
            <div class="score-breakdown-row">
              <span>多选题</span>
              <span>${scoreData.multiple} / ${scoreData.maxMultiple} 分</span>
            </div>
            <div class="score-breakdown-row">
              <span>判断题</span>
              <span>${scoreData.judge} / ${scoreData.maxJudge} 分</span>
            </div>
            <div class="score-breakdown-row score-breakdown-total">
              <span>总分</span>
              <span>${scoreData.total} / ${scoreData.maxTotal} 分</span>
            </div>
          </div>
        ` : ''}
      </div>
      <div style="display:flex;gap:12px;">
        ${!submitted ? `
          <button class="btn btn-secondary btn-sm" id="regenerateBtn">重新组卷</button>
          <button class="btn btn-success" id="submitBtn">提交试卷</button>
        ` : `
          <button class="btn btn-primary btn-sm" id="regenerateBtn">再来一套</button>
        `}
      </div>
    </div>
  `;

  paperEl.innerHTML = html;

  paperEl.querySelectorAll('.pq-native-input').forEach(input => {
    input.addEventListener('change', function () {
      if (submitted) return;
      const qId = parseInt(this.name.split('-')[1]);
      const optIdx = parseInt(this.value);
      selectAnswer(qId, optIdx);
    });
  });

  // v4.0 四向联动按钮事件
  paperEl.querySelectorAll('.pq-linkage-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      var action = this.getAttribute('data-action');
      var concept = this.getAttribute('data-concept') || '';
      var qidx = this.getAttribute('data-qidx');
      if (action === 'kg') {
        // 跳转到知识图谱，并通过 sessionStorage 传递概念
        try { sessionStorage.setItem('bioquest_kg_focus', concept); } catch (e) {}
        if (typeof navigateTo === 'function') navigateTo('/knowledge-graph');
      } else if (action === 'wrongbook') {
        var q = currentPaper[parseInt(qidx)];
        if (q) {
          // Issue #10：统一使用题目稳定 bioID，避免云端/本地错题引用漂移
          var qBio = getQuestionBioId(q);
          if (typeof window.addWrongQuestion === 'function') {
            // supabase-client 云端版签名 addWrongQuestion(question)：
            // 把 bioID 挂到 question_id，使 review_cards 引用与题库一致
            window.addWrongQuestion(Object.assign({}, q, { question_id: qBio }));
            this.textContent = '✓ 已加入';
            this.disabled = true;
          } else {
            // 兜底：直接写入 localStorage（同样以稳定 bioID 为 id，key 与 storage.js KEYS.WRONG_QUESTIONS 一致）
            try {
              var arr = JSON.parse(localStorage.getItem('bioquest_wrong_questions') || '[]');
              arr.push({ qId: qBio, questionText: q.question, subject: q.subject, timestamp: Date.now(), wrongCount: 1 });
              localStorage.setItem('bioquest_wrong_questions', JSON.stringify(arr.slice(-200)));
              this.textContent = '✓ 已加入';
              this.disabled = true;
            } catch (e) {}
          }
        }
      } else if (action === 'card') {
        // 跳转到卡片页，并通过 sessionStorage 传递概念
        try { sessionStorage.setItem('bioquest_card_focus', concept); } catch (e) {}
        if (typeof navigateTo === 'function') navigateTo('/cards');
      }
    });
  });

  const regenerateBtn = document.getElementById('regenerateBtn');
  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', () => {
      generateNewPaper();
    });
  }

  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', submitPaper);
  }

  const label = document.getElementById('quizLabel');
  if (label) label.textContent = submitted ? '已完成' : '进行中';
}

function selectAnswer(qIdx, optIdx) {
  if (submitted) return;
  const q = currentPaper[qIdx];
  const qType = q.type || 'single';

  if (qType === 'multiple') {
    if (!Array.isArray(userAnswers[qIdx])) {
      userAnswers[qIdx] = [];
    }
    const idx = userAnswers[qIdx].indexOf(optIdx);
    if (idx > -1) {
      userAnswers[qIdx].splice(idx, 1);
    } else {
      userAnswers[qIdx].push(optIdx);
    }
  } else {
    userAnswers[qIdx] = optIdx;
  }

  renderPaper();
}

function getSingleQuestionScore(q, i) {
  const qType = q.type || 'single';
  const userAns = userAnswers[i];

  if (qType === 'single' || qType === 'judge') {
    return userAns === q.answer ? 'full' : 'none';
  }

  if (qType === 'multiple') {
    if (!Array.isArray(userAns) || userAns.length === 0) return 'none';

    const correctAns = Array.isArray(q.answer) ? q.answer : [q.answer];
    const userSet = new Set(userAns);
    const correctSet = new Set(correctAns);

    const allCorrect = userSet.size === correctSet.size &&
      [...userSet].every(v => correctSet.has(v));
    if (allCorrect) return 'full';

    const hasAnyCorrect = [...userSet].some(v => correctSet.has(v));
    const hasAnyWrong = [...userSet].some(v => !correctSet.has(v));

    if (hasAnyCorrect && !hasAnyWrong) return 'partial';

    return 'none';
  }

  return 'none';
}

function calculateScore() {
  let singleScore = 0;
  let multipleScore = 0;
  let judgeScore = 0;
  let basicTotal = 0;
  let logicTotal = 0;
  let maxSingle = 0;
  let maxMultiple = 0;
  let maxJudge = 0;

  currentPaper.forEach((q, i) => {
    const qType = q.type || 'single';
    const result = getSingleQuestionScore(q, i);
    const score = getTypeScore(qType);
    const isLogic = q.category === 'logic';

    if (qType === 'single') {
      maxSingle += score;
      if (result === 'full') {
        singleScore += score;
        if (isLogic) logicTotal += score; else basicTotal += score;
      }
    } else if (qType === 'multiple') {
      maxMultiple += SCORE_MULTIPLE_FULL;
      if (result === 'full') {
        multipleScore += SCORE_MULTIPLE_FULL;
        if (isLogic) logicTotal += SCORE_MULTIPLE_FULL; else basicTotal += SCORE_MULTIPLE_FULL;
      } else if (result === 'partial') {
        multipleScore += SCORE_MULTIPLE_PARTIAL;
        if (isLogic) logicTotal += SCORE_MULTIPLE_PARTIAL; else basicTotal += SCORE_MULTIPLE_PARTIAL;
      }
    } else if (qType === 'judge') {
      maxJudge += score;
      if (result === 'full') {
        judgeScore += score;
        if (isLogic) logicTotal += score; else basicTotal += score;
      }
    }
  });

  return {
    single: singleScore,
    multiple: multipleScore,
    judge: judgeScore,
    total: singleScore + multipleScore + judgeScore,
    maxSingle,
    maxMultiple,
    maxJudge,
    maxTotal: maxSingle + maxMultiple + maxJudge,
    basicTotal,
    logicTotal
  };
}

function submitPaper() {
  submitted = true;
  // v4.0 苏格拉底同学触发：上报每题对错（用于共情模式检测）
  if (typeof window.BioQuestClassmate === 'object' && window.BioQuestClassmate) {
    try {
      currentPaper.forEach(function (q, i) {
        var result = getSingleQuestionScore(q, i);
        if (result === 'full') {
          if (typeof window.BioQuestClassmate.onCorrectAnswer === 'function') {
            window.BioQuestClassmate.onCorrectAnswer();
          }
        } else {
          if (typeof window.BioQuestClassmate.onWrongAnswer === 'function') {
            window.BioQuestClassmate.onWrongAnswer({
              question: q.question || '',
              concept: q.subject || '',
              subject: q.subject || '',
              source: 'quiz'
            });
          }
        }
      });
    } catch (e) { /* 静默失败 */ }
  }
  renderPaper();
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadQuizData();

  // Issue #10：确保 bioID 映射表已加载（本页未预加载分片，需手动触发）。
  // 使错题本/收藏里的旧 hash ID 能解析为稳定 bioID（data/bioid-map.json 体积小、毫秒级加载）。
  if (typeof window.loadBioIdMap === 'function' && !window.bioIdMap) {
    try { window.loadBioIdMap(); } catch (e) {}
  }

  const btn = document.getElementById('quizCrawlBtn');
  if (btn) {
    btn.addEventListener('click', generateNewPaper);
  }

  // 绑定类别选择按钮
  document.querySelectorAll('.quiz-category-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.quiz-category-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      selectedCategory = this.dataset.category;
      updateCategoryLabel();
    });
  });
});
