/**
 * MTF 语义一致性回归测试（PR #165 审计修复）
 *
 * 背景：
 * - 逻辑题库(data/logic_questions.json)的 type==='mtf' 题目以 Options 数组 + mtfTruth
 *   作为每条陈述真假的唯一权威来源，answer 仅为旧单选题遗留索引；
 * - practice.js / quiz.js 各自维护一份 getEffectiveSubQuestions；
 * - 曾发现 quiz.js 忽略 mtfTruth（仅按 answer 索引判定），导致测验页与练习页
 *   对同一道题（如 M2-01-9875a511）判分完全相反。本测试锁定两者一致。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

/** 从文件文本中提取命名函数的源码并求值（直接测试页面真实实现，不复制逻辑） */
function extractFunction(fileRel, fnName) {
  const src = fs.readFileSync(path.join(ROOT, fileRel), 'utf8');
  const marker = 'function ' + fnName + '(';
  const start = src.indexOf(marker);
  expect(start).toBeGreaterThan(-1);
  // 从函数头开始，用大括号配平找到函数体结尾
  let depth = 0;
  let end = -1;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  expect(end).toBeGreaterThan(start);
  const fnSrc = src.slice(start, end);
  // eslint-disable-next-line no-new-func
  return new Function('return (' + fnSrc + ')')();
}

const practiceEffective = extractFunction('js/pages/practice.js', 'getEffectiveSubQuestions');
const quizEffective = extractFunction('js/pages/quiz.js', 'getEffectiveSubQuestions');

describe('逻辑推理 MTF（type="mtf"）语义一致性', () => {
  const logic = loadJson('data/logic_questions.json');
  const mtfQs = logic.filter(q => q.type === 'mtf');

  test('逻辑题库存在 MTF 题目（32 道）', () => {
    expect(mtfQs.length).toBeGreaterThan(0);
  });

  test('practice.js 与 quiz.js 的 getEffectiveSubQuestions 输出完全一致', () => {
    mtfQs.forEach(q => {
      const p = practiceEffective(q);
      const z = quizEffective(q);
      expect(z.map(s => s.answer)).toEqual(p.map(s => s.answer));
      expect(z.map(s => s.label)).toEqual(p.map(s => s.label));
      expect(z.map(s => s.text)).toEqual(p.map(s => s.text));
    });
  });

  test('两页实现都优先采用 mtfTruth，且与 mtfTruth 完全吻合', () => {
    mtfQs.forEach(q => {
      expect(Array.isArray(q.mtfTruth)).toBe(true);
      expect(q.mtfTruth.length).toBe(q.options.length);
      const z = quizEffective(q);
      z.forEach((s, i) => {
        expect(s.text).toBe(String(q.options[i]));
        expect(s.answer).toBe(q.mtfTruth[i]);
      });
    });
  });

  test('样例题 M2-01-9875a511：answer 索引与 mtfTruth 相反时两页判分一致且正确', () => {
    const q = mtfQs.find(x => (x.bioId || x.id) === 'M2-01-9875a511');
    expect(q).toBeTruthy();
    const z = quizEffective(q);
    expect(z.map(s => s.answer)).toEqual([true, true, false, true]);
    // answer=2（旧单选题「最不合理的是C」）不能反向覆盖 mtfTruth
    expect(z[2].answer).toBe(false);
  });
});

describe('基础知识题库 MTF 数据完整性', () => {
  const quiz = loadJson('data/quiz.json');
  const arr = Array.isArray(quiz) ? quiz : (quiz['题库'] || []);

  test('全部为题干的 subQuestions MTF 且每条 answer 为布尔', () => {
    arr.forEach(q => {
      expect(Array.isArray(q.subQuestions)).toBe(true);
      q.subQuestions.forEach(s => {
        expect(typeof s.answer).toBe('boolean');
        expect(typeof s.text).toBe('string');
      });
    });
  });
});