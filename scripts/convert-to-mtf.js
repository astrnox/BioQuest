/**
 * BioQuest — 题目转换脚本
 * 将非高考难度的"伪MTF"题目（仅1个正确选项）转为真正的多项判断题（2-3个正确）
 * 使用 Metaso API 进行 AI 改写
 *
 * 用法：
 *   node scripts/convert-to-mtf.js          # 转换并保存到本地文件
 *   node scripts/convert-to-mtf.js --upload  # 转换并直接上传到 Supabase
 */

const fs = require('fs');
const path = require('path');

// ===== 配置 =====
const SUPABASE_URL = 'https://qxehkfucvmx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4ZWhrZnVjdm14dW9qamtkYXF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MjU2ODUsImV4cCI6MjEwMjIwMTY4NX0.lbiJxhFvy0t_J4qSeoP6K0r53M4KaEDSKkRlZu03ze8';
// service_role 密钥绝不硬编码：从环境变量读取
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!SUPABASE_SERVICE_KEY) {
  console.error('ERROR: 请先设置环境变量 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// 使用智谱 GLM-4-Flash（免费，中文能力强）
const AI_API_KEY = process.env.ZHIPU_API_KEY || '';
if (!AI_API_KEY) {
  console.error('ERROR: 请先设置环境变量 ZHIPU_API_KEY');
  process.exit(1);
}
const AI_BASE = 'https://open.bigmodel.cn/api/paas/v4';
const AI_MODEL = 'glm-4-flash';

const BATCH_SIZE = 3;        // 并发请求数
const DELAY_MS = 2000;       // 每批之间的延迟
const MAX_RETRIES = 3;       // 每题最大重试次数

// ===== 工具函数 =====
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

// 从 Supabase 拉取所有非高考题目
async function fetchNonGaokaoQuestions() {
  log('从 Supabase 拉取非高考题目...');
  const url = `${SUPABASE_URL}/rest/v1/questions?select=*&target=neq.high_school&limit=1000&order=created_at.asc`;
  const resp = await fetch(url, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  if (!resp.ok) throw new Error(`Supabase fetch failed: HTTP ${resp.status}`);
  const data = await resp.json();
  log(`拉取到 ${data.length} 道非高考题目`);
  return data;
}

// 调用 Metaso API 改写题目
async function convertQuestion(q, retryCount = 0) {
  // 构建原始题目描述
  const subQs = Array.isArray(q.sub_questions) ? q.sub_questions : [];
  const originalSubs = subQs.map(s => `${s.label}. ${s.text} (${s.answer ? '√' : '×'})`).join('\n');

  const prompt = `你是一位生物学命题专家。请将以下"伪多项判断题"（仅1个正确选项，实质是单选题）改写为真正的多项判断题。

要求：
1. 保持原题考查的生物学知识点不变
2. 题干可适当调整以适应多项判断的语境
3. 生成4个独立的判断语句，其中2-3个为正确（√），1-2个为错误（×）
4. 每个判断语句应考查该知识点的不同方面，避免简单否定
5. 错误语句应具有迷惑性，针对常见误区
6. 解析需详细说明每个判断对错的原因（≥100字）

【原题】
题干：${q.question}
判断项：
${originalSubs}
难度：${q.difficulty}
科目：${q.subject}
知识点：${q.concept || '未标注'}

请严格输出以下JSON格式（不要输出其他内容）：
{
  "question": "改写后的题干",
  "sub_questions": [
    {"label": "A", "text": "判断语句1", "answer": true},
    {"label": "B", "text": "判断语句2", "answer": false},
    {"label": "C", "text": "判断语句3", "answer": true},
    {"label": "D", "text": "判断语句4", "answer": false}
  ],
  "explanation": "详细解析"
}`;

  try {
    const resp = await fetch(`${AI_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: '你是生物学命题专家，擅长将单选题改写为多项判断题。只输出JSON，不要其他内容。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 1500,
        stream: false
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`API HTTP ${resp.status}: ${errText.slice(0, 200)}`);
    }

    const data = await resp.json();

    // 检查智谱错误格式
    if (data.error) {
      throw new Error(`API error: ${data.error.message || data.error.code || JSON.stringify(data.error)}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI 返回内容为空');

    // 解析 JSON（兼容 markdown 代码块包裹）
    let jsonStr = content.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();
    // 去除前后非 JSON 字符
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }

    const converted = JSON.parse(jsonStr);

    // 验证格式
    if (!converted.question || !Array.isArray(converted.sub_questions) || converted.sub_questions.length < 4) {
      throw new Error('AI 返回格式不正确：缺少 question 或 sub_questions');
    }

    // 统计正确/错误数量
    const trueCount = converted.sub_questions.filter(s => s.answer === true).length;
    if (trueCount < 2 || trueCount > 3) {
      if (retryCount < MAX_RETRIES) {
        log(`  ⚠ 题目 ${q.id} 正确项数=${trueCount}，重试 ${retryCount + 1}/${MAX_RETRIES}`);
        return convertQuestion(q, retryCount + 1);
      }
      log(`  ⚠ 题目 ${q.id} 正确项数=${trueCount}，已达重试上限，接受当前结果`);
    }

    // 构建 answer 字段
    const answerStr = converted.sub_questions.map(s => `${s.label}:${s.answer ? 'T' : 'F'}`).join(',');

    return {
      id: q.id,
      type: 'mtf',
      question: converted.question,
      sub_questions: converted.sub_questions.map(s => ({
        label: s.label,
        text: s.text,
        answer: !!s.answer
      })),
      answer: answerStr,
      explanation: converted.explanation || q.explanation || '',
      // 保留原题的元数据
      module: q.module,
      subject: q.subject,
      concept: q.concept,
      difficulty: q.difficulty,
      target: q.target,
      tags: q.tags,
      chart: q.chart,
      year: q.year,
      source: q.source,
      updated_at: new Date().toISOString()
    };
  } catch (err) {
    if (retryCount < MAX_RETRIES) {
      const backoff = 3000 * (retryCount + 1); // 指数退避：3s, 6s, 9s
      log(`  ⚠ 题目 ${q.id} 转换失败：${err.message}，${backoff/1000}s 后重试 ${retryCount + 1}/${MAX_RETRIES}`);
      await sleep(backoff);
      return convertQuestion(q, retryCount + 1);
    }
    log(`  ✗ 题目 ${q.id} 转换失败（已达重试上限）：${err.message}`);
    return null;
  }
}

// 上传到 Supabase
async function uploadToSupabase(questions) {
  log(`开始上传 ${questions.length} 道题目到 Supabase...`);
  let ok = 0, fail = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    try {
      const url = `${SUPABASE_URL}/rest/v1/questions?id=eq.${encodeURIComponent(q.id)}`;
      const resp = await fetch(url, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          question: q.question,
          sub_questions: q.sub_questions,
          answer: q.answer,
          explanation: q.explanation,
          type: 'mtf',
          updated_at: q.updated_at
        })
      });

      if (resp.ok) {
        ok++;
        if (ok % 50 === 0) log(`  已上传 ${ok}/${questions.length}`);
      } else {
        fail++;
        const errText = await resp.text();
        log(`  ✗ 上传失败 ${q.id}: HTTP ${resp.status} ${errText.slice(0, 100)}`);
      }
    } catch (err) {
      fail++;
      log(`  ✗ 上传异常 ${q.id}: ${err.message}`);
    }
    await sleep(200); // 避免 Supabase rate limit
  }

  log(`上传完成：成功 ${ok}，失败 ${fail}`);
  return { ok, fail };
}

// ===== 主流程 =====
async function main() {
  const shouldUpload = process.argv.includes('--upload');

  // 1. 拉取题目
  const questions = await fetchNonGaokaoQuestions();

  // 2. 检查已有结果（支持断点续传）
  const outputFile = path.join(__dirname, 'converted-questions.json');
  let existing = [];
  if (fs.existsSync(outputFile)) {
    try {
      existing = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
      log(`发现已有结果文件，已完成 ${existing.length} 题（将跳过）`);
    } catch (e) {}
  }
  const existingIds = new Set(existing.map(q => q.id));
  const todo = questions.filter(q => !existingIds.has(q.id));
  log(`待转换：${todo.length} 题（已跳过 ${existingIds.size} 题）`);

  if (todo.length === 0 && existing.length > 0) {
    log('所有题目已转换完成！');
    if (shouldUpload) {
      await uploadToSupabase(existing);
    } else {
      log('使用 --upload 参数上传到 Supabase');
    }
    return;
  }

  // 3. 分批转换
  const results = [...existing];
  let processed = 0;

  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE);
    log(`处理批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(todo.length / BATCH_SIZE)} (${batch.length} 题)...`);

    const batchResults = await Promise.all(batch.map(q => convertQuestion(q)));

    batchResults.forEach((r, idx) => {
      processed++;
      if (r) {
        results.push(r);
        log(`  ✓ [${processed}/${todo.length}] ${batch[idx].id} 转换成功`);
      } else {
        log(`  ✗ [${processed}/${todo.length}] ${batch[idx].id} 转换失败`);
      }
    });

    // 保存中间结果
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));

    if (i + BATCH_SIZE < todo.length) {
      await sleep(DELAY_MS);
    }
  }

  log(`\n转换完成：成功 ${results.length}，失败 ${todo.length - (results.length - existing.length)}`);
  log(`结果已保存到 ${outputFile}`);

  // 4. 审核摘要
  const trueCounts = {};
  results.forEach(q => {
    const tc = (q.answer || '').match(/:T/g);
    const c = tc ? tc.length : 0;
    trueCounts[c] = (trueCounts[c] || 0) + 1;
  });
  log('正确项数分布：');
  Object.keys(trueCounts).sort().forEach(k => log(`  ${k} 个正确：${trueCounts[k]} 题`));

  // 5. 上传
  if (shouldUpload) {
    await uploadToSupabase(results);
  } else {
    log('\n使用 --upload 参数上传到 Supabase：node scripts/convert-to-mtf.js --upload');
  }
}

main().catch(err => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});
