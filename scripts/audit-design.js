#!/usr/bin/env node
'use strict';
/**
 * ============================================================
 * scripts/audit-design.js — 设计规范审计（P0 设计整改门禁）
 * ============================================================
 * 背景：
 *   项目曾出现大量"AI 味"设计（玻璃拟态 / 渐变 / emoji 当图标 / 内联样式
 *   就地发明色值）。本脚本把这些约定固化为 CI 门禁，防止回潮：
 *     - 硬门禁（FAIL）：彩色 emoji、backdrop-filter 模糊、渐变数量超预算；
 *     - 棘轮门禁（FAIL）：内联样式数、硬编码色值数不得超过基线（只许下降）；
 *     - 软报告：各项计数明细，便于逐步收敛。
 *
 * 预算与依据：
 *   emoji        0    （图标统一走 js/core/utils.js 的 BQ_ICONS）
 *   backdrop-filter ≤ 3（保留场景：模态遮罩；当前仅登录遮罩 1 处）
 *   渐变          ≤ 4（白名单：首页 hero 可读性遮罩 ×2、加载动画 ×2）
 *
 * 用法：
 *   node scripts/audit-design.js            # 审计（CI 使用）
 *   node scripts/audit-design.js --update   # 下调棘轮基线（只在确实减少后使用）
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/* ── 棘轮基线：只允许下调；确需上调必须在 PR 里说明理由并在此处修改 ── */
const BASELINE_INLINE_STYLE = 1464; // js/**（不含 vendor）中 style=" 出现次数
const BASELINE_UNIQUE_HEX = 470;    // js/**（不含 vendor）中唯一 #rrggbb 数量

/* ── 预算 ── */
const BUDGET_BACKDROP_FILTER = 3;
const BUDGET_GRADIENT = 4;

/* 彩色 emoji / 彩色符号（不含 ✓✗✕★ 等排版符号——那些允许使用） */
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2705}\u{274C}\u{26A0}\u{2139}\u{2B50}\u{2B55}\u{26AA}\u{26AB}\u{2B07}\u{2B06}\u{2B05}\u{27A1}\u{23F0}\u{2728}\u{2714}\u{2753}\u{2757}]/u;

function walkJs(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === 'vendor' || name === 'node_modules') continue;
      walkJs(p, out);
    } else if (name.endsWith('.js')) {
      out.push(p);
    }
  }
  return out;
}

function collectFiles() {
  const js = walkJs(path.join(ROOT, 'js'), []);
  const css = fs.readdirSync(path.join(ROOT, 'css'))
    .filter((f) => f.endsWith('.css') && f !== 'bundle-core.css')
    .map((f) => path.join(ROOT, 'css', f));
  const html = fs.readdirSync(ROOT)
    .filter((f) => f.endsWith('.html'))
    .map((f) => path.join(ROOT, f));
  return { js, css, html };
}

const isCommentLine = (line) => {
  const t = line.trim();
  return t.startsWith('*') || t.startsWith('//') || t.startsWith('/*') || t.startsWith('<!--');
};

const rel = (p) => path.relative(ROOT, p);

function main() {
  const { js, css, html } = collectFiles();
  const failures = [];
  const report = [];

  /* ── 1. 彩色 emoji ── */
  const emojiHits = [];
  for (const f of js.concat(html, css)) {
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (isCommentLine(line)) return;
      const m = line.match(new RegExp(EMOJI_RE.source, 'gu'));
      if (m) emojiHits.push(`${rel(f)}:${i + 1}  ${[...new Set(m)].join(' ')}  ${line.trim().slice(0, 70)}`);
    });
  }
  report.push(`彩色 emoji                    : ${emojiHits.length} 处（预算 0）`);
  if (emojiHits.length > 0) {
    failures.push(`发现 ${emojiHits.length} 处彩色 emoji（图标请改用 BQ_ICONS）：\n    ` + emojiHits.slice(0, 12).join('\n    '));
  }

  /* ── 2. backdrop-filter 模糊 ── */
  const bfHits = [];
  for (const f of js.concat(html, css)) {
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (isCommentLine(line)) return;
      if (/(?<!webkit-)backdrop-filter\s*:/.test(line)) bfHits.push(`${rel(f)}:${i + 1}  ${line.trim().slice(0, 70)}`);
    });
  }
  report.push(`backdrop-filter（去 -webkit）  : ${bfHits.length} 处（预算 ${BUDGET_BACKDROP_FILTER}）`);
  if (bfHits.length > BUDGET_BACKDROP_FILTER) {
    failures.push(`backdrop-filter 超出预算（${bfHits.length} > ${BUDGET_BACKDROP_FILTER}）：\n    ` + bfHits.join('\n    '));
  }

  /* ── 3. 渐变 ── */
  const gradHits = [];
  for (const f of css.concat(js, html)) {
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (isCommentLine(line)) return;
      if (/(linear|radial)-gradient\(/.test(line)) gradHits.push(`${rel(f)}:${i + 1}  ${line.trim().slice(0, 70)}`);
    });
  }
  report.push(`渐变（linear/radial）         : ${gradHits.length} 处（预算 ${BUDGET_GRADIENT}）`);
  if (gradHits.length > BUDGET_GRADIENT) {
    failures.push(`渐变超出预算（${gradHits.length} > ${BUDGET_GRADIENT}）：\n    ` + gradHits.join('\n    '));
  }

  /* ── 4. 棘轮：内联样式 / 硬编码色值 ── */
  let inlineStyle = 0;
  const hexSet = new Set();
  for (const f of js) {
    const src = fs.readFileSync(f, 'utf8');
    inlineStyle += (src.match(/style="/g) || []).length;
    (src.match(/#[0-9a-fA-F]{6}\b/g) || []).forEach((h) => hexSet.add(h.toLowerCase()));
  }
  report.push(`js 内联 style="               : ${inlineStyle} 处（基线 ${BASELINE_INLINE_STYLE}，只许下降）`);
  report.push(`js 硬编码 #rrggbb 唯一色值    : ${hexSet.size} 个（基线 ${BASELINE_UNIQUE_HEX}，只许下降）`);
  if (inlineStyle > BASELINE_INLINE_STYLE) {
    failures.push(`内联样式数超过基线（${inlineStyle} > ${BASELINE_INLINE_STYLE}）：新代码请使用全局组件类（.bq-btn/.bq-card/.bq-section-header…）`);
  }
  if (hexSet.size > BASELINE_UNIQUE_HEX) {
    failures.push(`硬编码色值数超过基线（${hexSet.size} > ${BASELINE_UNIQUE_HEX}）：新代码请引用全局 token（--color-* / --state-*）`);
  }

  /* ── 输出 ── */
  console.log('BioQuest 设计规范审计');
  console.log('──────────────────────────────────────────────');
  report.forEach((l) => console.log('  ' + l));
  console.log('──────────────────────────────────────────────');

  if (process.argv.includes('--update')) {
    if (failures.length > 0) {
      console.error('存在未达标项，禁止更新基线。请先修到达标后再 --update。');
      process.exit(1);
    }
    const self = path.join(__dirname, 'audit-design.js');
    let src = fs.readFileSync(self, 'utf8');
    src = src.replace(/const BASELINE_INLINE_STYLE = \d+;/, `const BASELINE_INLINE_STYLE = ${inlineStyle};`);
    src = src.replace(/const BASELINE_UNIQUE_HEX = \d+;/, `const BASELINE_UNIQUE_HEX = ${hexSet.size};`);
    fs.writeFileSync(self, src);
    console.log(`棘轮基线已下调：inline=${inlineStyle} hex=${hexSet.size}`);
    process.exit(0);
  }

  if (failures.length > 0) {
    console.error('设计规范审计未通过：\n');
    failures.forEach((f) => console.error('  ✗ ' + f + '\n'));
    process.exit(1);
  }
  console.log('设计规范审计通过');
}

main();