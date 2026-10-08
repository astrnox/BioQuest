/**
 * @jest-environment jsdom
 *
 * 设计系统 v2 回归测试（P0/P1 设计整改）
 * --------------------------------------
 * 背景：全站曾大量使用"AI 味"设计（毛玻璃 / 渐变 / emoji 当图标 / 内联样式
 * 就地发明色值）。本测试锁定整改后的约定，防止回潮：
 *   1. 全局图标系统 BQ_ICONS 可用且风格统一（currentColor + stroke 线性）；
 *   2. 全局组件类（按钮/卡片/chip/页头/状态点/结果态/提示条）已在 globals.css 定义；
 *   3. 底部标签栏为实色材质（不使用 backdrop-filter）；
 *   4. 设计审计脚本与 npm 脚本已就位（CI 门禁）。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const utilsSrc = read('js/core/utils.js');
const globalsCss = read('css/globals.css');
const pkg = JSON.parse(read('package.json'));

beforeAll(() => {
  // 以全局脚本语义执行 utils.js（与 index.html 一致）
  (0, eval)(utilsSrc); // eslint-disable-line no-eval
});

describe('BQ_ICONS 全局图标系统', () => {
  test('暴露到 window 并包含设计系统所需图标', () => {
    expect(typeof window.BQ_ICONS).toBe('object');
    ['check', 'checkCircle', 'alert', 'info', 'x', 'edit', 'trophy', 'flag'].forEach((k) => {
      expect(typeof window.BQ_ICONS[k]).toBe('string');
      expect(window.BQ_ICONS[k]).toContain('<svg');
    });
  });

  test('图标风格统一：currentColor + stroke 线性（不允许彩色 emoji）', () => {
    Object.keys(window.BQ_ICONS).forEach((k) => {
      const svg = window.BQ_ICONS[k];
      expect(svg).toContain('stroke="currentColor"');
      expect(svg).toContain('viewBox="0 0 24 24"');
      expect(svg).toContain('fill="none"');
      expect(svg).toContain('aria-hidden="true"');
    });
  });

  test('挂载在 BioQuest 命名空间下（Q-03 约定）', () => {
    expect(window.BioQuest.icons).toBe(window.BQ_ICONS);
  });
});

describe('全局组件层（设计系统 v2）', () => {
  test('按钮 / 卡片 / chip / 页头 / 状态点 / 结果态 / 提示条 均已定义', () => {
    [
      '.bq-btn', '.bq-btn--primary', '.bq-btn--ghost', '.bq-btn--warm', '.bq-btn--block',
      '.bq-card', '.bq-card--flat', '.bq-chip',
      '.bq-section-header', '.bq-section-header__title', '.bq-section-header__desc',
      '.bq-dot', '.bq-dot--high', '.bq-dot--medium', '.bq-dot--low', '.bq-dot--none',
      '.bq-result-icon', '.bq-note', '.bq-note__icon', '.bq-empty'
    ].forEach((sel) => expect(globalsCss).toContain(sel));
  });

  test('组件颜色走全局 token（不写死色值）', () => {
    // 抽查按钮主色与卡片边框必须引用 token
    expect(globalsCss).toMatch(/\.bq-btn--primary\s*\{[^}]*background:\s*var\(--color-sage\)/);
    expect(globalsCss).toMatch(/\.bq-card\s*\{[^}]*border:\s*1px solid var\(--color-border\)/);
  });
});

describe('底部标签栏：实色材质（去玻璃）', () => {
  test('.bottom-tab-bar 不再使用 backdrop-filter', () => {
    const block = globalsCss.match(/\.bottom-tab-bar \{[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    const noComment = block[0].replace(/\/\*[\s\S]*?\*\//g, ''); // 注释里提到该属性名不算违规
    expect(noComment).not.toMatch(/backdrop-filter\s*:/);
    expect(noComment).toMatch(/background:\s*var\(--tabbar-bg\)/);
  });

  test('标签栏材质全部引用主题 token（明暗主题自动生效）', () => {
    const block = globalsCss.match(/\.bottom-tab-bar \{[\s\S]*?\n\}/)[0];
    expect(block).toMatch(/--tabbar-bg:\s*var\(--color-surface\)/);
    expect(block).toMatch(/--tabbar-border:\s*var\(--color-border\)/);
    expect(block).toMatch(/--tabbar-bar-shadow:\s*var\(--shadow-lg\)/);
  });
});

describe('设计审计门禁', () => {
  test('scripts/audit-design.js 存在且可由 node --check 通过', () => {
    const p = path.join(ROOT, 'scripts', 'audit-design.js');
    expect(fs.existsSync(p)).toBe(true);
    // 用 vm 做语法解析（require 会执行 main 并 process.exit，不可用）
    const vm = require('vm');
    expect(() => new vm.Script(read('scripts/audit-design.js'), { filename: 'audit-design.js' })).not.toThrow();
  });

  test('npm 脚本暴露 audit:design，并纳入 npm test 链路', () => {
    expect(pkg.scripts['audit:design']).toBe('node scripts/audit-design.js');
    expect(pkg.scripts.test).toContain('audit:design');
  });

  test('CI 已接入设计规范审计', () => {
    const ci = read('.github/workflows/ci.yml');
    expect(ci).toContain('audit:design');
  });
});