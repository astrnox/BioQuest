/*!
 * learning-hub.js
 * BioQuest 学习管理中心（参考 Deadline Quest 项目设计）
 *
 * 功能：
 *  - 今日任务聚合（聚合今日 AI 课堂 + 刷题 + 复习）
 *  - 任务截止时间线（按周/月聚合）
 *  - 答题进度看板（已答 / 还需 / 可答）
 *  - AI 抢救方案（连续 3 天未完成任务触发）
 *  - 任务日志（最近 10 条活动）
 *
 * 数据源：Supabase（tasks / behavior_logs / cr_logs）+ LocalStorage（localTasks）
 * 零依赖，纯前端 + Supabase
 */

(function (global) {
  'use strict';

  // ---------- 模块状态 ----------
  var state = {
    target: null,
    userId: null,
    tasks: [],
    logs: [],
    progress: { answered: 0, needed: 10, available: 0 },
  };

  function _uid() { return (global.Auth && global.Auth.currentUser && global.Auth.currentUser.id) || 'guest'; }

  // ---------- 任务模型 ----------
  // 任务类型：classroom | practice | review | custom
  // 任务状态：pending | running | done | failed | aborted

  function _defaultTasks() {
    // 默认示例任务（首次进入时显示）
    var today = new Date();
    return [
      { id: 't1', type: 'classroom', title: '光合作用的光反应与暗反应', topic: '光合作用', status: 'pending', priority: 'high', dueAt: _endOfDay(today), progress: 0, createdAt: Date.now() - 3600000, source: 'ai-suggest' },
      { id: 't2', type: 'practice', title: '细胞分裂章节练习', topic: '细胞分裂', status: 'pending', priority: 'medium', dueAt: _endOfDay(today), progress: 0, createdAt: Date.now() - 7200000, source: 'manual' },
      { id: 't3', type: 'review', title: '错题本复习：神经传导', topic: '神经冲动的传导机制', status: 'pending', priority: 'low', dueAt: _endOfDay(today), progress: 0, createdAt: Date.now() - 86400000, source: 'auto-review' }
    ];
  }

  function _endOfDay(d) {
    var eod = new Date(d);
    eod.setHours(23, 59, 59, 999);
    return eod.getTime();
  }

  // 加载任务：优先 LocalStorage，回退到默认
  function _loadTasks() {
    try {
      var raw = localStorage.getItem('lmc:tasks:' + _uid());
      if (raw) {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length > 0) return arr;
      }
    } catch (e) { /* ignore */ }
    return _defaultTasks();
  }

  function _saveTasks() {
    try {
      localStorage.setItem('lmc:tasks:' + _uid(), JSON.stringify(state.tasks));
    } catch (e) { /* ignore */ }
  }

  function _addLog(level, message, meta) {
    state.logs.unshift({
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      level: level || 'info',
      message: message || '',
      meta: meta || null,
      at: Date.now()
    });
    if (state.logs.length > 50) state.logs = state.logs.slice(0, 50);
    try {
      localStorage.setItem('lmc:logs:' + _uid(), JSON.stringify(state.logs));
    } catch (e) { /* ignore */ }
  }

  function _loadLogs() {
    try {
      var raw = localStorage.getItem('lmc:logs:' + _uid());
      if (raw) {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          state.logs = arr;
          return;
        }
      }
    } catch (e) { /* ignore */ }
    state.logs = [];
  }

  // 从 Supabase cr_logs 加载最近活动
  async function _loadSupabaseLogs() {
    if (!global.SUPABASE || !global.Auth || !global.Auth.currentUser) return;
    try {
      var supabase = global.SUPABASE;
      var from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      var res = await supabase.from('cr_logs')
        .select('id, source, created_at, meta')
        .eq('user_id', global.Auth.currentUser.id)
        .gte('created_at', from)
        .order('created_at', { ascending: false })
        .limit(10);
      if (res && res.data && Array.isArray(res.data)) {
        res.data.forEach(function (row) {
          state.logs.push({
            id: row.id,
            level: 'activity',
            message: _humanizeSource(row.source),
            meta: row.meta,
            at: new Date(row.created_at).getTime(),
            fromSupabase: true
          });
        });
        // 按时间倒序
        state.logs.sort(function (a, b) { return b.at - a.at; });
        if (state.logs.length > 50) state.logs = state.logs.slice(0, 50);
      }
    } catch (e) {
      console.warn('[LMC] loadSupabaseLogs failed', e);
    }
  }

  function _humanizeSource(s) {
    var map = {
      'online_time': '学习时长记录',
      'practice': '完成刷题',
      'review': '完成复习',
      'classroom': '专项练习',
      'lab': '虚拟实验室',
      'photo_quiz': '拍照答题',
      'pomodoro': '完成专注计时'
    };
    return map[s] || ('活动：' + s);
  }

  // 加载答题进度
  async function _loadProgress() {
    state.progress = { answered: 0, needed: 10, available: 0 };
    // 优先从 Supabase 取
    if (global.SUPABASE && global.Auth && global.Auth.currentUser) {
      try {
        var supabase = global.SUPABASE;
        // 今日已答
        var todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        var answeredRes = await supabase.from('behavior_logs')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', global.Auth.currentUser.id)
          .eq('event', 'answer')
          .gte('created_at', todayStart.toISOString());
        state.progress.answered = (answeredRes && answeredRes.count) || 0;
        // 可答：题目池（用 supabase 的 question-bank 估算）
        try {
          var poolRes = await supabase.from('question_bank')
            .select('id', { count: 'exact', head: true })
            .limit(1);
          state.progress.available = (poolRes && poolRes.count) || 50;
        } catch (e) {
          state.progress.available = 50; // 兜底
        }
      } catch (e) {
        console.warn('[LMC] loadProgress failed', e);
      }
    }
  }

  // ---------- 渲染 ----------
  function initLearningHub(target) {
    if (!target) return;
    state.target = target;
    state.userId = _uid();
    state.tasks = _loadTasks();
    _loadLogs();
    _render();
    // 异步加载
    _loadProgress().then(function () { _renderProgress(); _addLog('info', '学习管理中心已加载'); });
    _loadSupabaseLogs().then(function () { _renderLogs(); });
  }

  function _render() {
    if (!state.target) return;
    var html = `
      <div class="lmc-wrap">
        <div class="lmc-header">
          <h1>📚 学习管理中心</h1>
          <div class="lmc-subtitle">参考 Deadline Quest 设计 · 今日任务 + 进度 + AI 抢救</div>
        </div>

        <div class="lmc-grid">
          <!-- 左侧：今日任务 + 时间线 -->
          <div class="lmc-col lmc-col-main">
            <div class="lmc-card">
              <div class="lmc-card-header">
                <h2>🎯 今日任务（${state.tasks.length}）</h2>
                <button class="lmc-btn lmc-btn-ghost" id="lmc-add-task-btn">+ 新建</button>
              </div>
              <div class="lmc-task-list" id="lmc-task-list"></div>
            </div>

            <div class="lmc-card">
              <div class="lmc-card-header">
                <h2>📅 截止时间线</h2>
              </div>
              <div class="lmc-timeline" id="lmc-timeline"></div>
            </div>
          </div>

          <!-- 右侧：进度 + 抢救 + 日志 -->
          <div class="lmc-col lmc-col-side">
            <div class="lmc-card lmc-card-progress" id="lmc-progress-card">
              <div class="lmc-card-header">
                <h2>📊 答题进度</h2>
              </div>
              <div class="lmc-progress" id="lmc-progress"></div>
            </div>

            <div class="lmc-card lmc-card-rescue" id="lmc-rescue-card" style="display:none;">
              <div class="lmc-card-header">
                <h2>🆘 AI 抢救方案</h2>
              </div>
              <div class="lmc-rescue" id="lmc-rescue"></div>
            </div>

            <div class="lmc-card">
              <div class="lmc-card-header">
                <h2>📋 任务日志 <span class="lmc-log-count">${state.logs.length} 条</span></h2>
                <button class="lmc-btn lmc-btn-ghost" id="lmc-clear-logs-btn">清空</button>
              </div>
              <div class="lmc-logs" id="lmc-logs"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    state.target.innerHTML = html;
    _renderTasks();
    _renderTimeline();
    _renderProgress();
    _renderLogs();
    _checkRescue();
    _bindEvents();
  }

  function _renderTasks() {
    var el = document.getElementById('lmc-task-list');
    if (!el) return;
    if (state.tasks.length === 0) {
      el.innerHTML = '<div class="lmc-empty">暂无任务，点击「+ 新建」添加</div>';
      return;
    }
    el.innerHTML = state.tasks.map(function (t) {
      var statusBadge = {
        'pending': '<span class="lmc-badge lmc-badge-pending">待开始</span>',
        'running': '<span class="lmc-badge lmc-badge-running">进行中</span>',
        'done': '<span class="lmc-badge lmc-badge-done">已完成</span>',
        'failed': '<span class="lmc-badge lmc-badge-failed">未完成</span>',
        'aborted': '<span class="lmc-badge lmc-badge-aborted">已放弃</span>'
      }[t.status] || '';
      var priorityDot = { 'high': '🔴', 'medium': '🟡', 'low': '🟢' }[t.priority] || '⚪';
      var typeIcon = { 'classroom': '🎓', 'practice': '✏️', 'review': '🔁', 'custom': '📌' }[t.type] || '📌';
      var dueText = _formatDue(t.dueAt);
      var dueClass = t.dueAt < Date.now() ? 'lmc-due-overdue' : (t.dueAt - Date.now() < 3600000 ? 'lmc-due-soon' : '');
      var progressBar = t.progress > 0
        ? '<div class="lmc-task-progress"><div class="lmc-task-progress-fill" style="width:' + t.progress + '%;"></div></div>'
        : '';
      var sourceLabel = { 'ai-breakdown': '🤖 AI 细化', 'manual': '👤 手动', 'auto-review': '🔁 自动' }[t.source] || ('来源：' + t.source);
      return `
        <div class="lmc-task ${dueClass}" data-task-id="${t.id}">
          <div class="lmc-task-icon">${typeIcon}</div>
          <div class="lmc-task-body">
            <div class="lmc-task-title" data-action="edit-task" data-task-id="${t.id}" style="cursor:pointer;">${_escapeHtml(t.title)} <span class="lmc-task-priority">${priorityDot}</span></div>
            <div class="lmc-task-meta">
              ${statusBadge}
              <span class="lmc-due ${dueClass}">📅 ${dueText}</span>
              <span class="lmc-task-source">${sourceLabel}</span>
            </div>
            ${progressBar}
          </div>
          <div class="lmc-task-actions">
            ${t.status !== 'done' ? '<button class="lmc-btn lmc-btn-primary lmc-btn-sm" data-action="mark-done" data-task-id="' + t.id + '" title="标记完成">✓</button>' : ''}
            ${t.type === 'classroom' ? '<button class="lmc-btn lmc-btn-primary lmc-btn-sm" data-action="start-classroom" data-topic="' + _escapeAttr(t.topic || t.title) + '">🎓 课堂</button>' : ''}
            ${t.type === 'practice' ? '<button class="lmc-btn lmc-btn-primary lmc-btn-sm" data-action="start-practice" data-topic="' + _escapeAttr(t.topic || t.title) + '">✏️ 刷题</button>' : ''}
            ${t.type === 'review' ? '<button class="lmc-btn lmc-btn-primary lmc-btn-sm" data-action="start-review" data-topic="' + _escapeAttr(t.topic || t.title) + '">🔁 复习</button>' : ''}
            <button class="lmc-btn lmc-btn-ghost lmc-btn-sm" data-action="edit-task" data-task-id="${t.id}" title="编辑">✎</button>
            <button class="lmc-btn lmc-btn-ghost lmc-btn-sm" data-action="delete-task" data-task-id="${t.id}" title="删除">×</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function _renderTimeline() {
    var el = document.getElementById('lmc-timeline');
    if (!el) return;
    if (state.tasks.length === 0) {
      el.innerHTML = '<div class="lmc-empty">暂无任务</div>';
      return;
    }
    // 按 dueAt 排序
    var sorted = state.tasks.slice().sort(function (a, b) { return a.dueAt - b.dueAt; });
    var now = Date.now();
    el.innerHTML = sorted.map(function (t, i) {
      var daysFromNow = Math.ceil((t.dueAt - now) / 86400000);
      var dayLabel = daysFromNow < 0 ? ('已过 ' + (-daysFromNow) + ' 天') : (daysFromNow === 0 ? '今天' : ('还有 ' + daysFromNow + ' 天'));
      var typeIcon = { 'classroom': '🎓', 'practice': '✏️', 'review': '🔁', 'custom': '📌' }[t.type] || '📌';
      return `
        <div class="lmc-tl-item ${t.status === 'done' ? 'lmc-tl-done' : ''}">
          <div class="lmc-tl-dot"></div>
          <div class="lmc-tl-line"></div>
          <div class="lmc-tl-body">
            <div class="lmc-tl-title">${typeIcon} ${_escapeHtml(t.title)}</div>
            <div class="lmc-tl-time">${dayLabel} · ${_formatTime(t.dueAt)}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function _renderProgress() {
    var el = document.getElementById('lmc-progress');
    if (!el) return;
    var p = state.progress;
    var pct = p.needed > 0 ? Math.min(100, Math.round((p.answered / p.needed) * 100)) : 0;
    el.innerHTML = `
      <div class="lmc-prog-stat">
        <div class="lmc-prog-big">${p.answered} <span class="lmc-prog-target">/ ${p.needed}</span></div>
        <div class="lmc-prog-label">今日已答题数</div>
      </div>
      <div class="lmc-prog-bar">
        <div class="lmc-prog-bar-fill" style="width:${pct}%;"></div>
      </div>
      <div class="lmc-prog-foot">
        <span>进度：${pct}%</span>
        <span>还可答：${p.available} 题</span>
      </div>
      ${p.answered >= p.needed ? '<div class="lmc-prog-done">✅ 已达到目标！</div>' : ''}
    `;
  }

  function _renderLogs() {
    var el = document.getElementById('lmc-logs');
    if (!el) return;
    if (state.logs.length === 0) {
      el.innerHTML = '<div class="lmc-empty">暂无日志</div>';
      return;
    }
    el.innerHTML = state.logs.slice(0, 10).map(function (log) {
      var levelIcon = { 'info': 'ℹ️', 'success': '✅', 'warning': '⚠️', 'error': '❌', 'activity': '📝' }[log.level] || 'ℹ️';
      return `
        <div class="lmc-log-item lmc-log-${log.level}">
          <span class="lmc-log-icon">${levelIcon}</span>
          <span class="lmc-log-msg">${_escapeHtml(log.message)}</span>
          <span class="lmc-log-time">${_formatTimeShort(log.at)}</span>
        </div>
      `;
    }).join('');
  }

  function _checkRescue() {
    // 检查连续 3 天未完成任务
    var threeDaysAgo = Date.now() - 3 * 86400000;
    var recentTasks = state.tasks.filter(function (t) { return t.createdAt > threeDaysAgo; });
    var failed = recentTasks.filter(function (t) { return t.status === 'failed' || (t.status === 'pending' && t.dueAt < Date.now()); });
    if (failed.length >= 2) {
      var card = document.getElementById('lmc-rescue-card');
      var body = document.getElementById('lmc-rescue');
      if (card) card.style.display = 'block';
      if (body) {
        body.innerHTML = `
          <div class="lmc-rescue-msg">⚠️ 检测到 ${failed.length} 个未完成任务。AI 建议：</div>
          <ul class="lmc-rescue-list">
            <li>🎯 把任务拆分成 2-3 个 25 分钟专注块</li>
            <li>📚 优先完成 <strong>${_escapeHtml(failed[0].title)}</strong>（最高优先级）</li>
            <li>🤖 使用 AI 对话规划路径或进入专项练习直接刷题</li>
          </ul>
          <button class="lmc-btn lmc-btn-primary" id="lmc-apply-rescue-btn">应用 AI 抢救方案</button>
        `;
        document.getElementById('lmc-apply-rescue-btn').addEventListener('click', _applyRescuePlan);
      }
    }
  }

  function _applyRescuePlan() {
    _addLog('warning', '应用 AI 抢救方案');
    // 自动标记最高优先级任务
    var failed = state.tasks.filter(function (t) { return t.status === 'pending' && t.dueAt < Date.now(); });
    if (failed.length > 0) {
      failed[0].priority = 'high';
      _saveTasks();
      _renderTasks();
      _renderTimeline();
      _addLog('success', '已调整任务优先级为「高」');
    }
  }

  // ---------- 任务操作 ----------
  function addTask(task) {
    var t = {
      id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      type: task.type || 'custom',
      title: task.title || '新任务',
      topic: task.topic || task.title || '',
      status: 'pending',
      priority: task.priority || 'medium',
      dueAt: task.dueAt || _endOfDay(new Date()),
      progress: 0,
      createdAt: Date.now(),
      source: task.source || 'manual'
    };
    state.tasks.unshift(t);
    _saveTasks();
    _addLog('info', '新建任务：' + t.title);
    _renderTasks();
    _renderTimeline();
  }

  function deleteTask(taskId) {
    var idx = state.tasks.findIndex(function (t) { return t.id === taskId; });
    if (idx < 0) return;
    var t = state.tasks[idx];
    state.tasks.splice(idx, 1);
    _saveTasks();
    _addLog('info', '删除任务：' + t.title);
    _renderTasks();
    _renderTimeline();
  }

  function markTaskDone(taskId) {
    var t = state.tasks.find(function (t) { return t.id === taskId; });
    if (!t) return;
    t.status = 'done';
    t.progress = 100;
    _saveTasks();
    _addLog('success', '完成任务：' + t.title);
    _renderTasks();
    _renderTimeline();
  }

  // ---------- 事件绑定 ----------
  function _bindEvents() {
    if (!state.target) return;
    var addBtn = state.target.querySelector('#lmc-add-task-btn');
    if (addBtn) addBtn.addEventListener('click', _showAddTaskDialog);
    var clearBtn = state.target.querySelector('#lmc-clear-logs-btn');
    if (clearBtn) clearBtn.addEventListener('click', _clearLogs);
    state.target.addEventListener('click', _delegateClick);
  }

  function _delegateClick(e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;
    var action = target.getAttribute('data-action');
    if (action === 'start-classroom') {
      // AI 课堂模块已移除，统一跳到专项练习（保留老任务 data-action 兼容）
      var topic = target.getAttribute('data-topic');
      _addLog('info', '进入专项练习：' + topic);
      _startPracticeFromHub(topic);
    } else if (action === 'start-practice') {
      var topic2 = target.getAttribute('data-topic');
      _addLog('info', '从 LMC 启动刷题：' + topic2);
      _startPracticeFromHub(topic2);
    } else if (action === 'start-review') {
      var topic3 = target.getAttribute('data-topic');
      _addLog('info', '从 LMC 启动复习：' + topic3);
      _startReviewFromHub(topic3);
    } else if (action === 'delete-task') {
      var taskId = target.getAttribute('data-task-id');
      _showConfirm('确定删除此任务？', function (ok) {
        if (ok) deleteTask(taskId);
      });
      return;
    } else if (action === 'edit-task') {
      var taskIdEdit = target.getAttribute('data-task-id');
      _showEditTaskDialog(taskIdEdit);
      return;
    } else if (action === 'mark-done') {
      var taskIdDone = target.getAttribute('data-task-id');
      markTaskDone(taskIdDone);
      return;
    } else if (action === 'ai-breakdown') {
      _showAIBreakdownDialog();
      return;
    }
  }

  // ---------- 自定义模态框（替代 window.prompt / confirm，避免 Trae 预览错误） ----------
  // v4.0 a11y：当前活跃的焦点陷阱句柄（_closeModal 时释放）
  var _activeModalTrap = null;
  function _setupModalTrap(backdrop, initialFocus) {
    if (typeof window.BioQuestA11y === 'object' && window.BioQuestA11y &&
        typeof window.BioQuestA11y.trapFocus === 'function') {
      _activeModalTrap = window.BioQuestA11y.trapFocus(backdrop, {
        onEscape: function () { _closeModal(); },
        initialFocus: initialFocus || null
      });
    }
  }

  function _showConfirm(message, onResult) {
    _closeModal();
    var backdrop = document.createElement('div');
    backdrop.className = 'lmc-modal-backdrop';
    backdrop.innerHTML = `
      <div class="lmc-modal" role="dialog" aria-modal="true" aria-label="确认">
        <div class="lmc-modal-title">提示</div>
        <div class="lmc-modal-body">${_escapeHtml(message)}</div>
        <div class="lmc-modal-actions">
          <button class="lmc-btn lmc-btn-ghost" data-modal-cancel>取消</button>
          <button class="lmc-btn lmc-btn-primary" data-modal-ok>确定</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.querySelector('[data-modal-cancel]').addEventListener('click', function () { _closeModal(); onResult && onResult(false); });
    backdrop.querySelector('[data-modal-ok]').addEventListener('click', function () { _closeModal(); onResult && onResult(true); });
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) { _closeModal(); onResult && onResult(false); } });
    _setupModalTrap(backdrop, backdrop.querySelector('[data-modal-ok]'));
  }

  function _showModal(opts) {
    _closeModal();
    var backdrop = document.createElement('div');
    backdrop.className = 'lmc-modal-backdrop';
    var content = opts.content || '';
    var title = opts.title || '';
    var actions = (opts.actions || []).map(function (a, i) {
      return '<button class="lmc-btn ' + (a.primary ? 'lmc-btn-primary' : 'lmc-btn-ghost') + '" data-modal-action="' + i + '">' + _escapeHtml(a.label) + '</button>';
    }).join('');
    backdrop.innerHTML = `
      <div class="lmc-modal lmc-modal--wide" role="dialog" aria-modal="true" aria-label="${_escapeHtml(title)}">
        <div class="lmc-modal-title">${_escapeHtml(title)}</div>
        <div class="lmc-modal-body">${content}</div>
        <div class="lmc-modal-actions">${actions}</div>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) { _closeModal(); opts.onCancel && opts.onCancel(); }
    });
    var actionButtons = backdrop.querySelectorAll('[data-modal-action]');
    actionButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-modal-action'), 10);
        var a = opts.actions[idx];
        if (a && a.handler) {
          a.handler(btn, function (close) { if (close !== false) _closeModal(); });
        } else {
          _closeModal();
        }
      });
    });
    // v4.0 a11y：优先聚焦第一个表单输入框，否则聚焦第一个按钮
    var initialFocus = backdrop.querySelector('input, textarea, select') || backdrop.querySelector('[data-modal-action]');
    _setupModalTrap(backdrop, initialFocus);
    return backdrop;
  }

  function _closeModal() {
    if (_activeModalTrap) { _activeModalTrap.release(); _activeModalTrap = null; }
    var existing = document.querySelector('.lmc-modal-backdrop');
    if (existing) existing.remove();
  }

  // ---------- 新建任务对话框（替代 prompt） ----------
  function _showAddTaskDialog() {
    var content = `
      <div class="lmc-form">
        <label class="lmc-form-label">
          <span>任务标题</span>
          <input type="text" class="lmc-form-input" id="lmc-form-title" placeholder="例如：复习细胞分裂" autofocus />
        </label>
        <label class="lmc-form-label">
          <span>任务类型</span>
          <select class="lmc-form-input" id="lmc-form-type">
            <option value="custom">📌 自定义</option>
            <option value="practice">✏️ 刷题</option>
            <option value="review">🔁 复习</option>
          </select>
        </label>
        <label class="lmc-form-label">
          <span>优先级</span>
          <select class="lmc-form-input" id="lmc-form-priority">
            <option value="low">🟢 低</option>
            <option value="medium" selected>🟡 中</option>
            <option value="high">🔴 高</option>
          </select>
        </label>
        <label class="lmc-form-label">
          <span>截止时间</span>
          <input type="datetime-local" class="lmc-form-input" id="lmc-form-due" />
        </label>
      </div>
    `;
    _showModal({
      title: '新建任务',
      content: content,
      actions: [
        { label: '取消', handler: function () { _closeModal(); } },
        { label: '新建', primary: true, handler: function (btn, close) {
          var title = (document.getElementById('lmc-form-title') || {}).value;
          if (!title || !title.trim()) {
            showFieldError('lmc-form-title', '请输入任务标题');
            return;
          }
          var type = (document.getElementById('lmc-form-type') || {}).value || 'custom';
          var priority = (document.getElementById('lmc-form-priority') || {}).value || 'medium';
          var dueVal = (document.getElementById('lmc-form-due') || {}).value;
          var dueAt = dueVal ? new Date(dueVal).getTime() : _endOfDay(new Date());
          addTask({ title: title.trim(), type: type, priority: priority, dueAt: dueAt });
          close();
        } }
      ]
    });
    // 设置默认截止时间为今天 23:59
    setTimeout(function () {
      var dueInput = document.getElementById('lmc-form-due');
      if (dueInput) {
        var d = new Date(); d.setHours(23, 59, 0, 0);
        var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
        dueInput.value = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
      }
    }, 50);
  }

  // ---------- 编辑任务 ----------
  function _showEditTaskDialog(taskId) {
    var t = state.tasks.find(function (t) { return t.id === taskId; });
    if (!t) return;
    var content = `
      <div class="lmc-form">
        <label class="lmc-form-label">
          <span>任务标题</span>
          <input type="text" class="lmc-form-input" id="lmc-edit-title" value="${_escapeAttr(t.title)}" />
        </label>
        <label class="lmc-form-label">
          <span>任务类型</span>
          <select class="lmc-form-input" id="lmc-edit-type">
            <option value="custom" ${t.type === 'custom' ? 'selected' : ''}>📌 自定义</option>
            <option value="practice" ${t.type === 'practice' || t.type === 'classroom' ? 'selected' : ''}>✏️ 刷题</option>
            <option value="review" ${t.type === 'review' ? 'selected' : ''}>🔁 复习</option>
          </select>
        </label>
        <label class="lmc-form-label">
          <span>优先级</span>
          <select class="lmc-form-input" id="lmc-edit-priority">
            <option value="low" ${t.priority === 'low' ? 'selected' : ''}>🟢 低</option>
            <option value="medium" ${t.priority === 'medium' ? 'selected' : ''}>🟡 中</option>
            <option value="high" ${t.priority === 'high' ? 'selected' : ''}>🔴 高</option>
          </select>
        </label>
        <label class="lmc-form-label">
          <span>截止时间</span>
          <input type="datetime-local" class="lmc-form-input" id="lmc-edit-due" value="${_toDateTimeLocal(t.dueAt)}" />
        </label>
      </div>
    `;
    _showModal({
      title: '编辑任务',
      content: content,
      actions: [
        { label: '删除', handler: function () {
          _closeModal();
          deleteTask(taskId);
        } },
        { label: '标记完成', handler: function () {
          _closeModal();
          markTaskDone(taskId);
        } },
        { label: '保存', primary: true, handler: function (btn, close) {
          var title = (document.getElementById('lmc-edit-title') || {}).value;
          if (!title || !title.trim()) {
            showFieldError('lmc-edit-title', '请输入任务标题');
            return;
          }
          t.title = title.trim();
          t.type = (document.getElementById('lmc-edit-type') || {}).value;
          t.priority = (document.getElementById('lmc-edit-priority') || {}).value;
          var dueVal = (document.getElementById('lmc-edit-due') || {}).value;
          if (dueVal) t.dueAt = new Date(dueVal).getTime();
          _saveTasks();
          _addLog('info', '已更新任务：' + t.title);
          _renderTasks();
          _renderTimeline();
          close();
        } }
      ]
    });
  }

  // ---------- AI 自动细化目标为任务 ----------
  function _showAIBreakdownDialog() {
    var content = `
      <div class="lmc-form">
        <label class="lmc-form-label">
          <span>学习目标</span>
          <textarea class="lmc-form-input" id="lmc-ai-goal" rows="3" placeholder="例如：3 周内掌握遗传的基本规律，能解 60% 的相关题" autofocus></textarea>
        </label>
        <label class="lmc-form-label">
          <span>细化粒度</span>
          <select class="lmc-form-input" id="lmc-ai-granularity">
            <option value="3">3 个子任务（极简）</option>
            <option value="5" selected>5 个子任务（推荐）</option>
            <option value="8">8 个子任务（详细）</option>
          </select>
        </label>
        <div class="lmc-ai-tip">
          💡 AI 会根据目标生成可执行的学习计划，每条任务都关联到 刷题/复习/自定义 模块
        </div>
      </div>
    `;
    _showModal({
      title: '🤖 AI 自动细化目标',
      content: content,
      actions: [
        { label: '取消', handler: function () { _closeModal(); } },
        { label: '生成任务', primary: true, handler: function (btn, close) {
          var goal = ((document.getElementById('lmc-ai-goal') || {}).value || '').trim();
          if (!goal) {
            showFieldError('lmc-ai-goal', '请输入学习目标');
            return;
          }
          var granularity = parseInt((document.getElementById('lmc-ai-granularity') || {}).value, 10) || 5;
          btn.disabled = true;
          btn.textContent = '生成中...';
          _aiBreakdownGoal(goal, granularity).then(function (newTasks) {
            newTasks.forEach(function (t) { addTask(t); });
            _addLog('success', 'AI 已细化 ' + newTasks.length + ' 个子任务');
            close();
            _showConfirm('已生成 ' + newTasks.length + ' 个子任务，是否立即进入第一个任务的专项练习？', function (ok) {
              if (ok && newTasks[0]) _startPracticeFromHub(newTasks[0].topic || newTasks[0].title);
            });
          }).catch(function (err) {
            btn.disabled = false;
            btn.textContent = '生成任务';
            _showConfirm('AI 细化失败：' + (err.message || err) + '\n将使用本地规则降级生成。', function (ok) {
              if (ok) {
                _localBreakdownFallback(goal, granularity).forEach(function (t) { addTask(t); });
                _addLog('warning', 'AI 细化失败，使用本地规则降级');
                close();
              }
            });
          });
        } }
      ]
    });
  }

  async function _aiBreakdownGoal(goal, granularity) {
    if (!global.AIClient || !global.AIClient.chat) {
      return _localBreakdownFallback(goal, granularity);
    }
    var prompt = `你是一个学习规划助手。请将以下学习目标细化为 ${granularity} 个可执行的学习子任务。

目标：${goal}

输出 JSON 数组，每个元素包含：
- title: 子任务标题（5-15 字）
- topic: 关联知识点（用于启动 刷题/复习）
- type: 任务类型（practice|review|custom）
- priority: 优先级（high|medium|low）
- durationDays: 完成所需天数（1-7）

只输出 JSON 数组，不要解释。示例：
[{"title":"掌握基因的基本概念","topic":"基因的表达","type":"practice","priority":"high","durationDays":2}]`;
    var text = await global.AIClient.chat(prompt, { stage: 'task-breakdown', temperature: 0.5 });
    return _parseAITasks(text, granularity) || _localBreakdownFallback(goal, granularity);
  }

  function _parseAITasks(text, fallbackCount) {
    if (!text) return null;
    // 容错：尝试直接 parse / 提取 JSON 数组
    var arr = null;
    try { arr = JSON.parse(text); } catch (e) {
      var match = text.match(/\[[\s\S]*?\]/);
      if (match) { try { arr = JSON.parse(match[0]); } catch (e) {} }
    }
    if (!Array.isArray(arr) || arr.length === 0) return null;
    var now = Date.now();
    return arr.slice(0, fallbackCount || 5).map(function (t, i) {
      var duration = parseInt(t.durationDays, 10) || 2;
      // AI 课堂模块已移除：classroom 统一改派到刷题 practice（新规划不再产出 classroom）
      var tp = (t.type === 'classroom') ? 'practice' : (t.type || 'practice');
      return {
        type: tp,
        title: t.title || '子任务 ' + (i + 1),
        topic: t.topic || t.title || '',
        priority: t.priority || 'medium',
        dueAt: now + duration * 86400000,
        source: 'ai-breakdown'
      };
    });
  }

  function _localBreakdownFallback(goal, count) {
    // 本地降级：基于关键词模板生成（AI 课堂已移除，原 classroom 全部归到 practice）
    var templates = [
      { type: 'practice', title: '了解 ' + goal + ' 的核心概念', topic: goal, priority: 'high', durationDays: 1 },
      { type: 'practice', title: '学习 ' + goal + ' 的关键过程', topic: goal, priority: 'high', durationDays: 2 },
      { type: 'practice', title: '完成 ' + goal + ' 基础练习', topic: goal, priority: 'medium', durationDays: 1 },
      { type: 'practice', title: '完成 ' + goal + ' 进阶练习', topic: goal, priority: 'medium', durationDays: 2 },
      { type: 'review',   title: '复习 ' + goal + ' 错题', topic: goal, priority: 'low', durationDays: 1 },
      { type: 'practice', title: '深入理解 ' + goal + ' 的应用场景', topic: goal, priority: 'medium', durationDays: 2 },
      { type: 'practice', title: '完成 ' + goal + ' 综合题', topic: goal, priority: 'medium', durationDays: 2 },
      { type: 'review',   title: '复盘 ' + goal + ' 整体框架', topic: goal, priority: 'low', durationDays: 1 }
    ];
    var now = Date.now();
    return templates.slice(0, count || 5).map(function (t) {
      return Object.assign({}, t, { dueAt: now + (t.durationDays || 2) * 86400000, source: 'ai-breakdown' });
    });
  }

  function _toDateTimeLocal(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function showFieldError(inputId, message) {
    var input = document.getElementById(inputId);
    if (!input) return;
    input.style.borderColor = '#ef4444';
    input.focus();
    // 2s 后恢复
    setTimeout(function () { input.style.borderColor = ''; }, 2000);
    _addLog('warning', message);
  }

  // ---------- 清空日志（替换 confirm） ----------
  function _clearLogs() {
    _showConfirm('确定清空所有日志？', function (ok) {
      if (!ok) return;
      state.logs = [];
      try { localStorage.removeItem('lmc:logs:' + _uid()); } catch (e) {}
      _renderLogs();
    });
  }

  // ---------- 启动器（跳转到对应模块） ----------
  // 注意：_startClassroomFromHub 已被移除（AI 课堂模块下线）。为兼容老书签/历史
  // 任务中的 start-classroom action，_delegateClick 已经把它映射到 _startPracticeFromHub。
  function _startPracticeFromHub(topic) {
    location.hash = '#/practice?topic=' + encodeURIComponent(topic);
  }
  function _startReviewFromHub(topic) {
    location.hash = '#/review?topic=' + encodeURIComponent(topic);
  }

  // ---------- 工具 ----------
  var _escapeHtml = window.escapeHtml;
  function _escapeAttr(s) { return _escapeHtml(s).replace(/"/g, '&quot;'); }
  function _formatTime(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
  function _formatTimeShort(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  function _formatDue(ts) {
    if (!ts) return '';
    var diff = ts - Date.now();
    if (diff < 0) return '已过期';
    if (diff < 3600000) return Math.round(diff / 60000) + ' 分钟后';
    if (diff < 86400000) return Math.round(diff / 3600000) + ' 小时后';
    return Math.round(diff / 86400000) + ' 天后';
  }

  // ---------- 暴露 ----------
  global.LearningHub = {
    init: initLearningHub,
    addTask: addTask,
    deleteTask: deleteTask,
    markTaskDone: markTaskDone,
    addLog: _addLog,
    // 暴露给学习模块的待办 Tab 使用
    _showAIBreakdownDialog: _showAIBreakdownDialog,
    _showAddTaskDialog: _showAddTaskDialog,
    _showConfirm: _showConfirm,
    _showModal: _showModal
  };
  global.initLearningHub = initLearningHub;
})(window);
