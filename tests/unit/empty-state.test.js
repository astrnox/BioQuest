/**
 * BioQuest — Issue #125（P3-22）统一「温暖空状态」组件单元测试
 *
 * 覆盖：
 *   1. emptyStateHTML 基本结构（icon / title / hint / 行动按钮）；
 *   2. 无参数时的默认文案与图标兜底；
 *   3. pickIcon 按关键词智能选图标；
 *   4. escapeHtml 转义，防止注入；
 *   5. renderEmptyState 写入容器并注册事件委托；
 *   6. 全局 click 委托触发 action.onClick（不依赖内联脚本，符合 CSP）。
 *
 * 说明：empty-state.js 是浏览器 IIFE 且只在 window 存在时导出，测试用 mocked
 *   document/window 经 new Function 沙箱加载，与 achievements.test.js 同风格。
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', '..', 'js', 'empty-state.js');
const source = fs.readFileSync(SRC, 'utf8');

function listenCapture(target, type) {
  const handlers = [];
  target.addEventListener = target.addEventListener || function (t, fn) {
    if (t === type) handlers.push(fn);
  };
  return handlers;
}

function makeContainer() {
  return { innerHTML: 'OLD' };
}

/**
 * 在沙箱中加载 empty-state.js，暴露 window.BioQuest API 与事件委托句柄。
 */
function loadHarness() {
  const doc = { addEventListener() {} };
  const win = { BioQuest: null };
  const factory = new Function(
    'window', 'document', 'console',
    source + '\n;return { api: window.BioQuest };'
  );
  const out = factory(win, doc, console);
  return { api: out.api, doc, win };
}

describe('Issue #125 统一空状态组件', () => {
  test('emptyStateHTML 渲染完整结构（icon + title + hint + action）', () => {
    const { api } = loadHarness();
    const html = api.emptyStateHTML({
      title: '暂无错题记录',
      hint: '练习时答错的题目会自动收录',
      action: { label: '去练习' }
    });
    expect(html).toContain('class="bq-empty-state"');
    expect(html).toContain('role="status"');
    expect(html).toContain('暂无错题记录');
    expect(html).toContain('练习时答错的题目会自动收录');
    expect(html).toContain('data-empty-action="去练习"');
  });

  test('缺省参数有默认标题，且不渲染 action 按钮', () => {
    const { api } = loadHarness();
    const html = api.emptyStateHTML({});
    expect(html).toContain('这里还空空的');
    expect(html).not.toContain('data-empty-action');
  });

  test('pickIcon 按标题关键词选择生物主题图标', () => {
    const { api } = loadHarness();
    expect(api.emptyStateHTML({ title: '暂无收藏题目' })).toContain('⭐');
    expect(api.emptyStateHTML({ title: '暂无错题' })).toContain('🐞');
    expect(api.emptyStateHTML({ title: '排行榜未上榜' })).toContain('📈');
    expect(api.emptyStateHTML({ title: '打卡记录' })).toContain('🔥');
  });

  test('显式 icon 优先于关键词推断', () => {
    const { api } = loadHarness();
    const html = api.emptyStateHTML({ title: '暂无错题', icon: '🧬' });
    expect(html).toContain('🧬');
    expect(html).not.toContain('🐞');
  });

  test('标题与按钮文本均做 HTML 转义，防注入', () => {
    const { api } = loadHarness();
    const html = api.emptyStateHTML({ title: '<img src=x onerror=alert(1)>', action: { label: '"\'><script>' } });
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&quot;&#39;&gt;&lt;script&gt;');
  });

  test('renderEmptyState 写入容器并返回 true', () => {
    const { api } = loadHarness();
    const container = makeContainer();
    const ok = api.renderEmptyState(container, { title: '空' });
    expect(ok).toBe(true);
    expect(container.innerHTML).toContain('bq-empty-state');
    expect(container.innerHTML).toContain('空');
  });

  test('renderEmptyState 对空容器返回 false，不抛错', () => {
    const { api } = loadHarness();
    expect(api.renderEmptyState(null, { title: 'x' })).toBe(false);
    expect(api.renderEmptyState(undefined, { title: 'x' })).toBe(false);
  });

  test('全局 click 委托触发 action.onClick（CSP 兼容，无内联脚本）', () => {
    const called = [];
    const doc = { addEventListener() {} };
    const clickHandlers = [];
    doc.addEventListener = (t, fn) => { if (t === 'click') clickHandlers.push(fn); };
    const factory = new Function(
      'window', 'document', 'console',
      source + '\n;return { api: window.BioQuest };'
    );
    const out = factory({ BioQuest: null }, doc, console);
    const container = makeContainer();
    out.api.renderEmptyState(container, {
      title: '空',
      action: {
        label: '去练习',
        onClick: function () { called.push('practice'); }
      }
    });
    // 模拟点击按钮：构造带 closest 的目标元素
    const fakeBtn = {
      getAttribute: () => '去练习',
      closest: (sel) => (sel === '[data-empty-action]' ? fakeBtn : null)
    };
    clickHandlers[0]({ target: fakeBtn });
    expect(called).toEqual(['practice']);

    // 点击其它元素（无 closest 匹配）不触发
    const other = { getAttribute: () => null, closest: () => null };
    clickHandlers[0]({ target: other });
    expect(called.length).toBe(1);
  });

  test('emptyStateHTML 直接渲染（不经 renderEmptyState）也注册 onClick 委托', () => {
    const called = [];
    const doc = { addEventListener() {} };
    const clickHandlers = [];
    doc.addEventListener = (t, fn) => { if (t === 'click') clickHandlers.push(fn); };
    const factory = new Function(
      'window', 'document', 'console',
      source + '\n;return { api: window.BioQuest };'
    );
    const out = factory({ BioQuest: null }, doc, console);
    out.api.emptyStateHTML({
      title: '空',
      action: { label: '去练习', onClick: function () { called.push('go'); } }
    });
    const fakeBtn = {
      getAttribute: () => '去练习',
      closest: (sel) => (sel === '[data-empty-action]' ? fakeBtn : null)
    };
    clickHandlers[0]({ target: fakeBtn });
    expect(called).toEqual(['go']);
  });

  test('具有 data-empty-action 的元素即使 closest 失败也不抛错', () => {
    const doc = { addEventListener() {} };
    const clickHandlers = [];
    doc.addEventListener = (t, fn) => { if (t === 'click') clickHandlers.push(fn); };
    const factory = new Function(
      'window', 'document', 'console',
      source + '\n;return { api: window.BioQuest };'
    );
    const out = factory({ BioQuest: null }, doc, console);
    const container = makeContainer();
    out.api.renderEmptyState(container, { title: '空', action: { label: 'L', onClick: function () {} } });
    expect(() => clickHandlers[0]({ target: null })).not.toThrow();
  });
});