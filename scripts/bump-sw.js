#!/usr/bin/env node
/**
 * ============================================================
 * scripts/bump-sw.js — Service Worker 缓存版本号自动 bump（P1-4）
 * ============================================================
 * 用途：
 *   每次修改 js/css/data 下的内容后执行 `npm run bump:sw`（或 node scripts/bump-sw.js），
 *   自动基于 git 跟踪的 js/css/data 文件内容计算 SHA-256 并写入 sw.js 的 CACHE_VERSION。
 *   避免"人肉维护版本号"导致的旧新资源混用灵异 bug。
 *
 * 幂等性：
 *   内容未变化时输出不变、不改写文件（不会弄脏工作区 / 不产生空提交）。
 *
 * 零依赖：仅使用 Node 内置模块。git 不可用时退化为目录遍历（忽略 node_modules）。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SW_FILE = path.join(ROOT, 'sw.js');

// 参与版本哈希的目录（与 PRD P1-4 约定一致：js/css/data）
const HASH_DIRS = ['js', 'css', 'data'];

function gitListFiles() {
  try {
    return execSync('git ls-files js css data', { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch (e) {
    // git 不可用（如未初始化的目录）→ 退化为递归遍历
    const out = [];
    HASH_DIRS.forEach((dir) => walk(dir, out));
    return out;
  }
}

function walk(relDir, out) {
  const abs = path.join(ROOT, relDir);
  if (!fs.existsSync(abs)) return;
  const stack = [abs];
  while (stack.length) {
    const p = stack.pop();
    for (const name of fs.readdirSync(p)) {
      if (name === 'node_modules' || name === '.git') continue;
      const full = path.join(p, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) stack.push(full);
      else out.push(path.relative(ROOT, full).split(path.sep).join('/'));
    }
  }
}

const files = gitListFiles();
const hash = crypto.createHash('sha256');
for (const f of files) {
  const full = path.join(ROOT, f);
  try {
    hash.update(fs.readFileSync(full));
  } catch (e) {
    // 文件被删除/不可读则跳过，不影响其余内容哈希
  }
}
const digest = hash.digest('hex');
// 纯内容哈希驱动：内容不变则版本号不变（幂等）
const version = 'bioquest-' + digest.slice(0, 12);

let sw;
try {
  sw = fs.readFileSync(SW_FILE, 'utf8');
} catch (e) {
  console.error('[bump-sw] 读取 sw.js 失败:', e.message);
  process.exit(1);
}

const re = /var CACHE_VERSION = '[^']*';/;
if (!re.test(sw)) {
  console.error('[bump-sw] sw.js 中未找到 var CACHE_VERSION = \'...\'; 定义，请人工核对');
  process.exit(1);
}

const next = `var CACHE_VERSION = '${version}';`;
if (re.exec(sw)[0] === next) {
  console.log('[bump-sw] 缓存版本未变化:', version);
  process.exit(0);
}

sw = sw.replace(re, next);
fs.writeFileSync(SW_FILE, sw);
console.log('[bump-sw] 已更新 CACHE_VERSION →', version);
console.log('[bump-sw] 已参与哈希文件数:', files.length);
