// BioQuest kaplay-games 诊断脚本
const { chromium } = require('playwright');

const BASE = 'http://localhost:8765/';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // 捕获所有 console
  const allLogs = [];
  page.on('console', msg => {
    allLogs.push({ type: msg.type(), text: msg.text(), t: Date.now() });
    console.log(`[console.${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => console.log(`[pageerror] ${err.message}\n${err.stack||''}`));

  console.log('\n=== Step 1: 加载 games 页 ===');
  await page.goto(BASE + '#/games', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const pageState1 = await page.evaluate(() => ({
    hasStartBtn: !!document.getElementById('game-start-btn'),
    hasContainer: !!document.getElementById('game-container'),
    hasTypeSelect: !!document.getElementById('game-type-select'),
    containerHTML: (document.getElementById('game-container') || {}).innerHTML?.slice(0, 200),
    kaplayLoaded: typeof window.kaplay === 'function'
  }));
  console.log('初始状态:', JSON.stringify(pageState1, null, 2));

  console.log('\n=== Step 2: 点击 #game-start-btn ===');
  const startBtn = page.locator('#game-start-btn');
  console.log('startBtn count:', await startBtn.count());
  await startBtn.click();
  console.log('已点击');

  // 轮询 10 秒检查 canvas
  console.log('\n=== Step 3: 轮询 canvas 出现 ===');
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(500);
    const state = await page.evaluate(() => ({
      canvasCount: document.querySelectorAll('#game-container canvas').length,
      containerChildren: document.getElementById('game-container')?.children?.length || 0,
      containerHTML: (document.getElementById('game-container')?.innerHTML || '').slice(0, 300),
      kaplayType: typeof window.kaplay,
      scriptInHead: Array.from(document.querySelectorAll('script')).filter(s => s.src.includes('kaplay.js')).map(s => s.src)
    }));
    console.log(`[${(i+1)*0.5}s] canvas=${state.canvasCount} children=${state.containerChildren} kaplay=${state.kaplayType} scripts=${state.scriptInHead.length}`);
    if (state.containerHTML && state.containerHTML.indexOf('加载') === -1 && state.containerHTML.indexOf('⏳') === -1) {
      console.log('  containerHTML:', state.containerHTML.slice(0, 200));
    }
    if (state.canvasCount > 0) {
      console.log('✓ canvas 出现');
      break;
    }
  }

  console.log('\n=== Step 4: 最终状态 ===');
  const finalState = await page.evaluate(() => ({
    canvasCount: document.querySelectorAll('#game-container canvas').length,
    containerHTML: document.getElementById('game-container')?.innerHTML?.slice(0, 500),
    kaplayGlobal: typeof window.kaplay
  }));
  console.log('final:', JSON.stringify(finalState, null, 2));

  await page.screenshot({ path: '/workspace/qa-output/screenshots/diag-games-final.png' });

  console.log('\n=== 所有 console 日志 ===');
  allLogs.forEach(l => console.log(`[${l.type}] ${l.text}`));

  await browser.close();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
