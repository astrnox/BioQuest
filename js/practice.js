/**
 * ============================================================
 * BioQuest — 练习模式模块
 * 支持 MTF（多重判断）题型的专项练习，含筛选、答题、计分、
 * 收藏、错题管理和数据持久化
 * ============================================================
 */

'use strict';

const PracticeModuleGroups = [
  {
    id: 'module1',
    label: '模块一',
    subjects: ['生物化学', '分子生物学', '细胞生物学']
  },
  {
    id: 'module2',
    label: '模块二',
    subjects: ['植物学', '植物生理学', '微生物学']
  },
  {
    id: 'module3',
    label: '模块三',
    subjects: ['动物学', '动物生理学', '生态学']
  },
  {
    id: 'module4',
    label: '模块四',
    subjects: ['遗传学', '进化生物学', '演化生物学', '生物信息学', '群体遗传学']
  }
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: '基础' },
  { value: 'medium', label: '进阶' },
  { value: 'hard', label: '挑战' }
];

const TARGET_OPTIONS = [
  { value: 'high_school', label: '高考' },
  { value: 'competition', label: '竞赛' },
  { value: 'both', label: '共通' }
];

const QUESTION_COUNT_OPTIONS = [5, 10, 20, 50];

const PracticeState = {
  allQuestions: [],
  logicData: [],           // 逻辑推理题库
  logicLoaded: false,      // 逻辑推理题是否已加载
  filteredQuestions: [],
  currentSet: [],
  currentIndex: 0,
  userAnswers: {},
  submitted: false,
  favorites: new Set(),
  wrongMarked: new Set(),
  totalScore: 0,
  totalAnswered: 0,
  moduleStats: {},
  startTime: 0,
  started: false,
  selectedModules: ['module1', 'module2', 'module3', 'module4'],
  selectedDifficulties: ['easy', 'medium', 'hard'],
  selectedCategory: 'all',  // 'all' | 'basic' | 'logic'
  selectedTargets: ['high_school', 'competition', 'both'], // 目标群体：高考/竞赛/重叠
  questionCount: 10,
  redoMode: false,
  conceptFilter: null,      // 来自知识图谱的专项概念过滤
  kgSource: null,           // 知识图谱来源信息
  kgCategory: null          // 知识图谱来源的学科分类（如"植物学"），用于精确过滤
};

let practiceStylesInjected = false;

// ===== 时间/间隔常量 =====
var PRACTICE_SYNC_DEBOUNCE_MS = 300;     // 分数同步防抖时间
var PRACTICE_PANEL_FADE_MS = 250;         // 筛选面板淡出延迟（重渲染前等待过渡完成）
var PRACTICE_PULL_TICK_MS = 1000;         // 拉取冷却倒计时刷新间隔
var PRACTICE_LAST_Q_BANNER_MS = 1200;     // 最后一题横幅展示时长

// ===== 实时分数同步机制 =====
var SYNC_INTERVAL = 5; // 每答几题同步一次（可配置）
var _syncAnswerCounter = 0;
var _syncDebounceTimer = null;
var _syncPending = false;

/**
 * 将最新分数同步到服务器（带防抖，避免频繁调用）
 * @param {Object} scoreData - { bio_score, total_answered, total_correct, accuracy, practice_count }
 */
function syncScoreToServer(scoreData) {
  if (!scoreData) return;
  _syncPending = true;

  // 防抖：300ms 内多次调用只执行最后一次
  if (_syncDebounceTimer) clearTimeout(_syncDebounceTimer);
  _syncDebounceTimer = setTimeout(function() {
    _syncDebounceTimer = null;
    if (!_syncPending) return;
    _syncPending = false;

    // 优先使用 Supabase 直连同步
    if (typeof window.updateBioScore === 'function' && typeof window.getSupabase === 'function' && window.getSupabase()) {
      window.updateBioScore(scoreData.bio_score || 0, {
        practice_count: scoreData.practice_count || 0,
        total_answered: scoreData.total_answered || 0,
        total_correct: scoreData.total_correct || 0,
        accuracy: scoreData.accuracy || 0
      }).catch(function() {});
    }
  }, PRACTICE_SYNC_DEBOUNCE_MS);
}

/**
 * 检查是否需要触发同步（每 SYNC_INTERVAL 题触发一次）
 * 应在每次提交答案后调用
 */
function checkAndSyncScore() {
  _syncAnswerCounter++;
  if (_syncAnswerCounter >= SYNC_INTERVAL) {
    _syncAnswerCounter = 0;
    try {
      var stats = typeof getStats === 'function' ? getStats() : null;
      if (stats && typeof calcBioScore === 'function') {
        var bioResult = calcBioScore(stats);
        syncScoreToServer({
          bio_score: bioResult.score,
          total_answered: stats.totalAnswered || 0,
          total_correct: stats.totalCorrect || 0,
          accuracy: stats.accuracy || 0,
          practice_count: stats.totalAnswered || 0
        });
      }
    } catch(e) {}
  }
}

/** 重置同步计数器（新会话开始时调用） */
function resetSyncCounter() {
  _syncAnswerCounter = 0;
  _syncPending = false;
  if (_syncDebounceTimer) { clearTimeout(_syncDebounceTimer); _syncDebounceTimer = null; }
}

function injectPracticeStyles() {
  if (practiceStylesInjected) return;
  practiceStylesInjected = true;

  const style = document.createElement('style');
  style.id = 'bioquest-practice-styles';
  style.textContent = `
    .practice-answer-correct {
      animation: practiceCorrectPulse 0.5s ease;
    }

    @keyframes practiceCorrectPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(58, 140, 92, 0.3); }
      50% { box-shadow: 0 0 0 8px rgba(58, 140, 92, 0); }
    }

    .practice-answer-wrong {
      animation: practiceWrongShake 0.4s ease;
    }

    @keyframes practiceWrongShake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
      20%, 40%, 60%, 80% { transform: translateX(4px); }
    }

    .practice-fade-in {
      animation: practiceFadeSlide 0.35s ease forwards;
    }

    @keyframes practiceFadeSlide {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* 类别选择器 */
    .practice-category-selector {
      display: flex;
      gap: 6px;
      background: var(--surface-secondary, #f5f3ef);
      border-radius: 10px;
      padding: 4px;
    }

    .practice-category-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      background: transparent;
      color: var(--text-secondary, #666);
    }

    .practice-category-btn:hover {
      background: rgba(90, 125, 92, 0.1);
      color: var(--color-sage, #5a7d5c);
    }

    .practice-category-btn.active {
      background: var(--color-sage, #5a7d5c);
      color: #fff;
      box-shadow: 0 2px 8px rgba(90, 125, 92, 0.3);
    }

    /* 练习模式按钮 */
    .practice-mode-selector {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .practice-mode-btn {
      padding: 8px 18px;
      border: 1.5px solid var(--border-default, #e0dcd5);
      border-radius: 10px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      background: var(--surface-primary, #ffffff);
      color: var(--text-secondary, #4a4a4a);
    }
    .practice-mode-btn:hover {
      border-color: var(--color-sage, #5a7d5c);
      color: var(--color-sage, #5a7d5c);
    }
    .practice-mode-btn.active {
      background: var(--color-sage, #5a7d5c);
      border-color: var(--color-sage, #5a7d5c);
      color: #fff;
      box-shadow: 0 2px 8px rgba(90, 125, 92, 0.3);
    }
    .practice-mode-btn[data-mode="gaokao"].active {
      background: #3a7d5c;
      border-color: #3a7d5c;
      box-shadow: 0 2px 8px rgba(58, 125, 92, 0.3);
    }
    .practice-mode-btn[data-mode="competition"].active {
      background: #5a5a9c;
      border-color: #5a5a9c;
      box-shadow: 0 2px 8px rgba(90, 90, 156, 0.3);
    }

    /* 逻辑推理题选项样式 */
    .practice-logic-option {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
      border: 1.5px solid var(--border, #e0e0e0);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 8px;
    }

    .practice-logic-option:hover {
      border-color: var(--color-sage, #5a7d5c);
      background: rgba(90, 125, 92, 0.04);
    }

    .practice-logic-selected {
      border-color: var(--color-sage, #5a7d5c);
      background: rgba(90, 125, 92, 0.08);
    }

    .practice-logic-correct {
      border-color: var(--success-green, #3a8c5c);
      background: rgba(58, 140, 92, 0.08);
    }

    .practice-logic-wrong {
      border-color: var(--terracotta, #c0553a);
      background: rgba(192, 85, 58, 0.08);
    }

    .practice-logic-marker {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 2px solid var(--border, #e0e0e0);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      flex-shrink: 0;
      transition: all 0.2s;
    }

    .practice-logic-selected .practice-logic-marker {
      border-color: var(--color-sage, #5a7d5c);
      background: var(--color-sage, #5a7d5c);
      color: #fff;
    }

    .practice-logic-correct .practice-logic-marker {
      border-color: var(--success-green, #3a8c5c);
      background: var(--success-green, #3a8c5c);
      color: #fff;
    }

    .practice-logic-wrong .practice-logic-marker {
      border-color: var(--terracotta, #c0553a);
      background: var(--terracotta, #c0553a);
      color: #fff;
    }

    .practice-logic-text {
      font-size: 0.938rem;
      line-height: 1.6;
      padding-top: 2px;
    }

    .practice-shortcut-hint {
      margin-top: 14px;
      padding: 10px 14px;
      border: 1px dashed var(--border-light, #ece8e1);
      border-radius: 10px;
      background: var(--surface-secondary, rgba(0,0,0,0.02));
      font-size: 0.78rem;
      color: var(--text-muted, #8a8a8a);
      display: flex;
      flex-wrap: wrap;
      gap: 6px 14px;
      align-items: center;
      line-height: 1.8;
    }
    .practice-shortcut-hint kbd {
      display: inline-block;
      min-width: 1.2em;
      padding: 1px 6px;
      border: 1px solid var(--border-light, #d8d4cc);
      border-bottom-width: 2px;
      border-radius: 5px;
      background: var(--surface-primary, #fff);
      color: var(--text-secondary, #555);
      font-family: var(--font-mono, ui-monospace, monospace);
      font-size: 0.74rem;
      line-height: 1.4;
      text-align: center;
      white-space: nowrap;
    }
    .practice-shortcut-hint .sh-sep {
      color: var(--border-light, #d0ccc4);
    }
    @media (max-width: 640px) {
      .practice-shortcut-hint {
        font-size: 0.72rem;
        gap: 4px 10px;
      }
    }
  `;

  document.head.appendChild(style);
}

function getModuleGroupBySubject(subject) {
  return PracticeModuleGroups.find((g) => g.subjects.includes(subject));
}

function getDifficultyLabel(difficulty) {
  // 支持数字难度（1-5）→ 5 级中文标签
  if (typeof difficulty === 'number') {
    if (difficulty === 1) return '简单';
    if (difficulty === 2) return '较易';
    if (difficulty === 3) return '中等';
    if (difficulty === 4) return '较难';
    if (difficulty >= 5) return '困难';
  }
  // 兼容字符串数字
  var num = parseInt(difficulty);
  if (!isNaN(num) && num >= 1 && num <= 5) {
    if (num === 1) return '简单';
    if (num === 2) return '较易';
    if (num === 3) return '中等';
    if (num === 4) return '较难';
    return '困难';
  }
  // 兼容服务器端 basic / league / national
  if (difficulty === 'basic' || difficulty === 'easy') return '简单';
  if (difficulty === 'league') return '中等';
  if (difficulty === 'national' || difficulty === 'hard' || difficulty === 'ibo') return '困难';
  if (difficulty === 'medium') return '中等';
  const opt = DIFFICULTY_OPTIONS.find((d) => d.value === difficulty);
  return opt ? opt.label : difficulty;
}

function getDifficultyClass(difficulty) {
  // 支持数字难度（1-5）
  if (typeof difficulty === 'number') {
    if (difficulty <= 1) return 'tag--success';
    if (difficulty === 2) return 'tag--success';
    if (difficulty === 3) return 'tag--warning';
    if (difficulty === 4) return 'tag--danger';
    return 'tag--danger';
  }
  var num = parseInt(difficulty);
  if (!isNaN(num) && num >= 1 && num <= 5) {
    if (num <= 2) return 'tag--success';
    if (num === 3) return 'tag--warning';
    return 'tag--danger';
  }
  if (difficulty === 'easy' || difficulty === 'basic') return 'tag--success';
  if (difficulty === 'medium' || difficulty === 'league') return 'tag--warning';
  if (difficulty === 'hard' || difficulty === 'national') return 'tag--danger';
  return 'tag--default';
}

/**
 * 筛选面板过渡动画
 * 先淡出再执行回调再淡入
 */
function animateFilterTransition(callback) {
  var panel = document.getElementById('practice-filter-panel');
  if (!panel) {
    callback();
    return;
  }
  panel.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
  panel.style.opacity = '0';
  panel.style.transform = 'translateY(8px)';
  setTimeout(function() {
    callback();
    // 回调后重新获取面板（因为 renderFilterPanel 会重建 DOM）
    var newPanel = document.getElementById('practice-filter-panel');
    if (newPanel) {
      newPanel.style.opacity = '0';
      newPanel.style.transform = 'translateY(8px)';
      // 强制重排以触发过渡
      void newPanel.offsetWidth;
      newPanel.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      newPanel.style.opacity = '1';
      newPanel.style.transform = 'translateY(0)';
    }
  }, PRACTICE_PANEL_FADE_MS);
}

async function loadPracticeQuestions() {
  try {
    var filterMods = PracticeState.selectedModules.length > 0
      ? PracticeState.selectedModules
      : null;

    var moduleMap = { module1: 1, module2: 2, module3: 3, module4: 4 };
    var modNums = filterMods ? filterMods.map(function (id) { return moduleMap[id]; }) : [1, 2, 3, 4];

    if (typeof window.loadQuestions === 'function') {
      var items = await window.loadQuestions(modNums, {
        onProgress: function (mod, count) {

        }
      });
      // 超长讲义过滤
      var itemsClean = (typeof window.filterQuestionList === 'function') ? window.filterQuestionList(items) : items;
      PracticeState.allQuestions = itemsClean.filter(
        function (q) { return Array.isArray(q.subQuestions) && q.subQuestions.length >= 4; }
      );
    } else {
      // 从 Supabase 直连获取
      try {
        var sb = typeof window.getSupabase === 'function' ? window.getSupabase() : null;
        if (sb) {
          var query = sb.from('questions').select('*').eq('type', 'mtf');
          // 模块过滤：module字段值为 module_1/module_2/module_3/module_4 格式
          if (modNums && modNums.length > 0 && modNums.length < 4) {
            var moduleFilters = [];
            for (var mi = 0; mi < modNums.length; mi++) {
              var mn = modNums[mi];
              moduleFilters.push('module_' + mn);
            }
            query = query.in('module', moduleFilters);
          }
          var { data: sbData, error: sbError } = await query;
          if (!sbError && sbData && sbData.length > 0) {
            var normed = sbData.map(function(q) {
              // 容错：sub_questions 可能是 JSON 字符串或数组
              var subQ = q.sub_questions || q.subQuestions || [];
              if (typeof subQ === 'string') {
                try { subQ = JSON.parse(subQ); } catch(e) { subQ = []; }
              }
              if (!Array.isArray(subQ)) subQ = [];
              // 标准化subQuestions格式：确保有label字段，兼容answer/is_true
              var labels = ['A', 'B', 'C', 'D', 'E', 'F'];
              var normSubQ = [];
              for (var si = 0; si < subQ.length; si++) {
                var sq = subQ[si] || {};
                var ans = false;
                if (sq.answer !== undefined) ans = !!sq.answer;
                else if (sq.is_true !== undefined) ans = !!sq.is_true;
                normSubQ.push({
                  label: sq.label || labels[si],
                  text: sq.text || '',
                  answer: ans
                });
              }
              return {
                id: q.id || null,
                type: q.type, question: q.question,
                subQuestions: normSubQ,
                explanation: q.explanation || '', subject: q.subject || '',
                concept: q.concept || '', difficulty: q.difficulty || 'medium',
                chart: q.chart || null, year: q.year || null
              };
            });
            // 超长讲义过滤（cleaned 同时会把 300+ 字的选项截断）
            var fn = typeof window.filterQuestionList === 'function' ? window.filterQuestionList : function(x){return x;};
            PracticeState.allQuestions = fn(normed).filter(
              function(q) { return Array.isArray(q.subQuestions) && q.subQuestions.length >= 4; }
            );
            return;
          }
        }
      } catch (e) {
        console.warn('[Practice] 从 Supabase 加载失败，回退本地 JSON:', e.message);
      }
      var res = await fetch('data/quiz.json');
      var data = await res.json();
      // P0-4: 应用隔离过滤 → 超长知识讲义过滤 → 筛选符合练习格式的题目
      var rawQuestions0 = (typeof window._filterQuarantinedQuestions === 'function')
        ? window._filterQuarantinedQuestions(data.题库 || [])
        : (data.题库 || []);
      var rawQuestions = (typeof window.filterQuestionList === 'function')
        ? window.filterQuestionList(rawQuestions0)
        : rawQuestions0;
      PracticeState.allQuestions = rawQuestions.filter(
        function (q) { return Array.isArray(q.subQuestions) && q.subQuestions.length >= 4; }
      );
    }
  } catch (err) {
    console.error('[BioQuest Practice] 加载题目数据失败:', err.message);
    PracticeState.allQuestions = [];
  }
}

/** 加载逻辑推理题库 */
async function loadLogicQuestions() {
  if (PracticeState.logicLoaded) return;
  try {
    const res = await fetch('data/logic_questions.json');
    if (res.ok) {
      var logicData = await res.json();
      // P0-4: 应用隔离过滤
      PracticeState.logicData = (typeof window._filterQuarantinedQuestions === 'function')
        ? window._filterQuarantinedQuestions(logicData)
        : logicData;
      PracticeState.logicLoaded = true;

      // 加载完成后刷新筛选结果
      applyFilters();
      updateAvailableCount();
    }
  } catch (e) {
    console.warn('[Practice] 逻辑推理题库加载失败', e);
  }
}

function applyFilters() {
  const activeSubjects = PracticeState.kgCategory
    ? [PracticeState.kgCategory]  // When from knowledge graph, only include the specific subject
    : PracticeModuleGroups
        .filter((g) => PracticeState.selectedModules.includes(g.id))
        .flatMap((g) => g.subjects);
  // 当所有模块都选中时，跳过 subject 过滤（包含未知/空 subject 的题目也保留）
  const allModulesSelected = PracticeState.selectedModules.length >= 4
    && PracticeModuleGroups.every((g) => PracticeState.selectedModules.includes(g.id));

  const conceptFilter = PracticeState.conceptFilter;

  // 将前端 easy/medium/hard 与服务器 basic/league/national 做统一映射
  const diffNormalize = function(d) {
    if (!d) return 'easy';
    if (typeof d === 'number') {
      if (d <= 2) return 'easy';
      if (d >= 4) return 'hard';
      return 'medium';
    }
    const s = String(d).toLowerCase();
    if (s === 'basic' || s === 'easy') return 'easy';
    if (s === 'league' || s === 'medium') return 'medium';
    if (s === 'national' || s === 'hard' || s === 'ibo') return 'hard';
    // 非标准值（如中文、未知字符串）→ 默认归为 medium，避免过滤丢失题目
    return 'medium';
  };
  const selectedDiffsNorm = PracticeState.selectedDifficulties.map(diffNormalize);
  // 当用户选了全部难度时，跳过难度过滤（避免归一化误差导致漏题）
  const allDiffsSelected = selectedDiffsNorm.length >= 3
    && selectedDiffsNorm.indexOf('easy') >= 0
    && selectedDiffsNorm.indexOf('medium') >= 0
    && selectedDiffsNorm.indexOf('hard') >= 0;

  // 目标群体：题目 target 需在已选目标中；题目没有 target 时按难度/特征推断
  const validTargets = PracticeState.selectedTargets.length > 0
    ? PracticeState.selectedTargets
    : ['high_school', 'competition', 'both'];
  // 当用户选了全部目标群体时，跳过 target 过滤（避免推断误差导致漏题）
  const allTargetsSelected = validTargets.length >= 3
    && validTargets.indexOf('high_school') >= 0
    && validTargets.indexOf('competition') >= 0
    && validTargets.indexOf('both') >= 0;

  // 根据题目信息推断目标（题目没有 target 字段时的回退策略）
  const inferTarget = function(q) {
    if (q.target) return q.target;
    const d = String(q.difficulty || '').toLowerCase();
    if (d === 'basic' || d === 'easy') return 'high_school';
    if (d === 'national' || d === 'league' || d === 'hard') return 'competition';
    return 'both';
  };

  // 基础知识题（MTF 格式）
  let basicQuestions = PracticeState.allQuestions.filter((q) => {
    const subjectMatch = allModulesSelected || activeSubjects.includes(q.subject);
    const qDiff = diffNormalize(q.difficulty);
    const diffMatch = allDiffsSelected || selectedDiffsNorm.includes(qDiff);
    const qTarget = inferTarget(q);
    const targetMatch = allTargetsSelected || validTargets.includes(qTarget);
    let conceptMatch = true;
    if (conceptFilter) {
      // Strict matching: exact concept field or tags
      const exactConcept = q.concept === conceptFilter;
      const inTags = q.tags && q.tags.indexOf(conceptFilter) >= 0;

      if (PracticeState.kgCategory) {
        // From knowledge graph: strict matching only (no loose inQuestion/inExplanation)
        conceptMatch = exactConcept || inTags;
      } else {
        // Regular filtering: allow loose matching
        const inQuestion = q.question && q.question.indexOf(conceptFilter) >= 0;
        const inExplanation = q.explanation && q.explanation.indexOf(conceptFilter) >= 0;
        conceptMatch = exactConcept || inTags || inQuestion || inExplanation;
      }
    }
    // 知识图谱来源时，进一步按学科分类精确筛选（避免大模块下的非专项内容）
    let kgCategoryMatch = true;
    if (PracticeState.kgCategory) {
      kgCategoryMatch = q.subject === PracticeState.kgCategory;
    }
    return subjectMatch && diffMatch && targetMatch && conceptMatch && kgCategoryMatch;
  });

  // 逻辑推理题（单选格式）
  let logicQuestions = [];
  if (PracticeState.selectedCategory === 'all' || PracticeState.selectedCategory === 'logic') {
    logicQuestions = PracticeState.logicData.filter((q) => {
      const subjectMatch = allModulesSelected || activeSubjects.includes(q.subject);
      const qDiff = diffNormalize(q.difficulty);
      const diffMatch = allDiffsSelected || selectedDiffsNorm.includes(qDiff);
      return subjectMatch && diffMatch;
    });
  }

  // 根据类别选择组合
  if (PracticeState.selectedCategory === 'basic') {
    PracticeState.filteredQuestions = basicQuestions;
  } else if (PracticeState.selectedCategory === 'logic') {
    PracticeState.filteredQuestions = logicQuestions;
  } else {
    PracticeState.filteredQuestions = [...basicQuestions, ...logicQuestions];
  }
}

function generateQuestionSet() {
  applyFilters();

  if (PracticeState.filteredQuestions.length === 0) {
    return [];
  }

  const count = Math.min(
    PracticeState.questionCount,
    PracticeState.filteredQuestions.length
  );

  const shuffled = shuffle([...PracticeState.filteredQuestions]);
  return shuffled.slice(0, count);
}

function initNewSession() {
  resetSyncCounter(); // 重置同步计数器
  PracticeState.currentSet = generateQuestionSet();
  PracticeState.currentIndex = 0;
  PracticeState.userAnswers = {};
  PracticeState._counted = {};
  PracticeState.submitted = false;
  PracticeState.wrongMarked = new Set();
  PracticeState.totalScore = 0;
  PracticeState.totalAnswered = 0;
  PracticeState.moduleStats = {};
  PracticeState.startTime = Date.now();
  PracticeState.started = true;
  PracticeState.redoMode = false;

  PracticeState.favorites = new Set(
    typeof getFavorites === 'function' ? getFavorites() : []
  );
}

function calculateQuestionScore(q, userAnswers) {
  // 标准单选题（题库格式：options 为对象 {A:..,B:..}, answer 为 'C'）
  if (q.options && typeof q.options === 'object' && !Array.isArray(q.options) && q.answer) {
    const userAns = userAnswers[0]; // 'A'/'B'/'C'/'D'
    const isCorrect = userAns === q.answer;
    return {
      correct: isCorrect ? 1 : 0,
      total: 1,
      score: isCorrect ? 2.0 : 0,
      details: [{
        label: '答案',
        userAnswer: userAns,
        correctAnswer: q.answer,
        isCorrect: isCorrect
      }]
    };
  }

  // 逻辑推理题（单选题格式：options 为数组, answer 为索引 0-4）
  if (q.category === 'logic' && Array.isArray(q.options)) {
    const userAns = userAnswers[0];
    const isCorrect = userAns === q.answer;
    return {
      correct: isCorrect ? 1 : 0,
      total: 1,
      score: isCorrect ? 2.0 : 0,
      details: [{
        label: '答案',
        userAnswer: userAns,
        correctAnswer: q.answer,
        isCorrect: isCorrect
      }]
    };
  }

  // MTF 题型（subQuestions 格式）
  const subQuestions = q.subQuestions || [];
  if (subQuestions.length === 0) return { correct: 0, total: 1, score: 0 };

  const total = subQuestions.length;
  let correct = 0;
  const details = [];

  subQuestions.forEach((sq, idx) => {
    const userAns = userAnswers[idx];
    const isCorrect = userAns === sq.answer;
    if (isCorrect) correct++;
    details.push({
      label: sq.label,
      userAnswer: userAns,
      correctAnswer: sq.answer,
      isCorrect: isCorrect
    });
  });

  /* MTF 竞赛级计分标准（2025 CBO 联赛标准）
   * 4/4 全对 2.0 分 / 3/4 正确 1.0 分 / 2/4 正确 0.2 分 / 其余 0 分 */
  let score = 0;
  if (correct === 4) {
    score = 2.0;
  } else if (correct === 3) {
    score = 1.0;
  } else if (correct === 2) {
    score = 0.2;
  }

  return { correct, total, score, details };
}

function getModuleIdFromQuestion(q) {
  const group = getModuleGroupBySubject(q.subject);
  return group ? group.id : 'unknown';
}

function updateStatsForQuestion(q, userAnswers) {
  const result = calculateQuestionScore(q, userAnswers);
  const { correct, total } = result;
  const moduleId = getModuleIdFromQuestion(q);

  PracticeState.totalAnswered++;
  PracticeState.totalScore += result.score;

  if (!PracticeState.moduleStats[moduleId]) {
    PracticeState.moduleStats[moduleId] = { total: 0, correct: 0, score: 0, subTotal: 0, subCorrect: 0 };
  }
  PracticeState.moduleStats[moduleId].total++;
  PracticeState.moduleStats[moduleId].score += result.score;
  PracticeState.moduleStats[moduleId].subTotal += total;
  PracticeState.moduleStats[moduleId].subCorrect += correct;

  const isFullyCorrect = correct === total;
  if (isFullyCorrect) {
    PracticeState.moduleStats[moduleId].correct++;
  }

  // v4.0 苏格拉底同学触发：答错/答对上报（用于共情模式检测）
  if (typeof window.BioQuestClassmate === 'object' && window.BioQuestClassmate) {
    try {
      if (isFullyCorrect) {
        if (typeof window.BioQuestClassmate.onCorrectAnswer === 'function') {
          window.BioQuestClassmate.onCorrectAnswer();
        }
      } else {
        if (typeof window.BioQuestClassmate.onWrongAnswer === 'function') {
          window.BioQuestClassmate.onWrongAnswer({
            question: q.question || (q.subQuestions && q.subQuestions[0] && q.subQuestions[0].question) || '',
            concept: q.subject || '',
            subject: q.subject || '',
            source: 'practice'
          });
        }
      }
    } catch (e) { /* 静默失败，不影响练习流程 */ }
  }

  if (typeof updateStats === 'function') {
    updateStats(q.subject, isFullyCorrect);
  }

  // 触发分数成就检查
  if (typeof checkAchievement === 'function' && typeof getCurrentUser === 'function') {
    var user = getCurrentUser();
    if (user && user.bio_score) {
      checkAchievement('score', user.bio_score);
    }
  }
  // 触发答题数量成就检查
  if (typeof checkAchievement === 'function' && typeof getCurrentUser === 'function') {
    var user = getCurrentUser();
    if (user) {
      var totalAnswered = (user.total_answered || 0) + 1;
      checkAchievement('questions', totalAnswered);
    }
  }

  // 记录题目难度统计（用于自动调整难度标签）
  if (typeof recordQuestionAnswer === 'function') {
    var qId = q.question ? (String(q.question).slice(0, 20) + (q.concept || '')) : (q.id || '');
    try {
      recordQuestionAnswer(qId, isFullyCorrect, q.difficulty || 3);
    } catch (e) { /* 静默 */ }
  }

  // 答错时加入复习推送错题本
  if (!isFullyCorrect && typeof window.recordWrongAnswer === 'function') {
    try {
      window.recordWrongAnswer(q).catch(function() {});
    } catch (e) { /* 静默 */ }
  }

  // 信用：每次答题"全部正确 +5 / 未全对 +1"奖励（走 user.js 的信用系统）
  try {
    if (typeof window.addPoints === 'function') {
      window.addPoints(isFullyCorrect ? 'ANSWER_CORRECT' : 'ANSWER_WRONG');
    }
  } catch (_) { /* 信用挂钩失败不影响练习主流程 */ }
}

function handleSubmitAnswer() {
  if (PracticeState.submitted) return;

  // 触发每日打卡
  if (typeof recordDailyCheckIn === 'function') {
    recordDailyCheckIn();
  }
  // 触发首次练习成就
  if (typeof checkAchievement === 'function') {
    checkAchievement('practice', 1);
  }

  const q = PracticeState.currentSet[PracticeState.currentIndex];
  const userAnswers = PracticeState.userAnswers[PracticeState.currentIndex] || {};

  // 标准单选题（题库格式）
  const isStandardChoice = q.options && typeof q.options === 'object' && !Array.isArray(q.options) && q.answer;
  // 逻辑推理题
  const isLogicQuestion = q.category === 'logic' && Array.isArray(q.options);

  if (isStandardChoice || isLogicQuestion) {
    if (userAnswers[0] === undefined || userAnswers[0] === null) {
      alert('请选择一个答案后再提交。');
      return;
    }
  } else {
    // MTF 题型：检查是否所有子问题都已回答
    const subQuestions = q.subQuestions || [];
    const allAnswered = subQuestions.every((_, idx) => userAnswers.hasOwnProperty(idx));
    if (!allAnswered) {
      alert('请对所有选项做出判断后再提交。');
      return;
    }
  }

  PracticeState.submitted = true;
  // 统计仅在首次提交时计入：R 键重做后再次提交不会重复计数
  // （bio_score / 错题本 / 成就 / 难度统计均只触发一次）
  if (!PracticeState._counted) PracticeState._counted = {};
  if (!PracticeState._counted[PracticeState.currentIndex]) {
    PracticeState._counted[PracticeState.currentIndex] = true;
    updateStatsForQuestion(q, userAnswers);
    // 每提交一题后检查是否需要同步分数到服务器
    checkAndSyncScore();
  }
  renderQuiz();
}

function handleToggleAnswer(subIdx, value) {
  if (PracticeState.submitted) return;

  const qIdx = PracticeState.currentIndex;
  if (!PracticeState.userAnswers[qIdx]) {
    PracticeState.userAnswers[qIdx] = {};
  }

  PracticeState.userAnswers[qIdx][subIdx] = value;
  renderQuiz();
}

function handleToggleFavorite() {
  const q = PracticeState.currentSet[PracticeState.currentIndex];
  if (!q) return;

  const qId = q.id ? String(q.id) : String(hashQuestionId(q.question + (q.concept || '')));

  if (typeof toggleFavorite === 'function') {
    const isFav = toggleFavorite(qId);
    if (isFav) {
      PracticeState.favorites.add(qId);
    } else {
      PracticeState.favorites.delete(qId);
    }
  }
  renderQuiz();
}

function handleMarkWrong() {
  const q = PracticeState.currentSet[PracticeState.currentIndex];
  if (!q) return;

  const qId = q.id ? String(q.id) : String(hashQuestionId(q.question + (q.concept || '')));

  if (PracticeState.wrongMarked.has(qId)) {
    PracticeState.wrongMarked.delete(qId);
    if (typeof removeWrongQuestion === 'function') {
      removeWrongQuestion(qId);
    }
  } else {
    PracticeState.wrongMarked.add(qId);
    if (typeof addWrongQuestion === 'function') {
      addWrongQuestion(qId, q.subject || 'general', q.question || '', q);
    }
  }
  renderQuiz();
}

function handleNextQuestion() {
  if (PracticeState.currentIndex < PracticeState.currentSet.length - 1) {
    PracticeState.currentIndex++;
    PracticeState.submitted = false;
    renderQuiz();
  } else {
    savePracticeRecord();
    showSummary();
  }
}

function savePracticeRecord() {
  if (typeof saveRecord !== 'function') return;

  const duration = Math.floor((Date.now() - PracticeState.startTime) / 1000);

  const record = {
    totalQuestions: PracticeState.totalAnswered,
    correctCount: PracticeState.currentSet.reduce((sum, q, i) => {
      const ua = PracticeState.userAnswers[i] || {};
      const result = calculateQuestionScore(q, ua);
      // MTF 题型：全部子题正确才算对；逻辑推理题：correct === total 即对
      return sum + (result.correct === result.total ? 1 : 0);
    }, 0),
    score: PracticeState.totalScore,
    totalScore: PracticeState.currentSet.length * 2,
    duration,
    module: 'practice',
    questions: PracticeState.currentSet.map((q, i) => ({
      question: q.question,
      subject: q.subject,
      concept: q.concept,
      userAnswers: PracticeState.userAnswers[i] || {},
      score: calculateQuestionScore(q, PracticeState.userAnswers[i] || {}).score
    }))
  };

  saveRecord(record);

  // 更新排行榜分数
  if (typeof isLoggedIn === 'function' && isLoggedIn()) {
    try {
      var stats = typeof getStats === 'function' ? getStats() : null;
      if (stats && typeof calcBioScore === 'function') {
        var bioResult = calcBioScore(stats);
        var records = typeof getRecords === 'function' ? getRecords() : [];
        // Supabase 直连同步
        if (typeof window.updateBioScore === 'function' && typeof window.getSupabase === 'function' && window.getSupabase()) {
          window.updateBioScore(bioResult.score, {
            practice_count: stats.totalAnswered || 0,
            total_answered: stats.totalAnswered || 0,
            total_correct: stats.totalCorrect || 0,
            accuracy: stats.accuracy || 0
          }).catch(function() {});
        }
      }
    } catch(e) {}
  }
}

function renderFilterPanel() {
  injectPracticeStyles();
  const container = document.getElementById('practice-root');
  if (!container) return;

  const moduleChecks = PracticeModuleGroups.map(
    (g) => `
    <label class="practice-filter-check">
      <input type="checkbox" value="${g.id}"
        ${PracticeState.selectedModules.includes(g.id) ? 'checked' : ''}
        data-module-check>
      <span>${g.label}</span>
      <span style="font-size:0.75rem;color:var(--text-muted);">
        ${g.subjects.join('、')}
      </span>
    </label>
  `
  ).join('');

  const difficultyChecks = DIFFICULTY_OPTIONS.map(
    (d) => `
    <label class="practice-filter-check">
      <input type="checkbox" value="${d.value}"
        ${PracticeState.selectedDifficulties.includes(d.value) ? 'checked' : ''}
        data-difficulty-check>
      <span>${d.label}</span>
    </label>
  `
  ).join('');

  const targetChecks = TARGET_OPTIONS.map(
    (t) => `
    <label class="practice-filter-check">
      <input type="checkbox" value="${t.value}"
        ${PracticeState.selectedTargets.includes(t.value) ? 'checked' : ''}
        data-target-check>
      <span>${t.label}</span>
    </label>
  `
  ).join('');

  const countOptions = QUESTION_COUNT_OPTIONS.map(
    (n) => `<option value="${n}" ${PracticeState.questionCount === n ? 'selected' : ''}>${n} 题</option>`
  ).join('');

  const kgBanner = PracticeState.conceptFilter
    ? `<div class="practice-kg-banner" style="margin-bottom:16px;padding:14px 16px;background:var(--color-sage-light,rgba(90,125,92,0.1));border:1px solid var(--color-sage,rgba(90,125,92,0.3));border-radius:12px;position:relative;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 12px;background:var(--color-sage,rgba(90,125,92,0.2));border-radius:20px;font-size:0.85rem;font-weight:600;color:var(--color-deep);">
            🎯 ${escapeHtml(PracticeState.conceptFilter)}
          </span>
          ${PracticeState.kgCategory ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.25);border-radius:20px;font-size:0.8rem;color:#3b82f6;">${escapeHtml(PracticeState.kgCategory)}</span>` : ''}
          <button id="practice-clear-concept-btn" style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;border:1px solid var(--color-sage,rgba(90,125,92,0.3));background:transparent;color:var(--text-muted);cursor:pointer;font-size:14px;line-height:1;padding:0;margin-left:auto;" title="清除专项筛选">✕</button>
        </div>
        <div style="font-size:0.82rem;color:var(--text-muted);margin-top:8px;">来自知识图谱的专项练习 · 点击 ✕ 可恢复常规筛选</div>
      </div>`
    : '';

  container.innerHTML = `
    <div class="animate-fade-in">
      <section class="section" style="padding-top:0;padding-bottom:32px;">
        <div class="section-label">PRACTICE</div>
        <h2 class="section-title">专项练习</h2>
        <p class="section-desc">按知识点分类进行针对性练习，巩固薄弱环节。</p>
      </section>

      ${kgBanner}

      <div class="wrong-practice-entry" id="wrong-practice-entry">
        <span class="wrong-practice-icon">!</span>
        <span>错题专项练习</span>
        <span class="wrong-practice-count" id="wrong-practice-count"></span>
      </div>

      <div class="practice-filter-panel" id="practice-filter-panel">
        <div class="practice-filter-section">
          <h3 class="practice-filter-title">练习模式</h3>
          <div class="practice-mode-selector" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
            <button class="practice-mode-btn ${PracticeState.selectedTargets.length === 3 && PracticeState.selectedDifficulties.length === 3 ? 'active' : ''}" data-mode="all" title="全部题目，不限目标群体">
              全部
            </button>
            <button class="practice-mode-btn ${PracticeState.selectedTargets.length === 1 && PracticeState.selectedTargets[0] === 'high_school' ? 'active' : ''}" data-mode="gaokao" title="高考模式：仅高中课标题目，难度基础~进阶">
              高考模式
            </button>
            <button class="practice-mode-btn ${PracticeState.selectedTargets.length === 1 && PracticeState.selectedTargets[0] === 'competition' ? 'active' : ''}" data-mode="competition" title="竞赛模式：竞赛难度题目">
              竞赛模式
            </button>
          </div>
          <div style="font-size:0.78rem;color:var(--text-muted);">
            高考模式专为普通高中生设计，严格限定高中生物课标范围
          </div>
        </div>

        <div class="practice-filter-section">
          <h3 class="practice-filter-title">题目类别</h3>
          <div class="practice-category-selector">
            <button class="practice-category-btn ${PracticeState.selectedCategory === 'all' ? 'active' : ''}" data-category="all">全部</button>
            <button class="practice-category-btn ${PracticeState.selectedCategory === 'basic' ? 'active' : ''}" data-category="basic">基础知识</button>
            <button class="practice-category-btn ${PracticeState.selectedCategory === 'logic' ? 'active' : ''}" data-category="logic">逻辑推理</button>
          </div>
          <div style="font-size:0.78rem;color:var(--text-muted);margin-top:6px;">
            ${PracticeState.selectedCategory === 'logic' ? '逻辑推理题：基于实验数据的分析推理，每题2分' : PracticeState.selectedCategory === 'basic' ? '基础知识题：MTF多重判断题型，每题2分' : '混合模式：基础知识 + 逻辑推理'}
          </div>
        </div>

        <div class="practice-filter-section">
          <div class="practice-filter-header">
            <h3 class="practice-filter-title">选择模块</h3>
            <button class="btn btn-sm btn-secondary" id="practice-toggle-all">全选</button>
          </div>
          <div class="practice-filter-checks" id="moduleChecks">
            ${moduleChecks}
          </div>
        </div>

        <div class="practice-filter-section">
          <h3 class="practice-filter-title">选择难度</h3>
          <div class="practice-filter-checks" id="difficultyChecks">
            ${difficultyChecks}
          </div>
        </div>

        <div class="practice-filter-section">
          <h3 class="practice-filter-title">目标群体</h3>
          <div class="practice-filter-checks" id="targetChecks">
            ${targetChecks}
          </div>
          <div style="font-size:0.78rem;color:var(--text-muted);margin-top:6px;">
            高考题严格限定高中课标；竞赛题可涉及大学基础生物学；共通题为两者重叠基础
          </div>
        </div>

        <div class="practice-filter-section">
          <h3 class="practice-filter-title">题目数量</h3>
          <select class="practice-select" id="questionCount">
            ${countOptions}
          </select>
        </div>

        <div class="practice-filter-actions">
          <button class="btn btn-primary btn-lg" id="practice-start-btn">
            开始练习
          </button>
          ${PracticeState.filteredQuestions.length > 0
            ? `<span style="font-size:0.875rem;color:var(--text-muted);margin-left:12px;">
              共 ${PracticeState.filteredQuestions.length} 道可用题目
            </span>`
            : ''}
        </div>

        <div class="practice-pull-section" id="practice-pull-section">
          <div class="practice-pull-header">
            <h3 class="practice-filter-title" style="margin-bottom:0;">拉取题目</h3>
            <span class="practice-pull-hint">按当前筛选从 Supabase 拉取（有冷却）</span>
          </div>
          <div class="practice-pull-summary" id="practice-pull-summary"></div>
          <div class="practice-pull-controls">
            <select class="practice-select practice-pull-select" id="practice-pull-count">
              <option value="5">5 道</option>
              <option value="10" selected>10 道</option>
              <option value="20">20 道</option>
            </select>
            <button class="btn btn-secondary" id="practice-pull-btn" style="min-width:120px;">
              拉取题目
            </button>
          </div>
          <div class="practice-pull-status" id="practice-pull-status"></div>
        </div>
      </div>
    </div>
  `;

  bindFilterEvents();
  bindWrongPracticeEntry();
}

function bindFilterEvents() {
  const rootEl = document.getElementById('practice-root');
  const toggleAllBtn = document.getElementById('practice-toggle-all');
  const moduleChecks = document.querySelectorAll('[data-module-check]');
  const difficultyChecks = document.querySelectorAll('[data-difficulty-check]');
  const categoryBtns = document.querySelectorAll('.practice-category-btn');
  const modeBtns = document.querySelectorAll('.practice-mode-btn');
  const countSelect = document.getElementById('questionCount');
  const startBtn = document.getElementById('practice-start-btn');

  // 练习模式快捷切换（带动画过渡）
  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      modeBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.mode;
      if (mode === 'gaokao') {
        PracticeState.selectedTargets = ['high_school'];
        PracticeState.selectedDifficulties = ['easy', 'medium'];
        PracticeState.selectedModules = ['module1', 'module2', 'module3', 'module4'];
        PracticeState.questionCount = 20;
      } else if (mode === 'competition') {
        PracticeState.selectedTargets = ['competition'];
        PracticeState.selectedDifficulties = ['medium', 'hard'];
        PracticeState.selectedModules = ['module1', 'module2', 'module3', 'module4'];
        PracticeState.questionCount = 20;
      } else {
        PracticeState.selectedTargets = ['high_school', 'competition', 'both'];
        PracticeState.selectedDifficulties = ['easy', 'medium', 'hard'];
        PracticeState.selectedModules = ['module1', 'module2', 'module3', 'module4'];
        PracticeState.questionCount = 10;
      }
      // 同步更新各复选框和选择器状态（带动画）
      animateFilterTransition(function() {
        renderFilterPanel();
        applyFilters();
        updateAvailableCount();
      });
    });
  });

  // 类别选择
  categoryBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      categoryBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      PracticeState.selectedCategory = btn.dataset.category;
      applyFilters();
      updateAvailableCount();
      // 更新类别描述
      const descEl = btn.closest('.practice-filter-section').querySelector('div[style*="font-size:0.78rem"]');
      if (descEl) {
        const desc = PracticeState.selectedCategory === 'logic'
          ? '逻辑推理题：基于实验数据的分析推理，每题2分'
          : PracticeState.selectedCategory === 'basic'
            ? '基础知识题：MTF多重判断题型，每题2分'
            : '混合模式：基础知识 + 逻辑推理';
        descEl.textContent = desc;
      }
    });
  });

  if (toggleAllBtn) {
    toggleAllBtn.addEventListener('click', () => {
      const allChecked = [...moduleChecks].every((cb) => cb.checked);
      moduleChecks.forEach((cb) => {
        cb.checked = !allChecked;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }

  if (moduleChecks.length > 0) {
    moduleChecks.forEach((cb) => {
      cb.addEventListener('change', () => {
        PracticeState.selectedModules = [...moduleChecks]
          .filter((c) => c.checked)
          .map((c) => c.value);
        applyFilters();
        updateAvailableCount();
      });
    });
  }

  if (difficultyChecks.length > 0) {
    difficultyChecks.forEach((cb) => {
      cb.addEventListener('change', () => {
        PracticeState.selectedDifficulties = [...difficultyChecks]
          .filter((c) => c.checked)
          .map((c) => c.value);
        applyFilters();
        updateAvailableCount();
      });
    });
  }

  const targetChecks = document.querySelectorAll('[data-target-check]');
  if (targetChecks.length > 0) {
    targetChecks.forEach((cb) => {
      cb.addEventListener('change', () => {
        PracticeState.selectedTargets = [...targetChecks]
          .filter((c) => c.checked)
          .map((c) => c.value);
        applyFilters();
        updateAvailableCount();
      });
    });
  }

  if (countSelect) {
    countSelect.addEventListener('change', () => {
      PracticeState.questionCount = parseInt(countSelect.value, 10);
    });
  }

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (PracticeState.selectedModules.length === 0) {
        alert('请至少选择一个模块。');
        return;
      }
      if (PracticeState.selectedDifficulties.length === 0) {
        alert('请至少选择一个难度。');
        return;
      }
      if (!PracticeState.allQuestions || PracticeState.allQuestions.length === 0) {
        alert('题库为空，请先点击下方「拉取题目」加载题目。');
        return;
      }
      if (PracticeState.filteredQuestions.length === 0) {
        alert('当前筛选条件下没有可用题目，请调整筛选条件或拉取更多题目。');
        return;
      }
      initNewSession();
      if (PracticeState.currentSet.length === 0) {
        alert('无法生成题目，请调整筛选条件。');
        return;
      }
      renderQuiz();
    });
  }

  bindPullEvents();

  // 清除专项按钮：使用事件委托（根元素绑定一次，避免 clone 重复绑定）
  if (rootEl) {
    rootEl.addEventListener('click', function (e) {
      var tgt = e.target;
      if (!tgt || !tgt.matches('#practice-clear-concept-btn')) return;
      e.preventDefault();
      PracticeState.conceptFilter = null;
      PracticeState.kgSource = null;
      PracticeState.kgCategory = null;
      PracticeState.selectedModules = ['module1', 'module2', 'module3', 'module4'];
      try { sessionStorage.removeItem('bioquest_kg_practice'); } catch (err) {}
      // 清除 URL 中的 concept 参数：直接替换 URL 并显式触发一次路由
      var baseUrl = window.location.pathname + window.location.search;
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', baseUrl + '#/practice');
      }
      try { window.scrollTo(0, 0); } catch (err) {}
      renderFilterPanel();
      applyFilters();
      updateAvailableCount();
    });
  }
}

function updateAvailableCount() {
  const countEl = document.querySelector('.practice-filter-actions span');
  if (countEl) {
    countEl.textContent = `共 ${PracticeState.filteredQuestions.length} 道可用题目`;
  }
  _renderPullSummary();
}

// ===== 拉取新题（带冷却） =====
var PULL_COOLDOWN_MS = 20 * 1000; // 20 秒冷却（用户要求）
var PULL_COOLDOWN_KEY = 'bioquest_pull_cooldown_until';
var PULL_COOLDOWN_TIMER = null;

function _getPullCooldownRemaining() {
  try {
    var until = parseInt(localStorage.getItem(PULL_COOLDOWN_KEY) || '0', 10);
    return Math.max(0, until - Date.now());
  } catch (e) {
    return 0;
  }
}

function _setPullCooldown() {
  try {
    localStorage.setItem(PULL_COOLDOWN_KEY, String(Date.now() + PULL_COOLDOWN_MS));
  } catch (e) {}
}

function _formatCountdown(ms) {
  var sec = Math.ceil(ms / 1000);
  return sec + ' 秒';
}

function _updatePullButtonState() {
  var btn = document.getElementById('practice-pull-btn');
  if (!btn) return;
  var remaining = _getPullCooldownRemaining();
  if (remaining > 0) {
    btn.disabled = true;
    btn.textContent = '冷却中 ' + _formatCountdown(remaining);
    btn.classList.add('practice-pull-btn-cooldown');
    if (PULL_COOLDOWN_TIMER) clearTimeout(PULL_COOLDOWN_TIMER);
    PULL_COOLDOWN_TIMER = setTimeout(_updatePullButtonState, PRACTICE_PULL_TICK_MS);
  } else {
    btn.disabled = false;
    btn.textContent = '拉取题目';
    btn.classList.remove('practice-pull-btn-cooldown');
  }
}

function _setPullStatus(text, type) {
  var statusEl = document.getElementById('practice-pull-status');
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.className = 'practice-pull-status' + (type ? ' practice-pull-status--' + type : '');
}

function _renderPullSummary() {
  var summaryEl = document.getElementById('practice-pull-summary');
  if (!summaryEl) return;

  var moduleLabels = {
    module1: '模块一', module2: '模块二', module3: '模块三', module4: '模块四'
  };
  var modules = (PracticeState.selectedModules || [])
    .map(function(id) { return moduleLabels[id] || id; })
    .join('、') || '全部';

  var diffLabels = {
    easy: '基础', medium: '进阶', hard: '挑战',
    basic: '基础', league: '进阶', national: '挑战'
  };
  var diffs = (PracticeState.selectedDifficulties || [])
    .map(function(d) { return diffLabels[d] || d; })
    .join('、') || '不限';

  var targetLabels = {
    high_school: '高考', competition: '竞赛', both: '共通'
  };
  var targets = (PracticeState.selectedTargets || [])
    .map(function(t) { return targetLabels[t] || t; })
    .join('、') || '不限';

  var concept = PracticeState.conceptFilter ? escapeHtml(PracticeState.conceptFilter) : null;

  summaryEl.innerHTML = `
    <span>模块：${modules}</span>
    <span>难度：${diffs}</span>
    <span>目标：${targets}</span>
    ${concept ? '<span>专项：' + concept + '</span>' : ''}
  `;
}

function bindPullEvents() {
  var pullBtn = document.getElementById('practice-pull-btn');
  if (!pullBtn) return;

  // 清理旧计时器
  if (PULL_COOLDOWN_TIMER) {
    clearTimeout(PULL_COOLDOWN_TIMER);
    PULL_COOLDOWN_TIMER = null;
  }

  _renderPullSummary();
  _updatePullButtonState();

  pullBtn.addEventListener('click', function() {
    var remaining = _getPullCooldownRemaining();
    if (remaining > 0) {
      _setPullStatus('冷却中，请 ' + _formatCountdown(remaining) + ' 后再试', 'info');
      return;
    }
    handlePullQuestions();
  });
}

async function handlePullQuestions() {
  var countSel = document.getElementById('practice-pull-count');
  var btn = document.getElementById('practice-pull-btn');
  var countVal = countSel ? parseInt(countSel.value, 10) : 10;
  if (countVal > 20) countVal = 20;
  if (countVal < 1) countVal = 5;

  // 按当前筛选条件组装拉取参数
  var modMap = { module1: 'module_1', module2: 'module_2', module3: 'module_3', module4: 'module_4' };
  var modules = (PracticeState.selectedModules || [])
    .map(function(id) { return modMap[id]; })
    .filter(Boolean);
  if (modules.length === 0) modules = ['module_1', 'module_2', 'module_3', 'module_4'];

  var difficulties = PracticeState.selectedDifficulties || [];
  var targets = PracticeState.selectedTargets || [];
  var concept = PracticeState.conceptFilter || null;

  btn.disabled = true;
  btn.textContent = '拉取中...';
  _setPullStatus('正在从 Supabase 拉取 ' + countVal + ' 道题…', 'info');

  try {
    // 主动确保 loader.js 已加载（解决 loader.js 未在 index.html 预加载的问题）
    if (typeof window.fetchQuestionsBatch !== 'function') {
      _setPullStatus('正在初始化题库加载器…', 'info');
      var loaderOk = false;
      // 兼容路径 A：loader.js 已在页面中且暴露了 ensureQuestionLoaderReady
      if (typeof window.ensureQuestionLoaderReady === 'function') {
        loaderOk = await window.ensureQuestionLoaderReady({ timeout: 10000, attempts: 3 });
      } else {
        // 兼容路径 B：loader.js 还未被引入到页面，手动注入（双重兜底）
        loaderOk = await new Promise(function(resolve) {
          // 检查是否已有 script 标签存在
          var existing = document.querySelector('script[src*="loader.js"]');
          function checkReady() {
            if (typeof window.fetchQuestionsBatch === 'function' && typeof window.loadQuestions === 'function') {
              resolve(true);
              return true;
            }
            return false;
          }
          if (checkReady()) return;
          if (existing) {
            // script 已存在但未就绪：等待其加载
            existing.addEventListener('load', function () {
              var deadline = Date.now() + 8000;
              (function poll() {
                if (checkReady()) return;
                if (Date.now() > deadline) { resolve(false); return; }
                setTimeout(poll, 50);
              })();
            });
            existing.addEventListener('error', function () { resolve(false); });
          } else {
            // 手动注入 loader.js
            var s = document.createElement('script');
            s.src = 'js/loader.js?v=' + Date.now();
            s.async = false;
            s.onload = function () {
              var deadline = Date.now() + 8000;
              (function poll() {
                if (checkReady()) return;
                if (Date.now() > deadline) { resolve(false); return; }
                setTimeout(poll, 50);
              })();
            };
            s.onerror = function () { resolve(false); };
            document.head.appendChild(s);
          }
        });
      }
      // 最终兜底：再检查一次函数
      if (!loaderOk || typeof window.fetchQuestionsBatch !== 'function') {
        // 更友好的错误提示 + 建议
        throw new Error('题库加载器初始化失败，请刷新页面重试。若持续失败请清空浏览器缓存后再次打开。');
      }
    }

    var items = await window.fetchQuestionsBatch({
      modules: modules,
      difficulties: difficulties,
      targets: targets,
      concept: concept,
      count: countVal
    });

    if (!items || items.length === 0) {
      throw new Error('没有符合条件的题目，请放宽筛选条件');
    }

    // 字段映射：题库格式（stem/options对象/answer字母）→ practice 格式（question/options数组/answer索引）
    items = items.map(function(q) {
      if (q.stem && !q.question) q.question = q.stem;
      return q;
    });

    // 去重合并
    var existingIds = {};
    (PracticeState.allQuestions || []).forEach(function(q) {
      if (q && q.question) existingIds[q.question] = true;
    });
    var added = 0;
    items.forEach(function(q) {
      if (q && q.subQuestions && q.subQuestions.length >= 4 && !existingIds[q.question]) {
        PracticeState.allQuestions.push(q);
        existingIds[q.question] = true;
        added++;
      }
    });

    _setPullStatus('拉取成功！新增 ' + added + ' 道题，当前共 ' + PracticeState.allQuestions.length + ' 道可用。', 'success');
    _setPullCooldown();
    _updatePullButtonState();

    applyFilters();
    updateAvailableCount();
  } catch (err) {
    console.error('[Practice] 拉取题目失败:', err);
    _setPullStatus('拉取失败：' + (err.message || '请检查网络或 Supabase 配置'), 'error');
    btn.disabled = false;
    btn.textContent = '拉取题目';
  }
}

/**
 * 绑定"错题专项练习"入口事件
 */
function bindWrongPracticeEntry() {
  var wrongEntry = document.getElementById('wrong-practice-entry');
  if (!wrongEntry) return;

  // 显示错题数量
  try {
    var wrongs = typeof getWrongQuestions === 'function' ? getWrongQuestions() : [];
    var countEl = document.getElementById('wrong-practice-count');
    if (countEl) {
      countEl.textContent = wrongs.length > 0 ? wrongs.length + ' 题' : '';
    }
  } catch(e) {}

  wrongEntry.addEventListener('click', function() {
    try {
      var wrongs = typeof getWrongQuestions === 'function' ? getWrongQuestions() : [];
    } catch(e) { wrongs = []; }

    if (wrongs.length === 0) {
      alert('暂无错题，先去练习吧！');
      return;
    }

    // 找出有完整题目数据的错题
    var redoable = [];
    for (var i = 0; i < wrongs.length; i++) {
      var w = wrongs[i];
      if (w.fullQuestion && w.fullQuestion.question) {
        // 确保有足够的 subQuestions
        var q = ensureMinSubQuestions(Object.assign({}, w.fullQuestion));
        redoable.push(q);
      }
    }

    if (redoable.length > 0) {
      // 进入错题循环练习模式
      PracticeState.redoMode = true;
      PracticeState.currentSet = redoable;
      PracticeState.currentIndex = 0;
      PracticeState.totalAnswered = 0;
      PracticeState.totalScore = 0;
      PracticeState.userAnswers = {};
      PracticeState._counted = {};
      PracticeState.submitted = false;
      PracticeState.wrongMarked = new Set();
      PracticeState.moduleStats = {};
      PracticeState.startTime = Date.now();
      PracticeState.started = true;
      PracticeState.favorites = new Set(
        typeof getFavorites === 'function' ? getFavorites() : []
      );

      renderQuiz();
    } else {
      // 没有完整题目数据，尝试逐个重做第一道错题
      if (wrongs.length > 0) {
        var firstWrong = wrongs[0];
        try {
          sessionStorage.setItem('bioquest_redo_question', JSON.stringify(firstWrong));
        } catch(e) {}
        handleRedoQuestion(JSON.stringify(firstWrong));
      } else {
        alert('暂无可重做的错题');
      }
    }
  });
}

function renderQuiz() {
  injectPracticeStyles();
  const container = document.getElementById('practice-root');
  if (!container) return;

  const q = PracticeState.currentSet[PracticeState.currentIndex];
  if (!q) return;

  const isLogicQuestion = q.category === 'logic' && Array.isArray(q.options);
  const isStandardChoice = q.options && typeof q.options === 'object' && !Array.isArray(q.options) && q.answer;
  const userAnswers = PracticeState.userAnswers[PracticeState.currentIndex] || {};

  let subQuestionsHtml = '';
  let correct = 0, total = 0, score = 0;

  if (PracticeState.submitted) {
    const result = calculateQuestionScore(q, userAnswers);
    correct = result.correct;
    total = result.total;
    score = result.score;
  } else {
    total = (isLogicQuestion || isStandardChoice) ? 1 : (q.subQuestions || []).length;
  }

  const moduleGroup = getModuleGroupBySubject(q.subject);
  const moduleLabel = moduleGroup ? moduleGroup.label : '';

  const qId = q.id ? String(q.id) : String(hashQuestionId(q.question + (q.concept || '')));
  const isFav = PracticeState.favorites.has(qId);
  const isWrongMarked = PracticeState.wrongMarked.has(qId);

  if (isLogicQuestion) {
    // ====== 逻辑推理题渲染（单选题格式，options 数组）======
    const optionLabels = ['A', 'B', 'C', 'D', 'E'];
    const userAns = userAnswers[0];

    subQuestionsHtml = (q.options || []).map((opt, idx) => {
      const isSelected = userAns === idx;
      const isCorrectOption = q.answer === idx;
      let optClass = 'practice-logic-option';
      if (isSelected && !PracticeState.submitted) optClass += ' practice-logic-selected';
      if (PracticeState.submitted && isCorrectOption) optClass += ' practice-logic-correct';
      if (PracticeState.submitted && isSelected && !isCorrectOption) optClass += ' practice-logic-wrong';

      return `
        <div class="${optClass}" data-logic-idx="${idx}">
          <div class="practice-logic-marker">${optionLabels[idx]}</div>
          <span class="practice-logic-text">${escapeHtml(opt)}</span>
        </div>
      `;
    }).join('');

    if (PracticeState.submitted) {
      const isCorrect = userAns === q.answer;
      const optionLabels = ['A', 'B', 'C', 'D', 'E'];
      subQuestionsHtml += `
        <div class="practice-option-result" style="margin-top:12px;">
          ${isCorrect
            ? '<span style="color:var(--color-success);">正确！</span>'
            : `<span style="color:var(--color-error);">错误，正确答案是 ${optionLabels[q.answer]}</span>`
          }
        </div>
      `;
    }
  } else if (isStandardChoice) {
    // ====== 标准单选题渲染（题库格式，options 对象 {A:..,B:..}）======
    const userAns = userAnswers[0];
    const optionKeys = Object.keys(q.options).sort();

    subQuestionsHtml = optionKeys.map(key => {
      const isSelected = userAns === key;
      const isCorrectOption = q.answer === key;
      let optClass = 'practice-logic-option';
      if (isSelected && !PracticeState.submitted) optClass += ' practice-logic-selected';
      if (PracticeState.submitted && isCorrectOption) optClass += ' practice-logic-correct';
      if (PracticeState.submitted && isSelected && !isCorrectOption) optClass += ' practice-logic-wrong';

      return `
        <div class="${optClass}" data-choice-key="${key}">
          <div class="practice-logic-marker">${key}</div>
          <span class="practice-logic-text">${escapeHtml(q.options[key])}</span>
        </div>
      `;
    }).join('');

    if (PracticeState.submitted) {
      const isCorrect = userAns === q.answer;
      subQuestionsHtml += `
        <div class="practice-option-result" style="margin-top:12px;">
          ${isCorrect
            ? '<span style="color:var(--color-success);">正确！</span>'
            : `<span style="color:var(--color-error);">错误，正确答案是 ${q.answer}</span>`
          }
        </div>
      `;
    }
  } else {
    // ====== MTF 题型渲染（原有逻辑）======
    const subQuestions = q.subQuestions || [];
    subQuestionsHtml = subQuestions
      .map((sq, idx) => {
        const userAns = userAnswers[idx];
        const isCorrect = PracticeState.submitted ? userAns === sq.answer : null;
        const correctAnswer = sq.answer;

        let cardClass = 'practice-option-card';
        if (PracticeState.submitted) {
          if (isCorrect) {
            cardClass += ' practice-option-correct practice-answer-correct';
          } else {
            cardClass += ' practice-option-wrong practice-answer-wrong';
          }
        } else if (userAns !== undefined) {
          cardClass += ' practice-option-selected';
        }

        return `
          <div class="${cardClass}">
            <div class="practice-option-label">${sq.label}</div>
            <div class="practice-option-text">${escapeHtml(sq.text)}</div>
            <div class="practice-option-toggle">
              <button class="practice-tf-btn ${userAns === true ? 'practice-tf-active practice-tf-true' : ''}"
                data-sub-idx="${idx}" data-value="true"
                ${PracticeState.submitted ? 'disabled' : ''}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                正确
              </button>
              <button class="practice-tf-btn ${userAns === false ? 'practice-tf-active practice-tf-false' : ''}"
                data-sub-idx="${idx}" data-value="false"
                ${PracticeState.submitted ? 'disabled' : ''}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                错误
              </button>
            </div>
            ${PracticeState.submitted ? `
              <div class="practice-option-result">
                ${isCorrect
                  ? '<span style="color:var(--color-success);">判断正确</span>'
                  : `<span style="color:var(--color-error);">判断错误，正确答案为「${correctAnswer ? '正确' : '错误'}」</span>`
                }
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
  }

  const scoreHtml = PracticeState.submitted
    ? `
    <div class="practice-score-display">
      <span class="practice-score-label">本题得分：</span>
      <span class="practice-score-value">${score} 分</span>
      <span class="practice-score-detail">（${correct}/${total} 正确）</span>
    </div>
    `
    : '';

  const explanationHtml = PracticeState.submitted && q.explanation
    ? `
    <div class="practice-explanation">
      <div class="practice-explanation-title">解析</div>
      <div class="practice-explanation-text">${escapeHtml(q.explanation)}</div>
    </div>
    `
    : '';

  container.innerHTML = `
    <div class="animate-fade-in practice-fade-in">
      ${PracticeState.redoMode && PracticeState.currentSet.length > 1
        ? `<div class="redo-progress">错题重做: <strong>${PracticeState.currentIndex + 1}</strong> / ${PracticeState.currentSet.length}</div>`
        : ''
      }
      <div class="practice-quiz-header">
        <div class="practice-progress">
          <span class="practice-progress-count">
            第 ${PracticeState.currentIndex + 1}/${PracticeState.currentSet.length} 题
          </span>
          <div class="practice-progress-bar">
            <div class="practice-progress-fill" style="width:${((PracticeState.currentIndex + 1) / PracticeState.currentSet.length) * 100}%"></div>
          </div>
        </div>

        <div class="practice-quiz-tags">
          <span class="tag" style="background:rgba(0,0,0,0.05);color:var(--text-muted,#888);font-size:0.7rem;font-family:var(--font-mono,monospace);">ID:${q.id ? q.id : qId.slice(0, 8)}</span>
          ${q.category === 'logic' ? '<span class="tag" style="background:rgba(99,102,241,0.12);color:#6366f1;">逻辑推理</span>' : ''}
          ${moduleLabel ? `<span class="tag tag--primary">${moduleLabel}</span>` : ''}
          ${q.subject ? '<span class="tag tag--info">' + escapeHtml(q.subject) + '</span>' : ''}
          ${typeof renderDifficultyTag === 'function' ? renderDifficultyTag(qId, q.difficulty || 3) : (q.difficulty ? '<span class="tag ' + getDifficultyClass(q.difficulty) + '">' + getDifficultyLabel(q.difficulty) + '</span>' : '')}
          ${q.concept ? '<span class="tag tag--outline">' + escapeHtml(q.concept) + '</span>' : ''}
        </div>
      </div>

      <div class="practice-question-card">
        <div class="practice-question-text">
          ${escapeHtml(q.question)}
        </div>
        ${renderChart(q.chart)}

        <div class="practice-options-list">
          ${subQuestionsHtml}
        </div>
      </div>

      ${scoreHtml}

      ${explanationHtml}

      <div class="practice-actions">
        <div class="practice-actions-left">
          <button class="btn btn-sm practice-fav-btn ${isFav ? 'practice-fav-active' : ''}"
            id="practice-fav-btn" title="${isFav ? '取消收藏' : '收藏题目'}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            ${isFav ? '已收藏' : '收藏'}
          </button>
          <button class="btn btn-sm practice-wrong-btn ${isWrongMarked ? 'practice-wrong-active' : ''}"
            id="practice-wrong-btn" title="${isWrongMarked ? '取消标记' : '标记错题'}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            ${isWrongMarked ? '已标记' : '错题'}
          </button>
          <button class="btn btn-sm practice-feedback-btn" id="practice-feedback-btn" title="反馈题目问题">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            反馈
          </button>
        </div>
        <div class="practice-actions-right">
          ${!PracticeState.submitted
            ? `<button class="btn btn-success" id="practice-submit-btn">提交答案</button>`
            : `<button class="btn btn-primary" id="practice-next-btn">
              ${PracticeState.currentIndex < PracticeState.currentSet.length - 1 ? '下一题 →' : '查看小结 →'}
            </button>`
          }
        </div>
      </div>

      <div class="practice-cumulative">
        <span>累计得分：<strong>${PracticeState.totalScore.toFixed(1)}</strong> 分</span>
        <span>已答：<strong>${PracticeState.totalAnswered}</strong> 题</span>
        <span>正确率：<strong>${PracticeState.totalAnswered > 0 ? calcAccuracyStr() : '--'}</strong></span>
      </div>

      <div class="practice-shortcut-hint" aria-label="键盘快捷键提示">
        ${(isLogicQuestion || isStandardChoice)
          ? '<span><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd> 选答案</span>'
          : ''
        }
        <span><kbd>Space</kbd>/<kbd>Enter</kbd> ${PracticeState.submitted ? '下一题' : '提交答案'}</span>
        <span><kbd>R</kbd> 重做本题</span>
        <span><kbd>Esc</kbd> 返回列表</span>
        <span class="sh-sep">·</span>
        <span><kbd>?</kbd> 全部快捷键</span>
      </div>
    </div>
  `;

  bindQuizEvents();
}

function calcAccuracyStr() {
  if (PracticeState.totalAnswered === 0) return '--';
  let totalSub = 0;
  let correctSub = 0;
  Object.values(PracticeState.moduleStats).forEach(function(m) {
    totalSub += (m.subTotal || 0);
    correctSub += (m.subCorrect || 0);
  });
  if (totalSub === 0) return '--';
  return Math.round((correctSub / totalSub) * 100) + '%';
}

function bindQuizEvents() {
  // 选项点击（支持逻辑推理题 data-logic-idx 和标准单选题 data-choice-key）
  const logicOptions = document.querySelectorAll('.practice-logic-option');
  logicOptions.forEach((opt) => {
    opt.addEventListener('click', () => {
      if (PracticeState.submitted) return;
      const qIdx = PracticeState.currentIndex;
      if (!PracticeState.userAnswers[qIdx]) {
        PracticeState.userAnswers[qIdx] = {};
      }
      // 标准单选题：存 'A'/'B'/'C'/'D'；逻辑推理题：存索引 0-4
      if (opt.dataset.choiceKey) {
        PracticeState.userAnswers[qIdx][0] = opt.dataset.choiceKey;
      } else {
        const idx = parseInt(opt.dataset.logicIdx, 10);
        PracticeState.userAnswers[qIdx][0] = idx;
      }
      renderQuiz();
    });
  });

  // MTF 题型按钮
  const toggleBtns = document.querySelectorAll('.practice-tf-btn:not([disabled])');
  toggleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const subIdx = parseInt(btn.dataset.subIdx, 10);
      const value = btn.dataset.value === 'true';
      handleToggleAnswer(subIdx, value);
    });
  });

  const submitBtn = document.getElementById('practice-submit-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', handleSubmitAnswer);
  }

  const nextBtn = document.getElementById('practice-next-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', handleNextQuestion);
  }

  const favBtn = document.getElementById('practice-fav-btn');
  if (favBtn) {
    favBtn.addEventListener('click', handleToggleFavorite);
  }

  const wrongBtn = document.getElementById('practice-wrong-btn');
  if (wrongBtn) {
    wrongBtn.addEventListener('click', handleMarkWrong);
  }

  const feedbackBtn = document.getElementById('practice-feedback-btn');
  if (feedbackBtn) {
    feedbackBtn.addEventListener('click', function() {
      if (typeof window.showQuestionFeedbackModal === 'function') {
        var q = PracticeState.currentSet[PracticeState.currentIndex];
        if (!q) return;
        var feedbackQId = q.id || String(hashQuestionId(q.question + (q.concept || '')));
        window.showQuestionFeedbackModal(feedbackQId, q.question || '');
      }
    });
  }
}

function showSummary() {
  const container = document.getElementById('practice-root');
  if (!container) return;

  const totalQuestions = PracticeState.totalAnswered;
  const totalScore = PracticeState.totalScore;
  const maxScore = PracticeState.currentSet.length * 2;
  const duration = Math.floor((Date.now() - PracticeState.startTime) / 1000);

  const moduleRows = PracticeModuleGroups
    .filter((g) => PracticeState.moduleStats[g.id])
    .map((g) => {
      const stats = PracticeState.moduleStats[g.id];
      const acc = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      const subAcc = stats.subTotal > 0 ? Math.round((stats.subCorrect / stats.subTotal) * 100) : 0;
      return `
        <div class="practice-summary-row">
          <span class="practice-summary-module">${g.label}</span>
          <span class="practice-summary-stat">${stats.total} 题</span>
          <span class="practice-summary-stat">${stats.score.toFixed(1)} 分</span>
          <span class="practice-summary-stat">全对 ${acc}% · 小题 ${subAcc}%</span>
        </div>
      `;
    })
    .join('');

  container.innerHTML = `
    <div class="animate-fade-in">
      <section class="section" style="padding-top:0;padding-bottom:24px;">
        <div class="section-label">PRACTICE SUMMARY</div>
        <h2 class="section-title">练习小结</h2>
        <p class="section-desc">恭喜完成练习！查看你的学习成果。</p>
      </section>

      <div class="practice-summary-card">
        <div class="practice-summary-overview">
          <div class="practice-summary-stat-item">
            <div class="practice-summary-stat-num">${totalQuestions}</div>
            <div class="practice-summary-stat-label">总题数</div>
          </div>
          <div class="practice-summary-stat-item">
            <div class="practice-summary-stat-num">${totalScore.toFixed(1)}</div>
            <div class="practice-summary-stat-label">总得分 / ${maxScore}</div>
          </div>
          <div class="practice-summary-stat-item">
            <div class="practice-summary-stat-num">${formatTime(duration, { showHours: false })}</div>
            <div class="practice-summary-stat-label">用时</div>
          </div>
          <div class="practice-summary-stat-item">
            <div class="practice-summary-stat-num">${calcAccuracyStr()}</div>
            <div class="practice-summary-stat-label">整体正确率</div>
          </div>
        </div>

        <div class="practice-summary-detail">
          <h3 class="practice-summary-detail-title">各模块统计</h3>
          ${moduleRows || '<p style="color:var(--text-muted);text-align:center;padding:16px;">暂无模块数据</p>'}
        </div>

        <div class="practice-summary-actions">
          <button class="btn btn-primary" id="practice-restart-btn">再来一套</button>
          <button class="btn btn-secondary" id="practice-back-btn">返回筛选</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('practice-restart-btn').addEventListener('click', () => {
    initNewSession();
    if (PracticeState.currentSet.length === 0) {
      showFilterPanel();
      return;
    }
    renderQuiz();
  });

  document.getElementById('practice-back-btn').addEventListener('click', () => {
    PracticeState.started = false;
    showFilterPanel();
  });
}

function showFilterPanel() {
  applyFilters();
  renderFilterPanel();
}

function renderPracticePage(target) {
  if (!target) return;

  try {
  // 检查是否为错题重做模式
  var redoData = null;
  try { redoData = sessionStorage.getItem('bioquest_redo_question'); } catch(e) {}
  if (redoData) {
    sessionStorage.removeItem('bioquest_redo_question');
  }

  // 解析知识图谱传入的专项练习参数（URL hash 优先，sessionStorage 兜底）
  var kgData = null;
  try {
    var hash = window.location.hash || '';
    var queryIdx = hash.indexOf('?');
    if (queryIdx >= 0) {
      var params = new URLSearchParams(hash.substring(queryIdx + 1));
      var conceptParam = params.get('concept');
      var moduleParam = params.get('module');
      var categoryParam = params.get('category');
      if (conceptParam) {
        kgData = { concept: decodeURIComponent(conceptParam), module: moduleParam || null, category: categoryParam || null };
      }
    }
    if (!kgData) {
      var stored = sessionStorage.getItem('bioquest_kg_practice');
      if (stored) kgData = JSON.parse(stored);
    }
  } catch (e) { kgData = null; }

  if (kgData && kgData.concept) {
    PracticeState.conceptFilter = kgData.concept;
    PracticeState.kgSource = kgData;
    // 根据模块预选中对应练习模块
    if (kgData.module) {
      var modKey = kgData.module.replace('_', ''); // module_1 -> module1
      if (['module1','module2','module3','module4'].indexOf(modKey) >= 0) {
        PracticeState.selectedModules = [modKey];
      }
    }
    // 如果有 category（学科），设置专项学科过滤，仅包含该学科
    if (kgData.category) {
      PracticeState.kgCategory = kgData.category;
    }
  }

  target.innerHTML = `<div id="practice-root"></div>`;

  // 按需模式：进入练习页时不自动加载全部题目，而是显示筛选面板让用户主动拉取
  showFilterPanel();

  // 如果已有缓存题目（例如返回上一页），直接复用
  if (PracticeState.allQuestions && PracticeState.allQuestions.length > 0) {
    updateAvailableCount();
  }

  // 处理错题重做参数
  handleRedoQuestion(redoData);
  } catch (err) {
    console.error('[BioQuest Practice] renderPracticePage 异常:', err);
    target.innerHTML = '<div style="text-align:center;padding:60px 20px;">' +
      '<p style="color:var(--color-error);font-size:1.1rem;margin-bottom:8px;">练习模块加载失败</p>' +
      '<p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:16px;">请刷新页面或稍后重试</p>' +
      '<button onclick="location.reload()" style="padding:8px 20px;background:var(--color-sage);color:#fff;border:none;border-radius:8px;cursor:pointer;">刷新页面</button>' +
      '</div>';
  }
}

/**
 * 处理错题重做：根据错题数据找到对应题目，启动单题练习
 * @param {string|null} redoData - sessionStorage 中的错题数据（JSON 字符串或纯文本 qId）
 * @returns {boolean} 是否成功启动重做模式
 */
function handleRedoQuestion(redoData) {
  if (!redoData) {
    restorePracticeUI();
    return false;
  }

  // 解析 redoData：可能是 JSON 对象（新格式）或纯文本 qId（旧格式兼容）
  var redoItem = null;
  var redoQId = null;
  try {
    if (typeof redoData === 'string' && redoData.startsWith('{')) {
      redoItem = JSON.parse(redoData);
    }
  } catch (e) {}
  if (redoItem) {
    redoQId = redoItem.questionText || redoItem.qId || '';
  } else {
    redoQId = String(redoData).trim();
  }

  // 方案 A: 有完整题目对象 → 直接使用
  if (redoItem && redoItem.fullQuestion && redoItem.fullQuestion.question) {
    var targetQ = redoItem.fullQuestion;
    if (Array.isArray(targetQ.subQuestions) && targetQ.subQuestions.length >= 4) {

      startRedoSession([targetQ]);
      return true;
    }
    // subQuestions 不够4个但仍有 question，尝试补全
    if (targetQ.question) {

      targetQ = ensureMinSubQuestions(targetQ);
      startRedoSession([targetQ]);
      return true;
    }
  }

  // 方案 B: 有 questionText → 从已加载的题库中搜索
  if (redoQId && redoQId.length > 5) {

    // 搜索全局缓存中的题目
    var allQuestions = PracticeState.allQuestions;
    if (!allQuestions || allQuestions.length === 0) {
      // 尝试从 localStorage 读取错题数据来构造
      try {
        var wrongs = typeof getWrongQuestions === 'function' ? getWrongQuestions() : [];
        wrongs.forEach(function(w) {
          if (w.fullQuestion && Array.isArray(w.fullQuestion.subQuestions)) {
            allQuestions.push(w.fullQuestion);
          }
        });
      } catch(e) {}
    }

    if (allQuestions && allQuestions.length > 0) {
      for (var i = 0; i < allQuestions.length; i++) {
        var q = allQuestions[i];
        if ((q.question || '').indexOf(redoQId.substring(0, 20)) >= 0 ||
            (q.concept || '').indexOf(redoQId.substring(0, 15)) >= 0 ||
            redoQId.indexOf((q.question || '').substring(0, 20)) >= 0 ||
            q.question === redoQId) {

          startRedoSession([q]);
          return true;
        }
      }

      // 二次尝试：按关键词模糊匹配
      if (redoQId.length > 6) {
        var keywords = redoQId.replace(/[【】\[\]()]/g, '').split(/[,，。；\s]+/).filter(function(k) { return k.length > 2; });
        var bestMatch = null;
        var bestScore = 0;
        for (var j = 0; j < allQuestions.length; j++) {
          var qj = allQuestions[j];
          var score = 0;
          for (var ki = 0; ki < keywords.length; ki++) {
            if ((qj.question || '').indexOf(keywords[ki]) !== -1) score++;
          }
          if (score > bestScore) { bestScore = score; bestMatch = qj; }
        }
        if (bestScore >= 2 && bestMatch) {

          startRedoSession([bestMatch]);
          return true;
        }
      }
    }
  }

  // 方案 C: 构造一个最小可用的题目对象（基于错题文本）
  if (redoItem && redoItem.questionText) {

    var fakeQuestion = {
      question: redoItem.questionText,
      subject: redoItem.subject || 'general',
      concept: redoItem.concept || '',
      options: ['A', 'B', 'C', 'D'],
      answer: [],
      explanation: '请根据你的知识作答',
      difficulty: 1,
      module: redoItem.module || 1,
      subQuestions: [
        { text: redoItem.questionText, options: ['A', 'B', 'C', 'D'], answer: [] },
        { text: redoItem.questionText + ' (判断项2)', options: ['A', 'B', 'C', 'D'], answer: [] },
        { text: redoItem.questionText + ' (判断项3)', options: ['A', 'B', 'C', 'D'], answer: [] },
        { text: redoItem.questionText + ' (判断项4)', options: ['A', 'B', 'C', 'D'], answer: [] }
      ]
    };
    startRedoSession([fakeQuestion]);
    return true;
  }

  console.warn('[BioQuest Practice] 无法找到要重做的题目');
  alert('无法加载该题目，可能已被清除或不存在于当前题库中');
  restorePracticeUI();
  return false;
}

/**
 * 确保题目至少有 4 个 subQuestions
 */
function ensureMinSubQuestions(q) {
  if (!Array.isArray(q.subQuestions) || q.subQuestions.length < 4) {
    var existing = q.subQuestions || [];
    var baseText = q.question || '';
    while (existing.length < 4) {
      existing.push({
        label: String.fromCharCode(65 + existing.length),
        text: baseText + ' （判断项' + (existing.length + 1) + '）',
        options: ['A', 'B', 'C', 'D'],
        answer: null
      });
    }
    q.subQuestions = existing;
  }
  // 确保 label
  q.subQuestions.forEach(function(sq, idx) {
    if (!sq.label) sq.label = String.fromCharCode(65 + idx);
  });
  return q;
}

/**
 * 启动错题重做会话（支持单题或多题循环练习）
 * @param {Array} questions - 题目数组（单题重做时传入 [targetQ]，错题专项练习传入多题数组）
 */
function startRedoSession(questions) {
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    console.warn('[BioQuest Practice] startRedoSession: 无有效题目');
    restorePracticeUI();
    return;
  }

  resetSyncCounter(); // 重置同步计数器
  PracticeState.redoMode = true;
  PracticeState.currentSet = questions;
  PracticeState.currentIndex = 0;
  PracticeState.userAnswers = {};
  PracticeState._counted = {};
  PracticeState.submitted = false;
  PracticeState.wrongMarked = new Set();
  PracticeState.totalScore = 0;
  PracticeState.totalAnswered = 0;
  PracticeState.moduleStats = {};
  PracticeState.startTime = Date.now();
  PracticeState.started = true;
  PracticeState.favorites = new Set(
    typeof getFavorites === 'function' ? getFavorites() : []
  );

  renderQuiz();
}

function restorePracticeUI() {
  const root = document.getElementById('practice-root');
  if (!root) return;

  // 确保 loading 屏幕被隐藏
  var loadingScreen = document.getElementById('practiceLoadingScreen');
  if (loadingScreen) {
    loadingScreen.style.display = 'none';
  }

  if (PracticeState.started && PracticeState.currentSet.length > 0) {
    renderQuiz();
  } else {
    PracticeState.started = false;
    PracticeState.redoMode = false;
    renderFilterPanel();
  }
}

function initPractice(target) {
  try {
    if (!target) {
      if (typeof AppState !== 'undefined' && AppState.rootElement) {
        target = AppState.rootElement;
      } else {
        target = document.getElementById('page-content');
      }
    }
    if (!target) {
      console.error('[BioQuest Practice] initPractice 找不到目标容器');
      return;
    }
    renderPracticePage(target);
  } catch (err) {
    console.error('[BioQuest Practice] initPractice 异常:', err);
    if (target) {
      target.innerHTML = '<div style="text-align:center;padding:60px 20px;">' +
        '<p style="color:var(--color-error);font-size:1.1rem;margin-bottom:8px;">练习模块初始化失败</p>' +
        '<p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:16px;">请刷新页面或稍后重试</p>' +
        '<button onclick="location.reload()" style="padding:8px 20px;background:var(--color-sage);color:#fff;border:none;border-radius:8px;cursor:pointer;">刷新页面</button>' +
        '</div>';
    }
  }
}

// ============================================================
// PRD §5-1：答题时自动隐藏 Header（向上滚动隐藏，向下滚动出现）
// ============================================================
var _headerAutoHide = { lastScrollY: 0, enabled: false };

function enableHeaderAutoHide() {
  if (_headerAutoHide.enabled) return;
  _headerAutoHide.enabled = true;
  _headerAutoHide.lastScrollY = window.scrollY;
  window.addEventListener('scroll', _onPracticeScroll, { passive: true });
}

function disableHeaderAutoHide() {
  _headerAutoHide.enabled = false;
  window.removeEventListener('scroll', _onPracticeScroll);
  var header = document.querySelector('.header');
  if (header) header.style.transform = '';
}

function _onPracticeScroll() {
  if (!_headerAutoHide.enabled) return;
  var header = document.querySelector('.header');
  if (!header) return;
  var currentY = window.scrollY;
  var diff = currentY - _headerAutoHide.lastScrollY;
  if (currentY < 64) {
    header.style.transform = '';
  } else if (diff > 10) {
    header.style.transform = 'translateY(-100%)';
  } else if (diff < -5) {
    header.style.transform = '';
  }
  _headerAutoHide.lastScrollY = currentY;
}

// ============================================================
// PRD §5-50：最后一题仪式感
// ============================================================
function showLastQuestionEffect(callback) {
  var progressBar = document.querySelector('.practice-progress-bar-fill, .progress-fill, [class*="progress"]');
  if (progressBar) {
    progressBar.style.width = '100%';
    progressBar.style.boxShadow = '0 0 20px rgba(196,149,106,0.8), 0 0 40px rgba(196,149,106,0.4)';
    progressBar.style.transition = 'box-shadow 0.5s ease';
  }

  var banner = document.createElement('div');
  banner.className = 'last-question-banner';
  banner.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'right:0',
    'z-index:9999',
    'background:linear-gradient(135deg,#1a3a2a,#c4956a)',
    'color:#fff',
    'text-align:center',
    'padding:12px 20px',
    'font-size:1.05rem',
    'font-weight:700',
    'animation:lastQSlideDown 0.5s ease',
    'transform:translateY(0)'
  ].join(';');
  banner.textContent = '最后一题完成！';

  // 添加动画 keyframes
  if (!document.getElementById('last-q-keyframes')) {
    var style = document.createElement('style');
    style.id = 'last-q-keyframes';
    style.textContent = '@keyframes lastQSlideDown { from { transform:translateY(-100%); } to { transform:translateY(0); } }';
    document.head.appendChild(style);
  }

  document.body.appendChild(banner);

  setTimeout(function () {
    if (banner.parentNode) banner.parentNode.removeChild(banner);
    if (typeof callback === 'function') callback();
  }, PRACTICE_LAST_Q_BANNER_MS);
}

// 在 renderQuiz 中启用 header auto-hide
var _origRenderQuiz = renderQuiz;
renderQuiz = function () {
  enableHeaderAutoHide();
  _origRenderQuiz.apply(this, arguments);
};

// 在 renderFilterPanel 中禁用 header auto-hide
var _origShowFilter = renderFilterPanel || showFilterPanel;
if (typeof showFilterPanel !== 'undefined') {
  var _origShowFilterPanel = showFilterPanel;
  showFilterPanel = function () {
    disableHeaderAutoHide();
    _origShowFilterPanel.apply(this, arguments);
  };
}

// 挂载到 window 对象，供 app.js 调用
window.initPractice = initPractice;
window.enableHeaderAutoHide = enableHeaderAutoHide;
window.disableHeaderAutoHide = disableHeaderAutoHide;
window.showLastQuestionEffect = showLastQuestionEffect;

// ============================================================
// PRD §5-40：答题键盘快捷键（仅练习答题流程生效）
//   1 / 2 / 3 / 4 → 选 A / B / C / D（单选题：标准单选 & 逻辑推理）
//   Space / Enter → 提交答案，已提交则跳下一题
//   R → 重做当前题目（清空作答，可重新作答；统计仅计首次）
//   Esc → 返回筛选（题目列表）
// ============================================================
var _practiceKbBound = false;

function _practiceOverlayOpen() {
  // 反馈弹窗（关闭即 remove，存在即打开）
  if (document.querySelector('.q-feedback-overlay')) return true;
  // 移动端导航菜单
  var mnav = document.getElementById('mobileNav');
  if (mnav && mnav.classList.contains('active')) return true;
  // 原生 <dialog open>
  if (document.querySelector('dialog[open]')) return true;
  // 任意 aria-modal 对话框：需实际可见（关闭后常残留在 DOM，靠 display/visibility 判定）
  var dialogs = document.querySelectorAll('[aria-modal="true"]');
  for (var i = 0; i < dialogs.length; i++) {
    var cs = window.getComputedStyle(dialogs[i]);
    if (cs.display !== 'none' && cs.visibility !== 'hidden') return true;
  }
  // 快捷键面板可见时也让出
  var sp = document.getElementById('bioquest-shortcut-panel');
  if (sp && window.getComputedStyle(sp).visibility === 'visible') {
    return true;
  }
  return false;
}

function _practiceIsTyping(el) {
  if (!el) return false;
  var tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return !!el.isContentEditable;
}

function _practiceInQuiz() {
  // 答题进行中（存在提交 / 下一题按钮），排除小结页与筛选页
  return !!(document.getElementById('practice-submit-btn') ||
            document.getElementById('practice-next-btn'));
}

function _practiceSelectChoice(numKey) {
  var q = PracticeState.currentSet[PracticeState.currentIndex];
  if (!q) return;
  var isLogic = q.category === 'logic' && Array.isArray(q.options);
  var isStd = q.options && typeof q.options === 'object' &&
              !Array.isArray(q.options) && q.answer;
  if (!isLogic && !isStd) return; // MTF 题型不适用数字键选 A/B/C/D
  var idx = parseInt(numKey, 10) - 1; // 1..4 → 0..3
  if (idx < 0) return;
  var qIdx = PracticeState.currentIndex;
  if (!PracticeState.userAnswers[qIdx]) {
    PracticeState.userAnswers[qIdx] = {};
  }
  if (isStd) {
    var keys = Object.keys(q.options).sort();
    if (idx >= keys.length) return;
    PracticeState.userAnswers[qIdx][0] = keys[idx]; // 'A'/'B'/'C'/'D'
  } else {
    if (idx >= q.options.length) return;
    PracticeState.userAnswers[qIdx][0] = idx; // 逻辑题存索引 0..4
  }
  renderQuiz();
}

function _practiceRedoCurrent() {
  var qIdx = PracticeState.currentIndex;
  PracticeState.userAnswers[qIdx] = {};
  PracticeState.submitted = false;
  // 不重置 _counted：本题已统计过的话，重做再提交不会重复计数
  renderQuiz();
}

function _practiceBackToList() {
  PracticeState.started = false;
  PracticeState.submitted = false;
  if (typeof showFilterPanel === 'function') {
    showFilterPanel();
  }
}

function handlePracticeKeydown(e) {
  // 仅练习答题流程生效
  if (!PracticeState.started) return;
  // 任意弹窗 / 面板 / 移动导航打开时全部让出
  if (_practiceOverlayOpen()) return;

  var key = e.key;
  var active = document.activeElement;
  var typing = _practiceIsTyping(active);

  // Esc → 返回筛选（题目列表）
  if (key === 'Escape') {
    if (typing) return; // 输入框内由原生处理
    e.preventDefault();
    _practiceBackToList();
    return;
  }

  // 以下快捷键仅在答题进行中生效（小结页 / 筛选页不触发）
  if (!_practiceInQuiz()) return;

  // 数字键 1-4 → 选 A/B/C/D
  if (!typing && (key === '1' || key === '2' || key === '3' || key === '4')) {
    if (PracticeState.submitted) return; // 已提交不可改答
    e.preventDefault();
    _practiceSelectChoice(key);
    return;
  }

  // R → 重做当前题
  if (!typing && (key === 'r' || key === 'R')) {
    e.preventDefault();
    _practiceRedoCurrent();
    return;
  }

  // Space / Enter → 提交答案 / 下一题
  // 统一 preventDefault：无论焦点在哪个按钮，Space/Enter 都固定走提交/下一题，
  // 避免点完收藏/错题按钮后焦点停留导致 Space 误触发该按钮
  if (!typing && (key === ' ' || key === 'Spacebar' || key === 'Enter')) {
    e.preventDefault();
    if (!PracticeState.submitted) {
      handleSubmitAnswer();
    } else {
      handleNextQuestion();
    }
    return;
  }
}

(function _bindPracticeKeyboard() {
  if (_practiceKbBound) return;
  _practiceKbBound = true;
  document.addEventListener('keydown', handlePracticeKeydown);
})();
