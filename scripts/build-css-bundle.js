#!/usr/bin/env node
'use strict';
/**
 * BioQuest — 首屏同步 CSS 合并脚本（Issue #108）
 *
 * 背景：index.html 中首屏渲染依赖的 6 个同步 CSS（globals/layout/header/
 * learning-hub/home/debug-fix）会串行阻塞首屏；合并为单个 css/bundle-core.css
 * 后浏览器只需一次往返即可完成渲染样式就绪。
 *
 * 用法：
 *   node scripts/build-css-bundle.js          # 重新生成 css/bundle-core.css
 *
 * 说明：
 *   - 合并顺序即 index.html 原有加载顺序（debug-fix 置最后保证覆盖语义）；
 *   - 各文件内均为 data: URI（无相对 url() 引用），合并不改变路径解析；
 *   - 生成文件含来源标记；压缩由发布构建（npm run build:min）负责。
 */
const fs = require('fs');
const path = require('path');

const CSS_DIR = path.join(__dirname, '..', 'css');
const OUT = path.join(CSS_DIR, 'bundle-core.css');

// 与 index.html 中同步 <link> 的加载顺序保持一致（debug-fix 最后以覆盖）
const SYNC_CSS = [
  'globals.css',
  'layout.css',
  'header.css',
  'learning-hub.css',
  'home.css',
  'debug-fix.css'
];

const parts = [];
parts.push('/* ============================================================');
parts.push(' * BioQuest — 首屏同步 CSS 合并包（Issue #108，由');
parts.push(' * scripts/build-css-bundle.js 自动生成，勿手改。');
parts.push(' * 合并源：' + SYNC_CSS.join(' + '));
parts.push(' * 生成时间：' + new Date().toISOString());
parts.push(' * ============================================================ */');
parts.push('');

let missing = [];
for (const f of SYNC_CSS) {
  const abs = path.join(CSS_DIR, f);
  if (!fs.existsSync(abs)) { missing.push(f); continue; }
  parts.push('/* ---------- 来源: css/' + f + ' ---------- */');
  parts.push(fs.readFileSync(abs, 'utf8'));
  parts.push('');
}

if (missing.length) {
  console.error('[css-bundle] 缺少源文件，生成中止:', missing.join(', '));
  process.exit(1);
}

fs.writeFileSync(OUT, parts.join('\n'), 'utf8');
const bytes = fs.statSync(OUT).size;
console.log('[css-bundle] 已生成 css/bundle-core.css，' + bytes + ' 字节（' + (bytes / 1024).toFixed(1) + ' KB）。');