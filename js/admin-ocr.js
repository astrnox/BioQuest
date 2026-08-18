/**
 * BioQuest - 管理后台 · OCR 录题子模块（Issue #17 自 admin.js 拆分）
 * 由 admin.js 的 loadTabContent 在切换到「OCR 录题」标签时动态注入加载。
 * 依赖：js/admin.js（核心）；识别走 AI vision 接口（无本地重依赖）。
 */

/* ===== OCR 录题标签 ===== */
function renderOcrTab(container) {
  // 缓存：审核中题目（每次切到 tab 都清空，避免状态污染）
  _ocrPendingQueue = [];

  container.innerHTML = `
    <div class="admin-section">
      <div class="admin-section-header">
        <h3>OCR 拍照录题</h3>
        <p style="color:#666;margin-top:4px;font-size:13px;">
          上传题目图片（生物竞赛题目、试卷截图等），AI 自动识别文字并生成选项/答案/解析。
          识别后可逐题审核编辑，确认后入库。
        </p>
      </div>

      <div class="admin-ocr-layout" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
        <!-- 左：上传 + 处理 -->
        <div class="admin-ocr-left">
          <div id="ocr-dropzone" class="ocr-dropzone" style="
            border:2px dashed #5a7d5c;border-radius:12px;padding:32px 20px;text-align:center;
            background:rgba(90,125,92,0.05);cursor:pointer;transition:all .2s;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#5a7d5c" stroke-width="1.5" style="margin:0 auto 8px;display:block;">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <div style="font-weight:600;color:#3a6b4a;">点击或拖拽上传题目图片</div>
            <div style="font-size:12px;color:#888;margin-top:4px;">支持 PNG / JPG / WEBP / GIF · 单张 ≤ 5MB</div>
            <input type="file" id="ocr-file-input" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" style="display:none;" />
          </div>

          <div style="margin-top:12px;display:flex;gap:8px;">
            <button id="ocr-batch-btn" class="admin-btn-secondary" style="flex:1;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              批量上传（最多 10 张）
            </button>
            <button id="ocr-clear-btn" class="admin-btn-secondary" style="flex:1;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              清空
            </button>
          </div>

          <div style="margin-top:16px;padding:10px 12px;background:#fff8e1;border-radius:8px;font-size:12px;color:#8b6e00;">
            <strong>提示：</strong>图片识别依赖 vision 模型，识别后请仔细核对题干和选项，确认无误后入库。
            题目入库时会自动打上 <code>ocr_uploaded</code> 标签，可通过同步模块追溯。
          </div>

          <div id="ocr-status" style="margin-top:12px;display:none;"></div>
        </div>

        <!-- 右：识别进度 + 队列 -->
        <div class="admin-ocr-right">
          <h4 style="margin:0 0 12px;">识别进度</h4>
          <div id="ocr-progress" style="display:none;background:#f5f5f5;padding:12px;border-radius:8px;margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span id="ocr-progress-text">处理中...</span>
              <span id="ocr-progress-pct" style="font-weight:600;color:#3a6b4a;">0%</span>
            </div>
            <div style="height:6px;background:#e0e0e0;border-radius:3px;overflow:hidden;">
              <div id="ocr-progress-bar" style="height:100%;background:linear-gradient(90deg,#5a7d5c,#3a6b4a);width:0%;transition:width .3s;"></div>
            </div>
          </div>

          <h4 style="margin:0 0 12px;">待审核题目 (<span id="ocr-queue-count">0</span>)</h4>
          <div id="ocr-queue" style="max-height:500px;overflow-y:auto;">
            <div style="padding:20px;text-align:center;color:#999;font-size:13px;">
              还没有待审核题目。点击左侧上传图片开始。
            </div>
          </div>

          <div id="ocr-batch-actions" style="display:none;margin-top:12px;display:flex;gap:8px;">
            <button id="ocr-approve-all-btn" class="admin-btn-primary" style="flex:1;">
              ✓ 全部确认入库
            </button>
            <button id="ocr-reject-all-btn" class="admin-btn-secondary" style="flex:1;">
              ✗ 全部拒绝
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // 绑定事件
  const dropzone = document.getElementById('ocr-dropzone');
  const fileInput = document.getElementById('ocr-file-input');
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.background = 'rgba(90,125,92,0.15)'; });
    dropzone.addEventListener('dragleave', () => { dropzone.style.background = 'rgba(90,125,92,0.05)'; });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.background = 'rgba(90,125,92,0.05)';
      const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
      if (files.length) _ocrProcessFiles(files);
    });
    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length) _ocrProcessFiles(files);
      e.target.value = ''; // 允许同一文件再次选择
    });
  }

  const batchBtn = document.getElementById('ocr-batch-btn');
  if (batchBtn) {
    batchBtn.addEventListener('click', () => fileInput && fileInput.click());
  }

  const clearBtn = document.getElementById('ocr-clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      _ocrPendingQueue = [];
      _ocrUpdateQueueUI();
      _ocrShowStatus('已清空所有待审核题目', 'info');
    });
  }

  const approveAllBtn = document.getElementById('ocr-approve-all-btn');
  if (approveAllBtn) {
    approveAllBtn.addEventListener('click', () => _ocrApproveAll());
  }

  const rejectAllBtn = document.getElementById('ocr-reject-all-btn');
  if (rejectAllBtn) {
    rejectAllBtn.addEventListener('click', () => {
      _ocrPendingQueue = [];
      _ocrUpdateQueueUI();
      _ocrShowStatus('已清空所有待审核题目', 'info');
    });
  }

  // 检查 vision 模型可用性
  _ocrCheckVisionStatus();
}

// 缓存待审核题目
let _ocrPendingQueue = [];

async function _ocrCheckVisionStatus() {
  try {
    const res = await fetch('/admin/vision-status', {
      headers: { 'Authorization': 'Bearer ' + (await window.getSupabaseSessionToken()) }
    });
    if (!res.ok) return;
    const data = await res.json();
    const count = (data && data.available) ? data.available.length : 0;
    if (count === 0) {
      _ocrShowStatus('⚠️ 当前未配置任何 vision 模型，OCR 功能不可用。请在 server.py 配置 ZHIPU_API_KEY / QWEN_API_KEY / SILICONFLOW_API_KEY / NVIDIA_API_KEY / OPENAI_API_KEY 中至少一个。', 'error', 15000);
    } else {
      _ocrShowStatus(`✅ 已配置 ${count} 个 vision 模型：${data.available.map(v => v.model).join(', ')}`, 'success', 6000);
    }
  } catch (e) {
    console.warn('[OCR] 检查 vision 状态失败:', e);
  }
}

function _ocrShowStatus(text, type, duration = 4000) {
  const el = document.getElementById('ocr-status');
  if (!el) return;
  const colors = {
    info: { bg: '#e3f2fd', fg: '#1565c0', border: '#90caf9' },
    success: { bg: '#e8f5e9', fg: '#2e7d32', border: '#81c784' },
    error: { bg: '#ffebee', fg: '#c62828', border: '#ef9a9a' }
  };
  const c = colors[type] || colors.info;
  el.style.cssText = `display:block;padding:10px 12px;border-radius:8px;background:${c.bg};color:${c.fg};border:1px solid ${c.border};font-size:13px;`;
  el.textContent = text;
  if (duration > 0) setTimeout(() => { if (el.textContent === text) el.style.display = 'none'; }, duration);
}

function _ocrShowProgress(text, pct) {
  const wrap = document.getElementById('ocr-progress');
  const bar = document.getElementById('ocr-progress-bar');
  const txt = document.getElementById('ocr-progress-text');
  const pctEl = document.getElementById('ocr-progress-pct');
  if (!wrap || !bar || !txt || !pctEl) return;
  wrap.style.display = 'block';
  txt.textContent = text;
  pctEl.textContent = pct + '%';
  bar.style.width = pct + '%';
}

function _ocrHideProgress() {
  const wrap = document.getElementById('ocr-progress');
  if (wrap) wrap.style.display = 'none';
}

async function _ocrProcessFiles(files) {
  // 限制：单次最多 OCR_MAX_IMAGES 张
  const limited = files.slice(0, OCR_MAX_IMAGES);
  if (files.length > OCR_MAX_IMAGES) {
    _ocrShowStatus(`提示：单次最多处理 ${OCR_MAX_IMAGES} 张图片，已截取前 ${OCR_MAX_IMAGES} 张`, 'info', 3000);
  }

  for (let i = 0; i < limited.length; i++) {
    const file = limited[i];
    if (file.size > OCR_IMAGE_MAX_BYTES) {
      _ocrShowStatus(`跳过 ${file.name}（超过 5MB）`, 'error', 4000);
      continue;
    }
    const basePct = (i / limited.length) * 100;
    const perPct = 100 / limited.length;
    _ocrShowProgress(`处理 ${i+1}/${limited.length}: ${file.name}`, basePct);

    try {
      // 读取为 base64
      const b64 = await _ocrReadFileAsBase64(file);
      _ocrShowProgress(`上传并识别 ${i+1}/${limited.length}: ${file.name}`, basePct + perPct * 0.5);

      // 调用后端 OCR API
      const res = await fetch('/admin/ocr-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (await window.getSupabaseSessionToken())
        },
        body: JSON.stringify({
          image: b64,
          mime: file.type || 'image/png',
          text: ''
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '请求失败' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      _ocrShowProgress(`解析 ${i+1}/${limited.length}: ${file.name}`, basePct + perPct * 0.85);

      if (data && data.question) {
        _ocrPendingQueue.push({
          id: data.question.id,
          stem: data.question.stem,
          options: data.question.options || {},
          answer: data.question.answer || '',
          analysis: data.question.analysis || '',
          module: data.question.module || 'module_1',
          difficulty: data.question.difficulty || 'league',
          target: data.question.target || 'competition',
          subject: data.question.subject || '',
          concept: data.question.concept || '',
          tags: data.question.tags || [],
          ocr_text: data.question.ocr_text || '',
          filename: file.name
        });
        _ocrUpdateQueueUI();
      }
      _ocrShowProgress(`完成 ${i+1}/${limited.length}`, basePct + perPct);
    } catch (e) {
      console.error(`[OCR] 处理 ${file.name} 失败:`, e);
      _ocrShowStatus(`处理 ${file.name} 失败：${e.message}`, 'error', 5000);
    }
  }

  _ocrHideProgress();
}

function _ocrUpdateQueueUI() {
  const queue = document.getElementById('ocr-queue');
  const count = document.getElementById('ocr-queue-count');
  const batchActions = document.getElementById('ocr-batch-actions');
  if (!queue || !count) return;
  count.textContent = _ocrPendingQueue.length;
  if (batchActions) {
    batchActions.style.display = _ocrPendingQueue.length > 0 ? 'flex' : 'none';
  }
  if (_ocrPendingQueue.length === 0) {
    queue.innerHTML = `<div style="padding:20px;text-align:center;color:#999;font-size:13px;">还没有待审核题目。点击左侧上传图片开始。</div>`;
    return;
  }

  queue.innerHTML = _ocrPendingQueue.map((q, idx) => `
    <div class="ocr-queue-item" data-idx="${idx}" style="
      border:1px solid #e0e0e0;border-radius:10px;padding:12px;margin-bottom:10px;background:#fff;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-size:11px;color:#888;">${escapeHtml(q.filename || '')} · ID: ${q.id}</div>
        <div style="display:flex;gap:6px;">
          <button class="admin-btn-small ocr-edit-btn" data-idx="${idx}" style="background:#5a7d5c;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:12px;">编辑</button>
          <button class="admin-btn-small ocr-approve-btn" data-idx="${idx}" style="background:#2e7d32;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:12px;">入库</button>
          <button class="admin-btn-small ocr-reject-btn" data-idx="${idx}" style="background:#c62828;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:12px;">删除</button>
        </div>
      </div>
      <div style="font-weight:600;color:#222;margin-bottom:6px;font-size:14px;">${escapeHtml(q.stem || '(空)')}</div>
      <div style="font-size:12px;color:#444;margin-bottom:4px;">
        ${Object.entries(q.options || {}).map(([k, v]) => `<div style="margin-left:8px;"><strong>${k}.</strong> ${escapeHtml(String(v))}</div>`).join('')}
      </div>
      <div style="font-size:11px;color:#666;margin-top:4px;">
        答案: <strong style="color:#2e7d32;">${escapeHtml(q.answer || '?')}</strong> · 标签: ${(q.tags || []).map(t => `<code style="background:#f0f0f0;padding:1px 4px;border-radius:2px;">${escapeHtml(t)}</code>`).join(' ')}
      </div>
    </div>
  `).join('');

  // 绑定按钮
  queue.querySelectorAll('.ocr-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'));
      _ocrEditItem(idx);
    });
  });
  queue.querySelectorAll('.ocr-approve-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'));
      _ocrApproveItem(idx);
    });
  });
  queue.querySelectorAll('.ocr-reject-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'));
      _ocrPendingQueue.splice(idx, 1);
      _ocrUpdateQueueUI();
    });
  });
}

function _ocrEditItem(idx) {
  const q = _ocrPendingQueue[idx];
  if (!q) return;
  const modal = document.createElement('div');
  modal.className = 'lmc-modal-backdrop';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
  const optText = Object.entries(q.options || {}).map(([k, v]) => `${k}: ${v}`).join('\n');
  modal.innerHTML = `
    <div class="lmc-modal" style="background:#fff;border-radius:12px;max-width:640px;width:90%;max-height:90vh;overflow:auto;padding:24px;">
      <h3 style="margin:0 0 16px;">编辑题目</h3>
      <div style="margin-bottom:12px;">
        <label style="font-size:12px;color:#666;display:block;margin-bottom:4px;">题干</label>
        <textarea id="ocr-edit-stem" style="width:100%;min-height:80px;padding:8px;border:1px solid #ccc;border-radius:6px;font-family:inherit;font-size:14px;">${escapeHtml(q.stem || '')}</textarea>
      </div>
      <div style="margin-bottom:12px;">
        <label style="font-size:12px;color:#666;display:block;margin-bottom:4px;">选项（A-D，每行一个）</label>
        <textarea id="ocr-edit-options" style="width:100%;min-height:80px;padding:8px;border:1px solid #ccc;border-radius:6px;font-family:inherit;font-size:14px;">${escapeHtml(optText)}</textarea>
      </div>
      <div style="margin-bottom:12px;display:flex;gap:12px;">
        <div style="flex:1;">
          <label style="font-size:12px;color:#666;display:block;margin-bottom:4px;">答案 (A/B/C/D)</label>
          <input id="ocr-edit-answer" value="${escapeHtml(q.answer || '')}" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;" />
        </div>
        <div style="flex:1;">
          <label style="font-size:12px;color:#666;display:block;margin-bottom:4px;">难度</label>
          <select id="ocr-edit-difficulty" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;">
            <option value="basic" ${q.difficulty === 'basic' ? 'selected' : ''}>基础</option>
            <option value="league" ${q.difficulty === 'league' ? 'selected' : ''}>联赛</option>
            <option value="national" ${q.difficulty === 'national' ? 'selected' : ''}>国赛</option>
            <option value="ibo" ${q.difficulty === 'ibo' ? 'selected' : ''}>IBO</option>
          </select>
        </div>
      </div>
      <div style="margin-bottom:12px;">
        <label style="font-size:12px;color:#666;display:block;margin-bottom:4px;">解析</label>
        <textarea id="ocr-edit-analysis" style="width:100%;min-height:80px;padding:8px;border:1px solid #ccc;border-radius:6px;font-family:inherit;font-size:14px;">${escapeHtml(q.analysis || '')}</textarea>
      </div>
      <div style="margin-bottom:12px;">
        <label style="font-size:12px;color:#666;display:block;margin-bottom:4px;">OCR 原文（仅参考）</label>
        <div style="padding:8px;background:#f5f5f5;border-radius:6px;font-size:12px;color:#666;max-height:100px;overflow:auto;">${escapeHtml(q.ocr_text || '')}</div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button id="ocr-edit-cancel" class="admin-btn-secondary" style="padding:8px 16px;border-radius:6px;cursor:pointer;border:1px solid #ccc;background:#fff;">取消</button>
        <button id="ocr-edit-save" class="admin-btn-primary" style="padding:8px 16px;border-radius:6px;cursor:pointer;background:#3a6b4a;color:#fff;border:none;">保存</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('ocr-edit-cancel').addEventListener('click', () => modal.remove());
  document.getElementById('ocr-edit-save').addEventListener('click', () => {
    q.stem = document.getElementById('ocr-edit-stem').value.trim();
    const optsRaw = document.getElementById('ocr-edit-options').value.trim();
    q.options = {};
    optsRaw.split('\n').forEach(line => {
      const m = line.match(/^([A-D])[:：．\.]\s*(.+)$/);
      if (m) q.options[m[1]] = m[2].trim();
    });
    q.answer = document.getElementById('ocr-edit-answer').value.trim().toUpperCase();
    q.difficulty = document.getElementById('ocr-edit-difficulty').value;
    q.analysis = document.getElementById('ocr-edit-analysis').value.trim();
    modal.remove();
    _ocrUpdateQueueUI();
  });
}

async function _ocrApproveItem(idx) {
  const q = _ocrPendingQueue[idx];
  if (!q) return;
  try {
    const res = await fetch('/admin/update-question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (await window.getSupabaseSessionToken())
      },
      body: JSON.stringify({
        id: q.id,
        stem: q.stem,
        options: q.options,
        answer: q.answer,
        analysis: q.analysis,
        module: q.module,
        difficulty: q.difficulty,
        target: q.target,
        subject: q.subject,
        concept: q.concept,
        tags: q.tags.filter(t => t !== 'pending_review' && t !== 'ocr_uploaded')
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: '请求失败' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    _ocrPendingQueue.splice(idx, 1);
    _ocrUpdateQueueUI();
    _ocrShowStatus(`✓ 题目已入库：${q.stem.slice(0, 30)}...`, 'success', 4000);
  } catch (e) {
    _ocrShowStatus(`入库失败：${e.message}`, 'error', 6000);
  }
}

async function _ocrApproveAll() {
  if (_ocrPendingQueue.length === 0) return;
  if (!confirm(`确认将 ${_ocrPendingQueue.length} 道题目全部入库？`)) return;
  let ok = 0, fail = 0;
  _ocrShowProgress('批量入库中...', 0);
  for (let i = 0; i < _ocrPendingQueue.length; i++) {
    const q = _ocrPendingQueue[i];
    try {
      const res = await fetch('/admin/update-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (await window.getSupabaseSessionToken())
        },
        body: JSON.stringify({
          id: q.id,
          stem: q.stem, options: q.options, answer: q.answer, analysis: q.analysis,
          module: q.module, difficulty: q.difficulty, target: q.target,
          subject: q.subject, concept: q.concept,
          tags: q.tags.filter(t => t !== 'pending_review' && t !== 'ocr_uploaded')
        })
      });
      if (res.ok) { ok++; _ocrPendingQueue.splice(i, 1); i--; }
      else fail++;
    } catch { fail++; }
    _ocrShowProgress(`批量入库中... ${ok + fail}/${_ocrPendingQueue.length + ok}`, (ok + fail) / (_ocrPendingQueue.length + ok) * 100);
  }
  _ocrHideProgress();
  _ocrUpdateQueueUI();
  _ocrShowStatus(`批量入库完成：✓ ${ok} 成功 · ✗ ${fail} 失败`, fail > 0 ? 'error' : 'success', 5000);
}
