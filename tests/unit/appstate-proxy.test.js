/**
 * BioQuest — P1-7：AppState 只读 Proxy 封装单元测试
 *
 * 覆盖：
 *   1. 内部 `_AppState`（app.js 内部引用）仍然可写，用于路由/主题等状态更新；
 *   2. 暴露到 window 的 `AppState` 为只读视图：读取正常转发，写入被静默拒绝；
 *   3. 删除属性被拒绝；`__proto__`/原型污染被拒绝；
 *   4. 集成断言：app.js 中已不再把内部可变对象直接挂到 window.AppState。
 *
 * 说明：app.js 是浏览器脚本（重度依赖 DOM），无法整体在 node 中加载；
 * 本测试从 app.js 源码中精确抽取 `createReadOnlyStateView` 并连带构造幂等验证。
 */

const fs = require('fs');
const path = require('path');

const APP_SRC = path.join(__dirname, '..', '..', 'js', 'app.js');
const source = fs.readFileSync(APP_SRC, 'utf8');

// 从 app.js 源码中抽取 createReadOnlyStateView 函数定义（含函数体）
const fnStart = source.indexOf('function createReadOnlyStateView');
if (fnStart < 0) throw new Error('app.js 中未找到 createReadOnlyStateView');
// 用花括号配平找出函数体结束位置
const openBrace = source.indexOf('{', fnStart);
let depth = 0;
let fnEnd = openBrace;
for (let i = openBrace; i < source.length; i++) {
  const ch = source[i];
  if (ch === '{') depth++;
  else if (ch === '}') {
    depth--;
    if (depth === 0) { fnEnd = i + 1; break; }
  }
}
const fnSource = source.slice(fnStart, fnEnd);

// 构造内部态 + 只读视图
const internal = { currentRoute: '', theme: 'light', initialized: false, pageModules: {} };

// 该函数只需 console；在沙箱中执行定义
const buildView = new Function('console', [
  'var createReadOnlyStateView;',
  fnSource,
  'return createReadOnlyStateView;'
].join('\n'));
const createReadOnlyStateView = buildView(console);

describe('P1-7 AppState 只读 Proxy', () => {
  test('暴露的视图读取会转发内部最新状态', () => {
    const view = createReadOnlyStateView(internal);
    internal.currentRoute = '/practice';
    expect(view.currentRoute).toBe('/practice');
    expect(view.theme).toBe('light');
  });

  test('外部写入被静默拒绝，内部状态保持不变', () => {
    const view = createReadOnlyStateView(internal);
    view.theme = 'dark';            // 应被拒绝
    view.userGroup = 'admin';       // 任意注入属性也应被拒绝
    expect(internal.theme).toBe('light');
    expect(internal.userGroup).toBeUndefined();
    expect(view.theme).toBe('light');
  });

  test('删除属性被拒绝', () => {
    const view = createReadOnlyStateView(internal);
    expect(() => { delete view.currentRoute; }).not.toThrow();
    expect(internal.currentRoute).toBe('/practice');
  });

  test('原型污染写入被拒绝', () => {
    const view = createReadOnlyStateView(internal);
    expect(() => { view.__proto__ = { polluted: 1 }; }).not.toThrow();
    expect({}.polluted).toBeUndefined();
    expect(Object.prototype.polluted).toBeUndefined();
  });

  test('内部对象仍由业务代码直接写（与 app.js 实际用法一致）', () => {
    const view = createReadOnlyStateView(internal);
    // 模拟 app.js 内部写法：直接改 internal，视图可读到
    internal.initialized = true;
    expect(view.initialized).toBe(true);
    // 视图写不进去（区别于内部直写）
    view.initialized = false;
    expect(internal.initialized).toBe(true);
  });
});

describe('P1-7 AppState 集成约束', () => {
  test('window.AppState 通过只读 Proxy 暴露，而非直接绑定内部对象', () => {
    expect(source).toMatch(/window\.AppState\s*=\s*createReadOnlyStateView\(_AppState\)/);
    // 不再存在直接把内部可变对象挂到 window.AppState 的旧写法
    expect(source).not.toMatch(/window\.AppState\s*=\s*_AppState;/);
  });

  test('内部可变状态命名为 _AppState 且不再定义裸 AppState 全局', () => {
    expect(source).toMatch(/const _AppState\s*=\s*\{/);
    // 不允许在 app.js 顶层重新声明 const AppState（避免绕过代理的全局绑定泄漏）
    expect(source).not.toMatch(/const AppState\s*=/);
  });
});