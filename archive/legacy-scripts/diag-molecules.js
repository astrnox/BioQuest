// BioQuest molecules 3D 诊断脚本
const { chromium } = require('playwright');

const BASE = 'http://localhost:8765/';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const allLogs = [];
  page.on('console', msg => {
    allLogs.push({ type: msg.type(), text: msg.text() });
    if (msg.type() !== 'warning') console.log(`[console.${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => console.log(`[pageerror] ${err.message}\n${err.stack||''}`));
  page.on('requestfailed', req => {
    if (!req.url().includes('fonts') && !req.url().includes('sw.js')) {
      console.log(`[req-failed] ${req.url()} - ${req.failure()?.errorText}`);
    }
  });

  console.log('=== Step 1: 加载 molecules 页 ===');
  await page.goto(BASE + '#/molecules', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const state1 = await page.evaluate(() => ({
    has3Dmol: typeof window.$3Dmol,
    cardCount: document.querySelectorAll('.molecule-card').length,
    hasModal: !!document.getElementById('molecule-viewer-modal'),
    hasContainer: !!document.getElementById('molecule-3d-container')
  }));
  console.log('初始:', JSON.stringify(state1, null, 2));

  console.log('\n=== Step 2: 点击 .molecule-card ===');
  const card = page.locator('.molecule-card').first();
  await card.click();
  await page.waitForTimeout(1500);

  const state2 = await page.evaluate(() => ({
    modalDisplay: getComputedStyle(document.getElementById('molecule-viewer-modal')).display,
    containerHTML: document.getElementById('molecule-3d-container')?.innerHTML?.slice(0, 300),
    containerChildCount: document.getElementById('molecule-3d-container')?.children?.length,
    canvasCount: document.querySelectorAll('#molecule-3d-container canvas').length
  }));
  console.log('点击后 modal/container:', JSON.stringify(state2, null, 2));

  console.log('\n=== Step 3: 轮询 canvas 出现 ===');
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(500);
    const state = await page.evaluate(() => ({
      canvasCount: document.querySelectorAll('#molecule-3d-container canvas').length,
      containerHTML: document.getElementById('molecule-3d-container')?.innerHTML?.slice(0, 200),
      childCount: document.getElementById('molecule-3d-container')?.children?.length
    }));
    console.log(`[${(i+1)*0.5}s] canvas=${state.canvasCount} children=${state.childCount}`);
    if (state.canvasCount > 0) { console.log('✓ canvas 出现'); break; }
  }

  await page.screenshot({ path: '/workspace/qa-output/screenshots/diag-molecules-final.png' });

  console.log('\n=== 所有 console 日志 ===');
  allLogs.forEach(l => console.log(`[${l.type}] ${l.text.slice(0, 200)}`));

  await browser.close();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
