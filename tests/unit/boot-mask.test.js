/**
 * @jest-environment jsdom
 *
 * 首屏骨架遮罩（boot-mask.js）回归测试
 * ----------------------------------------
 * 覆盖本次修复的三个行为：
 *   1. 冷启动慢时进度条不再"卡死在 20%"：未就绪期间按时间缓动爬升，
 *      且显示永远不超过软上限 88（避免"进度走完但页面还没好"的错位感）；
 *   2. app-ready 到达后，进度档位跳到 92 并触发淡出决策（BootProgress 结束）；
 *   3. 兜底超时后若应用脚本根本没启动 / 内容没渲染，展示"刷新重试"
 *      错误界面，而不是淡出成一页空白（遮罩保留在 DOM 中）。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SRC = fs.readFileSync(path.join(ROOT, 'js/core/boot-mask.js'), 'utf8');

function setupBaseDom() {
  document.body.innerHTML =
    '<div id="bq-boot-mask" aria-hidden="true">' +
    '<div id="bq-boot-logo"><svg></svg></div>' +
    '<div id="bq-boot-label">BioQuest</div>' +
    '<div id="bq-boot-spinner"><div class="bq-dna-strand bq-dna-strand--left"><i></i></div></div>' +
    '<div id="bq-boot-progress"><div id="bq-boot-progress-fill"></div></div>' +
    '<div id="bq-boot-percent">0%</div>' +
    '</div>' +
    '<div id="page-content"></div>';
  // 让 boot-mask.js 的"交互/完成"分支立即生效，跳过真实 DOMContentLoaded
  Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
}

function evalBootMask() {
  window.eval(SRC); // IIFE 读取 #bq-boot-mask，然后按 complete 分支立即启动
}

describe('boot-mask.js 首屏遮罩回归', () => {
  afterEach(() => {
    jest.useRealTimers();
    delete window.BootProgress;
    delete window.__bootWeight;
    delete window.__appBooted;
  });

  test('未就绪时进度条按时间缓动，且不超过软上限 88（不卡 20% / 不提前 100%）', () => {
    setupBaseDom();
    window.__appBooted = true; // 应用“已启动”（避免误入错误分支）
    jest.useFakeTimers();
    evalBootMask();

    // DOMContentLoaded 阶段的加权：cap = 20（即复现“卡 20%”的旧起点）
    expect(window.BootProgress.cap).toBe(20);
    const samples = [];
    // 只推进到 8s（早于 15s 兜底），隔离观察“时间缓动”行为本身
    for (let i = 0; i < 8; i++) {
      jest.advanceTimersByTime(1000);
      samples.push(Math.floor(window.BootProgress.show));
    }
    // 1) 进度在持续移动（没有冻结在 20% 附近）
    const max = Math.max(...samples);
    expect(max).toBeGreaterThan(30);
    // 2) 未就绪时绝不超过软上限 88
    expect(max).toBeLessThanOrEqual(88);
    // 3) 没有伪造“加载完成”（不会提前到 100）
    expect(window.BootProgress.show).toBeLessThan(90);
  });

  test('收到 bioquest:app-ready 后进度跳到 92 并触发淡出决策', () => {
    setupBaseDom();
    window.__appBooted = true;
    jest.useFakeTimers();
    evalBootMask();

    window.__bootWeight(15, 55); // 模拟路由渲染完成
    expect(window.BootProgress.cap).toBe(55);

    document.dispatchEvent(new Event('bioquest:app-ready'));
    // 需要越过 500ms 的最短展示时间下限 + bootTick 的 40ms 缓冲
    jest.advanceTimersByTime(800);
    // app-ready → addWeight(40,92)：上限推到 92
    expect(window.BootProgress.cap).toBe(92);
    // 已进入淡出流程（进度引擎结束，后续只做补足渲染）
    expect(window.BootProgress._ended).toBe(true);
  });

  test('应用未启动（脚本加载失败）时兜底展示“刷新重试”，不淡出到空白页', () => {
    setupBaseDom();
    // 注意：不设置 window.__appBooted —— 模拟 app.js 完全没执行
    jest.useFakeTimers();
    evalBootMask();

    // 推进到兜底超时（15s）+ 淡出缓冲
    jest.advanceTimersByTime(16000);

    expect(document.getElementById('bq-boot-mask')).not.toBeNull();
    const maskText = document.getElementById('bq-boot-mask').textContent;
    expect(maskText).toContain('页面加载失败');
    expect(maskText).toContain('刷新重试');
    // 遮罩没有进入 is-ready 淡出
    expect(document.getElementById('bq-boot-mask').classList.contains('is-ready')).toBe(false);
  });

  test('应用已启动且内容渲染后，兜底超时会安全淡出（不误判为失败）', () => {
    setupBaseDom();
    window.__appBooted = true;
    const pc = document.createElement('section');
    pc.textContent = '首页内容已渲染';
    document.getElementById('page-content').appendChild(pc);
    jest.useFakeTimers();
    evalBootMask();

    jest.advanceTimersByTime(16000);

    // 内容存在 → 走淡出路径：绝不出错误重试
    expect(document.body.textContent).not.toContain('页面加载失败');
    expect(document.body.textContent).not.toContain('刷新重试');
  });
});