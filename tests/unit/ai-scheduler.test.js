/**
 * @jest-environment jsdom
 *
 * Issue #135（P1-16）回归测试：AI 请求调度器
 * 通过公共 API window.AiClient.chat() 验证：
 *   1. 并发上限：同时在飞请求 ≤ AI_MAX_CONCURRENT(3)，超出排队
 *   2. 速率限制：相邻请求最小启动间隔 600ms（滑动窗口节流）
 *   3. 同指纹去重：相同 endpoint+body 的非流式请求在复用窗口内共享同一 Promise
 *   4. 去重 TTL：复用窗口（5s）过后同指纹请求重新发起
 *   5. 排队超时：等待超过 AI_QUEUE_TIMEOUT_MS(15s) 的排队请求被拒绝
 */
'use strict';

const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const AI_CLIENT_PATH = path.join(ROOT, 'js/ai-client.js');

/** 每个用例重新 require ai-client.js（闭包内调度器状态随之重置；Istanbul 可插桩） */
function freshClient() {
  try { localStorage.clear(); } catch (e) { /* ignore */ }
  window.__bioquest_ai_key_memory__ = 'unit-test-byok-key-000111222';
  jest.resetModules();
  require(AI_CLIENT_PATH);
  return window.AiClient;
}

/** fetch mock：返回手动放行的 deferred（挂起中的真实请求语义） */
function installDeferredFetch() {
  const deferreds = [];
  global.fetch = jest.fn(() => new Promise((resolve) => {
    deferreds.push({
      resolve: () => resolve({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: 'ok-' + deferreds.length } }] })
      })
    });
  }));
  return deferreds;
}

/** 刷新微任务链（fetch→json→resolve→drain→starter 的 promise 链需要多个 tick） */
async function flushAsync(times = 20) {
  for (let i = 0; i < times; i++) await Promise.resolve();
}

/** 用不同内容构造去重指纹互异的 chat 调用 */
function chatOf(Ai, content) {
  return Ai.chat({ messages: [{ role: 'user', content }] });
}

describe('Issue #135：AI 请求调度器（限流 / 并发上限 / 去重）', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  test('并发上限 3 + 最小启动间隔 600ms：第 4 个请求排队等位', async () => {
    const Ai = freshClient();
    const deferreds = installDeferredFetch();

    const pA = chatOf(Ai, 'A');
    const pB = chatOf(Ai, 'B');
    const pC = chatOf(Ai, 'C');
    const pD = chatOf(Ai, 'D');
    await flushAsync();

    // 最小间隔节流：仅首个请求立即启动
    expect(global.fetch).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(610);
    await flushAsync();
    expect(global.fetch).toHaveBeenCalledTimes(2); // B 启动

    jest.advanceTimersByTime(610);
    await flushAsync();
    expect(global.fetch).toHaveBeenCalledTimes(3); // C 启动；并发已满，D 排队
    expect(Ai.schedulerStats().inFlight).toBe(3);
    expect(Ai.schedulerStats().queued).toBe(1);

    // 并发满时即使等待很久也不会有第 4 个请求发出
    jest.advanceTimersByTime(5000);
    await flushAsync();
    expect(global.fetch).toHaveBeenCalledTimes(3);

    // A 完成 → 释放一个并发位；此时距上次启动已超过最小间隔，D 立即补位
    deferreds[0].resolve();
    await flushAsync();
    expect(global.fetch).toHaveBeenCalledTimes(4); // D 补位启动
    expect(Ai.schedulerStats().inFlight).toBe(3);

    // 全部放行 → 所有调用方都能拿到结果（chat 返回 OpenAI 格式 JSON）
    deferreds[1].resolve();
    deferreds[2].resolve();
    deferreds[3].resolve();
    const results = await Promise.all([pA, pB, pC, pD]);
    results.forEach((r) => {
      expect(r.choices[0].message.content).toContain('ok-');
    });
    expect(Ai.schedulerStats().inFlight).toBe(0);
    expect(Ai.schedulerStats().queued).toBe(0);
  });

  test('同指纹去重：相同请求体并发调用只发一次，且共享同一 Promise', async () => {
    const Ai = freshClient();
    const deferreds = installDeferredFetch();

    const messages = [{ role: 'user', content: '线粒体的功能是什么？' }];
    const p1 = Ai.chat({ messages });
    const p2 = Ai.chat({ messages });
    await flushAsync();

    expect(global.fetch).toHaveBeenCalledTimes(1); // 只发一次真实请求
    expect(p2).toBe(p1); // 共享同一 Promise 实例

    deferreds[0].resolve();
    await Promise.all([p1, p2]);
    const data = await p1;
    expect(data.choices[0].message.content).toContain('ok-');
  });

  test('不同指纹不去重：请求体不同则各自发起', async () => {
    const Ai = freshClient();
    installDeferredFetch();

    const p1 = chatOf(Ai, '问题一');
    const p2 = chatOf(Ai, '问题二');
    await flushAsync();

    jest.advanceTimersByTime(610);
    await flushAsync();
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(p2).not.toBe(p1);
  });

  test('去重 TTL：复用窗口（5s）过期后同指纹请求重新发起', async () => {
    const Ai = freshClient();
    const deferreds = installDeferredFetch();

    const messages = [{ role: 'user', content: '同一个问题' }];
    const p1 = Ai.chat({ messages });
    await flushAsync();
    deferreds[0].resolve();
    await p1;

    jest.advanceTimersByTime(5100); // 超过 AI_DEDUP_TTL_MS
    const p2 = Ai.chat({ messages });
    await flushAsync();

    expect(global.fetch).toHaveBeenCalledTimes(2); // 窗口已过 → 重新请求
    deferreds[1].resolve();
    await p2;
  });

  test('排队超时：等待超过 15s 的排队请求被拒绝并让位', async () => {
    const Ai = freshClient();
    const deferreds = installDeferredFetch();

    // 占满 3 个并发位（A 立即启动；B、C 依次过最小间隔启动）
    const pA = chatOf(Ai, 'A');
    const pB = chatOf(Ai, 'B');
    const pC = chatOf(Ai, 'C');
    jest.advanceTimersByTime(610);
    await flushAsync();
    jest.advanceTimersByTime(610);
    await flushAsync();
    expect(Ai.schedulerStats().inFlight).toBe(3);

    // t≈2020：D、E 相继排队（并发已满）
    jest.advanceTimersByTime(800);
    const pD = chatOf(Ai, 'D');
    const pE = chatOf(Ai, 'E');
    await flushAsync();
    expect(Ai.schedulerStats().queued).toBe(2);

    // t≈6020：A 完成 → drain：D（排队约 4s，未超时）补位启动，E 继续排队
    jest.advanceTimersByTime(4000);
    deferreds[0].resolve();
    await flushAsync();
    expect(global.fetch).toHaveBeenCalledTimes(4);

    // t≈19020：E 已排队约 17s（> 15s 上限）。B 完成 → drain：E 被拒绝，不发第 5 个请求
    jest.advanceTimersByTime(13000);
    deferreds[1].resolve();
    await flushAsync();
    expect(global.fetch).toHaveBeenCalledTimes(4);
    await expect(pE).rejects.toThrow('排队超时');

    // 其余请求不受影响，正常完成
    deferreds[2].resolve();
    deferreds[3].resolve();
    await Promise.all([pA, pB, pC, pD]);
    expect(Ai.schedulerStats().queued).toBe(0);
  });

  test('schedulerStats 暴露调度器诊断信息', () => {
    const Ai = freshClient();
    installDeferredFetch();
    const st = Ai.schedulerStats();
    expect(st).toMatchObject({
      inFlight: 0,
      queued: 0,
      dedupEntries: 0,
      maxConcurrent: 3,
      minIntervalMs: 600
    });
  });
});
