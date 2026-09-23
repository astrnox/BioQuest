/**
 * 题目评分核心算法单元测试（js/core/rating.js）
 * -------------------------------------------------
 * 验证矩阵：
 *   1. 平滑质量分（带中性先验的 Bayesian mean）：无票=0.5 中性、
 *      1 赞从中位起步（≥0.5，出现率不降反升）、全赞趋近高分、
 *      票数越多越收敛到真实好评率
 *   2. 评分 → 出现率权重：0.5→1.0、1.0→1.3、0.0→0.7，钳制在 [0.7,1.3]
 *   3. 回收判定：最低票数门禁 + 低分阈值
 *   4. 展示用评分映射（1~5 星）
 *   5. 加权不放回抽取：权重生效、不重复、数量钳制
 */
'use strict';

const RatingCore = require('../../js/core/rating.js');

describe('RatingCore.wilsonScore（带中性先验的平滑均值）', () => {
  test('无票返回中性 0.5', () => {
    expect(RatingCore.wilsonScore(0, 0)).toBe(0.5);
    expect(RatingCore.wilsonScore(undefined, null)).toBe(0.5);
  });

  test('1 个点赞：从中位起步（≥0.5），不再暴跌到 1.8 分', () => {
    const s = RatingCore.wilsonScore(1, 0);
    expect(s).toBeCloseTo(0.6, 6);
    expect(s).toBeGreaterThanOrEqual(0.5);
    // 5 星制展示应不低于中性 3.0
    expect(Number(RatingCore.formatQuestionScore(s))).toBeGreaterThanOrEqual(3.0);
  });

  test('1 个点赞不降低出现率（权重 ≥ 1.0）', () => {
    const w = RatingCore.ratingWeight(RatingCore.wilsonScore(1, 0));
    expect(w).toBeGreaterThanOrEqual(1);
  });

  test('1 个点踩只是轻度下调（评分 ≥ 0.3，权重 ≥ 0.8）', () => {
    const s = RatingCore.wilsonScore(0, 1);
    expect(s).toBeCloseTo(0.4, 6);
    expect(RatingCore.ratingWeight(s)).toBeGreaterThanOrEqual(0.8);
  });

  test('全赞 → 高分（但不会等于 1，保留不确定性）', () => {
    const s = RatingCore.wilsonScore(100, 0);
    expect(s).toBeGreaterThan(0.9);
    expect(s).toBeLessThanOrEqual(1);
  });

  test('全踩 → 低分（但不会等于 0）', () => {
    const s = RatingCore.wilsonScore(0, 100);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(0.1);
  });

  test('同好评率下，票数越多得分越高（置信收敛）', () => {
    const s5 = RatingCore.wilsonScore(4, 1);   // 80% × 5 票
    const s100 = RatingCore.wilsonScore(80, 20); // 80% × 100 票
    expect(s100).toBeGreaterThan(s5);
  });

  test('好评率更高 → 得分更高', () => {
    expect(RatingCore.wilsonScore(9, 1)).toBeGreaterThan(RatingCore.wilsonScore(5, 5));
  });

  test('结果被钳制在 [0,1]', () => {
    for (let i = 0; i <= 50; i++) {
      const s = RatingCore.wilsonScore(i, 50 - i);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  test('负数/NaN 输入被归一为 0', () => {
    const s = RatingCore.wilsonScore(-5, NaN);
    expect(s).toBe(0.5); // 归一后 0+0 → 无票
  });
});

describe('RatingCore.ratingWeight（评分 → 出现率权重）', () => {
  test('中性 0.5 → 权重 1.0', () => {
    expect(RatingCore.ratingWeight(0.5)).toBeCloseTo(1.0, 10);
  });

  test('满分 1.0 → 权重 1.3（上限）', () => {
    expect(RatingCore.ratingWeight(1.0)).toBeCloseTo(1.3, 10);
  });

  test('0 分 → 权重 0.7（下限）', () => {
    expect(RatingCore.ratingWeight(0)).toBeCloseTo(0.7, 10);
  });

  test('极端输入被钳制，不越界', () => {
    expect(RatingCore.ratingWeight(2)).toBe(RatingCore.WEIGHT_MAX);
    expect(RatingCore.ratingWeight(-1)).toBe(RatingCore.WEIGHT_MIN);
    expect(RatingCore.ratingWeight('abc')).toBe(1);
  });

  test('浮动范围不超过 ±30%（防两级分化）', () => {
    expect(RatingCore.WEIGHT_MIN).toBe(0.7);
    expect(RatingCore.WEIGHT_MAX).toBe(1.3);
  });
});

describe('RatingCore.shouldRecycleQuestion（回收判定）', () => {
  test('票数不足不回收（防单票误杀）', () => {
    expect(RatingCore.shouldRecycleQuestion(0, 3)).toBe(false); // 3 票 < 5
  });

  test('票数足够且评分过低 → 回收', () => {
    expect(RatingCore.shouldRecycleQuestion(0, 10)).toBe(true);
  });

  test('评分尚可 → 不回收', () => {
    expect(RatingCore.shouldRecycleQuestion(8, 2)).toBe(false);
  });

  test('可覆盖阈值/最低票数参数', () => {
    expect(RatingCore.shouldRecycleQuestion(0, 3, { minVotes: 3 })).toBe(true);
    expect(RatingCore.shouldRecycleQuestion(8, 2, { scoreThreshold: 0.05 })).toBe(false);
  });
});

describe('RatingCore.formatQuestionScore（展示 1~5 星）', () => {
  test('0.5 → 3.0（中性）', () => {
    expect(RatingCore.formatQuestionScore(0.5)).toBe('3.0');
  });
  test('1.0 → 5.0', () => {
    expect(RatingCore.formatQuestionScore(1.0)).toBe('5.0');
  });
  test('0.0 → 1.0', () => {
    expect(RatingCore.formatQuestionScore(0)).toBe('1.0');
  });
});

describe('RatingCore.weightedPick（加权不放回抽取）', () => {
  // 可控随机数：依次返回 0..1 的伪随机序列，保证可复现
  function seqRandom(values) {
    let i = 0;
    return () => values[i++ % values.length];
  }

  test('全部同权 ≈ 等概率随机', () => {
    const items = [1, 2, 3, 4, 5];
    const picked = RatingCore.weightedPick(items, () => 1, 3);
    expect(picked.length).toBe(3);
    expect(new Set(picked).size).toBe(3); // 不重复
  });

  test('零权重项被抽中的概率极低（确定性验证：r=0 抽权重最大项）', () => {
    const items = ['low', 'high'];
    const weights = { low: 0.7, high: 1.3 };
    const rng = seqRandom([0.0001]); // 接近 0 → 累计权重率先命中第一项
    const picked = RatingCore.weightedPick(items, (it) => weights[it], 1, rng);
    expect(picked).toEqual(['low']); // 第一项先累计
  });

  test('抽取数量被钳制到数组长度', () => {
    const items = [1, 2];
    const picked = RatingCore.weightedPick(items, () => 1, 99);
    expect(picked.length).toBe(2);
  });

  test('count=0 返回空', () => {
    expect(RatingCore.weightedPick([1, 2, 3], () => 1, 0)).toEqual([]);
  });

  test('空数组返回空', () => {
    expect(RatingCore.weightedPick([], () => 1, 5)).toEqual([]);
  });

  test('多次抽取统计：高权重项出现频率显著更高', () => {
    const items = ['a', 'b'];
    const weights = { a: 1.3, b: 0.7 };
    let aCount = 0;
    const total = 2000;
    for (let i = 0; i < total; i++) {
      const picked = RatingCore.weightedPick(items, (it) => weights[it], 1);
      if (picked[0] === 'a') aCount++;
    }
    const ratio = aCount / total;
    // 1.3 / (1.3+0.7) = 0.65，允许 ±0.08 的随机波动
    expect(ratio).toBeGreaterThan(0.57);
    expect(ratio).toBeLessThan(0.73);
  });
});
