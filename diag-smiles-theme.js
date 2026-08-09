// 诊断：自定义 SMILES 渲染 + 主题切换
const { chromium } = require('playwright');

const BASE = 'http://localhost:8765/';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() !== 'warning' && msg.type() !== 'log') console.log(`[console.${msg.type()}] ${msg.text().slice(0,250)}`);
  });
  page.on('pageerror', err => console.log(`[pageerror] ${err.message}`));

  console.log('=== 自定义 SMILES 诊断 ===');
  await page.goto(BASE + '#/smiles', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // 先点击预设分子（加载 RDKit WASM）
  console.log('先点击预设加载 RDKit...');
  const card = page.locator('.smiles-card').first();
  await card.click();
  await page.waitForTimeout(6000);
  const presetSvg = await page.locator('#smiles-modal-container svg').count();
  console.log('预设 SVG 数:', presetSvg);

  // 关闭 modal
  const closeBtn = page.locator('#smiles-close-btn');
  if (await closeBtn.count()) {
    await closeBtn.click();
    await page.waitForTimeout(500);
  }

  // 现在输入自定义 SMILES（RDKit 已加载）
  console.log('输入自定义 CCO...');
  const input = page.locator('#smiles-input');
  console.log('input count:', await input.count());
  await input.fill('CCO');
  await page.locator('#smiles-render-btn').click();
  await page.waitForTimeout(3000);

  const customState = await page.evaluate(() => ({
    customContainerHTML: document.getElementById('smiles-custom-container')?.innerHTML?.slice(0, 300),
    customSvgCount: document.querySelectorAll('#smiles-custom-container svg').length,
    rdkitReady: typeof window.RDKitViewer !== 'undefined' && window.RDKitViewer.isReady && window.RDKitViewer.isReady()
  }));
  console.log('自定义状态:', JSON.stringify(customState, null, 2));

  console.log('\n=== 主题切换诊断 ===');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const before = await page.evaluate(() => ({
    htmlAttr: document.documentElement.getAttribute('data-theme'),
    htmlClass: document.documentElement.className,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    themeToggleCount: document.querySelectorAll('#themeToggle, #themeToggleMobile, .theme-toggle').length,
    hasThemeToggleDesktop: !!document.getElementById('themeToggle'),
    hasThemeToggleMobile: !!document.getElementById('themeToggleMobile'),
    isMobileNavVisible: getComputedStyle(document.getElementById('mobileNav')).display !== 'none'
  }));
  console.log('切换前:', JSON.stringify(before, null, 2));

  // 找到 #themeToggleMobile 并点击
  const mobileBtn = page.locator('#themeToggleMobile');
  if (await mobileBtn.count()) {
    // 是否在 mobileNav 内（display:none 时不可点击）
    const btnBox = await mobileBtn.boundingBox();
    const visible = await mobileBtn.isVisible();
    console.log('themeToggleMobile 可见:', visible, '位置:', btnBox);

    if (!visible) {
      // 需要先打开 mobileNav
      const ham = page.locator('#hamburgerBtn');
      console.log('hamburger count:', await ham.count());
      if (await ham.count()) {
        await ham.click();
        await page.waitForTimeout(500);
        console.log('点击汉堡后 mobileNav 可见:', await page.locator('#mobileNav').isVisible());
      }
    }

    await mobileBtn.click({ force: true });
    await page.waitForTimeout(1500);
    const after = await page.evaluate(() => ({
      htmlAttr: document.documentElement.getAttribute('data-theme'),
      htmlClass: document.documentElement.className,
      bodyBg: getComputedStyle(document.body).backgroundColor
    }));
    console.log('切换后:', JSON.stringify(after, null, 2));
  } else {
    console.log('#themeToggleMobile 不存在！');
  }

  await browser.close();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
