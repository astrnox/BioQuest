/**
 * @jest-environment jsdom
 *
 * Issue #15 回归测试：题库分发 jsDelivr CDN + 版本化 URL + 三级回退
 * 验证：
 *   1. manifest 携带 git/repo 锚点 → 分片走 jsDelivr 版本化 URL（CDN 命中）
 *   2. CDN 不可达 → 自动回退同源直连（应用不挂）
 *   3. CDN 内容陈旧（SHA-256 与 manifest 不符）→ 降级同源拉取
 *   4. CDN 连续 3 次不可达 → 会话级禁用（后续直接同源）
 *   5. manifest 无 git/repo（本地开发/fork 无锚点）→ 完全同源，不发 CDN 请求
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const LOADER_SRC = fs.readFileSync(path.join(ROOT, 'js/loader.js'), 'utf8');

const SHA_EXPECTED = 'a'.repeat(64);
const SHARD_TEXT = JSON.stringify({
  'BQ-cell-aabbccddeeff0011': {
    question: '细胞膜的主要成分是什么？',
    subQuestions: [
      { label: 'A', text: '磷脂', answer: true },
      { label: 'B', text: '纤维素', answer: false }
    ],
    explanation: '细胞膜主要由磷脂双分子层构成。',
    difficulty: 'easy'
  }
});

function makeManifest(extra) {
  const base = {
    rev: 9,
    updated_at: '2026-08-17',
    sources: [{ tag: 'cell', count: 1 }],
    modules: { module1: ['cell'] },
    files: { 'bank/cell.json': SHA_EXPECTED }
  };
  return Object.assign(base, extra || {});
}

function textResponse(text) {
  return { ok: true, status: 200, text: async () => text, json: async () => JSON.parse(text) };
}
function notFound() {
  return { ok: false, status: 404, text: async () => '', json: async () => null };
}

let fetchCalls = [];
/** 安装 fetch mock；mode: cdn-ok | cdn-fail | cdn-stale */
function installFetch(manifest, mode) {
  fetchCalls = [];
  global.fetch = jest.fn(async (url) => {
    const u = String(url);
    fetchCalls.push(u);
    if (u.indexOf('data/manifest.json') === 0) return textResponse(JSON.stringify(manifest));
    if (u.indexOf('https://cdn.jsdelivr.net/gh/') === 0) {
      if (mode === 'cdn-fail') throw new TypeError('network unreachable');
      if (mode === 'cdn-stale' && u.indexOf('/data/bank/') !== -1) {
        return textResponse(JSON.stringify({ 'BQ-cell-old': { question: '旧版本', subQuestions: [] } }));
      }
      return textResponse(u.indexOf('bioid-map') !== -1 ? '{}' : SHARD_TEXT);
    }
    if (/^data\/bank\/[\w-]+\.json$/.test(u)) return textResponse(SHARD_TEXT);
    if (u === 'data/bioid-map.json') return textResponse('{}');
    return notFound();
  });
}

/**
 * 每个用例全新执行 loader.js（内部闭包状态/manifest 缓存随之重置，
 * window.* 导出会被覆盖；与浏览器「新会话首载」语义一致）。
 * 返回真实的 maintainQuestionBank 引用（loader 自触发的后台维护已替换为 stub）。
 */
function freshLoader() {
  // eslint-disable-next-line no-eval
  (0, eval)(LOADER_SRC);
  const realMaintain = window.maintainQuestionBank;
  window.maintainQuestionBank = function () { return Promise.resolve(null); };
  // 控制 SHA-256 计算（jsdom 无 crypto.subtle 时返回 null 会跳过校验）
  window.FSRSOptimizer = {
    sha256HexAsync: async (text) => (text === SHARD_TEXT ? SHA_EXPECTED : 'f'.repeat(64))
  };
  return realMaintain;
}

const CDN_PREFIX = 'https://cdn.jsdelivr.net/gh/';

describe('Issue #15：CDN 分发与回退', () => {
  test('manifest 带 git/repo 锚点 → bank 分片走 jsDelivr 版本化 URL', async () => {
    freshLoader();
    installFetch(makeManifest({ git: '0f1e2d3c4b5a697887966554433221100fffeedd', repo: 'astrnox/BioQuest' }), 'cdn-ok');
    const items = await window.loadAllShards();
    expect(items.length).toBe(1);
    expect(items[0].question).toContain('细胞膜');
    // 命中 CDN 版本化 URL（commit 锚定）
    const cdnBank = fetchCalls.filter((u) =>
      u.indexOf(CDN_PREFIX + 'astrnox/BioQuest@0f1e2d3c4b5a697887966554433221100fffeedd/data/bank/cell.json') === 0);
    expect(cdnBank.length).toBe(1);
    // 未回退同源
    expect(fetchCalls).not.toContain('data/bank/cell.json');
  });

  test('CDN 不可达 → 自动回退同源直连，功能不挂', async () => {
    freshLoader();
    installFetch(makeManifest({ rev: 10, git: 'abc123def4567890abc123def4567890abcdef12', repo: 'astrnox/BioQuest' }), 'cdn-fail');
    const items = await window.loadAllShards();
    expect(items.length).toBe(1);
    expect(fetchCalls).toContain('data/bank/cell.json');
    expect(window.BioQuestCDN.isEnabled()).toBe(true); // 未达阈值仍启用
  });

  test('CDN 内容陈旧（SHA 不符）→ 降级同源拉取最新版', async () => {
    freshLoader();
    installFetch(makeManifest({ rev: 11, git: '1111111111111111111111111111111111111111', repo: 'astrnox/BioQuest' }), 'cdn-stale');
    const items = await window.loadAllShards();
    // 最终拿到的是同源最新内容（含"细胞膜"题），而非陈旧内容
    expect(items.length).toBe(1);
    expect(items[0].question).toContain('细胞膜');
    expect(fetchCalls.some((u) => u.indexOf(CDN_PREFIX) === 0 && u.indexOf('/data/bank/cell.json') !== -1)).toBe(true);
    expect(fetchCalls).toContain('data/bank/cell.json');
  });

  test('manifest 无 git/repo 锚点 → 不发任何 CDN 请求（同源直连）', async () => {
    freshLoader();
    installFetch(makeManifest({ rev: 12 }), 'cdn-ok');
    const items = await window.loadAllShards();
    expect(items.length).toBe(1);
    expect(fetchCalls.filter((u) => u.indexOf(CDN_PREFIX) === 0).length).toBe(0);
    expect(fetchCalls).toContain('data/bank/cell.json');
  });

  test('非法 git/repo 字段（注入尝试）→ 拒绝启用 CDN', async () => {
    freshLoader();
    installFetch(makeManifest({ rev: 14, git: 'evil; rm -rf /', repo: '../../etc/passwd' }), 'cdn-ok');
    await window.loadAllShards();
    expect(fetchCalls.filter((u) => u.indexOf(CDN_PREFIX) === 0).length).toBe(0);
  });
});

describe('Issue #15：会话级 kill-switch', () => {
  test('CDN 连续 3 次不可达后，后续分片直接走同源', async () => {
    const realMaintain = freshLoader();
    const manifest = makeManifest({
      rev: 13, git: '2222222222222222222222222222222222222222', repo: 'astrnox/BioQuest'
    });
    // 4 个 bank 分片；后台维护按 tag 串行加载（真实串行路径，验证 kill-switch 时序）
    manifest.sources = [
      { tag: 'cell', count: 1 }, { tag: 'enzyme', count: 1 },
      { tag: 'virus', count: 1 }, { tag: 'mendel', count: 1 }
    ];
    manifest.files = {
      'bank/cell.json': SHA_EXPECTED, 'bank/enzyme.json': SHA_EXPECTED,
      'bank/virus.json': SHA_EXPECTED, 'bank/mendel.json': SHA_EXPECTED
    };
    installFetch(manifest, 'cdn-fail');

    const result = await realMaintain();
    expect(result).not.toBeNull();
    // 串行第 4 个分片不再尝试 CDN（连续 3 次失败后被禁用）
    const cdnCalls = fetchCalls.filter((u) => u.indexOf(CDN_PREFIX) === 0);
    expect(cdnCalls.length).toBe(3);
    // 全部 4 个分片最终由同源拿到
    ['cell', 'enzyme', 'virus', 'mendel'].forEach((t) => {
      expect(fetchCalls).toContain('data/bank/' + t + '.json');
    });
  }, 15000);
});
