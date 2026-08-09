// BioQuest 浏览器回归测试 + UI 一致性检查
// 使用 Playwright 自动化测试 http://localhost:8765
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8765/';
const OUT = '/workspace/qa-output';
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(OUT, 'screenshots'), { recursive: true });

// 路由清单（含新模块 + 关键老路由）
const ROUTES = [
  { hash: '/', name: 'home', label: '首页' },
  { hash: '/dashboard', name: 'dashboard', label: '仪表盘' },
  { hash: '/practice', name: 'practice', label: '练习' },
  { hash: '/community', name: 'community', label: '社区（老）' },
  { hash: '/community-enhanced', name: 'community-enhanced', label: '社区（增强）' },
  { hash: '/games', name: 'games', label: '互动游戏' },
  { hash: '/sketch', name: 'sketch', label: '画板' },
  { hash: '/smiles', name: 'smiles', label: 'SMILES' },
  { hash: '/molecules', name: 'molecules', label: '3D 分子' },
  { hash: '/bio-lab', name: 'bio-lab', label: '实验室' },
  { hash: '/knowledge-graph', name: 'knowledge-graph', label: '图谱' },
  { hash: '/tutor', name: 'tutor', label: 'AI 对话' },
  { hash: '/wrongbook', name: 'wrongbook', label: '错题录题' },
  { hash: '/user', name: 'user', label: '我的' }
];

const report = { issues: [], pages: [], summary: {} };

function logIssue(level, page, msg, evidence) {
  const issue = {
    id: `ISSUE-${String(report.issues.length + 1).padStart(3, '0')}`,
    level,
    page,
    message: msg,
    evidence: evidence || null,
    timestamp: new Date().toISOString()
  };
  report.issues.push(issue);
  console.log(`[${level}] ${issue.id} @ ${page}: ${msg}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push({ text: msg.text(), url: page.url() });
  });
  page.on('pageerror', err => pageErrors.push({ msg: err.message, stack: err.stack, url: page.url() }));
  page.on('requestfailed', req => failedRequests.push({ url: req.url(), failure: req.failure() }));

  // 1) 加载首页
  console.log('\n=== 1. 加载首页 ===');
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 }).catch(e => {
    logIssue('P0', 'home', `首页加载超时/失败: ${e.message}`);
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, 'screenshots', 'home.png'), fullPage: false });

  const homeTitle = await page.title();
  console.log('首页 title:', homeTitle);
  if (!homeTitle || homeTitle.length < 2) logIssue('P1', 'home', '首页 title 为空或过短');
  const hasMainContent = await page.locator('#page-content').count();
  if (hasMainContent === 0) logIssue('P0', 'home', '#page-content 容器缺失');
  const navLinks = await page.locator('.header-nav a[data-route]').count();
  console.log('header-nav 路由数:', navLinks);
  if (navLinks < 8) logIssue('P1', 'home', `header-nav 路由数 ${navLinks} < 8（导航可能丢失）`);
  for (const r of ['/games', '/sketch', '/smiles', '/molecules']) {
    const exists = await page.locator(`.header-nav a[data-route="${r}"]`).count();
    if (exists === 0) logIssue('P1', 'home', `nav 缺少 ${r} 入口`);
  }

  // 2) 逐个访问路由
  console.log('\n=== 2. 路由逐个访问 ===');
  for (const r of ROUTES) {
    if (r.hash === '/') continue;
    const url = BASE + '#' + r.hash;
    console.log(`\n--- ${r.label} (${r.hash}) ---`);
    const beforeErrs = consoleErrors.length;
    const beforePE = pageErrors.length;
    const beforeFR = failedRequests.length;

    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 }).catch(e => {
      logIssue('P0', r.name, `路由加载失败: ${e.message}`);
    });
    await page.waitForTimeout(2500);

    const screenshotPath = path.join(OUT, 'screenshots', `${r.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    const mainHTML = await page.locator('#page-content').innerHTML().catch(() => '');
    const textLen = mainHTML.replace(/<[^>]+>/g, '').trim().length;
    const hasContent = textLen > 20;

    if (!hasContent) {
      logIssue('P0', r.name, `页面渲染内容过少 (textLen=${textLen})，可能路由未触发或渲染失败`);
    }
    if (/module-error|加载失败|undefined is not|cannot read prop/i.test(mainHTML)) {
      logIssue('P0', r.name, `页面出现错误占位/JS 异常文本: ${mainHTML.slice(0, 200)}`);
    }

    const newErrs = consoleErrors.slice(beforeErrs);
    const newPE = pageErrors.slice(beforePE);
    const newFR = failedRequests.slice(beforeFR);
    if (newErrs.length) {
      logIssue('P1', r.name, `console.error x${newErrs.length}: ${newErrs.slice(0, 3).map(e => e.text).join(' | ').slice(0, 300)}`);
    }
    if (newPE.length) {
      logIssue('P0', r.name, `JS 异常 x${newPE.length}: ${newPE.slice(0, 3).map(e => e.msg).join(' | ').slice(0, 400)}`);
    }
    if (newFR.length) {
      const failedUrls = newFR.map(f => f.url).filter(u => !u.startsWith('https://giscus.app'));
      if (failedUrls.length) {
        logIssue('P1', r.name, `请求失败 x${failedUrls.length}: ${failedUrls.slice(0, 3).join(' | ').slice(0, 300)}`);
      }
    }

    report.pages.push({
      route: r.hash,
      name: r.name,
      label: r.label,
      url,
      textLen,
      consoleErrors: newErrs.length,
      pageErrors: newPE.length,
      failedRequests: newFR.length,
      screenshot: screenshotPath
    });

    if (['games', 'sketch', 'smiles', 'molecules', 'community-enhanced'].includes(r.name)) {
      const btnCount = await page.locator('#page-content button').count();
      const inputCount = await page.locator('#page-content input, #page-content textarea').count();
      const canvasCount = await page.locator('#page-content canvas').count();
      console.log(`  [${r.name}] buttons=${btnCount} inputs=${inputCount} canvas=${canvasCount} textLen=${textLen}`);
      if (btnCount === 0 && inputCount === 0 && canvasCount === 0) {
        logIssue('P1', r.name, '页面无任何交互元素（按钮/输入框/画布），可能渲染失败');
      }
      if (r.name === 'community-enhanced') {
        const chatContainer = await page.locator('#community-chat').count();
        const commentsContainer = await page.locator('#community-comments').count();
        if (chatContainer === 0) logIssue('P1', r.name, '#community-chat 容器未渲染');
        if (commentsContainer === 0) logIssue('P1', r.name, '#community-comments 容器未渲染');
        const chatWidget = await page.locator('.quikchat-widget, [class*="quikchat"]').count();
        console.log(`  [community-enhanced] quikchat widget DOM: ${chatWidget}`);
        if (chatWidget === 0) {
          await page.waitForTimeout(2000);
          const retry = await page.locator('[class*="quikchat"], #community-chat > div').count();
          if (retry === 0) logIssue('P1', r.name, 'quikchat widget DOM 未注入（加载可能失败）');
        }
      }
      if (r.name === 'sketch') {
        const excalidraw = await page.locator('.excalidraw, [class*="excalidraw"]').count();
        console.log(`  [sketch] excalidraw DOM: ${excalidraw}`);
        if (excalidraw === 0) {
          await page.waitForTimeout(2000);
          const retry = await page.locator('.excalidraw, [class*="excalidraw"]').count();
          if (retry === 0) logIssue('P1', r.name, 'excalidraw 未注入 DOM');
        }
      }
      if (r.name === 'games') {
        const kaplayCanvas = await page.locator('#page-content canvas').count();
        console.log(`  [games] canvas: ${kaplayCanvas}`);
        if (kaplayCanvas === 0) logIssue('P1', r.name, 'KAPLAY canvas 未渲染');
      }
      if (r.name === 'smiles' || r.name === 'molecules') {
        const molViewers = await page.locator('#page-content canvas, #page-content [class*="mol"], #page-content [class*="viewer"]').count();
        console.log(`  [${r.name}] mol viewer DOM: ${molViewers}`);
      }
    }
  }

  // 3) UI 一致性检查
  console.log('\n=== 3. UI 一致性检查 ===');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const cssVars = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const result = {};
    const names = ['--color-primary', '--color-deep', '--color-sage', '--color-amber', '--color-accent',
                   '--surface-primary', '--surface-secondary', '--text-primary', '--text-secondary', '--text-muted',
                   '--border-light', '--font-serif', '--font-sans', '--radius-lg', '--radius-md', '--radius-sm'];
    for (const n of names) {
      const v = root.getPropertyValue(n).trim();
      if (v) result[n] = v;
    }
    return result;
  });
  console.log('CSS 变量:', JSON.stringify(cssVars, null, 2));
  report.summary.cssVars = cssVars;

  const missingVars = ['--color-primary', '--color-deep', '--font-serif', '--radius-lg']
    .filter(v => !cssVars[v]);
  if (missingVars.length) logIssue('P1', 'home', `CSS 变量缺失: ${missingVars.join(', ')}`);

  const fontCheck = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const h2 = document.querySelector('h2');
    const p = document.querySelector('p');
    const btn = document.querySelector('button, .btn, a[data-route]');
    const get = el => el ? getComputedStyle(el).fontFamily : null;
    return { h1: get(h1), h2: get(h2), p: get(p), btn: get(btn) };
  });
  console.log('字体:', JSON.stringify(fontCheck));
  report.summary.fonts = fontCheck;

  const radiusCheck = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, .btn, a[data-route]'));
    const cards = Array.from(document.querySelectorAll('[class*="card"], .panel'));
    const sample = (els, n=5) => els.slice(0, n).map(el => ({
      cls: el.className.toString().slice(0, 60),
      radius: getComputedStyle(el).borderRadius
    }));
    return { buttons: sample(buttons), cards: sample(cards) };
  });
  console.log('圆角:', JSON.stringify(radiusCheck, null, 2));
  report.summary.radius = radiusCheck;

  const themeToggle = await page.locator('#themeToggle, .theme-toggle').first();
  if (await themeToggle.count()) {
    const beforeBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await themeToggle.click().catch(() => {});
    await page.waitForTimeout(800);
    const afterBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    console.log(`主题切换: ${beforeBg} -> ${afterBg}`);
    if (beforeBg === afterBg) logIssue('P2', 'home', '主题切换后背景色未变化（可能切换无效或同一颜色）');
    await page.screenshot({ path: path.join(OUT, 'screenshots', 'theme-toggled.png') });
    // 切回去
    await themeToggle.click().catch(() => {});
    await page.waitForTimeout(500);
  } else {
    logIssue('P1', 'home', '主题切换按钮未找到');
  }

  // 4) 移动端响应式检查
  console.log('\n=== 4. 移动端响应式 ===');
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, 'screenshots', 'mobile-home.png') });
  const mobileMenuBtn = await page.locator('[id*="menu"], .mobile-menu-toggle, [aria-label*="menu" i]').first();
  if (await mobileMenuBtn.count()) {
    await mobileMenuBtn.click().catch(() => {});
    await page.waitForTimeout(500);
    const mobileNavVisible = await page.locator('.mobile-nav').isVisible().catch(() => false);
    console.log('移动端汉堡菜单点击后 mobile-nav 可见:', mobileNavVisible);
    if (!mobileNavVisible) logIssue('P2', 'home', '汉堡菜单点击后 mobile-nav 不可见');
    // 检查移动端 nav 也包含新路由
    for (const r of ['/games', '/sketch', '/smiles', '/molecules']) {
      const exists = await page.locator(`.mobile-nav a[data-route="${r}"]`).count();
      if (exists === 0) logIssue('P1', 'home-mobile', `移动端 nav 缺少 ${r} 入口`);
    }
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 5) logIssue('P2', 'home-mobile', `移动端横向溢出 ${overflow}px`);

  // 5) 写报告
  report.summary.consoleErrors = consoleErrors.length;
  report.summary.pageErrors = pageErrors.length;
  report.summary.failedRequests = failedRequests.length;
  report.summary.routeCount = report.pages.length;
  report.summary.totalIssues = report.issues.length;
  report.summary.byLevel = report.issues.reduce((acc, i) => { acc[i.level] = (acc[i.level]||0)+1; return acc; }, {});

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT, 'console-errors.json'), JSON.stringify(consoleErrors, null, 2));
  fs.writeFileSync(path.join(OUT, 'page-errors.json'), JSON.stringify(pageErrors, null, 2));
  fs.writeFileSync(path.join(OUT, 'failed-requests.json'), JSON.stringify(failedRequests, null, 2));

  console.log('\n=== 完成 ===');
  console.log('总问题:', report.summary.totalIssues, '按级别:', JSON.stringify(report.summary.byLevel));
  console.log('console.error:', consoleErrors.length, 'JS 异常:', pageErrors.length, '请求失败:', failedRequests.length);
  console.log('报告目录:', OUT);

  await browser.close();
})().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
