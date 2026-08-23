/**
 * @jest-environment jsdom
 *
 * Issue #102（P1-5）回归测试：sanitizeUrlParam URL 参数清洗
 * 验证：
 *   1. 合法字符串（含中文/空格/引号）原样保留
 *   2. 非字符串 / null / undefined → null
 *   3. 控制字符（\x00-\x1f、\x7f）剔除
 *   4. HTML 标签定界符 < > 与反引号剔除（纵深防御 XSS）
 *   5. 清洗后为空 → null
 *   6. 超长参数 → null（默认上限 100，可自定义）
 */
'use strict';

const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
// 以 require 加载使 Istanbul 可插桩（此前 eval 方式覆盖率不可见）；
// utils.js 顶层 'use strict' 使函数声明停留在模块作用域，
// 受测函数经 window.BioQuest.sanitizeUrlParam 命名空间导出。
require(path.join(ROOT, 'js/utils.js'));
const sanitizeUrlParam = window.BioQuest.sanitizeUrlParam;

describe('Issue #102：sanitizeUrlParam 参数清洗', () => {
  test('合法字符串原样返回（中文、空格、单双引号均为合法搜索词）', () => {
    expect(sanitizeUrlParam('细胞呼吸')).toBe('细胞呼吸');
    expect(sanitizeUrlParam('C4 plant 光合作用')).toBe('C4 plant 光合作用');
    expect(sanitizeUrlParam("O'Brien \"quoted\"")).toBe("O'Brien \"quoted\"");
    expect(sanitizeUrlParam('a=b&c=d')).toBe('a=b&c=d');
  });

  test('非字符串输入一律返回 null', () => {
    expect(sanitizeUrlParam(null)).toBeNull();
    expect(sanitizeUrlParam(undefined)).toBeNull();
    expect(sanitizeUrlParam(123)).toBeNull();
    expect(sanitizeUrlParam({ q: 'x' })).toBeNull();
    expect(sanitizeUrlParam(['x'])).toBeNull();
    expect(sanitizeUrlParam(true)).toBeNull();
  });

  test('剔除控制字符（含 \x00-\x1f 与 \x7f）', () => {
    expect(sanitizeUrlParam('a\x00b\x1fc\x7fd')).toBe('abcd');
    expect(sanitizeUrlParam('q\x08\x0bword')).toBe('qword'); // \x0b 垂直制表也属控制字符
    expect(sanitizeUrlParam('line\nbreak\ttab')).toBe('linebreaktab');
  });

  test('剔除 HTML 标签定界符与反引号（防标记注入）', () => {
    expect(sanitizeUrlParam('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
    expect(sanitizeUrlParam('<img src=x onerror=alert(1)>')).toBe('img src=x onerror=alert(1)');
    expect(sanitizeUrlParam('a<b>c')).toBe('abc');
    expect(sanitizeUrlParam('`code`')).toBe('code');
    expect(sanitizeUrlParam('``')).toBeNull();
  });

  test('清洗后为空字符串 → null', () => {
    expect(sanitizeUrlParam('')).toBeNull();
    expect(sanitizeUrlParam('<>')).toBeNull();
    expect(sanitizeUrlParam('\x00\x00')).toBeNull();
  });

  test('长度限制：默认 100，超出返回 null', () => {
    expect(sanitizeUrlParam('a'.repeat(100))).toBe('a'.repeat(100));
    expect(sanitizeUrlParam('a'.repeat(101))).toBeNull();
    // 清洗发生在长度校验前：定界符被剔除后不占长度
    expect(sanitizeUrlParam('a'.repeat(50) + '<>'.repeat(25) + 'b'.repeat(25))).toBe('a'.repeat(50) + 'b'.repeat(25));
  });

  test('自定义 maxLen 与非法 maxLen 回落默认值', () => {
    expect(sanitizeUrlParam('a'.repeat(10), 10)).toBe('a'.repeat(10));
    expect(sanitizeUrlParam('a'.repeat(11), 10)).toBeNull();
    // 非法 maxLen（<=0 / 非数字）回落 100
    expect(sanitizeUrlParam('a'.repeat(100), 0)).toBe('a'.repeat(100));
    expect(sanitizeUrlParam('a'.repeat(101), -5)).toBeNull();
    expect(sanitizeUrlParam('a'.repeat(101), 'not-a-number')).toBeNull();
  });
});
