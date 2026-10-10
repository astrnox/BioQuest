/**
 * @jest-environment jsdom
 *
 * 首屏骨架遮罩（boot-mask.js）回归测试
 * ----------------------------------------
 * 加载动画本身是纯 CSS 的碱基配对（见 index.html 内联样式），boot-mask.js
 * 只负责"何时撤除遮罩"。覆盖以下行为：
 *   1. 应用未就绪时不淡出：遮罩保持显示，加载动画（碱基配对）挂在 DOM 中；
 *   2. 收到 bioquest:app-ready 且首屏已渲染 → 平滑淡出（is-ready）并最终移除；
 *   3. 兜底超时后若应用脚本根本没启动 → 展示"刷新重试"错误界面，而不是淡出成空白页；
 *   4. 应用已启动且内容已渲染 → 兜底超时安全淡出，不误判为失败；
 *   5. 竞态恢复：15s 兜底已展示错误页，但应用晚到加载完成 → 撤销错误页正常淡出。
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
    '<div id="bq-boot-label">TATABOX</div>' +
    '<div id="bq-boot-pairs" aria-hidden="true">' +
    '<div class="bq-pair bq-pair--r1"><span class="bq-base">A</span>' +
    '<span class="bq-hb"><i></i><i></i></span><span class="bq-base">T</span></div>' +
    '</div>' +
    '</div>' +
    '<div id="page-content"></div>';
  // 让 boot-mask.js 的"交互/完成"分支立即生效，跳过真实 DOMContentLoaded
  Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
}

function evalBootMask() {
  window.eval(SRC); // IIFE 读取 #bq-boot-mask，然后按 complete 分支立即启动
}

/** 页面内容已渲染：往 #page-content 塞一个子节点 */
function renderContent() {
  const pc = document.getElementById('page-content');
  const section = document.createElement('section');
  section.textContent = '首页内容已渲染';
  pc.appendChild(section);
}

function maskEl() {
  return document.getElementById('bq-boot-mask');
}

describe('boot-mask.js 首屏遮罩回归', () => {
  afterEach(() => {
    jest.useRealTimers();
    delete window.__appBooted;
  });

  test('应用未就绪时不淡出：遮罩保持显示，碱基配对加载动画在 DOM 中', () => {
    setupBaseDom();
    window.__appBooted = true; // 应用“已启动”，但尚未派发 app-ready
    jest.useFakeTimers();
    evalBootMask();

    // 推进到 8s（早于 15s 兜底）：未就绪期间不得提前淡出
    jest.advanceTimersByTime(8000);

    const mask = maskEl();
    expect(mask).not.toBeNull();
    expect(mask.classList.contains('is-ready')).toBe(false);
    expect(document.getElementById('bq-boot-pairs')).not.toBeNull();
  });

  test('收到 bioquest:app-ready 后平滑淡出（is-ready）', () => {
    setupBaseDom();
    window.__appBooted = true;
    renderContent();
    jest.useFakeTimers();
    evalBootMask();

    document.dispatchEvent(new Event('bioquest:app-ready'));
    // 越过 40ms bootTick 缓冲 + 500ms 最短展示 + rAF/30ms 缓冲
    jest.advanceTimersByTime(800);

    const mask = maskEl();
    // 已进入淡出流程：遮罩被标记 is-ready（transitionend 在 jsdom 不触发，
    // 移除由 400ms 兜底定时器负责，故此处只断言淡出标记）
    expect(mask).not.toBeNull();
    expect(mask.classList.contains('is-ready')).toBe(true);
  });

  test('应用未启动（脚本加载失败）时兜底展示“刷新重试”，不淡出到空白页', () => {
    setupBaseDom();
    // 注意：不设置 window.__appBooted —— 模拟 app.js 完全没执行
    jest.useFakeTimers();
    evalBootMask();

    // 推进到兜底超时（15s）+ 淡出缓冲
    jest.advanceTimersByTime(16000);

    const mask = maskEl();
    expect(mask).not.toBeNull();
    expect(mask.textContent).toContain('页面加载失败');
    expect(mask.textContent).toContain('刷新重试');
    // 遮罩没有进入 is-ready 淡出
    expect(mask.classList.contains('is-ready')).toBe(false);
  });

  test('应用已启动且内容渲染后，兜底超时会安全淡出（不误判为失败）', () => {
    setupBaseDom();
    window.__appBooted = true;
    renderContent();
    jest.useFakeTimers();
    evalBootMask();

    jest.advanceTimersByTime(16000);

    // 内容存在 → 走淡出路径：绝不出错误重试
    expect(document.body.textContent).not.toContain('页面加载失败');
    expect(document.body.textContent).not.toContain('刷新重试');
  });

  test('竞态恢复：15s 兜底已展示错误页，但应用晚到加载完成 → 撤销错误页正常淡出', () => {
    setupBaseDom();
    // 不设置 __appBooted：应用脚本很晚才完成加载（弱网/慢终端）
    jest.useFakeTimers();
    evalBootMask();

    // 15s 兜底：此时应用还没启动 → 展示"刷新重试"错误页
    jest.advanceTimersByTime(16000);
    expect(document.body.textContent).toContain('页面加载失败');

    // 应用此刻才启动并渲染出首屏内容，随后派发 app-ready
    window.__appBooted = true;
    renderContent();
    document.dispatchEvent(new Event('bioquest:app-ready'));

    // 越过 40ms bootTick 缓冲 + 最短展示时间 + 淡出流程
    jest.advanceTimersByTime(2500);

    // 不允许继续停留在错误页 / 不允许卡死：错误文案被清除，遮罩进入淡出或已移除
    expect(document.body.textContent).not.toContain('页面加载失败');
    expect(document.body.textContent).not.toContain('刷新重试');
  });
});