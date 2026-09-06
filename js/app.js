/**
 * ============================================================
 * BioQuest — SPA 路由与全局状态管理
 * 使用 hash-based 路由实现单页应用导航
 * ============================================================
 */

/* CSP 改造辅助：把无法用 data-on 数组直接表达的复杂内联处理器
 * 收敛为极小的命名函数，供 csp-events.js 的委托通过 window[fn] 查找调用。
 * 语义均与原内联表达式完全等价。 */
window.__cspRoot = function () {};
window._cspGotoHash = function (hash) { window.location.hash = hash; };
window._cspShowAuth = function () {
  if (typeof window.showAuthModal === 'function') window.showAuthModal();
  else if (typeof window.renderAuthModal === 'function') window.renderAuthModal();
};
window._cspReload = function () { window.location.reload(); };
window._cspRemoveParent = function () { if (this.parentNode) this.parentNode.remove(); };
window._cspSlideCaptcha = function (mode) {
  var fn = window._showSlideCaptcha || window.__cspSlideCaptchaImpl;
  var p = fn ? fn(mode) : Promise.resolve();
  return Promise.resolve(p).then(function () {
    if (typeof window._updateSlideTriggerUI === 'function') window._updateSlideTriggerUI();
  });
};
window._cspOpenGitHub = function () {
  window.open('https://github.com/astrnox/BioQuest/issues/new/choose', '_blank');
};

/**
 * 动态加载脚本（返回 Promise），用于延迟加载非首屏 JS
 * 统一委托给 window.loadScriptOnce（公共加载器，带去重与超时），
 * 同时保留对已存在于 DOM 的 <script> 标签的预检兼容。
 */
function __loadScriptAsync(src) {
  // 预检：若该脚本已作为 <script> 标签存在于 DOM（如 HTML 中静态声明），直接复用其加载状态
  var existing = document.querySelector('script[src="' + src + '"]');
  if (existing) {
    if (existing._loaded) return Promise.resolve();
    return new Promise(function(resolve, reject) {
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', function() { reject(new Error('Failed to load: ' + src)); });
    });
  }
  // 委托公共加载器（去重 + 超时 + 失败可重试）
  if (typeof window !== 'undefined' && typeof window.loadScriptOnce === 'function') {
    return window.loadScriptOnce(src);
  }
  // 兜底：utils.js 尚未就绪时（理论上不会发生，因 utils.js 是首个 defer 脚本）
  return new Promise(function(resolve, reject) {
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = function() { s._loaded = true; resolve(); };
    s.onerror = function() { reject(new Error('Failed to load: ' + src)); };
    document.head.appendChild(s);
  });
}

/**
 * 按顺序加载多个脚本
 */
function __loadScriptChain(sources) {
  var p = Promise.resolve();
  sources.forEach(function(src) {
    p = p.then(function() { return __loadScriptAsync(src); });
  });
  return p;
}

// 获取 JS 基路径（适配子目录部署）
var __jsBase = (function() {
  var scripts = document.querySelectorAll('script[src*="js/app.js"]');
  if (scripts.length > 0) {
    var src = scripts[scripts.length - 1].src;
    var base = src.substring(0, src.lastIndexOf('/js/app.js'));
    return base ? base + '/' : '';
  }
  return '';
})();

/**
 * @typedef {Object} _AppState
 * @property {string} currentRoute - 当前路由路径
 * @property {string} theme - 当前主题 ('light' | 'dark')
 * @property {Object} userSettings - 用户偏好设置
 * @property {boolean} initialized - 应用是否已初始化
 */

/** @type {_AppState} */
const _AppState = {
  currentRoute: '',
  theme: 'light',
  userSettings: {
    fontSize: 'medium',
    questionCount: 30,
    showTimer: true,
    autoSubmit: false
  },
  initialized: false,
  pageModules: {}
};

/**
 * P1-7：通过只读 Proxy 视图暴露内部状态。
 * - 内部（app.js）直接读写 `_AppState` 可变对象；
 * - 外部（window.AppState / 其他模块 / 第三方脚本）只能读取，
 *   写入、删除、原型污染均被拒绝，限制对全局状态的篡改与注入。
 */
window.AppState = createReadOnlyStateView(_AppState);

function createReadOnlyStateView(target) {
  return new Proxy(target, {
    get: function (t, k) { return t[k]; },
    set: function (t, k, v) {
      if (k === '__proto__' || k === 'prototype' || k === 'constructor') return false;
      console.warn('[BioQuest] AppState 为只读视图，已拒绝外部写入:', String(k));
      return true; // 严格模式返回 false 会抛错，改为静默拒绝
    },
    deleteProperty: function () { return false; },
    defineProperty: function () { return false; },
    setPrototypeOf: function () { return false; },
    has: function (t, k) { return k in t; },
    ownKeys: function (t) { return Reflect.ownKeys(t); },
    getOwnPropertyDescriptor: function (t, k) { return Reflect.getOwnPropertyDescriptor(t, k); },
    getPrototypeOf: function (t) { return Reflect.getPrototypeOf(t); }
  });
}

// Modal 焦点陷阱句柄（统一在 app.js 管理）
var _authFocusTrap = null;
var _donationFocusTrap = null;

// 路由配置表已拆分至 js/app-routes.js（P1-2），此处通过全局 `Routes` 引用

/**
 * 隐私政策页（静态内容，P1-19）
 * 仅内联样式（CSP style-src 允许 'unsafe-inline'），不含内联脚本，避免引入 XSS 面。
 */
function renderPrivacyPage(target) {
  if (!target) return;
  var s = {
    bg: '#f7f5f0',
    card: '#ffffff',
    border: '#ece8e1',
    text: '#2c3840',
    muted: '#8a8a8a',
    sage: '#3a6b4a',
    accent: '#1a3a2a'
  };
  target.innerHTML =
  '<div style="max-width:860px;margin:0 auto;padding:40px 20px 64px;font-family:var(--font-sans,\'Noto Sans SC\',sans-serif);color:' + s.text + ';line-height:1.8;">' +
    '<a href="#/" style="display:inline-flex;align-items:center;gap:6px;color:' + s.sage + ';text-decoration:none;font-size:0.88rem;margin-bottom:20px;">← 返回首页</a>' +
    '<div style="background:' + s.card + ';border:1px solid ' + s.border + ';border-radius:16px;padding:36px 40px 44px;box-shadow:0 4px 20px rgba(0,0,0,0.04);">' +
      '<h1 style="font-family:var(--font-serif,\'Noto Serif SC\',serif);font-size:1.7rem;color:' + s.accent + ';margin:0 0 6px;">隐私政策</h1>' +
      '<p style="color:' + s.muted + ';font-size:0.82rem;margin:0 0 26px;">更新日期：2026-08-19 · 适用于 BioQuest（生物竞赛学习平台）</p>' +
      _privacySection('一、我们收集哪些数据', [
        '账户信息：你在登录/注册时提供的姓名、邮箱（例如通过 Supabase 账号系统）。',
        '学习数据：练习作答、错题、收藏、统计、习惯打卡、徽章与学习进度等，默认仅保存在你的浏览器本地（localStorage／IndexedDB）。',
        '设备标识：用于本地数据关联的匿名设备标识（bioquest.xxx 下）。',
        '日志：浏览器控制台与运行错误日志，仅用于排障，不含可直读的敏感凭据。'
      ]) +
      _privacySection('二、数据如何使用', [
        '用于个性化学习：错题复盘、学情分析、成绩画像、复习排程（FSRS/IRT 算法）。',
        '用于功能交互：社区、排行榜、教师协同视图、AI 助手（见第五条）。',
        '不会在未经你同意的情况下用于广告画像或出售给第三方。'
      ]) +
      _privacySection('三、数据存储与安全', [
        '默认本地优先：学习数据存于你的浏览器本地存储；你可在「用户中心 → 数据管理」导出备份或一键清除。',
        '云端数据（如已登录账号、反馈、社区内容、AI 额度的服务端部分）通过 Supabase 存储与传输。',
        'API Key 保护：AI 接口 Key 仅保存在当前页面内存（可选「会话内记住」写入 sessionStorage，关闭标签页即清除），不会持久化到你浏览器的 localStorage 或磁盘，也不会在控制台之外以明文全局属性暴露。',
        '传输加密：外发请求走 HTTPS，第三方 AI 服务商在请求中有独立的服务条款与隐私政策。'
      ]) +
      _privacySection('四、Cookie 与本地存储', [
        '本平台主要依赖浏览器 Web Storage（localStorage / sessionStorage / IndexedDB）存储功能数据，而非传统 Cookie。',
        '第三方服务（Supabase、AI 服务商、jsDelivr CDN 等）可能按其自身政策使用 Cookie／本地存储，请查阅各自隐私政策。',
        '你可随时在浏览器设置中清除站点本地数据；清除后学习数据将不可恢复（建议先导出备份）。'
      ]) +
      _privacySection('五、AI 功能与第三方处理', [
        'AI 助手（导师、诊断、文档问答等）会将你的提问与相关上下文发送到所选 AI 服务商（如 DeepSeek、智谱、通义千问、Kimi、NVIDIA、硅基流动）的接口处理。',
        '若你使用自定义 API Key，请求由你的前端携带你的 Key 直连服务商；请勿将涉及他人敏感信息的文本提交给 AI 功能。',
        'AI 调用受每日次数限制，用于防止滥用。'
      ]) +
      _privacySection('六、你的权利', [
        '访问权：在「用户中心」查看个人与学习数据。',
        '导出权：在「用户中心 → 数据管理 → 导出我的数据」获取可读明文 JSON。',
        '删除权：在「用户中心 → 数据管理 → 清除所有数据」删除本地全部业务数据；账号相关数据可在登录状态下申请。',
        '撤回同意与投诉：可通过下方邮箱联系我们对数据处理行为提出异议。'
      ]) +
      _privacySection('七、未成年人保护', [
        '本平台面向生物学科学习，若你为未成年人，建议在监护人指导下使用，并由监护人知悉本政策后使用。'
      ]) +
      _privacySection('八、政策更新与联系', [
        '我们会不时更新本政策，重大变更将在页面明显位置提示。',
        '如有隐私相关问题，可通过邮箱联系作者：astrnox@163.com（或 QQ：3930523703）。'
      ]) +
      '<div style="margin-top:8px;padding-top:18px;border-top:1px solid ' + s.border + ';font-size:0.82rem;color:' + s.muted + ';">BioQuest · 本政策以最新页面版本为准。</div>' +
    '</div>' +
  '</div>';
  try { if (typeof updatePageTitle === 'function') updatePageTitle('/privacy'); } catch (e) {}
}

// 生成"小节标题 + 列表"的静态 HTML（仅内联样式，无脚本）
function _privacySection(title, items) {
  var lis = items.map(function (it) {
    return '<li style="margin:6px 0;padding-left:2px;">' + String(it).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</li>';
  }).join('');
  return '<h2 style="font-family:var(--font-serif,\'Noto Serif SC\',serif);font-size:1.12rem;color:' + '#1a3a2a' + ';margin:26px 0 10px;">' + title + '</h2>' +
    '<ul style="margin:0;padding-left:20px;font-size:0.9rem;color:#2c3840;">' + lis + '</ul>';
}

/**
 * 首次访问隐私政策提示（P1-19）。
 * 一次性、可关闭；仅用内联样式 + textContent/按钮，无内联脚本（符合 CSP）。
 * 关键约束：任何分支都不抛异常、不依赖 DOM 状态，绝不影响 initApp 后续执行
 * （initApp 在 DOMContentLoaded 直接触发，无 try/catch 兜底）。
 */
function _maybeShowPrivacyNotice() {
  try {
    var seen = false;
    try { seen = localStorage.getItem('bioquest_privacy_notice_seen') === '1'; } catch (e) {}
    if (seen || typeof document === 'undefined' || !document.body) return;

    var el = document.createElement('div');
    el.id = 'privacy-notice';
    el.setAttribute('role', 'alert');
    el.setAttribute('aria-live', 'polite');
    el.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;' +
      'display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:14px 16px;border-radius:12px;' +
      'background:#ffffff;border:1px solid #ece8e1;box-shadow:0 6px 24px rgba(0,0,0,0.12);' +
      'font-family:var(--font-sans, sans-serif);font-size:0.85rem;color:#2c3e30;line-height:1.5;max-width:640px;margin:0 auto;';
    var txt = document.createElement('span');
    txt.style.cssText = 'flex:1 1 100%;';
    txt.textContent = '我们重视你的数据隐私：学习数据默认仅保存在本地，可随时导出或清除。';
    // P1-33：未成年人保护——首次使用需确认年龄/监护人同意。
    // 该确认仅作为最小合规门槛（不阻塞应用启动，用户也可自行访问隐私政策页后再确认）。
    var ageWrap = document.createElement('label');
    ageWrap.style.cssText = 'display:flex;align-items:flex-start;gap:8px;flex:1 1 100%;cursor:pointer;font-size:0.82rem;color:#54665c;';
    var ageInput = document.createElement('input');
    ageInput.type = 'checkbox';
    ageInput.setAttribute('aria-label', '我已阅读并同意隐私政策；确认年满14周岁，或未成年人使用已取得监护人同意');
    ageInput.style.cssText = 'margin-top:1px;accent-color:#3a6b4a;';
    var ageText = document.createElement('span');
    ageText.textContent = '我已阅读并同意隐私政策；确认年满 14 周岁（若为未成年人，已取得监护人同意后使用本平台）。';
    ageWrap.appendChild(ageInput);
    ageWrap.appendChild(ageText);

    var link = document.createElement('a');
    link.href = '#/privacy';
    link.textContent = '查看隐私政策';
    link.style.cssText = 'color:#3a6b4a;font-weight:600;white-space:nowrap;text-decoration:none;';
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = '我知道了';
    closeBtn.disabled = true;
    closeBtn.style.cssText = 'border:1px solid #3a6b4a;background:#3a6b4a;color:#fff;border-radius:8px;padding:6px 14px;font-size:0.82rem;cursor:pointer;white-space:nowrap;';
    closeBtn.style.opacity = '0.5';
    closeBtn.addEventListener('click', function () {
      try { localStorage.setItem('bioquest_privacy_notice_seen', '1'); } catch (e) {}
      try { localStorage.setItem('bioquest_age_consent', '1'); } catch (e) {}
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    ageInput.addEventListener('change', function () {
      closeBtn.disabled = !ageInput.checked;
      closeBtn.style.opacity = ageInput.checked ? '1' : '0.5';
    });

    el.appendChild(txt);
    el.appendChild(ageWrap);
    el.appendChild(link);
    el.appendChild(closeBtn);
    document.body.appendChild(el);
  } catch (e) { /* 提示失败绝不能影响应用启动 */ }
}

/**
 * 获取当前 hash 对应的路由路径
 * @returns {string} 路由路径，如 '/', '/practice', '/exam'
 */
function getRouteFromHash() {
  const hash = window.location.hash.slice(1) || '/';
  if (hash.startsWith('/')) {
    const cleanHash = hash.split('?')[0];
    return Routes[cleanHash] ? cleanHash : '/';
  }
  return '/';
}

/**
 * P1-5（Issue #102）：处理 PWA 快捷方式的 ?page= 查询参数。
 * manifest.json 的 shortcuts 指向 ./index.html?page=cards|quiz|diagnosis，
 * 此前该参数无任何消费方（点击快捷方式只会落到首页）。
 * 规则：
 *   - 仅接受白名单映射（cards→/cards、quiz→/practice、diagnosis→/diagnosis），
 *     未知值一律忽略，杜绝参数注入与任意跳转；
 *   - 显式 hash 优先级高于 ?page=（用户带 hash 进入时不覆盖）；
 *   - 用 history.replaceState 清理查询串，不产生多余历史记录。
 */
function _applyPageQueryParam() {
  try {
    if (!window.location.search) return;
    var params = new URLSearchParams(window.location.search);
    var page = params.get('page');
    // 无论是否命中白名单都清掉查询串（一次性参数，避免刷新/分享时残留）
    var baseUrl = window.location.pathname + window.location.hash;
    if (!page) {
      window.history.replaceState(null, '', baseUrl);
      return;
    }
    var PAGE_ROUTE_WHITELIST = {
      cards: '/cards',
      quiz: '/practice',      // manifest 快捷方式「模拟练习」
      diagnosis: '/diagnosis'
    };
    var target = PAGE_ROUTE_WHITELIST[String(page).toLowerCase()];
    var hasExplicitHash = !!window.location.hash && window.location.hash !== '#/' && window.location.hash !== '#';
    if (target && Routes[target] && !hasExplicitHash) {
      // 先清查询串，再设置目标 hash（异步触发 hashchange → 常规路由）
      window.history.replaceState(null, '', window.location.pathname);
      window.location.hash = target;
    } else {
      window.history.replaceState(null, '', baseUrl);
    }
  } catch (e) { /* URL API 异常时静默忽略，保持默认路由 */ }
}

/**
 * 导航到指定路由
 * @param {string} route - 目标路由路径
 * @param {Object} [options] - 导航选项
 * @param {boolean} [options.replace=false] - 是否替换当前历史记录
 */
function navigateTo(route, options = {}) {
  const { replace = false } = options;

  if (!Routes[route]) {
    console.warn(`[BioQuest] 未知路由: ${route}，回退到首页`);
    route = '/';
  }

  if (route === _AppState.currentRoute) {
    return;
  }

  if (replace) {
    window.location.replace(`#${route}`);
  } else {
    window.location.hash = route;
  }
}

window.navigateTo = navigateTo;

/**
 * 更新页面标题
 * @param {string} route - 当前路由
 */
function updatePageTitle(route) {
  const routeConfig = Routes[route];
  if (routeConfig) {
    document.title = `${routeConfig.title} - BioQuest 生物竞赛学习平台`;
  }
}

/**
 * 更新导航栏的激活状态
 * @param {string} route - 当前路由
 */
function updateNavActive(route) {
  document.querySelectorAll('.header-nav a, .mobile-nav a[data-route]').forEach((link) => {
    const linkRoute = link.getAttribute('data-route') || link.getAttribute('href');
    const normalized = linkRoute ? linkRoute.replace('#', '') : '';

    if (normalized === route || (route === '/' && (normalized === '/' || normalized === ''))) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });
}

/**
 * 练习页面渲染
 * @param {HTMLElement} target - 渲染目标元素
 */
function renderPracticePage(target) {

  if (typeof window.initPractice === 'function') {
    window.initPractice(target);
  } else {
    target.innerHTML = `
      <div style="text-align:center;padding:64px 24px;">
        <div style="font-size:2rem;margin-bottom:12px;"></div>
        <p style="color:var(--text-muted);">练习模块加载中…</p>
      </div>
    `;
    // 如果全局函数还没有，延迟再试
    setTimeout(() => {
      if (typeof window.initPractice === 'function') {
        window.initPractice(target);
      }
    }, 200);
  }
}

/**
 * 模拟考试页面渲染
 * @param {HTMLElement} target - 渲染目标元素
 */
function renderExamPage(target) {

  // 确保 target 正确
  if (!target) {
    target = document.getElementById('page-content');
  }
  
  if (typeof window.initExam === 'function') {
    try {
      window.initExam(target);
    } catch (err) {
      console.error('初始化考试模块失败:', err);
      target.innerHTML = `
        <div style="text-align:center;padding:64px 24px;">
          <div style="font-size:2rem;margin-bottom:12px;"></div>
          <p style="color:var(--color-error);">加载考试模块失败，请刷新页面重试</p>
          <p style="color:var(--text-muted);font-size:0.9rem;margin-top:8px;">错误信息: ${err.message || '未知错误'}</p>
        </div>
      `;
    }
  } else {
    target.innerHTML = `
      <div style="text-align:center;padding:64px 24px;">
        <div style="font-size:2rem;margin-bottom:12px;"></div>
        <p style="color:var(--text-muted);">考试模块加载中…</p>
        <p style="color:var(--text-muted);font-size:0.85rem;margin-top:8px;">如长时间未响应，请刷新页面</p>
      </div>
    `;
    
    // 多次尝试初始化
    let attempts = 0;
    const tryInit = () => {
      attempts++;
      if (typeof window.initExam === 'function') {
        window.initExam(target);
      } else if (attempts < 10) {
        setTimeout(tryInit, 200);
      } else {
        target.innerHTML = `
          <div style="text-align:center;padding:64px 24px;">
            <div style="font-size:2rem;margin-bottom:12px;"></div>
            <p style="color:var(--color-error);">考试模块加载超时，请刷新页面重试</p>
            <button style="margin-top:16px;padding:8px 20px;background:var(--color-amber);border:none;border-radius:8px;cursor:pointer;" data-on='["_cspReload"]'>刷新页面</button>
          </div>
        `;
      }
    };
    tryInit();
  }
}

/**
 * 学习分析页面渲染
 * @param {HTMLElement} target - 渲染目标元素
 */
function renderAnalyticsPage(target) {

  if (typeof window.initAnalytics === 'function') {
    window.initAnalytics(target);
  } else {
    target.innerHTML = `
      <div style="text-align:center;padding:64px 24px;">
        <div style="font-size:2rem;margin-bottom:12px;"></div>
        <p style="color:var(--text-muted);">分析模块加载中…</p>
      </div>
    `;
    setTimeout(() => {
      if (typeof window.initAnalytics === 'function') {
        window.initAnalytics(target);
      }
    }, 200);
  }
}

/**
 * 用户中心页面渲染
 * @param {HTMLElement} target - 渲染目标元素
 */
function renderUserPage(target) {

  if (typeof window.initUser === 'function') {
    window.initUser(target);
  } else {
    target.innerHTML = `
      <div style="text-align:center;padding:64px 24px;">
        <div style="font-size:2rem;margin-bottom:12px;"></div>
        <p style="color:var(--text-muted);">用户模块加载中…</p>
      </div>
    `;
    setTimeout(() => {
      if (typeof window.initUser === 'function') {
        window.initUser(target);
      }
    }, 200);
  }
}

/**
 * 知识卡片页面渲染 — Anki 风格间隔重复
 */
function renderCardsPage() {
  var container = document.getElementById('page-content');
  if (!container) return;

  container.innerHTML = `
    <div style="max-width:720px;margin:0 auto;padding:40px 20px 60px;">
      <div class="anki-page-header" style="margin-bottom:32px;">
        <div class="section-label">SPACED REPETITION</div>
        <h2 class="section-title" style="font-size:2rem;">间隔重复记忆卡</h2>
        <p class="section-desc">基于 FSRS 算法的智能复习系统 · 选择牌组开始学习</p>
      </div>

      <!-- 牌组选择器（动态渲染） -->
      <div id="anki-deck-selector"></div>

      <!-- 卡片学习区域 -->
      <div id="anki-card-area">
        <div class="anki-card-container" id="anki-card-area-inner">
          <div class="anki-card" id="anki-card">
              <div class="anki-face anki-front-face" id="anki-front"></div>
              <div class="anki-face anki-back-face" id="anki-back"></div>
          </div>
        </div>
        <div class="anki-progress-bar" id="anki-progress-bar"></div>
      </div>

      <div class="anki-shortcut-hint" style="margin-top:14px;">
        <span><kbd>空格</kbd> 翻转</span>
        <span><kbd>1</kbd> 再来一次</span>
        <span><kbd>2</kbd> 一般</span>
        <span><kbd>3</kbd> 简单</span>
      </div>
    </div>
  `;

  // 加载 cards.js 模块（如果尚未加载）
  if (typeof window.AnkiSystem === 'undefined') {
    var script = document.createElement('script');
    script.src = 'js/cards.js';
    script.onload = function () {

    };
    document.head.appendChild(script);
  } else {
    // 已加载，重新初始化
    if (typeof window.AnkiSystem.loadData === 'function') {
      window.AnkiSystem.loadData();
    }
  }
}

/**
 * 搜索页面渲染 — 独立完整页面
 */
function renderSearchPage() {
  var container = document.getElementById('page-content');
  if (!container) return;

  container.innerHTML = `
    <div class="search-page">
      <div class="search-hero">
        <h1 class="search-hero-title">知识搜索</h1>
        <p class="search-hero-subtitle">搜索全量题库与生竞专业资源</p>
        <div class="search-bar" style="position:relative;">
          <input type="text" class="search-bar-input" id="search-page-input" placeholder="输入生物学关键词，如：细胞膜、光合作用、遗传定律..." autocomplete="off" />
          <button class="search-bar-btn" id="search-page-btn">搜索</button>
          <div class="search-quick-hint" id="search-quick-hint"></div>
        </div>
      </div>
      <div class="search-filters" id="search-filters">
        <span class="search-filter-label">搜索范围：</span>
        <span class="search-filter-chip selected" data-source="local">题库搜索</span>
        <span class="search-filter-chip selected" data-source="zhixin">质心论坛</span>
        <span class="search-filter-chip selected" data-source="baidu">百度</span>
        <span class="search-filter-chip selected" data-source="zhihu">知乎</span>
        <span class="search-filter-chip" data-source="bing">Bing</span>
        <span class="search-filter-chip" data-source="scholar">Scholar</span>
        <span class="search-filter-chip" data-source="wiki">Wikipedia</span>
        <span class="search-filter-chip" data-source="cnki">知网</span>
        <span class="search-filter-chip" data-source="biolib">BioLib</span>
        <span class="search-filter-chip" data-source="biooo">BioOO</span>
        <span class="search-filter-chip" data-source="naoke">脑壳生物</span>
      </div>
      <div class="search-module-filters" id="search-module-filters">
        <span class="search-filter-label">模块筛选：</span>
        <span class="search-module-chip selected" data-module="">全部</span>
        <span class="search-module-chip" data-module="module_1">模块1</span>
        <span class="search-module-chip" data-module="module_2">模块2</span>
        <span class="search-module-chip" data-module="module_3">模块3</span>
        <span class="search-module-chip" data-module="module_4">模块4</span>
        <span class="search-module-chip" data-module="exam">考试题</span>
      </div>
      <div class="search-results-area" id="search-results-area">
        <div class="search-empty-state">
          <div class="search-empty-icon">[BioQuest]</div>
          <p>输入关键词开始搜索</p>
          <p class="search-empty-hint">支持搜索全量题库（20000+ 题目）和多个生竞专业网站</p>
        </div>
      </div>
    </div>
  `;

  // 绑定事件
  var searchInput = document.getElementById('search-page-input');
  var searchBtn = document.getElementById('search-page-btn');
  var resultsArea = document.getElementById('search-results-area');
  var filterChips = document.querySelectorAll('.search-filter-chip');
  var moduleChips = document.querySelectorAll('.search-module-chip');
  var quickHint = document.getElementById('search-quick-hint');

  // 当前选中的模块
  var currentModule = '';

  // 搜索源选择
  filterChips.forEach(function(chip) {
    chip.addEventListener('click', function() {
      chip.classList.toggle('selected');
    });
  });

  // 模块筛选选择
  moduleChips.forEach(function(chip) {
    chip.addEventListener('click', function() {
      moduleChips.forEach(function(c) { c.classList.remove('selected'); });
      chip.classList.add('selected');
      currentModule = chip.getAttribute('data-module');
      // 如果已有搜索词，重新搜索
      if (searchInput.value.trim()) doSearch();
    });
  });

  // 点击外部关闭快速提示
  document.addEventListener('click', function(e) {
    if (quickHint && !quickHint.contains(e.target) && e.target !== searchInput) {
      quickHint.style.display = 'none';
    }
  });

  // 搜索执行
  var searchTimer = null;
  var currentSearchId = 0; // 用于取消过期的搜索请求

  // Supabase 直连搜索题目
  function _searchQuestionsFromSupabase(query, module) {
    var sb = typeof window.getSupabase === 'function' ? window.getSupabase() : null;
    if (!sb || !query) return Promise.resolve({ results: [], total: 0 });
    var q = sb.from('questions').select('*').ilike('question', '%' + query + '%').limit(20);
    if (module) q = q.eq('module', String(module));
    return q.then(function(result) {
      if (result.error || !result.data) return { results: [], total: 0 };
      var results = result.data.map(function(item) {
        return {
          type: item.type, question: item.question,
          subQuestions: item.sub_questions || [],
          explanation: item.explanation || '', subject: item.subject || '',
          difficulty: item.difficulty || 'medium', module: item.module
        };
      });
      return { results: results, total: results.length };
    }).catch(function() { return { results: [], total: 0 }; });
  }

  var doSearch = function() {
    var query = searchInput.value.trim();
    if (!query) {
      resultsArea.innerHTML = '<div class="search-empty-state"><div class="search-empty-icon">暂无结果</div><p>输入关键词开始搜索</p></div>';
      return;
    }

    var selectedSources = [];
    filterChips.forEach(function(c) {
      if (c.classList.contains('selected')) selectedSources.push(c.getAttribute('data-source'));
    });

    if (selectedSources.length === 0) {
      resultsArea.innerHTML = '<div class="search-no-result">请至少选择一个搜索范围</div>';
      return;
    }

    var searchId = ++currentSearchId;
    resultsArea.innerHTML = '<div class="search-loading"><div class="search-loading-spinner"></div>搜索中...</div>';

    // 本地题库搜索（通过 Supabase 直连）
    var localPromise = selectedSources.indexOf('local') >= 0
      ? _searchQuestionsFromSupabase(query, currentModule)
      : Promise.resolve({ results: [], total: 0 });

    // 外部搜索（暂不支持，返回空结果）
    var externalSources = selectedSources.filter(function(s) { return s !== 'local'; });
    var externalPromise = Promise.resolve({ results: [] });

    Promise.all([localPromise, externalPromise]).then(function(responses) {
      // 检查是否已被新搜索取代
      if (searchId !== currentSearchId) return;

      var localData = responses[0];
      var externalData = responses[1];
      var html = '';

      // ====== 题库搜索结果 ======
      var localResults = localData.results || [];
      var localTotal = localData.total || 0;

      if (localResults.length > 0) {
        html += '<div class="search-section"><div class="search-section-title">题库搜索 <span class="search-section-count">共 ' + localTotal + ' 题匹配</span></div>';
        localResults.forEach(function(item) {
          var stem = item.question || '';
          var shortStem = stem.length > 150 ? stem.slice(0, 150) + '...' : stem;
          var subject = item.subject || '';
          var concept = item.concept || '';
          var difficulty = item.difficulty || '';
          var moduleLabel = item.module || '';
          var explanation = item.explanation || '';

          // 模块显示名
          var moduleDisplay = moduleLabel;
          if (moduleLabel === 'module_1') moduleDisplay = '模块1';
          else if (moduleLabel === 'module_2') moduleDisplay = '模块2';
          else if (moduleLabel === 'module_3') moduleDisplay = '模块3';
          else if (moduleLabel === 'module_4') moduleDisplay = '模块4';
          else if (moduleLabel === 'exam') moduleDisplay = '考试题';

          // 难度徽章
          var diffBadge = '';
          if (difficulty) {
            var diffNum = parseInt(difficulty) || 0;
            var diffLabel = '';
            var diffClass = '';
            if (diffNum >= 1 && diffNum <= 2) { diffLabel = '简单'; diffClass = 'search-diff-easy'; }
            else if (diffNum === 3) { diffLabel = '中等'; diffClass = 'search-diff-medium'; }
            else if (diffNum >= 4 && diffNum <= 5) { diffLabel = '困难'; diffClass = 'search-diff-hard'; }
            else if (typeof difficulty === 'string') {
              diffLabel = difficulty;
              diffClass = 'search-diff-medium';
            }
            if (diffLabel) diffBadge = '<span class="search-diff-badge ' + diffClass + '">' + escapeHtml(diffLabel) + '</span>';
          }

          html += '<div class="search-result-card search-result-local" data-question-id="' + escapeHtml(item.id || '') + '">';
          html += '<div class="search-result-stem">' + highlightMatch(escapeHtml(shortStem), query) + '</div>';
          if (explanation) {
            var shortExp = explanation.length > 100 ? explanation.slice(0, 100) + '...' : explanation;
            html += '<div class="search-result-explanation">' + highlightMatch(escapeHtml(shortExp), query) + '</div>';
          }
          html += '<div class="search-result-meta">';
          if (subject) html += '<span class="search-result-tag">' + highlightMatch(escapeHtml(subject), query) + '</span>';
          if (concept) html += '<span class="search-result-tag">' + highlightMatch(escapeHtml(concept), query) + '</span>';
          if (moduleDisplay) html += '<span class="search-result-module">' + escapeHtml(moduleDisplay) + '</span>';
          html += diffBadge;
          html += '</div></div>';
        });

        // 分页提示
        if (localTotal > 30) {
          html += '<div class="search-more-hint">显示前 30 条，共 ' + localTotal + ' 条匹配</div>';
        }
        html += '</div>';
      }

      // ====== 外部结果 — 按 tag 分组 ======
      var allExternal = externalData.results || [];

      if (allExternal.length > 0) {
        // 为每条结果提取 tags
        var taggedResults = [];
        allExternal.forEach(function(item) {
          var textToTag = (item.abstract || item.title || item.name || '');
          var tags = extractTags(textToTag);
          // 如果提取不到 tags，用来源名作为默认 tag
          if (tags.length === 0) tags = [item.name || '其他'];
          taggedResults.push({
            item: item,
            tags: tags,
            mainTag: tags[0]
          });
        });

        // 按 mainTag 分组
        var groups = {};
        taggedResults.forEach(function(tr) {
          var g = tr.mainTag;
          if (!groups[g]) groups[g] = [];
          groups[g].push(tr);
        });

        // 排序：结果数多的 group 排前面
        var sortedGroups = Object.keys(groups).sort(function(a, b) {
          return groups[b].length - groups[a].length;
        });

        // 渲染每个分组
        sortedGroups.forEach(function(tagName) {
          var itemsInGroup = groups[tagName];

          html += '<div class="search-tag-group">';
          html += '<div class="search-tag-group-header">';
          html += '<span class="search-tag-group-name">#' + escapeHtml(tagName) + '</span>';
          html += '<span class="search-tag-group-count">' + itemsInGroup.length + ' 条结果</span>';
          html += '</div>';
          html += '<div class="search-tag-group-items">';

          itemsInGroup.forEach(function(tr) {
            var item = tr.item;
            var allTags = tr.tags;

            html += '<div class="search-result-card">';

            // 标题（最突出）
            if (item.title) {
              html += '<div class="search-result-title">' + escapeHtml(item.title) + '</div>';
            }

            // 摘要（次要）
            if (item.abstract) {
              html += '<div class="search-result-abstract">' + escapeHtml(item.abstract) + '</div>';
            }

            // 该条的所有 tag（核心：用tag描述内容）
            if (allTags.length > 0) {
              html += '<div class="search-result-tags">';
              allTags.forEach(function(t) {
                var isActive = t === tagName;
                html += '<span class="search-tag' + (isActive ? ' search-tag-active' : '') + '">' + escapeHtml(t) + '</span>';
              });
              html += '</div>';
            }

            // 来源信息（淡化，放在底部）
            if (item.name) {
              html += '<div class="search-result-source">来源: ' + escapeHtml(item.name) + '</div>';
            }

            // 链接
            if (item.url) {
              html += '<a class="search-result-goto" href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener">查看原文 &rarr;</a>';
            }

            html += '</div>';
          });

          html += '</div></div>'; // group-items + tag-group
        });
      }

      // 无结果
      if (!html && localResults.length === 0) {
        html = '<div class="search-no-result">未找到与"' + escapeHtml(query) + '"相关的结果</div>';
      } else if (!html) {
        html = '<div class="search-no-result">未找到外部结果</div>';
      }

      resultsArea.innerHTML = html;

      // 本地题目点击跳转练习
      resultsArea.querySelectorAll('.search-result-local').forEach(function(card) {
        card.addEventListener('click', function() {
          var qId = card.getAttribute('data-question-id');
          if (qId && typeof navigateTo === 'function') {
            sessionStorage.setItem('bioquest_redo_question', qId);
            navigateTo('/practice');
          }
        });
      });
    });
  };

  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') doSearch();
  });

  // 输入时实时搜索（防抖 300ms）
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function() {
      var query = searchInput.value.trim();
      if (query.length >= 2) {
        // 实时搜索题库（Supabase 直连）
        _searchQuestionsFromSupabase(query, null)
          .then(function(data) {
            var results = data.results || [];
            if (results.length > 0) {
              var hintHtml = '';
              results.slice(0, 5).forEach(function(item) {
                var stem = (item.question || '').slice(0, 60);
                hintHtml += '<div class="search-quick-item" data-qid="' + (item.id || '') + '">' + escapeHtml(stem) + '</div>';
              });
              quickHint.innerHTML = hintHtml;
              quickHint.style.display = 'block';

              quickHint.querySelectorAll('.search-quick-item').forEach(function(el) {
                el.addEventListener('click', function() {
                  sessionStorage.setItem('bioquest_redo_question', el.getAttribute('data-qid'));
                  if (typeof navigateTo === 'function') navigateTo('/practice');
                });
              });
            } else {
              quickHint.style.display = 'none';
            }
          })
          .catch(function() {
            quickHint.style.display = 'none';
          });
      } else {
        quickHint.style.display = 'none';
      }
    }, 300);
  });

  // URL 参数支持（P1-5：对入参做清洗，限制长度并剔除控制字符）
  var urlQuery = new URLSearchParams(window.location.hash.split('?')[1] || '').get('q');
  urlQuery = (urlQuery && typeof sanitizeUrlParam === 'function') ? sanitizeUrlParam(urlQuery, 100) : urlQuery;
  if (urlQuery) {
    searchInput.value = urlQuery;
    doSearch();
  } else {
    searchInput.focus();
  }
}

/**
 * 高亮匹配文本
 */
function highlightMatch(text, query) {
  if (!query || !text) return text;
  // 对查询中的特殊正则字符进行转义
  var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var re = new RegExp('(' + escaped + ')', 'gi');
  return text.replace(re, '<mark class="search-highlight">$1</mark>');
}

/**
 * 本地搜索函数 — 搜索错题和练习记录（保留用于离线场景）
 */
function searchLocalQuestions(query) {
  if (!query || query.length < 1) return [];
  var lower = query.toLowerCase();
  var results = [];

  // 从 localStorage 中搜索错题和收藏
  var wrongQuestions = typeof getWrongQuestions === 'function' ? (getWrongQuestions() || []) : [];
  wrongQuestions.forEach(function(w) {
    var text = (w.questionText || '').toLowerCase();
    if (text.indexOf(lower) >= 0) {
      results.push({
        question: w.questionText,
        subject: w.subject || '',
        concept: '',
        module: w.module || '',
        id: w.qId || '',
        source: 'wrong'
      });
    }
  });

  // 从练习记录中搜索
  var records = typeof getRecords === 'function' ? (getRecords() || []) : [];
  records.forEach(function(r) {
    if (r.questions) {
      r.questions.forEach(function(q) {
        var text = (q.question || '').toLowerCase();
        var concept = (q.concept || '').toLowerCase();
        if (text.indexOf(lower) >= 0 || concept.indexOf(lower) >= 0) {
          results.push({
            question: q.question,
            subject: q.subject || '',
            concept: q.concept || '',
            module: r.module || '',
            id: '',
            source: 'record'
          });
        }
      });
    }
  });

  // 去重
  var seen = {};
  return results.filter(function(r) {
    var questionText = r.question || '';
    var key = questionText.slice(0, 50);
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  }).slice(0, 30);
}

/**
 * 从文本中提取关键词标签
 */
function extractTags(text) {
  if (!text || text.length < 4) return [];

  // 清理 HTML 标签
  text = text.replace(/<[^>]+>/g, ' ');

  // 中文停用词
  var stopWords = {
    '的':1,'了':1,'是':1,'在':1,'有':1,'和':1,'与':1,'或':1,'等':1,'及':1,'其':1,
    '这':1,'那':1,'个':1,'一':1,'二':1,'三':1,'可以':1,'进行':1,'通过':1,
    '关于':1,'以及':1,'对':1,'中':1,'上':1,'下':1,'内':1,'外':1,'以':1,
    '为':1,'被':1,'由':1,'将':1,'把':1,'让':1,'使':1,'会':1,'能':1,'可能':1,
    'the':1,'a':1,'an':1,'is':1,'are':1,'was':1,'were':1,'of':1,'to':1,'in':1,
    'for':1,'and':1,'or':1,'not':1,'with':1,'on':1,'at':1,'by':1,'from':1,'as':1,
    'it':1,'this':1,'that':1,'which':1,'who':1,'what':1,'how':1,'when':1,'where':1,
    'also':1,'more':1,'than':1,'some':1,'such':1,'into':1,'over':1,'after':1,'before':1,
    'between':1,'under':1,'during':1,'without':1,'within':1,'about':1,'above':1,'below':1,
    '我们':1,'他们':1,'它们':1,'她':1,'他':1,'我':1,'你':1,'大家':1,'通常':1,
    '一般':1,'包括':1,'主要':1,'重要':1,'相关':1,'不同':1,'相同':1,'各种':1,
    '一种':1,'一个':1,'这个':1,'那个':1,'什么':1,'如何':1,'为什么':1,'因为':1,
    '所以':1,'但是':1,'然而':1,'因此':1,'另外':1,'此外':1,'首先':1,'其次':1,
    '最后':1,'然后':1,'或者':1,'而且':1,'并且':1,'同时':1,'虽然':1,'尽管':1,
    '如果':1,'除非':1,'只要':1,'无论':1,'不管':1,'即使':1,'就算':1
  };

  // 分词：按标点、空格、常见分隔符分割
  var segments = text.split(/[\s,.;:!?"'（）【】《》\[\]{}、，。！？；：""''—–\-\n\r\t\/\\|@#\$%^&*()+<>=~`]+/);

  var freq = {};
  segments.forEach(function(s) {
    s = s.trim();
    // 过滤条件：长度 2-15 字符，不是纯数字，不是停用词
    if (s.length >= 2 && s.length <= 15 && !stopWords[s.toLowerCase()] && !/^\d+$/.test(s)) {
      freq[s] = (freq[s] || 0) + 1;
    }
  });

  // 取频率最高的 5 个
  var topTags = Object.keys(freq).sort(function(a, b) { return freq[b] - freq[a]; }).slice(0, 5);

  return topTags;
}

/**
 * HTML 转义 — 统一使用 window.escapeHtml（Q-01）
 * 规范实现在 js/utils.js，避免各模块重复定义导致转义字符集不一致
 */
var escapeHtml = (typeof window !== 'undefined' && typeof window.escapeHtml === 'function')
  ? window.escapeHtml
  : function(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    };

/**
 * 重新初始化首页关键组件（倒计时、Hero 动画、滚动动画）
 * 这些组件位于首屏或影响全局交互，需要立即执行。
 * 首次进入时会标记 _AppState._homePaintedReady，
 * 配合 finishRouting → bioquest:app-ready 实现"加载界面期间就加载好"。
 */
function reinitHomeComponents() {
  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minsEl = document.getElementById('cd-mins');
  const secsEl = document.getElementById('cd-secs');

  if (daysEl || hoursEl || minsEl || secsEl) {
    const TARGET_DATE = new Date('2026-08-16T09:00:00+08:00');
    function pad(n) { return String(n).padStart(2, '0'); }
    function update() {
      const now = new Date();
      const diff = Math.max(0, TARGET_DATE - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      if (daysEl) daysEl.textContent = pad(days);
      if (hoursEl) hoursEl.textContent = pad(hours);
      if (minsEl) minsEl.textContent = pad(mins);
      if (secsEl) secsEl.textContent = pad(secs);
    }
    update();
    if (_AppState._countdownTimer) clearInterval(_AppState._countdownTimer);
    _AppState._countdownTimer = setInterval(update, 1000);
  }

  if (typeof initHeroSketch === 'function') {
    try { initHeroSketch(); } catch (e) { console.warn('[BioQuest] Hero sketch init failed:', e); }
  }

  // 初始化平滑滚动动画（全局，首屏可见元素立即触发动画）
  initScrollAnimations();

  // 标记首页渲染完成（Hero 画布 + 倒计时数字 + 滚动动画已启动）
  // 下一帧再确认高度>0，确保布局已写入，避免撤遮罩后"还没撑开页面 → 下拉卡一下"
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      var hero = document.getElementById('main-content') || document.querySelector('.hero');
      if (hero) {
        // 触发一次 reflow 读取，强制浏览器完成布局
        void hero.offsetHeight;
      }
      _AppState._homePaintedReady = true;
      // 首页首屏绘制完成：推进一次加载进度档位（配合 index.html 的加权进度估算器）
      if (window.__bootWeight) { try { window.__bootWeight(20, 75); } catch (e) {} }
      // 若 finishRouting 已经执行过，则这里补发 app-ready 信号（解除遮罩等待）
      if (_AppState._homeRouteRendered && !_AppState._appReadyDispatched) {
        _AppState._appReadyDispatched = true;
        try { document.dispatchEvent(new CustomEvent('bioquest:app-ready')); } catch (e) {}
      }
    });
  });

  // 非关键模块延迟执行，避免阻塞首屏交互
  scheduleIdleWork(initNonCriticalHomeModules, { delay: 80 });
}

/**
 * 将任务调度到浏览器空闲时段执行
 * 优先使用 requestIdleCallback，不支持时使用 setTimeout(0) 兜底
 */
function scheduleIdleWork(fn, options) {
  options = options || {};
  var execute = function () {
    try {
      fn();
    } catch (e) {
      console.warn('[BioQuest] 空闲任务执行失败:', e);
    }
  };

  if (!options.immediate && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(execute, { timeout: options.timeout || 2000 });
  } else {
    setTimeout(execute, options.delay || 0);
  }
}
window.scheduleIdleWork = scheduleIdleWork;

/**
 * 初始化首页非关键模块
 * 每日一题、公告、生物学史时间轴、能力雷达、社区摘要等首屏下方内容
 * 在首屏渲染完成后再按需加载，不阻塞 DOMContentLoaded 后的交互
 */
function initNonCriticalHomeModules() {
  // 每日一题：首屏下方，按需渲染
  if (typeof window.renderDailyQuestion === 'function') {
    scheduleIdleWork(function () { window.renderDailyQuestion(); }, { delay: 50 });
  } else if (typeof window.loadModule === 'function') {
    window.loadModule('daily-question');
  }

  // 首页公告
  scheduleIdleWork(function () { loadHomeAnnouncements(); }, { delay: 100 });

  // 生物学史时间轴：由另一个 agent 负责添加 DOM，检测到容器后按需加载
  var bioSection = document.getElementById('biologyHistorySection');
  if (bioSection) {
    if (typeof window.initBiologyTimeline === 'function') {
      scheduleIdleWork(function () { window.initBiologyTimeline(bioSection); }, { delay: 120 });
    } else if (typeof window.loadModule === 'function') {
      window.loadModule('biology-history').then(function () {
        if (typeof window.initBiologyTimeline === 'function') {
          window.initBiologyTimeline(bioSection);
        }
      }).catch(function (err) {
        console.warn('[BioQuest] 生物学史模块加载失败:', err);
      });
    }
  }

  // 能力雷达：仅在 DOM 存在时加载
  var radarEl = document.getElementById('radarChart') || document.querySelector('[data-radar-chart]');
  if (radarEl && typeof window.loadModule === 'function') {
    window.loadModule('analytic');
  }

  // 社区摘要：仅在 DOM 存在时加载
  var communityEl = document.querySelector('[data-section="community-summary"]');
  if (communityEl && typeof window.loadModule === 'function') {
    window.loadModule('community');
  }
}
window.initNonCriticalHomeModules = initNonCriticalHomeModules;

/**
 * 加载首页公告
 */
var _announcementList = [];
var _announcementIndex = 0;

async function loadHomeAnnouncements() {
  var banner = document.getElementById('announcementBanner');
  if (!banner) return;

  try {
    var announcements = [];
    if (typeof window.getAnnouncements === 'function') {
      announcements = await window.getAnnouncements({ onlyActive: true, limit: 10 });
    }
    if (!announcements || announcements.length === 0) {
      banner.style.display = 'none';
      return;
    }
    _announcementList = announcements;
    _announcementIndex = 0;
    banner.style.display = 'block';
    showAnnouncementAtIndex(0);

    var nav = document.getElementById('announcementNav');
    if (announcements.length > 1 && nav) {
      nav.style.display = 'flex';
      document.getElementById('announcementPrev').onclick = function() {
        _announcementIndex = (_announcementIndex - 1 + _announcementList.length) % _announcementList.length;
        showAnnouncementAtIndex(_announcementIndex);
      };
      document.getElementById('announcementNext').onclick = function() {
        _announcementIndex = (_announcementIndex + 1) % _announcementList.length;
        showAnnouncementAtIndex(_announcementIndex);
      };
    }
  } catch (e) {
    banner.style.display = 'none';
  }
}

function showAnnouncementAtIndex(index) {
  var textEl = document.getElementById('announcementText');
  var counterEl = document.getElementById('announcementCounter');
  if (!textEl || !_announcementList[index]) return;
  var ann = _announcementList[index];
  var prefix = ann.is_pinned ? '[置顶] ' : '';
  textEl.textContent = prefix + ann.title + (ann.content ? ' | ' + ann.content.substring(0, 100) : '');
  textEl.style.animation = 'none';
  textEl.offsetHeight; // reflow
  textEl.style.animation = '';
  if (counterEl) {
    counterEl.textContent = (index + 1) + '/' + _announcementList.length;
  }
}

/**
 * 更新底部标签栏高亮状态
 */
function updateBottomTabBar(route) {
  var bar = document.getElementById('bottomTabBar');
  if (!bar) return;
  var tabs = bar.querySelectorAll('.bottom-tab');
  if (!tabs || tabs.length === 0) return;

  // 路由到标签的映射
  var tabMap = {
    '/': 'home',
    '/practice': 'practice',
    '/exam': 'exam',
    '/dashboard': 'dashboard',
    '/user': 'user'
  };

  var activeTab = tabMap[route] || '';

  tabs.forEach(function(tab) {
    var tabName = tab.getAttribute('data-tab');
    if (tabName === activeTab) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
}

/**
 * 初始化主页滚动动画
 * 使用 Intersection Observer 实现 section 入场动画
 */
function initScrollAnimations() {
  // 清理旧的 observer
  if (_AppState._scrollObserver) {
    _AppState._scrollObserver.disconnect();
  }

  // 为主页各区块添加 reveal 类
  var sections = document.querySelectorAll('[data-section]');
  for (var i = 0; i < sections.length; i++) {
    sections[i].classList.add('section-reveal');
  }

  // 为模块卡片添加子级 reveal
  var moduleBlocks = document.querySelectorAll('.module-block');
  for (var i = 0; i < moduleBlocks.length; i++) {
    moduleBlocks[i].classList.add('section-reveal-child');
    moduleBlocks[i].style.transitionDelay = (i * 0.08) + 's';
  }

  // 为统计项添加子级 reveal
  var statItems = document.querySelectorAll('.stat-item');
  for (var i = 0; i < statItems.length; i++) {
    statItems[i].classList.add('section-reveal-child');
    statItems[i].style.transitionDelay = (i * 0.1) + 's';
  }

  // 为流程步骤添加子级 reveal
  var processSteps = document.querySelectorAll('.process-step');
  for (var i = 0; i < processSteps.length; i++) {
    processSteps[i].classList.add('section-reveal-child');
    processSteps[i].style.transitionDelay = (i * 0.12) + 's';
  }

  _AppState._scrollObserver = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (entry.isIntersecting) {
        if (entry.target.classList.contains('section-reveal-child')) {
          entry.target.classList.add('section-reveal-child--visible');
        } else {
          entry.target.classList.add('section-reveal--visible');
        }
        // 区块可见后不再观察，但子元素继续观察以便 stagger
        if (!entry.target.classList.contains('section-reveal-child')) {
          _AppState._scrollObserver.unobserve(entry.target);
        }
      }
    }
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  // 观察所有目标元素
  var allReveals = document.querySelectorAll('.section-reveal, .section-reveal-child');
  for (var i = 0; i < allReveals.length; i++) {
    _AppState._scrollObserver.observe(allReveals[i]);
  }

  // 创建或更新滚动指示器
  setupScrollIndicator();
}

/**
 * 设置滚动指示器按钮
 */
function setupScrollIndicator() {
  var existing = document.getElementById('scrollIndicator');
  if (existing) return;

  var btn = document.createElement('button');
  btn.id = 'scrollIndicator';
  btn.className = 'scroll-down-indicator';
  btn.setAttribute('aria-label', '向下滚动');
  btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>';
  btn.addEventListener('click', function () {
    window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
  });
  document.body.appendChild(btn);

  // 监听滚动以显示/隐藏指示器
  var scrollTicking = false;
  window.addEventListener('scroll', function () {
    if (!scrollTicking) {
      requestAnimationFrame(function () {
        var scrollY = window.scrollY || window.pageYOffset;
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (scrollY > 200 && scrollY < docHeight - 100) {
          btn.classList.add('scroll-down-indicator--visible');
        } else {
          btn.classList.remove('scroll-down-indicator--visible');
        }
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }, { passive: true });
}

/**
 * 路由处理 — 根据当前路由渲染页面
 * @param {string} route - 路由路径
 */
var _routingInProgress = false;
var _pendingRoute = null;

/**
 * P0-1 路由访问检查：返回 { allowed } 或失败原因。
 * - auth:true  → 需已登录（含游客会话）
 * - role:'admin' → 需已登录且 user_group === 'admin'
 */
function _checkRouteAccess(route) {
  var cfg = Routes[route];
  if (!cfg || (!cfg.auth && !cfg.role)) return { allowed: true };
  var loggedIn = (typeof isLoggedIn === 'function') ? isLoggedIn() : false;
  if (!loggedIn) {
    return { allowed: false, reason: 'auth', route: route };
  }
  if (cfg.role) {
    var user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    if (!user || user.user_group !== cfg.role) {
      return { allowed: false, reason: 'role', role: cfg.role, route: route };
    }
  }
  return { allowed: true };
}

/**
 * P0-1 路由访问拒绝处理：记录来源 → 在目标页内展示访问提示。
 * 不强制跳回首页、不自动弹登录框：认证会话恢复慢或被拒时，
 * 用户停留在目标页看到「请先登录/权限不足」提示，避免被误认为还要重新登录。
 */
function _denyRouteAccess(route, access) {
  console.warn('[BioQuest] 路由访问被拒绝（随登录后恢复）:', access);
  try { sessionStorage.setItem('bioquest:authRedirect', route); } catch (e) {}

  var target = (typeof _AppState !== 'undefined' && _AppState.rootElement) || document.getElementById('page-content');
  if (!target) {
    // 兜底：找不到容器时才回退为跳首页
    if (typeof navigateTo === 'function') navigateTo('/');
    else if (typeof window.location !== 'undefined') window.location.hash = '#/';
    return;
  }

  _AppState.currentRoute = route;
  try { if (typeof updatePageTitle === 'function') updatePageTitle(route); } catch (e) {}
  var denied = !!(access && access.reason === 'role');
  target.innerHTML =
    '<div class="animate-fade-in" style="display:flex;align-items:center;justify-content:center;min-height:60vh;">' +
      '<div style="text-align:center;max-width:420px;padding:48px 32px;">' +
        '<div style="font-size:3.5rem;margin-bottom:16px;">' + (denied ? '🔒' : '👋') + '</div>' +
        '<div style="font-family:var(--font-serif,\'Noto Serif SC\',serif);font-size:1.4rem;font-weight:700;color:var(--color-deep,#1a3a2a);margin-bottom:8px;">' +
          (denied ? '权限不足' : '请先登录') +
        '</div>' +
        '<div style="font-size:0.9rem;color:var(--text-muted,#8a8a8a);line-height:1.7;margin-bottom:32px;">' +
          (denied ? '需要管理员权限才能访问此页面' : '登录后即可访问此页面') +
        '</div>' +
        '<div style="display:flex;gap:16px;justify-content:center;">' +
          '<button id="routeAccessLoginBtn" style="display:inline-flex;align-items:center;gap:8px;padding:14px 30px;border:none;border-radius:24px;background:linear-gradient(135deg,var(--color-sage,#5a7d5c),var(--color-deep,#1a3a2a));color:#fff;font-size:1rem;font-weight:600;cursor:pointer;box-shadow:0 4px 16px rgba(26,58,42,0.2);">' + (denied ? '切换账号' : '立即登录') + '</button>' +
          '<button id="routeAccessHomeBtn" style="display:inline-flex;align-items:center;gap:8px;padding:14px 30px;border:1px solid var(--border-light,#ece8e1);border-radius:24px;background:var(--bg-card,#fff);color:var(--text-primary,#1a2f1d);font-size:1rem;font-weight:600;cursor:pointer;">返回首页</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  var loginBtn = document.getElementById('routeAccessLoginBtn');
  if (loginBtn) loginBtn.addEventListener('click', function () {
    if (typeof showAuthModal === 'function') showAuthModal('login');
  });
  var homeBtn = document.getElementById('routeAccessHomeBtn');
  if (homeBtn) homeBtn.addEventListener('click', function () {
    if (typeof navigateTo === 'function') navigateTo('/');
  });
}

/**
 * 登录/登出后：若当前处于受保护路由且现在已可访问，则重新渲染以刷新登录态，
 * 避免「登录成功后仍在原页看不到用户中心 / 体验上需要再次登录」。
 */
function _refreshCurrentProtectedRoute() {
  var route = _AppState.currentRoute || (window.location.hash || '#/').replace(/^#/, '') || '/';
  var cfg = Routes[route];
  if (!cfg || (!cfg.auth && !cfg.role)) return;
  var access = _checkRouteAccess(route);
  if (access.allowed) {
    try { sessionStorage.removeItem('bioquest:authRedirect'); } catch (e) {}
    if (route === _AppState.currentRoute) {
      handleRoute(route);
    } else if (typeof navigateTo === 'function') {
      navigateTo(route);
    }
  }
}

function handleRoute(route) {
  // 路由重定向（用于合并相似模块，如 /review-deep → /wrongbook）
  var routeCfg = Routes[route];
  if (routeCfg && routeCfg.redirect) {
    // 特殊：带 redirectFlag 时，跳过 hash 跳转，直接渲染目标路由（避免 hash 丢失 query）
    if (routeCfg.redirectFlag) {
      try { sessionStorage.setItem('bioquest:redirectFlag', routeCfg.redirectFlag); } catch (e) {}
    }
    if (typeof navigateTo === 'function') {
      navigateTo(routeCfg.redirect);
    } else if (typeof window.location !== 'undefined') {
      window.location.hash = '#' + routeCfg.redirect;
    }
    return;
  }

  // P0-1 路由守卫：未登录/无权限路由拦截。
  // 需认证（auth）或需特定角色（role）的路由，在渲染前统一校验；
  // 首帧若认证尚未就绪，则等待其完成后重新判定，避免误拦截已登录用户。
  var _access = _checkRouteAccess(route);
  if (!_access.allowed) {
    if (window._authReadyDone !== true && typeof window.waitAuthReady === 'function') {
      window.waitAuthReady().then(function () {
        var again = _checkRouteAccess(route);
        if (again.allowed) {
          handleRoute(route);
        } else {
          _denyRouteAccess(route, again);
        }
      });
    } else {
      _denyRouteAccess(route, _access);
    }
    return;
  }

  // 防止递归调用导致栈溢出；同时把最新请求记下来，当前渲染结束后补跑
  if (_routingInProgress) {
    _pendingRoute = route;
    console.warn('[BioQuest] handleRoute 被递归调用，已暂存:', route);
    return;
  }
  _routingInProgress = true;
  _pendingRoute = null;

  _AppState.currentRoute = route;
  updatePageTitle(route);
  updateNavActive(route);

  // #119 路由切换播报：SPA 视图切换对屏幕阅读器不可见（无整页加载），
  // 用共享 aria-live 区播报目标页标题，让盲人用户感知导航已生效。
  if (window.BioQuestA11y && typeof window.BioQuestA11y.announce === 'function') {
    var _pageTitle = (routeCfg && routeCfg.title) ? routeCfg.title : '页面';
    window.BioQuestA11y.announce(_pageTitle + '，已加载', 'polite');
  }

  var target = _AppState.rootElement || document.getElementById('page-content');
  if (!target) {
    _routingInProgress = false;
    _flushPendingRoute();
    return;
  }

  // 清除旧状态
  target.classList.remove('animate-fade-out', 'animate-fade-in-up', 'page-content--home');
  target.style.opacity = '';
  target.style.transform = '';
  target.style.pointerEvents = '';
  target.style.visibility = '';

  // 清理全屏模块（如每日亿题）
  if (route !== '/daily-billion' && typeof window.destroyDailyBillion === 'function') {
    try { window.destroyDailyBillion(); } catch(e) { console.warn('[BioQuest] 清理daily-billion模块失败:', e); }
  }

  // 延迟加载对应模块 — 动态加载 JS 文件
  var moduleMap = {
    '/practice': 'practice',
    '/photo-quiz': 'photo-quiz',
    '/exam': 'exam',
    '/analytics': 'analytic',
    '/user': 'user',
    '/admin': 'admin',
    '/community': 'community',
    '/knowledge-graph': 'knowledge-graph',
    '/diagnosis': 'smart-diagnosis',
    '/pomodoro': 'pomodoro',
    '/habits': 'habits',
    '/review': 'review',
    '/bounties': 'bounty',
    '/wrongbook': 'wrongbook',
    '/review-deep': 'review-deep',
    '/study': 'study',
    '/bio-animation': 'bio-animation',
    '/dashboard': 'dashboard',
    '/tutor': 'tutor',
    '/discussion': 'discussion',
    '/bio-lab': 'bio-lab',
    '/phet-sims': 'phet-sims',
    '/trends': 'trends',
    '/teacher': 'teacher'
  };
  var modName = moduleMap[route];

  // 路由切换即时反馈：模块 JS 首次加载（网络拉取）期间在目标容器上展示
  // 轻量 loading，渲染开始即移除——避免"点击后页面长时间无任何变化"的
  // 空白等待感（第二次进入同一路由走缓存，不显示，无闪烁）。
  var _isFirstModuleLoad = !!modName && typeof window.loadModule === 'function' && !_loadedModules[modName];
  if (_isFirstModuleLoad) {
    try { target.classList.add('route-loading'); } catch (e) {}
  }

  var renderFn = function() {
    try { target.classList.remove('route-loading'); } catch (e) {}
    doRouteRender(route, target);
  };

  function finishRouting() {
    _routingInProgress = false;
    _flushPendingRoute();
    // 每次路由渲染完成都广播，供"回到顶部按钮"等按路由变化的组件刷新状态
    try { document.dispatchEvent(new CustomEvent('bioquest:route-change')); } catch (e) {}
    // P1-18 修复：路由切换后把焦点移入新页面主体标题，读屏/键盘用户不必回顶重按 Tab
    _manageFocusForNewRoute();
    // 首次路由渲染完成 → 通知首屏骨架遮罩淡出（只在首次触发一次）
    if (!_AppState._appReadyDispatched) {
      // 路由已完成首帧渲染：推进一次加载进度档位（加权进度估算器）
      if (window.__bootWeight) { try { window.__bootWeight(15, 55); } catch (e) {} }
      var route = _AppState.currentRoute || (window.location.hash || '#/').replace(/^#/, '') || '/';
      var isHome = (route === '/' || route === '' || route === '/index.html');
      if (isHome) {
        // 首页：等 reinitHomeComponents 把 Hero/倒计时/滚动动画都绘制完成（见 reinitHomeComponents rAF 回调）
        _AppState._homeRouteRendered = true;
        // 保险兜底：若 reinitHomeComponents 没被调用或超时，500ms 后仍会发 app-ready，不让遮罩卡住
        var safetyTimer = setTimeout(function () {
          if (!_AppState._appReadyDispatched) {
            _AppState._appReadyDispatched = true;
            try { document.dispatchEvent(new CustomEvent('bioquest:app-ready')); } catch (e) {}
          }
        }, 1500);
        // 若已提前 ready（非典型路径），立刻派发并清定时器
        if (_AppState._homePaintedReady) {
          clearTimeout(safetyTimer);
          _AppState._appReadyDispatched = true;
          try { document.dispatchEvent(new CustomEvent('bioquest:app-ready')); } catch (e) {}
        }
      } else {
        // 非首页路由：首次路由渲染完即可撤遮罩
        _AppState._appReadyDispatched = true;
        try { document.dispatchEvent(new CustomEvent('bioquest:app-ready')); } catch (e) {}
      }
    }
  }

  // P1-18 修复：路由渲染完成后，把键盘/读屏焦点移到新页面主体标题。
  // 优先聚焦 #page-content 内的 h1/h2 或带 .page-title 的元素；
  // 找不到标题时聚焦容器本身。
  // 注意：标题元素默认不可聚焦，故统一加 tabindex=-1（可编程聚焦、不进 Tab 顺序），
  // 否则对 h1/h2 调用 focus() 会静默失效。模块若自行聚焦输入框，会在其后
  // setTimeout 覆盖标题焦点，因此无需抢占守卫。
  function _manageFocusForNewRoute() {
    try {
      var root = (typeof _AppState !== 'undefined' && _AppState.rootElement) || document.getElementById('page-content');
      if (!root) return;
      var targets = ['h1', '.page-title', '[role="heading"]', 'h2'];
      var el = null;
      for (var i = 0; i < targets.length; i++) {
        el = root.querySelector(targets[i]);
        if (el) break;
      }
      if (!el) el = root;
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    } catch (e) { /* 聚焦失败不影响路由渲染 */ }
  }

  function showModuleError(modName, err) {
    console.error('[BioQuest] 模块加载失败:', modName, err);
    target.innerHTML = '<div style="text-align:center;padding:60px 20px;">' +
      '<p style="color:var(--color-error);font-size:1.1rem;margin-bottom:8px;">模块加载失败</p>' +
      '<p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:16px;">' + escapeHtml(err && err.message ? err.message : '请检查网络或刷新页面重试') + '</p>' +
      '<button data-on=\'["_cspReload"]\' style="padding:8px 20px;background:var(--color-sage);color:#fff;border:none;border-radius:8px;cursor:pointer;">刷新页面</button>' +
      '</div>';
  }

  if (modName && typeof window.loadModule === 'function') {
    window.loadModule(modName).then(function() {
      // 模块脚本执行后，再次确认初始化函数确实已暴露
      var initFnName = {
        '/practice': 'initPractice',
        '/photo-quiz': 'initPhotoQuiz',
        '/exam': 'initExam',
        '/analytics': 'initAnalytics',
        '/user': 'initUser',
        '/admin': 'initAdmin',
        '/community': 'initCommunity',
        '/knowledge-graph': 'initKnowledgeGraph',
        '/diagnosis': 'initSmartDiagnosis',
        '/pomodoro': 'initPomodoro',
        '/habits': 'initHabits',
        '/review': 'initReview',
        '/bounties': 'initBounties',
        '/wrongbook': 'initWrongbook',
        '/review-deep': 'initReviewDeep',
        '/study': 'initStudy',
        '/bio-animation': 'initBioAnimation',
        '/dashboard': 'initDashboard',
        '/tutor': 'initTutor',
        '/discussion': 'initDiscussion',
        '/bio-lab': 'initBioLab',
        '/trends': 'initTrends',
        '/teacher': 'initTeacher'
      }[route];
      if (initFnName && typeof window[initFnName] !== 'function') {
        // 给脚本一个微任务时间完成初始化
        setTimeout(function() {
          renderFn();
          finishRouting();
        }, 50);
        return;
      }
      renderFn();
      finishRouting();
    }).catch(function(err) {
      try { target.classList.remove('route-loading'); } catch (e) {}
      showModuleError(modName, err);
      finishRouting();
    });
  } else {
    renderFn();
    finishRouting();
  }
}

function _flushPendingRoute() {
  if (_pendingRoute && _pendingRoute !== _AppState.currentRoute) {
    var r = _pendingRoute;
    _pendingRoute = null;
    handleRoute(r);
  }
}

/**
 * 动态加载 JS 模块文件
 * 特性：并发去重、失败重试、超时保护、子目录自适应
 */
var _loadedModules = {};
var _loadingModules = {};

function _resolveModuleUrl(modName) {
    // 适配子目录部署：取当前页面最后一个 js/app.js 的目录作为基路径
    var base = '';
    var scripts = document.querySelectorAll('script[src*="js/app.js"]');
    if (scripts.length > 0) {
      var src = scripts[scripts.length - 1].src;
      base = src.substring(0, src.lastIndexOf('/js/app.js'));
      if (base) base += '/';
    }
    // 使用 app.js 自己的版本号作为 query string，避免 head 中预加载的脚本与动态加载版本不一致
    var appScript = scripts.length > 0 ? scripts[scripts.length - 1] : null;
    var ver = '20260809i';
    if (appScript && appScript.src) {
      var m = appScript.src.match(/[?&]v=([\w-]+)/);
      if (m) ver = m[1];
    }
    return base + 'js/' + modName + '.js?v=' + ver;
  }

// 模块依赖表：加载某模块前先加载其依赖
var _moduleDeps = {
  'practice': ['question-utils', 'loader'],
  'exam': ['question-utils', 'loader'],
  'review': ['question-utils', 'loader'],
  'wrongbook': ['question-utils', 'loader', 'review-deep'],
  'review-deep': ['question-utils', 'loader']
};

// 模块名 → 初始化函数名（用于检测 head 中预加载的脚本是否已注册 init）
function modNameToInitFn(modName) {
  var map = {
    'practice': 'initPractice',
    'exam': 'initExam',
    'analytics': 'initAnalytics',
    'user': 'initUser',
    'admin': 'initAdmin',
    'community': 'initCommunity',
    'knowledge-graph': 'initKnowledgeGraph',
    'diagnosis': 'initSmartDiagnosis',
    'pomodoro': 'initPomodoro',
    'habits': 'initHabits',
    'review': 'initReview',
    'bounties': 'initBounties',
    'wrongbook': 'initWrongbook',
    'review-deep': 'initReviewDeep',
    'study': 'initStudy',
    'bio-animation': 'initBioAnimation',
    'dashboard': 'initDashboard',
    'tutor': 'initTutor',
    'discussion': 'initDiscussion',
    'bio-lab': 'initBioLab',
    'phet-sims': 'initPhetSims',
    'trends': 'initTrends',
    'teacher': 'initTeacher',
    'photo-quiz': 'initPhotoQuiz',
    'learning-hub': 'initLearningHub',
    'daily-billion': 'initDailyBillion'
  };
  return map[modName];
}

window.loadModule = function(modName, options) {
  options = options || {};
  if (_loadedModules[modName]) return Promise.resolve();
  if (_loadingModules[modName]) return _loadingModules[modName];

  // 先加载依赖模块
  var deps = _moduleDeps[modName] || [];
  var depsPromise = deps.length > 0
    ? Promise.all(deps.map(function(d) { return window.loadModule(d, options); }))
    : Promise.resolve();

  _loadingModules[modName] = depsPromise.then(function() {
    var maxRetries = options.maxRetries || 2;
    var timeoutMs = options.timeout || 15000;
    return new Promise(function(resolve, reject) {
    var attempt = 0;
    var script = null;
    var timer = null;

    function cleanup() {
      if (timer) { clearTimeout(timer); timer = null; }
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }

    function onSuccess() {
      cleanup();
      _loadedModules[modName] = true;
      delete _loadingModules[modName];
      resolve();
    }

    function onFailure(err) {
      cleanup();
      attempt++;
      if (attempt <= maxRetries) {
        setTimeout(loadOnce, 300 * attempt);
      } else {
        delete _loadingModules[modName];
        reject(err || new Error('Failed to load module: ' + modName));
      }
    }

    function loadOnce() {
      // 防御性检查：如果对应 script 标签已经在 head 中，跳过动态加载
      var targetUrl = _resolveModuleUrl(modName);
      var baseName = modName + '.js';
      var existing = document.querySelector('script[src*="' + baseName + '"]');
      if (existing) {
        // 已经在 head 中预加载，等待初始化函数暴露
        var waitStart = Date.now();
        var initFnName = modNameToInitFn(modName);
        function tryFinish() {
          if (initFnName && typeof window[initFnName] === 'function') {
            onSuccess();
          } else if (Date.now() - waitStart < 3000) {
            setTimeout(tryFinish, 50);
          } else {
            // 3s 后仍未暴露，假定已经加载完成（init 函数可能在路由分支中才注册）
            onSuccess();
          }
        }
        tryFinish();
        return;
      }
      script = document.createElement('script');
      script.src = targetUrl;
      script.async = true;

      timer = setTimeout(function() {
        timer = null;
        onFailure(new Error('加载模块超时: ' + modName));
      }, timeoutMs);

      script.onload = onSuccess;
      script.onerror = function() {
        onFailure(new Error('加载模块失败: ' + modName));
      };

      document.head.appendChild(script);
    }

    loadOnce();
    });
  });

  return _loadingModules[modName];
};

var _doRouteRenderCount = 0;

/**
 * 渲染模块初始化错误提示
 */
function _renderModuleError(target, route, err) {
  try {
    target.innerHTML = '<div style="text-align:center;padding:60px 20px;">' +
      '<p style="color:var(--color-error);font-size:1.1rem;margin-bottom:8px;">页面加载失败</p>' +
      '<p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:16px;">' +
      escapeHtml((err && err.message) ? err.message : '模块初始化异常，请刷新页面重试') +
      '</p>' +
      '<button data-on=\'["_cspReload"]\' style="padding:8px 20px;background:var(--color-sage);color:#fff;border:none;border-radius:8px;cursor:pointer;margin-right:8px;">刷新页面</button>' +
      '<button data-on=\'["_cspGotoHash","/"]\' style="padding:8px 20px;background:transparent;border:1px solid var(--color-sage);color:var(--color-sage);border-radius:8px;cursor:pointer;">返回首页</button>' +
      '</div>';
  } catch (e2) { /* ignore */ }
}

function _showModuleLoading(target, initFnName) {
  try {
    if (!target) return;
    target.innerHTML = '<div style="text-align:center;padding:60px 20px;">' +
      '<div style="display:inline-block;width:32px;height:32px;border:3px solid rgba(0,0,0,0.1);border-top-color:var(--color-sage,#5a7d5c);border-radius:50%;animation:spin 0.8s linear infinite;"></div>' +
      '<p style="color:var(--text-muted);font-size:0.9rem;margin-top:16px;">加载中...</p>' +
      '</div>' +
      '<style>@keyframes spin { to { transform: rotate(360deg); } }</style>';
  } catch (e) {}
}

/**
 * 安全调用模块初始化函数
 * 修复：增加 try-catch + 栈深度检测，防止模块初始化内部同步重入导致栈溢出
 */
function _safeInit(initFnName, route, target) {
  // 同一 init 函数在同一调用栈中只允许执行一次，避免同步递归
  var _initDepthKey = '_initDepth_' + initFnName;
  var _depth = window[_initDepthKey] || 0;
  if (_depth > 3) {
    console.error('[BioQuest] 模块初始化递归检测 (depth=' + _depth + '):', route, initFnName);
    _renderModuleError(target, route, new Error('模块初始化递归过深: ' + initFnName));
    return;
  }
  window[_initDepthKey] = _depth + 1;
  // 异步加载的模块：如果 init 函数尚未就绪，等待其脚本加载（Bust 缓存版本号随修改同步升级）
  if (typeof window[initFnName] !== 'function') {
    var _pendingModules = {
      'initAdmin': 'admin.js',
      'initCommunity': 'community.js',
      'initUser': 'user.js'
    };
    var moduleFile = _pendingModules[initFnName];
    if (moduleFile) {
      _showModuleLoading(target, initFnName);
      var _script = document.createElement('script');
      _script.src = 'js/' + moduleFile + '?v=20260814c';
      _script.onload = function() {
        if (typeof window[initFnName] === 'function') {
          try { window[initFnName](target); } catch (e) { console.error(e); }
        }
      };
      document.head.appendChild(_script);
      return;
    }
  }
  try {
    if (typeof window[initFnName] === 'function') {
      try {
        window[initFnName](target);
      } catch (err) {
        console.error('[BioQuest] 模块初始化失败:', route, initFnName, err);
        _renderModuleError(target, route, err);
      }
    } else {
      console.error('[BioQuest] 模块初始化函数未找到:', route, initFnName);
      _renderModuleError(target, route, new Error('模块初始化函数未找到: ' + initFnName));
    }
  } finally {
    window[_initDepthKey] = _depth;
  }
}

function doRouteRender(route, target) {
  _doRouteRenderCount++;
  if (_doRouteRenderCount > 5) {
    var recErr = new Error('[BioQuest] doRouteRender 递归检测! count=' + _doRouteRenderCount + ' route=' + route);
    console.error(recErr.stack);
    _doRouteRenderCount = 0;
    return;
  }
  try {
    // 权限检查（仅用于需要登录才能查看的页面；社区允许游客浏览，发帖/评论在社区模块内部校验）
    var routePermissions = {
      '/exam': 'guest',
      '/practice': 'guest',
      '/community': 'guest',
      '/analytics': 'verified'
    };
    var requiredGroup = routePermissions[route];
    if (requiredGroup && typeof hasPermission === 'function' && !hasPermission(requiredGroup)) {
      var groupLabels = { admin: '管理员', premium: '高级会员', verified: '认证会员', member: '普通会员', guest: '访客' };
      target.innerHTML = '<div style="text-align:center;padding:60px 20px;">' +
        '<div style="font-size:48px;margin-bottom:16px;opacity:0.3;">需要登录</div>' +
        '<h2 style="font-size:20px;font-weight:600;margin-bottom:8px;">权限不足</h2>' +
        '<p style="font-size:14px;color:var(--text-secondary);margin-bottom:20px;">此功能需要【' + (groupLabels[requiredGroup] || requiredGroup) + '】及以上权限</p>' +
        '<button data-on=\'["_cspShowAuth"]\' style="background:var(--color-sage);color:#fff;border:none;padding:10px 24px;border-radius:20px;cursor:pointer;">升级权限</button>' +
        '</div>';
      return;
    }

    switch (route) {
      case '/':
        target.classList.add('page-content--home');
        if (_AppState._homeHTML) {
          target.innerHTML = _AppState._homeHTML;
          reinitHomeComponents();
        }
        break;
      case '/practice':
        _safeInit('initPractice', route, target);
        break;
      case '/photo-quiz':
        _safeInit('initPhotoQuiz', route, target);
        break;
      case '/exam':
        _safeInit('initExam', route, target);
        break;
      case '/analytics':
        _safeInit('initAnalytics', route, target);
        break;
      case '/user':
        _safeInit('initUser', route, target);
        break;
      case '/privacy':
        renderPrivacyPage(target);
        break;
      case '/search':
        renderSearchPage();
        break;
      case '/admin':
        _safeInit('initAdmin', route, target);
        break;
      case '/cards':
        renderCardsPage();
        break;
      case '/community':
        _safeInit('initCommunity', route, target);
        break;
      case '/leaderboard':
        renderLeaderboardPage(target);
        break;
      case '/points-leaderboard':
      case '/credit-leaderboard':
        // points-ui.js -> window.initCreditLeaderboard
        if (typeof window.initCreditLeaderboard === 'function') {
          window.initCreditLeaderboard(target);
        } else {
          _renderModuleError(target, route, new Error('points-ui 模块未加载'));
        }
        break;
      case '/points-shop':
      case '/credit':
        // points-ui.js -> window.initCreditCenter
        if (typeof window.initCreditCenter === 'function') {
          window.initCreditCenter(target);
        } else {
          _renderModuleError(target, route, new Error('points-ui 模块未加载'));
        }
        break;
      case '/knowledge-graph':
        _safeInit('initKnowledgeGraph', route, target);
        break;
      case '/diagnosis':
        _safeInit('initSmartDiagnosis', route, target);
        break;
      case '/pomodoro':
        _safeInit('initPomodoro', route, target);
        break;
      case '/habits':
        _safeInit('initHabits', route, target);
        break;
      case '/review':
        _safeInit('initReview', route, target);
        break;
      case '/bounties':
        _safeInit('initBounties', route, target);
        break;
      case '/wrongbook':
        _safeInit('initWrongbook', route, target);
        break;
      case '/review-deep':
        _safeInit('initReviewDeep', route, target);
        break;
      case '/study':
        _safeInit('initStudy', route, target);
        break;
      case '/bio-animation':
        _safeInit('initBioAnimation', route, target);
        break;
      case '/dashboard':
        _safeInit('initDashboard', route, target);
        break;
      case '/tutor':
        _safeInit('initTutor', route, target);
        break;
      case '/discussion':
        _safeInit('initDiscussion', route, target);
        break;
      case '/bio-lab':
        _safeInit('initBioLab', route, target);
        break;
      case '/phet-sims':
        _safeInit('initPhetSims', route, target);
        break;
      case '/trends':
        _safeInit('initTrends', route, target);
        break;
      case '/teacher':
        _safeInit('initTeacher', route, target);
        break;
      case '/classroom':
        // AI 课堂模块已移除，跳转到练习页（避免老书签 404）
        navigateTo('/practice');
        break;
      case '/learning-hub':
        _safeInit('initLearningHub', route, target);
        break;
      case '/reset-password':
        renderResetPasswordPage(target);
        break;
      // —— 集成模块路由（脚本在 index.html 中 defer 预加载，直接调用 window 上暴露的渲染函数） ——
      case '/sketch':
        // sketch-pad.js -> window.renderSketchPadPage
        if (typeof window.renderSketchPadPage === 'function') {
          window.renderSketchPadPage(target);
        } else {
          _renderModuleError(target, route, new Error('sketch-pad 模块未加载'));
        }
        break;
      case '/smiles':
        // rdkit-viewer.js -> window.renderSmilesPage
        if (typeof window.renderSmilesPage === 'function') {
          window.renderSmilesPage(target);
        } else {
          _renderModuleError(target, route, new Error('rdkit-viewer 模块未加载'));
        }
        break;
      case '/molecules':
        // molecule-viewer.js -> window.renderMoleculesPage
        if (typeof window.renderMoleculesPage === 'function') {
          window.renderMoleculesPage(target);
        } else {
          _renderModuleError(target, route, new Error('molecule-viewer 模块未加载'));
        }
        break;
      case '/genome':
        // genome-browser.js -> window.renderGenomeBrowserPage
        // igv.js (MIT) 懒加载：访问路由时才动态注入 igv.min.js（~1.5MB）
        if (typeof window.renderGenomeBrowserPage === 'function') {
          window.renderGenomeBrowserPage(target);
        } else if (window.GenomeBrowser && typeof window.GenomeBrowser.renderGenomeBrowserPage === 'function') {
          window.GenomeBrowser.renderGenomeBrowserPage(target);
        } else if (typeof window.initGenomeBrowser === 'function') {
          window.initGenomeBrowser(route, target);
        } else {
          _renderModuleError(target, route, new Error('genome-browser 模块未加载'));
        }
        break;
      case '/community-enhanced':
        // community-enhanced.js -> window.initCommunityEnhanced / window.CommunityEnhanced.renderCommunityEnhancedPage
        if (typeof window.initCommunityEnhanced === 'function') {
          window.initCommunityEnhanced(route, target);
        } else if (window.CommunityEnhanced && typeof window.CommunityEnhanced.renderCommunityEnhancedPage === 'function') {
          window.CommunityEnhanced.renderCommunityEnhancedPage(target);
        } else {
          _renderModuleError(target, route, new Error('community-enhanced 模块未加载'));
        }
        break;
      case '/daily-billion':
        if (typeof window.initDailyBillion === 'function') {
          window.initDailyBillion(target);
        } else {
          _renderModuleError(target, route, new Error('daily-billion 模块未加载'));
        }
        break;
      default:
        target.classList.add('page-content--home');
        if (_AppState._homeHTML) {
          target.innerHTML = _AppState._homeHTML;
          reinitHomeComponents();
        }
    }

    // 非首页路由添加页面进入动画
    if (route !== '/') {
      target.classList.add('page-enter');
      target.addEventListener('animationend', function handler() {
        target.classList.remove('page-enter');
        target.removeEventListener('animationend', handler);
      });
    }

    // 更新底部标签栏高亮
    updateBottomTabBar(route);
  } catch (err) {
    console.error('[BioQuest] 路由渲染错误:', route, err);
    try {
      target.innerHTML = '<div style="text-align:center;padding:64px 24px;"><p style="color:var(--color-error);">页面加载失败，请刷新重试</p><p style="color:var(--text-muted);font-size:0.85rem;margin-top:8px;">路由: ' + route + '</p></div>';
    } catch (e2) { /* ignore */ }
  } finally {
    _doRouteRenderCount--;
  }
}

/**
 * 主题切换（PRD §5-10：支持多套色彩主题）
 * @param {string} [theme] - 目标主题，不传则在 light/dark 之间切换
 *   支持: 'light', 'dark', 'amber', 'indigo', 'rose'
 */
function toggleTheme(theme) {
  const COLOR_THEMES = ['amber', 'indigo', 'rose'];

  if (theme && COLOR_THEMES.indexOf(theme) >= 0) {
    // 色彩主题（保留深色模式，仅改变强调色）
    _AppState.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'amber') {
      document.documentElement.style.setProperty('--color-amber', '#c4956a');
      document.documentElement.style.setProperty('--color-sage', '#5a7d5c');
      document.documentElement.style.setProperty('--color-accent', '#c4956a');
    } else if (theme === 'indigo') {
      document.documentElement.style.setProperty('--color-amber', '#7c8db5');
      document.documentElement.style.setProperty('--color-sage', '#4a6a8a');
      document.documentElement.style.setProperty('--color-accent', '#7c8db5');
    } else if (theme === 'rose') {
      document.documentElement.style.setProperty('--color-amber', '#c47a8a');
      document.documentElement.style.setProperty('--color-sage', '#8a5a6a');
      document.documentElement.style.setProperty('--color-accent', '#c47a8a');
    }
    if (typeof saveSetting === 'function') {
      saveSetting('theme', theme);
    } else {
      try { localStorage.setItem('bioquest-theme', theme); } catch (e) {}
    }
    return;
  }

  const current = _AppState.theme;
  let nextTheme;

  if (theme === 'light' || theme === 'dark') {
    nextTheme = theme;
  } else {
    nextTheme = current === 'light' ? 'dark' : 'light';
  }

  _AppState.theme = nextTheme;

  if (nextTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  if (typeof saveSetting === 'function') {
    saveSetting('theme', nextTheme);
  } else {
    try {
      localStorage.setItem('bioquest-theme', nextTheme);
    } catch (e) {
    }
  }

  const themeIcons = document.querySelectorAll('.theme-toggle');
  themeIcons.forEach((btn) => {
    btn.setAttribute('aria-label', nextTheme === 'dark' ? '切换浅色模式' : '切换深色模式');
    btn.setAttribute('title', nextTheme === 'dark' ? '切换浅色模式' : '切换深色模式');
  });
}

window.toggleTheme = toggleTheme;

/**
 * 汉堡菜单切换
 */
function toggleMobileMenu() {
  const hamburger = document.getElementById('hamburgerBtn');
  const mobileNav = document.getElementById('mobileNav');
  const overlay = document.getElementById('mobileOverlay');

  if (!hamburger || !mobileNav || !overlay) return;

  const isActive = hamburger.classList.contains('active');

  if (isActive) {
    hamburger.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileNav.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  } else {
    hamburger.classList.add('active');
    hamburger.setAttribute('aria-expanded', 'true');
    mobileNav.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

/**
 * 关闭汉堡菜单
 */
function closeMobileMenu() {
  const hamburger = document.getElementById('hamburgerBtn');
  const mobileNav = document.getElementById('mobileNav');
  const overlay = document.getElementById('mobileOverlay');

  if (hamburger) {
    hamburger.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
  }
  if (mobileNav) mobileNav.classList.remove('active');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}

/**
 * 绑定全局事件
 */
function bindEvents() {
  window.addEventListener('hashchange', () => {
    const route = getRouteFromHash();
    handleRoute(route);
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-route]');
    if (link) {
      const route = link.getAttribute('data-route');
      if (route && Routes[route]) {
        e.preventDefault();
        // 解析 href 中的 ?tab=xxx 并写入 sessionStorage（绕过 hash 不能携带 query 的限制）
        try {
          var href = link.getAttribute('href') || '';
          var qIdx = href.indexOf('?');
          if (qIdx > 0) {
            var qs = href.slice(qIdx + 1);
            var params = new URLSearchParams(qs);
            var tab = params.get('tab');
            if (tab) {
              sessionStorage.setItem('bioquest:studyTab', tab);
            }
          }
        } catch (e2) { /* ignore */ }
        const target = _AppState.rootElement || document.getElementById('page-content');
        if (target) {
          target.setAttribute('data-page-transition', 'exiting');
        }
        navigateTo(route);
        closeMobileMenu();
        return;
      }
    }

    if (e.target.closest('#themeToggle') || e.target.closest('#themeToggleMobile')) {
      e.preventDefault();
      toggleTheme();
      return;
    }

    if (e.target.closest('#hamburgerBtn')) {
      e.preventDefault();
      toggleMobileMenu();
      return;
    }

    if (e.target.closest('#mobileOverlay') || e.target.closest('#mobileNavClose')) {
      closeMobileMenu();
      return;
    }

    // 排行榜按钮点击处理
    if (e.target.closest('#nav-leaderboard-btn-desktop') || e.target.closest('#nav-leaderboard-btn')) {
      e.preventDefault();
      if (typeof showLeaderboard === 'function') showLeaderboard();
      return;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMobileMenu();
      if (typeof closeLeaderboard === 'function') closeLeaderboard();
    }
  });
}

/**
 * 延迟加载页面模块脚本
 * @param {string} moduleName - 模块名称
 * @returns {Promise<void>}
 */
async function loadPageModule(moduleName) {
  if (_AppState.pageModules[moduleName]) {
    return;
  }

  try {
    // 添加 cache-bust 参数避免浏览器缓存旧版模块（如 tutor.js）
    const module = await import(`./${moduleName}.js?v=20260809g`);
    _AppState.pageModules[moduleName] = module;
  } catch (err) {
    console.warn(`[BioQuest] 模块 ${moduleName} 加载失败:`, err.message);
  }
}

/**
 * 恢复用户设置
 */
function restoreSettings() {
  try {
    if (typeof loadSetting === 'function') {
      const theme = loadSetting('theme', 'light');
      const fontSize = loadSetting('fontSize', 'medium');
      const questionCount = loadSetting('questionCount', 30);
      const showTimer = loadSetting('showTimer', true);
      const autoSubmit = loadSetting('autoSubmit', false);

      _AppState.userSettings = { fontSize, questionCount, showTimer, autoSubmit };
      toggleTheme(theme);
    } else {
      const theme = localStorage.getItem('bioquest-theme') || 'light';
      if (theme === 'dark') {
        toggleTheme('dark');
      }
    }
  } catch (e) {
    console.warn('[BioQuest] 设置恢复失败:', e);
  }
}

/**
 * 诊断后端 API 连通性（暴露到全局供调试）
 */
window.testSupabaseAPI = async function() {

  try {
    var sb = typeof window.getSupabase === 'function' ? window.getSupabase() : null;
    if (!sb) { return { status: 'error', msg: 'Supabase 未初始化' }; }
    var { data, error } = await sb.from('profiles').select('id,username').limit(1);
    if (error) { return { status: 'error', msg: error.message }; }

    return { status: 'ok', data: data };
  } catch (err) {

    return { status: 'error', msg: err.message };
  }
};

/**
 * 初始化 Supabase 云端同步
 * 先动态加载 supabase 相关脚本（首屏不加载，节省 ~140KB）
 */
// ============================================================
// 全局「认证就绪」信号
// 修复：「我的」等需要登录的页面在整页加载时，会先于 Supabase 会话恢复
// 而渲染，导致 isLoggedIn() 误判为未登录。通过该 Promise 让这些页面
// 等待会话恢复完成后再判断登录态，实现「登录一次全局生效」。
// ============================================================
var _authReadyResolve = null;
var _authReadyPromise = new Promise(function (res) { _authReadyResolve = res; });
window._authReadyPromise = _authReadyPromise;

/**
 * 等待认证状态初始化完成（会话恢复 / 游客恢复 / 降级本地模式均已结束）。
 * 供 initUser 等需要判断登录态的模块调用，避免竞态导致的「重新登录」。
 */
window.waitAuthReady = function () { return _authReadyPromise; };

function _resolveAuthReady() {
  if (_authReadyResolve) {
    _authReadyResolve = null;
    _authReadyPromise = Promise.resolve();
    window._authReadyPromise = _authReadyPromise;
    window._authReadyDone = true;
  }
}

async function initSupabase() {
  try {
    // 等待 Supabase SDK 加载完成（由 HTML 中的 requestIdleCallback 触发加载）
    var sdkWait = 0;
    while (typeof window.supabase === 'undefined' && sdkWait < 10000) {
      await new Promise(function(r) { setTimeout(r, 200); });
      sdkWait += 200;
    }
    if (typeof window.supabase === 'undefined') {
      console.warn('[BioQuest] Supabase SDK 加载超时，使用本地模式');
      showStorageStatus('local');
      updateAuthUI();
      _resolveAuthReady();
      return;
    }

    // 动态加载 supabase 相关脚本（按依赖顺序）
    var v = '20260905a';
    var supabaseScripts = [
      __jsBase + 'js/supabase-client.js?v=' + v,
      __jsBase + 'js/supabase.js?v=' + v,
      __jsBase + 'js/storage.js?v=' + v
    ];
    await __loadScriptChain(supabaseScripts);

    // 先检测 API 基地址
    if (typeof initApi === 'function') {
      await initApi();
    }

    // 恢复会话 —— 注意 await！restoreSession 是 async 函数
    var restored = await restoreSession();
    if (restored) {
      var user = getCurrentUser();

      showStorageStatus('cloud');
      updateAuthUI();
      await mergeCloudData();
      _resolveAuthReady();
      return;
    }

    // 尝试恢复游客会话
    if (typeof restoreGuestSession === 'function' && restoreGuestSession()) {

      showStorageStatus('local');
      updateAuthUI();
      _resolveAuthReady();
      return;
    }

    // 未登录用户使用本地存储
    showStorageStatus('local');
  } catch (e) {
    console.warn('[BioQuest] Supabase 初始化失败，使用本地模式:', e.message);
    showStorageStatus('local');
  }
  updateAuthUI();
  _resolveAuthReady();
}

/**
 * 更新认证 UI
 */
function updateAuthUI() {
  var authBtn = document.getElementById('auth-btn');
  if (!authBtn) return;

  if (isLoggedIn()) {
    var user = getCurrentUser();
    var groupLabels = { admin: '管理员', premium: '高级会员', verified: '认证会员', member: '会员', guest: '访客' };
    var groupLabel = groupLabels[user.user_group] || '会员';
    var displayName = user.display_name || user.username || '用户';
    var isGuest = user.isGuest || user.user_group === 'guest';
    // 头像：优先 getAvatarUrl()，无头像时用首字母兜底
    var avatarUrl = (typeof getAvatarUrl === 'function') ? getAvatarUrl() : null;
    var initial = displayName.charAt(0).toUpperCase();
    var displayNameSafe = escapeHtml(displayName);
    var avatarHtml;
    if (avatarUrl) {
      var avatarUrlSafe = escapeHtml(avatarUrl);
      avatarHtml = '<img src="' + avatarUrlSafe + '" alt="" style="width:24px;height:24px;border-radius:50%;object-fit:cover;flex-shrink:0;">';
    } else {
      var initialSafe = escapeHtml(initial);
      avatarHtml = '<span style="width:24px;height:24px;border-radius:50%;background:var(--color-warm,#c4956a);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:600;flex-shrink:0;">' + initialSafe + '</span>';
    }
    authBtn.innerHTML = avatarHtml + '<span style="max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + displayNameSafe + '</span> <span style="font-size:0.7rem;opacity:0.7;">' + groupLabel + '</span>';
    authBtn.style.cssText = 'background: var(--color-deep, #1a3a2a); color: #fff; border: none; padding: 6px 14px; border-radius: 20px; cursor: pointer; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 8px; max-width: 240px;';
    authBtn.onclick = function() {
      navigateTo('/user');
    };
    authBtn.title = groupLabel + (isGuest ? ' · 点击进入用户中心（可升级为正式会员）' : ' · 点击进入用户中心');
  } else {
    authBtn.textContent = '登录';
    authBtn.style.cssText = 'background: linear-gradient(135deg, #3a8c5c, #2d6a47); color: #fff; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 0.85rem;';
    authBtn.onclick = showAuthModal;
    authBtn.title = '登录/注册 BioQuest 账号';
  }
}

/**
 * 显示登录注册弹窗 — Tab 切换设计
 */
function showAuthModal(mode) {
  var existing = document.getElementById('auth-modal');
  if (existing) {
    existing.classList.add('visible');
    if (mode === 'register') authSwitchToRegister();
    else authSwitchToLogin();
    return;
  }

  var overlay = document.createElement('div');
  overlay.id = 'auth-modal';
  overlay.className = 'auth-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '登录或注册 BioQuest 账号');
  overlay.innerHTML = `
    <div class="auth-container" id="auth-container">
      <button class="auth-close-btn" data-on='["closeAuthModal"]' title="关闭">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div class="auth-tabs" id="auth-tabs">
        <span class="auth-tab-indicator" id="auth-tab-indicator"></span>
        <button class="auth-tab active" id="auth-tab-login" data-on='["authSwitchToLogin"]'>登录</button>
        <button class="auth-tab" id="auth-tab-register" data-on='["authSwitchToRegister"]'>注册</button>
        <button class="auth-tab" id="auth-tab-forgot" data-on='["authSwitchToForgot"]'>找回密码</button>
      </div>
      <div class="auth-form-panel active" id="auth-form-login">
        <h2 class="auth-form-title">欢迎回来</h2>
        <p class="auth-form-sub">登录你的 BioQuest 账号继续探索</p>
        <div class="auth-field">
          <svg class="auth-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
          <input type="text" class="auth-input" id="auth-login-username" placeholder="用户名 / 邮箱" autocomplete="username">
        </div>
        <div class="auth-field">
          <svg class="auth-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <input type="password" class="auth-input" id="auth-login-password" placeholder="密码" autocomplete="current-password">
        </div>
        <div class="slide-cap-trigger" id="slide-cap-trigger-login" data-state="pending" data-on='["_cspSlideCaptcha","login"]'>
          <svg class="slide-cap-trigger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span class="slide-cap-trigger-text" id="slide-cap-trigger-text-login">点击完成安全验证</span>
          <span class="slide-cap-trigger-arrow">→</span>
        </div>
        <div class="auth-form-extra">
          <label for="auth-remember" style="display:flex;align-items:center;gap:6px;font-size:0.85rem;color:#cfd8d0;cursor:pointer;user-select:none;">
            <input type="checkbox" id="auth-remember" checked style="accent-color:#5a7d5c;cursor:pointer;">
            记住我的账号
          </label>
          <a href="#" data-on='["authSwitchToForgot"]' data-prevent-default>忘记密码？</a>
        </div>
        <button type="button" class="auth-btn" data-on='["handleLogin"]' data-prevent-default>登 录</button>
        <p class="auth-error" id="auth-login-error"></p>
        <div style="text-align:center;margin-top:10px;border-top:1px solid rgba(255,255,255,0.08);padding-top:10px;">
          <div class="auth-field">
            <svg class="auth-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <input type="password" class="auth-input" id="auth-guest-password" placeholder="设置密码（可选，用于找回账号）" autocomplete="new-password">
          </div>
          <button type="button" class="auth-btn-guest" data-on='["handleGuestLogin"]' data-prevent-default style="background:linear-gradient(135deg,#c4956a,#d4a574);border:none;color:#1a2f1d;padding:10px 20px;border-radius:20px;cursor:pointer;font-size:0.9rem;font-weight:600;width:100%;transition:all 0.2s;box-shadow:0 2px 8px rgba(196,149,106,0.3);">
            🚀 游客登录（无需注册）
          </button>
        </div>
        <div style="text-align:center;margin-top:6px;">
          <a href="#/admin" data-on='["closeAuthModal"]' class="auth-link" style="font-size:0.72rem;">管理员入口</a>
        </div>
      </div>
      <div class="auth-form-panel" id="auth-form-register">
        <h2 class="auth-form-title">创建账号</h2>
        <p class="auth-form-sub">加入 BioQuest 开启生物学习之旅</p>
        <div class="auth-field">
          <svg class="auth-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
          <input type="text" class="auth-input" id="auth-register-username" placeholder="用户名" autocomplete="username">
        </div>
        <div class="auth-field">
          <svg class="auth-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7-4-4"/></svg>
          <input type="email" class="auth-input" id="auth-register-email" placeholder="邮箱（选填，丢失密码时找回）" autocomplete="email">
        </div>
        <div class="auth-field">
          <svg class="auth-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          <input type="text" class="auth-input" id="auth-register-name" placeholder="昵称（选填）" autocomplete="nickname">
        </div>
        <div class="auth-field">
          <svg class="auth-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <input type="password" class="auth-input" id="auth-register-password" placeholder="密码（至少6位）" autocomplete="new-password">
        </div>
        <div class="slide-cap-trigger" id="slide-cap-trigger-register" data-state="pending" data-on='["_cspSlideCaptcha","register"]'>
          <svg class="slide-cap-trigger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span class="slide-cap-trigger-text" id="slide-cap-trigger-text-register">点击完成安全验证</span>
          <span class="slide-cap-trigger-arrow">→</span>
        </div>
        <button type="button" class="auth-btn" data-on='["handleRegister"]' data-prevent-default>注 册</button>
        <p class="auth-error" id="auth-register-error"></p>
        <p id="auth-register-debug" style="font-size:0.65rem;color:#889;text-align:center;margin:4px 0;line-height:1.5;word-break:break-all;display:none;"></p>
      </div>
      <div class="auth-form-panel" id="auth-form-forgot">
        <h2 class="auth-form-title">重置密码</h2>
        <p class="auth-form-sub">使用 8 字符密钥重置密码（无需邮件）</p>
        <div style="display:flex;gap:8px;margin-bottom:14px;justify-content:center;">
          <label style="display:flex;align-items:center;gap:4px;font-size:0.82rem;cursor:pointer;color:#cfd8d0;">
            <input type="radio" name="forgot-mode" value="reset" checked data-on-change='["toggleForgotMode"]'> 重置密码
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;color:#cfd8d0;cursor:pointer;">
            <input type="radio" name="forgot-mode" value="recover-key" data-on-change='["toggleForgotMode"]'> 找回密钥
          </label>
        </div>

        <div id="forgot-mode-reset">
          <div class="auth-field">
            <svg class="auth-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
            <input type="text" class="auth-input" id="auth-forgot-username" placeholder="用户名" autocomplete="username">
          </div>
          <div class="auth-field">
            <svg class="auth-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1.5"/></svg>
            <input type="text" class="auth-input" id="auth-forgot-userkey" placeholder="8 字符密钥（如 XXXX2K7M）" maxlength="8" autocomplete="off" style="text-transform:uppercase;letter-spacing:2px;font-family:monospace;">
          </div>
          <div class="auth-field">
            <svg class="auth-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <input type="password" class="auth-input" id="auth-forgot-newpassword" placeholder="新密码（至少 6 位）" autocomplete="new-password">
          </div>
          <div class="auth-field">
            <svg class="auth-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <input type="password" class="auth-input" id="auth-forgot-newpassword2" placeholder="再次输入新密码" autocomplete="new-password">
          </div>
        </div>

        <div id="forgot-mode-recover-key" style="display:none;">
          <div class="auth-field">
            <svg class="auth-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
            <input type="text" class="auth-input" id="auth-recover-username" placeholder="用户名" autocomplete="username">
          </div>
          <div class="auth-field">
            <svg class="auth-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7-4-4"/></svg>
            <input type="text" class="auth-input" id="auth-recover-email" placeholder="邮箱后缀（如 @gmail.com）" autocomplete="off">
          </div>
          <p style="font-size:0.72rem;color:#8a9a8a;margin:6px 0 12px;line-height:1.5;">需要通过用户名 + 邮箱后缀验证身份</p>
        </div>

        <button type="button" class="auth-btn" data-on='["handleForgotPassword"]' data-prevent-default>重置密码</button>
        <p class="auth-error" id="auth-forgot-error"></p>
        <p class="auth-success" id="auth-forgot-success"></p>
        <div style="text-align:center;margin-top:10px;">
          <a href="#" data-on='["authSwitchToLogin"]' data-prevent-default class="auth-link">返回登录</a>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeAuthModal();
  });

  setTimeout(function() { overlay.classList.add('visible'); }, 10);
  if (mode === 'register') setTimeout(authSwitchToRegister, 20);
  else setTimeout(updateAuthTabIndicator, 20);

  // P0 登录持久化：若用户勾选了“记住我的账号”，自动预填上次登录标识
  if (mode !== 'register') {
    var savedId = null;
    try { savedId = localStorage.getItem('bioquest_remember_id'); } catch (e) {}
    if (savedId) {
      var loginUserEl = document.getElementById('auth-login-username');
      if (loginUserEl) loginUserEl.value = savedId;
      var loginPwdEl = document.getElementById('auth-login-password');
      if (loginPwdEl) loginPwdEl.focus();
    }
  }

  // 延迟渲染验证码
  setTimeout(function () {
    refreshCaptcha('register');
    refreshCaptcha('login');
  }, 100);

  // 焦点陷阱：ESC 关闭、初始聚焦到用户名输入
  if (window.BioQuestA11y && typeof window.BioQuestA11y.trapFocus === 'function') {
    if (_authFocusTrap) { _authFocusTrap.release(); _authFocusTrap = null; }
    _authFocusTrap = window.BioQuestA11y.trapFocus(overlay, {
      onEscape: closeAuthModal,
      initialFocus: overlay.querySelector('#auth-login-username')
    });
  }
}

/**
 * 关闭登录弹窗
 */
function closeAuthModal() {
  if (_authFocusTrap) { _authFocusTrap.release(); _authFocusTrap = null; }
  var modal = document.getElementById('auth-modal');
  if (modal) modal.classList.remove('visible');
}

/**
 * 弹出「逃跑按钮」反向验证码（v5：去 AI 味 + 备选入口）
 * @param {string} type - 'login' | 'register'
 * @returns {Promise<boolean>}
 *
 * 设计：让真人和机器人做反的事情
 *  - 移动端直接通过
 *  - PC 端 mouseenter 触发按钮瞬移
 *  - 失败 3 次后按钮投降自动通过
 *  - 「我抓不到」入口 → 跳到扫雷小游戏
 */
function _showEscapeCaptcha(type) {
  return new Promise(function (resolve) {
    return _showEscapeCaptchaInner(type, resolve);
  });
}

function _showEscapeCaptchaInner(type, resolve) {
  // 移除已有的
  var existing = document.getElementById('escape-captcha-modal');
  if (existing) existing.remove();

  var isTouch = (typeof window.matchMedia === 'function') &&
    (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches);

  // 文案池
  var escapeLines = [
    '点这里',
    '换个地方',
    '没点到',
    '再试试',
    '差一点',
    '换个位置',
    '又跑了',
    '继续',
    '没抓住',
    '往哪跑'
  ];
  var surrenderText = '行 你赢了';

  // 随机选 3 条
  var shuffled = escapeLines.slice().sort(function () { return Math.random() - 0.5; });
  var selectedLines = [shuffled[0], shuffled[1], shuffled[2]];

  var modal = document.createElement('div');
  modal.id = 'escape-captcha-modal';
  modal.innerHTML = [
    '<div class="escape-cap-overlay">',
    '  <div class="escape-cap-panel">',
    '    <div class="escape-cap-stage" id="escape-cap-stage">',
    '      <button type="button" class="escape-cap-btn" id="escape-cap-btn">点这里</button>',
    '    </div>',
    '    <div class="escape-cap-bottom">',
    '      <button type="button" class="escape-cap-fail" id="escape-cap-fail">我抓不到</button>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join('');

  document.body.appendChild(modal);

  var btn = modal.querySelector('#escape-cap-btn');
  var failBtn = modal.querySelector('#escape-cap-fail');

  var escapeCount = 0;
  var pass = false;
  var resolved = false;
  var maxEscapes = 3;

  function close(result) {
    if (resolved) return;
    resolved = true;
    modal.remove();
    if (result) {
      _markSlideCaptchaPassed(type);
    }
    resolve(result);
  }

  function triggerPass() {
    if (pass || resolved) return;
    pass = true;
    btn.classList.add('passed');
    btn.textContent = '通过';
    failBtn.style.display = 'none';
    setTimeout(function () { close(true); }, 700);
  }

  function rand(min, max) { return min + Math.random() * (max - min); }

  function escapeButton() {
    if (pass || resolved) return;
    if (isTouch) return;
    escapeCount += 1;

    if (escapeCount >= maxEscapes) {
      // 投降
      btn.removeEventListener('mouseenter', escapeButton);
      btn.textContent = surrenderText;
      btn.classList.add('surrendered');
      setTimeout(function () {
        triggerPass();
      }, 500);
      return;
    }

    // 显示文案
    var i = Math.min(escapeCount - 1, selectedLines.length - 1);
    btn.textContent = selectedLines[i];

    // 瞬移
    var rect = btn.getBoundingClientRect();
    var btnW = rect.width;
    var btnH = rect.height;
    var viewportW = window.innerWidth;
    var viewportH = window.innerHeight;

    var angle = Math.random() * Math.PI * 2;
    var dist = rand(100, 220);
    var dx = Math.cos(angle) * dist;
    var dy = Math.sin(angle) * dist;

    var cx = rect.left + btnW / 2;
    var cy = rect.top + btnH / 2;
    var nx = cx + dx;
    var ny = cy + dy;

    var minX = btnW / 2 + 16;
    var maxX = viewportW - btnW / 2 - 16;
    var minY = btnH / 2 + 16;
    var maxY = viewportH - btnH / 2 - 16;
    nx = Math.max(minX, Math.min(maxX, nx));
    ny = Math.max(minY, Math.min(maxY, ny));

    var newLeft = nx - btnW / 2;
    var newTop = ny - btnH / 2;

    btn.style.position = 'fixed';
    btn.style.left = newLeft + 'px';
    btn.style.top = newTop + 'px';
    btn.style.right = 'auto';
    btn.style.bottom = 'auto';
    btn.style.transform = 'none';
  }

  if (isTouch) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (pass) return;
      triggerPass();
    });
  } else {
    btn.addEventListener('mouseenter', escapeButton);
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (pass) return;
      if (escapeCount >= maxEscapes) {
        triggerPass();
      }
      // 未投降时点击无效 —— 按钮已经瞬移走了
    });
  }

  // 「我抓不到」入口
  failBtn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (resolved) return;
    // 切换到备选验证码（扫雷）
    modal.remove();
    resolved = true;
    _showMinesweeperCaptcha(type).then(resolve);
  });
}

/**
 * 备选验证码 #1：扫雷小游戏
 * 5x5 网格 + 4 颗雷，点开 5 个安全格算通过
 */
function _showMinesweeperCaptcha(type) {
  return new Promise(function (resolve) {
    var existing = document.getElementById('mine-captcha-modal');
    if (existing) existing.remove();

    var GRID = 5;
    var MINES = 4;
    var NEED_SAFE = 5;

    // 随机生成雷
    var mineSet = {};
    while (Object.keys(mineSet).length < MINES) {
      var k = Math.floor(Math.random() * GRID * GRID);
      mineSet[k] = true;
    }

    // 计算每个格的邻雷数
    var numMap = {};
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var idx = r * GRID + c;
        if (mineSet[idx]) { numMap[idx] = -1; continue; }
        var cnt = 0;
        for (var dr = -1; dr <= 1; dr++) {
          for (var dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            var nr = r + dr, nc = c + dc;
            if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) continue;
            if (mineSet[nr * GRID + nc]) cnt++;
          }
        }
        numMap[idx] = cnt;
      }
    }

    var opened = 0;
    var flagged = 0;
    var dead = false;
    var pass = false;
    var resolved = false;

    function buildGrid() {
      var html = '';
      for (var i = 0; i < GRID * GRID; i++) {
        html += '<div class="mine-cell" data-idx="' + i + '"></div>';
      }
      return html;
    }

    var modal = document.createElement('div');
    modal.id = 'mine-captcha-modal';
    modal.innerHTML = [
      '<div class="mine-cap-overlay">',
      '  <div class="mine-cap-panel">',
      '    <div class="mine-cap-title">找出安全区</div>',
      '    <div class="mine-cap-sub">5×5 网格 · 4 颗雷 · 点开 <strong>' + NEED_SAFE + '</strong> 个安全格</div>',
      '    <div class="mine-cap-stage">',
      '      <div class="mine-cap-grid" id="mine-cap-grid">' + buildGrid() + '</div>',
      '    </div>',
      '    <div class="mine-cap-status" id="mine-cap-status">右键标记雷 · 左键翻开</div>',
      '    <div class="mine-cap-bottom">',
      '      <button type="button" class="mine-cap-back" id="mine-cap-back">← 回去抓</button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(modal);

    var grid = modal.querySelector('#mine-cap-grid');
    var status = modal.querySelector('#mine-cap-status');

    function close(result) {
      if (resolved) return;
      resolved = true;
      modal.remove();
      if (result) {
        _markSlideCaptchaPassed(type);
      }
      resolve(result);
    }

    function openCell(idx) {
      if (pass || dead) return;
      var cell = grid.querySelector('.mine-cell[data-idx="' + idx + '"]');
      if (!cell || cell.classList.contains('open') || cell.classList.contains('flag')) return;
      var n = numMap[idx];
      if (n === -1) return; // 雷不在这里处理
      cell.classList.add('open');
      cell.textContent = n > 0 ? n : '';
      if (n === 0) cell.classList.add('zero');
      opened += 1;
      if (opened >= NEED_SAFE) {
        pass = true;
        status.textContent = '通过';
        status.className = 'mine-cap-status ok';
        grid.querySelectorAll('.mine-cell').forEach(function (c) {
          c.style.pointerEvents = 'none';
        });
        setTimeout(function () { close(true); }, 600);
      }
      // flood-fill: 零格自动展开相邻格
      if (n === 0) {
        var r = Math.floor(idx / GRID);
        var c = idx % GRID;
        for (var dr = -1; dr <= 1; dr++) {
          for (var dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            var nr = r + dr, nc = c + dc;
            if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) continue;
            openCell(nr * GRID + nc);
          }
        }
      }
    }

    function reveal(idx) {
      if (dead || pass) return;
      var cell = grid.querySelector('.mine-cell[data-idx="' + idx + '"]');
      if (!cell || cell.classList.contains('open') || cell.classList.contains('flag')) return;
      var n = numMap[idx];
      if (n === -1) {
        // 踩雷
        cell.classList.add('mine');
        cell.textContent = 'X';
        dead = true;
        status.textContent = '踩雷了，重新开始';
        status.className = 'mine-cap-status err';
        Object.keys(mineSet).forEach(function (mi) {
          var c2 = grid.querySelector('.mine-cell[data-idx="' + mi + '"]');
          if (c2 && !c2.classList.contains('open')) {
            c2.classList.add('open', 'mine-show');
            c2.textContent = 'X';
          }
        });
        setTimeout(function () {
          modal.remove();
          if (!resolved) {
            _showMinesweeperCaptcha(type).then(resolve);
          }
        }, 1200);
        return;
      }
      openCell(idx);
      if (!pass) {
        status.textContent = '还差 ' + (NEED_SAFE - opened) + ' 个安全格';
      }
    }

    function toggleFlag(idx) {
      var cell = grid.querySelector('.mine-cell[data-idx="' + idx + '"]');
      if (!cell || cell.classList.contains('open')) return;
      if (cell.classList.contains('flag')) {
        cell.classList.remove('flag');
        cell.textContent = '';
        flagged -= 1;
      } else {
        cell.classList.add('flag');
        cell.textContent = '⚑';
        flagged += 1;
      }
    }

    // 事件委托
    grid.addEventListener('click', function (e) {
      if (dead || pass) return;
      var cell = e.target.closest('.mine-cell');
      if (!cell) return;
      var idx = parseInt(cell.dataset.idx, 10);
      reveal(idx);
    });
    grid.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      if (dead || pass) return;
      var cell = e.target.closest('.mine-cell');
      if (!cell) return;
      var idx = parseInt(cell.dataset.idx, 10);
      toggleFlag(idx);
    });

    // 返回按钮
    modal.querySelector('#mine-cap-back').addEventListener('click', function (e) {
      e.preventDefault();
      modal.remove();
      if (!resolved) {
        resolved = true;
        _showEscapeCaptchaInner(type, resolve);
      }
    });
  });
}

/**
 * 密码强度计算（the sarcastic strength meter 风格）
 * 综合：长度、字符种类、唯一性、是否常见
 * @returns {0-5} + 讽刺文案
 */
function _calcPasswordStrength(pwd) {
  if (!pwd) {
    return { score: 0, label: '...', sarcastic: '还没开始' };
  }
  var score = 0;
  var factors = [];

  // 长度
  if (pwd.length >= 6) score += 1;
  if (pwd.length >= 10) score += 1;
  if (pwd.length >= 14) score += 1;
  if (pwd.length >= 20) score += 1;
  factors.push(pwd.length + '位');

  // 字符种类
  if (/[a-z]/.test(pwd)) { score += 0.4; factors.push('小写'); }
  if (/[A-Z]/.test(pwd)) { score += 0.4; factors.push('大写'); }
  if (/[0-9]/.test(pwd)) { score += 0.3; factors.push('数字'); }
  if (/[^a-zA-Z0-9]/.test(pwd)) { score += 0.5; factors.push('符号'); }

  // 唯一字符数
  var uniqueChars = {};
  for (var i = 0; i < pwd.length; i++) uniqueChars[pwd[i]] = true;
  if (Object.keys(uniqueChars).length >= pwd.length * 0.7) { score += 0.3; }

  // 常见密码扣分
  var commonPwd = ['123456', 'password', 'qwerty', 'abc123', '111111', '12345', 'iloveyou', 'admin', 'welcome', 'letmein'];
  if (commonPwd.some(function (c) { return pwd.toLowerCase().indexOf(c) >= 0; })) {
    score = Math.max(0, score - 2);
    factors.push('⚠常见');
  }

  // 重复字符扣分
  if (/(.)\1{2,}/.test(pwd)) {
    score = Math.max(0, score - 0.5);
  }

  // 数字映射到 0-5
  var level = Math.min(5, Math.floor(score));

  // 讽刺文案池（参考 the sarcastic strength meter）
  var sarcasticMap = {
    0: ['空的', '这不算密码', '随便按的？', '空气密码'],
    1: ['湿纸一样', '被蜗牛一碰就碎', '小孩都能破解', '算了吧'],
    2: ['你家金鱼就能猜中', '纪念日？', '还在用这个？', '你奶奶都嫌弱'],
    3: ['还行，能用', '但还是会被字典攻击', '装个样子', '初学者级别'],
    4: ['不错', '老黑客会皱眉头', '安全的', '多数人做不到'],
    5: ['NSA 看了都点头', '量子计算机也怕', '这密码够硬', '已经是传奇']
  };
  var pool = sarcasticMap[level] || sarcasticMap[0];
  var sarcastic = pool[Math.floor(Math.random() * pool.length)];

  return { score: level, label: factors.join('+'), sarcastic: sarcastic };
}

/**
 * XKCD 风格密码生成器
 * 4 个随机词（Correct Horse Battery Staple 风格）
 */
function _generateXKCDPassword() {
  var words = [
    'correct', 'horse', 'battery', 'staple', 'apple', 'banana', 'cherry', 'dragon',
    'eagle', 'forest', 'guitar', 'hammer', 'island', 'jacket', 'kitchen', 'lemon',
    'mountain', 'noodle', 'ocean', 'piano', 'quartz', 'rocket', 'sunset', 'tiger',
    'umbrella', 'violin', 'window', 'yellow', 'zebra', 'amber', 'breeze', 'candle',
    'donut', 'engine', 'feather', 'galaxy', 'iceberg', 'jasmine', 'koala',
    'ladder', 'marble', 'needle', 'octopus', 'pencil', 'quiver', 'ribbon', 'silver',
    'tunnel', 'unicorn', 'velvet', 'whisper', 'xenon', 'yogurt', 'zenith', 'anchor',
    'bridge', 'canyon', 'desert', 'eclipse', 'falcon', 'glacier', 'horizon', 'igloo',
    'jungle', 'knight', 'lantern', 'meteor', 'nucleus', 'orbit', 'puddle', 'quill',
    'rainbow', 'shadow', 'thunder', 'utopia', 'vortex', 'willow', 'yacht', 'zephyr',
    'beacon', 'crimson', 'dynamo', 'emerald', 'flame', 'garnet', 'harbor',
    'indigo', 'jade', 'lava', 'mosaic', 'nebula', 'onyx', 'pearl', 'ruby',
    'sapphire', 'topaz', 'crystal', 'comet', 'cosmic', 'dawn', 'dusk',
    'echo', 'frost', 'mist', 'storm', 'wave', 'aurora', 'meadow',
    'valley', 'ridge', 'cliff', 'cave', 'river', 'stream', 'gust',
    'pulse', 'rhythm', 'melody', 'harmony', 'silence', 'light', 'spark',
    'ember', 'glow', 'radiance', 'voyage', 'journey', 'quest', 'wander',
    'explore', 'discover', 'dream', 'vision', 'wisdom', 'courage', 'honor',
    'glory', 'mystery', 'secret', 'legend', 'myth', 'phoenix', 'griffin',
    'titan', 'atlas', 'orion', 'vega', 'sirius', 'cipher', 'enigma',
    'riddle', 'puzzle', 'labyrinth', 'maze', 'gate', 'portal', 'dungeon',
    'castle', 'tower', 'fortress', 'citadel', 'kingdom', 'empire', 'realm',
    'volcano', 'plateau', 'mesa', 'butte', 'archipelago', 'lagoon'
  ];
  var picked = [];
  for (var j = 0; j < 4; j++) {
    var w;
    do {
      w = words[Math.floor(Math.random() * words.length)];
    } while (picked.indexOf(w) >= 0);
    picked.push(w);
  }
  return picked.join('-');
}

/**
 * 弹出密码设置器（独立界面）
 * 包含：强度计 + XKCD 生成 + 字典攻击演示
 */
function _showPasswordSetup(onConfirm) {
  var existing = document.getElementById('pwd-setup-modal');
  if (existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'pwd-setup-modal';
  modal.innerHTML = [
    '<div class="pwd-setup-overlay">',
    '  <div class="pwd-setup-panel">',
    '    <div class="pwd-setup-title">造一个没人能破的密码</div>',
    '    <div class="pwd-setup-sub">支持自定义 · XKCD 生成 · 字典攻击演示</div>',
    '    <div class="pwd-setup-row">',
    '      <div class="pwd-setup-input-wrap">',
    '        <input type="password" class="pwd-setup-input" id="pwd-setup-input" placeholder="输入或生成密码" autocomplete="off">',
    '        <button type="button" class="pwd-setup-toggle" id="pwd-setup-toggle" title="隐藏/显示">👁</button>',
    '      </div>',
    '      <button type="button" class="pwd-setup-gen" id="pwd-setup-gen">XKCD 生成</button>',
    '    </div>',
    '    <div class="pwd-strength-wrap">',
    '      <div class="pwd-strength-bar">',
    '        <div class="pwd-strength-fill" id="pwd-strength-fill"></div>',
    '      </div>',
    '      <div class="pwd-strength-meta">',
    '        <span class="pwd-strength-label" id="pwd-strength-label">弱</span>',
    '        <span class="pwd-strength-info" id="pwd-strength-info">还没开始</span>',
    '      </div>',
    '    </div>',
    '    <div class="pwd-sarcastic" id="pwd-sarcastic">"随便按的？"</div>',
    '    <div class="pwd-attack-section">',
    '      <div class="pwd-attack-title">🛡 字典攻击演示 <span class="pwd-attack-hint">模拟 · 不会真攻击</span></div>',
    '      <div class="pwd-attack-row">',
    '        <button type="button" class="pwd-attack-start" id="pwd-attack-start">开始攻击</button>',
    '        <div class="pwd-attack-progress">',
    '          <div class="pwd-attack-fill" id="pwd-attack-fill"></div>',
    '        </div>',
    '        <span class="pwd-attack-stat" id="pwd-attack-stat">未开始</span>',
    '      </div>',
    '      <div class="pwd-attack-log" id="pwd-attack-log"></div>',
    '    </div>',
    '    <div class="pwd-setup-actions">',
    '      <button type="button" class="pwd-setup-cancel" id="pwd-setup-cancel">取消</button>',
    '      <button type="button" class="pwd-setup-confirm" id="pwd-setup-confirm">用这个密码</button>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join('');

  document.body.appendChild(modal);

  var input = modal.querySelector('#pwd-setup-input');
  var toggle = modal.querySelector('#pwd-setup-toggle');
  var gen = modal.querySelector('#pwd-setup-gen');
  var fill = modal.querySelector('#pwd-strength-fill');
  var label = modal.querySelector('#pwd-strength-label');
  var info = modal.querySelector('#pwd-strength-info');
  var sarcastic = modal.querySelector('#pwd-sarcastic');
  var attackStart = modal.querySelector('#pwd-attack-start');
  var attackFill = modal.querySelector('#pwd-attack-fill');
  var attackStat = modal.querySelector('#pwd-attack-stat');
  var attackLog = modal.querySelector('#pwd-attack-log');
  var cancelBtn = modal.querySelector('#pwd-setup-cancel');
  var confirmBtn = modal.querySelector('#pwd-setup-confirm');

  var colorMap = ['#d63a2a', '#e87a3a', '#e8c43a', '#a8d63a', '#3a8c5c', '#5a4ad6'];
  var labelMap = ['弱', '弱', '较弱', '中等', '强', '极强'];

  function updateUI() {
    var pwd = input.value;
    var r = _calcPasswordStrength(pwd);
    var pct = (r.score / 5) * 100;
    fill.style.width = pct + '%';
    fill.style.background = colorMap[r.score] || colorMap[0];
    label.textContent = labelMap[r.score] || '弱';
    label.style.color = colorMap[r.score] || colorMap[0];
    info.textContent = r.label || '还没开始';
    sarcastic.textContent = '"' + r.sarcastic + '"';
  }
  input.addEventListener('input', updateUI);

  // 切换可见
  toggle.addEventListener('click', function () {
    if (input.type === 'password') {
      input.type = 'text';
      toggle.textContent = '🙈';
    } else {
      input.type = 'password';
      toggle.textContent = '👁';
    }
  });

  // XKCD 生成
  gen.addEventListener('click', function () {
    var pwd = _generateXKCDPassword();
    input.value = pwd;
    input.type = 'text';
    toggle.textContent = '🙈';
    updateUI();
  });

  // 字典攻击演示
  var attackCancelId = null; // null 表示空闲，存 requestAnimationFrame id（#118：rAF 替代 setInterval）
  function stopAttack() {
    if (attackCancelId !== null) cancelAnimationFrame(attackCancelId);
    attackCancelId = null;
    attackStart.textContent = '开始攻击';
  }
  attackStart.addEventListener('click', function () {
    if (attackCancelId !== null) { stopAttack(); return; }
    var pwd = input.value;
    if (!pwd) {
      attackStat.textContent = '请先输入密码';
      return;
    }
    attackStart.textContent = '停止';
    attackFill.style.transform = 'scaleX(0)';
    attackFill.style.background = 'linear-gradient(90deg, #d63a2a, #e87a3a, #e8c43a, #a8d63a, #3a8c5c)';
    attackLog.innerHTML = '';
    var tried = 0;
    var lastMs = Date.now();
    var speed = 50 + Math.floor(Math.random() * 30);
    var strength = _calcPasswordStrength(pwd).score;
    var maxTries = strength <= 1 ? 2000 : (strength <= 2 ? 20000 : (strength <= 3 ? 200000 : (strength <= 4 ? 5000000 : 99999999)));
    var likelyHit = strength <= 2;

    function tick() {
      if (attackCancelId === null) return; // 已停止
      // 按真实时间步进，避免 rAF 在不同刷新率下速度不一致
      var now = Date.now();
      var elapsed = Math.max(1, now - lastMs);
      lastMs = now;
      tried += speed * (elapsed / 80);

      if (tried > maxTries) tried = maxTries;
      var pct = Math.min(1, tried / maxTries); // 0~1，配合 transform: scaleX
      attackFill.style.transform = 'scaleX(' + pct + ')';
      var displayTried = tried >= 1000000 ? (tried / 1000000).toFixed(1) + 'M' :
                        tried >= 1000 ? (tried / 1000).toFixed(1) + 'K' : String(Math.floor(tried));
      var displayMax = maxTries >= 1000000 ? (maxTries/1000000).toFixed(0) + 'M' : (maxTries/1000).toFixed(0) + 'K';
      attackStat.textContent = '尝试 ' + displayTried + ' / ' + displayMax;

      if (Math.random() < 0.05) {
        var sampleWords = ['password', 'qwerty', 'letmein', 'admin', 'iloveyou', 'monkey', 'dragon', 'abc123', 'pokemon'];
        var sw = sampleWords[Math.floor(Math.random() * sampleWords.length)] + Math.floor(Math.random() * 99);
        var logLine = document.createElement('div');
        logLine.textContent = '✗ ' + sw;
        attackLog.appendChild(logLine);
        if (attackLog.children.length > 5) attackLog.removeChild(attackLog.firstChild);
        attackLog.scrollTop = attackLog.scrollHeight;
      }

      if (likelyHit && tried >= maxTries * 0.95) {
        attackFill.style.background = '#d63a2a';
        var hitLine = document.createElement('div');
        hitLine.textContent = '✓ 已破解：' + pwd;
        hitLine.style.color = '#d63a2a';
        hitLine.style.fontWeight = '700';
        attackLog.appendChild(hitLine);
        attackStat.textContent = '已破解';
        stopAttack();
        return;
      }
      if (tried >= maxTries) {
        attackFill.style.background = '#3a8c5c';
        var safeLine = document.createElement('div');
        safeLine.textContent = '✓ 攻击终止 · 密码安全';
        safeLine.style.color = '#3a8c5c';
        safeLine.style.fontWeight = '700';
        attackLog.appendChild(safeLine);
        attackStat.textContent = '已停止';
        stopAttack();
        return;
      }
      attackCancelId = requestAnimationFrame(tick);
    }
    attackCancelId = requestAnimationFrame(tick);
  });

  cancelBtn.addEventListener('click', function () {
    if (attackCancelId !== null) cancelAnimationFrame(attackCancelId);
    attackCancelId = null;
    modal.remove();
    if (typeof onConfirm === 'function') onConfirm(null);
  });
  confirmBtn.addEventListener('click', function () {
    var pwd = input.value;
    if (!pwd) {
      sarcastic.textContent = '"不能为空"';
      return;
    }
    if (pwd.length < 6) {
      sarcastic.textContent = '"至少 6 位"';
      return;
    }
    if (attackCancelId !== null) cancelAnimationFrame(attackCancelId);
    attackCancelId = null;
    modal.remove();
    if (typeof onConfirm === 'function') onConfirm(pwd);
  });

  updateUI();
}

/**
 * 打开密码设置器（从表单调用）
 * @param {string} source - 'register' | 'forgot' | 'login'
 */
function _openPasswordSetup(source) {
  _showPasswordSetup(function (pwd) {
    if (!pwd) return;
    if (source === 'register') {
      var pwdInput = document.getElementById('auth-register-password');
      if (pwdInput) pwdInput.value = pwd;
    } else if (source === 'login') {
      var pwdInput2 = document.getElementById('auth-login-password');
      if (pwdInput2) pwdInput2.value = pwd;
    } else if (source === 'forgot') {
      var pwdInput3 = document.getElementById('auth-forgot-newpassword');
      if (pwdInput3) pwdInput3.value = pwd;
    }
  });
}

// 登录错误嘲讽文案池（每次随机选一条）
var _loginSarcasticPool = [
  '错的',
  '你刚才那个不算',
  '记忆出问题了吗',
  '要不试试 123456',
  '键盘打字打歪了？',
  '回车键找你算账',
  '这是第几次了？',
  '你确定这是你设的密码？',
  'maybe 大小写？',
  '好家伙',
  '这密码和你八字不合',
  '建议重置密码（用上面那个）',
  '你的密码忘得比记的快',
  '换个脑子吧',
  '再想想？',
  '机器人都不信这是你',
  '认输吧 → 点「我抓不到」',
  '你和我闹呢？',
  'OK 我当你没打过',
  '行吧 算你狠 再试一次',
  'ERROR: 你妈没告诉你吗',
  '密码不对（显然）',
  '……',
  '?',
  '猜的挺好 下次别猜了',
  '你刚才是不是回车了？',
  '（叹气）',
  '再输错我就给你看真实攻击',
  '三次机会 用完没？',
  '字典攻击都比你猜得快',
  '你猜得比 AI 还差',
  '这密码对吗？你心里没数？',
  '失败成功之母 · 你已经很多妈了',
  '要不再用「我想设置一个超强的密码」试试？'
];

function _getLoginSarcastic() {
  return _loginSarcasticPool[Math.floor(Math.random() * _loginSarcasticPool.length)];
}

// ===== 滑动拼图验证码（纯前端，零依赖，国内友好） =====
// 设计：用户拖动滑块到缺口位置，验证水平距离 + 通过时间
// - 缺口位置随机（80-220px）
// - 容差 ±5px，时间需 0.5-30s 内完成
// - 通过后 60s 内有效，存储到 sessionStorage

var _slideCaptchaState = {
  pass: { login: false, register: false },
  expireAt: { login: 0, register: 0 }
};

function _isSlideCaptchaPassed(type) {
  if (!_slideCaptchaState.pass[type]) return false;
  if (Date.now() > _slideCaptchaState.expireAt[type]) {
    _slideCaptchaState.pass[type] = false;
    return false;
  }
  return true;
}

function _markSlideCaptchaPassed(type) {
  _slideCaptchaState.pass[type] = true;
  _slideCaptchaState.expireAt[type] = Date.now() + 60 * 1000; // 60 秒有效
}

/**
 * 弹出滑动拼图验证码
 * @param {string} type - 'login' | 'register'
 * @returns {Promise<boolean>}
 */
/**
 * 弹出滑动拼图验证码（增强版算法）
 * @param {string} type - 'login' | 'register'
 * @returns {Promise<boolean>}
 *
 * 算法优化（v2）：
 *  1. 复杂拼图（4 凸 1 凹，随机旋转）
 *  2. 随机背景纹理
 *  3. 轨迹采样：(x, y, t) 序列
 *  4. 行为分析：
 *     - 至少 N 个采样点（防止瞬移）
 *     - 速度方差 > 阈值（真人有加速/减速）
 *     - 反应时间 200ms-3s（太快=脚本）
 *     - 微调时间 50ms+（结尾的微调）
 *  5. 容差 ±5px
 *  6. 通过时间 0.5-30s
 */
/**
 * 弹出滑动拼图验证码（v3：自由移动 + 目标随机 + 无箭头）
 * @param {string} type - 'login' | 'register'
 * @returns {Promise<boolean>}
 *
 * v3 算法优化：
 *  1. 拼图可自由移动（x 和 y 都允许）
 *  2. 目标位置完全随机（x 80-220, y 20-60）
 *  3. 拖动手柄无箭头 SVG（避免视觉杂乱）
 *  4. 拼图块和手柄完全对齐（piece 即 handle）
 *  5. 复杂拼图（4 凸 1 凹）
 *  6. 轨迹采样 (x, y, t)
 *  7. 行为分析（采样点、速度方差、反应时间）
 *  8. 容差 ±5px（位置 + 垂直方向）
 */
function _showSlideCaptcha(type) {
  return new Promise(function (resolve) {
    // 移除已有的
    var existing = document.getElementById('slide-captcha-modal');
    if (existing) existing.remove();

    var containerWidth = 280;
    var containerHeight = 120;
    var pieceSize = 44;
    // 目标位置完全随机（不仅 x，y 也随机）
    var targetX = 60 + Math.floor(Math.random() * 160); // 60-220
    var targetY = 18 + Math.floor(Math.random() * 50);  // 18-68

    // 复杂拼图形状（4 凸 1 凹 + 缺角）
    var piecePath = 'M2,2 L18,2 L18,8 L26,8 L26,18 L36,18 L36,30 L26,30 L26,38 L18,38 L18,42 L2,42 Z';

    // 随机背景纹理
    var bgSeed = Math.floor(Math.random() * 100000);
    var dotCount = 12 + Math.floor(Math.random() * 8);
    var dots = '';
    for (var i = 0; i < dotCount; i++) {
      var dx = 10 + Math.floor(Math.random() * (containerWidth - 20));
      var dy = 10 + Math.floor(Math.random() * (containerHeight - 20));
      var dr = 2 + Math.floor(Math.random() * 3);
      var doC = Math.random() < 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)';
      dots += '<circle cx="' + dx + '" cy="' + dy + '" r="' + dr + '" fill="' + doC + '"/>';
    }

    var modal = document.createElement('div');
    modal.id = 'slide-captcha-modal';
    modal.innerHTML = [
      '<div class="slide-cap-overlay">',
      '  <div class="slide-cap-panel">',
      '    <div class="slide-cap-title">安全验证<span class="slide-cap-sub">拖动拼图到缺口位置（自由移动）</span></div>',
      '    <div class="slide-cap-stage" id="slide-cap-stage" style="width:' + containerWidth + 'px;height:' + containerHeight + 'px;">',
      '      <svg class="slide-cap-bg" viewBox="0 0 ' + containerWidth + ' ' + containerHeight + '" xmlns="http://www.w3.org/2000/svg">',
      '        <defs>',
      '          <linearGradient id="slideGrad' + bgSeed + '" x1="0" y1="0" x2="1" y2="1">',
      '            <stop offset="0" stop-color="#3a8c5c"/>',
      '            <stop offset="0.5" stop-color="#5a7d5c"/>',
      '            <stop offset="1" stop-color="#1a3a2a"/>',
      '          </linearGradient>',
      '          <pattern id="slidePattern' + bgSeed + '" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">',
      '            <circle cx="10" cy="10" r="1.5" fill="rgba(255,255,255,0.15)"/>',
      '          </pattern>',
      '        </defs>',
      '        <rect width="' + containerWidth + '" height="' + containerHeight + '" fill="url(#slideGrad' + bgSeed + ')"/>',
      '        <rect width="' + containerWidth + '" height="' + containerHeight + '" fill="url(#slidePattern' + bgSeed + ')"/>',
      '        <text x="' + (containerWidth / 2) + '" y="' + (containerHeight / 2 + 12) + '" text-anchor="middle" fill="rgba(255,255,255,0.32)" font-size="38" font-weight="900" font-family="monospace">BioQuest</text>',
      '        ' + dots,
      '        <!-- 缺口：显示为半透明深色，提示目标位置 -->',
      '        <path d="' + piecePath + '" transform="translate(' + targetX + ',' + targetY + ')" fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.85)" stroke-width="2.5"/>',
      '        <!-- 缺口装饰虚线框 -->',
      '        <rect x="' + (targetX - 2) + '" y="' + (targetY - 2) + '" width="40" height="46" fill="none" stroke="rgba(58,140,92,0.55)" stroke-width="1" stroke-dasharray="3,2"/>',
      '      </svg>',
      '      <!-- 拼图块（即可拖动，无内嵌箭头） -->',
      '      <div class="slide-cap-piece slide-cap-handle" id="slide-cap-piece" style="left:6px;top:6px;width:38px;height:42px;">',
      '        <svg viewBox="0 0 38 44" xmlns="http://www.w3.org/2000/svg" width="38" height="42">',
      '          <path d="' + piecePath + '" fill="rgba(255,255,255,0.95)" stroke="#1a3a2a" stroke-width="1.5"/>',
      '        </svg>',
      '      </div>',
      '      <!-- 进度条（底部） -->',
      '      <div class="slide-cap-track-bottom">',
      '        <div class="slide-cap-progress" id="slide-cap-progress"></div>',
      '      </div>',
      '      <div class="slide-cap-status" id="slide-cap-status">拖动拼图到缺口</div>',
      '    </div>',
      '    <div class="slide-cap-actions">',
      '      <button type="button" class="slide-cap-retry" id="slide-cap-retry">换一张</button>',
      '      <button type="button" class="slide-cap-cancel" id="slide-cap-cancel">取消</button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(modal);

    var piece = modal.querySelector('#slide-cap-piece');
    var progress = modal.querySelector('#slide-cap-progress');
    var status = modal.querySelector('#slide-cap-status');
    var startTime = 0;
    var dragging = false;
    var startMouseX = 0;
    var startMouseY = 0;
    var currentX = 6;
    var currentY = 6;
    var pass = false;
    var resolved = false;

    // 轨迹采样
    var trace = [];
    var lastMoveTime = 0;
    var moveSampleMin = 4;
    var reactTimeMin = 200;
    var failCount = (window._slideCaptchaFailCount || 0) + 1;
    window._slideCaptchaFailCount = failCount;
    var tolerance = failCount >= 3 ? 2 : (failCount >= 2 ? 3 : 5);

    function close(result) {
      if (resolved) return;
      resolved = true;
      modal.remove();
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      if (result) window._slideCaptchaFailCount = 0;
      resolve(result);
    }

    function recordTrace(dx, dy, t) {
      if (t - lastMoveTime < 30 && trace.length > 0) return;
      lastMoveTime = t;
      trace.push({ x: dx, y: dy, t: t });
    }

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    function onMouseDown(e) {
      if (pass) return;
      dragging = true;
      startMouseX = e.clientX;
      startMouseY = e.clientY;
      startTime = Date.now();
      trace = [{ x: 0, y: 0, t: 0 }];
      piece.classList.add('dragging');
      e.preventDefault();
    }
    function onTouchStart(e) {
      if (pass) return;
      dragging = true;
      startMouseX = e.touches[0].clientX;
      startMouseY = e.touches[0].clientY;
      startTime = Date.now();
      trace = [{ x: 0, y: 0, t: 0 }];
      piece.classList.add('dragging');
      e.preventDefault();
    }
    function onMouseMove(e) {
      if (!dragging) return;
      var dx = e.clientX - startMouseX;
      var dy = e.clientY - startMouseY;
      var maxX = containerWidth - 38 - 6;
      var maxY = containerHeight - 42 - 6;
      currentX = clamp(6 + dx, 6, maxX);
      currentY = clamp(6 + dy, 6, maxY);
      piece.style.left = currentX + 'px';
      piece.style.top = currentY + 'px';
      // 进度条按 x 距离算
      var distX = Math.abs(currentX - targetX);
      var maxDistX = Math.max(targetX - 6, maxX - targetX);
      progress.style.width = Math.max(0, 100 - distX / maxDistX * 100) + '%';
      recordTrace(dx, dy, Date.now() - startTime);
    }
    function onTouchMove(e) {
      if (!dragging) return;
      var dx = e.touches[0].clientX - startMouseX;
      var dy = e.touches[0].clientY - startMouseY;
      var maxX = containerWidth - 38 - 6;
      var maxY = containerHeight - 42 - 6;
      currentX = clamp(6 + dx, 6, maxX);
      currentY = clamp(6 + dy, 6, maxY);
      piece.style.left = currentX + 'px';
      piece.style.top = currentY + 'px';
      var distX = Math.abs(currentX - targetX);
      var maxDistX = Math.max(targetX - 6, maxX - targetX);
      progress.style.width = Math.max(0, 100 - distX / maxDistX * 100) + '%';
      recordTrace(dx, dy, Date.now() - startTime);
    }
    function analyzeBehavior(elapsed) {
      if (elapsed < reactTimeMin) return '操作过快（疑似脚本）';
      if (elapsed > 30000) return '已超时，请重试';
      if (trace.length < moveSampleMin) return '操作过于单一，请用鼠标拖动';
      if (trace.length >= 4) {
        var speeds = [];
        for (var i = 1; i < trace.length; i++) {
          var dt = trace[i].t - trace[i-1].t || 1;
          var ddx = trace[i].x - trace[i-1].x;
          var ddy = trace[i].y - trace[i-1].y;
          speeds.push(Math.sqrt(ddx * ddx + ddy * ddy) / dt);
        }
        var mean = 0;
        for (var j = 0; j < speeds.length; j++) mean += speeds[j];
        mean /= speeds.length;
        var variance = 0;
        for (var k = 0; k < speeds.length; k++) variance += (speeds[k] - mean) * (speeds[k] - mean);
        variance /= speeds.length;
        var std = Math.sqrt(variance);
        if (mean > 0 && std / mean < 0.15 && failCount < 3) {
          return '操作过于机械，请自然拖动';
        }
      }
      return null;
    }
    function finish() {
      if (!dragging || pass) return;
      dragging = false;
      piece.classList.remove('dragging');
      var elapsed = Date.now() - startTime;
      var diffX = Math.abs(currentX - targetX);
      var diffY = Math.abs(currentY - targetY);
      var diff = Math.sqrt(diffX * diffX + diffY * diffY);

      var behaviorErr = analyzeBehavior(elapsed);
      if (behaviorErr) {
        status.textContent = behaviorErr + '（' + failCount + '/3）';
        status.className = 'slide-cap-status err';
        if (failCount >= 3) status.textContent = '行为异常，请刷新页面后重试';
        resetPosition();
        return;
      }

      if (diff > tolerance) {
        status.textContent = '位置偏差 ' + Math.round(diff) + 'px（容差 ±' + tolerance + 'px），请重试';
        status.className = 'slide-cap-status err';
        resetPosition();
        return;
      }
      pass = true;
      status.textContent = '✓ 验证通过';
      status.className = 'slide-cap-status ok';
      piece.classList.add('passed');
      _markSlideCaptchaPassed(type);
      setTimeout(function () { close(true); }, 400);
    }
    function onMouseUp() { finish(); }
    function onTouchEnd() { finish(); }
    function resetPosition() {
      piece.style.transition = 'left 0.3s, top 0.3s';
      piece.style.left = '6px';
      piece.style.top = '6px';
      progress.style.transition = 'width 0.3s';
      progress.style.width = '0%';
      setTimeout(function () {
        piece.style.transition = '';
        progress.style.transition = '';
      }, 300);
    }

    function onRetry() {
      if (pass) return;
      modal.remove();
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      if (!resolved) {
        resolved = true;
        _showSlideCaptcha(type).then(resolve);
      }
    }

    piece.addEventListener('mousedown', onMouseDown);
    piece.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);

    modal.querySelector('#slide-cap-retry').addEventListener('click', onRetry);
    modal.querySelector('#slide-cap-cancel').addEventListener('click', function () { close(false); });
  });
}

// 保留旧数学验证码作为兜底（连续失败 3 次后弹出）
var _captchaAnswers = { register: 0, login: 0 };
var _captchaFailCount = { register: 0, login: 0 };

/**
 * 滑动触发器 UI 更新回调
 * @param {boolean} passed
 */
function _updateSlideTriggerUI(passed) {
  // 找出当前已存在的触发器（login / register）
  var triggers = document.querySelectorAll('.slide-cap-trigger');
  triggers.forEach(function (el) {
    var textEl = el.querySelector('.slide-cap-trigger-text');
    var arrowEl = el.querySelector('.slide-cap-trigger-arrow');
    var type = el.id.indexOf('login') >= 0 ? 'login' : 'register';
    if (passed && _isSlideCaptchaPassed(type)) {
      el.dataset.state = 'passed';
      if (textEl) textEl.textContent = '✓ 已通过安全验证';
      if (arrowEl) arrowEl.textContent = '✓';
    } else {
      el.dataset.state = 'pending';
      if (textEl) textEl.textContent = '点击完成安全验证';
      if (arrowEl) arrowEl.textContent = '→';
    }
  });
}

/**
 * 切换忘记密码面板的两种模式
 */
function toggleForgotMode() {
  var mode = (document.querySelector('input[name="forgot-mode"]:checked') || {}).value || 'reset';
  var resetDiv = document.getElementById('forgot-mode-reset');
  var recoverDiv = document.getElementById('forgot-mode-recover-key');
  var btn = document.querySelector('#auth-form-forgot .auth-btn');
  var title = document.querySelector('#auth-form-forgot .auth-form-sub');
  if (mode === 'recover-key') {
    if (resetDiv) resetDiv.style.display = 'none';
    if (recoverDiv) recoverDiv.style.display = 'block';
    if (btn) btn.textContent = '查询密钥';
    if (title) title.textContent = '通过用户名 + 邮箱后缀找回密钥';
  } else {
    if (resetDiv) resetDiv.style.display = 'block';
    if (recoverDiv) recoverDiv.style.display = 'none';
    if (btn) btn.textContent = '重置密码';
    if (title) title.textContent = '使用 8 字符密钥重置密码（无需邮件）';
  }
  // 清空错误/成功提示
  var errorEl = document.getElementById('auth-forgot-error');
  var successEl = document.getElementById('auth-forgot-success');
  if (errorEl) errorEl.textContent = '';
  if (successEl) successEl.textContent = '';
}

function refreshCaptcha(type) {
  var a = Math.floor(Math.random() * 10) + 1;
  var b = Math.floor(Math.random() * 10) + 1;
  var op = Math.random() < 0.5 ? '+' : '-';
  var ans = op === '+' ? a + b : a - b;
  if (op === '-' && b > a) { var t = a; a = b; b = t; ans = a - b; }
  _captchaAnswers[type] = ans;
  var el = document.getElementById('captcha-question-' + type);
  if (el) el.textContent = a + ' ' + op + ' ' + b + ' = ?';
  var input = document.getElementById('captcha-answer-' + type);
  if (input) input.value = '';
}

function _verifyCaptcha(type) {
  var input = document.getElementById('captcha-answer-' + type);
  if (!input) return false;
  var val = parseInt(String(input.value || '').trim(), 10);
  if (isNaN(val) || val !== _captchaAnswers[type]) return false;
  return true;
}

/**
 * 切换到登录表单
 */
function authSwitchToLogin() {
  setActiveAuthTab('auth-tab-login', 'auth-form-login');
}
function authSwitchToRegister() {
  setActiveAuthTab('auth-tab-register', 'auth-form-register');
}
function authSwitchToForgot() {
  setActiveAuthTab('auth-tab-forgot', 'auth-form-forgot');
}

function updateAuthTabIndicator() {
  var indicator = document.getElementById('auth-tab-indicator');
  var container = document.getElementById('auth-tabs');
  var activeTab = container ? container.querySelector('.auth-tab.active') : null;
  if (indicator && container && activeTab) {
    var cr = container.getBoundingClientRect();
    var tr = activeTab.getBoundingClientRect();
    indicator.style.left = (tr.left - cr.left) + 'px';
    indicator.style.width = tr.width + 'px';
  }
}

function setActiveAuthTab(tabId, panelId) {
  // Tabs
  document.querySelectorAll('.auth-tab').forEach(function(t) { t.classList.remove('active'); });
  var tab = document.getElementById(tabId);
  if (tab) tab.classList.add('active');
  // Panels
  document.querySelectorAll('.auth-form-panel').forEach(function(p) { p.classList.remove('active'); });
  var panel = document.getElementById(panelId);
  if (panel) panel.classList.add('active');
  // Sliding indicator
  var indicator = document.getElementById('auth-tab-indicator');
  var container = document.getElementById('auth-tabs');
  if (indicator && container && tab) {
    var cr = container.getBoundingClientRect();
    var tr = tab.getBoundingClientRect();
    indicator.style.left = (tr.left - cr.left) + 'px';
    indicator.style.width = tr.width + 'px';
  }
}

/**
 * 处理忘记密码（基于 user_key 8 字符密钥，无需邮件）
 * 流程：
 *   1. 用户输入 username + user_key + 新密码
 *   2. 调 resetPasswordByKey RPC
 *   3. 成功后直接登录
 */
async function handleForgotPassword() {
  if (typeof resetPasswordByKey !== 'function') {
    try { await initSupabase(); } catch(e) { /* ignore */ }
  }

  var mode = (document.querySelector('input[name="forgot-mode"]:checked') || {}).value || 'reset';
  var errorEl = document.getElementById('auth-forgot-error');
  var successEl = document.getElementById('auth-forgot-success');

  if (errorEl) errorEl.textContent = '';
  if (successEl) successEl.textContent = '';

  if (mode === 'recover-key') {
    // 找回 user_key 模式
    var username = document.getElementById('auth-recover-username').value.trim();
    var emailHint = document.getElementById('auth-recover-email').value.trim();

    if (!username || !emailHint) {
      if (errorEl) errorEl.textContent = '请填写用户名和邮箱后缀';
      return;
    }
    if (!emailHint.startsWith('@')) {
      if (errorEl) errorEl.textContent = '邮箱后缀请以 @ 开头，如 @gmail.com';
      return;
    }

    var btn1 = document.querySelector('#auth-form-forgot .auth-btn');
    if (btn1) { btn1.disabled = true; btn1.textContent = '查询中...'; }
    try {
      var res = await recoverUserKey(username, emailHint);
      if (btn1) { btn1.disabled = false; btn1.textContent = '查询密钥'; }
      if (res && res.ok && res.userKey) {
        if (successEl) {
          successEl.innerHTML = '<div style="background:rgba(58,140,92,0.12);padding:14px;border-radius:10px;margin:10px 0;">' +
            '<div style="font-size:0.82rem;color:#3a8c5c;margin-bottom:6px;">你的 8 字符密钥：</div>' +
            '<div style="font-family:monospace;font-size:1.4rem;letter-spacing:4px;font-weight:700;color:#fff;background:rgba(0,0,0,0.3);padding:10px;border-radius:6px;text-align:center;">' + escapeHtml(res.userKey) + '</div>' +
            '<div style="font-size:0.72rem;color:#8a9a8a;margin-top:6px;">请截图保存（密钥只展示一次）</div>' +
            '</div>';
        }
      } else {
        if (errorEl) errorEl.textContent = (res && res.error) || '查询失败';
      }
    } catch (e) {
      console.error('[BioQuest] recoverUserKey 异常:', e);
      if (errorEl) errorEl.textContent = '查询异常: ' + (e.message || String(e));
      if (btn1) { btn1.disabled = false; btn1.textContent = '查询密钥'; }
    }
    return;
  }

  // 重置密码模式（默认）
  var username2 = document.getElementById('auth-forgot-username').value.trim();
  var userKey = document.getElementById('auth-forgot-userkey').value.trim();
  var newPwd = document.getElementById('auth-forgot-newpassword').value;
  var newPwd2 = document.getElementById('auth-forgot-newpassword2').value;

  if (!username2 || !userKey || !newPwd) {
    if (errorEl) errorEl.textContent = '请填写完整信息';
    return;
  }
  if (newPwd.length < 6) {
    if (errorEl) errorEl.textContent = '新密码至少 6 位';
    return;
  }
  if (newPwd !== newPwd2) {
    if (errorEl) errorEl.textContent = '两次输入的密码不一致';
    return;
  }
  if (userKey.length !== 8) {
    if (errorEl) errorEl.textContent = '8 字符密钥必须为 8 位';
    return;
  }

  var btn = document.querySelector('#auth-form-forgot .auth-btn');
  if (btn) { if (btn.disabled) return; btn.disabled = true; btn.textContent = '重置中...'; }

  try {
    var result = await resetPasswordByKey(username2, userKey, newPwd);
    if (btn) { btn.disabled = false; btn.textContent = '重置密码'; }

    if (result && result.ok) {
      var forgotForm = document.getElementById('auth-form-forgot');
      if (forgotForm) {
        forgotForm.innerHTML = '<div style="text-align:center;padding:20px 0;">' +
          '<div style="font-size:2.2rem;margin-bottom:12px;">✓</div>' +
          '<h3 style="font-size:1.1rem;margin-bottom:8px;color:var(--color-sage,#3a8c5c);">密码已重置</h3>' +
          '<p style="font-size:0.85rem;color:var(--text-secondary,#8a8a8a);line-height:1.6;margin-bottom:12px;">' +
            '你的密码已成功重置。<br>请使用新密码登录。' +
          '</p>' +
          '<button data-on=\'["authSwitchToLogin"]\' ' +
            'style="background:var(--color-sage,#3a8c5c);color:#fff;border:none;padding:8px 20px;border-radius:20px;cursor:pointer;font-size:0.85rem;margin-top:8px;">' +
            '返回登录</button>' +
        '</div>';
      }
    } else {
      if (errorEl) errorEl.textContent = (result && result.error) || '重置失败';
    }
  } catch (e) {
    console.error('[BioQuest] handleForgotPassword 异常:', e);
    if (errorEl) errorEl.textContent = '重置异常: ' + (e.message || String(e));
    if (btn) { btn.disabled = false; btn.textContent = '重置密码'; }
  }
}

/**
 * 处理登录
 */
async function handleLogin() {
  // 确保 supabase 脚本已加载
  if (typeof loginUser !== 'function') {
    try { await initSupabase(); } catch(e) { /* ignore */ }
  }
  var username = document.getElementById('auth-login-username').value.trim();
  var password = document.getElementById('auth-login-password').value;
  var errorEl = document.getElementById('auth-login-error');

  if (!username || !password) {
    errorEl.textContent = '请填写用户名和密码';
    return;
  }

  // 客户端冷却检查
  if (errorEl) {
    var cooldown = checkAuthCooldown('login');
    if (cooldown.blocked) {
      errorEl.textContent = '登录尝试过于频繁，请 ' + cooldown.remaining + ' 秒后再试';
      return;
    }
  }

  // 反向 captcha：逃跑按钮（通过后 60s 内有效）
  if (!_isSlideCaptchaPassed('login')) {
    errorEl.textContent = '请先完成安全验证';
    try {
      var passed = await _showSlideCaptcha('login');
      if (!passed) {
        errorEl.textContent = '已取消安全验证';
        return;
      }
    } catch (e) {
      errorEl.textContent = '安全验证组件异常';
      return;
    }
  }

  var btn = document.querySelector('#auth-form-login .auth-btn');
  if (btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.innerHTML = '登录中... <span style="display:block;font-size:0.7rem;font-weight:normal;opacity:0.85;margin-top:2px;">请耐心等待，数据库在韩国</span>';
  }
  errorEl.textContent = '';
  try {
    var result = await loginUser(username, password);

    if (result && result.ok) {
      // P0 登录持久化：登录成功后按“记住我的账号”选择持久化登录标识（下次自动预填）
      var rememberEl = document.getElementById('auth-remember');
      try {
        if (rememberEl && rememberEl.checked) {
          localStorage.setItem('bioquest_remember_id', username);
        } else {
          localStorage.removeItem('bioquest_remember_id');
        }
      } catch (e) {}
      setAuthCooldown('login');
      closeAuthModal();
      showStorageStatus('cloud');
      updateAuthUI();
      if (typeof _setCurrentUser === 'function') _setCurrentUser(result.user);
      await mergeCloudData();
      var uname = (result.user || {}).username || '用户';
      // P0-1：登录成功后回到此前因权限不足被拦截的目标路由；
      // 若没有待恢复路由（如直接在受保护页内登录），则刷新当前受保护路由的登录态
      try {
        var authRedirect = sessionStorage.getItem('bioquest:authRedirect');
        if (authRedirect && Routes[authRedirect] && (_checkRouteAccess(authRedirect) || {}).allowed) {
          sessionStorage.removeItem('bioquest:authRedirect');
          navigateTo(authRedirect);
        } else {
          _refreshCurrentProtectedRoute();
        }
      } catch (e) {
        _refreshCurrentProtectedRoute();
      }

    } else {
      var origErr = (result && result.error) || '登录失败';
      // 密码错误时附一条嘲讽
      var lower = String(origErr).toLowerCase();
      if (lower.indexOf('密码') >= 0 || lower.indexOf('password') >= 0 || lower.indexOf('invalid') >= 0 || lower.indexOf('credential') >= 0 || lower.indexOf('登录') >= 0 || lower.indexOf('auth') >= 0) {
        errorEl.innerHTML = '<span style="color:#d63a2a;">' + escapeHtml(origErr) + '</span> <span style="display:inline-block;margin-left:6px;padding:2px 8px;background:rgba(214,58,42,0.1);border-radius:6px;color:#a83a2a;font-size:0.78rem;">' + _getLoginSarcastic() + '</span>';
      } else {
        errorEl.textContent = origErr;
      }
      // 更新验证码状态
      if (typeof _updateSlideTriggerUI === 'function') _updateSlideTriggerUI(false);
    }
  } catch (e) {
    console.error('[BioQuest] handleLogin 异常:', e);
    errorEl.textContent = '登录异常: ' + (e.message || String(e));
    refreshCaptcha('login');
  }
  if (btn) { btn.disabled = false; btn.textContent = '登 录'; }
}

/**
 * 游客登录
 */
async function handleGuestLogin() {
  if (typeof guestLogin !== 'function') {
    var errorEl = document.getElementById('auth-login-error');
    if (errorEl) errorEl.textContent = '系统未就绪，请刷新页面后重试';
    return;
  }

  var password = (document.getElementById('auth-guest-password') || {}).value || null;
  var errorEl = document.getElementById('auth-login-error');

  // 检查是否存在已有的游客会话
  var existingSession = null;
  try {
    existingSession = JSON.parse(localStorage.getItem('bioquest_guest_session') || 'null');
  } catch (e) {}

  var result;
  if (existingSession && existingSession.username && password) {
    // 已有游客会话，验证密码后恢复
    if (typeof guestLoginWithPassword === 'function') {
      result = guestLoginWithPassword(existingSession.username, password);
    } else {
      result = guestLogin(password);
    }
  } else {
    result = guestLogin(password);
  }

  if (result && result.ok) {
    closeAuthModal();
    showStorageStatus('local');
    updateAuthUI();
    if (typeof showToast === 'function') {
      showToast('已作为游客登录，数据保存在本地');
    }
    // 游客登录后同样刷新当前受保护路由的登录态，避免停在「请先登录」页
    if (typeof _refreshCurrentProtectedRoute === 'function') {
      try {
        var guestRedirect = sessionStorage.getItem('bioquest:authRedirect');
        if (guestRedirect && Routes[guestRedirect] && (_checkRouteAccess(guestRedirect) || {}).allowed) {
          sessionStorage.removeItem('bioquest:authRedirect');
          navigateTo(guestRedirect);
        } else {
          _refreshCurrentProtectedRoute();
        }
      } catch (e) { _refreshCurrentProtectedRoute(); }
    }
  } else if (result && result.error) {
    if (errorEl) errorEl.textContent = result.error;
  }
}

/**
 * 检查注册/登录操作冷却时间
 * @returns {boolean} true 表示在冷却期内
 */
function checkAuthCooldown(action) {
  try {
    var key = 'bioquest_cooldown_' + action;
    var lastAttempt = parseInt(localStorage.getItem(key) || '0', 10);
    var now = Date.now();
    var cooldowns = { register: 30000, login: 15000, resetPassword: 60000 };
    var cooldownMs = cooldowns[action] || 30000;
    var elapsed = now - lastAttempt;
    if (elapsed < cooldownMs) {
      return { blocked: true, remaining: Math.ceil((cooldownMs - elapsed) / 1000) };
    }
    return { blocked: false, remaining: 0 };
  } catch (e) {
    return { blocked: false, remaining: 0 };
  }
}

/**
 * 更新认证操作的冷却时间戳（仅在操作成功时调用）
 */
function setAuthCooldown(action) {
  try {
    var key = 'bioquest_cooldown_' + action;
    localStorage.setItem(key, String(Date.now()));
  } catch (e) { /* 静默 */ }
}

/**
 * 处理注册
 */
async function handleRegister() {
  // 确保 supabase 脚本已加载
  if (typeof registerUser !== 'function') {
    try { await initSupabase(); } catch(e) { /* ignore */ }
  }
  var username = document.getElementById('auth-register-username').value.trim();
  var email = document.getElementById('auth-register-email').value.trim();
  var displayName = document.getElementById('auth-register-name').value.trim();
  var password = document.getElementById('auth-register-password').value;
  var errorEl = document.getElementById('auth-register-error');

  // 客户端冷却检查
  if (errorEl) {
    var cooldown = checkAuthCooldown('register');
    if (cooldown.blocked) {
      errorEl.textContent = '操作过于频繁，请 ' + cooldown.remaining + ' 秒后再试';
      return;
    }
  }

  if (!username || !password) {
    errorEl.textContent = '请填写用户名和密码';
    return;
  }
  if (username.length < 3 || username.length > 20) {
    errorEl.textContent = '用户名长度需在 3-20 位之间';
    return;
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errorEl.textContent = '用户名只能包含字母、数字、下划线';
    return;
  }
  if (email) {
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errorEl.textContent = '请输入有效的邮箱地址（或留空）';
      return;
    }
  }

  // 滑动拼图验证码（通过后 60s 内有效）
  if (!_isSlideCaptchaPassed('register')) {
    errorEl.textContent = '请先完成安全验证';
    try {
      var passed = await _showSlideCaptcha('register');
      if (!passed) {
        errorEl.textContent = '已取消安全验证';
        return;
      }
    } catch (e) {
      errorEl.textContent = '安全验证组件异常';
      return;
    }
  }

  if (typeof registerUser !== 'function') {
    errorEl.textContent = '系统未就绪，请刷新页面后重试';
    console.error('[BioQuest] registerUser 函数未定义！');
    return;
  }

  // 防止重复提交
  var btn = document.querySelector('#auth-form-register .auth-btn');
  if (btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.innerHTML = '注册中... <span style="display:block;font-size:0.7rem;font-weight:normal;opacity:0.85;margin-top:2px;">📧 请耐心等待，数据库在韩国</span>';
  }
  errorEl.textContent = '';

  try {
    var result = await registerUser(username, password, displayName, email);

  } catch (e) {
    console.error('[BioQuest] handleRegister 异常:', e);
    errorEl.textContent = '注册异常: ' + (e.message || String(e));
    if (btn) { btn.disabled = false; btn.textContent = '注 册'; }
    return;
  }

  // 恢复按钮
  if (btn) { btn.disabled = false; btn.textContent = '注 册'; }

  if (result && result.ok) {
    setAuthCooldown('register');
    // 重要：注册成功第一件事是展示 8 字符 user_key
    var userKey = result.userKey || (result.user && result.user.user_key) || null;
    if (userKey) {
      _showUserKeyCard(userKey, function () {
        _continueRegisterSuccess(result, password);
      });
    } else {
      _continueRegisterSuccess(result, password);
    }
  } else {
    // 不显示调试信息，只显示用户友好的错误提示
    var rawError = (result && result.error) || '注册失败';
    if (rawError.indexOf('after') !== -1 && rawError.indexOf('seconds') !== -1) {
      errorEl.textContent = '操作太频繁，请稍等片刻后再试';
    } else {
      errorEl.textContent = rawError;
    }
    _updateSlideTriggerUI(false);
  }
}

/**
 * 注册成功后的实际处理（关闭弹窗、登录）
 */
function _continueRegisterSuccess(result, password) {
  if (result.needEmailConfirm) {
    // 走兜底路径：关闭弹窗 + 跳到登录（用密码直接登录）
    closeAuthModal();
    showStorageStatus('cloud');
    if (typeof _setCurrentUser === 'function') _setCurrentUser(result.user);
    if (typeof showToast === 'function') {
      showToast('注册成功！账号已激活，正在为你登录...');
    }
    setTimeout(function () {
      // 自动用刚注册的密码登录
      var loginInput = document.getElementById('auth-login-username');
      var loginPwd = document.getElementById('auth-login-password');
      if (loginInput) loginInput.value = (result.user && result.user.username) || (result.user && result.user.email);
      if (loginPwd) loginPwd.value = password;
      if (typeof handleLogin === 'function') handleLogin();
    }, 200);
    return;
  }
  closeAuthModal();
  showStorageStatus('cloud');
  updateAuthUI();
  if (typeof _setCurrentUser === 'function') _setCurrentUser(result.user);
  var uname = (result.user || {}).username || '用户';

  if (typeof showToast === 'function') {
    showToast('注册成功！欢迎加入 BioQuest');
  }
}

/**
 * 展示 user_key 关键提示卡（用户必须点击"我已保存"才能继续）
 * @param {string} userKey
 * @param {function} onConfirm 用户确认后回调
 */
function _showUserKeyCard(userKey, onConfirm) {
  var existing = document.getElementById('userkey-card-modal');
  if (existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'userkey-card-modal';
  modal.innerHTML = [
    '<div class="userkey-card-overlay">',
    '  <div class="userkey-card-panel">',
    '    <div class="userkey-card-icon">🔐</div>',
    '    <h2 class="userkey-card-title">请保存你的密钥</h2>',
    '    <p class="userkey-card-sub">这是你的 8 字符密钥，用于忘记密码时验证身份</p>',
    '    <div class="userkey-card-key" id="userkey-card-key-display">' + escapeHtml(userKey) + '</div>',
    '    <div class="userkey-card-tips">',
    '      <div class="userkey-card-tip">✓ 请截图保存或抄写在纸上</div>',
    '      <div class="userkey-card-tip">✓ 不要告诉任何人</div>',
    '      <div class="userkey-card-tip">✓ 丢失后无法找回，需要重置密码</div>',
    '    </div>',
    '    <button type="button" class="userkey-card-btn" id="userkey-card-btn">我已保存密钥</button>',
    '  </div>',
    '</div>'
  ].join('');

  document.body.appendChild(modal);

  var btn = modal.querySelector('#userkey-card-btn');
  btn.addEventListener('click', function () {
    modal.remove();
    if (typeof onConfirm === 'function') onConfirm();
  });

  // 也允许点击复制
  var keyEl = modal.querySelector('#userkey-card-key-display');
  if (keyEl) {
    keyEl.addEventListener('click', function () {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(userKey).then(function () {
            keyEl.classList.add('copied');
            setTimeout(function () { keyEl.classList.remove('copied'); }, 1200);
          });
        }
      } catch (e) { /* ignore */ }
    });
    keyEl.title = '点击复制';
  }
}

window.updateAuthUI = updateAuthUI;
window.showAuthModal = showAuthModal;
window.handleLogin = handleLogin;
window.handleGuestLogin = handleGuestLogin;
window.handleRegister = handleRegister;

/**
 * 重发验证邮件
 */
async function handleResendEmail(email) {
  var statusEl = document.getElementById('resend-email-status');
  var btn = document.getElementById('resend-email-btn');
  if (statusEl) statusEl.textContent = '发送中...';
  if (btn) btn.disabled = true;

  var result = await resendConfirmationEmail(email);
  if (result.ok) {
    if (statusEl) statusEl.textContent = '验证邮件已重新发送';
    if (statusEl) statusEl.style.color = 'var(--color-sage,#3a8c5c)';
  } else {
    if (statusEl) statusEl.textContent = result.error || '发送失败，请稍后重试';
    if (statusEl) statusEl.style.color = 'var(--color-error,#e53e3e)';
    if (btn) btn.disabled = false;
  }
  // 60秒冷却
  setTimeout(function() {
    if (btn) btn.disabled = false;
    if (statusEl) statusEl.textContent = '';
  }, 60000);
}
window.handleResendEmail = handleResendEmail;
window.closeAuthModal = closeAuthModal;
window.authSwitchToLogin = authSwitchToLogin;
window.authSwitchToRegister = authSwitchToRegister;
window.authSwitchToForgot = authSwitchToForgot;
window.handleForgotPassword = handleForgotPassword;
window.showLeaderboard = showLeaderboard;
window.switchLbTab = switchLbTab;

/** 当前排行榜 tab */
var _currentLbTab = 'bio';

/**
 * 显示排行榜弹窗（三 tab 版本：Bio 分 / 练习量 / 正确率）
 */
async function showLeaderboard() {
  // 关闭移动端菜单
  if (typeof closeMobileMenu === 'function') closeMobileMenu();

  var existing = document.getElementById('leaderboard-modal');
  if (existing) {
    existing.classList.add('visible');
    return;
  }

  var overlay = document.createElement('div');
  overlay.id = 'leaderboard-modal';
  overlay.className = 'leaderboard-overlay';
  overlay.innerHTML = `
    <div class="leaderboard-box">
      <button class="lb-close" data-on='["closeLeaderboard"]'>&times;</button>
      <div class="lb-header">
        <div class="lb-title">排行榜</div>
        <div class="lb-tabs">
          <button class="lb-tab active" id="lb-tab-bio" data-on='["switchLbTab","bio"]'>Bio 分</button>
          <button class="lb-tab" id="lb-tab-practice" data-on='["switchLbTab","practice"]'>练习量</button>
          <button class="lb-tab" id="lb-tab-checkin" data-on='["switchLbTab","checkin"]'>签到</button>
        </div>
      </div>
      <div class="lb-body" id="lb-list">
        <div class="lb-loading">加载中...</div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeLeaderboard();
  });

  setTimeout(function() { overlay.classList.add('visible'); }, 10);

  _currentLbTab = 'bio';
  await loadLbData('bio');
}

/**
 * 切换排行榜 tab
 */
async function switchLbTab(tabName) {
  if (!tabName || tabName === _currentLbTab) return;
  _currentLbTab = tabName;

  var tabs = ['bio', 'practice', 'checkin'];
  for (var i = 0; i < tabs.length; i++) {
    var btn = document.getElementById('lb-tab-' + tabs[i]);
    if (btn) btn.classList.toggle('active', tabs[i] === tabName);
  }

  await loadLbData(tabName);
}

/**
 * 加载排行榜数据
 */
async function loadLbData(tabName) {
  var listEl = document.getElementById('lb-list') || document.querySelector('.lb-body');
  if (!listEl) return;

  listEl.innerHTML = '<div style="text-align:center;color:#6b7f74;padding:40px 0;">加载中...</div>';

  // 排行榜是公开数据，游客也可查看（仅未登录时不显示"我的排名"）
  try {
    var items = [];
    if (typeof window.getLeaderboard === 'function') {
      items = await window.getLeaderboard(tabName, 20);
    }

    if (items && items.length > 0) {
      var loggedIn = (typeof window.isLoggedIn === 'function' && window.isLoggedIn());
      var myRank = loggedIn ? items._myRank : null;
      var html = renderLbItems(items, tabName);
      if (myRank) html += renderMyRank(myRank);
      else if (!loggedIn) {
        html += '<div style="text-align:center;color:#6b7f74;padding:16px 12px;margin-top:12px;border-radius:12px;background:rgba(58,140,92,0.04);font-size:0.82rem;">登录后查看你的排名</div>';
      }
      listEl.innerHTML = html;
    } else {
      // Issue #125：统一「温暖空状态」组件（加载失败时回退原有提示）
      if (window.BioQuest && typeof window.BioQuest.renderEmptyState === 'function') {
        window.BioQuest.renderEmptyState(listEl, {
          icon: '📈',
          title: '暂无排行数据',
          hint: '完成练习后即可上榜'
        });
      } else {
        listEl.innerHTML = '<div style="text-align:center;color:#6b7f74;padding:40px 0;">暂无排行数据<br><span style="font-size:0.78rem;color:#8a8a8a;">完成练习后即可上榜</span></div>';
      }
    }
  } catch (err) {
    if (listEl) {
      listEl.innerHTML = '<div style="text-align:center;color:#6b7f74;padding:40px 0;">排行榜数据暂不可用<br><span style="font-size:0.78rem;color:#8a8a8a;">' + (err && err.message ? err.message : '请稍后重试') + '</span></div>';
    }
  }
}

/**
 * 渲染排行榜列表项（无 emoji）
 */
function renderLbItems(items, tabName) {
  var scoreLabel = '';
  if (tabName === 'bio') {
    scoreLabel = 'Bio分';
  } else if (tabName === 'practice') {
    scoreLabel = '练习题数';
  } else if (tabName === 'checkin') {
    scoreLabel = '签到天数';
  } else {
    scoreLabel = '分数';
  }

  var html = '<div class="lb-table-header">' +
    '<span class="lb-col-rank">#</span>' +
    '<span class="lb-col-name">用户</span>' +
    '<span class="lb-col-score">' + scoreLabel + '</span>';
  if (tabName === 'bio' || tabName === 'checkin') {
    html += '<span class="lb-col-grade">等级</span>';
  }
  html += '</div>';

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var rankClass = '';
    if (i === 0) rankClass = 'leaderboard-rank-1';
    else if (i === 1) rankClass = 'leaderboard-rank-2';
    else if (i === 2) rankClass = 'leaderboard-rank-3';

    var displayScore = '';
    if (tabName === 'practice') {
      displayScore = String(item.total_answered || item.practice_count || 0);
    } else if (tabName === 'checkin') {
      displayScore = String(item.current_streak || 0);
    } else {
      displayScore = String(item.bio_score || 0);
    }

    html += '<div class="leaderboard-item">' +
      '<span class="leaderboard-rank ' + rankClass + '">' + (item.rank || i + 1) + '</span>' +
      '<span class="leaderboard-name">' + escapeHtml(item.display_name || item.username || '匿名用户') + '</span>' +
      '<span class="leaderboard-score">' + displayScore + '</span>';
    if (tabName === 'bio' || tabName === 'checkin') {
      html += '<span class="leaderboard-grade">' + (item.grade || '-') + '</span>';
    }
    html += '</div>';
  }

  return html;
}

/**
 * 关闭排行榜弹窗
 */
function closeLeaderboard() {
  var modal = document.getElementById('leaderboard-modal');
  if (modal) modal.classList.remove('visible');
}
window.closeLeaderboard = closeLeaderboard;

/**
 * 渲染"我的位置"信息条
 */
function renderMyRank(rank) {
  return '<div style="text-align:center;padding:12px 20px;margin-top:16px;background:rgba(58,140,92,0.1);border-radius:10px;border:1px solid rgba(58,140,92,0.15);font-size:0.9rem;color:var(--color-sage,#3a8c5c);">' +
    '我的位置: <strong style="font-size:1.1rem;">#' + rank + '</strong>' +
  '</div>';
}

/**
 * 排行榜独立页面渲染（/leaderboard 路由）
 */
/**
 * 重置密码页面（从邮件链接跳转）
 */
/**
 * AI 生物课堂入口页（v3.1）
 * 提供话题输入 + 推荐话题 + 一键生成课堂
 */
function renderClassroomPage(target) {
  // 推荐话题（覆盖联赛核心考点）
  var recommended = [
    { topic: '光合作用的光反应与暗反应', icon: '🌿', kgNodeId: 'photosynthesis' },
    { topic: '减数分裂与遗传规律', icon: '🧬', kgNodeId: 'meiosis' },
    { topic: 'DNA 复制的半保留机制', icon: '🔬', kgNodeId: 'dna' },
    { topic: '细胞呼吸的能量转化', icon: '⚡', kgNodeId: 'respiration' },
    { topic: '神经冲动的传导机制', icon: '📶', kgNodeId: 'membrane' },
    { topic: '基因表达：转录与翻译', icon: '📝', kgNodeId: 'transcription' }
  ];

  var cardsHtml = recommended.map(function (r, i) {
    return '<button class="cls-topic-card" data-topic="' + _escapeHtmlAttr(r.topic) + '" data-kg="' + _escapeHtmlAttr(r.kgNodeId) + '">'
      + '<span class="cls-topic-icon">' + r.icon + '</span>'
      + '<span class="cls-topic-name">' + r.topic + '</span>'
      + '<span class="cls-topic-arrow">→</span>'
      + '</button>';
  }).join('');

  target.innerHTML = [
    '<div class="cls-page">',
    '  <div class="cls-page-header">',
    '    <div class="cls-page-icon">🎓</div>',
    '    <h1 class="cls-page-title">AI 生物课堂</h1>',
    '    <p class="cls-page-subtitle">输入任意生物主题，AI 老师将为你生成 6 段式沉浸课堂：导入 → 讲解 → 模拟 → 讨论 → 测验 → 项目</p>',
    '  </div>',
    '  <div class="cls-input-row">',
    '    <input type="text" id="cls-topic-input" placeholder="例如：酶的竞争性抑制、C4 植物光合途径..." />',
    '    <button id="cls-start-btn">生成课堂</button>',
    '  </div>',
    '<div class="cls-section-label">或从推荐话题开始：</div>',
    '  <div class="cls-topic-grid">' + cardsHtml + '</div>',
    '  <div class="cls-ai-hint" id="cls-ai-hint"></div>',
    '  <div class="cls-mode-row" style="display:flex;align-items:center;gap:8px;margin-top:16px;padding:12px;background:#f8f9fa;border-radius:8px;font-size:13px;color:#666;flex-wrap:wrap;">',
    '    <span>课堂生成模式：</span>',
    '    <label><input type="radio" name="cls-mode" value="outline" checked /> 6 段式（v3.1 推荐）</label>',
    '    <label><input type="radio" name="cls-mode" value="v4" /> v4.0 4 段深化（[ACTION:] 标签流）</label>',
    '    <label><input type="radio" name="cls-mode" value="omaic" /> OpenMAIC 6 步进度</label>',
    '    <label><input type="radio" name="cls-mode" value="dsl" /> OpenMAIC DSL（完整 Slide）</label>',
    '    <span style="margin-left:auto;color:#999;">v4.0 模式：4 段课堂 + AI 老师输出含 [ACTION:] 标签驱动动画/图谱/测验</span>',
    '  </div>',
    '</div>'
  ].join('');

  // 绑定事件
  var input = target.querySelector('#cls-topic-input');
  var startBtn = target.querySelector('#cls-start-btn');
  var hint = target.querySelector('#cls-ai-hint');

  function startClassroom(topic, kgNodeId) {
    if (!topic) {
      hint.textContent = '请输入或选择一个话题';
      hint.style.color = '#d44';
      return;
    }
    if (!window.ClassroomPlayer) {
      hint.textContent = '课堂模块加载中，请稍后重试';
      hint.style.color = '#d44';
      return;
    }
    hint.textContent = '';
    // 读取模式
    var modeRadio = target.querySelector('input[name="cls-mode"]:checked');
    var mode = modeRadio ? modeRadio.value : 'outline';

    // 通用：选择正确的 GenProgress preset
    var presetMap = { outline: 'outline-6', omaic: 'omaic', dsl: 'dsl', v4: 'outline-4' };
    var preset = presetMap[mode] || 'outline-6';

    // 6 段式：直接调用 ClassroomPlayer 进行真实生成，不再显示假进度
    if (mode === 'outline') {
      if (!window.ClassroomPlayer) {
        hint.textContent = '课堂模块加载中，请稍后重试';
        hint.style.color = '#d44';
        return;
      }
      hint.textContent = '正在调用 AI 生成 6 段式课堂，请稍候...';
      hint.style.color = '#4a7c59';
      window.ClassroomPlayer.open({ topic: topic, kgNodeId: kgNodeId || '', sourceType: 'outline' });
      return;
    }

    // v4.0 4 段深化模式：4 scene + [ACTION:] 标签流
    if (mode === 'v4') {
      if (!window.ClassroomPlayer || !window.Classroom || !window.Classroom.generateOutlineV4) {
        hint.textContent = 'v4.0 课堂模块加载中，请稍后重试';
        hint.style.color = '#d44';
        return;
      }
      hint.textContent = '正在调用 AI 生成 v4.0 4 段深化课堂（含 [ACTION:] 标签流）...';
      hint.style.color = '#4a7c59';
      window.ClassroomPlayer.open({ topic: topic, kgNodeId: kgNodeId || '', sourceType: 'v4', mode: 'v4' });
      return;
    }

    if (mode === 'omaic') {
      // OpenMAIC 6 步进度模式：先显示生成进度，跑完进入 BioQuest 课堂
      if (!window.OpenMAICClassroomRunner) {
        hint.textContent = 'OpenMAIC Runner 未加载，降级为普通模式';
        hint.style.color = '#d44';
        window.ClassroomPlayer.open({ topic: topic, kgNodeId: kgNodeId || '', sourceType: 'manual' });
        return;
      }
      hint.textContent = 'OpenMAIC 6 步生成中...';
      hint.style.color = '#4a7c59';
      window.OpenMAICClassroomRunner.startFromEntry({
        topic: topic,
        kgNodeId: kgNodeId || '',
        sourceType: 'manual',
        onClassroomReady: function () {
          window.ClassroomPlayer.open({ topic: topic, kgNodeId: kgNodeId || '', sourceType: 'omaic' });
        }
      });
      return;
    }

    if (mode === 'dsl') {
      // OpenMAIC DSL：进度页 + 1 次 LLM 调用生成完整 Stage
      if (!window.OpenMAICGenProgress || !window.Classroom || !window.Classroom.generateStageDSL) {
        hint.textContent = 'DSL 组件未加载';
        hint.style.color = '#d44';
        return;
      }
      hint.textContent = 'OpenMAIC DSL 正在生成完整 Stage（生成中可最小化窗口）...';
      hint.style.color = '#4a7c59';
      // 缓存：先生成再播放
      var stageDataCache = null;
      var dslError = null;
      window.OpenMAICGenProgress.open({
        topic: topic,
        preset: 'dsl',
        hooks: {
          onStepStart: async () => { await sleep(300 + Math.random() * 200); },
          onStepEnd: async (idx) => {
            if (idx === 4) {
              // 第 5 步：实际调用 LLM 生成 Stage（带 90s 超时，与课堂一致）
              try {
                stageDataCache = await Promise.race([
                  window.Classroom.generateStageDSL(topic),
                  new Promise(function (_, reject) {
                    setTimeout(function () { reject(new Error('DSL 生成超时（90s）')); }, 90000);
                  })
                ]);
              } catch (e) {
                console.error('[DSL] generateStageDSL failed', e);
                dslError = e.message || String(e);
                stageDataCache = null;
                if (window.OpenMAICGenProgress.setStepStatus) {
                  window.OpenMAICGenProgress.setStepStatus(4, 'error', { preview: String(dslError).substring(0, 80) });
                }
              }
            }
          }
        },
        onComplete: function () {
          // DSL 失败 → 自动降级到 6 段式课堂
          if (!stageDataCache) {
            console.warn('[DSL] 降级到 6 段式课堂（DSL 生成失败）');
            showHint('DSL 课堂已自动降级到 6 段式（LLM 超时）', '#c4956a');
            setTimeout(function () {
              if (window.ClassroomPlayer && window.ClassroomPlayer.open) {
                window.ClassroomPlayer.open({ topic: topic, kgNodeId: kgNodeId || '', sourceType: 'dsl-fallback' });
              }
            }, 50);
            return;
          }
          // DSL 降级（解析失败但有 fallback data）→ 仍可进入
          if (stageDataCache._isFallback) {
            showHint('DSL 解析已降级（LLM 输出异常），仍可进入课堂', '#c4956a');
          }
          if (window.ClassroomPlayer.openDSL) {
            window.ClassroomPlayer.openDSL(stageDataCache);
          } else if (window.Classroom.runDSLStage) {
            window.Classroom.runDSLStage(stageDataCache, { onSceneStart: function () {} });
          } else {
            // 终极降级：6 段式
            showHint('DSL 播放器未加载，已降级到 6 段式', '#c4956a');
            window.ClassroomPlayer.open({ topic: topic, kgNodeId: kgNodeId || '', sourceType: 'dsl-fallback' });
          }
        }
      });
      return;
    }
    window.ClassroomPlayer.open({ topic: topic, kgNodeId: kgNodeId || '', sourceType: 'manual' });
  }

  function showHint(text, color) {
    if (!hint) return;
    hint.textContent = text;
    hint.style.color = color || '#4a7c59';
  }

  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

  startBtn.addEventListener('click', function () {
    startClassroom(input.value.trim(), '');
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') startClassroom(input.value.trim(), '');
  });
  target.querySelectorAll('.cls-topic-card').forEach(function (card) {
    card.addEventListener('click', function () {
      startClassroom(card.getAttribute('data-topic'), card.getAttribute('data-kg'));
    });
  });
}

function _escapeHtmlAttr(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
  });
}
window.renderClassroomPage = renderClassroomPage;

function renderResetPasswordPage(target) {
  target.innerHTML = '<div style="max-width:400px;margin:60px auto;padding:32px 24px;background:var(--card-bg,#1a1f1c);border-radius:16px;border:1px solid rgba(58,140,92,0.15);">' +
    '<h2 style="text-align:center;font-size:1.2rem;margin-bottom:8px;color:var(--color-sage,#3a8c5c);">设置新密码</h2>' +
    '<p style="text-align:center;font-size:0.85rem;color:var(--text-secondary,#8a8a8a);margin-bottom:20px;">请输入您的新密码</p>' +
    '<input type="password" class="auth-input" id="reset-new-password" placeholder="新密码（至少6位）" autocomplete="new-password" style="margin-bottom:12px;width:100%;box-sizing:border-box;">' +
    '<input type="password" class="auth-input" id="reset-confirm-password" placeholder="确认新密码" autocomplete="new-password" style="margin-bottom:16px;width:100%;box-sizing:border-box;">' +
    '<button class="auth-btn" data-on=\'["handleResetPasswordSubmit"]\'>确认修改</button>' +
    '<p id="reset-password-error" class="auth-error"></p>' +
  '</div>';
}
window.renderResetPasswordPage = renderResetPasswordPage;

/**
 * 提交新密码
 */
async function handleResetPasswordSubmit() {
  var newPwd = document.getElementById('reset-new-password').value;
  var confirmPwd = document.getElementById('reset-confirm-password').value;
  var errorEl = document.getElementById('reset-password-error');

  if (!newPwd || newPwd.length < 6) {
    errorEl.textContent = '密码至少6位';
    return;
  }
  if (newPwd !== confirmPwd) {
    errorEl.textContent = '两次输入的密码不一致';
    return;
  }

  errorEl.textContent = '';
  var sb = typeof getSupabase === 'function' ? getSupabase() : null;
  if (!sb) {
    errorEl.textContent = '系统未初始化，请刷新页面';
    return;
  }

  try {
    var { error } = await sb.auth.updateUser({ password: newPwd });
    if (error) {
      errorEl.textContent = error.message.includes('same') ? '新密码不能与旧密码相同' : '修改失败：' + error.message;
      return;
    }
    var target = _AppState.rootElement || document.getElementById('page-content');
    if (target) {
      target.innerHTML = '<div style="text-align:center;padding:80px 20px;">' +
        '<div style="font-size:3rem;margin-bottom:16px;">&#10003;</div>' +
        '<h2 style="font-size:1.3rem;margin-bottom:8px;color:var(--color-sage,#3a8c5c);">密码修改成功</h2>' +
        '<p style="font-size:0.9rem;color:var(--text-secondary,#8a8a8a);margin-bottom:24px;">请使用新密码登录</p>' +
        '<button data-on=\'["_cspGotoHash","/"]\' style="background:var(--color-sage,#3a8c5c);color:#fff;border:none;padding:10px 24px;border-radius:20px;cursor:pointer;font-size:0.9rem;">返回首页</button>' +
      '</div>';
    }
  } catch (e) {
    errorEl.textContent = '修改失败，请稍后重试';
  }
}
window.handleResetPasswordSubmit = handleResetPasswordSubmit;

function renderLeaderboardPage(target) {
  target.innerHTML = '<div class="lb-page-container">' +
    '<div class="lb-page-header">' +
      '<h2 class="lb-page-title">排行榜</h2>' +
      '<div class="lb-tabs" id="lb-page-tabs">' +
        '<button class="lb-tab active" id="lb-page-tab-bio" data-on=\'["switchLbPageTab","bio"]\'>Bio 分</button>' +
        '<button class="lb-tab" id="lb-page-tab-practice" data-on=\'["switchLbPageTab","practice"]\'>练习量</button>' +
        '<button class="lb-tab" id="lb-page-tab-checkin" data-on=\'["switchLbPageTab","checkin"]\'>签到</button>' +
      '</div>' +
    '</div>' +
    '<div class="lb-page-body" id="lb-page-list">' +
      '<div style="text-align:center;color:#6b7f74;padding:40px 0;">加载中...</div>' +
    '</div>' +
  '</div>';

  _currentLbTab = 'bio';
  loadLbPageData('bio');
}

var _currentLbPageTab = 'bio';

async function switchLbPageTab(tabName) {
  if (!tabName || tabName === _currentLbPageTab) return;
  _currentLbPageTab = tabName;

  var tabs = ['bio', 'practice', 'checkin'];
  for (var i = 0; i < tabs.length; i++) {
    var btn = document.getElementById('lb-page-tab-' + tabs[i]);
    if (btn) btn.classList.toggle('active', tabs[i] === tabName);
  }

  await loadLbPageData(tabName);
}

async function loadLbPageData(tabName) {
  var listEl = document.getElementById('lb-page-list');
  if (!listEl) return;

  listEl.innerHTML = '<div style="text-align:center;color:#6b7f74;padding:40px 0;">加载中...</div>';

  // 排行榜是公开数据，游客也可查看（仅未登录时不显示"我的排名"）
  try {
    var items = [];
    if (typeof window.getLeaderboard === 'function') {
      items = await window.getLeaderboard(tabName, 20);
    }

    if (items && items.length > 0) {
      var myRank = (typeof window.isLoggedIn === 'function' && window.isLoggedIn()) ? items._myRank : null;
      var html = renderLbItems(items, tabName);
      if (myRank) html += renderMyRank(myRank);
      else if (typeof window.isLoggedIn !== 'function' || !window.isLoggedIn()) {
        // 游客提示登录后可见自己的排名
        html += '<div style="text-align:center;color:#6b7f74;padding:20px 12px;margin-top:12px;border-radius:12px;background:rgba(58,140,92,0.04);"><span style="font-size:0.84rem;">登录后查看你的排名</span> <button data-on=\'["_cspShowAuth"]\' style="margin-left:8px;padding:4px 14px;border:none;border-radius:14px;background:var(--color-sage,#5a7d5c);color:#fff;font-size:0.78rem;cursor:pointer;">登录</button></div>';
      }
      listEl.innerHTML = html;
    } else {
      // Issue #125：统一「温暖空状态」组件（加载失败时回退原有提示）
      if (window.BioQuest && typeof window.BioQuest.renderEmptyState === 'function') {
        window.BioQuest.renderEmptyState(listEl, {
          icon: '📈',
          title: '暂无排行数据',
          hint: '完成练习后即可上榜'
        });
      } else {
        listEl.innerHTML = '<div style="text-align:center;color:#6b7f74;padding:40px 0;">暂无排行数据<br><span style="font-size:0.78rem;color:#8a8a8a;">完成练习后即可上榜</span></div>';
      }
    }
  } catch (err) {
    listEl.innerHTML = '<div style="text-align:center;color:#6b7f74;padding:40px 0;">排行榜数据暂不可用<br><span style="font-size:0.78rem;color:#8a8a8a;">' + (err && err.message ? err.message : '请稍后重试') + '</span></div>';
  }
}

window.renderLeaderboardPage = renderLeaderboardPage;
window.switchLbPageTab = switchLbPageTab;

function showStorageStatus(status) {
  var existing = document.getElementById('storage-status');
  if (existing) existing.remove();

  var el = document.createElement('div');
  el.id = 'storage-status';
  var labels = {
    syncing: { text: '云端同步中...', color: '#f59e0b' },
    cloud:   { text: '云端已连接',   color: '#22c55e' },
    local:   { text: '本地存储模式', color: '#94a3b8' }
  };
  var info = labels[status] || labels.local;
  el.style.cssText = [
    'position:fixed',
    'bottom:16px',
    'right:16px',
    'z-index:9999',
    'background:' + info.color,
    'color:#fff',
    'padding:6px 12px',
    'border-radius:20px',
    'font-size:12px',
    'font-weight:500',
    'box-shadow:0 2px 8px rgba(0,0,0,0.15)',
    'pointer-events:none',
    'transition:opacity 0.3s'
  ].join(';');
  el.textContent = info.text;
  document.body.appendChild(el);

  if (status !== 'syncing') {
    setTimeout(function () {
      if (document.getElementById('storage-status') === el) {
        el.style.opacity = '0';
        setTimeout(function () { el.remove(); }, 300);
      }
    }, 3000);
  }
}

/**
 * 从云端拉取数据合并到本地
 */
/**
 * 初始化应用 — 在 DOMContentLoaded 时执行
 */
function initApp() {
  if (_AppState.initialized) {
    return;
  }

  restoreSettings();

  // P1-19：首次访问时展示隐私政策提示（一次性，可关闭；无内联脚本）
  _maybeShowPrivacyNotice();

  // 异步初始化 Supabase — 不阻塞页面首次渲染
  // 使用 requestIdleCallback 在空闲时初始化，确保首屏交互优先
  var _initSupabase = function() {
    initSupabase().catch(function(e) {
      console.warn('[BioQuest] Supabase 初始化失败，使用本地模式:', e.message);
      showStorageStatus('local');
      updateAuthUI();
    });
  };
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(_initSupabase, { timeout: 5000 });
  } else {
    setTimeout(_initSupabase, 500);
  }

  const root = document.getElementById('page-content');
  if (!root) {
    console.error('[BioQuest] 找不到 #page-content 元素');
    return;
  }

  _AppState.rootElement = root;
  _AppState._homeHTML = root.innerHTML;
  _AppState._countdownTimer = null;

  // P1-5（Issue #102）：PWA 快捷方式 ?page= 白名单路由（读取后清理 URL）
  _applyPageQueryParam();

  const route = getRouteFromHash();

  bindEvents();

  requestAnimationFrame(() => {
    handleRoute(route);
  });

  _AppState.initialized = true;

}

function openDonation() {
  const styleId = 'bioquest-donation-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .donation-overlay {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(5, 10, 7, 0.75);
        backdrop-filter: blur(20px) saturate(180%);
        animation: donationFadeIn 0.25s ease;
      }

      .donation-overlay.closing {
        animation: donationFadeOut 0.2s ease forwards;
      }

      @keyframes donationFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes donationFadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }

      .donation-modal {
        position: relative;
        width: 90vw;
        max-width: 400px;
        max-height: 90vh;
        overflow-y: auto;
        background: #111613;
        border: 1px solid rgba(58, 140, 92, 0.2);
        border-radius: var(--radius-lg, 20px);
        padding: 36px 32px 28px;
        box-shadow: 0 0 30px rgba(58, 140, 92, 0.15),
                    0 20px 48px rgba(26, 42, 24, 0.25);
        animation: donationSlideUp 0.3s ease;
      }

      @keyframes donationSlideUp {
        from { opacity: 0; transform: translateY(24px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      .donation-close {
        position: absolute;
        top: 12px;
        right: 14px;
        width: 32px;
        height: 32px;
        border: none;
        background: rgba(255, 255, 255, 0.1);
        cursor: pointer;
        color: #e8e6e2;
        font-size: 1.4rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
        line-height: 1;
      }
      .donation-close:hover {
        background: rgba(232, 168, 48, 0.2);
        color: #f5d491;
      }

      .donation-title {
        font-family: var(--font-serif, 'Noto Serif SC', serif);
        font-size: 1.45rem;
        font-weight: 700;
        color: #f5d491;
        text-align: center;
        margin-bottom: 16px;
        text-shadow: 0 0 12px rgba(232, 168, 48, 0.35);
      }

      .donation-desc {
        font-size: 0.95rem;
        color: #e8e6e2;
        text-align: center;
        line-height: 1.7;
        margin-bottom: 28px;
      }

      .donation-qr-area {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: rgba(232, 168, 48, 0.08);
        border: 1px solid rgba(232, 168, 48, 0.25);
        border-radius: var(--radius-md, 12px);
        margin-bottom: 20px;
      }

      .donation-link-btn {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 14px 28px;
        border-radius: var(--radius-md, 12px);
        background: linear-gradient(135deg, #e8a830, #c4956a);
        color: #1a2f1d;
        font-weight: 700;
        font-size: 1rem;
        text-decoration: none;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        box-shadow: 0 4px 16px rgba(232, 168, 48, 0.35);
      }
      .donation-link-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(232, 168, 48, 0.5);
      }
      .donation-link-btn svg {
        width: 22px;
        height: 22px;
        stroke-width: 2.5;
      }

      .donation-thanks {
        text-align: center;
        font-size: 0.95rem;
        font-weight: 600;
        color: #e8a830;
        text-shadow: 0 0 8px rgba(232, 168, 48, 0.35);
      }

      [data-theme="dark"] .donation-overlay {
        background: rgba(0, 0, 0, 0.75);
      }

      [data-theme="light"] .donation-modal {
        background: #1a2a1e;
      }
      [data-theme="light"] .donation-desc {
        color: #f0eee9;
      }
      [data-theme="light"] .donation-title {
        color: #f5d491;
      }

      @media (max-width: 480px) {
        .donation-modal {
          padding: 24px 20px 20px;
        }
        .donation-title {
          font-size: 1.25rem;
        }
        .donation-qr-img {
          width: 160px;
          height: 160px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const overlay = document.createElement('div');
  overlay.className = 'donation-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '赞赏支持');

  overlay.innerHTML = `
    <div class="donation-modal">
      <button class="donation-close" aria-label="关闭">&times;</button>
      <div class="donation-title">赞赏支持</div>
      <div class="donation-desc">BioQuest 是开源免费的生物竞赛学习平台。如果您觉得这个项目有帮助，欢迎通过爱发电支持我们持续维护和更新。</div>
      <div class="donation-qr-area">
        <a href="https://ifdian.net/a/astrnox" target="_blank" rel="noopener noreferrer" class="donation-link-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          在爱发电支持我们
        </a>
      </div>
      <div class="donation-thanks">感谢您的支持！</div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const closeDonation = () => {
    if (_donationFocusTrap) { _donationFocusTrap.release(); _donationFocusTrap = null; }
    overlay.classList.add('closing');
    overlay.addEventListener('animationend', () => {
      overlay.remove();
      document.body.style.overflow = '';
    }, { once: true });
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDonation();
  });

  overlay.querySelector('.donation-close').addEventListener('click', closeDonation);

  if (window.BioQuestA11y && typeof window.BioQuestA11y.trapFocus === 'function') {
    _donationFocusTrap = window.BioQuestA11y.trapFocus(overlay, {
      onEscape: closeDonation,
      initialFocus: overlay.querySelector('.donation-close')
    });
  }
}

// ============================================================
// 聚合搜索功能
// ============================================================

function showSearchModal(prefillQuery) {
  if (typeof navigateTo === 'function') {
    navigateTo('/search');
    setTimeout(function() {
      var input = document.getElementById('search-page-input');
      if (input && prefillQuery) {
        input.value = prefillQuery;
        var btn = document.getElementById('search-page-btn');
        if (btn) btn.click();
      }
    }, 200);
  }
}

function closeSearchModal() {
  // 兼容性保留空函数
}

window.openDonation = openDonation;
window.showSearchModal = showSearchModal;
window.closeSearchModal = closeSearchModal;
window.renderSearchPage = renderSearchPage;
window.searchLocalQuestions = searchLocalQuestions;
window.extractTags = extractTags;
window.handleRoute = handleRoute;
window.navigateTo = navigateTo;

// ============================================================
// 用户反馈系统
// ============================================================

/**
 * 显示反馈弹窗
 */
function showFeedbackModal() {
  var existing = document.getElementById('feedback-modal');
  if (existing) {
    existing.classList.add('visible');
    return;
  }

  var overlay = document.createElement('div');
  overlay.id = 'feedback-modal';
  overlay.className = 'auth-modal-overlay';
  overlay.innerHTML = `
    <div class="auth-container" style="max-width:500px;">
      <button class="auth-close-btn" data-on='["closeFeedbackModal"]' title="关闭">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div style="padding:24px 20px;">
        <h2 class="auth-form-title" style="margin-bottom:4px;">用户反馈</h2>
        <p class="auth-form-sub" style="margin-bottom:20px;">告诉我们你的想法，帮助我们改进 BioQuest</p>

        <div class="auth-field" style="margin-bottom:14px;">
          <label style="display:block;font-size:0.82rem;color:var(--text-secondary,#8a8a8a);margin-bottom:6px;">反馈类型</label>
          <select id="feedback-type" style="width:100%;padding:10px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:var(--text-primary,#e0e0e0);font-size:0.9rem;outline:none;">
            <option value="bug">🐛 Bug 报告</option>
            <option value="feature">✨ 功能建议</option>
            <option value="question_error">📖 题目/内容纠错</option>
            <option value="suggestion">💬 其他建议</option>
          </select>
        </div>

        <div class="auth-field" style="margin-bottom:14px;">
          <label style="display:block;font-size:0.82rem;color:var(--text-secondary,#8a8a8a);margin-bottom:6px;">标题</label>
          <input type="text" id="feedback-title" class="auth-input" placeholder="简要描述你的反馈" style="width:100%;box-sizing:border-box;">
        </div>

        <div class="auth-field" style="margin-bottom:14px;">
          <label style="display:block;font-size:0.82rem;color:var(--text-secondary,#8a8a8a);margin-bottom:6px;">详细描述</label>
          <textarea id="feedback-description" class="auth-input" placeholder="请详细描述问题或建议..." style="width:100%;box-sizing:border-box;min-height:100px;resize:vertical;font-family:inherit;" rows="4"></textarea>
        </div>

        <div class="auth-field" style="margin-bottom:14px;">
          <label style="display:block;font-size:0.82rem;color:var(--text-secondary,#8a8a8a);margin-bottom:6px;">联系方式（选填）</label>
          <input type="text" id="feedback-contact" class="auth-input" placeholder="QQ/微信/邮箱，方便我们回复" style="width:100%;box-sizing:border-box;">
        </div>

        <div style="margin-bottom:14px;padding:10px 12px;background:rgba(58,140,92,0.08);border:1px solid rgba(58,140,92,0.25);border-radius:10px;font-size:0.82rem;color:var(--text-secondary,#9aa5a0);line-height:1.6;">
          想得到更快的回复，建议直接去 GitHub 提 Issue（有模板，填起来很快）：
          <br>
          <button type="button" data-stop-propagation data-on='["_cspOpenGitHub"]' style="margin-top:8px;padding:6px 14px;border-radius:8px;background:rgba(58,140,92,0.15);border:1px solid rgba(58,140,92,0.4);color:#7fd0a3;font-size:0.82rem;cursor:pointer;">前往 GitHub 提 Issue →</button>
        </div>

        <button type="button" class="auth-btn" data-on='["handleFeedbackSubmit"]' data-prevent-default style="width:100%;">提交反馈</button>
        <p class="auth-error" id="feedback-error" style="margin-top:8px;"></p>
        <p style="margin-top:14px;text-align:center;font-size:0.78rem;color:rgba(255,255,255,0.35);">作者（高中生）较忙，回复可能偏慢，见谅 · 作者 astrnox · astrnox@163.com · QQ 3930523703</p>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeFeedbackModal();
  });

  setTimeout(function() { overlay.classList.add('visible'); }, 10);
}

/**
 * 关闭反馈弹窗
 */
function closeFeedbackModal() {
  var modal = document.getElementById('feedback-modal');
  if (modal) modal.classList.remove('visible');
}

/**
 * 提交反馈
 */
function handleFeedbackSubmit() {
  var type = document.getElementById('feedback-type').value;
  var title = document.getElementById('feedback-title').value.trim();
  var description = document.getElementById('feedback-description').value.trim();
  var contact = document.getElementById('feedback-contact').value.trim();
  var errorEl = document.getElementById('feedback-error');

  if (!title) {
    if (errorEl) errorEl.textContent = '请填写标题';
    return;
  }
  if (!description) {
    if (errorEl) errorEl.textContent = '请填写详细描述';
    return;
  }

  var currentUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  var feedback = {
    id: 'fb_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type: type,
    title: title,
    description: description,
    contact: contact || '',
    user: currentUser ? { id: currentUser.id, username: currentUser.username } : null,
    createdAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  // 存储到 localStorage
  try {
    var existing = [];
    var raw = localStorage.getItem('bioquest_feedbacks');
    if (raw) existing = JSON.parse(raw);
    if (!Array.isArray(existing)) existing = [];
    existing.push(feedback);
    localStorage.setItem('bioquest_feedbacks', JSON.stringify(existing));
  } catch (e) {
    if (errorEl) {
      errorEl.textContent = '存储失败：' + (e.message || '未知错误');
      return;
    }
  }

  // 尝试发送到 Supabase（如果已登录）
  if (currentUser && !currentUser.isGuest) {
    try {
      var sb = (typeof getSupabase === 'function') ? getSupabase() : null;
      if (sb) {
        sb.from('feedbacks').insert({
          type: type,
          title: title,
          description: description,
          contact: contact || '',
          user_id: currentUser.id,
          user_agent: navigator.userAgent
        }).then(function() { /* 静默 */ }).catch(function() { /* 静默 */ });
      }
    } catch (e) { /* 静默 */ }
  }

  closeFeedbackModal();
  if (typeof showToast === 'function') {
    showToast('感谢你的反馈！我们会认真查看每一条建议');
  }
}

/**
 * 显示 Toast 通知
 * P1-12（Issue #121）增强：
 *   - 第二参数兼容两种形态：'error'|'success'|'info'（类型化样式）或数字（毫秒时长）；
 *     修复 habits.js 等处误传 'error' 字符串导致 setTimeout(…,'error') 被 coerce 成 0ms
 *     立即消失、且错误无视觉区分的缺陷；
 *   - 增加 role="alert" + aria-live，读屏用户可感知错误/状态提示。
 * @param {string} message 提示文本
 * @param {string|number} [typeOrDuration] 'error'|'success'|'info' 或毫秒数
 * @param {number} [duration] 显示时长（毫秒），默认 success/info 3000、error 4500
 */
function showToast(message, typeOrDuration, duration) {
  var type = 'info';
  if (typeOrDuration === 'error' || typeOrDuration === 'success' || typeOrDuration === 'info') {
    type = typeOrDuration;
  } else if (typeof typeOrDuration === 'number' && typeOrDuration > 0) {
    duration = typeOrDuration; // 旧签名 showToast(msg, ms) 兼容
  }
  if (!(typeof duration === 'number' && duration > 0)) {
    duration = type === 'error' ? 4500 : 3000;
  }

  var existing = document.getElementById('bioquest-toast');
  if (existing) existing.remove();

  var typeBg = type === 'error' ? 'rgba(160,58,44,0.96)' : type === 'success' ? 'rgba(38,92,58,0.96)' : 'rgba(26,58,42,0.95)';
  var typeBorder = type === 'error' ? 'rgba(200,90,70,0.5)' : type === 'success' ? 'rgba(90,180,120,0.5)' : 'rgba(58,140,92,0.3)';

  var toast = document.createElement('div');
  toast.id = 'bioquest-toast';
  // P1-12：错误用 assertive（立即播报），其余 polite
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  toast.style.cssText = [
    'position:fixed',
    'bottom:80px',
    'left:50%',
    'transform:translateX(-50%)',
    'z-index:99999',
    'background:' + typeBg,
    'color:#fff',
    'padding:12px 24px',
    'border-radius:24px',
    'font-size:0.9rem',
    'font-weight:500',
    'box-shadow:0 4px 20px rgba(0,0,0,0.3)',
    'border:1px solid ' + typeBorder,
    'animation:toastSlideUp 0.3s ease',
    'max-width:90vw',
    'text-align:center',
    'pointer-events:none'
  ].join(';');
  toast.textContent = message;
  document.body.appendChild(toast);

  // 添加动画样式
  if (!document.getElementById('toast-style')) {
    var style = document.createElement('style');
    style.id = 'toast-style';
    style.textContent = '@keyframes toastSlideUp{from{transform:translateX(-50%) translateY(20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}@keyframes toastSlideDown{from{transform:translateX(-50%) translateY(0);opacity:1}to{transform:translateX(-50%) translateY(20px);opacity:0}}';
    document.head.appendChild(style);
  }

  setTimeout(function() {
    toast.style.animation = 'toastSlideDown 0.3s ease forwards';
    setTimeout(function() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, duration);
}

/**
 * P1-21：带“撤销”按钮的操作反馈条，用于删除等可逆操作。
 * 自动经过 options.duration 后消失（不触发撤销）；点“撤销”则执行 onUndo 并收起。
 * 返回 { dismiss }，调用方可主动收起（例如已重新恢复场景）。
 * 仅用 DOM API + addEventListener，无内联脚本（符合 CSP）。
 * @param {string} message - 提示文本
 * @param {Function} onUndo - 点撤销时执行的回调
 * @param {Object} [options] - { duration, label }
 * @returns {{ dismiss: Function }}
 */
function showUndoToast(message, onUndo, options) {
  options = options || {};
  var label = options.label || '撤销';
  var existing = document.getElementById('bioquest-undo-toast');
  if (existing) existing.remove();

  var bar = document.createElement('div');
  bar.id = 'bioquest-undo-toast';
  bar.setAttribute('role', 'status');
  bar.setAttribute('aria-live', 'polite');
  bar.style.cssText = [
    'position:fixed',
    'bottom:80px',
    'left:50%',
    'transform:translateX(-50%)',
    'z-index:99999',
    'display:flex',
    'align-items:center',
    'gap:14px',
    'background:rgba(26,58,42,0.96)',
    'color:#fff',
    'padding:12px 18px',
    'border-radius:14px',
    'font-size:0.9rem',
    'font-weight:500',
    'box-shadow:0 4px 20px rgba(0,0,0,0.3)',
    'border:1px solid rgba(58,140,92,0.3)',
    'animation:toastSlideUp 0.3s ease',
    'max-width:90vw',
    'pointer-events:auto'
  ].join(';');

  var text = document.createElement('span');
  text.textContent = message;

  var undoBtn = document.createElement('button');
  undoBtn.type = 'button';
  undoBtn.textContent = label;
  undoBtn.style.cssText = 'border:none;background:transparent;color:#91d8ab;font-weight:700;font-size:0.9rem;cursor:pointer;padding:4px 8px;white-space:nowrap;';

  var fired = false;
  function dismiss() {
    if (bar.parentNode) bar.parentNode.removeChild(bar);
  }
  undoBtn.addEventListener('click', function () {
    if (fired) return;
    fired = true;
    dismiss();
    if (typeof onUndo === 'function') {
      try { onUndo(); } catch (e) { /* 撤销失败不影响页面 */ }
    }
  });

  bar.appendChild(text);
  bar.appendChild(undoBtn);
  document.body.appendChild(bar);

  setTimeout(function () {
    bar.style.animation = 'toastSlideDown 0.3s ease forwards';
    setTimeout(dismiss, 300);
  }, options.duration || 5000);

  return { dismiss: dismiss };
}

// 暴露到全局
window.showFeedbackModal = showFeedbackModal;
window.closeFeedbackModal = closeFeedbackModal;
window.handleFeedbackSubmit = handleFeedbackSubmit;
window.showToast = showToast;
window.showUndoToast = showUndoToast;

// ============================================================
// PRD §5-30：网络状态指示器
// ============================================================
(function () {
  var indicator = document.createElement('div');
  indicator.id = 'network-status-indicator';
  indicator.style.cssText = [
    'position:fixed',
    'top:8px',
    'right:60px',
    'z-index:9995',
    'display:inline-flex',
    'align-items:center',
    'gap:4px',
    'padding:3px 10px',
    'border-radius:12px',
    'font-size:0.7rem',
    'font-weight:500',
    'transition:all 0.3s ease',
    'pointer-events:none',
    'opacity:0'
  ].join(';');

  function setOnline() {
    indicator.textContent = '在线';
    indicator.style.background = 'rgba(90,125,92,0.15)';
    indicator.style.color = '#5a7d5c';
    indicator.style.opacity = '0';
    setTimeout(function () { indicator.style.opacity = '0'; }, 2000);
  }

  function setOffline() {
    indicator.textContent = '离线模式';
    indicator.style.background = 'rgba(196,149,106,0.2)';
    indicator.style.color = '#c4956a';
    indicator.style.opacity = '1';
  }

  window.addEventListener('online', setOnline);
  window.addEventListener('offline', setOffline);

  if (!navigator.onLine) {
    setOffline();
  } else {
    indicator.textContent = '';
    indicator.style.opacity = '0';
  }

  document.body.appendChild(indicator);
})();

// ============================================================
// PRD §5-31：Service Worker 更新提示（防挂起版）
// ----------------------------------------------------------------
// 修复：首次进入 navigator.serviceWorker.ready 可能永远 pending（新用户没有
// controller 时），必须加超时安全网 + controllerchange 双保险，避免
// 监听 updatefound 的回调永远注册不上导致用户感知"卡住/要刷新"。
// ============================================================
(function () {
  if (!('serviceWorker' in navigator)) return;

  var bannerShown = false;
  function showUpdateBanner() {
    if (bannerShown) return;
    bannerShown = true;
    // 延迟插入，避免阻塞首屏关键渲染路径（首帧之后再显示提示，不会白屏闪烁）
    requestAnimationFrame(function () {
      setTimeout(function () {
        if (!document.body) return;
        var banner = document.createElement('div');
        banner.id = 'sw-update-banner';
        banner.style.cssText = [
          'position:fixed',
          'bottom:80px',
          'left:50%',
          'transform:translateX(-50%)',
          'z-index:99999',
          'background:rgba(26,58,42,0.95)',
          'color:#fff',
          'padding:12px 24px',
          'border-radius:16px',
          'font-size:0.9rem',
          'box-shadow:0 4px 20px rgba(0,0,0,0.3)',
          'border:1px solid rgba(58,140,92,0.3)',
          'display:flex',
          'align-items:center',
          'gap:12px',
          'max-width:90vw',
          'animation:toastSlideUp 0.3s ease'
        ].join(';');
        banner.innerHTML = '<span>新版本可用</span>' +
          '<button data-on=\'["_cspReload"]\' style="padding:6px 16px;border-radius:8px;border:none;background:#5a7d5c;color:#fff;cursor:pointer;font-size:0.85rem;font-weight:600;white-space:nowrap;">刷新</button>' +
          '<button data-on=\'["_cspRemoveParent"]\' style="padding:6px 10px;border-radius:8px;border:none;background:transparent;color:#999;cursor:pointer;font-size:0.85rem;">✕</button>';
        document.body.appendChild(banner);
      }, 0);
    });
  }

  function wireUpdateFound(reg) {
    if (!reg) return;
    // 已有 installing worker，直接跟踪（例如 register 时立刻进入 install）
    trackWorker(reg.installing);
    reg.addEventListener('updatefound', function () {
      trackWorker(reg.installing);
    });
  }

  function trackWorker(worker) {
    if (!worker) return;
    worker.addEventListener('statechange', function () {
      // installed 且当前已有 controller → 新旧并存，提示刷新即可激活新版本
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        showUpdateBanner();
      }
    });
  }

  // 保险1：ready promise + 3s 硬超时兜底（避免首次启动 pending 到天荒地老）
  var safetyDone = false;
  var safetyTimer = setTimeout(function () {
    if (safetyDone) return;
    safetyDone = true;
    // ready 超时：直接从 getRegistrations 拿现有 registration
    if (navigator.serviceWorker.getRegistrations) {
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        (regs || []).forEach(wireUpdateFound);
      }).catch(function () {});
    }
  }, 3000);

  navigator.serviceWorker.ready.then(function (reg) {
    if (safetyDone) return;
    clearTimeout(safetyTimer);
    safetyDone = true;
    wireUpdateFound(reg);
  }).catch(function () {
    /* ready 拒绝不算错误，静默忽略 */
  });

  // 保险2：controller 变化（SW claim 之后）也重新尝试绑定
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (navigator.serviceWorker.getRegistration) {
      navigator.serviceWorker.getRegistration().then(wireUpdateFound).catch(function () {});
    }
  });
})();

// ============================================================
// Issue #16：「检查更新」手动入口
// ----------------------------------------------------------------
// 两级检查：
//   1. 外壳更新：reg.update() 发现新 SW → 提示刷新（复用上方横幅）；
//   2. 题库更新：拉取最新 data/manifest.json，比对 rev（loader 持久化于
//      localStorage.bq_manifest_rev）→ 有新版则清空 SW 题库 runtime cache
//      + 触发后台增量刷新（IndexedDB 按 manifest SHA 增量替换）。
// 全程离线安全：任何网络失败都提示"检查失败"，不影响现有功能。
// ============================================================
(function () {
  function _updateToast(text, ms) {
    try {
      var old = document.getElementById('bq-update-toast');
      if (old) old.remove();
      var el = document.createElement('div');
      el.id = 'bq-update-toast';
      el.style.cssText = 'position:fixed;bottom:110px;left:50%;transform:translateX(-50%);' +
        'z-index:99999;background:rgba(26,58,42,0.95);color:#fff;padding:10px 22px;border-radius:14px;' +
        'font-size:0.88rem;box-shadow:0 4px 20px rgba(0,0,0,0.3);max-width:86vw;text-align:center;';
      el.textContent = text;
      document.body.appendChild(el);
      setTimeout(function () { if (el.parentNode) el.remove(); }, ms || 2600);
    } catch (e) {}
  }

  function _sendSwMessage(msg) {
    return new Promise(function (resolve) {
      if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
        resolve(null);
        return;
      }
      var channel = new MessageChannel();
      var settled = false;
      channel.port1.onmessage = function (e) {
        settled = true;
        resolve(e.data || null);
      };
      try {
        navigator.serviceWorker.controller.postMessage(msg, [channel.port2]);
      } catch (err) { resolve(null); return; }
      setTimeout(function () { if (!settled) resolve(null); }, 3000);
    });
  }

  function _fetchFreshManifestRev() {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 6000);
    return fetch('data/manifest.json?v=' + Date.now(), { signal: controller.signal, cache: 'no-store' })
      .then(function (r) {
        clearTimeout(timer);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (mf) {
        clearTimeout(timer);
        return (mf && (mf.rev || mf.updated_at)) ? String(mf.rev || mf.updated_at) : null;
      })
      .catch(function () {
        clearTimeout(timer);
        return null;
      });
  }

  window.checkForAppUpdates = function () {
    var savedRev = null;
    try { savedRev = localStorage.getItem('bq_manifest_rev'); } catch (e) {}

    var swUpdatePromise = ('serviceWorker' in navigator && navigator.serviceWorker.getRegistration)
      ? navigator.serviceWorker.getRegistration().then(function (reg) {
          return reg ? reg.update().then(function () { return reg; }) : null;
        }).catch(function () { return null; })
      : Promise.resolve(null);

    return swUpdatePromise.then(function (reg) {
      var hasNewSw = !!(reg && (reg.waiting || (reg.installing && reg.installing.state === 'installed')));

      return _fetchFreshManifestRev().then(function (freshRev) {
        // 1) 外壳有新 SW → 提示刷新即激活（skipWaiting 已内置）
        if (hasNewSw) {
          _updateToast('发现新版本应用，3 秒后自动刷新…', 3000);
          setTimeout(function () { location.reload(); }, 3000);
          return { shell: true, data: false };
        }

        // 2) 题库 manifest 有新版 → 清 SW 题库缓存 + 后台增量刷新 IndexedDB
        if (freshRev && savedRev && String(freshRev) !== String(savedRev)) {
          _updateToast('题库有更新（v' + freshRev + '），正在同步…');
          return _sendSwMessage({ type: 'PURGE_DATA_CACHE' }).then(function () {
            try { localStorage.setItem('bq_manifest_rev', String(freshRev)); } catch (e) {}
            if (typeof window.clearQuestionCache === 'function') window.clearQuestionCache();
            if (typeof window.maintainQuestionBank === 'function') window.maintainQuestionBank();
            _updateToast('题库已更新到 v' + freshRev + '，刷新页面生效', 3600);
            return { shell: false, data: true };
          });
        }

        // 3) 无更新（或离线检查失败但 SW 正常）
        if (freshRev === null && savedRev === null) {
          _updateToast('检查更新失败，请检查网络');
        } else {
          // 首次检查（本地无版本记录）：落盘基线，供后续比对
          if (freshRev && !savedRev) {
            try { localStorage.setItem('bq_manifest_rev', String(freshRev)); } catch (e) {}
          }
          _updateToast('已是最新版本（题库 v' + (freshRev || savedRev) + '）');
        }
        return { shell: false, data: false };
      });
    });
  };
})();

// ============================================================
// P1-26 修复：beforeinstallprompt — 自定义 PWA 安装引导
// ----------------------------------------------------------------
// 监听 beforeinstallprompt；可安装时在左下角显示自定义安装引导条，
// 替代浏览器默认安装 UI。点击后调用 deferredPrompt.prompt()；
// 安装完成（appinstalled）或用户拒绝/手动关闭后移除，
// 并用 localStorage 记录"已处理"，避免重复打扰。
// 仅 Chromium 系支持 beforeinstallprompt，其余浏览器直接跳过。
// ============================================================
(function () {
  if (!('beforeinstallprompt' in window)) return;

  var INSTALL_STORE_KEY = 'bioquest_a2hs_dismissed';
  var deferredPrompt = null;

  function _wasDismissed() {
    try { return localStorage.getItem(INSTALL_STORE_KEY) === '1'; } catch (e) { return false; }
  }
  function _markDismissed() {
    try { localStorage.setItem(INSTALL_STORE_KEY, '1'); } catch (e) {}
  }
  function _removeInstallBar() {
    var bar = document.getElementById('bq-install-bar');
    if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
  }

  function _showInstallBar() {
    _removeInstallBar();
    if (!document.body || !deferredPrompt) return;

    var bar = document.createElement('div');
    bar.id = 'bq-install-bar';
    bar.setAttribute('role', 'region');   // 非模态横幅，避免误导屏读器认为是对话框
    bar.setAttribute('aria-label', '安装 BioQuest 应用');
    bar.style.cssText = [
      'position:fixed',
      'left:16px',
      'bottom:16px',
      'z-index:99998',
      'max-width:min(340px, 86vw)',
      'background:linear-gradient(135deg,#2c5a3a,#1a3a2a)',
      'color:#fff',
      'padding:12px 16px',
      'border-radius:16px',
      'font-size:0.9rem',
      'line-height:1.5',
      'display:flex',
      'align-items:center',
      'gap:12px',
      'box-shadow:0 6px 24px rgba(0,0,0,0.35)',
      'animation:toastSlideUp 0.3s ease'
    ].join(';');
    bar.appendChild(document.createTextNode('📱 将 BioQuest 添加至主屏幕，随时随地学习'));

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'bq-install-btn';
    btn.textContent = '安装 App';
    btn.style.cssText = 'flex:none;padding:8px 16px;border:none;border-radius:10px;background:#fff;color:#1a3a2a;font-weight:700;cursor:pointer;';
    bar.appendChild(btn);

    var dismissBtn = document.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.textContent = '✕';
    dismissBtn.setAttribute('aria-label', '不再提示');
    dismissBtn.style.cssText = 'flex:none;padding:2px 8px;border:none;background:transparent;color:rgba(255,255,255,0.7);cursor:pointer;font-size:1.1rem;';
    bar.appendChild(dismissBtn);

    var installing = false;
    btn.addEventListener('click', function () {
      if (installing || !deferredPrompt) return;
      installing = true;
      deferredPrompt.prompt();
      deferredPrompt.userChoice
        .then(function (choice) {
          deferredPrompt = null;
          installing = false;
          _markDismissed(); // 接受或拒绝后都不再重复打扰
          _removeInstallBar();
        })
        .catch(function () {
          deferredPrompt = null;
          installing = false;
          _removeInstallBar();
        });
    });
    dismissBtn.addEventListener('click', function () {
      _markDismissed();
      _removeInstallBar();
    });

    document.body.appendChild(bar);
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); // 拦截默认安装提示，统一走自定义引导
    deferredPrompt = e;
    if (_wasDismissed()) return; // 曾安装/拒绝：不再展示
    requestAnimationFrame(function () { _showInstallBar(); });
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    _markDismissed();
    _removeInstallBar();
  });
})();

document.addEventListener('DOMContentLoaded', initApp);

if (document.readyState === 'interactive' || document.readyState === 'complete') {
  setTimeout(initApp, 0);
}