/**
 * ============================================================
 * BioQuest — PRD §3.1：3步Onboarding引导
 * 首次访问显示，引导用户快速上手
 * ============================================================
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'bioquest_onboarding_done';
  var _currentStep = 0;
  var _overlay = null;
  var _tooltip = null;

  var STEPS = [
    {
      title: '欢迎来到 BioQuest',
      text: '打开浏览器就能用的生物竞赛私教，不需要注册、不需要付费。',
      highlight: null,
      position: 'center'
    },
    {
      title: '从这里开始刷题',
      text: '点击「开始刷题」进入练习模式，支持键盘快捷键操作，全程不用鼠标。',
      highlight: '[data-nav="practice"], .nav-practice, a[href*="practice"]',
      position: 'bottom'
    },
    {
      title: '数据自动保存',
      text: '你的答题进度、错题本、收藏都会自动保存在这个浏览器里。随时回来继续。',
      highlight: null,
      position: 'center'
    }
  ];

  function isDone() {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch (e) { return false; }
  }

  function markDone() {
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch (e) {}
  }

  function createOverlay() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'bioquest-onboarding-overlay';
    // 非全屏：顶部居中的小卡片容器，不盖住主页、不阻挡滚动。
    _overlay.style.cssText = [
      'position:fixed',
      'top:88px',
      'left:50%',
      'transform:translateX(-50%)',
      'width:min(92%, 380px)',
      'z-index:99998',
      'pointer-events:none',
      'font-family:system-ui,-apple-system,sans-serif'
    ].join(';');
    document.body.appendChild(_overlay);
  }

  function createTooltip(step) {
    if (_tooltip) _tooltip.remove();

    _tooltip = document.createElement('div');
    _tooltip.id = 'bioquest-onboarding-tooltip';

    var html = '<div style="background:#fff;border-radius:16px;padding:20px 22px;box-shadow:0 12px 40px rgba(0,0,0,0.18);border:1px solid rgba(0,0,0,0.06);text-align:center;">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">';
    html += '<span style="font-size:1.4rem;">🧬</span>';
    html += '<button class="onboarding-close-x" aria-label="关闭" style="padding:2px 8px;border:none;background:none;color:#999;cursor:pointer;font-size:1rem;line-height:1;">✕</button>';
    html += '</div>';
    html += '<h2 style="font-size:1.1rem;font-weight:700;color:#1a1a1a;margin:0 0 6px 0;">' + step.title + '</h2>';
    html += '<p style="font-size:0.9rem;color:#555;line-height:1.55;margin:0 0 14px 0;">' + step.text + '</p>';

    // 进度点
    html += '<div style="display:flex;justify-content:center;gap:8px;margin-bottom:14px;">';
    for (var i = 0; i < STEPS.length; i++) {
      html += '<div style="width:8px;height:8px;border-radius:50%;' +
        (i === _currentStep ? 'background:#5a7d5c;width:24px;border-radius:4px;' : 'background:#ddd;') +
        'transition:all 0.3s ease;"></div>';
    }
    html += '</div>';

    html += '<div style="display:flex;gap:8px;justify-content:center;">';
    if (_currentStep < STEPS.length - 1) {
      html += '<button class="onboarding-skip" style="padding:8px 14px;border-radius:10px;border:1px solid #ddd;background:#fff;color:#666;cursor:pointer;font-size:0.85rem;">跳过</button>';
      html += '<button class="onboarding-next" style="padding:8px 20px;border-radius:10px;border:none;background:#5a7d5c;color:#fff;cursor:pointer;font-size:0.85rem;font-weight:600;">下一步</button>';
    } else {
      html += '<button class="onboarding-finish" style="padding:8px 24px;border-radius:10px;border:none;background:#5a7d5c;color:#fff;cursor:pointer;font-size:0.85rem;font-weight:600;">开始学习</button>';
    }
    html += '</div></div>';

    _tooltip.innerHTML = html;
    // 卡片本身可交互，不拦截外层页面的滚动/点击
    _tooltip.style.cssText = 'position:relative;z-index:99999;pointer-events:auto;max-height:calc(100vh - 120px);overflow:auto;';

    _overlay.appendChild(_tooltip);

    // 事件绑定
    _tooltip.querySelector('.onboarding-skip')?.addEventListener('click', finish);
    _tooltip.querySelector('.onboarding-next')?.addEventListener('click', next);
    _tooltip.querySelector('.onboarding-close-x')?.addEventListener('click', finish);
    _tooltip.querySelector('.onboarding-finish')?.addEventListener('click', finish);
  }

  function next() {
    _currentStep++;
    if (_currentStep >= STEPS.length) {
      finish();
      return;
    }
    createTooltip(STEPS[_currentStep]);
  }

  function finish() {
    if (_overlay && _overlay.parentNode) _overlay.parentNode.removeChild(_overlay);
    _overlay = null;
    _tooltip = null;
    markDone();
  }

  function start() {
    if (isDone()) return;
    // 等待 DOM 加载
    if (document.readyState === 'complete') {
      setTimeout(init, 500);
    } else {
      document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 500); });
    }
  }

  function init() {
    if (isDone()) return;
    // 只在首页显示
    var isHome = window.location.pathname === '/' ||
      window.location.pathname === '/index.html' ||
      !window.location.pathname.match(/\.html$/);
    if (!isHome) return;

    _currentStep = 0;
    createOverlay();
    createTooltip(STEPS[0]);
  }

  // 暴露全局
  window.Onboarding = { start: start, isDone: isDone };

  // 自动启动
  start();

  console.log('[BioQuest] Onboarding 引导已加载');
})();