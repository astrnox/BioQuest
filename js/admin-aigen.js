/**
 * BioQuest - 管理后台 · AI 出题子模块（Issue #17 自 admin.js 拆分）
 * 由 admin.js 的 loadTabContent 在切换到「AI 出题」标签时动态注入加载。
 * 依赖：js/admin.js（核心）。
 */

/* ===== AI 出题功能 ===== */
var _aiGenState = {
  generating: false,
  generatedQuestions: [],
  currentTopic: '',
  currentModule: 'module1',
  currentDifficulty: 'league',
  needImage: true
};

function renderAiGenTab(container) {
  _aiGenState.generatedQuestions = [];

  var hasImg = typeof window.AiClient !== 'undefined' && typeof window.AiClient.generateImage === 'function';
  var hasChat = typeof window.AiClient !== 'undefined' && typeof window.AiClient.chat === 'function';

  container.innerHTML = `
    <div class="admin-section">
      <div class="admin-section-header">
        <h3>AI 智能出题</h3>
        <p style="color:#666;margin-top:4px;font-size:13px;">
          输入主题/知识点，AI 自动生成生物题目（支持配图），预览后可直接入库到 Supabase。
        </p>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:16px;">
        <!-- 左：配置面板 -->
        <div style="background:#f8f9fa;border-radius:12px;padding:20px;">
          <h4 style="margin:0 0 16px;font-size:15px;">出题配置</h4>

          <div style="margin-bottom:14px;">
            <label style="font-size:13px;color:#555;display:block;margin-bottom:6px;font-weight:600;">知识点/主题 *</label>
            <input type="text" id="aigen-topic" placeholder="例如：细胞呼吸、光合作用、遗传学连锁互换..."
              style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;">
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
            <div>
              <label style="font-size:13px;color:#555;display:block;margin-bottom:6px;font-weight:600;">模块</label>
              <select id="aigen-module" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;">
                <option value="module1">模块1：生化细胞</option>
                <option value="module2">模块2：植物动物</option>
                <option value="module3">option value="module3">模块3：遗传进化</option>
                <option value="module4">模块4：生态行为</option>
              </select>
            </div>
            <div>
              <label style="font-size:13px;color:#555;display:block;margin-bottom:6px;font-weight:600;">难度</label>
              <select id="aigen-difficulty" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;">
                <option value="basic">基础</option>
                <option value="league" selected>联赛</option>
                <option value="national">国赛</option>
                <option value="ibo">IBO</option>
              </select>
            </div>
          </div>

          <div style="margin-bottom:14px;">
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
              <input type="checkbox" id="aigen-need-image" checked style="width:16px;height:16px;">
              <span>生成题目配图（文生图）</span>
            </label>
            ${!hasImg ? '<div style="font-size:12px;color:#c62828;margin-top:4px;">⚠️ 文生图需要配置 AI API Key（推荐智谱 CogView-3-Flash，免费）</div>' : ''}
          </div>

          <div style="margin-bottom:14px;">
            <label style="font-size:13px;color:#555;display:block;margin-bottom:6px;font-weight:600;">题目数量</label>
            <select id="aigen-count" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;">
              <option value="1">1 题</option>
              <option value="3" selected>3 题</option>
              <option value="5">5 题</option>
            </select>
          </div>

          <button id="aigen-generate-btn"
            style="width:100%;padding:12px;background:linear-gradient(135deg,#5a7d5c,#3a6b4a);color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
            AI 生成题目
          </button>

          <div id="aigen-status" style="margin-top:12px;display:none;"></div>
          <div id="aigen-progress" style="display:none;margin-top:12px;">
            <div style="font-size:13px;color:#555;margin-bottom:6px;" id="aigen-progress-text">初始化中...</div>
            <div style="height:6px;background:#e0e0e0;border-radius:3px;overflow:hidden;">
              <div id="aigen-progress-bar" style="height:100%;background:linear-gradient(90deg,#5a7d5c,#3a6b4a);width:0%;transition:width .3s;"></div>
            </div>
          </div>
        </div>

        <!-- 右：预览队列 -->
        <div>
          <h4 style="margin:0 0 12px;font-size:15px;">生成预览 (<span id="aigen-count">0</span>)</h4>
          <div id="aigen-queue" style="max-height:600px;overflow-y:auto;">
            <div style="padding:40px 20px;text-align:center;color:#999;font-size:13px;background:#f8f9fa;border-radius:12px;">
              配置左侧参数后点击「AI 生成题目」开始
            </div>
          </div>
          <div id="aigen-batch-actions" style="display:none;margin-top:12px;gap:8px;display:none;">
            <button id="aigen-approve-all-btn" class="admin-btn-primary" style="flex:1;">
              ✓ 全部入库到 Supabase
            </button>
            <button id="aigen-clear-btn" class="admin-btn-secondary" style="flex:1;">
              清空
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // 修复模块选项的HTML错误
  var moduleSel = document.getElementById('aigen-module');
  if (moduleSel) {
    moduleSel.innerHTML = `
      <option value="module1">模块1：生化细胞</option>
      <option value="module2">模块2：植物动物</option>
      <option value="module3">模块3：遗传进化</option>
      <option value="module4">模块4：生态行为</option>
    `;
  }

  document.getElementById('aigen-generate-btn').addEventListener('click', _aiGenGenerate);
  document.getElementById('aigen-clear-btn')?.addEventListener('click', function() {
    _aiGenState.generatedQuestions = [];
    _aiGenUpdateQueueUI();
  });
  document.getElementById('aigen-approve-all-btn')?.addEventListener('click', _aiGenApproveAll);
}

function _aiGenShowStatus(text, type, duration) {
  duration = duration || 5000;
  var el = document.getElementById('aigen-status');
  if (!el) return;
  var colors = {
    info: { bg: '#e3f2fd', fg: '#1565c0', border: '#90caf9' },
    success: { bg: '#e8f5e9', fg: '#2e7d32', border: '#81c784' },
    error: { bg: '#ffebee', fg: '#c62828', border: '#ef9a9a' }
  };
  var c = colors[type] || colors.info;
  el.style.cssText = 'display:block;padding:10px 12px;border-radius:8px;background:' + c.bg + ';color:' + c.fg + ';border:1px solid ' + c.border + ';font-size:13px;';
  el.textContent = text;
  if (duration > 0) setTimeout(function() { if (el.textContent === text) el.style.display = 'none'; }, duration);
}

function _aiGenShowProgress(text, pct) {
  var wrap = document.getElementById('aigen-progress');
  var bar = document.getElementById('aigen-progress-bar');
  var txt = document.getElementById('aigen-progress-text');
  if (!wrap || !bar || !txt) return;
  wrap.style.display = 'block';
  txt.textContent = text;
  if (typeof pct === 'number') bar.style.width = Math.min(100, Math.max(0, pct)) + '%';
}

function _aiGenHideProgress() {
  var wrap = document.getElementById('aigen-progress');
  if (wrap) wrap.style.display = 'none';
}

async function _aiGenGenerate() {
  if (_aiGenState.generating) return;

  var topic = (document.getElementById('aigen-topic')?.value || '').trim();
  var module = document.getElementById('aigen-module')?.value || 'module1';
  var difficulty = document.getElementById('aigen-difficulty')?.value || 'league';
  var needImage = document.getElementById('aigen-need-image')?.checked ?? true;
  var count = parseInt(document.getElementById('aigen-count')?.value || '3', 10);

  if (!topic) {
    _aiGenShowStatus('请输入知识点/主题', 'error');
    return;
  }

  var btn = document.getElementById('aigen-generate-btn');
  btn.disabled = true;
  btn.style.opacity = '0.6';
  _aiGenState.generating = true;
  _aiGenShowStatus('AI 出题中，请稍候...', 'info', 0);

  try {
    var moduleLabels = { module1: '生化细胞', module2: '植物动物', module3: '遗传进化', module4: '生态行为' };
    var diffLabels = { basic: '基础', league: '联赛', national: '国赛', ibo: 'IBO' };

    var systemPrompt = '你是一位经验丰富的生物竞赛出题专家。请根据用户给的知识点，生成高质量的生物竞赛题。\n\n' +
      '要求：\n' +
      '1. 生成的题目必须是判断题形式，包含4个子问题（sub_questions），每个子问题是一个陈述，用户判断对/错\n' +
      '2. 题目内容要准确，符合生物竞赛难度\n' +
      '3. 如果用户要求配图，请生成一个适合作为题目的配图提示词（image_prompt字段），用于AI文生图。配图应该是生物结构示意图、过程图、图表等教学用图\n' +
      '4. 严格返回JSON格式，不要加任何其他说明文字\n\n' +
      '返回格式（数组，count道题）：\n' +
      '```json\n' +
      '[\n' +
      '  {\n' +
      '    "question": "题干（完整的题目描述）",\n' +
      '    "sub_questions": [\n' +
      '      {"text": "陈述1", "answer": true},\n' +
      '      {"text": "陈述2", "answer": false},\n' +
      '      {"text": "陈述3", "answer": true},\n' +
      '      {"text": "陈述4", "answer": false}\n' +
      '    ],\n' +
      '    "answer": "答案说明",\n' +
      '    "explanation": "详细解析",\n' +
      '    "subject": "细分学科（如细胞生物学/遗传学/生态学等）",\n' +
      '    "concept": "核心概念",\n' +
      '    "image_prompt": "配图提示词（英文，详细描述生物结构图，适合文生图模型理解。如果不需要配图则为空字符串）"\n' +
      '  }\n' +
      ']\n' +
      '```';

    var userPrompt = '请生成 ' + count + ' 道关于「' + topic + '」的生物' + diffLabels[difficulty] + '难度题目，模块：' + moduleLabels[module] + '。' +
      (needImage ? '请为题目生成合适的配图提示词。' : '不需要配图，image_prompt留空。');

    _aiGenShowProgress('AI 生成题目内容...', 10);

    var chatResult;
    if (window.AiClient && window.AiClient.chat) {
      var canUseCheck = window.AiClient.canUse();
      if (!canUseCheck.ok) {
        throw new Error(canUseCheck.reason);
      }
      chatResult = await window.AiClient.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        maxTokens: AI_GEN_MAX_TOKENS
      });
    } else {
      throw new Error('AI 客户端未就绪');
    }

    var content = '';
    try {
      content = chatResult.choices[0].message.content || '';
    } catch(e) {
      throw new Error('AI 返回格式异常');
    }

    content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
    var questions;
    try {
      questions = JSON.parse(content);
    } catch(e) {
      console.error('[AI Gen] JSON解析失败，原始内容:', content);
      var jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('AI 返回内容不是有效的 JSON 格式');
      }
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('AI 未生成有效题目');
    }

    var generated = [];
    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      var qid = 'ai_' + module + '_' + Date.now().toString(36) + '_' + i;
      var moduleDb = module.replace('module', 'module_');
      var labels = ['A', 'B', 'C', 'D', 'E', 'F'];

      var subQs = [];
      if (Array.isArray(q.sub_questions)) {
        for (var si = 0; si < q.sub_questions.length && si < 6; si++) {
          var sq = q.sub_questions[si];
          var ans = false;
          if (sq.answer !== undefined) ans = !!sq.answer;
          else if (sq.is_true !== undefined) ans = !!sq.is_true;
          subQs.push({
            label: labels[si],
            text: sq.text || '',
            answer: ans
          });
        }
      }

      var item = {
        id: qid,
        question: q.question || '',
        sub_questions: subQs,
        answer: q.answer || '',
        explanation: q.explanation || '',
        module: moduleDb,
        type: 'mtf',
        difficulty: difficulty,
        subject: q.subject || topic,
        concept: q.concept || topic,
        tags: ['ai_generated', moduleDb],
        chart: '',
        image_prompt: q.image_prompt || '',
        source: 'ai_generated'
      };

      _aiGenShowProgress('处理题目 ' + (i+1) + '/' + questions.length + '...', 20 + (i/questions.length) * (needImage ? 50 : 70));

      if (needImage && q.image_prompt && window.AiClient && window.AiClient.generateImage) {
        try {
          _aiGenShowProgress('生成配图 ' + (i+1) + '/' + questions.length + '...', 20 + (i/questions.length) * 50);
          var imgResult = await window.AiClient.generateImage({
            prompt: 'Educational biology diagram for exam question, white background, clear scientific illustration, textbook style, high quality, detailed: ' + q.image_prompt,
            size: '1024x1024'
          });
          if (imgResult && imgResult.url) {
            _aiGenShowProgress('上传配图到 Supabase Storage...', 20 + (i/questions.length) * 50 + 20);
            var uploadResult = await window.uploadQuestionImage(imgResult.url, qid);
            if (uploadResult && uploadResult.url) {
              item.chart = uploadResult.url;
            } else if (imgResult.url) {
              item.chart = imgResult.url;
            }
          }
        } catch(imgErr) {
          console.warn('[AI Gen] 生成/上传配图失败:', imgErr);
        }
      }

      generated.push(item);
    }

    _aiGenState.generatedQuestions = _aiGenState.generatedQuestions.concat(generated);
    _aiGenUpdateQueueUI();
    _aiGenShowProgress('完成！', 100);
    setTimeout(_aiGenHideProgress, 1000);
    _aiGenShowStatus('✅ 成功生成 ' + generated.length + ' 道题目！请预览后入库。', 'success');

  } catch(err) {
    console.error('[AI Gen] 生成失败:', err);
    _aiGenShowStatus('生成失败：' + (err.message || err), 'error', 8000);
    _aiGenHideProgress();
  } finally {
    btn.disabled = false;
    btn.style.opacity = '1';
    _aiGenState.generating = false;
  }
}

function _aiGenUpdateQueueUI() {
  var queue = document.getElementById('aigen-queue');
  var countEl = document.getElementById('aigen-count');
  var batchActions = document.getElementById('aigen-batch-actions');
  if (!queue || !countEl) return;

  var qs = _aiGenState.generatedQuestions;
  countEl.textContent = qs.length;

  if (batchActions) {
    batchActions.style.display = qs.length > 0 ? 'flex' : 'none';
  }

  if (qs.length === 0) {
    queue.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#999;font-size:13px;background:#f8f9fa;border-radius:12px;">配置左侧参数后点击「AI 生成题目」开始</div>';
    return;
  }

  queue.innerHTML = qs.map(function(q, idx) {
    var subHtml = '';
    if (Array.isArray(q.sub_questions)) {
      subHtml = q.sub_questions.map(function(sq, si) {
        var letter = sq.label || String.fromCharCode(65 + si);
        var ans = false;
        if (sq.answer !== undefined) ans = !!sq.answer;
        else if (sq.is_true !== undefined) ans = !!sq.is_true;
        var tfIcon = ans ? '✓' : '✗';
        var tfColor = ans ? '#2e7d32' : '#c62828';
        return '<div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;font-size:13px;border-bottom:1px dashed #eee;">' +
          '<span style="font-weight:600;color:#555;min-width:20px;">' + letter + '.</span>' +
          '<span style="flex:1;">' + escapeHtml(sq.text || '') + '</span>' +
          '<span style="color:' + tfColor + ';font-weight:600;">' + tfIcon + '</span>' +
        '</div>';
      }).join('');
    }

    var imgPreview = '';
    if (q.chart) {
      imgPreview = '<div style="margin:8px 0;"><img src="' + escapeHtml(q.chart) + '" style="max-width:100%;max-height:200px;border-radius:8px;border:1px solid #ddd;" alt="题目配图"></div>';
    } else if (q.image_prompt) {
      imgPreview = '<div style="margin:8px 0;padding:8px;background:#fff3e0;border-radius:6px;font-size:12px;color:#e65100;">⚠️ 配图未生成/上传</div>';
    }

    return '<div style="border:1px solid #e0e0e0;border-radius:10px;padding:14px;margin-bottom:10px;background:#fff;">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
          '<span style="padding:2px 8px;background:#e8f5e9;color:#2e7d32;border-radius:4px;font-size:11px;">AI生成</span>' +
          '<span style="padding:2px 8px;background:#e3f2fd;color:#1565c0;border-radius:4px;font-size:11px;">' + escapeHtml(q.module) + '</span>' +
          '<span style="padding:2px 8px;background:#f3e5f5;color:#7b1fa2;border-radius:4px;font-size:11px;">' + escapeHtml(q.difficulty) + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:6px;">' +
          '<button class="aigen-del-btn" data-idx="' + idx + '" style="padding:4px 10px;border:1px solid #ef9a9a;background:#ffebee;color:#c62828;border-radius:6px;cursor:pointer;font-size:12px;">删除</button>' +
          '<button class="aigen-approve-btn" data-idx="' + idx + '" style="padding:4px 10px;border:none;background:#5a7d5c;color:#fff;border-radius:6px;cursor:pointer;font-size:12px;">入库</button>' +
        '</div>' +
      '</div>' +
      '<div style="font-size:14px;margin-bottom:8px;line-height:1.5;">' + escapeHtml(q.question) + '</div>' +
      imgPreview +
      subHtml +
      '<div style="margin-top:8px;padding:8px;background:#f5f5f5;border-radius:6px;font-size:12px;color:#555;">' +
        '<strong>解析：</strong>' + escapeHtml(q.explanation || q.answer || '') +
      '</div>' +
      (q.subject ? '<div style="margin-top:4px;font-size:11px;color:#888;">学科：' + escapeHtml(q.subject) + ' | 概念：' + escapeHtml(q.concept || '') + '</div>' : '') +
    '</div>';
  }).join('');

  queue.querySelectorAll('.aigen-del-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      var idx = parseInt(e.target.getAttribute('data-idx'));
      _aiGenState.generatedQuestions.splice(idx, 1);
      _aiGenUpdateQueueUI();
    });
  });

  queue.querySelectorAll('.aigen-approve-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      var idx = parseInt(e.target.getAttribute('data-idx'));
      _aiGenApproveItem(idx);
    });
  });
}

async function _aiGenApproveItem(idx) {
  var q = _aiGenState.generatedQuestions[idx];
  if (!q) return;

  try {
    var subQuestions = [];
    var labels = ['A', 'B', 'C', 'D', 'E', 'F'];
    if (Array.isArray(q.sub_questions)) {
      for (var i = 0; i < q.sub_questions.length && i < 6; i++) {
        var sq = q.sub_questions[i];
        var ans = false;
        if (sq.answer !== undefined) ans = !!sq.answer;
        else if (sq.is_true !== undefined) ans = !!sq.is_true;
        subQuestions.push({
          label: sq.label || labels[i],
          text: sq.text || '',
          answer: ans
        });
      }
    }

    var moduleVal = q.module || 'module_1';
    if (moduleVal.match(/^module[0-9]$/)) {
      moduleVal = moduleVal.replace('module', 'module_');
    }

    var insertData = {
      id: q.id,
      module: moduleVal,
      type: q.type || 'mtf',
      question: q.question || '',
      subject: q.subject || '',
      concept: q.concept || '',
      difficulty: q.difficulty || 'medium',
      answer: q.answer || '',
      explanation: q.explanation || '',
      options: [],
      sub_questions: subQuestions,
      tags: q.tags || ['ai_generated', moduleVal],
      chart: q.chart || '',
      source: q.source || 'ai_generated'
    };

    var result = await window.sbInsert('questions', insertData);
    if (result.error) {
      throw new Error(result.error.message || JSON.stringify(result.error));
    }

    _aiGenState.generatedQuestions.splice(idx, 1);
    _aiGenUpdateQueueUI();
    _aiGenShowStatus('✓ 题目已成功入库到 Supabase！', 'success', 3000);
  } catch(err) {
    console.error('[AI Gen] 入库失败:', err);
    _aiGenShowStatus('入库失败：' + (err.message || err), 'error', 6000);
  }
}

async function _aiGenApproveAll() {
  if (_aiGenState.generatedQuestions.length === 0) return;
  if (!confirm('确认将 ' + _aiGenState.generatedQuestions.length + ' 道题目全部入库到 Supabase？')) return;

  var ok = 0, fail = 0;
  for (var i = _aiGenState.generatedQuestions.length - 1; i >= 0; i--) {
    try {
      await _aiGenApproveItem(i);
      ok++;
    } catch(e) {
      fail++;
    }
  }
  _aiGenShowStatus('批量入库完成：成功 ' + ok + ' 题，失败 ' + fail + ' 题', fail > 0 ? 'info' : 'success');
}
