// 测试 3Dmol download API
const { chromium } = require('playwright');

const BASE = 'http://localhost:8765/';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log(`[console.${msg.type()}] ${msg.text().slice(0,200)}`));
  page.on('pageerror', err => console.log(`[pageerror] ${err.message}`));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // 在浏览器上下文中测试 $3Dmol.download
  const result = await page.evaluate(async () => {
    const log = [];
    if (typeof window.$3Dmol === 'undefined') return { error: 'no $3Dmol' };

    log.push('$3Dmol type: ' + typeof window.$3Dmol);
    log.push('$3Dmol.download type: ' + typeof window.$3Dmol.download);

    // 创建测试容器
    const div = document.createElement('div');
    div.id = 'test-3dmol-container';
    div.style.cssText = 'width:400px;height:300px;position:fixed;top:0;left:0;z-index:9999;';
    document.body.appendChild(div);

    try {
      const viewer = window.$3Dmol.createViewer(div, { backgroundColor: 'white' });
      log.push('viewer created: ' + typeof viewer);
      log.push('viewer.addModel: ' + typeof viewer.addModel);
      log.push('viewer.getModel: ' + typeof viewer.getModel);

      // 测试 download with callback
      const dlResult = await new Promise((resolve) => {
        let resolved = false;
        const done = (val) => { if (!resolved) { resolved = true; resolve(val); } };
        try {
          const r = window.$3Dmol.download('pdb:1BNA', viewer, {}, function() {
            log.push('download callback called');
            try {
              const m = viewer.getModel();
              log.push('model: ' + typeof m);
              if (m) {
                log.push('keys: ' + Object.keys(m).slice(0, 30).join(','));
                log.push('m.atoms: ' + (Array.isArray(m.atoms) ? 'array[' + m.atoms.length + ']' : typeof m.atoms));
                log.push('m.atomCount: ' + typeof m.atomCount + (typeof m.atomCount === 'function' ? '()='+m.atomCount() : '='+m.atomCount));
                log.push('m.numAtoms: ' + typeof m.numAtoms);
                log.push('m.selectedAtoms: ' + typeof m.selectedAtoms);
                if (typeof m.selectedAtoms === 'function') {
                  try {
                    const sel = m.selectedAtoms({});
                    log.push('selectedAtoms({}): ' + (Array.isArray(sel) ? 'array['+sel.length+']' : typeof sel));
                  } catch(e) { log.push('selectedAtoms err: ' + e.message); }
                }
              }
              done('callback');
            } catch(e) { log.push('callback err: ' + e.message); done('callback-err'); }
          });
          log.push('download returned: ' + typeof r);
          if (r && typeof r.then === 'function') {
            log.push('download returned Promise');
            r.then(function(m) {
              log.push('promise resolved with model: ' + typeof m);
              done('promise');
            }).catch(function(e) {
              log.push('promise err: ' + e.message);
              done('promise-err');
            });
          }
          setTimeout(() => done('timeout-10s'), 10000);
        } catch (e) {
          log.push('download threw: ' + e.message);
          done('threw');
        }
      });
      log.push('result: ' + dlResult);
    } catch (e) {
      log.push('outer err: ' + e.message);
    }

    return { log, containerHTML: div.innerHTML.slice(0, 500), canvasCount: div.querySelectorAll('canvas').length };
  });

  console.log('\n=== 测试结果 ===');
  console.log(JSON.stringify(result, null, 2));

  await browser.close();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
