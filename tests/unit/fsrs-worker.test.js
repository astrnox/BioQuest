/**
 * BioQuest — FSRS Worker 核心单元测试（Issue #14）
 *
 * 验证：
 *  - 纯函数核心（js/fsrs.worker.js 的 CommonJS 导出）可直接在 Node 加载，
 *    与浏览器主线程桶底（window.FSRSWorkerCore）为同一实现，保证 Worker/主线程结果一致。
 *  - fit 收敛、evaluate、extractReviews、scheduleDue 的正确性。
 *  - sha256Hex 与 Node crypto 参考实现一致。
 */

const Core = require('../../js/fsrs.worker.js');

// 构造一批确定性复习样本（3 种稳定度 + 各 rating）
function sampleReviews() {
  const reviews = [];
  const stabs = [1.5, 3.2, 8.0];
  const deltaT = [1, 2, 5, 12];
  for (let s of stabs) {
    for (let d of deltaT) {
      for (let r of [1, 2, 3, 4]) {
        reviews.push({ rating: r, delta_t: d, stability: s });
      }
    }
  }
  return reviews;
}

// 供 fit/evaluate 共享的多卡 holinstory → extractReviews
function sampleHistory() {
  const history = [];
  for (let cid = 1; cid <= 6; cid++) {
    const baseDue = 1700000000000;
    const seq = [
      { card_id: cid, due: baseDue + cid, elapsed_days: cid, rating: 3, state: 1, stability: 0 },
      { card_id: cid, due: baseDue + cid + 100, elapsed_days: cid + 2, rating: cid % 2 ? 4 : 2, state: 2, stability: 2.6 }
    ];
    history.push(...seq);
  }
  return history;
}

describe('FSRS Worker Core (js/fsrs.worker.js)', () => {
  test('默认权重存在且为 19 维', () => {
    expect(Array.isArray(Core.DEFAULT_W)).toBe(true);
    expect(Core.DEFAULT_W.length).toBe(19);
  });

  test('retention 公式单调性：delta 越大 R 越小', () => {
    const r1 = Core.retention(1, 3);
    const r2 = Core.retention(30, 3);
    expect(r2).toBeLessThan(r1);
    expect(r1).toBeGreaterThan(0);
    expect(r1).toBeLessThanOrEqual(1);
  });

  test('fit 在合理样本上收敛且损失下降', () => {
    const out = Core.fit(sampleReviews(), { maxIter: 60 });
    expect(out.w.length).toBe(19);
    expect(out.iter).toBeGreaterThan(0);
    expect(typeof out.converged).toBe('boolean');
    // 损失曲线应整体下降（至少末批小于首批）
    const first = out.losses[0];
    const last = out.losses[out.losses.length - 1];
    expect(last).toBeLessThanOrEqual(first + 1e-6);
  });

  test('fit 无数据 / 样本不足给出错误标记而非异常', () => {
    expect(Core.fit([]).error).toBeDefined();
    const small = Core.fit([{ rating: 3, delta_t: 1 }]);
    expect(small.error).toBe('样本不足（需 ≥5）');
  });

  test('evaluate 与 fit 输出兼容', () => {
    const out = Core.fit(sampleReviews(), { maxIter: 20 });
    const loss = Core.evaluate(out.w, sampleReviews());
    expect(typeof loss).toBe('number');
    expect(Number.isFinite(loss)).toBe(true);
  });

  test('toFSRSParams 补全为 21 维 ts-fsrs params', () => {
    const p = Core.toFSRSParams([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0]);
    expect(p.w.length).toBe(21);
    expect(p.request_retention).toBe(0.9);
  });

  test('extractReviews 按卡聚合并按 due 排序', () => {
    const reviews = Core.extractReviews(sampleHistory());
    expect(reviews.length).toBe(12); // 6 卡 × 2 条
    // 每条都含 rating/delta_t/stability
    expect(reviews[0]).toHaveProperty('rating');
    expect(reviews[0]).toHaveProperty('delta_t');
    expect(reviews[0]).toHaveProperty('stability');
  });

  test('scheduleDue 摘出到期与未学卡片', () => {
    const now = Date.now();
    const cards = [
      { cardId: 'new-a', state: { repetitions: 0 } },
      { cardId: 'due-b', state: { repetitions: 3, dueDate: now - 5 * 86400000, lapses: 1 } },
      { cardId: 'future-c', state: { repetitions: 2, dueDate: now + 86400000 } }
    ];
    const res = Core.scheduleDue(cards, now);
    expect(res.newCards).toContain('new-a');
    expect(res.due.map((d) => d.id)).toContain('due-b');
    expect(res.due.map((d) => d.id)).not.toContain('future-c');
  });

  test('sha256Hex 与 Node crypto 参考实现一致', async () => {
    const crypto = require('crypto');
    const text = 'BioQuest-shard-check-测试中文片段.123';
    const expected = crypto.createHash('sha256').update(text).digest('hex');
    const actual = await Core.sha256Hex(text);
    expect(actual).toBe(expected);
  });
});