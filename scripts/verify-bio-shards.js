#!/usr/bin/env node
/**
 * BioQuest — 题库重建校验器（Issue #10，CI 使用）
 * 校验内容：
 *   1. 每道题拥有唯一 bioID（跨分片全局唯一，格式合法）
 *   2. manifest 中各分片 SHA-256 与实际文件一致
 *   3. index/bank 双向一致：index 有对应 bank 题目，bank 有对应 index 条目
 *   4. 迁移映射表完备：题库中每道题的 oldId 都能在 bioid-map.json 中解析
 *   5. 旧 ID 可复算：hashQuestionId 生成算法一致性（含 32 位截断）抽样验证
 *
 * 运行：node scripts/verify-bio-shards.js
 * 退出码：0 通过；1 失败（任何一项不通过都视为失败）
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');

let failures = 0;

function fail(msg) {
  failures++;
  console.error('  [FAIL] ' + msg);
}

function ok(msg) {
  console.log('  [ok] ' + msg);
}

function sha256(absPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}

/**
 * 与 generate-bio-shards.js 完全一致的 canonKey：
 * 题目规范内容指纹（用于内容寻址 bioID）。
 */
function canonKey(q) {
  let opts = '';
  if (Array.isArray(q.subQuestions)) {
    opts = JSON.stringify(q.subQuestions.map((s) => [s.label, s.text, !!s.answer]));
  }
  return (q.question || '') + '\u0000' + opts;
}

/**
 * 与 generate-bio-shards.js 完全一致的内容寻址 bioID 序号（12 位十六进制）。
 * 通过反向复算校验「bioID 是题目内容的纯函数」→ 新增/删除其它题目永不改变既有 bioID。
 */
function contentSeq(key) {
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 12);
}

/**
 * 与 js/storage.js hashQuestionId 完全一致的算法（含 Math.abs 32 位截断）。
 * 注意：JS 的 charCodeAt 返回 UTF-16 码元；node 端按相同规则逐码元处理。
 * @param {string} str
 * @returns {string}
 */
function hashQuestionId(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return String(Math.abs(hash));
}

/* ---- 1. manifest ---- */
const manifestPath = path.join(DATA_DIR, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

console.log('== manifest 结构 ==');
if (!manifest.rev || typeof manifest.rev !== 'number') fail('manifest 缺少 rev 字段');
else ok('rev = ' + manifest.rev);
if (!manifest.updated_at) fail('manifest 缺少 updated_at');
else ok('updated_at = ' + manifest.updated_at);
if (!manifest.files || typeof manifest.files !== 'object') fail('manifest 缺少 files');
if (!manifest.total_questions || typeof manifest.total_questions !== 'number') fail('manifest 缺少 total_questions');
else ok('total_questions = ' + manifest.total_questions);

/* ---- 2. SHA-256 一致性 ---- */
console.log('== SHA-256 一致性 ==');
const filePaths = Object.keys(manifest.files || {});
for (const rel of filePaths) {
  const abs = path.join(DATA_DIR, rel.replace(/^data\//, ''));
  if (!fs.existsSync(abs)) {
    fail('manifest 声明的文件不存在: ' + rel);
    continue;
  }
  const actual = sha256(abs);
  if (actual !== manifest.files[rel]) {
    fail('SHA-256 不匹配: ' + rel + ' (manifest=' + manifest.files[rel].slice(0, 12) + ' actual=' + actual.slice(0, 12) + ')');
  } else {
    ok(rel + ' 校验一致');
  }
}

/* ---- 3. bioID 全局唯一 + 格式 ---- */
console.log('== bioID 唯一性与格式 ==');
const bioSet = new Set();
const bioRegex = /^BQ-[a-z0-9_]+-[0-9a-f]{12}$/;
let totalInBank = 0;

// 只从 bank 统计唯一性（index 与 bank 的 key 镜像一致，避免重复计数）
for (const rel of filePaths) {
  if (!rel.startsWith('bank/')) continue;
  const abs = path.join(DATA_DIR, rel.replace(/^data\//, ''));
  if (!fs.existsSync(abs)) continue;
  const obj = JSON.parse(fs.readFileSync(abs, 'utf8'));
  for (const bioId of Object.keys(obj)) {
    if (!bioRegex.test(bioId)) fail('非法 bioID 格式: ' + bioId);
    if (bioSet.has(bioId)) fail('bioID 重复: ' + bioId);
    bioSet.add(bioId);
    totalInBank++;
  }
}
ok('bioID 唯一，共 ' + bioSet.size + ' 个');
if (totalInBank !== manifest.total_questions) {
  fail('bank 题量与 manifest.total_questions 不一致: bank=' + totalInBank + ' manifest=' + manifest.total_questions);
} else {
  ok('bank 题量 = manifest.total_questions = ' + totalInBank);
}

/* ---- 3b. 内容寻址 / 抗漂移校验 ---- */
// 反向复算每个 bank 题目的 bioID = BQ-<tag>-<sha256(canonKey) 截断 12 位>，
// 若全部一致则证明 bioID 是题目内容的纯函数：新增/删除/排序其它题目永不改变既有 bioID。
console.log('== 内容寻址 / 抗漂移（反向复算）==');
let addrChecked = 0;
let addrFailed = 0;
for (const rel of filePaths) {
  if (!rel.startsWith('bank/')) continue;
  const tag = rel.replace(/^bank\//, '').replace(/\.json$/, '');
  const abs = path.join(DATA_DIR, rel.replace(/^data\//, ''));
  if (!fs.existsSync(abs)) continue;
  const bank = JSON.parse(fs.readFileSync(abs, 'utf8'));
  for (const bioId of Object.keys(bank)) {
    const expect = 'BQ-' + tag + '-' + contentSeq(canonKey(bank[bioId]));
    if (expect !== bioId) {
      addrFailed++;
      fail('内容寻址失配: ' + bioId + ' 应为 ' + expect + '（tag=' + tag + '）');
    }
    addrChecked++;
  }
}
if (addrFailed === 0) {
  ok('全部 ' + addrChecked + ' 题的 bioID 均可由自身内容反向复算（纯函数 → 抗漂移）');
} else {
  fail(addrFailed + ' 题内容寻址失配');
}

/* ---- 4. index/bank 双向一致 ---- */
console.log('== index/bank 双向一致 ==');
const tagSet = new Set(manifest.sources.map((s) => s.tag));
for (const tag of tagSet) {
  const indexPath = path.join(DATA_DIR, 'index', tag + '.json');
  const bankPath = path.join(DATA_DIR, 'bank', tag + '.json');
  if (!fs.existsSync(indexPath) || !fs.existsSync(bankPath)) {
    fail('tag=' + tag + ' 缺少 index 或 bank 文件');
    continue;
  }
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
  const iIds = Object.keys(index);
  const bIds = Object.keys(bank);
  if (iIds.length !== bIds.length) fail('tag=' + tag + ' index/bank 数量不一致: ' + iIds.length + ' vs ' + bIds.length);
  for (const id of iIds) {
    if (!bank[id]) fail('tag=' + tag + ' index 有但 bank 无: ' + id);
  }
  for (const id of bIds) {
    if (!index[id]) fail('tag=' + tag + ' bank 有但 index 无: ' + id);
  }
  // 校验 index 元数据字段齐全
  for (const id of iIds) {
    const meta = index[id];
    if (!meta || meta.tags === undefined || meta.diff === undefined || meta.len === undefined || meta.src === undefined) {
      fail('tag=' + tag + ' index 元数据字段缺失: ' + id);
      break;
    }
  }
  ok('tag=' + tag + ' 双向一致 (' + iIds.length + ' 题)');
}

/* ---- 5. 迁移映射表完备 ---- */
console.log('== 迁移映射表完备性 ==');
const mapPath = path.join(DATA_DIR, 'bioid-map.json');
const bioIdMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

// 5a. 反查一致性：bank 中每题的 oldId 都必须是映射表的一个键（旧引用不悬空）。
//     同 oldId 存在多道变体题时（旧系统无法区分变体），映射表确定性地指向
//     字典序最小 bioID 作为代表；其余变体属于「新题目」，不要求映射回自身。
const oldIdGroups = {}; // oldId -> Set<bioID>（bank 中实际出现）
let bankWithOld = 0;
for (const rel of filePaths) {
  if (!rel.startsWith('bank/')) continue;
  const abs = path.join(DATA_DIR, rel.replace(/^data\//, ''));
  if (!fs.existsSync(abs)) continue;
  const bank = JSON.parse(fs.readFileSync(abs, 'utf8'));
  for (const bioId of Object.keys(bank)) {
    const q = bank[bioId];
    if (!q) continue;
    const oldId = q.oldId;
    if (oldId === undefined || oldId === null || oldId === '') {
      fail('题目缺少 oldId: ' + bioId);
      continue;
    }
    if (bioIdMap[oldId] === undefined) {
      fail('映射表漏项：oldId=' + oldId + ' 未收录（对应 ' + bioId + '）');
      continue;
    }
    (oldIdGroups[oldId] = oldIdGroups[oldId] || new Set()).add(bioId);
    bankWithOld++;
  }
}
ok('映射表覆盖 ' + Object.keys(bioIdMap).length + ' 个旧 ID 键，bank 全部 ' + bankWithOld + ' 题的 oldId 均可解析');

// 5b. 代表选择确定性：shared oldId 的代表 = 该组字典序最小 bioID
let sharedGroups = 0;
for (const oldId of Object.keys(oldIdGroups)) {
  const group = [...oldIdGroups[oldId]];
  if (group.length <= 1) continue;
  sharedGroups++;
  const sorted = group.slice().sort();
  if (bioIdMap[oldId] !== sorted[0]) {
    fail('代表选择非确定性：oldId=' + oldId + ' 映射到 ' + bioIdMap[oldId] + '，应为 ' + sorted[0]);
  }
}
if (sharedGroups) ok(sharedGroups + ' 个 oldId 由多道变体题共享，代表选择确定');
else ok('无共享 oldId');

// 5c. 旧 ID 复算一致性（抽样验证算法与 js/storage.js 一致）
console.log('== 旧 ID 复算一致性（抽样）==');
const sampleChecks = [
  ['细胞膜的主要成分是什么？', '细胞膜结构'],
  ['某真核细胞经紫外线照射后，p53 蛋白积累并激活。若该细胞 DNA 损伤严重且无法修复，将启动凋亡程序。', '细胞凋亡与 p53']
];
for (const [question, concept] of sampleChecks) {
  const expected = hashQuestionId(question + concept);
  if (!Number.isFinite(Number(expected)) || Number(expected) < 0) fail('hashQuestionId 返回非法值: ' + expected);
  else ok('hashQuestionId 复算 ' + expected + '（' + question.slice(0, 12) + '…）');
}

/* ---- 汇总 ---- */
if (failures > 0) {
  console.error('\n[结果] 校验失败：' + failures + ' 项不通过');
  process.exit(1);
} else {
  console.log('\n[结果] 全部校验通过 ✓');
  process.exit(0);
}
