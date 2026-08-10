// BioQuest 浏览器回归测试 v2 - 含交互场景
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8765/';
const OUT = '/workspace/qa-output';
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(OUT, 'screenshots'), { recursive: true });

const report = { issues: [], summary: {} };

function logIssue(level, page, msg, evidence) {
  const issue = {
    id: `ISSUE-${String(report.issues.length + 1).padStart(3, '0')}`,
    level, page, message: msg, evidence: evidence || null, timestamp: new Date().toISOString()
  };
  report.issues.push(issue);
  console.log(`[${level}] ${issue.id} @ ${page}: ${msg}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push({ text: msg.text(), url: page.url() }); });
  page.on('pageerror', err => pageErrors.push({ msg: err.message, url: page.url() }));

  // === 1. 主题切换深入测试 ===
  console.log('\n=== 1. 主题切换 ===');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const beforeTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || document.documentElement.className || '<no-theme-attr>');
  const beforeBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  console.log('切换前: theme attr =', beforeTheme, ', bg =', beforeBg);

  // 找主题切换按钮
  const themeBtns = await page.locator('#themeToggle, #themeToggleMobile, .theme-toggle').count();
  console.log('主题切换按钮数:', themeBtns);

  // 点击 desktop 主题切换
  const desktopToggle = page.locator('#themeToggle').first();
  if (await desktopToggle.count()) {
    await desktopToggle.click().catch(()=>{});
    await page.waitForTimeout(1000);
    const afterTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || document.documentElement.className || '<no-theme-attr>');
    const afterBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    console.log('切换后: theme attr =', afterTheme, ', bg =', afterBg);
    if (beforeTheme === afterTheme && beforeBg === afterBg) {
      logIssue('P2', 'theme', '点击主题切换后 html data-theme/className 与 body 背景色均未变化');
    }
    await page.screenshot({ path: path.join(OUT, 'screenshots', 'theme-after-toggle.png') });
  }

  // === 2. Sketch 修复验证（关键 P0）===
  console.log('\n=== 2. Sketch 修复验证 ===');
  const beforeErrs = pageErrors.length;
  await page.goto(BASE + '#/sketch', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000); // Excalidraw 加载需要时间
  await page.screenshot({ path: path.join(OUT, 'screenshots', 'sketch-after-fix.png') });

  const excalidrawCount = await page.locator('.excalidraw, [class*="excalidraw"]').count();
  console.log('excalidraw DOM:', excalidrawCount);
  if (excalidrawCount === 0) {
    const newPEs = pageErrors.slice(beforeErrs);
    logIssue('P0', 'sketch', `修复后 excalidraw 仍未注入。新增 JS 异常: ${newPEs.map(e=>e.msg).slice(0,2).join(' | ')}`);
  } else {
    console.log('✓ sketch 修复成功');
  }

  // === 3. Games 交互测试（点击开始游戏）===
  console.log('\n=== 3. Games 启动测试 ===');
  await page.goto(BASE + '#/games', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const startBtn = page.locator('#game-start-btn');
  if (await startBtn.count()) {
    await startBtn.click().catch(()=>{});
    await page.waitForTimeout(3500); // kaplay 加载
    await page.screenshot({ path: path.join(OUT, 'screenshots', 'games-after-start.png') });
    const canvasCount = await page.locator('#game-container canvas').count();
    console.log('点击开始后 canvas 数:', canvasCount);
    if (canvasCount === 0) {
      // 检查错误
      const gameErrs = pageErrors.slice(beforeErrs);
      logIssue('P1', 'games', `点击开始游戏后 canvas 未渲染。JS 异常: ${gameErrs.slice(-2).map(e=>e.msg).join(' | ')}`);
    } else {
      console.log('✓ games canvas 渲染成功');
    }
  } else {
    logIssue('P1', 'games', '开始游戏按钮未找到');
  }

  // === 4. SMILES 交互测试（点击预设分子卡片）===
  console.log('\n=== 4. SMILES 点击预设 ===');
  await page.goto(BASE + '#/smiles', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const smilesCard = page.locator('.smiles-card').first();
  if (await smilesCard.count()) {
    await smilesCard.click().catch(()=>{});
    await page.waitForTimeout(5000); // RDKit WASM 加载需要时间
    await page.screenshot({ path: path.join(OUT, 'screenshots', 'smiles-after-click.png') });
    const svgCount = await page.locator('#smiles-modal-container svg').count();
    console.log('点击预设后 SVG 数:', svgCount);
    if (svgCount === 0) {
      const rdkitErrs = consoleErrors.filter(e => e.url.includes('smiles')).slice(-3);
      logIssue('P1', 'smiles', `点击预设分子后 SVG 未渲染（RDKit WASM 加载可能失败）。console: ${rdkitErrs.map(e=>e.text).join(' | ')}`);
    } else {
      console.log('✓ SMILES SVG 渲染成功');
    }
  }

  // === 5. 自定义 SMILES 输入测试 ===
  console.log('\n=== 5. 自定义 SMILES 输入 ===');
  const smilesInput = page.locator('#smiles-input');
  if (await smilesInput.count()) {
    await smilesInput.fill('CCO');
    await page.locator('#smiles-render-btn').click().catch(()=>{});
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(OUT, 'screenshots', 'smiles-custom.png') });
    const customSvg = await page.locator('#smiles-custom-container svg').count();
    console.log('自定义 SMILES SVG 数:', customSvg);
    if (customSvg === 0) logIssue('P2', 'smiles', '自定义 SMILES 渲染未出现 SVG');
  }

  // === 6. Molecules 路由测试 ===
  console.log('\n=== 6. Molecules 3D 路由 ===');
  await page.goto(BASE + '#/molecules', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, 'screenshots', 'molecules.png') });
  // 检查 molecule-viewer 是否渲染了 3Dmol canvas
  const molCanvas = await page.locator('#page-content canvas').count();
  console.log('molecules canvas 数:', molCanvas);

  // === 7. Community-Enhanced 交互测试 ===
  console.log('\n=== 7. Community-Enhanced ===');
  await page.goto(BASE + '#/community-enhanced', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, 'screenshots', 'community-enhanced.png') });
  const chatWidget = await page.locator('[class*="quikchat"]').count();
  const chatInput = await page.locator('#community-chat input, #community-chat textarea').count();
  console.log('quikchat widget:', chatWidget, 'input:', chatInput);
  // 尝试输入消息
  if (chatInput > 0) {
    const inp = page.locator('#community-chat input, #community-chat textarea').first();
    await inp.fill('测试消息').catch(()=>{});
    await page.keyboard.press('Enter').catch(()=>{});
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT, 'screenshots', 'community-chat-sent.png') });
    const msgCount = await page.locator('#community-chat [class*="message"]').count();
    console.log('发送后消息 DOM 数:', msgCount);
  }

  // === 8. 移动端响应式 ===
  console.log('\n=== 8. 移动端 ===');
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, 'screenshots', 'mobile-home.png') });
  // 找汉堡菜单
  const menuBtnSelectors = ['.mobile-menu-toggle', '#mobileMenuToggle', '[aria-label*="menu" i]', 'button:has-text("菜单")', '.hamburger', 'header button:has(svg)'];
  let menuBtn = null;
  for (const sel of menuBtnSelectors) {
    const c = await page.locator(sel).count();
    if (c > 0) { menuBtn = page.locator(sel).first(); console.log('找到菜单按钮:', sel); break; }
  }
  if (menuBtn) {
    await menuBtn.click().catch(()=>{});
    await page.waitForTimeout(800);
    const mobileNavVisible = await page.locator('.mobile-nav').isVisible().catch(()=> false);
    console.log('mobile-nav 可见:', mobileNavVisible);
    await page.screenshot({ path: path.join(OUT, 'screenshots', 'mobile-nav-open.png') });
    if (!mobileNavVisible) logIssue('P2', 'mobile', '点击汉堡菜单后 mobile-nav 不可见');
  } else {
    console.log('未找到汉堡菜单按钮（首页可能使用其他模式）');
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 5) logIssue('P2', 'mobile', `移动端横向溢出 ${overflow}px`);

  // === 9. UI 一致性深入 ===
  console.log('\n=== 9. UI 一致性 ===');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 按钮配色统一性：随机抽样首页所有按钮
  const btnStyles = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, .btn-primary, .btn-outline, a[data-route]'));
    return btns.slice(0, 15).map(b => {
      const cs = getComputedStyle(b);
      return {
        text: (b.textContent || '').trim().slice(0, 20),
        bg: cs.backgroundColor,
        color: cs.color,
        radius: cs.borderRadius,
        fontFamily: cs.fontFamily.slice(0, 30),
        fontSize: cs.fontSize
      };
    });
  });
  console.log('按钮样式抽样:', JSON.stringify(btnStyles.slice(0, 5), null, 2));
  report.summary.btnStyles = btnStyles;

  // 检查圆角是否一致
  const radii = [...new Set(btnStyles.map(b => b.radius))];
  console.log('按钮圆角种类:', radii);
  if (radii.length > 3) logIssue('P2', 'ui-consistency', `按钮圆角有 ${radii.length} 种取值，可能不统一: ${radii.join(', ')}`);

  // 检查颜色统一性
  const bgs = [...new Set(btnStyles.map(b => b.bg))];
  console.log('按钮背景色种类:', bgs.length);
  report.summary.colorVariety = { radii, btnBgs: bgs };

  // === 10. 总结 ===
  report.summary.consoleErrors = consoleErrors.length;
  report.summary.pageErrors = pageErrors.length;
  report.summary.totalIssues = report.issues.length;
  report.summary.byLevel = report.issues.reduce((acc, i) => { acc[i.level] = (acc[i.level]||0)+1; return acc; }, {});
  fs.writeFileSync(path.join(OUT, 'report-v2.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT, 'console-errors-v2.json'), JSON.stringify(consoleErrors, null, 2));
  fs.writeFileSync(path.join(OUT, 'page-errors-v2.json'), JSON.stringify(pageErrors, null, 2));

  console.log('\n=== 完成 ===');
  console.log('总问题:', report.summary.totalIssues, '按级别:', JSON.stringify(report.summary.byLevel));
  console.log('console.error:', consoleErrors.length, 'JS 异常:', pageErrors.length);
  await browser.close();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
