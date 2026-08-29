#!/usr/bin/env node
/**
 * ============================================================
 * scripts/check-commit-msg.js — Conventional Commits 提交信息校验（P3-1）
 * ============================================================
 * 用途：校验 commit 消息是否符合仓库提交规范（见 CONTRIBUTING.md）。
 *   1) 无参数：取最近一次提交（git log -1 --format=%s）校验。
 *   2) --subject "<msg>"：独立校验任意消息（不依赖 git 状态）。
 *
 * 零依赖：仅使用 Node 内置模块；只读、不改变 git 配置、不自动改写任何内容。
 * 返回码：符合 exit 0；不符合打印示例并 exit 1。
 */
'use strict';

const { execSync } = require('child_process');

// 与 CONTRIBUTING.md 第 2 节保持一致：type + 可选 scope + 描述（1~120 字符）
const CONVENTION_REGEX = /^(feat|fix|docs|chore|refactor|perf|test|build|ci|style|revert)(\([a-z0-9_, -]+\))?: .{1,120}$/;

const EXAMPLES = [
  'fix: 修复答题进度在刷新后丢失 (#136)',
  'feat: 新增学习热力图模块 (#128)',
  'docs: 补充贡献与提交规范 (#113)',
  'chore: 升级 playwright 依赖 (#120)',
  'refactor: 抽取公共代数引擎函数 (#115)',
  'perf(test): 拆分大型单测以并行执行',
].join('\n');

function getLastCommitSubject() {
  // PR CI（pull_request 事件）中 checkout 的是自动生成的合并提交
  // （HEAD 消息形如 "Merge X into Y"），真正要校验的是 PR head 提交，
  // 它位于 MERGE_HEAD。push 事件/本地无 MERGE_HEAD，退回校验 HEAD。
  const out = execSync(
    'if git rev-parse --verify -q MERGE_HEAD >/dev/null 2>&1; then git log -1 --format=%s MERGE_HEAD; else git log -1 --format=%s; fi',
    { encoding: 'utf8' }
  );
  return out ? out.replace(/\n+$/, '') : '';
}

function printGuidance() {
  process.stderr.write(
    [
      '',
      '[check-commit-msg] 提交信息不符合 Conventional Commits 规范。',
      '格式：<type>(<scope>): <描述，长度 1~120，结尾引用 #issue>',
      'type 可选：feat | fix | docs | chore | refactor | perf | test | build | ci | style | revert',
      'scope 可选（括号内小写）。描述请用祈使句并引用 issue，例如：',
      '',
      EXAMPLES,
      '',
    ].join('\n') + '\n'
  );
}

function main() {
  let subject;
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--subject' && args[i + 1]) {
      subject = args[i + 1];
      i++;
    } else if (args[i] !== '--subject') {
      // 忽略未知参数，脚本仍可运行
    }
  }

  if (subject === undefined) {
    try {
      subject = getLastCommitSubject();
    } catch (e) {
      process.stderr.write(
        '[check-commit-msg] 无法读取最近一次提交。请使用 `--subject "<msg>"` 独立校验。\n'
      );
      process.exit(1);
    }
  }

  if (!subject) {
    process.stderr.write('[check-commit-msg] 提交信息为空。\n');
    process.exit(1);
  }

  if (CONVENTION_REGEX.test(subject)) {
    process.stdout.write(`[check-commit-msg] OK: "${subject}"\n`);
    process.exit(0);
  }

  process.stdout.write(`[check-commit-msg] FAIL: "${subject}"\n`);
  printGuidance();
  process.exit(1);
}

main();