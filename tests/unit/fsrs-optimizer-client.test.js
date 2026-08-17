/**
 * BioQuest — FSRS 优化器客户端壳单元测试（Issue #14：主线程兜底）
 *
 * 验证 fsrs-optimizer.js（客户端壳）在 Web Worker 不可用的环境（如受限沙箱、
 * 旧浏览器、https 未就绪）下，自动回退到主线程 window.FSRSWorkerCore 同步执行，
 * 且结果与纯函数核心一致（Worker/主线程共用同一实现）。
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const OPT_SRC = path.join(__dirname, '..', '..', 'js', 'fsrs-optimizer.js');
const CORE_SRC = path.join(__dirname, '..', '..', 'js', 'fsrs.worker.js');
const Core = require('../../js/fsrs.worker.js');

function sampleReviews() {
  const reviews = [];
  for (let s of [1.5, 3.2, 8.0]) {
    for (let d of [1, 2, 5, 12]) {
      for (let r of [1, 2, 3, 4]) reviews.push({ rating: r, delta_t: d, stability: s });
    }
  }
  return reviews;
}

// 在沙箱中加载客户端壳；默认不提供 Worker（模拟多线程不可用 → 走主线程兜底）
function loadClient(options) {
  options = options || {};
  const sandbox = {
    window: {
      FSRSWorkerCore: Core,
      FSRSOptimizer: {} // 将由壳覆盖
    },
    console,
    setTimeout,
    clearTimeout,
    Promise,
    // 默认无 Worker/URL → 立即回退主线程
    Worker: options.hasWorker !== false ? defineReadingUndefined : undefined,
    URL: options.hasWorker !== false ? {} : undefined
  };
  function defineReadingUndefined() { return; }
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(OPT_SRC, 'utf8'), sandbox, { filename: 'fsrs-optimizer.js' });
  return sandbox.window.FSRSOptimizer;
}

describe('FSRS 优化器客户端壳 — 主线程兜底（Issue #14）', () => {
  test('Worker 不可用时 fit 同步路径与纯函数核心一致', () => {
    const O = loadClient({ hasWorker: false });
    const direct = Core.fit(sampleReviews(), { maxIter: 30 });
    const viaShell = O.fit(sampleReviews(), { maxIter: 30 });
    expect(viaShell.w).toEqual(direct.w);
    expect(Object.keys(viaShell.w).length).toBe(19);
  });

  test('Worker 不可用时 fitAsync 通过主线程兜底返回 Promise', async () => {
    const O = loadClient({ hasWorker: false });
    const res = await O.fitAsync(sampleReviews(), { maxIter: 20 });
    expect(res.w.length).toBe(19);
    expect(typeof res.iter).toBe('number');
  });

  test('extractReviews / toFSRSParams / retention 可通过壳访问', () => {
    const O = loadClient({ hasWorker: false });
    const history = [
      { card_id: 1, due: 1700, elapsed_days: 1, rating: 3, state: 1, stability: 0 },
      { card_id: 1, due: 1800, elapsed_days: 2, rating: 4, state: 2, stability: 2.6 }
    ];
    expect(O.extractReviews(history).length).toBe(2);
    const p = O.toFSRSParams([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0]);
    expect(p.w.length).toBe(21);
    expect(typeof O.retention(1, 3)).toBe('number');
  });

  test('scheduleDueAsync 通过兜底正常工作', async () => {
    const O = loadClient({ hasWorker: false });
    const now = Date.now();
    const cards = [
      { cardId: 'x', state: { repetitions: 0 } },
      { cardId: 'y', state: { repetitions: 2, dueDate: now - 3 * 86400000, lapses: 0 } }
    ];
    const res = await O.scheduleDueAsync(cards, now);
    expect(res.newCards).toContain('x');
    expect(res.due.length).toBe(1);
  });

  test('兜底同步抛错时仍返回 rejected Promise 而非同步抛出（Issue #14 健壮性）', async () => {
    // 构造「核心已加载但其 sha256Hex 同步抛错」的极端场景：
    // 模拟非安全上下文（crypto.subtle 缺失）时 sha256HexAsync 不允许同步抛异常，
    // 否则会破坏 loader.js 的 `.then().catch()` 链。
    const badCore = {
      sha256Hex() { throw new Error('crypto.subtle 不可用'); }
    };
    const sandbox = {
      window: { FSRSWorkerCore: badCore, FSRSOptimizer: {} },
      console,
      setTimeout,
      clearTimeout,
      Promise,
      Worker: undefined,
      URL: undefined
    };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(OPT_SRC, 'utf8'), sandbox, { filename: 'fsrs-optimizer.js' });
    const O = sandbox.window.FSRSOptimizer;
    // 关键断言：必须返回 Promise 且最终 reject，而不是同步 throw
    const p = O.sha256HexAsync('hello');
    expect(p).toBeInstanceOf(Promise);
    await expect(p).rejects.toThrow(/crypto.subtle/);
  });
});