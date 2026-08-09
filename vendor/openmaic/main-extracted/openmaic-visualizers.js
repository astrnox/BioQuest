/*!
 * openmaic-visualizers.js
 * 纯前端移植自 OpenMAIC 的 generation-preview 6 步可视化动画
 * 原项目：Next.js + React + motion/react + lucide-react
 * 移植：纯 DOM + CSS animation + requestAnimationFrame，零依赖
 *
 * 6 个 step：
 *  - pdf-analysis     PDF 扫描激光
 *  - web-search       搜索结果高亮
 *  - outline          流式大纲卡片
 *  - agent-generation 三张浮动卡
 *  - slide-content    SLIDE/QUIZ/PBL/WEB 4 类型轮播
 *  - actions          5 步动作时间线
 *
 * 暴露：
 *   window.OpenMAICVisualizers = {
 *     ALL_STEPS,                              // 6 步元数据
 *     createStepVisualizer(stepId, opts),     // 工厂：返回 HTMLElement
 *     destroyAll(),                           // 清理所有动画
 *     _internal: { animate, easings, ... }    // 内部工具
 *   }
 */

(function (global) {
  'use strict';

  // ---------- 内部工具 ----------
  const EASE = {
    linear: t => t,
    easeInOut: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    easeOut: t => 1 - Math.pow(1 - t, 3),
    spring: t => {
      // 简化 spring：stiffness=200, damping=20 的近似
      return 1 - Math.exp(-6 * t) * Math.cos(8 * t);
    },
  };

  // 简单缓动动画
  function animate(opts) {
    const {
      from, to, duration = 600, easing = EASE.easeOut, onUpdate, onComplete,
    } = opts;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const e = easing(t);
      const value = from + (to - from) * e;
      try { onUpdate && onUpdate(value, e, t); } catch (e) { /* ignore */ }
      if (t < 1) requestAnimationFrame(tick);
      else onComplete && onComplete();
    };
    requestAnimationFrame(tick);
  }

  // 循环动画（CSS keyframes 替代品）
  function loop(duration, onFrame) {
    const start = performance.now();
    const tick = (now) => {
      const t = ((now - start) % duration) / duration;
      try { onFrame(t, now); } catch (e) { /* ignore */ }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // 注入 CSS（只在第一次调用时）
  let cssInjected = false;
  function injectCSS() {
    if (cssInjected) return;
    cssInjected = true;
    const css = `
      .omaic-vis { position: relative; display: flex; align-items: center; justify-content: center; }
      .omaic-vis * { box-sizing: border-box; }
      .omaic-vis .glow { position: absolute; border-radius: 9999px; filter: blur(40px); pointer-events: none; }
      .omaic-vis .card { background: #fff; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.08); overflow: hidden; position: relative; }
      .omaic-vis .badge { position: absolute; top: 6px; right: 6px; z-index: 20; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; border: 1px solid; }
      .omaic-vis .scan-beam { position: absolute; left: -150%; width: 60%; height: 100%; background: linear-gradient(to top right, transparent, rgba(255,255,255,.3), transparent); transform: skewX(-12deg); animation: omaic-scan 2s linear infinite; pointer-events: none; }
      @keyframes omaic-scan { 0% { left: -150%; } 100% { left: 200%; } }
      .omaic-vis .pulse-dot { width: 6px; height: 6px; border-radius: 9999px; }
      .omaic-vis .skeleton-bar { background: #e2e8f0; border-radius: 2px; }
      .omaic-vis .pulse { animation: omaic-pulse 1.4s ease-in-out infinite; }
      @keyframes omaic-pulse { 0%, 100% { opacity: .3; } 50% { opacity: 1; } }
      .omaic-vis .float-card { width: 56px; height: 80px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,.85); font-weight: 700; font-size: 18px; box-shadow: 0 8px 20px rgba(0,0,0,.15); }
      .omaic-vis .content-slide { position: absolute; inset: 0; display: flex; flex-direction: column; padding: 12px; background: #fff; border-radius: 12px; border: 1px solid; box-shadow: 0 10px 30px rgba(0,0,0,.08); opacity: 0; transform: translateX(50px) scale(.9); transition: opacity .3s, transform .3s; }
      .omaic-vis .content-slide.active { opacity: 1; transform: translateX(0) scale(1); }

      /* 主题色（浅） */
      .omaic-vis .t-blue   { color: #2563eb; }
      .omaic-vis .t-purple { color: #9333ea; }
      .omaic-vis .t-amber  { color: #d97706; }
      .omaic-vis .t-emerald{ color: #059669; }
      .omaic-vis .t-teal   { color: #0d9488; }
      .omaic-vis .t-violet { color: #7c3aed; }
      .omaic-vis .t-cyan   { color: #06b6d4; }
      .omaic-vis .b-blue   { background: #dbeafe; border-color: #93c5fd; }
      .omaic-vis .b-purple { background: #f3e8ff; border-color: #d8b4fe; }
      .omaic-vis .b-amber  { background: #fef3c7; border-color: #fcd34d; }
      .omaic-vis .b-emerald{ background: #d1fae5; border-color: #6ee7b7; }
      .omaic-vis .b-teal   { background: #ccfbf1; border-color: #5eead4; }
      .omaic-vis .b-violet { background: #ede9fe; border-color: #c4b5fd; }
    `;
    const style = document.createElement('style');
    style.id = 'omaic-visualizers-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // 简单 icon（用 unicode/SVG，不依赖 lucide）
  const ICON = {
    scan: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8v8"/><path d="M11 8v8"/><path d="M15 8v8"/><path d="M17 8v8"/></svg>',
    search: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    globe: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20z"/></svg>',
    fileText: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
    bot: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
    layout: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>',
    clapper: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/><path d="m6.2 5.3 3.1 3.9"/><path d="m12.4 3.4 3.1 3.9"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>',
    message: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    focus: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
    chart: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 16V8"/><path d="M11 16v-4"/><path d="M15 16v-2"/><path d="M19 16v-6"/></svg>',
    puzzle: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z"/></svg>',
    mouse: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 13l6 6"/><path d="M4 4l3 3"/><path d="M17 4l-3 3"/><path d="M4 17l3-3"/><path d="M14 4l6 6"/></svg>',
  };

  // 通用销毁句柄池
  const cleanupFns = new WeakMap();
  function trackCleanup(el, fn) {
    if (!cleanupFns.has(el)) cleanupFns.set(el, []);
    cleanupFns.get(el).push(fn);
  }
  function destroyEl(el) {
    const fns = cleanupFns.get(el);
    if (fns) fns.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
    cleanupFns.delete(el);
    el.innerHTML = '';
  }

  // ---------- 6 个 Visualizer ----------

  // 1. PDF 扫描激光
  function PdfScanVisualizer() {
    const root = document.createElement('div');
    root.className = 'omaic-vis';
    root.style.width = '128px';
    root.style.height = '128px';
    root.innerHTML = `
      <div style="position:absolute;inset:8px;background:rgba(6,182,212,.05);border-radius:16px;filter:blur(20px;"></div>
      <div class="card" style="width:80px;height:112px;border:1px solid #e2e8f0;">
        <div style="padding:12px 12px 0;">
          <div class="skeleton-bar" style="height:6px;width:80%;margin-bottom:8px;"></div>
          <div class="skeleton-bar" style="height:6px;width:60%;margin-bottom:8px;"></div>
          <div class="skeleton-bar" style="height:6px;width:90%;margin-bottom:8px;"></div>
          <div class="skeleton-bar" style="height:6px;width:45%;margin-bottom:8px;"></div>
          <div class="skeleton-bar" style="height:6px;width:70%;"></div>
        </div>
        <div class="omaic-laser" style="position:absolute;left:0;right:0;height:2px;background:linear-gradient(to right, transparent, #22d3ee, transparent);box-shadow:0 0 12px rgba(34,211,238,.6);"></div>
      </div>
      <div style="position:absolute;top:-4px;right:-4px;color:rgba(6,182,212,.7);" class="omaic-scan-icon">${ICON.scan}</div>
    `;
    // 激光循环
    const laser = root.querySelector('.omaic-laser');
    let top = 5, dir = 1;
    let raf;
    const tick = () => {
      top += dir * 0.5;
      if (top >= 90) dir = -1;
      if (top <= 5) dir = 1;
      laser.style.top = top + '%';
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    trackCleanup(root, () => cancelAnimationFrame(raf));
    return root;
  }

  // 2. Web Search 搜索结果
  function WebSearchVisualizer(sources = []) {
    const root = document.createElement('div');
    root.className = 'omaic-vis';
    root.style.width = '224px';
    root.style.height = '224px';
    root.innerHTML = `
      <div class="glow" style="inset:0;background:rgba(20,184,166,.08);"></div>
      <div class="card" style="width:176px;border:1px solid #e2e8f0;">
        <div style="padding:8px 12px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:8px;">
          <span class="t-teal">${ICON.search}</span>
          <div style="flex:1;height:16px;background:#f8fafc;border-radius:9999px;display:flex;align-items:center;padding:0 8px;">
            <div style="height:6px;width:70%;background:rgba(20,184,166,.25);border-radius:9999px;"></div>
          </div>
        </div>
        <div class="omaic-results" style="padding:8px;position:relative;"></div>
        <div class="scan-beam"></div>
      </div>
      <div class="omaic-source-badge" style="position:absolute;top:-8px;right:-8px;height:24px;padding:0 8px;border-radius:9999px;background:#14b8a6;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;gap:4px;box-shadow:0 4px 10px rgba(20,184,166,.25);display:none;">
        <span class="t-emerald" style="color:#fff;">${ICON.globe}</span>
        <span class="omaic-source-count">0</span>
      </div>
    `;

    const resultsEl = root.querySelector('.omaic-results');
    const badge = root.querySelector('.omaic-source-badge');
    const countEl = root.querySelector('.omaic-source-count');

    // 渲染列表
    const display = sources.length > 0 ? sources.slice(0, 4) : [
      { title: '...', url: '...' },
      { title: '...', url: '...' },
      { title: '...', url: '...' },
      { title: '...', url: '...' },
    ];

    display.forEach((s, i) => {
      const row = document.createElement('div');
      row.className = 'omaic-row';
      row.style.cssText = 'padding:4px 8px;position:relative;border-radius:6px;';
      if (sources.length === 0) {
        row.innerHTML = `
          <div class="skeleton-bar pulse" style="height:6px;width:70%;margin-bottom:4px;animation-delay:${i * 0.15}s;"></div>
          <div class="skeleton-bar pulse" style="height:4px;width:45%;margin-bottom:4px;animation-delay:${i * 0.15}s;"></div>
          <div style="display:flex;gap:4px;">
            <div class="skeleton-bar pulse" style="height:4px;flex:1;animation-delay:${i * 0.15}s;"></div>
            <div class="skeleton-bar pulse" style="height:4px;width:33%;animation-delay:${i * 0.15}s;"></div>
          </div>
        `;
      } else {
        const url = (s.url || '').replace(/^https?:\/\/(www\.)?/, '').slice(0, 32);
        row.innerHTML = `
          <div class="omaic-title" style="font-size:8px;font-weight:600;color:#0d9488;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(s.title || '')}</div>
          <div style="font-size:6px;color:rgba(20,184,166,.5);line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(url)}</div>
          <div style="display:flex;gap:4px;margin-top:2px;">
            <div style="height:2px;flex:1;background:#f1f5f9;border-radius:9999px;"></div>
            <div style="height:2px;width:33%;background:#f1f5f9;border-radius:9999px;"></div>
          </div>
        `;
      }
      resultsEl.appendChild(row);
    });

    // 高亮滑动
    if (sources.length > 0) {
      badge.style.display = 'flex';
      countEl.textContent = sources.length;
      const highlight = document.createElement('div');
      highlight.style.cssText = 'position:absolute;left:8px;right:8px;height:32px;border-radius:8px;background:rgba(20,184,166,.06);transition:transform .3s cubic-bezier(.34,1.56,.64,1);';
      resultsEl.appendChild(highlight);
      const rows = resultsEl.querySelectorAll('.omaic-row');
      let active = 0;
      const timer = setInterval(() => {
        active = (active + 1) % rows.length;
        highlight.style.transform = `translateY(${active * 38}px)`;
        rows.forEach((r, i) => {
          const t = r.querySelector('.omaic-title');
          if (t) t.style.color = i === active ? '#0d9488' : '#64748b';
        });
      }, 1400);
      trackCleanup(root, () => clearInterval(timer));
    }

    // 呼吸光晕
    const glow = root.querySelector('.glow');
    const glowAnim = loop(3500, (t) => {
      const scale = 1 + Math.sin(t * Math.PI * 2) * 0.075;
      glow.style.transform = `scale(${scale})`;
      glow.style.opacity = 0.3 + Math.sin(t * Math.PI * 2) * 0.1;
    });
    trackCleanup(root, glowAnim);
    return root;
  }

  // 3. 流式大纲
  function StreamingOutlineVisualizer(outlines = []) {
    const root = document.createElement('div');
    root.className = 'omaic-vis';
    root.style.cssText = 'width:160px;height:208px;';
    root.innerHTML = `
      <div class="card" style="width:100%;height:100%;border:1px solid #e2e8f0;padding:16px;transform:rotate(-2deg);transition:transform .5s;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:0;right:0;height:4px;background:rgba(59,130,246,.5);"></div>
        <div style="width:33%;height:8px;background:#e2e8f0;border-radius:2px;margin-bottom:12px;"></div>
        <div class="omaic-outline-lines" style="font-family:monospace;font-size:8px;color:#64748b;line-height:1.4;"></div>
        <div class="omaic-rec-dot pulse" style="position:absolute;bottom:12px;right:12px;width:6px;height:6px;background:#3b82f6;border-radius:9999px;"></div>
      </div>
    `;
    const lines = root.querySelector('.omaic-outline-lines');
    const card = root.querySelector('.card');
    card.addEventListener('mouseenter', () => card.style.transform = 'rotate(0)');
    card.addEventListener('mouseleave', () => card.style.transform = 'rotate(-2deg)');

    if (outlines.length === 0) {
      // 骨架
      [60, 80, 50, 70].forEach((w, i) => {
        const bar = document.createElement('div');
        bar.className = 'skeleton-bar pulse';
        bar.style.cssText = `height:6px;width:${w}%;margin-bottom:6px;animation-delay:${i * 0.2}s;`;
        lines.appendChild(bar);
      });
    } else {
      outlines.forEach((o, i) => {
        const title = document.createElement('div');
        title.textContent = `${i + 1}. ${o.title || ''}`;
        title.style.cssText = 'color:#2563eb;font-weight:600;font-size:9px;margin-bottom:2px;';
        title.style.animation = 'omaic-fade-in .3s';
        lines.appendChild(title);
        (o.keyPoints || []).slice(0, 2).forEach((kp) => {
          const text = kp.length > 18 ? kp.substring(0, 18) + '...' : kp;
          const sub = document.createElement('div');
          sub.textContent = `   • ${text}`;
          sub.style.cssText = 'padding-left:4px;opacity:.8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
          lines.appendChild(sub);
        });
      });
    }
    return root;
  }

  // 4. 智能体生成（三张浮动卡）
  function AgentGenerationVisualizer() {
    const root = document.createElement('div');
    root.className = 'omaic-vis';
    root.style.cssText = 'width:240px;height:160px;';
    root.innerHTML = `<div style="display:flex;gap:12px;"></div>`;
    const container = root.firstChild;
    for (let i = 0; i < 3; i++) {
      const card = document.createElement('div');
      card.className = 'float-card';
      card.style.background = 'linear-gradient(135deg, #a78bfa, #3b82f6)';
      card.textContent = '?';
      container.appendChild(card);
      let t = i * 0.3;
      const anim = loop(1500, (tt) => {
        t += 0.016;
        const phase = (t * Math.PI * 2) / 1.5 + i * 0.3;
        card.style.transform = `translateY(${Math.sin(phase) * -8}px) rotate(${Math.sin(phase * 0.7) * 3}deg)`;
      });
      trackCleanup(root, anim);
    }
    return root;
  }

  // 5. 内容轮播（SLIDE/QUIZ/PBL/WEB）
  function ContentVisualizer() {
    const root = document.createElement('div');
    root.className = 'omaic-vis';
    root.style.cssText = 'width:224px;height:224px;';
    root.innerHTML = `
      <div class="glow omaic-glow" style="inset:0;"></div>
      <div class="omaic-content-box" style="width:160px;height:112px;position:relative;"></div>
    `;
    const glow = root.querySelector('.omaic-glow');
    const box = root.querySelector('.omaic-content-box');

    const themes = [
      { key: 'blue', color: 'blue', label: 'SLIDE', border: '#bfdbfe', glow: 'rgba(59,130,246,.1)' },
      { key: 'purple', color: 'purple', label: 'QUIZ', border: '#e9d5ff', glow: 'rgba(168,85,247,.1)' },
      { key: 'amber', color: 'amber', label: 'PBL', border: '#fde68a', glow: 'rgba(245,158,11,.1)' },
      { key: 'emerald', color: 'emerald', label: 'WEB', border: '#a7f3d0', glow: 'rgba(16,185,129,.1)' },
    ];

    function render(idx) {
      const theme = themes[idx];
      box.innerHTML = `
        <div class="card" style="position:absolute;inset:0;border:1px solid ${theme.border};padding:12px;display:flex;flex-direction:column;">
          <div class="badge b-${theme.color} t-${theme.color}" style="position:absolute;top:6px;right:6px;">${theme.label}</div>
          <div class="omaic-content-body" style="flex:1;"></div>
          <div class="scan-beam"></div>
        </div>
      `;
      glow.style.background = theme.glow;
      const body = box.querySelector('.omaic-content-body');
      if (idx === 0) {
        // SLIDE
        body.innerHTML = `
          <div style="height:8px;width:55%;background:rgba(59,130,246,.2);border-radius:9999px;margin-bottom:12px;"></div>
          <div style="display:flex;gap:8px;flex:1;">
            <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
              <div style="height:6px;width:80%;background:#f1f5f9;border-radius:9999px;"></div>
              <div style="height:6px;width:90%;background:#f1f5f9;border-radius:9999px;"></div>
              <div style="height:6px;width:60%;background:#f1f5f9;border-radius:9999px;"></div>
              <div style="height:6px;width:70%;background:#f1f5f9;border-radius:9999px;"></div>
            </div>
            <div style="width:48px;height:48px;background:rgba(59,130,246,.1);border-radius:8px;display:flex;align-items:center;justify-content:center;" class="t-blue">${ICON.chart}</div>
          </div>
        `;
      } else if (idx === 1) {
        // QUIZ
        body.innerHTML = `
          <div style="height:8px;width:75%;background:rgba(168,85,247,.2);border-radius:9999px;margin:0 auto 8px;"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            ${[0, 1, 2, 3].map(i => `
              <div style="height:24px;border:1px solid ${i === 1 ? '#a855f7' : '#f1f5f9'};background:${i === 1 ? '#a855f7' : '#f8fafc'};border-radius:6px;display:flex;align-items:center;padding:0 6px;">
                <div style="width:6px;height:6px;border-radius:9999px;background:${i === 1 ? '#fff' : '#cbd5e1'};margin-right:6px;"></div>
                <div style="height:4px;width:32px;border-radius:9999px;background:${i === 1 ? 'rgba(255,255,255,.5)' : '#e2e8f0'};"></div>
              </div>
            `).join('')}
          </div>
        `;
      } else if (idx === 2) {
        // PBL
        body.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span class="t-amber">${ICON.puzzle}</span>
            <div style="height:8px;width:40%;background:rgba(245,158,11,.2);border-radius:9999px;"></div>
          </div>
          <div style="flex:1;display:flex;gap:8px;">
            ${[0, 1, 2].map(c => `
              <div style="flex:1;background:#f8fafc;border-radius:4px;padding:4px;display:flex;flex-direction:column;gap:4px;">
                <div style="height:4px;width:24px;background:#cbd5e1;border-radius:2px;"></div>
                <div style="height:12px;background:#fff;border:1px solid #e2e8f0;border-radius:2px;"></div>
                <div style="height:12px;background:#fff;border:1px solid #e2e8f0;border-radius:2px;"></div>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        // WEB (Interactive)
        body.innerHTML = `
          <div style="display:flex;align-items:center;gap:4px;padding-bottom:4px;border-bottom:1px solid #f1f5f9;margin-bottom:8px;padding-right:40px;">
            <div style="width:6px;height:6px;border-radius:9999px;background:#f87171;"></div>
            <div style="width:6px;height:6px;border-radius:9999px;background:#fbbf24;"></div>
            <div style="width:6px;height:6px;border-radius:9999px;background:#34d399;"></div>
            <div style="flex:1;height:6px;background:#f1f5f9;border-radius:9999px;margin-left:4px;"></div>
          </div>
          <div style="flex:1;display:flex;gap:8px;">
            <div style="width:33%;background:#f8fafc;border-radius:4px;padding:4px;display:flex;flex-direction:column;gap:4px;">
              <div style="height:4px;background:#e2e8f0;border-radius:9999px;"></div>
              <div style="height:4px;background:#e2e8f0;border-radius:9999px;"></div>
              <div style="height:4px;background:#e2e8f0;border-radius:9999px;"></div>
            </div>
            <div style="flex:1;background:rgba(16,185,129,.05);border:1px solid rgba(16,185,129,.2);border-radius:4px;position:relative;display:flex;align-items:center;justify-content:center;">
              <span class="t-emerald" style="opacity:.3;">${ICON.globe}</span>
              <div class="omaic-mouse" style="position:absolute;" class="t-emerald">${ICON.mouse}</div>
            </div>
          </div>
        `;
        // 鼠标浮动
        const mouse = body.querySelector('.omaic-mouse');
        let t = 0;
        const anim = loop(3000, () => {
          t += 0.016;
          mouse.style.transform = `translate(${20 + Math.sin(t * 2) * 15}px, ${10 + Math.cos(t * 1.5) * 10}px)`;
        });
        trackCleanup(root, anim);
      }
    }

    let idx = 0;
    render(idx);
    const timer = setInterval(() => {
      idx = (idx + 1) % 4;
      render(idx);
    }, 3200);
    trackCleanup(root, () => clearInterval(timer));

    // 呼吸光晕
    const glowAnim = loop(4000, (t) => {
      glow.style.transform = `scale(${1 + Math.sin(t * Math.PI * 2) * 0.1})`;
      glow.style.opacity = 0.3 + Math.sin(t * Math.PI * 2) * 0.15;
    });
    trackCleanup(root, glowAnim);

    return root;
  }

  // 6. Actions 时间线
  function ActionsVisualizer() {
    const root = document.createElement('div');
    root.className = 'omaic-vis';
    root.style.cssText = 'width:224px;height:224px;';
    const items = [
      { icon: 'message', label: 'Speech', color: 'violet' },
      { icon: 'focus', label: 'Spotlight', color: 'amber' },
      { icon: 'message', label: 'Speech', color: 'violet' },
      { icon: 'play', label: 'Interact', color: 'emerald' },
      { icon: 'message', label: 'Speech', color: 'violet' },
    ];
    const iconMap = { message: ICON.message, focus: ICON.focus, play: ICON.play };
    root.innerHTML = `
      <div class="glow" style="inset:0;background:rgba(139,92,246,.08);"></div>
      <div class="card" style="width:176px;border:1px solid #e2e8f0;">
        <div style="padding:8px 12px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:8px;">
          <span class="t-violet">${ICON.clapper}</span>
          <div style="height:6px;width:50%;background:rgba(139,92,246,.2);border-radius:9999px;"></div>
        </div>
        <div class="omaic-action-list" style="padding:8px;position:relative;"></div>
      </div>
    `;
    const list = root.querySelector('.omaic-action-list');
    // 滑动高亮
    const highlight = document.createElement('div');
    highlight.style.cssText = 'position:absolute;left:8px;right:8px;height:28px;border-radius:8px;background:rgba(139,92,246,.06);transition:transform .3s cubic-bezier(.34,1.56,.64,1);';
    list.appendChild(highlight);

    items.forEach((it, i) => {
      const row = document.createElement('div');
      row.className = 'omaic-action-row';
      row.style.cssText = 'position:relative;display:flex;align-items:center;gap:8px;padding:4px 8px;border-radius:8px;height:28px;';
      row.innerHTML = `
        <div class="t-${it.color}" style="width:16px;height:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${iconMap[it.icon]}</div>
        <div style="flex:1;display:flex;align-items:center;gap:6px;">
          <span class="t-${it.color}" style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">${it.label}</span>
          <div style="height:4px;flex:1;background:#f1f5f9;border-radius:9999px;"></div>
        </div>
        <div class="omaic-pulse-dot pulse-dot" style="width:6px;height:6px;border-radius:9999px;background:#7c3aed;opacity:0;"></div>
      `;
      list.appendChild(row);
    });

    let active = 0;
    const rows = list.querySelectorAll('.omaic-action-row');
    const dots = list.querySelectorAll('.omaic-pulse-dot');
    const timer = setInterval(() => {
      active = (active + 1) % items.length;
      highlight.style.transform = `translateY(${active * 34}px)`;
      rows.forEach((r, i) => {
        r.style.opacity = i < active ? 0.4 : 1;
      });
      dots.forEach((d, i) => {
        if (i === active) {
          d.style.opacity = 1;
          d.style.animation = 'omaic-pulse-fast 0.8s ease-in-out infinite';
        } else {
          d.style.opacity = 0;
          d.style.animation = '';
        }
      });
    }, 1600);
    trackCleanup(root, () => clearInterval(timer));

    // 呼吸光晕
    const glow = root.querySelector('.glow');
    const glowAnim = loop(3500, (t) => {
      glow.style.transform = `scale(${1 + Math.sin(t * Math.PI * 2) * 0.075})`;
      glow.style.opacity = 0.3 + Math.sin(t * Math.PI * 2) * 0.1;
    });
    trackCleanup(root, glowAnim);
    return root;
  }

  // ---------- 6 段式专用 Visualizer（导入/讲解/模拟/讨论/测验/项目） ----------

  // 导入：对话气泡 + 钩子文字
  function IntroVisualizer(opts) {
    const root = document.createElement('div');
    root.className = 'omaic-vis';
    root.style.cssText = 'width:280px;height:200px;';
    const text = (opts && opts.preview) || '生活现象 → 学科问题';
    root.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:12px;align-items:center;width:100%;padding:16px;">
        <div class="card" style="width:240px;padding:12px 16px;background:linear-gradient(135deg,#dbeafe,#ede9fe);border:1px solid #c7d2fe;">
          <div style="font-size:11px;color:#6366f1;font-weight:700;margin-bottom:6px;">🎤 老师</div>
          <div class="omaic-typing" style="font-size:13px;color:#1e293b;line-height:1.5;"></div>
        </div>
        <div style="display:flex;gap:6px;">
          ${[0,1,2].map(i => `<div style="width:8px;height:8px;border-radius:9999px;background:#6366f1;animation:omaic-pulse 1.2s ease-in-out infinite;animation-delay:${i*0.2}s;"></div>`).join('')}
        </div>
      </div>
    `;
    const typing = root.querySelector('.omaic-typing');
    let i = 0;
    const fullText = text;
    const tick = setInterval(() => {
      if (i <= fullText.length) {
        typing.textContent = fullText.substring(0, i);
        i++;
      } else {
        i = 0; // 循环打字
      }
    }, 80);
    trackCleanup(root, () => clearInterval(tick));
    return root;
  }

  // 讲解：书本/笔记 + 要点列表
  function LectureVisualizer(opts) {
    const root = document.createElement('div');
    root.className = 'omaic-vis';
    root.style.cssText = 'width:280px;height:240px;';
    const points = (opts && opts.outlines) ? opts.outlines.slice(0, 4) : [
      { title: '核心概念 1', keyPoints: ['定义', '特征'] },
      { title: '核心概念 2', keyPoints: ['过程', '意义'] }
    ];
    root.innerHTML = `
      <div class="card" style="width:240px;border:1px solid #e2e8f0;padding:14px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #f1f5f9;">
          <span style="font-size:20px;">📖</span>
          <div style="flex:1;">
            <div style="height:8px;width:60%;background:linear-gradient(90deg,#10b981,#3b82f6);border-radius:4px;"></div>
            <div style="height:4px;width:40%;background:#e2e8f0;border-radius:2px;margin-top:4px;"></div>
          </div>
        </div>
        <div class="omaic-points" style="display:flex;flex-direction:column;gap:8px;"></div>
        <div class="scan-beam"></div>
      </div>
    `;
    const pointsEl = root.querySelector('.omaic-points');
    points.forEach((p, i) => {
      const item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:flex-start;gap:8px;opacity:0;transform:translateX(-10px);transition:all .4s;';
      const kp = (p.keyPoints || []).slice(0, 2).join(' · ') || '要点';
      item.innerHTML = `
        <div style="width:18px;height:18px;border-radius:9999px;background:#3b82f6;color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;">${i+1}</div>
        <div style="flex:1;font-size:11px;color:#475569;line-height:1.4;">
          <div style="font-weight:600;color:#1e293b;">${escapeHtml(p.title || ('要点 ' + (i+1)))}</div>
          <div style="color:#64748b;margin-top:2px;">${escapeHtml(kp)}</div>
        </div>
      `;
      pointsEl.appendChild(item);
      setTimeout(() => { item.style.opacity = '1'; item.style.transform = 'translateX(0)'; }, 200 + i * 150);
    });
    return root;
  }

  // 模拟：烧瓶 + 气泡
  function SimulateVisualizer() {
    const root = document.createElement('div');
    root.className = 'omaic-vis';
    root.style.cssText = 'width:240px;height:240px;';
    root.innerHTML = `
      <div style="position:relative;width:160px;height:200px;">
        <div style="position:absolute;top:80px;left:50%;transform:translateX(-50%);width:60px;height:30px;background:#a3a3a3;border-radius:4px;"></div>
        <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);">
          <div style="width:80px;height:100px;background:rgba(59,130,246,.15);border:2px solid rgba(59,130,246,.4);border-radius:8px 8px 50% 50%;position:relative;overflow:hidden;">
            <div style="position:absolute;bottom:0;left:0;right:0;height:60%;background:linear-gradient(180deg,rgba(34,197,94,.3),rgba(34,197,94,.5));"></div>
            <div class="omaic-bubbles" style="position:absolute;inset:0;"></div>
          </div>
          <div style="width:12px;height:30px;background:rgba(59,130,246,.2);border:1px solid rgba(59,130,246,.4);margin:0 auto;"></div>
        </div>
        <div class="omaic-flame" style="position:absolute;top:60px;left:50%;transform:translateX(-50%);width:40px;height:24px;background:radial-gradient(ellipse, #f59e0b, #ef4444);border-radius:50% 50% 30% 30%;animation:omaic-flicker .3s ease-in-out infinite alternate;"></div>
        <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:120px;height:6px;background:#94a3b8;border-radius:3px;"></div>
      </div>
    `;
    // 注入 flicker 动画
    if (!document.getElementById('omaic-flicker-css')) {
      const s = document.createElement('style');
      s.id = 'omaic-flicker-css';
      s.textContent = '@keyframes omaic-flicker { from { transform: translateX(-50%) scale(1); } to { transform: translateX(-50%) scale(1.1); } }';
      document.head.appendChild(s);
    }
    // 气泡动画
    const bubbles = root.querySelector('.omaic-bubbles');
    const raf = loop(1500, (t) => {
      bubbles.innerHTML = '';
      for (let i = 0; i < 5; i++) {
        const b = document.createElement('div');
        const x = 20 + (i * 12) + Math.sin(t * Math.PI * 2 + i) * 4;
        const y = 80 - ((t + i * 0.2) % 1) * 70;
        const size = 4 + (i % 2) * 2;
        b.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;border-radius:9999px;background:rgba(255,255,255,.7);`;
        bubbles.appendChild(b);
      }
    });
    trackCleanup(root, raf);
    return root;
  }

  // 讨论：3 个对话气泡依次出现
  function DiscussVisualizer() {
    const root = document.createElement('div');
    root.className = 'omaic-vis';
    root.style.cssText = 'width:280px;height:240px;';
    const speakers = [
      { name: '主讲', color: '#3b82f6', text: '请思考实际应用...' },
      { name: '困惑同学', color: '#f59e0b', text: '我有个疑问...' },
      { name: '学霸同学', color: '#10b981', text: '可以这样理解...' }
    ];
    root.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;width:100%;padding:8px;"></div>`;
    const wrap = root.firstChild;
    speakers.forEach((sp, i) => {
      const bubble = document.createElement('div');
      bubble.style.cssText = `display:flex;align-items:flex-start;gap:8px;padding:8px 12px;border-radius:12px;background:#fff;border:1px solid ${sp.color}30;opacity:0;transform:translateY(8px);transition:all .4s;`;
      bubble.innerHTML = `
        <div style="width:24px;height:24px;border-radius:9999px;background:${sp.color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;">${sp.name[0]}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:10px;font-weight:700;color:${sp.color};">${sp.name}</div>
          <div style="font-size:11px;color:#475569;margin-top:2px;">${sp.text}</div>
        </div>
      `;
      wrap.appendChild(bubble);
      setTimeout(() => { bubble.style.opacity = '1'; bubble.style.transform = 'translateY(0)'; }, 100 + i * 300);
      // 让气泡反复淡入淡出
      let t = 0;
      const anim = loop(2400, () => {
        t += 0.016;
        const pulse = 0.85 + Math.sin(t * 2 + i) * 0.15;
        bubble.style.boxShadow = `0 0 0 0 ${sp.color}40`;
        bubble.style.transform = `translateY(${Math.sin(t * 2 + i) * 2}px)`;
      });
      trackCleanup(root, anim);
    });
    return root;
  }

  // 测验：3 道选择题卡片
  function QuizVisualizer() {
    const root = document.createElement('div');
    root.className = 'omaic-vis';
    root.style.cssText = 'width:240px;height:240px;';
    root.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:6px;width:100%;padding:8px;">
        ${[0,1,2].map(i => `
          <div class="card omaic-q" style="padding:8px 10px;border:1px solid #e2e8f0;display:flex;align-items:center;gap:8px;opacity:0;transform:translateX(-8px);transition:all .4s;animation-delay:${i*0.2}s;">
            <div style="width:18px;height:18px;border-radius:9999px;background:linear-gradient(135deg,#a855f7,#ec4899);color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;">Q${i+1}</div>
            <div style="flex:1;height:6px;background:linear-gradient(90deg,#e9d5ff,#fce7f3);border-radius:3px;"></div>
            <div style="display:flex;gap:3px;">
              ${['A','B','C','D'].map(L => `<div style="width:14px;height:14px;border-radius:3px;background:#f8fafc;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;font-size:8px;color:#94a3b8;font-weight:700;">${L}</div>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    const qs = root.querySelectorAll('.omaic-q');
    qs.forEach((q, i) => {
      setTimeout(() => { q.style.opacity = '1'; q.style.transform = 'translateX(0)'; }, 100 + i * 250);
    });
    return root;
  }

  // 项目：拼图 / 项目板
  function PblVisualizer() {
    const root = document.createElement('div');
    root.className = 'omaic-vis';
    root.style.cssText = 'width:280px;height:220px;';
    root.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;position:relative;">
        <div class="omaic-puzzle-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:180px;height:120px;">
          ${[0,1,2,3,4,5,6,7,8].map(i => `
            <div class="omaic-puzzle-cell" style="background:linear-gradient(135deg, #fef3c7, #fde68a);border-radius:6px;opacity:0;transform:scale(0.5);transition:all .3s;display:flex;align-items:center;justify-content:center;font-size:14px;">${['💡','🔬','📊','🌱','🧪','📝','🎯','🧬','📚'][i]}</div>
          `).join('')}
        </div>
        <div style="position:absolute;top:8px;right:8px;padding:4px 8px;background:#f59e0b;color:#fff;border-radius:6px;font-size:10px;font-weight:700;">PBL</div>
      </div>
    `;
    const cells = root.querySelectorAll('.omaic-puzzle-cell');
    cells.forEach((c, i) => {
      setTimeout(() => { c.style.opacity = '1'; c.style.transform = 'scale(1)'; }, 100 + i * 80);
    });
    return root;
  }

  // ---------- 工厂：createStepVisualizer ----------
  function createStepVisualizer(stepId, opts = {}) {
    injectCSS();
    const handlers = {
      'pdf-analysis': PdfScanVisualizer,
      'web-search': (o) => WebSearchVisualizer(o.sources || []),
      'outline': (o) => StreamingOutlineVisualizer(o.outlines || []),
      'agent-generation': AgentGenerationVisualizer,
      'slide-content': ContentVisualizer,
      'actions': ActionsVisualizer,
      // 6 段式专用
      'intro':     (o) => IntroVisualizer(o),
      'lecture':   (o) => LectureVisualizer(o),
      'simulate':  () => SimulateVisualizer(),
      'discuss':   () => DiscussVisualizer(),
      'quiz':      () => QuizVisualizer(),
      'pbl':       () => PblVisualizer(),
    };
    const fn = handlers[stepId];
    if (!fn) {
      const empty = document.createElement('div');
      empty.textContent = 'unknown step: ' + stepId;
      return empty;
    }
    return fn(opts);
  }

  function destroyAll(root) {
    if (root) destroyEl(root);
  }

  // ---------- HTML 转义 ----------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- 6 步元数据 ----------
  const ALL_STEPS = [
    { id: 'pdf-analysis',     title: '分析 PDF',     desc: '解析上传的教材材料',     icon: 'scan',   type: 'analysis' },
    { id: 'web-search',       title: '网络搜索',     desc: '检索相关知识背景',       icon: 'search', type: 'analysis' },
    { id: 'outline',          title: '生成大纲',     desc: '规划课堂结构',           icon: 'file',   type: 'writing'  },
    { id: 'agent-generation', title: '智能体生成',   desc: '多角色协同编排',         icon: 'bot',    type: 'writing'  },
    { id: 'slide-content',    title: '生成内容',     desc: 'SLIDE/QUIZ/PBL/WEB',     icon: 'layout', type: 'visual'   },
    { id: 'actions',          title: '生成动作',     desc: '时间线与交互编排',       icon: 'clapper',type: 'visual'   },
  ];

  global.OpenMAICVisualizers = {
    ALL_STEPS,
    createStepVisualizer,
    destroyAll,
  };
})(window);
