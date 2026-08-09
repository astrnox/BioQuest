/*!
 * openmaic-generation-progress.js
 * 移植自 OpenMAIC generation-preview 页面（44KB page.tsx）
 *
 * 原始布局：
 *  - 顶部 Header（返回 + 标题 + 状态）
 *  - 左侧 6 步进度列表（图标 + 状态 + 描述）
 *  - 右侧 当前步骤的可视化动画（StepVisualizer）
 *  - 底部 步骤详情（描述 + 数据流）
 *  - 完成态：进入课堂按钮
 *
 * 移植：纯 DOM 工厂，提供 open() / update() / close() 三种方法
 *
 * v3.3 增强：
 *  - 单例锁：同时只允许一个生成任务（避免并发）
 *  - 实时进度条（细粒度：0.1s 更新一次）
 *  - 剩余时间显示（基于已用时间 × 比例推算）
 *  - 用户可随时退出（点击 X 或按 Esc）
 *  - 完成时弹出轻量 toast 通知
 *
 * 暴露：
 *   window.OpenMAICGenProgress = {
 *     open(opts): 打开并开始生成（opts: { topic, hooks, container? })
 *     close(): 关闭
 *     setStepStatus(idx, status, data): 手动控制步骤状态
 *     isActive(): 是否正在生成
 *   }
 */

(function (global) {
  'use strict';

  // ---------- 单例锁 ----------
  let activeSession = null; // { token, modal, state, timers, aborted }

  function isActive() {
    return activeSession !== null;
  }

  function abortActive() {
    if (activeSession) {
      activeSession.aborted = true;
      cleanupTimers(activeSession);
      removeModal(activeSession.modal);
      activeSession = null;
    }
  }

  // ---------- 6 步元数据（按 preset 区分） ----------
  const STEP_PRESETS = {
    // OpenMAIC 范式 6 步
    'omaic': [
      { id: 'pdf-analysis',     title: '分析 PDF',     desc: '解析上传的教材材料',     type: 'analysis' },
      { id: 'web-search',       title: '网络搜索',     desc: '检索相关知识背景',       type: 'analysis' },
      { id: 'outline',          title: '生成大纲',     desc: '规划课堂结构',           type: 'writing'  },
      { id: 'agent-generation', title: '智能体生成',   desc: '多角色协同编排',         type: 'writing'  },
      { id: 'slide-content',    title: '生成内容',     desc: 'SLIDE/QUIZ/PBL/WEB',     type: 'visual'   },
      { id: 'actions',          title: '生成动作',     desc: '时间线与交互编排',       type: 'visual'   },
    ],
    // 6 段式（BioQuest 原生）：导入/讲解/模拟/讨论/测验/项目
    'outline-6': [
      { id: 'intro',     title: '导入',   desc: '生活实例 / 问题引入',  type: 'writing'  },
      { id: 'lecture',   title: '讲解',   desc: '核心概念与关键过程',   type: 'writing'  },
      { id: 'simulate',  title: '模拟',   desc: '虚拟实验 / 探究',     type: 'visual'   },
      { id: 'discuss',   title: '讨论',   desc: '多角色课堂讨论',       type: 'visual'   },
      { id: 'quiz',      title: '测验',   desc: 'IRT 自适应抽题',       type: 'analysis' },
      { id: 'pbl',       title: '项目',   desc: 'PBL 课后项目设计',     type: 'writing'  },
    ],
    // OpenMAIC DSL：6 步 + 强调 slide / actions
    'dsl': [
      { id: 'pdf-analysis',     title: '分析 PDF',     desc: '解析上传的教材材料',     type: 'analysis' },
      { id: 'web-search',       title: '网络搜索',     desc: '检索相关知识背景',       type: 'analysis' },
      { id: 'outline',          title: '生成大纲',     desc: '规划课堂结构',           type: 'writing'  },
      { id: 'agent-generation', title: '智能体生成',   desc: '多角色协同编排',         type: 'writing'  },
      { id: 'slide-content',    title: '生成 Slide',  desc: 'DSL 多元素 Slide',      type: 'visual'   },
      { id: 'actions',          title: '生成 Actions', desc: '时间线与交互编排',       type: 'visual'   },
    ],
  };

  // ---------- 注入 CSS ----------
  let cssInjected = false;
  function injectCSS() {
    if (cssInjected) return;
    cssInjected = true;
    const css = `
      .omaic-gp-backdrop {
        position: fixed; inset: 0; z-index: 9999;
        background: linear-gradient(135deg, rgba(248,250,252,.96), rgba(241,245,249,.96));
        backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center;
        animation: omaic-gp-fade-in .3s ease-out;
      }
      @keyframes omaic-gp-fade-in { from { opacity: 0; } to { opacity: 1; } }

      .omaic-gp-modal {
        width: 92vw; max-width: 960px; height: 84vh; max-height: 640px;
        background: #fff; border-radius: 18px;
        box-shadow: 0 24px 60px rgba(15,23,42,.18);
        display: flex; flex-direction: column; overflow: hidden;
        animation: omaic-gp-slide-up .4s cubic-bezier(.34,1.56,.64,1);
      }
      @keyframes omaic-gp-slide-up {
        from { transform: translateY(40px) scale(.95); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
      }

      .omaic-gp-header {
        padding: 16px 24px; border-bottom: 1px solid #f1f5f9;
        display: flex; align-items: center; gap: 16px;
        background: linear-gradient(to right, rgba(238,242,255,.4), rgba(224,231,255,.3));
      }
      .omaic-gp-back {
        width: 36px; height: 36px; border-radius: 10px;
        background: #f1f5f9; border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        color: #475569; transition: all .2s;
        font-size: 18px; line-height: 1;
      }
      .omaic-gp-back:hover { background: #e2e8f0; color: #1e293b; }
      .omaic-gp-title { font-size: 18px; font-weight: 700; color: #1e293b; flex: 1; }
      .omaic-gp-topic { font-size: 13px; color: #64748b; margin-top: 2px; }
      .omaic-gp-status-pill {
        padding: 6px 12px; border-radius: 9999px;
        font-size: 12px; font-weight: 600;
        display: flex; align-items: center; gap: 6px;
      }
      .omaic-gp-status-pill.running { background: #dbeafe; color: #1d4ed8; }
      .omaic-gp-status-pill.done    { background: #d1fae5; color: #047857; }
      .omaic-gp-status-pill.error   { background: #fee2e2; color: #b91c1c; }
      .omaic-gp-status-pill.aborted { background: #f1f5f9; color: #64748b; }
      .omaic-gp-status-dot {
        width: 8px; height: 8px; border-radius: 9999px; background: currentColor;
        animation: omaic-gp-pulse 1.4s ease-in-out infinite;
      }
      .omaic-gp-status-pill.done .omaic-gp-status-dot,
      .omaic-gp-status-pill.aborted .omaic-gp-status-dot { animation: none; }

      .omaic-gp-body { flex: 1; display: flex; min-height: 0; }
      .omaic-gp-steps {
        width: 280px; border-right: 1px solid #f1f5f9;
        padding: 20px 16px; overflow-y: auto;
        background: linear-gradient(to bottom, #fafbff, #fff);
      }
      .omaic-gp-step {
        display: flex; align-items: flex-start; gap: 12px;
        padding: 12px 14px; border-radius: 12px;
        margin-bottom: 8px; position: relative;
        transition: all .3s;
      }
      .omaic-gp-step.active {
        background: linear-gradient(135deg, #eff6ff, #f5f3ff);
        box-shadow: 0 4px 12px rgba(59,130,246,.08);
      }
      .omaic-gp-step.done { opacity: .65; }
      .omaic-gp-step-connector {
        position: absolute; left: 27px; top: 44px; bottom: -8px;
        width: 2px; background: #e2e8f0; z-index: 0;
      }
      .omaic-gp-step:last-child .omaic-gp-step-connector { display: none; }
      .omaic-gp-step-icon {
        width: 28px; height: 28px; border-radius: 9999px;
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; font-weight: 700; flex-shrink: 0;
        position: relative; z-index: 1;
        background: #f1f5f9; color: #94a3b8;
      }
      .omaic-gp-step.active .omaic-gp-step-icon {
        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        color: #fff; box-shadow: 0 4px 12px rgba(59,130,246,.3);
      }
      .omaic-gp-step.done .omaic-gp-step-icon { background: #10b981; color: #fff; }
      .omaic-gp-step-text { flex: 1; min-width: 0; }
      .omaic-gp-step-title { font-size: 13px; font-weight: 600; color: #1e293b; }
      .omaic-gp-step-desc { font-size: 11px; color: #94a3b8; margin-top: 2px; }

      .omaic-gp-stage {
        flex: 1; display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        padding: 32px; position: relative;
        background: radial-gradient(ellipse at center, rgba(238,242,255,.4), transparent 70%);
      }
      .omaic-gp-stage-visual {
        width: 280px; height: 280px;
        display: flex; align-items: center; justify-content: center;
        position: relative;
      }
      .omaic-gp-stage-info { text-align: center; margin-top: 20px; }
      .omaic-gp-stage-title { font-size: 16px; font-weight: 700; color: #1e293b; }
      .omaic-gp-stage-desc { font-size: 13px; color: #64748b; margin-top: 4px; }
      .omaic-gp-stage-data {
        margin-top: 16px; padding: 10px 16px;
        background: rgba(241,245,249,.5); border-radius: 8px;
        font-size: 11px; color: #475569;
        font-family: monospace; max-width: 400px;
        max-height: 60px; overflow: auto;
      }

      .omaic-gp-footer {
        padding: 16px 24px; border-top: 1px solid #f1f5f9;
        display: flex; align-items: center; gap: 12px;
        background: #fafbff;
      }
      .omaic-gp-progress-wrap { flex: 1; display: flex; align-items: center; gap: 12px; }
      .omaic-gp-progress {
        flex: 1; height: 8px; background: #e2e8f0; border-radius: 9999px; overflow: hidden;
      }
      .omaic-gp-progress-bar {
        height: 100%; width: 0;
        background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899);
        border-radius: 9999px;
        transition: width .3s ease-out;
        position: relative; overflow: hidden;
      }
      .omaic-gp-progress-bar::after {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,.4), transparent);
        animation: omaic-gp-shine 1.4s linear infinite;
      }
      @keyframes omaic-gp-shine {
        from { transform: translateX(-100%); }
        to { transform: translateX(100%); }
      }
      .omaic-gp-progress-text { font-size: 12px; font-weight: 600; color: #475569; min-width: 80px; text-align: right; }
      .omaic-gp-time-text { font-size: 11px; color: #94a3b8; min-width: 60px; }
      .omaic-gp-action-btn {
        padding: 8px 16px; border-radius: 8px; border: none;
        font-size: 13px; font-weight: 600; cursor: pointer;
        display: flex; align-items: center; gap: 6px;
        transition: all .2s;
      }
      .omaic-gp-action-btn.primary {
        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        color: #fff; box-shadow: 0 4px 12px rgba(59,130,246,.3);
      }
      .omaic-gp-action-btn.primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(59,130,246,.4); }
      .omaic-gp-action-btn.primary:disabled { opacity: .5; cursor: not-allowed; transform: none; }
      .omaic-gp-action-btn.cancel {
        background: #f1f5f9; color: #475569;
      }
      .omaic-gp-action-btn.cancel:hover { background: #e2e8f0; color: #1e293b; }

      @keyframes omaic-gp-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }

      /* 完成态 */
      .omaic-gp-complete {
        text-align: center; padding: 40px;
      }
      .omaic-gp-complete-icon {
        width: 80px; height: 80px; border-radius: 9999px;
        background: linear-gradient(135deg, #34d399, #10b981);
        display: flex; align-items: center; justify-content: center;
        color: #fff; font-size: 36px; margin: 0 auto 20px;
        box-shadow: 0 12px 30px rgba(16,185,129,.3);
        animation: omaic-gp-pop .5s cubic-bezier(.34,1.56,.64,1);
      }
      @keyframes omaic-gp-pop {
        from { transform: scale(0); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      .omaic-gp-complete-title { font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
      .omaic-gp-complete-desc { font-size: 13px; color: #64748b; margin-bottom: 24px; }

      /* Toast 通知 */
      .omaic-gp-toast {
        position: fixed; top: 24px; right: 24px; z-index: 10000;
        background: linear-gradient(135deg, #10b981, #059669);
        color: #fff; padding: 14px 20px; border-radius: 12px;
        font-size: 14px; font-weight: 600;
        box-shadow: 0 12px 30px rgba(16,185,129,.3);
        display: flex; align-items: center; gap: 10px;
        animation: omaic-gp-toast-in .4s cubic-bezier(.34,1.56,.64,1), omaic-gp-toast-out .3s ease-in 3.7s forwards;
        max-width: 360px;
      }
      .omaic-gp-toast.error { background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 12px 30px rgba(239,68,68,.3); }
      .omaic-gp-toast-icon { font-size: 20px; line-height: 1; }
      @keyframes omaic-gp-toast-in {
        from { transform: translateX(100%) translateY(-20px); opacity: 0; }
        to { transform: translateX(0) translateY(0); opacity: 1; }
      }
      @keyframes omaic-gp-toast-out {
        to { transform: translateX(120%); opacity: 0; }
      }

      /* 最小化按钮（在 X 旁边） */
      .omaic-gp-minimize {
        width: 36px; height: 36px; border-radius: 10px;
        background: #f1f5f9; border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        color: #475569; transition: all .2s;
        font-size: 16px; line-height: 1;
        margin-left: -4px;
      }
      .omaic-gp-minimize:hover { background: #e2e8f0; color: #1e293b; }
      .omaic-gp-minimize::before { content: '−'; font-weight: 700; }

      /* 悬浮球（最小化后） */
      .omaic-gp-pill {
        position: fixed; bottom: 24px; right: 24px; z-index: 9998;
        background: #fff; border-radius: 9999px;
        box-shadow: 0 12px 30px rgba(15,23,42,.18), 0 0 0 1px rgba(15,23,42,.06);
        padding: 10px 18px;
        display: flex; align-items: center; gap: 10px;
        cursor: pointer; user-select: none;
        transition: all .3s cubic-bezier(.34,1.56,.64,1);
        animation: omaic-gp-pill-in .4s cubic-bezier(.34,1.56,.64,1);
      }
      .omaic-gp-pill:hover { transform: translateY(-2px) scale(1.03); box-shadow: 0 16px 40px rgba(15,23,42,.24); }
      .omaic-gp-pill-icon {
        width: 32px; height: 32px; border-radius: 9999px;
        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        color: #fff; display: flex; align-items: center; justify-content: center;
        font-size: 14px; font-weight: 700; position: relative;
      }
      .omaic-gp-pill-icon.done { background: linear-gradient(135deg, #10b981, #059669); }
      .omaic-gp-pill-icon::after {
        content: ''; position: absolute; inset: -3px;
        border-radius: 9999px; border: 2px solid currentColor;
        opacity: 0; animation: omaic-gp-pill-ring 2s ease-out infinite;
      }
      .omaic-gp-pill-icon.done::after { display: none; }
      @keyframes omaic-gp-pill-ring {
        0% { opacity: .6; transform: scale(1); }
        100% { opacity: 0; transform: scale(1.4); }
      }
      .omaic-gp-pill-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .omaic-gp-pill-title { font-size: 12px; font-weight: 700; color: #1e293b; white-space: nowrap; max-width: 160px; overflow: hidden; text-overflow: ellipsis; }
      .omaic-gp-pill-sub { font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 4px; }
      .omaic-gp-pill-bar {
        width: 60px; height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden; flex-shrink: 0;
      }
      .omaic-gp-pill-bar-fill {
        height: 100%; background: linear-gradient(90deg, #3b82f6, #8b5cf6);
        border-radius: 2px; transition: width .3s ease-out;
      }
      .omaic-gp-pill-bar-fill.done { background: linear-gradient(90deg, #10b981, #059669); }
      .omaic-gp-pill-arrow { color: #94a3b8; font-size: 14px; }
      .omaic-gp-pill-pulse { animation: omaic-gp-pill-pulse 1.5s ease-in-out infinite; }
      @keyframes omaic-gp-pill-pulse {
        0%, 100% { box-shadow: 0 12px 30px rgba(59,130,246,.25), 0 0 0 1px rgba(15,23,42,.06); }
        50% { box-shadow: 0 12px 30px rgba(59,130,246,.45), 0 0 0 1px rgba(59,130,246,.2); }
      }
      @keyframes omaic-gp-pill-in {
        from { transform: translateY(40px) scale(.8); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
      }
    `;
    const style = document.createElement('style');
    style.id = 'omaic-gp-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ---------- 工具 ----------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function showToast(message, type = 'ok') {
    const toast = document.createElement('div');
    toast.className = 'omaic-gp-toast' + (type === 'error' ? ' error' : '');
    toast.innerHTML = `
      <span class="omaic-gp-toast-icon">${type === 'error' ? '✕' : '✓'}</span>
      <span>${escapeHtml(message)}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 4000);
  }

  function formatTime(seconds) {
    if (seconds < 0 || !isFinite(seconds)) return '--';
    if (seconds < 60) return Math.round(seconds) + 's';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return m + 'm' + s + 's';
  }

  function cleanupTimers(session) {
    if (session.timers) {
      session.timers.forEach(t => {
        try {
          if (t.type === 'interval') clearInterval(t.handle);
          else if (t.type === 'timeout') clearTimeout(t.handle);
        } catch (e) { /* ignore */ }
      });
    }
    session.timers = [];
    if (session.escHandler) {
      document.removeEventListener('keydown', session.escHandler);
      session.escHandler = null;
    }
  }

  function addTimer(session, type, handle) {
    if (!session.timers) session.timers = [];
    session.timers.push({ type, handle });
  }

  function removeModal(modal) {
    if (modal && modal.parentNode) {
      const vis = modal.querySelector('.omaic-gp-stage-visual');
      if (vis && global.OpenMAICVisualizers) {
        global.OpenMAICVisualizers.destroyAll(vis);
      }
      modal.remove();
    }
  }

  // ---------- 主入口 ----------
  function open(opts = {}) {
    // 单例锁：同时只允许一个生成
    if (activeSession) {
      console.warn('[GenProgress] 已有生成任务进行中，将被新任务替换');
      abortActive();
    }

    injectCSS();
    const topic = opts.topic || '生物课';
    const presetKey = opts.preset || 'omaic';
    const preset = STEP_PRESETS[presetKey] || STEP_PRESETS.omaic;
    const startTime = Date.now();
    const session = {
      token: Math.random().toString(36).slice(2),
      topic,
      presetKey,
      startTime,
      activeIdx: 0,
      steps: preset.map(s => ({ ...s, status: 'pending', data: null, startAt: 0, endAt: 0 })),
      result: null,
      onComplete: opts.onComplete || null,
      onAbort: opts.onAbort || null,
      hooks: opts.hooks || null,
      aborted: false,
      minimized: false,
      timers: [],
      modal: null,
      pill: null,
      // 用于细粒度进度：每个 step 内部的 0~100% 子进度
      subProgress: 0,
    };
    activeSession = session;

    // 创建 DOM
    const backdrop = document.createElement('div');
    backdrop.className = 'omaic-gp-backdrop';
    backdrop.innerHTML = `
      <div class="omaic-gp-modal" role="dialog" aria-label="课堂生成进度">
        <div class="omaic-gp-header">
          <button class="omaic-gp-back" aria-label="退出生成" title="退出生成 (Esc)">×</button>
          <button class="omaic-gp-minimize" aria-label="最小化" title="最小化 (生成仍在后台进行)">−</button>
          <div style="flex:1;min-width:0;">
            <div class="omaic-gp-title">AI 课堂生成中</div>
            <div class="omaic-gp-topic">${escapeHtml(topic)}</div>
          </div>
          <div class="omaic-gp-status-pill running">
            <div class="omaic-gp-status-dot"></div>
            <span class="omaic-gp-status-text">生成中</span>
          </div>
        </div>
        <div class="omaic-gp-body">
          <div class="omaic-gp-steps"></div>
          <div class="omaic-gp-stage">
            <div class="omaic-gp-stage-visual"></div>
            <div class="omaic-gp-stage-info">
              <div class="omaic-gp-stage-title">${escapeHtml(preset[0].title)}</div>
              <div class="omaic-gp-stage-desc">${escapeHtml(preset[0].desc)}</div>
            </div>
            <div class="omaic-gp-stage-data" style="display:none;"></div>
          </div>
        </div>
        <div class="omaic-gp-footer">
          <div class="omaic-gp-progress-wrap">
            <div class="omaic-gp-progress">
              <div class="omaic-gp-progress-bar"></div>
            </div>
            <div class="omaic-gp-progress-text">0%</div>
            <div class="omaic-gp-time-text">剩余 --</div>
          </div>
          <button class="omaic-gp-action-btn cancel omaic-gp-cancel-btn">退出</button>
          <button class="omaic-gp-action-btn primary omaic-gp-primary-btn" disabled>
            <span class="omaic-gp-action-text">等待生成</span>
            <span>→</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    session.modal = backdrop;

    // 绑定退出（X 按钮 + 取消按钮 + Esc 键）
    const exitHandler = () => {
      if (session.aborted) return;
      if (session.result) return; // 已完成，不响应退出
      session.aborted = true;
      cleanupTimers(session);
      removeModal(session.modal);
      removePill(session);
      if (activeSession === session) activeSession = null;
      if (session.onAbort) {
        try { session.onAbort(); } catch (e) { /* ignore */ }
      }
      showToast('已退出生成', 'error');
    };
    backdrop.querySelector('.omaic-gp-back').addEventListener('click', exitHandler);
    backdrop.querySelector('.omaic-gp-cancel-btn').addEventListener('click', exitHandler);
    session.escHandler = (e) => {
      if (e.key === 'Escape') {
        if (!session.minimized) exitHandler();
      }
    };
    document.addEventListener('keydown', session.escHandler);

    // 绑定最小化 / 恢复
    backdrop.querySelector('.omaic-gp-minimize').addEventListener('click', () => {
      minimize(session);
    });

    // 初次渲染步骤列表 + 当前 step 可视化
    renderSteps(session);
    updateStage(session, 0, {});

    // 启动实时进度刷新（每 100ms）
    const ticker = setInterval(() => updateRealtime(session), 100);
    addTimer(session, 'interval', ticker);

    // 启动生成流程
    runGeneration(session);
  }

  // ---------- 最小化 ----------
  function minimize(session) {
    if (session.aborted || !session.modal) return;
    session.minimized = true;
    session.modal.style.display = 'none';
    if (!session.pill) {
      const pill = document.createElement('div');
      pill.className = 'omaic-gp-pill omaic-gp-pill-pulse';
      pill.title = '点击查看生成进度';
      pill.innerHTML = `
        <div class="omaic-gp-pill-icon">⚙</div>
        <div class="omaic-gp-pill-info">
          <div class="omaic-gp-pill-title">${escapeHtml(session.topic)}</div>
          <div class="omaic-gp-pill-sub">
            <span class="omaic-gp-pill-pct">0%</span>
            <span>·</span>
            <span class="omaic-gp-pill-step">${escapeHtml(session.steps[0].title)}</span>
          </div>
        </div>
        <div class="omaic-gp-pill-bar">
          <div class="omaic-gp-pill-bar-fill omaic-gp-pill-bar-fill-el" style="width:0%;"></div>
        </div>
        <span class="omaic-gp-pill-arrow">↗</span>
      `;
      // 单一 click 委托：根据 session.minimized + session.result 状态决定行为
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        if (session.aborted) return;
        // 如果已完成 → 直接进入课堂
        if (session.result) {
          // 双重保险：先调用 onComplete（带异常捕获）
          try {
            enterClassroom(session);
          } catch (err) {
            console.error('[GenProgress] enterClassroom failed', err);
          }
          return;
        }
        // 否则恢复弹窗
        restore(session);
      });
      document.body.appendChild(pill);
      session.pill = pill;
    } else {
      session.pill.style.display = 'flex';
    }
  }

  // ---------- 进入课堂（统一入口，兼容 modal 按钮和悬浮球） ----------
  function enterClassroom(session) {
    if (session.aborted || !session.result) return;
    const result = session.result;
    // 1. 先清理 UI（保证 ClassroomPlayer.open 不会被旧 DOM 干扰）
    cleanupTimers(session);
    removeModal(session.modal);
    removePill(session);
    if (activeSession === session) activeSession = null;
    // 2. 延迟一帧调用 onComplete（避免与 click 事件传播冲突）
    setTimeout(function () {
      if (session.onComplete) {
        try {
          session.onComplete(result);
        } catch (err) {
          console.error('[GenProgress] onComplete failed', err);
          showToast('进入课堂失败：' + (err.message || err), 'error');
        }
      }
    }, 60);
  }

  // ---------- 恢复 ----------
  function restore(session) {
    if (session.aborted || !session.modal) return;
    session.minimized = false;
    session.modal.style.display = 'flex';
    if (session.pill) {
      session.pill.style.display = 'none';
      // 取消 pulse 动画
      session.pill.classList.remove('omaic-gp-pill-pulse');
    }
  }

  // ---------- 悬浮球辅助 ----------
  function removePill(session) {
    if (session.pill && session.pill.parentNode) {
      session.pill.remove();
      session.pill = null;
    }
  }

  function updatePill(session) {
    if (!session.pill) return;
    const total = session.steps.length;
    let done = 0;
    let current = 0;
    for (let i = 0; i < total; i++) {
      const s = session.steps[i];
      if (s.status === 'done') done++;
      else if (s.status === 'running' && i === session.activeIdx) {
        const doneSteps = session.steps.filter(x => x.status === 'done' && x.endAt > x.startAt);
        const avgMs = doneSteps.length > 0
          ? doneSteps.reduce((sum, x) => sum + (x.endAt - x.startAt), 0) / doneSteps.length
          : 1000;
        const elapsed = Date.now() - s.startAt;
        current = Math.min(0.95, elapsed / avgMs);
      }
    }
    const ratio = (done + current) / total;
    const pct = Math.min(99.9, Math.round(ratio * 100));
    const pctEl = session.pill.querySelector('.omaic-gp-pill-pct');
    const stepEl = session.pill.querySelector('.omaic-gp-pill-step');
    const barEl = session.pill.querySelector('.omaic-gp-pill-bar-fill');
    if (pctEl) pctEl.textContent = pct + '%';
    if (stepEl) stepEl.textContent = session.steps[session.activeIdx].title;
    if (barEl) barEl.style.width = pct + '%';
  }

  function markPillDone(session) {
    if (!session.pill) return;
    const icon = session.pill.querySelector('.omaic-gp-pill-icon');
    const pctEl = session.pill.querySelector('.omaic-gp-pill-pct');
    const stepEl = session.pill.querySelector('.omaic-gp-pill-step');
    const barEl = session.pill.querySelector('.omaic-gp-pill-bar-fill');
    if (icon) { icon.classList.add('done'); icon.textContent = '✓'; }
    if (pctEl) pctEl.textContent = '100%';
    if (stepEl) stepEl.textContent = '已完成 · 点击上课';
    if (barEl) { barEl.style.width = '100%'; barEl.classList.add('done'); }
    session.pill.classList.remove('omaic-gp-pill-pulse');
  }

  // ---------- 实时刷新（进度条 + 剩余时间） ----------
  function updateRealtime(session) {
    if (!session.modal || session.aborted) return;
    const total = session.steps.length;
    let completedWeight = 0;
    let currentWeight = 0;
    for (let i = 0; i < total; i++) {
      const s = session.steps[i];
      if (s.status === 'done') {
        completedWeight += 1;
      } else if (s.status === 'running' && i === session.activeIdx) {
        // 当前步骤用真实时间比例作为子进度
        if (s.startAt > 0) {
          // 估算当前步骤还需要多久：基于已完成步骤的平均时长
          const doneSteps = session.steps.filter(x => x.status === 'done' && x.endAt > x.startAt);
          const avgStepMs = doneSteps.length > 0
            ? doneSteps.reduce((sum, x) => sum + (x.endAt - x.startAt), 0) / doneSteps.length
            : 1000; // 默认 1s
          const elapsed = Date.now() - s.startAt;
          currentWeight = Math.min(0.95, elapsed / avgStepMs);
        }
      }
    }
    const ratio = (completedWeight + currentWeight) / total;
    const pct = Math.min(99.9, ratio * 100);
    const bar = session.modal.querySelector('.omaic-gp-progress-bar');
    const text = session.modal.querySelector('.omaic-gp-progress-text');
    const timeText = session.modal.querySelector('.omaic-gp-time-text');
    if (bar) bar.style.width = pct.toFixed(1) + '%';
    if (text) text.textContent = Math.round(pct) + '%';

    // 剩余时间估算
    if (timeText) {
      const elapsedMs = Date.now() - session.startTime;
      if (ratio < 0.01) {
        timeText.textContent = '剩余 --';
      } else {
        const totalEstimated = elapsedMs / ratio;
        const remainingMs = totalEstimated - elapsedMs;
        timeText.textContent = '剩余 ' + formatTime(remainingMs / 1000);
      }
    }

    // 同步更新悬浮球
    if (session.minimized) {
      updatePill(session);
    }
  }

  // ---------- 步骤列表渲染 ----------
  function renderSteps(session) {
    if (!session.modal) return;
    const list = session.modal.querySelector('.omaic-gp-steps');
    list.innerHTML = session.steps.map((s, i) => `
      <div class="omaic-gp-step ${i === session.activeIdx ? 'active' : (s.status === 'done' ? 'done' : '')}" data-idx="${i}">
        <div class="omaic-gp-step-connector"></div>
        <div class="omaic-gp-step-icon">${s.status === 'done' ? '✓' : (i + 1)}</div>
        <div class="omaic-gp-step-text">
          <div class="omaic-gp-step-title">${escapeHtml(s.title)}</div>
          <div class="omaic-gp-step-desc">${escapeHtml(s.desc)}</div>
        </div>
      </div>
    `).join('');
  }

  // ---------- 更新右侧舞台 ----------
  function updateStage(session, stepIdx, data) {
    if (!session.modal || session.aborted) return;
    const step = session.steps[stepIdx];
    const stage = session.modal.querySelector('.omaic-gp-stage');
    const vis = stage.querySelector('.omaic-gp-stage-visual');
    const titleEl = stage.querySelector('.omaic-gp-stage-title');
    const descEl = stage.querySelector('.omaic-gp-stage-desc');
    const dataEl = stage.querySelector('.omaic-gp-stage-data');

    if (global.OpenMAICVisualizers) {
      global.OpenMAICVisualizers.destroyAll(vis);
    }
    vis.innerHTML = '';
    const newVis = global.OpenMAICVisualizers.createStepVisualizer(step.id, data || {});
    vis.appendChild(newVis);

    titleEl.textContent = step.title;
    descEl.textContent = step.desc;

    if (data && data.preview) {
      dataEl.style.display = 'block';
      dataEl.textContent = data.preview;
    } else {
      dataEl.style.display = 'none';
    }
  }

  // ---------- 手动控制步骤状态 ----------
  function setStepStatus(idx, status, data) {
    if (!activeSession) return;
    const session = activeSession;
    if (idx < 0 || idx >= session.steps.length) return;
    const now = Date.now();
    session.steps[idx].status = status;
    if (data !== undefined) session.steps[idx].data = data;
    if (status === 'running') {
      session.activeIdx = idx;
      session.steps[idx].startAt = session.steps[idx].startAt || now;
    } else if (status === 'done') {
      session.steps[idx].endAt = now;
      session.steps[idx].startAt = session.steps[idx].startAt || now;
    }
    renderSteps(session);
    if (status === 'running') {
      updateStage(session, idx, data || {});
    }
  }

  // ---------- 完成态 ----------
  function markAllDone(session, result) {
    if (session.aborted) return;
    session.steps.forEach(s => s.status = 'done');
    renderSteps(session);

    const headerPill = session.modal.querySelector('.omaic-gp-status-pill');
    headerPill.className = 'omaic-gp-status-pill done';
    headerPill.querySelector('.omaic-gp-status-text').textContent = '已完成';

    // 进度条 100%
    const bar = session.modal.querySelector('.omaic-gp-progress-bar');
    const text = session.modal.querySelector('.omaic-gp-progress-text');
    const timeText = session.modal.querySelector('.omaic-gp-time-text');
    if (bar) bar.style.width = '100%';
    if (text) text.textContent = '100%';
    if (timeText) {
      const elapsed = (Date.now() - session.startTime) / 1000;
      timeText.textContent = '用时 ' + formatTime(elapsed);
    }

    const stage = session.modal.querySelector('.omaic-gp-stage');
    const vis = stage.querySelector('.omaic-gp-stage-visual');
    const info = stage.querySelector('.omaic-gp-stage-info');
    if (global.OpenMAICVisualizers) {
      global.OpenMAICVisualizers.destroyAll(vis);
    }
    vis.innerHTML = `
      <div class="omaic-gp-complete">
        <div class="omaic-gp-complete-icon">✓</div>
        <div class="omaic-gp-complete-title">课堂已就绪</div>
        <div class="omaic-gp-complete-desc">${escapeHtml(session.topic)} 的全部内容已生成完毕</div>
      </div>
    `;
    info.style.display = 'none';

    const cancelBtn = session.modal.querySelector('.omaic-gp-cancel-btn');
    if (cancelBtn) cancelBtn.style.display = 'none';

    const btn = session.modal.querySelector('.omaic-gp-primary-btn');
    btn.disabled = false;
    btn.classList.remove('cancel');
    btn.classList.add('primary');
    btn.querySelector('.omaic-gp-action-text').textContent = '开始上课';
    // 替换原 click handler（用 enterClassroom 统一处理）
    btn.onclick = () => {
      enterClassroom(session);
    };

    // 如果当前是最小化状态，更新悬浮球为「已完成」
    if (session.minimized) {
      markPillDone(session);
    }

    // 弹出 toast
    showToast('课堂生成完毕 ✓', 'ok');
  }

  // ---------- 生成流程（带 abort 检查） ----------
  async function runGeneration(session) {
    const hooks = session.hooks || {};
    for (let i = 0; i < session.steps.length; i++) {
      if (session.aborted) return;
      const step = session.steps[i];
      session.steps[i].startAt = Date.now();
      setStepStatus(i, 'running', { sources: [], outlines: [] });
      try {
        if (hooks.onStepStart) {
          await hooks.onStepStart(i, step);
          if (session.aborted) return;
        }
        // 模拟处理时间（保证动画可见）
        await sleepInterruptible(session, 600 + Math.random() * 400);
        if (session.aborted) return;
        if (hooks.onStepEnd) {
          await hooks.onStepEnd(i, step);
          if (session.aborted) return;
        }
        session.steps[i].endAt = Date.now();
        setStepStatus(i, 'done');
      } catch (e) {
        console.error('[GenProgress] step failed', i, e);
        session.steps[i].endAt = Date.now();
        setStepStatus(i, 'error');
        await sleepInterruptible(session, 200);
      }
    }
    if (session.aborted) return;
    session.result = { topic: session.topic, steps: session.steps };
    markAllDone(session, session.result);
  }

  // 可中断的 sleep
  function sleepInterruptible(session, ms) {
    return new Promise(resolve => {
      const t = setTimeout(() => {
        // 清理 timer 引用
        if (session.timers) {
          const idx = session.timers.findIndex(x => x.handle === t);
          if (idx >= 0) session.timers.splice(idx, 1);
        }
        resolve();
      }, ms);
      addTimer(session, 'timeout', t);
    });
  }

  // ---------- 关闭 ----------
  function close() {
    if (activeSession) {
      removeModal(activeSession.modal);
      removePill(activeSession);
      cleanupTimers(activeSession);
      activeSession = null;
    }
  }

  // ---------- 主动最小化（外部调用） ----------
  function minimizeActive() {
    if (activeSession) minimize(activeSession);
  }

  // ---------- 主动恢复（外部调用） ----------
  function restoreActive() {
    if (activeSession) restore(activeSession);
  }

  // ---------- 暴露 ----------
  global.OpenMAICGenProgress = {
    open,
    close,
    setStepStatus,
    isActive,
    minimize: minimizeActive,
    restore: restoreActive,
  };
})(window);
