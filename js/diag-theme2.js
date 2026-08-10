// 测试 document click handler 是否被触发
const { chromium } = require('playwright');

const BASE = 'http://localhost:8765/';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log(`[console.${msg.type()}] ${msg.text().slice(0,250)}`));
  page.on('pageerror', err => console.log(`[pageerror] ${err.message}`));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // 添加一个 document click listener 看看是否被调用
  const testResult = await page.evaluate(() => {
    const log = [];
    let docClickCount = 0;

    // 在 document 上加新 listener，看 click 是否冒泡到 document
    document.addEventListener('click', function (e) {
      docClickCount++;
      log.push(`document click #${docClickCount}: target=${e.target.tagName}#${e.target.id} class=${e.target.className||''}`);
      log.push(`  closest('#themeToggleMobile'): ${e.target.closest ? !!e.target.closest('#themeToggleMobile') : 'no closest'}`);
    }, true); // capture phase

    // 重置主题
    document.documentElement.setAttribute('data-theme', 'light');
    log.push('初始 data-theme: ' + document.documentElement.getAttribute('data-theme'));

    // 模拟真实的鼠标点击
    const btn = document.getElementById('themeToggleMobile');
    log.push('btn: ' + (btn ? 'found' : 'NOT found'));
    if (btn) {
      log.push('btn.style.pointerEvents: ' + getComputedStyle(btn).pointerEvents);
      // 找到 svg 子元素
      const svg = btn.querySelector('svg');
      log.push('svg: ' + (svg ? 'found' : 'NOT found'));
      if (svg) {
        log.push('svg.style.pointerEvents: ' + getComputedStyle(svg).pointerEvents);
      }

      // 模拟点击 svg（用户实际点击的位置）
      log.push('--- 派发 click 到 svg ---');
      svg.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));

      log.push('--- 派发 click 到 button ---');
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }

    log.push('最终 data-theme: ' + document.documentElement.getAttribute('data-theme'));
    return { log, docClickCount };
  });

  console.log('\n=== 结果 ===');
  console.log(JSON.stringify(testResult, null, 2));

  await browser.close();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
