// Hook window.toggleTheme 看是否被调用
const { chromium } = require('playwright');

const BASE = 'http://localhost:8765/';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log(`[console.${msg.type()}] ${msg.text().slice(0,300)}`));
  page.on('pageerror', err => console.log(`[pageerror] ${err.message}`));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // Hook toggleTheme
  const result = await page.evaluate(() => {
    const log = [];
    let toggleCalls = 0;
    const origToggle = window.toggleTheme;
    window.toggleTheme = function() {
      toggleCalls++;
      log.push(`toggleTheme called (call #${toggleCalls}), args: ${JSON.stringify([].slice.call(arguments))}`);
      log.push('  before: data-theme=' + document.documentElement.getAttribute('data-theme'));
      try {
        const r = origToggle.apply(this, arguments);
        log.push('  after: data-theme=' + document.documentElement.getAttribute('data-theme'));
        log.push('  AppState.theme=' + (window.AppState && window.AppState.theme));
        return r;
      } catch (e) {
        log.push('  ERROR: ' + e.message);
        throw e;
      }
    };

    // 监听 data-theme 属性变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        if (m.type === 'attributes' && m.attributeName === 'data-theme') {
          log.push(`[mutation] data-theme changed: ${m.oldValue} -> ${m.target.getAttribute('data-theme')}`);
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true, attributeOldValue: true });

    // 重置
    document.documentElement.setAttribute('data-theme', 'light');
    log.push('reset to light');

    // 点击 button
    const btn = document.getElementById('themeToggleMobile');
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));

    // 等 100ms 看 mutation
    return new Promise(resolve => {
      setTimeout(() => {
        observer.disconnect();
        log.push(`final data-theme: ${document.documentElement.getAttribute('data-theme')}`);
        log.push(`toggleCalls: ${toggleCalls}`);
        resolve(log);
      }, 200);
    });
  });

  console.log('\n=== 结果 ===');
  result.forEach(l => console.log(l));

  await browser.close();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
