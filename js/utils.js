/**
 * ============================================================
 * BioQuest — 工具函数集合
 * 提供常用的通用工具函数
 * ============================================================
 */

'use strict';

/**
 * BioQuest 全局命名空间（Q-03 保守实施）
 * 作为全站公共工具与常量的规范挂载点。新代码应优先使用 BioQuest.* 路径；
 * 旧的 window.* 平铺别名保留以向后兼容，避免一次性迁移 40+ 全局导致回归。
 * 已注册：escapeHtml、loadScriptOnce（均提供 window.* 别名）
 */
var BioQuest = (typeof window !== 'undefined' ? window.BioQuest : null) || {};
if (typeof window !== 'undefined') { window.BioQuest = BioQuest; }

/**
 * Fisher-Yates 洗牌算法
 * 原地随机打乱数组顺序
 * @template T
 * @param {T[]} array - 需要打乱的数组
 * @returns {T[]} 原数组引用（已原地打乱）
 */
function shuffle(array) {
  if (!Array.isArray(array)) {
    console.warn('[BioQuest Utils] shuffle 需要数组参数');
    return array;
  }

  const arr = array;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 格式化秒数为 HH:MM:SS 格式
 * @param {number} seconds - 总秒数
 * @param {Object} [options] - 格式化选项
 * @param {boolean} [options.showHours=true] - 是否始终显示小时
 * @param {boolean} [options.padHours=false] - 是否补零小时
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(seconds, options = {}) {
  const { showHours = true, padHours = false } = options;

  if (typeof seconds !== 'number' || seconds < 0 || !isFinite(seconds)) {
    return showHours ? '00:00:00' : '00:00';
  }

  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');

  if (showHours || hrs > 0) {
    const hoursStr = padHours || hrs > 0 ? pad(hrs) : String(hrs);
    return `${hoursStr}:${pad(mins)}:${pad(secs)}`;
  }

  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * 防抖函数
 * 在连续调用时只执行最后一次，适用于搜索输入、窗口调整等场景
 * @param {Function} fn - 需要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(fn, delay) {
  if (typeof fn !== 'function') {
    throw new TypeError('[BioQuest Utils] debounce 需要函数作为第一个参数');
  }

  let timer = null;

  function debounced(...args) {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, delay);
  }

  debounced.cancel = function () {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return debounced;
}

/**
 * 节流函数
 * 在指定时间间隔内只执行一次，适用于滚动、鼠标移动等高频事件
 * @param {Function} fn - 需要节流的函数
 * @param {number} delay - 节流间隔（毫秒）
 * @returns {Function} 节流后的函数
 */
function throttle(fn, delay) {
  if (typeof fn !== 'function') {
    throw new TypeError('[BioQuest Utils] throttle 需要函数作为第一个参数');
  }

  let lastTime = 0;
  let timer = null;

  function throttled(...args) {
    const now = Date.now();
    const remaining = delay - (now - lastTime);

    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastTime = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastTime = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  }

  throttled.cancel = function () {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    lastTime = 0;
  };

  return throttled;
}

/**
 * 生成唯一标识符
 * 使用时间戳 + 随机数组合生成
 * @param {Object} [options] - 生成选项
 * @param {string} [options.prefix=''] - ID 前缀
 * @param {number} [options.length=10] - 随机部分的长度
 * @returns {string} 生成的唯一ID
 */
function generateId(options = {}) {
  const { prefix = '', length = 10 } = options;

  const timestamp = Date.now().toString(36);
  const randomPart = Math.random()
    .toString(36)
    .slice(2, 2 + length);

  return `${prefix}${timestamp}_${randomPart}`;
}

/**
 * 防 XSS 攻击 — HTML 转义
 * 将特殊字符转换为 HTML 实体
 * @param {string} str - 需要转义的字符串
 * @returns {string} 转义后的安全字符串
 */
function escapeHtml(str) {
  if (typeof str !== 'string') {
    return String(str ?? '');
  }

  const entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };

  return str.replace(/[&<>"'/`=]/g, (char) => entityMap[char]);
}

// 显式暴露到 window，作为全站唯一的 escapeHtml 规范实现（Q-01 统一）
// 各模块应使用 window.escapeHtml，避免重复定义导致行为不一致
// Q-03：同时注册到 BioQuest 命名空间作为规范路径
if (typeof window !== 'undefined') {
  window.escapeHtml = escapeHtml;
  BioQuest.escapeHtml = escapeHtml;
}

/**
 * 敏感凭据脱敏（JWT / 长 Base64 签名 / AWS 密钥 / 私钥头 / Supabase service_role JWT）
 * 只打码，不删除原文 —— 便于用户在控制台/聊天里确认"自己刚才贴了密钥"，
 * 同时防止不小心被 BioQuestMarkdown 的 autoLink 索引、也防止被 localStorage/同步 持久化。
 *
 * @param {string} text  - 任意文本（AI 输出或用户输入）
 * @returns {string}     - 打码后的文本（长度不变或略短）
 */
function redactSensitiveSecrets(text) {
  if (text == null) return '';
  var t = String(text);
  if (!t) return t;

  function b64Mask(m) {
    // 保留头 6 位 + 尾 4 位，中间全部 ****
    var s = m;
    if (s.length <= 14) return '[REDACTED]';
    return s.slice(0, 6) + '****' + s.slice(-4);
  }

  // 1) JWT: 三段 Base64 —— 最常见的 `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.<payload>.<signature>`
  //    特别包含 supabase anon/service_role / firebase id_token / github app token 等
  t = t.replace(/eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}/g, function (m) {
    var parts = m.split('.');
    // header 留少量指纹，payload/signature 全打码
    return '[JWT ' + (parts[0] || '').slice(0, 8) + '…****.****.****]';
  });

  // 2) AWS / Aliyun / Tencent 风格：AK=字母开头20字符 + SK（40 字 base64 字母数字/+）
  t = t.replace(/\b(AKIA[0-9A-Z]{16})\b/g, '[AKIA****]');
  t = t.replace(/\b(LTAI[0-9A-Za-z]{12,})\b/g, '[AliyunAK****]');
  t = t.replace(/\b([0-9A-Za-z/+]{40})\b(?![0-9A-Za-z/+])/g, function (m) {
    // 避免误伤 40 个连续字母的普通英文单词：要求"至少含 2 位数字"
    var digits = (m.match(/[0-9]/g) || []).length;
    var lowers = (m.match(/[a-z]/g) || []).length;
    var uppers = (m.match(/[A-Z]/g) || []).length;
    if (digits >= 2 && lowers >= 8 && uppers >= 8) return '[SK****' + m.slice(-4) + ']';
    return m;
  });

  // 3) 私钥头（PEM）
  t = t.replace(/-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |)PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH |PGP |)PRIVATE KEY-----/g,
    '[PRIVATE KEY BLOCK REDACTED]');
  t = t.replace(/-----BEGIN (?:RSA |EC |)ENCRYPTED PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |)ENCRYPTED PRIVATE KEY-----/g,
    '[ENCRYPTED PRIVATE KEY BLOCK REDACTED]');

  // 4) `Bearer sk-xxx` / `sk_live_xxx` / `pk_live_xxx` / `ghp_xxx`（Stripe/GitHub token）
  t = t.replace(/\b(sk_live_|sk_test_|pk_live_|pk_test_|rk_live_)[A-Za-z0-9_]{10,}/g, function (m) { return m.split('_').slice(0, 2).join('_') + '_****'; });
  t = t.replace(/\b(ghp_|gho_|ghs_|github_pat_)[A-Za-z0-9_]{10,}/g, function (m) { return (m.split('_').slice(0, 2).join('_') || m.slice(0, 4)) + '_****'; });

  return t;
}

if (typeof window !== 'undefined') {
  window.redactSensitiveSecrets = redactSensitiveSecrets;
  BioQuest.redactSensitiveSecrets = redactSensitiveSecrets;
}

/**
 * 题库过滤：剔除"超长知识讲义型"题目
 * 特征（命中任一条即剔除，返回 null）：
 *   ① 单个选项/子题文本 > 600 字符（典型：把一整段知识讲义塞进 A/B/C/D 之一）
 *   ② (题干 + 所有选项文本 + 解析) > 4000 字符
 *   ③ 选项内容里包含超过 3 段"等式式罗列"（比如 `A=xxx=yyy=zzz→aaa→bbb→ccc`，这是讲义粘贴）
 * 若想保留题，返回一份"清洗过的"副本 —— 把单选项 >300 字的部分截断加 (…过长已省略)，降低 AI 输出幻觉。
 *
 * @param {Object} q  - {question, stem?, options?, subQuestions?, analysis?, explanation?, answer?}
 * @returns {Object|null}  保留 → 清洗后的对象；剔除 → null
 */
function filterLectureStyleQuestion(q) {
  if (!q || typeof q !== 'object') return null;

  // 字段别名归一
  var stem = String(q.question || q.stem || '');
  var analysis = String(q.analysis || q.explanation || q.answerExplanation || '');

  var options = [];
  if (Array.isArray(q.subQuestions)) {
    q.subQuestions.forEach(function (s) { options.push(String(s.text || s.label || '')); });
  } else if (Array.isArray(q.options)) {
    q.options.forEach(function (o, i) {
      if (typeof o === 'string') options.push(o);
      else if (o && typeof o.text === 'string') options.push(o.text);
      else if (o && typeof o.content === 'string') options.push(o.content);
      else options.push(String(o || ''));
    });
  } else if (q.A || q.B || q.C || q.D) {
    ['A','B','C','D','E','F'].forEach(function (k) { if (q[k]) options.push(String(q[k])); });
  }

  // 规则①：单选项 > 600 字 → 直接整题剔除（用户点名：肢端肥大症那道就是单个选项一两千字）
  var anyGiantOption = options.some(function (t) { return t.length > 600; });
  if (anyGiantOption) return null;

  var totalLen = stem.length + analysis.length +
    options.reduce(function (a, b) { return a + b.length; }, 0);

  // 规则②：全局 > 4000 字
  if (totalLen > 4000) return null;

  // 清洗：单选项 > 300 字的截短（"知识压缩"，别让单条选项还是半页讲义）
  var clean = {};
  for (var k in q) {
    if (Object.prototype.hasOwnProperty.call(q, k)) clean[k] = q[k];
  }

  function maybeTruncate(text, max) {
    if (text == null) return text;
    var s = String(text);
    if (s.length <= max) return s;
    // 优先在句号/分号处截断，避免把句子砍一半
    var cut = s.slice(0, max);
    var lastStop = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('；'), cut.lastIndexOf(';'), cut.lastIndexOf('.'));
    if (lastStop > max * 0.6) cut = cut.slice(0, lastStop + 1);
    return cut + '…（过长已省略）';
  }

  if (Array.isArray(clean.subQuestions)) {
    clean.subQuestions = clean.subQuestions.map(function (s) {
      var x = Object.assign({}, s);
      if (x.text != null) x.text = maybeTruncate(x.text, 300);
      return x;
    });
  }
  if (Array.isArray(clean.options)) {
    clean.options = clean.options.map(function (o) {
      if (typeof o === 'string') return maybeTruncate(o, 300);
      if (o && typeof o === 'object') {
        var y = Object.assign({}, o);
        if (typeof y.text === 'string') y.text = maybeTruncate(y.text, 300);
        if (typeof y.content === 'string') y.content = maybeTruncate(y.content, 300);
        return y;
      }
      return o;
    });
  }
  ['A','B','C','D','E','F'].forEach(function (k) {
    if (clean[k] != null) clean[k] = maybeTruncate(String(clean[k]), 300);
  });
  if (clean.question) clean.question = maybeTruncate(String(clean.question), 1200);
  if (clean.stem)     clean.stem     = maybeTruncate(String(clean.stem), 1200);
  if (clean.analysis)    clean.analysis    = maybeTruncate(String(clean.analysis), 1200);
  if (clean.explanation) clean.explanation = maybeTruncate(String(clean.explanation), 1200);

  return clean;
}

/**
 * 批量过滤题目数组
 */
function filterQuestionList(list) {
  if (!Array.isArray(list)) return [];
  var out = [];
  for (var i = 0; i < list.length; i++) {
    var q = filterLectureStyleQuestion(list[i]);
    if (q) out.push(q);
  }
  return out;
}

if (typeof window !== 'undefined') {
  window.filterLectureStyleQuestion = filterLectureStyleQuestion;
  window.filterQuestionList = filterQuestionList;
  BioQuest.filterLectureStyleQuestion = filterLectureStyleQuestion;
  BioQuest.filterQuestionList = filterQuestionList;
}

/**
 * ============================================================
 * 统一 Markdown → HTML 渲染器（BioQuestMarkdown / window.BioQuestMarkdown）
 * ============================================================
 * 目标：避免 tutor/discussion/practice 各模块重复实现残缺 markdown。
 * 覆盖（按执行顺序）：
 *   0. 代码块 ```lang ... ``` 和行内 `<svg>` 先"暂存"，避免后续转义/正则误伤。
 *   1. 标题 #~######
 *   2. 水平分隔线 --- / *** / ___
 *   3. 引用块 >
 *   4. 无序列表 - / * / + ；有序列表 1. 2. 3.（列表项支持嵌套缩进）
 *   5. 段落（空行分隔）
 *   6. 行内：**粗体** 、 *斜体* 、 `行内代码` 、 [标题](url) 、 <https://url>
 *   7. 裸 URL 自动转链接（http / https / ftp / ws / wss；兼容 net::ERR_ABORTED 后面紧跟 URL 的情况）
 *   8. 还原暂存的代码块/SVG，并对 SVG/代码块做 DOMPurify 消毒
 *
 * @param {string} text  - 原始 Markdown（AI 输出）
 * @param {Object} [opts]
 * @param {boolean} [opts.autoLink=true]      - 是否把裸 URL 自动转成 <a>
 * @param {boolean} [opts.openExternal=true]  - 外链是否 target="_blank" + rel
 * @param {boolean} [opts.sanitize=true]      - 是否用 DOMPurify 做最终消毒（强烈建议开启）
 * @param {boolean} [opts.preserveSvg=true]   - 是否放行 ```svg``` / 原生 <svg> 块
 * @returns {string} HTML 字符串（可直接 innerHTML）
 */
(function registerMarkdown() {
  var SVGP = /[\s\/"']on\w+\s*=\s*"[^"]*"/gi;
  var SVGP2 = /[\s\/"']on\w+\s*=\s*'[^']*'/gi;
  var SVGP3 = /[\s\/"']on\w+\s*=\s*[^\s>]+/gi;
  function _fallbackSanitizeSvg(svg) {
    if (!svg) return '';
    return svg
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<script[^>]*>/gi, '')
      .replace(SVGP, '').replace(SVGP2, '').replace(SVGP3, '')
      .replace(/<set\s[^>]*attributeName\s*=\s*["']?(?:href|xlink:href)["']?[^>]*>/gi, '')
      .replace(/<animate\s[^>]*attributeName\s*=\s*["']?(?:href|xlink:href)["']?[^>]*>/gi, '')
      .replace(/<(?:set|animate)\s[^>]*to\s*=\s*["']?\s*javascript:[^"']*["']?[^>]*>/gi, '')
      .replace(/<(?:set|animate)\s[^>]*to\s*=\s*["']?\s*data:(?!image\/)[^"']*["']?[^>]*>/gi, '')
      .replace(/<(?:set|animate)\s[^>]*to\s*=\s*["']?\s*data:image\/svg\+xml[^"']*["']?[^>]*>/gi, '')
      .replace(/\sstyle\s*=\s*"[^"]*"/gi, '')
      .replace(/\sstyle\s*=\s*'[^']*'/gi, '')
      .replace(/\sstyle\s*=\s*[^\s>]+/gi, '')
      .replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(parseInt(n, 10)); })
      .replace(/&#x([0-9a-f]+);/gi, function (m, n) { return String.fromCharCode(parseInt(n, 16)); })
      .replace(/&colon;/gi, ':')
      .replace(/(href|xlink:href)\s*=\s*["']?\s*javascript:/gi, '$1="')
      .replace(/(href|xlink:href)\s*=\s*["']?\s*data:(?!image\/(?!svg\+xml))/gi, '$1="')
      .replace(/(href|xlink:href)\s*=\s*["']?\s*data:image\/svg\+xml/gi, '$1="')
      .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '');
  }
  function _sanitizeSvgSafe(svg) {
    try {
      if (typeof window !== 'undefined' && window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
        return window.DOMPurify.sanitize(svg, {
          USE_PROFILES: { svg: true, svgFilters: true },
          FORBID_TAGS: ['foreignObject', 'script', 'style'],
          FORBID_ATTR: ['style', 'onload', 'onclick', 'onbegin', 'onend', 'onrepeat']
        });
      }
    } catch (e) { /* 失败走降级 */ }
    return _fallbackSanitizeSvg(svg || '');
  }
  function _sanitizeFinalHtml(html) {
    try {
      if (typeof window !== 'undefined' && window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
        return window.DOMPurify.sanitize(html, {
          ADD_ATTR: ['target', 'rel'],
          FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button'],
          FORBID_ATTR: ['onload', 'onclick', 'onerror', 'onmouseover', 'onfocus']
        });
      }
    } catch (e) { /* 降级直接返回（前面已 escapeHtml + 仅允许白名单标签） */ }
    return html || '';
  }

  // 把 URL 做一次最小程度合法性判断：非 ASCII 字符已存在错误日志里，应该保留原样（允许中文查询参数，比如用户给的 supabase URL）
  var URL_RE = /\b((?:https?|ftp|wss?):\/\/[^\s<>"'`)\]]+[^\s<>"'`)\]\.,;。，；：])/gi;

  function renderBioQuestMarkdown(text, opts) {
    opts = opts || {};
    if (text == null) return '<p></p>';
    var raw = String(text);
    if (!raw) return '<p></p>';
    var openExt = opts.openExternal !== false;
    var autoLink = opts.autoLink !== false;
    var sanitize = opts.sanitize !== false;
    var preserveSvg = opts.preserveSvg !== false;

    // ========== Step -1：敏感凭据脱敏（JWT / Supabase service_role / AWS AK 等）==========
    // 放在所有处理之前做 —— 否则 autoLink 之后 <a> 里再替换会破坏 DOM。
    // 仅对代码/文本里"裸露"的凭据打码，已正确 stash 的链接/代码不受影响。
    try {
      if (typeof redactSensitiveSecrets === 'function') {
        raw = redactSensitiveSecrets(raw);
      }
    } catch (e) { /* ignore */ }

    var stash = [];
    // 占位符规则：BKSTASH + 数字 + END，两侧 \u0000 作边界。
    // 刻意避开 _ * ~ [ ]，防止被斜体/粗体/删除线/链接正则误伤
    var STASH_RE = /\u0000BKSTASH:(\d+)\|END\u0000/g;
    function stashItem(s) { stash.push(s); return '\u0000BKSTASH:' + (stash.length - 1) + '|END\u0000'; }
    function unstash(html) {
      if (html == null) return '';
      var h = String(html);
      // 最多循环 3 次，防还原内容里又包含 STASH 占位（引用块递归）
      var max = 3;
      while (STASH_RE.test(h) && max-- > 0) {
        h = h.replace(STASH_RE, function (_m, idx) {
          return stash[+idx] || '';
        });
      }
      return h;
    }

    // ========= Step 0. 保护块 =========
    // 0.1 代码块 ``` （允许 ```svg / ```xml 特殊处理）
    raw = raw.replace(/```([\w +\-]*)\n?([\s\S]*?)```/g, function (_m, lang, code) {
      var L = (lang || '').trim().toLowerCase();
      if (preserveSvg && (L === 'svg' || L === 'xml') && /<svg[\s>]/i.test(code)) {
        return stashItem('<!-- SVG -->' + _sanitizeSvgSafe(code.trim()));
      }
      return stashItem('<!-- CODE:' + L + '--><pre><code>' +
        escapeHtml(code.replace(/\n$/, '')) + '</code></pre>');
    });
    // 0.2 行内 <svg> ... </svg>
    if (preserveSvg) {
      raw = raw.replace(/(<svg[\s\S]*?<\/svg>)/gi, function (m) {
        return stashItem('<!-- SVG -->' + _sanitizeSvgSafe(m));
      });
    }

    // 先把 [[ANIM:xxx]] 清理（AI 客户端内部动画标记）
    raw = raw.replace(/\[\[ANIM:\w+\]\]/g, '');

    // ========= Step 1. 先按 "行" 处理块级结构 =========
    // 先统一换行
    raw = raw.replace(/\r\n?/g, '\n');
    // 把水平分隔线替换成占位（空行包围）
    raw = raw.replace(/^[ \t]*(?:[-*_])[ \t]*(?:[-*_])[ \t]*(?:[-*_])[ \t\-*_]*$/gm, '\n\n__BQ_HR__\n\n');

    // ========= Step 1.1. 表格（GitHub-Flavored Markdown）==========
    // 连续以 | 开头的行，第二行为分隔行（|---|）时识别为表格。
    // 通过占位符 __BQ_TABLE_n 在行循环中作为块级元素输出（避免被 <p> 包裹）。
    var _tables = [];
    raw = raw.replace(/((?:^[ \t]*\|[^\n]*\n?)+)/gm, function (block) {
      var tblLines = block.replace(/\n$/, '').split('\n');
      if (tblLines.length < 2) return block;   // 至少 表头 + 分隔行
      var sep = tblLines[1].trim();
      if (sep.indexOf('|') === -1) return block;
      var sepClean = sep.replace(/[|\s:]/g, '');
      if (!/^-+$/.test(sepClean)) return block; // 第二行必须是 --- 分隔行
      function cells(line) {
        var l = line.trim();
        if (l.charAt(0) === '|') l = l.slice(1);
        if (l.charAt(l.length - 1) === '|') l = l.slice(0, -1);
        return l.split('|').map(function (c) { return c.trim(); });
      }
      var header = cells(tblLines[0]);
      var body = tblLines.slice(2).filter(function (l) { return l.trim().length > 0; }).map(cells);
      var html = '<div class="bq-table-wrap" style="overflow-x:auto;margin:14px 0;">' +
        '<table class="bq-table">' +
        '<thead><tr>' + header.map(function (c) { return '<th>' + inlineMd(c) + '</th>'; }).join('') + '</tr></thead>' +
        '<tbody>';
      body.forEach(function (row) {
        html += '<tr>' + row.map(function (c) { return '<td>' + inlineMd(c) + '</td>'; }).join('') + '</tr>';
      });
      html += '</tbody></table></div>';
      _tables.push(html);
      return '\n\n__BQ_TABLE__' + (_tables.length - 1) + '\n\n';
    });

    var lines = raw.split('\n');
    var out = [];
    var inList = null;      // {tag:'ul'|'ol', buffer:[]}
    var inQuote = false;    // 正在引用块里？
    var quoteLines = [];    // 引用块累积的行（递归调用 render 内层内容）

    function closeList() {
      if (inList) {
        out.push('<' + inList.tag + '>');
        out.push(inList.buffer.join(''));
        out.push('</' + inList.tag + '>');
        inList = null;
      }
    }
    function closeQuote() {
      if (inQuote) {
        var inner = quoteLines.join('\n');
        out.push('<blockquote>' + renderBioQuestMarkdown(inner, Object.assign({}, opts, { sanitize: false })) + '</blockquote>');
        inQuote = false;
        quoteLines = [];
      }
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.replace(/^[ \t]*/, '');

      if (trimmed === '__BQ_HR__') {
        closeList(); closeQuote();
        out.push('<hr/>');
        continue;
      }

      // 表格占位符 → 直接输出块级表格 HTML
      var tblM = /^__BQ_TABLE__(\d+)$/.exec(trimmed);
      if (tblM) {
        closeList(); closeQuote();
        var _ti = +tblM[1];
        if (_tables[_ti]) out.push(_tables[_ti]);
        continue;
      }

      // 空行 → 结束所有当前容器
      if (trimmed.length === 0) {
        closeList();
        if (inQuote) closeQuote();
        continue;
      }

      // 标题：# ~ ######
      var h = /^(#{1,6})\s+(.*)$/.exec(trimmed);
      if (h) {
        closeList(); closeQuote();
        var lv = h[1].length;
        out.push('<h' + lv + '>' + inlineMd(h[2]) + '</h' + lv + '>');
        continue;
      }

      // 引用行 > xxx / > 空
      var q = /^>\s?(.*)$/.exec(trimmed);
      if (q) {
        closeList();
        inQuote = true;
        quoteLines.push(q[1]);
        continue;
      } else {
        if (inQuote) closeQuote();
      }

      // 无序列表 - * +
      var ul = /^([-*+])\s+(.*)$/.exec(trimmed);
      if (ul) {
        if (!inList || inList.tag !== 'ul') { closeList(); inList = { tag: 'ul', buffer: [] }; }
        inList.buffer.push('<li>' + inlineMd(ul[2]) + '</li>');
        continue;
      }
      // 有序列表 1.
      var ol = /^(\d+)\.\s+(.*)$/.exec(trimmed);
      if (ol) {
        if (!inList || inList.tag !== 'ol') { closeList(); inList = { tag: 'ol', buffer: [] }; }
        inList.buffer.push('<li>' + inlineMd(ol[2]) + '</li>');
        continue;
      }

      // 普通段落行：如果没容器就包 <p>（注意：连续非空行会合并到同一个段落？避免每一行都 <p>）
      closeList();
      // 看最后一个 out 元素是不是未关闭的 "P_START"
      var last = out[out.length - 1];
      if (last && last.__isPara === true) {
        last.value += '\n' + line;
      } else {
        var paraObj = { __isPara: true, value: line };
        out.push(paraObj);
      }
    }
    closeList(); closeQuote();

    // 收尾：把段落对象渲染成 <p>
    var blocks = [];
    for (var j = 0; j < out.length; j++) {
      var x = out[j];
      if (x && typeof x === 'object' && x.__isPara) {
        var inline = inlineMd(x.value.replace(/\n/g, ' '));
        if (inline.trim()) blocks.push('<p>' + inline + '</p>');
      } else {
        blocks.push(x);
      }
    }
    var html = blocks.join('\n');

    // ========= Step 8. 还原暂存块 =========
    html = unstash(html);

    if (sanitize) html = _sanitizeFinalHtml(html);
    return html;

    // ---------- helper：行内 markdown ----------
    function inlineMd(s) {
      if (!s) return '';
      var t = s;

      // === 关键修复：escapeHtml 之前先把"有结构"的 markdown 元素 stash ===
      // 避免 escapeHtml 把 & 变成 &amp; 导致 URL_RE 结尾误判（; 在排除集合里）
      // 注意：刻意不在这里还原上层 STASH（占位符不含 _*~[] 所以完全不会被误伤）

      // 处理顺序：先处理有明确起止符的 markdown 链接，再兜底 autoLink 裸 URL
      // 这样 `[text](https://x)` 内部的 URL 会先被 stash，不会被 autoLink 重复命中

      // 1. 图片 ![alt](src "title?") —— 必须在 [text](url) 之前
      t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, function (_m, alt, src, title) {
        var a = title ? ' title="' + escapeHtml(title) + '"' : '';
        return stashItem('<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(alt) + '" loading="lazy" decoding="async"' + a + '/>');
      });

      // 2. [text](url "title?")
      t = t.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, function (_m, txt, url, title) {
        return stashItem(renderLink(url, txt, title));
      });

      // 3. <https://...> 尖括号链接
      t = t.replace(/<((?:https?|ftp|wss?):\/\/[^<>\s]+)>/gi, function (_m, url) {
        return stashItem(renderLink(url, url, null));
      });

      // 4. 行内代码 `...`（必须先于斜体/粗体，否则 code 中的 * 会误伤）
      t = t.replace(/`([^`]+)`/g, function (_m, c) {
        return stashItem('<code>' + escapeHtml(c) + '</code>');
      });

      // 5. 裸 URL 自动转链接（放在有明确起止符的链接之后，避免重复匹配）
      //    此时 markdown 链接已被 stash，autoLink 只会命中纯文本里真正裸露的 URL
      if (autoLink) {
        t = t.replace(URL_RE, function (u) {
          return stashItem(renderLink(u, u, null));
        });
      }

      // 现在才 escapeHtml：纯文本才转义，不会污染 URL / 链接 / 代码
      t = escapeHtml(t);

      // 粗体 **...** 或 __...__
      t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      t = t.replace(/__([^_]+)__/g, '<strong>$1</strong>');
      // 斜体 *...* 或 _..._ （已经处理了 ** 所以 * 单个是安全的）
      t = t.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
      t = t.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>');
      // 删除线 ~~...~~
      t = t.replace(/~~([^~]+)~~/g, '<del>$1</del>');

      // 最后才统一还原 stash：避免 HTML 属性中 _blank 被斜体正则误伤
      return unstash(t);
    }

    function renderLink(url, txt, title) {
      if (!url) return escapeHtml(txt || url || '');
      var attrExt = '';
      if (openExt && /^(https?|ftp|wss?):/i.test(url)) {
        attrExt = ' target="_blank" rel="noopener noreferrer nofollow"';
      }
      var t = title ? ' title="' + escapeHtml(title) + '"' : '';
      return '<a href="' + escapeHtml(url) + '"' + t + attrExt + '>' + escapeHtml(txt || url) + '</a>';
    }
  }

  // 暴露到 BioQuest + window（tutor/discussion/practice 均可直接用）
  if (typeof window !== 'undefined') {
    window.BioQuestMarkdown = renderBioQuestMarkdown;
    BioQuest.markdown = renderBioQuestMarkdown;
  }
})();

/**
 * 公共脚本懒加载器（统一各模块重复的 createElement('script') 实现）
 * 特性：去重（同 src 并发只加载一次，共享 Promise）、超时控制、可选校验函数。
 * @param {string} src - 脚本 URL
 * @param {Object} [opts]
 * @param {Function} [opts.verify] - 加载完成后校验函数，返回 falsy 视为加载失败
 * @param {number} [opts.timeout=15000] - 超时毫秒数
 * @returns {Promise<void>} 加载成功 resolve，失败 reject（并清除缓存以允许重试）
 */
if (typeof window !== 'undefined' && typeof window.loadScriptOnce !== 'function') {
  window.loadScriptOnce = (function () {
    var _cache = {}; // src -> Promise
    return function loadScriptOnce(src, opts) {
      if (!src) return Promise.reject(new Error('loadScriptOnce: src 为空'));
      if (_cache[src]) return _cache[src];
      opts = opts || {};
      var timeout = opts.timeout || 15000;
      var p = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = src;
        s.async = true;
        var done = false;
        var timer = setTimeout(function () {
          if (done) return;
          done = true;
          s.onload = s.onerror = null;
          reject(new Error('脚本加载超时: ' + src));
        }, timeout);
        s.onload = function () {
          if (done) return;
          done = true;
          clearTimeout(timer);
          if (typeof opts.verify === 'function') {
            try {
              if (!opts.verify()) {
                reject(new Error('脚本校验失败: ' + src));
                return;
              }
            } catch (e) {
              reject(e);
              return;
            }
          }
          resolve();
        };
        s.onerror = function () {
          if (done) return;
          done = true;
          clearTimeout(timer);
          reject(new Error('脚本加载失败: ' + src));
        };
        document.head.appendChild(s);
      });
      _cache[src] = p;
      p.catch(function () { delete _cache[src]; });
      return p;
    };
  })();
  // Q-03：同时注册到 BioQuest 命名空间作为规范路径
  BioQuest.loadScriptOnce = window.loadScriptOnce;
}

/**
 * 模块编号转中文名称
 * 将数字编号映射为对应的竞赛生物学科目名称
 * @param {number|string} num - 模块编号
 * @returns {string} 模块中文名称
 */
function moduleName(num) {
  const MODULE_MAP = {
    1: '植物学',
    2: '动物学',
    3: '生物化学',
    4: '细胞生物学',
    5: '分子生物学',
    6: '遗传学',
    7: '微生物学',
    8: '生态学',
    9: '进化生物学',
    10: '动物生理学',
    11: '植物生理学',
    12: '实验技术',
    13: '生物信息学',
    14: '通用'
  };

  const key = String(num);
  return MODULE_MAP[key] || `模块${num}`;
}

/**
 * 深拷贝对象
 * 使用结构化克隆算法复制复杂对象
 * @template T
 * @param {T} obj - 需要拷贝的对象
 * @returns {T} 深拷贝后的新对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  try {
    return structuredClone(obj);
  } catch (e) {
    return JSON.parse(JSON.stringify(obj));
  }
}

/**
 * 截断文本并添加省略号
 * @param {string} text - 原始文本
 * @param {number} maxLength - 最大长度
 * @param {string} [ellipsis='...'] - 省略符号
 * @returns {string} 截断后的文本
 */
function truncateText(text, maxLength, ellipsis = '...') {
  if (typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * 计算正确率百分比
 * @param {number} correct - 正确数
 * @param {number} total - 总数
 * @returns {number} 百分比整数 (0-100)
 */
function calcAccuracy(correct, total) {
  if (!total || total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * 获取数组中随机一个元素
 * @template T
 * @param {T[]} array - 源数组
 * @returns {T|undefined} 随机元素
 */
function randomPick(array) {
  if (!Array.isArray(array) || array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 从数组中随机选取 N 个不重复元素
 * @template T
 * @param {T[]} array - 源数组
 * @param {number} count - 选取数量
 * @returns {T[]} 选取的元素数组
 */
function randomSample(array, count) {
  if (!Array.isArray(array) || array.length === 0) return [];
  if (count >= array.length) return shuffle([...array]);

  const indices = new Set();
  while (indices.size < count) {
    indices.add(Math.floor(Math.random() * array.length));
  }

  return [...indices].map((i) => array[i]);
}

/**
 * 渲染题目图表/图片
 * 支持 data URI、外部 URL、Markdown 表格、ASCII 表格和纯文本描述
 * @param {string} chart - 图表内容
 * @returns {string} 图表 HTML
 */
function renderChart(chart) {
  if (chart === null || chart === undefined) return '';
  if (chart === '' || (typeof chart === 'string' && chart.trim() === '')) return '';

  // 兼容对象/数组格式
  if (typeof chart !== 'string') {
    try {
      if (chart && typeof chart.url === 'string' && chart.url) {
        chart = chart.url;
      } else if (Array.isArray(chart) && chart.length > 0) {
        if (typeof chart[0] === 'string') {
          chart = chart.join('\n');
        } else if (Array.isArray(chart[0])) {
          // 二维数组：[['列1','列2'], ['A','B']]
          var html2 = '<div class="question-chart-wrapper chart-table" style="margin:12px 0;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid var(--border-light);font-size:0.92rem;">';
          for (var rx = 0; rx < chart.length; rx++) {
            html2 += '<tr>';
            for (var cx = 0; cx < chart[rx].length; cx++) {
              var tag2 = rx === 0 ? 'th' : 'td';
              html2 += `<${tag2} style="padding:10px 14px;border:1px solid var(--border-light);background:${rx === 0 ? 'var(--surface-secondary)' : 'var(--surface-tertiary)'};text-align:center;">${escapeHtml(String(chart[rx][cx]))}</${tag2}>`;
            }
            html2 += '</tr>';
          }
          html2 += '</table></div>';
          return html2;
        } else {
          chart = JSON.stringify(chart);
        }
      } else {
        chart = JSON.stringify(chart);
      }
    } catch(e) {
      chart = String(chart);
    }
  }

  const s = String(chart).trim();
  if (!s) return '';

  // 真实图片：data URI 或 http(s) URL；增加 onerror 兜底与懒加载
  if (s.startsWith('data:image') || /^https?:\/\//.test(s)) {
    const src = s.split(/\s+/)[0];
    return `<div class="question-chart-wrapper" style="margin:12px 0;">
      <img src="${escapeHtml(src)}" alt="题目图表" loading="lazy" decoding="async"
        style="max-width:100%;border-radius:12px;border:1px solid var(--border-light);background:var(--surface-tertiary);padding:8px;box-shadow:0 2px 8px rgba(0,0,0,0.06);display:block;"
        onerror="if(!this.dataset.retried){this.dataset.retried='1';this.style.display='none';var note=document.createElement('div');note.style.cssText='margin-top:8px;padding:10px 14px;border-radius:8px;border:1px dashed var(--border-light);color:var(--text-muted);font-size:0.82rem;background:var(--surface-tertiary);';note.textContent='图表/图片加载失败，请检查网络或稍后重试。';this.parentNode.appendChild(note);}">
    </div>`;
  }

  // Markdown 表格（多行）：| 列1 | 列2 |
  if (s.startsWith('|') && s.includes('\n')) {
    var rows = s.split('\n').map(function(r){ return r.trim(); }).filter(function(r){ return r.length > 0; });
    var allTable = rows.every(function(r){ return r.startsWith('|') && r.endsWith('|'); });
    if (allTable) {
      var html = '<div class="question-chart-wrapper chart-table" style="margin:12px 0;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid var(--border-light);font-size:0.92rem;">';
      for (var i = 0; i < rows.length; i++) {
        if (/^\|[-:\|\s]+\|$/.test(rows[i])) continue;
        var cells = rows[i].split('|').map(function(c){ return c.trim(); }).filter(function(c){ return c.length > 0; });
        if (cells.length === 0) continue;
        var tag = i === 0 ? 'th' : 'td';
        html += '<tr>';
        for (var j = 0; j < cells.length; j++) {
          html += `<${tag} style="padding:10px 14px;border:1px solid var(--border-light);background:${i === 0 ? 'var(--surface-secondary)' : 'var(--surface-tertiary)'};text-align:center;">${escapeHtml(cells[j])}</${tag}>`;
        }
        html += '</tr>';
      }
      html += '</table></div>';
      return html;
    }
  }

  // 单个 Markdown 表头行：| 组别 | 对照组 | 实验组A |
  if (s.startsWith('|') && s.endsWith('|') && s.indexOf('|') !== s.lastIndexOf('|')) {
    var cells2 = s.split('|').map(function(c){ return c.trim(); }).filter(function(c){ return c.length > 0; });
    if (cells2.length >= 2) {
      return `<div class="question-chart-wrapper chart-table" style="margin:12px 0;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid var(--border-light);font-size:0.92rem;"><tr>${cells2.map(function(c){ return `<th style="padding:10px 14px;border:1px solid var(--border-light);background:var(--surface-secondary);text-align:center;">${escapeHtml(c)}</th>`; }).join('')}</tr></table></div>`;
    }
  }

  // 纯文本描述：使用等宽字体保留缩进/换行
  return `<div class="question-chart-wrapper chart-text" style="margin:12px 0;background:var(--surface-tertiary);padding:16px;border-radius:12px;border:1px dashed var(--border-light);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:0.9rem;line-height:1.6;white-space:pre-wrap;overflow-x:auto;">${escapeHtml(s)}</div>`;
}

/**
 * 判断是否为移动设备
 * @returns {boolean} 是否为移动设备
 */
function isMobile() {
  return /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent)
    || window.innerWidth < 768;
}

/**
 * 获取 URL 查询参数
 * @param {string} [url] - URL 字符串，默认为当前页面 URL
 * @returns {Object} 查询参数键值对
 */
function getQueryParams(url) {
  const search = url
    ? new URL(url).search
    : window.location.search;

  const params = {};
  const searchParams = new URLSearchParams(search);

  for (const [key, value] of searchParams) {
    params[key] = value;
  }

  return params;
}

/**
 * 平滑滚动到指定元素
 * @param {string|HTMLElement} target - 目标元素或选择器
 * @param {Object} [options] - 滚动选项
 * @param {number} [options.offset=0] - 偏移量（像素）
 */
function scrollToElement(target, options = {}) {
  const { offset = 0 } = options;

  const element = typeof target === 'string'
    ? document.querySelector(target)
    : target;

  if (!element) return;

  const top = element.getBoundingClientRect().top + window.scrollY - offset;

  window.scrollTo({
    top,
    behavior: 'smooth'
  });
}

/**
 * 复制文本到剪贴板
 * @param {string} text - 需要复制的文本
 * @returns {Promise<boolean>} 是否复制成功
 */
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (e) {
    console.warn('[BioQuest Utils] 复制失败:', e.message);
    return false;
  }
}

/**
 * 相对时间格式化
 * @param {number|string|Date} date - 日期
 * @returns {string} 相对时间描述
 */
function timeAgo(date) {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  if (days < 30) return `${Math.floor(days / 7)} 周前`;
  if (days < 365) return `${Math.floor(days / 30)} 个月前`;

  return `${Math.floor(days / 365)} 年前`;
}