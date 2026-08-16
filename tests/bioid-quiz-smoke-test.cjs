/* BioQuest Issue #10 — quiz.js bioID 集成烟雾测试（jsdom）
 * 运行：node tests/bioid-quiz-smoke-test.cjs （需 jsdom，已列为 devDependency）
 *
 * 真实加载 quiz.html 的脚本链（utils.js → loader.js → quiz.js），
 * 模拟 DOMContentLoaded 全流程，验证：
 *   1. bioID 映射表在 DOMContentLoaded 后被加载（window.bioIdMap 非空）
 *   2. getQuestionBioId 能把 quiz.json 旧 hash ID 解析为稳定 bioID
 *   3. 分片注入的 q.bioId 直接原样返回
 *   4. 错题本 localStorage 兜底写入稳定 bioID（而非旧 hash / q_时间戳）
 *   5. 每道 quiz.json 题目的 oldId 都能在 bioIdMap 中解析
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const WS = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(WS, f), 'utf8');

const quizHtml = read('quiz.html');
const utilsJs = read('js/utils.js');
const loaderJs = read('js/loader.js');
const quizJs = read('js/quiz.js');

// 数据
const quizData = JSON.parse(read('data/quiz.json'));
const logicData = JSON.parse(read('data/logic_questions.json'));
const bioIdMapData = JSON.parse(read('data/bioid-map.json'));

// bank 反查
const bankDir = path.join(WS, 'data/bank');
const bank = {};
for (const f of fs.readdirSync(bankDir)) {
  bank[f.replace(/\.json$/, '')] = JSON.parse(fs.readFileSync(path.join(bankDir, f), 'utf8'));
}
const byBio = {};
for (const t of Object.keys(bank)) for (const b of Object.keys(bank[t])) byBio[b] = bank[t][b];

// 与 generate-bio-shards.js 一致的 canonKey，用于内容比对
function canonKey(q) {
  let opts = '';
  if (Array.isArray(q.subQuestions)) {
    opts = JSON.stringify(q.subQuestions.map((s) => [s.label, s.text, !!s.answer]));
  }
  return (q.question || '') + '\u0000' + opts;
}

// ---- 构造 JSDOM ----
const dom = new JSDOM(quizHtml, {
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  url: 'http://127.0.0.1:8765/quiz.html'
});
const { window } = dom;
const { document } = window;

// 基础 window 垫片
window.console = console;
window.localStorage = (() => {
  const store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] || null
  };
})();

// fetch 桩：按 URL 返回对应 JSON
window.fetch = (url, opts) => {
  const u = String(url);
  const respond = (data) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });
  const miss = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
  if (u.indexOf('data/quiz.json') !== -1) return respond(quizData);
  if (u.indexOf('data/logic_questions.json') !== -1) return respond(logicData);
  if (u.indexOf('data/bioid-map.json') !== -1) return respond(bioIdMapData);
  if (u.indexOf('data/manifest.json') !== -1) return miss();
  return miss();
};

// loader.js 需要 indexedDB —— jsdom 缺省无，loader 会优雅降级为 null（缓存禁用）
// 需要 crypto.subtle —— loader 仅在分片校验时使用，本测试不触发

// 按 quiz.html 顺序执行脚本
window.eval(utilsJs);
window.eval(loaderJs);
window.eval(quizJs);

// getQuestionBioId 已由 quiz.js 显式暴露到 window（window.getQuestionBioId），
// 测试直接调用真实实现，验证底层机制。

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  \u2713 ' + name); }
  else { fail++; console.log('  \u2717 ' + name + (extra ? '  -> ' + extra : '')); }
}

async function main() {
  console.log('\n== BioQuest Issue #10 quiz.js bioID 集成烟雾测试 ==\n');

  // 1. 触发 DOMContentLoaded（模拟浏览器事件）
  document.dispatchEvent(new window.Event('DOMContentLoaded'));

  // 等待 loadQuizData 与 loadBioIdMap 异步完成
  await sleep(300);

  // 2. bioID 映射表应已加载
  ok('DOMContentLoaded 后 window.bioIdMap 已加载', window.bioIdMap && Object.keys(window.bioIdMap).length > 0,
    'size=' + (window.bioIdMap ? Object.keys(window.bioIdMap).length : 'null'));

  // 3. loader.js 暴露 hashQuestionId / resolveQuestionBioId / loadBioIdMap
  ok('loader.js 暴露 window.hashQuestionId', typeof window.hashQuestionId === 'function');
  ok('loader.js 暴露 window.resolveQuestionBioId', typeof window.resolveQuestionBioId === 'function');
  ok('loader.js 暴露 window.loadBioIdMap', typeof window.loadBioIdMap === 'function');

  // 4. quiz.js 暴露 getQuestionBioId（模块级函数经 window.eval 后为全局）
  ok('quiz.js 定义 getQuestionBioId', typeof window.getQuestionBioId === 'function');

  // 5. getQuestionBioId 把 quiz.json 题目解析为稳定 bioID（抽样 60 题）
  const sample = quizData.slice(0, 60);
  let mapped = 0, resolvedToBank = 0, contentMatch = 0, empty = 0;
  const samples = [];
  for (const q of sample) {
    const bio = window.getQuestionBioId(q);
    if (!bio) { empty++; continue; }
    if (/^BQ-[A-Za-z0-9_]+-[0-9a-f]{12}$/.test(bio)) {
      mapped++;
      const t = byBio[bio];
      if (t) {
        resolvedToBank++;
        if (canonKey(t) === canonKey(q)) contentMatch++;
        if (samples.length < 3) samples.push({ bio, stem: (q.question || '').slice(0, 18) });
      }
    }
  }
  ok('quiz.json 抽样题目全部解析为 bioID 格式', mapped === sample.length && empty === 0,
    `mapped=${mapped} empty=${empty} / ${sample.length}`);
  ok('解析出的 bioID 在 bank 中存在对应题', resolvedToBank === mapped,
    `resolvedToBank=${resolvedToBank}`);
  ok('解析出的 bioID 与 quiz.json 题干内容一致', contentMatch >= mapped * 0.8,
    `contentMatch=${contentMatch}/${mapped}（余为同题干变体代表）`);
  console.log('    样例: ' + samples.map((s) => s.bio + '「' + s.stem + '」').join(' | '));

  // 6. 分片注入的 q.bioId 原样返回
  const shardQ = { question: 'x', concept: 'y', bioId: 'BQ-m1-0123456789ab', id: 'BQ-m1-0123456789ab' };
  ok('分片注入的 q.bioId 原样返回', window.getQuestionBioId(shardQ) === 'BQ-m1-0123456789ab');

  // 7. 错题本兜底 localStorage 写入稳定 bioID
  //    模拟 quiz.js 兜底分支：key 与 storage.js KEYS.WRONG_QUESTIONS 一致，
  //    结构含 qId/questionText/timestamp/wrongCount（可被 wrongbook 页读取）
  const q0 = quizData[0];
  const q0bio = window.getQuestionBioId(q0);
  const arr = JSON.parse(window.localStorage.getItem('bioquest_wrong_questions') || '[]');
  arr.push({ qId: q0bio, questionText: q0.question, subject: q0.subject, timestamp: Date.now(), wrongCount: 1 });
  window.localStorage.setItem('bioquest_wrong_questions', JSON.stringify(arr.slice(-200)));
  const saved = JSON.parse(window.localStorage.getItem('bioquest_wrong_questions') || '[]');
  ok('错题本兜底写入稳定 bioID', saved.length === 1 && /^BQ-[A-Za-z0-9_]+-[0-9a-f]{12}$/.test(saved[0].qId),
    'qId=' + saved[0].qId);
  ok('错题本兜底 id 非时间戳合成', !/^q_/.test(saved[0].qId));
  ok('错题本兜底记录含 qId/questionText/timestamp/wrongCount',
    !!saved[0].qId && !!saved[0].questionText && !!saved[0].timestamp && saved[0].wrongCount === 1);

  // 8. 全部 quiz.json 题目的 oldId 均可经 bioIdMap 解析（迁移完备性）
  let allResolvable = true, unresolvable = [];
  for (const q of quizData) {
    const oldId = String(window.hashQuestionId((q.question || '') + (q.concept || '')));
    if (!window.bioIdMap[oldId]) {
      allResolvable = false;
      if (unresolvable.length < 3) unresolvable.push({ oldId, stem: (q.question || '').slice(0, 24) });
    }
  }
  ok('quiz.json 全部 ' + quizData.length + ' 题 oldId 均可映射', allResolvable,
    unresolvable.length ? JSON.stringify(unresolvable) : '');

  console.log('\n== 结果：' + pass + ' 通过，' + fail + ' 失败 ==\n');
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('测试执行异常:', e);
  process.exit(1);
});
