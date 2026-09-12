/**
 * ============================================================
 * BioQuest v4.0 — 模块 3：学习 DNA + 情绪 DNA 双画像
 * ------------------------------------------------------------
 * - 32 位 ATGC 碱基序列编码
 *   · 学习 DNA：8 模块 × 4 碱基 = 32 碱基（256 级精度/模块）
 *   · 情绪 DNA：8 天 × 4 碱基 = 32 碱基
 * - Canvas 双螺旋渲染（左右两条链 + 互补配对高亮）
 * - 双 DNA 互补度计算（A-T, G-C 配对比例）
 * - 分享卡片导出（PNG）
 * ============================================================
 */
(function (global) {
  'use strict';

  if (global.LearningDNA) return;

  // 8 个虚拟模块（每个映射到现有 4 大模块中的一个）
  var MODULES = [
    'cell', 'molecule',
    'plant', 'microbe',
    'physiology', 'ecology',
    'genetics', 'evolution'
  ];

  var MODULE_LABELS = {
    cell: '细胞生物学',
    molecule: '分子生物学',
    plant: '植物学',
    microbe: '微生物学',
    physiology: '生理学',
    ecology: '生态学',
    genetics: '遗传学',
    evolution: '进化生物学'
  };

  // 8 虚拟模块 → 现有 4 大模块映射
  var MODULE_TO_DASHBOARD = {
    cell: 'module_1', molecule: 'module_1',
    plant: 'module_2', microbe: 'module_2',
    physiology: 'module_3', ecology: 'module_3',
    genetics: 'module_4', evolution: 'module_4'
  };

  // 碱基颜色（与品牌色系一致）
  var BASE_COLORS = {
    A: '#5a7d5c', // sage
    T: '#c4956a', // amber
    G: '#5b8def', // blue
    C: '#e8b04f'  // gold
  };

  var BASE_LABELS = {
    A: 'A 细胞',
    T: 'T 遗传',
    G: 'G 生态',
    C: 'C 生化'
  };

  function bitsToBase(b) { return 'ATGC'[b & 3]; }
  function baseToBits(c) {
    if (c === 'A') return 0;
    if (c === 'T') return 1;
    if (c === 'G') return 2;
    if (c === 'C') return 3;
    return 0;
  }

  /**
   * 0-1 数值编码为 4 个碱基（256 级精度）
   */
  function encodeQuartet(value) {
    var v = Math.min(255, Math.max(0, Math.floor((value || 0) * 255)));
    return bitsToBase((v >> 6) & 3) +
           bitsToBase((v >> 4) & 3) +
           bitsToBase((v >> 2) & 3) +
           bitsToBase(v & 3);
  }

  function decodeQuartet(q) {
    if (!q || q.length < 4) return 0;
    var b1 = baseToBits(q[0]);
    var b2 = baseToBits(q[1]);
    var b3 = baseToBits(q[2]);
    var b4 = baseToBits(q[3]);
    var level = (b1 << 6) | (b2 << 4) | (b3 << 2) | b4;
    return level / 255;
  }

  /**
   * 编码学习 DNA：8 模块 × 4 碱基 = 32 碱基
   * @param {Object} moduleStates - { cell: 0.6, module_1: 0.5, ... }
   * @returns {string} 32 字符 ATGC 序列
   */
  function encodeLearningDNA(moduleStates) {
    moduleStates = moduleStates || {};
    var dna = '';
    for (var i = 0; i < MODULES.length; i++) {
      var m = MODULES[i];
      var dashKey = MODULE_TO_DASHBOARD[m];
      var mastery = moduleStates[m];
      if (mastery == null && dashKey && moduleStates[dashKey] != null) {
        mastery = moduleStates[dashKey];
      }
      if (mastery == null) mastery = 0;
      // 限制到 0-1
      if (mastery > 1) mastery = 1;
      if (mastery < 0) mastery = 0;
      dna += encodeQuartet(mastery);
    }
    return dna;
  }

  function decodeLearningDNA(dna) {
    dna = (dna || '').padEnd(32, 'A').slice(0, 32);
    var states = {};
    for (var i = 0; i < MODULES.length; i++) {
      states[MODULES[i]] = decodeQuartet(dna.slice(i * 4, i * 4 + 4));
    }
    return states;
  }

  /**
   * 编码情绪 DNA：8 天 × 4 碱基 = 32 碱基
   * @param {Array} moodLogs8d - 长度 8 的数组，元素为 {avg: 0-1} 或 null
   * @returns {string} 32 字符 ATGC 序列
   */
  function encodeMoodDNA(moodLogs8d) {
    moodLogs8d = moodLogs8d || [];
    var dna = '';
    for (var i = 0; i < 8; i++) {
      var day = moodLogs8d[i];
      var avg;
      if (!day) {
        avg = 0.5; // 未打卡默认中等
      } else if (typeof day === 'number') {
        avg = day;
      } else {
        if (typeof day.avg === 'number') {
          avg = day.avg;
        } else {
          var vals = [];
          if (typeof day.morning === 'number') vals.push(day.morning);
          if (typeof day.noon === 'number') vals.push(day.noon);
          if (typeof day.evening === 'number') vals.push(day.evening);
          if (vals.length === 0) vals.push(0.5);
          avg = vals.reduce(function (s, v) { return s + v; }, 0) / vals.length;
        }
      }
      if (avg > 1) avg = 1;
      if (avg < 0) avg = 0;
      dna += encodeQuartet(avg);
    }
    return (dna + 'ATGCATGCATGCATGCATGCATGCATGCATGC').slice(0, 32);
  }

  /**
   * 计算双 DNA 的"互补度"（A-T, G-C 配对比例）
   * 高互补度 = 学习好时情绪也好
   */
  function computeComplementarity(dna1, dna2) {
    if (!dna1 || !dna2) return 0;
    var len = Math.min(dna1.length, dna2.length, 32);
    if (len === 0) return 0;
    var matches = 0;
    for (var i = 0; i < len; i++) {
      if (isPair(dna1[i], dna2[i])) matches++;
    }
    return matches / len;
  }

  function isPair(b1, b2) {
    var p = (b1 || '') + (b2 || '');
    return p === 'AT' || p === 'TA' || p === 'GC' || p === 'CG';
  }

  /**
   * Canvas 双螺旋渲染
   * @param {HTMLCanvasElement} canvas
   * @param {string} dna1 - 左链（学习 DNA）
   * @param {string} dna2 - 右链（情绪 DNA）
   * @param {Object} opts - { label1, label2 }
   */
  function renderDoubleHelix(canvas, dna1, dna2, opts) {
    if (!canvas || !canvas.getContext) return;
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var cssW = canvas.clientWidth || parseInt(canvas.getAttribute('width'), 10) || 240;
    var cssH = canvas.clientHeight || parseInt(canvas.getAttribute('height'), 10) || 320;
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var W = cssW, H = cssH;
    ctx.clearRect(0, 0, W, H);

    // 背景
    if (opts.background) {
      ctx.fillStyle = opts.background;
      ctx.fillRect(0, 0, W, H);
    }

    dna1 = (dna1 || '').padEnd(32, 'A').slice(0, 32);
    dna2 = (dna2 || '').padEnd(32, 'A').slice(0, 32);

    var cx = W / 2;
    var amplitude = Math.min(W * 0.22, 50);
    var helixHeight = H * 0.86;
    var startY = H * 0.07;
    var steps = 32;
    var baseR = Math.max(3, Math.min(W, H) / 55);

    // 骨架（两条波浪线，先画在底层）
    ctx.lineWidth = 2;
    for (var side = 0; side < 2; side++) {
      var sign = side === 0 ? 1 : -1;
      ctx.strokeStyle = side === 0
        ? 'rgba(90, 125, 92, 0.35)'
        : 'rgba(196, 149, 106, 0.35)';
      ctx.beginPath();
      for (var i = 0; i <= 100; i++) {
        var t = i / 100;
        var y = startY + t * helixHeight;
        var phase = t * Math.PI * 4;
        var x = cx + sign * Math.sin(phase) * amplitude;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 碱基对
    for (var i = 0; i < steps; i++) {
      var t = i / (steps - 1);
      var y = startY + t * helixHeight;
      var phase = t * Math.PI * 4;
      var x1 = cx + Math.sin(phase) * amplitude;
      var x2 = cx - Math.sin(phase) * amplitude;
      var b1 = dna1[i] || 'A';
      var b2 = dna2[i] || 'A';
      var pairOk = isPair(b1, b2);

      // 互补配对连线
      ctx.strokeStyle = pairOk ? 'rgba(90, 125, 92, 0.85)' : 'rgba(180, 180, 180, 0.4)';
      ctx.lineWidth = pairOk ? 3 : 1;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();

      // 左链碱基
      ctx.fillStyle = BASE_COLORS[b1] || '#999';
      ctx.beginPath();
      ctx.arc(x1, y, baseR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 右链碱基
      ctx.fillStyle = BASE_COLORS[b2] || '#999';
      ctx.beginPath();
      ctx.arc(x2, y, baseR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 标签
    if (opts.label1) {
      ctx.fillStyle = 'rgba(90, 125, 92, 0.9)';
      ctx.font = '600 11px "Noto Serif SC", serif';
      ctx.textAlign = 'left';
      ctx.fillText(opts.label1, 8, 14);
    }
    if (opts.label2) {
      ctx.fillStyle = 'rgba(196, 149, 106, 0.9)';
      ctx.font = '600 11px "Noto Serif SC", serif';
      ctx.textAlign = 'right';
      ctx.fillText(opts.label2, W - 8, 14);
    }
  }

  /**
   * 从用户统计生成学习 DNA
   */
  function buildFromUserStats(stats) {
    stats = stats || {};
    var moduleStates = {};
    var modules = stats.modules || {};
    Object.keys(MODULE_TO_DASHBOARD).forEach(function (m) {
      var dashKey = MODULE_TO_DASHBOARD[m];
      var modStat = modules[dashKey];
      var mastery = 0;
      if (modStat) {
        var total = modStat.totalAnswered || 0;
        var correct = modStat.totalCorrect || 0;
        mastery = total > 0 ? correct / total : 0;
      }
      moduleStates[m] = mastery;
    });
    return {
      dna: encodeLearningDNA(moduleStates),
      moduleStates: moduleStates
    };
  }

  /**
   * 从情绪日志生成情绪 DNA
   * @param {Array} logs - [{ timestamp, mood, moodValue }]
   * @returns {Object} { dna, moodDays }
   */
  function buildFromMoodLogs(logs) {
    logs = logs || [];
    var byDay = {};
    logs.forEach(function (entry) {
      if (!entry) return;
      var ts = entry.timestamp || entry.date || entry.t;
      if (!ts) return;
      var d = new Date(ts);
      if (isNaN(d.getTime())) return;
      var key = d.toISOString().slice(0, 10);
      if (!byDay[key]) byDay[key] = [];
      var v;
      if (typeof entry.moodValue === 'number') {
        v = entry.moodValue;
      } else if (typeof entry.mood === 'string') {
        v = ({ happy: 1.0, calm: 0.8, neutral: 0.5, anxious: 0.3, tired: 0.4, sad: 0.2 })[entry.mood];
      }
      if (v == null) v = 0.5;
      byDay[key].push(v);
    });
    var days = Object.keys(byDay).sort().slice(-8);
    var moodDays = days.map(function (key) {
      var vals = byDay[key];
      var sum = vals.reduce(function (s, v) { return s + v; }, 0);
      return { date: key, avg: sum / vals.length };
    });
    while (moodDays.length < 8) moodDays.push(null);
    return {
      dna: encodeMoodDNA(moodDays),
      moodDays: moodDays
    };
  }

  /**
   * 分析学习 DNA：完整度、最强、最弱
   */
  function analyzeLearningDNA(dna) {
    var states = decodeLearningDNA(dna);
    var keys = MODULES;
    var sum = 0, count = 0;
    var min = 1, max = 0, minKey = null, maxKey = null;
    keys.forEach(function (k) {
      var v = states[k];
      sum += v;
      count++;
      if (v < min) { min = v; minKey = k; }
      if (v > max) { max = v; maxKey = k; }
    });
    return {
      completeness: count > 0 ? Math.round((sum / count) * 100) : 0,
      average: count > 0 ? sum / count : 0,
      weakest: minKey ? { key: minKey, value: min, label: MODULE_LABELS[minKey] || minKey } : null,
      strongest: maxKey ? { key: maxKey, value: max, label: MODULE_LABELS[maxKey] || maxKey } : null,
      moduleStates: states
    };
  }

  /**
   * 分析情绪 DNA：平均积极度、节律识别
   */
  function analyzeMoodDNA(dna) {
    var states = decodeLearningDNA(dna); // 解码结构相同
    var values = MODULES.map(function (k) { return states[k]; });
    var sum = values.reduce(function (s, v) { return s + v; }, 0);
    var avg = sum / values.length;
    // 节律：找出最低位（最差情绪时段）
    var minIdx = 0, minVal = values[0];
    for (var i = 1; i < values.length; i++) {
      if (values[i] < minVal) { minVal = values[i]; minIdx = i; }
    }
    // 节律识别：8 个位置对应 8 天，最低位即"低落日"
    var dayLabels = ['第1天', '第2天', '第3天', '第4天', '第5天', '第6天', '第7天', '第8天'];
    return {
      positivity: Math.round(avg * 100),
      average: avg,
      lowDay: { idx: minIdx, value: minVal, label: dayLabels[minIdx] || ('第' + (minIdx + 1) + '天') },
      values: values
    };
  }

  /**
   * 生成 AI 诊断文本
   */
  function generateDiagnosis(learningAnalysis, moodAnalysis, complementarity) {
    if (!learningAnalysis || !moodAnalysis) return '';
    var parts = [];
    if (learningAnalysis.strongest && learningAnalysis.weakest) {
      parts.push('你的「' + learningAnalysis.strongest.label + '」突出，但「' +
        learningAnalysis.weakest.label + '」相对薄弱');
    }
    if (moodAnalysis.lowDay && moodAnalysis.lowDay.value < 0.4) {
      parts.push('情绪节律显示 ' + moodAnalysis.lowDay.label + ' 状态偏低');
    }
    if (complementarity > 0.6) {
      parts.push('学习与情绪互补度较高，状态协调');
    } else if (complementarity < 0.35) {
      parts.push('学习与情绪互补度偏低，建议关注身心健康');
    }
    if (parts.length === 0) return '继续保持稳定的学习节奏，注意劳逸结合。';
    var text = parts.join('；') + '。';
    // 建议
    if (learningAnalysis.weakest && moodAnalysis.lowDay) {
      text += '建议把「' + learningAnalysis.weakest.label + '」安排在情绪较好的时段学习，' +
        moodAnalysis.lowDay.label + ' 可做轻松卡片复习或休息。';
    }
    return text;
  }

  /**
   * 生成分享卡片 PNG（无需 html2canvas，纯 Canvas 绘制）
   * @returns {string} dataURL
   */
  function generateShareCard(opts) {
    opts = opts || {};
    var canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1440;
    var ctx = canvas.getContext('2d');

    // 背景
    var grad = ctx.createLinearGradient(0, 0, 0, 1440);
    grad.addColorStop(0, '#faf7f2');
    grad.addColorStop(1, '#f0ebe0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1440);

    // 顶部装饰
    ctx.fillStyle = '#1a3a2a';
    ctx.fillRect(0, 0, 1080, 12);

    // 标题
    ctx.fillStyle = '#1a3a2a';
    ctx.font = '700 56px "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    ctx.fillText('我的学习 DNA', 540, 110);
    ctx.font = '400 28px "Noto Serif SC", serif';
    ctx.fillStyle = '#5a5a5a';
    ctx.fillText('BioQuest · 生物奥赛学习画像', 540, 160);

    // 用户名 + 等级
    ctx.font = '600 36px "Noto Serif SC", serif';
    ctx.fillStyle = '#1a3a2a';
    var userName = opts.userName || 'BioQuest 同学';
    ctx.fillText(userName, 540, 240);
    if (opts.grade) {
      ctx.font = '600 24px "Noto Serif SC", serif';
      ctx.fillStyle = '#c4956a';
      ctx.fillText('· ' + opts.grade + ' ·', 540, 280);
    }

    // 左侧：学习 DNA Canvas
    var leftCanvas = document.createElement('canvas');
    leftCanvas.width = 460;
    leftCanvas.height = 600;
    renderDoubleHelix(leftCanvas, opts.learningDNA || '', opts.moodDNA || '', {
      label1: '🧬 学习 DNA',
      label2: '💚 情绪 DNA',
      background: 'rgba(255,255,255,0.6)'
    });
    ctx.drawImage(leftCanvas, 80, 320, 920, 600);

    // 中部分隔线
    ctx.strokeStyle = 'rgba(26, 58, 42, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, 970);
    ctx.lineTo(1000, 970);
    ctx.stroke();

    // 数据摘要
    ctx.font = '600 24px "Noto Serif SC", serif';
    ctx.fillStyle = '#1a3a2a';
    ctx.textAlign = 'left';
    var y = 1030;
    if (opts.learningAnalysis) {
      var la = opts.learningAnalysis;
      ctx.fillText('完整度: ' + la.completeness + '%', 100, y);
      if (la.strongest) ctx.fillText('最强: ' + la.strongest.label, 540, y);
      y += 40;
      if (la.weakest) ctx.fillText('最弱: ' + la.weakest.label, 100, y);
    }
    if (opts.moodAnalysis) {
      y += 40;
      ctx.fillText('情绪积极度: ' + opts.moodAnalysis.positivity + '%', 100, y);
      if (opts.moodAnalysis.lowDay) ctx.fillText('低落日: ' + opts.moodAnalysis.lowDay.label, 540, y);
    }
    if (opts.complementarity != null) {
      y += 40;
      ctx.fillText('互补度: ' + Math.round(opts.complementarity * 100) + '%', 100, y);
    }

    // AI 诊断
    if (opts.diagnosis) {
      y += 60;
      ctx.font = '600 22px "Noto Serif SC", serif';
      ctx.fillStyle = '#c4956a';
      ctx.fillText('💡 AI 诊断', 100, y);
      y += 36;
      ctx.font = '400 22px "Noto Serif SC", serif';
      ctx.fillStyle = '#4a4a4a';
      // 简单换行
      var words = opts.diagnosis.split('');
      var line = '';
      var maxWidth = 880;
      for (var i = 0; i < words.length; i++) {
        var test = line + words[i];
        if (ctx.measureText(test).width > maxWidth && line) {
          ctx.fillText(line, 100, y);
          y += 32;
          line = words[i];
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line, 100, y);
    }

    // 底部
    ctx.fillStyle = '#1a3a2a';
    ctx.fillRect(0, 1400, 1080, 40);
    ctx.font = '400 20px "Noto Serif SC", serif';
    ctx.fillStyle = '#faf7f2';
    ctx.textAlign = 'center';
    ctx.fillText('BioQuest · 让生物学奥赛学习更科学', 540, 1426);

    return canvas.toDataURL('image/png');
  }

  /**
   * 触发分享卡片下载
   */
  function downloadShareCard(opts) {
    var dataURL = generateShareCard(opts);
    var a = document.createElement('a');
    a.href = dataURL;
    a.download = 'bioquest-learning-dna-' + Date.now() + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  global.LearningDNA = {
    MODULES: MODULES,
    MODULE_LABELS: MODULE_LABELS,
    MODULE_TO_DASHBOARD: MODULE_TO_DASHBOARD,
    BASE_COLORS: BASE_COLORS,
    BASE_LABELS: BASE_LABELS,
    encodeLearningDNA: encodeLearningDNA,
    decodeLearningDNA: decodeLearningDNA,
    encodeMoodDNA: encodeMoodDNA,
    computeComplementarity: computeComplementarity,
    isPair: isPair,
    renderDoubleHelix: renderDoubleHelix,
    buildFromUserStats: buildFromUserStats,
    buildFromMoodLogs: buildFromMoodLogs,
    analyzeLearningDNA: analyzeLearningDNA,
    analyzeMoodDNA: analyzeMoodDNA,
    generateDiagnosis: generateDiagnosis,
    generateShareCard: generateShareCard,
    downloadShareCard: downloadShareCard
  };
})(window);
