// 测试 toggleTheme 是否正常工作
const { chromium } = require('playwright');

const BASE = 'http://localhost:8765/';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log(`[console.${msg.type()}] ${msg.text().slice(0,200)}`));
  page.on('pageerror', err => console.log(`[pageerror] ${err.message}`));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const before = await page.evaluate(() => ({
    htmlAttr: document.documentElement.getAttribute('data-theme'),
    toggleType: typeof window.toggleTheme,
    hasMobileBtn: !!document.getElementById('themeToggleMobile'),
    mobileNavDisplay: getComputedStyle(document.getElementById('mobileNav')).display,
    mobileNavActive: document.getElementById('mobileNav').classList.contains('active')
  }));
  console.log('before:', JSON.stringify(before, null, 2));

  // 直接调用 toggleTheme()
  console.log('\n直接调用 window.toggleTheme()...');
  const result1 = await page.evaluate(() => {
    try {
      window.toggleTheme();
      return { ok: true, themeAfter: document.documentElement.getAttribute('data-theme') };
    } catch (e) { return { ok: false, err: e.message }; }
  });
  console.log('直接调用结果:', JSON.stringify(result1, null, 2));

  // 现在测试点击事件
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await page.waitForTimeout(500);
  console.log('\n重置为 light，现在测试点击事件...');

  // 滚动到按钮位置
  const btn = page.locator('#themeToggleMobile');
  await btn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const btnPos = await btn.boundingBox();
  console.log('scrollIntoView 后按钮位置:', btnPos);

  // 派发真实的点击事件
  await page.evaluate(() => {
    const btn = document.getElementById('themeToggleMobile');
    if (btn) {
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }
  });
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => ({
    htmlAttr: document.documentElement.getAttribute('data-theme'),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    saveSetting: typeof window.saveSetting
  }));
  console.log('派发 click 后:', JSON.stringify(after, null, 2));

  await page.screenshot({ path: '/workspace/qa-output/screenshots/diag-theme-direct.png' });

  await browser.close();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
