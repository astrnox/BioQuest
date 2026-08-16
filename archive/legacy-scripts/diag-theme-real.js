// 真实用户路径：先开汉堡，再点主题切换
const { chromium } = require('playwright');
const BASE = 'http://localhost:8765/';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log(`[console.${msg.type()}] ${msg.text().slice(0,200)}`));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const before = await page.evaluate(() => ({
    htmlAttr: document.documentElement.getAttribute('data-theme'),
    bodyBg: getComputedStyle(document.body).backgroundColor
  }));
  console.log('切换前:', JSON.stringify(before));

  // 1. 点击汉堡打开 mobile-nav
  console.log('点击汉堡...');
  await page.locator('#hamburgerBtn').click();
  await page.waitForTimeout(800);
  const mobileNavActive = await page.evaluate(() => document.getElementById('mobileNav').classList.contains('active'));
  console.log('mobileNav.active:', mobileNavActive);

  // 2. 点击主题切换按钮
  console.log('点击主题切换...');
  await page.locator('#themeToggleMobile').click();
  await page.waitForTimeout(1500);

  const after = await page.evaluate(() => ({
    htmlAttr: document.documentElement.getAttribute('data-theme'),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    htmlBg: getComputedStyle(document.documentElement).backgroundColor
  }));
  console.log('切换后:', JSON.stringify(after));

  await page.screenshot({ path: '/workspace/qa-output/screenshots/diag-theme-real.png' });

  await browser.close();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
