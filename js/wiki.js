/**
 * ============================================================
 * BioQuest — 百科模块 (Wiki Module)
 * ============================================================
 * 一个纯前端、基于 localStorage 的生物学词条 Wiki。
 * 功能：
 *   1. 词条 CRUD（创建 / 阅读 / 编辑 / 删除）
 *   2. 全文搜索 + 分类筛选 + 标签筛选
 *   3. 从维基百科（中文 / English）自动抓取并导入词条
 *      —— 使用 Wikipedia REST API 与 Action API（均支持 CORS，origin=*）
 *   4. 从百度百科抓取（经 r.jina.ai 阅读器中转，实验性）
 *   5. 手动粘贴 Markdown 导入（通用兜底）
 *   6. Markdown 渲染复用 window.BioQuestMarkdown（内置 DOMPurify 消毒）
 *
 * 设计参考：TiddlyWiki / MyWiki / m.html 等纯前端单文件 Wiki。
 * 数据全部存储在浏览器 localStorage，无后端依赖。
 * ============================================================
 */

'use strict';

(function () {
  // ===== 常量 =====
  var STORAGE_KEY = 'bioquest_wiki_entries_v1';
  var SEED_FLAG_KEY = 'bioquest_wiki_seeded_v1';
  var SEED_URL = 'data/wiki-seed.json?v=20260812a';

  // 学科分类（与 topics.json / knowledge-graph 配色保持一致）
  var CATEGORIES = [
    '细胞生物学', '分子生物学', '生物化学', '遗传学',
    '动物学', '植物学', '微生物学', '生态学'
  ];

  // 分类 → 主题色（用于徽章着色，与 ebook.css 的关联知识点配色一致）
  var CATEGORY_COLORS = {
    '细胞生物学': '#3a5ba4',
    '分子生物学': '#6a4aa4',
    '生物化学': '#a47a2a',
    '遗传学': '#a45a2a',
    '动物学': '#a43a5a',
    '植物学': '#3a8a3a',
    '微生物学': '#2a8aa4',
    '生态学': '#2a7c4a'
  };

  // ===== 状态 =====
  var state = {
    entries: [],
    filter: { keyword: '', category: '', tag: '' },
    view: 'list',          // list | detail
    currentId: null,
    editingId: null        // 编辑模式时的词条 id（null=新建）
  };

  // ===== 存储 =====
  function loadEntries() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.warn('[Wiki] 读取本地词条失败:', e.message);
      return [];
    }
  }

  function saveEntries() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
      return true;
    } catch (e) {
      console.error('[Wiki] 保存失败:', e.message);
      toast('保存失败：' + (e.message || '存储空间不足'), 'error');
      return false;
    }
  }

  // ===== 种子初始化（首次访问加载示范词条）=====
  function ensureSeed() {
    if (localStorage.getItem(SEED_FLAG_KEY)) {
      state.entries = loadEntries();
      return;
    }
    // 没有种子标记：尝试加载种子文件
    fetch(SEED_URL, { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        var seeds = (data && data.entries) || [];
        var now = Date.now();
        // 注入时间戳
        seeds.forEach(function (e, i) {
          e.createdAt = now - (seeds.length - i) * 86400000;
          e.updatedAt = e.createdAt;
        });
        state.entries = seeds;
        saveEntries();
        localStorage.setItem(SEED_FLAG_KEY, '1');
        renderAll();
      })
      .catch(function (err) {
        console.warn('[Wiki] 种子加载失败，以空 Wiki 启动:', err.message);
        state.entries = [];
        localStorage.setItem(SEED_FLAG_KEY, '1');
        renderAll();
      });
  }

  // ===== 工具函数 =====
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    return typeof window.escapeHtml === 'function' ? window.escapeHtml(s) : String(s == null ? '' : s);
  }

  // 仅允许 http(s) 协议的 URL（用于渲染到 href，防止 javascript: 等协议）
  function safeUrl(u) {
    var s = String(u == null ? '' : u).trim();
    return /^https?:\/\//i.test(s) ? s : '';
  }

  function renderMd(text) {
    if (typeof window.BioQuestMarkdown === 'function') {
      return window.BioQuestMarkdown(text, { autoLink: true, openExternal: true, sanitize: true });
    }
    return '<p>' + esc(text) + '</p>';
  }

  function newId() {
    return typeof window.generateId === 'function'
      ? window.generateId({ prefix: 'wiki-' })
      : 'wiki-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function nowIso() { return new Date().toISOString(); }

  function findEntry(id) {
    for (var i = 0; i < state.entries.length; i++) {
      if (state.entries[i].id === id) return state.entries[i];
    }
    return null;
  }

  // 收集所有标签（用于标签筛选）
  function allTags() {
    var map = {};
    state.entries.forEach(function (e) {
      (e.tags || []).forEach(function (t) { map[t] = (map[t] || 0) + 1; });
    });
    return Object.keys(map).map(function (t) { return { name: t, count: map[t] }; })
      .sort(function (a, b) { return b.count - a.count || a.name.localeCompare(b.name); });
  }

  // ===== Toast =====
  var toastTimer = null;
  function toast(msg, type) {
    type = type || 'info';
    var box = $('#wikiToast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'wikiToast';
      box.className = 'wiki-toast';
      document.body.appendChild(box);
    }
    box.textContent = msg;
    box.className = 'wiki-toast wiki-toast-' + type + ' show';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.className = 'wiki-toast wiki-toast-' + type; }, 2600);
  }

  // ===== 过滤 =====
  function filteredEntries() {
    var kw = state.filter.keyword.trim().toLowerCase();
    var cat = state.filter.category;
    var tag = state.filter.tag;
    return state.entries.filter(function (e) {
      if (cat && e.category !== cat) return false;
      if (tag && (!e.tags || e.tags.indexOf(tag) === -1)) return false;
      if (kw) {
        var hay = [e.title, e.summary, e.content, (e.aliases || []).join(' '), (e.tags || []).join(' ')]
          .join(' ').toLowerCase();
        if (hay.indexOf(kw) === -1) return false;
      }
      return true;
    }).sort(function (a, b) {
      // 按 updatedAt 降序
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  }

  // ===== 渲染：列表 =====
  function renderAll() {
    renderToolbarCounts();
    renderCategoryChips();
    renderTagChips();
    renderList();
  }

  function renderToolbarCounts() {
    var el = $('#wikiCount');
    if (el) el.textContent = String(state.entries.length);
  }

  function renderCategoryChips() {
    var wrap = $('#wikiCategoryFilters');
    if (!wrap) return;
    var html = '<button class="wiki-chip' + (!state.filter.category ? ' active' : '') + '" data-cat="">全部</button>';
    CATEGORIES.forEach(function (c) {
      var n = state.entries.filter(function (e) { return e.category === c; }).length;
      if (n === 0 && state.filter.category !== c) return; // 隐藏空分类（除非当前选中）
      html += '<button class="wiki-chip' + (state.filter.category === c ? ' active' : '') + '" data-cat="' + esc(c) + '" style="--chip-c:' + (CATEGORY_COLORS[c] || 'var(--color-primary)') + '">' + esc(c) + '<span class="wiki-chip-n">' + n + '</span></button>';
    });
    wrap.innerHTML = html;
  }

  function renderTagChips() {
    var wrap = $('#wikiTagFilters');
    if (!wrap) return;
    var tags = allTags();
    if (tags.length === 0) { wrap.innerHTML = ''; return; }
    var html = '<button class="wiki-chip sm' + (!state.filter.tag ? ' active' : '') + '" data-tag="">全部</button>';
    tags.slice(0, 24).forEach(function (t) {
      html += '<button class="wiki-chip sm' + (state.filter.tag === t.name ? ' active' : '') + '" data-tag="' + esc(t.name) + '">' + esc(t.name) + '<span class="wiki-chip-n">' + t.count + '</span></button>';
    });
    wrap.innerHTML = html;
  }

  function sourceBadge(e) {
    var s = e.source || 'manual';
    var label = ({
      seed: '内置', wikipedia: '维基', wikipedia_en: '维基EN', baidu: '百度', manual: '自建'
    })[s] || s;
    return '<span class="wiki-source-badge src-' + esc(s) + '" title="来源：' + esc(label) + '">' + esc(label) + '</span>';
  }

  function renderList() {
    var grid = $('#wikiGrid');
    if (!grid) return;
    var list = filteredEntries();
    if (list.length === 0) {
      grid.innerHTML = '<div class="wiki-empty">' +
        (state.entries.length === 0
          ? '<p>百科还是空的。</p><p>点击「新建词条」开始编写，或「从维基导入」一键抓取生物学名词。</p>'
          : '<p>没有匹配的词条，试试清除筛选条件。</p>') +
        '</div>';
      return;
    }
    var html = '';
    list.forEach(function (e) {
      var color = CATEGORY_COLORS[e.category] || 'var(--color-primary)';
      var tagsHtml = (e.tags || []).slice(0, 4).map(function (t) {
        return '<span class="wiki-card-tag" data-tag="' + esc(t) + '">' + esc(t) + '</span>';
      }).join('');
      var summary = e.summary || stripMd(e.content).slice(0, 90);
      html += '<article class="wiki-card" data-id="' + esc(e.id) + '" style="--cat-c:' + color + '">' +
        '<div class="wiki-card-top">' +
          '<span class="wiki-card-cat">' + esc(e.category || '未分类') + '</span>' +
          sourceBadge(e) +
        '</div>' +
        '<h3 class="wiki-card-title">' + esc(e.title) + '</h3>' +
        '<p class="wiki-card-summary">' + esc(summary) + '</p>' +
        (tagsHtml ? '<div class="wiki-card-tags">' + tagsHtml + '</div>' : '') +
        '<div class="wiki-card-meta"><span>' + relTime(e.updatedAt) + '</span></div>' +
        '</article>';
    });
    grid.innerHTML = html;
  }

  function stripMd(text) {
    if (!text) return '';
    return String(text).replace(/[#*`>\[\]\-_=~|]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function relTime(ts) {
    if (!ts) return '';
    try {
      if (typeof window.timeAgo === 'function') return window.timeAgo(ts);
      return window.timeAgo ? window.timeAgo(ts) : '';
    } catch (e) { return ''; }
  }

  // ===== 渲染：详情 =====
  function openDetail(id) {
    var e = findEntry(id);
    if (!e) return;
    state.view = 'detail';
    state.currentId = id;
    var color = CATEGORY_COLORS[e.category] || 'var(--color-primary)';
    var body = $('#wikiDetailBody');
    var tagsHtml = (e.tags || []).map(function (t) {
      return '<span class="wiki-card-tag" data-tag="' + esc(t) + '">' + esc(t) + '</span>';
    }).join('');
    var aliases = (e.aliases || []).filter(Boolean).join('、');
    body.innerHTML =
      '<div class="wiki-detail-top" style="--cat-c:' + color + '">' +
        '<span class="wiki-card-cat">' + esc(e.category || '未分类') + '</span>' +
        sourceBadge(e) +
      '</div>' +
      '<h2 class="wiki-detail-title">' + esc(e.title) + '</h2>' +
      (aliases ? '<p class="wiki-detail-aliases">别名：' + esc(aliases) + '</p>' : '') +
      (e.summary ? '<p class="wiki-detail-summary">' + esc(e.summary) + '</p>' : '') +
      '<div class="wiki-detail-content">' + renderMd(e.content || '') + '</div>' +
      (tagsHtml ? '<div class="wiki-card-tags">' + tagsHtml + '</div>' : '') +
      (e.sourceUrl ? '<p class="wiki-detail-source">来源链接：<a href="' + esc(safeUrl(e.sourceUrl)) + '" target="_blank" rel="noopener noreferrer">' + esc(e.sourceUrl) + '</a></p>' : '') +
      '<p class="wiki-detail-time">最后更新：' + esc(relTime(e.updatedAt) || '—') + '</p>';

    // 绑定操作按钮
    var editBtn = $('#wikiDetailEdit');
    if (editBtn) editBtn.dataset.id = id;
    var delBtn = $('#wikiDetailDelete');
    if (delBtn) delBtn.dataset.id = id;

    openModal('wikiDetailModal');
  }

  // ===== 编辑器 =====
  function openEditor(id) {
    state.editingId = id || null;
    var e = id ? findEntry(id) : null;
    var f = $('#wikiEditorForm').elements;
    f.title.value = e ? e.title : '';
    f.aliases.value = e ? (e.aliases || []).join('、') : '';
    f.category.value = e ? e.category : '';
    f.tags.value = e ? (e.tags || []).join('、') : '';
    f.summary.value = e ? (e.summary || '') : '';
    f.content.value = e ? (e.content || '') : '';
    updateEditorPreview();
    $('#wikiEditorTitle').textContent = e ? '编辑词条' : '新建词条';
    openModal('wikiEditorModal');
    setTimeout(function () { f.title.focus(); }, 50);
  }

  function updateEditorPreview() {
    var ta = $('#wikiEditorForm').elements['content'];
    var prev = $('#wikiEditorPreview');
    prev.innerHTML = renderMd(ta.value);
  }

  function saveEditor(ev) {
    ev.preventDefault();
    var f = $('#wikiEditorForm').elements;
    var title = f.title.value.trim();
    if (!title) { toast('请填写标题', 'error'); f.title.focus(); return; }
    var content = f.content.value.trim();
    if (!content) { toast('请填写正文内容', 'error'); f.content.focus(); return; }

    var entry = state.editingId ? findEntry(state.editingId) : null;
    var now = nowIso();
    var tags = splitByDelim(f.tags.value);
    var aliases = splitByDelim(f.aliases.value);

    if (entry) {
      entry.title = title;
      entry.aliases = aliases;
      entry.category = f.category.value.trim();
      entry.tags = tags;
      entry.summary = f.summary.value.trim();
      entry.content = content;
      entry.updatedAt = now;
    } else {
      entry = {
        id: newId(),
        title: title,
        aliases: aliases,
        category: f.category.value.trim(),
        tags: tags,
        summary: f.summary.value.trim(),
        content: content,
        source: 'manual',
        sourceUrl: '',
        createdAt: now,
        updatedAt: now
      };
      state.entries.unshift(entry);
    }
    saveEntries();
    closeModal('wikiEditorModal');
    renderAll();
    toast(state.editingId ? '已更新' : '已创建', 'success');
  }

  function splitByDelim(str) {
    return String(str || '').split(/[、,，;;\n]+/).map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0; });
  }

  // ===== 删除 =====
  function deleteEntry(id) {
    var e = findEntry(id);
    if (!e) return;
    if (!confirm('确定删除词条「' + e.title + '」？此操作不可撤销。')) return;
    state.entries = state.entries.filter(function (x) { return x.id !== id; });
    saveEntries();
    closeModal('wikiDetailModal');
    renderAll();
    toast('已删除', 'success');
  }

  // ===== 模态框控制 =====
  function openModal(id) {
    var m = document.getElementById(id);
    if (!m) return;
    m.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(id) {
    var m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('show');
    // 若没有其它模态打开，恢复滚动
    if (!$all('.wiki-modal.show').length) document.body.style.overflow = '';
  }

  // ============================================================
  //  从维基百科 / 百度百科导入
  // ============================================================

  // 维基百科 plain-text extract → markdown
  function wikiTextToMd(text) {
    if (!text) return '';
    var t = String(text);
    // 标题：== xx == → ## xx ；=== xx === → ### xx（MediaWiki 中 N 个 = 对应 HN）
    t = t.replace(/^(={2,})(.+?)\1\s*$/gm, function (_m, eq, h) {
      var lvl = Math.min(eq.length, 6);
      var prefix = '';
      for (var i = 0; i < lvl; i++) prefix += '#';
      return prefix + ' ' + h.trim();
    });
    // 粗体 '''x''' → **x** ；斜体 ''x'' → *x*
    t = t.replace(/'''(.+?)'''/g, '**$1**');
    t = t.replace(/''(.+?)''/g, '*$1*');
    // 内部链接 [[A|B]] → B ；[[A]] → A
    t = t.replace(/\[\[[^\]]*\|([^\]]+)\]\]/g, '$1');
    t = t.replace(/\[\[([^\]]+)\]\]/g, '$1');
    // 外部链接 [http://x label] → label
    t = t.replace(/\[https?:\/\/[^\s\]]+\s([^\]]+)\]/g, '$1');
    // 模板 {{...}} → 移除（贪婪到行末的 }}
    t = t.replace(/\{\{[^}]*\}\}/g, '');
    // HTML 注释
    t = t.replace(/<!--[\s\S]*?-->/g, '');
    return t.trim();
  }

  // Wikipedia Action API：获取 plain-text extract
  function fetchWikipediaExtract(title, lang) {
    lang = lang || 'zh';
    var api = 'https://' + lang + '.wikipedia.org/w/api.php';
    var url = api + '?action=query&format=json&prop=extracts|info&explaintext=1&inprop=url&redirects=1' +
      '&titles=' + encodeURIComponent(title) + '&origin=*';
    return fetch(url, { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        var pages = (data && data.query && data.query.pages) || {};
        var keys = Object.keys(pages);
        if (!keys.length) throw new Error('未找到该词条');
        var p = pages[keys[0]];
        if (p.missing !== undefined) throw new Error('维基百科中未找到「' + title + '」');
        return {
          title: p.title,
          extract: p.extract || '',
          url: (p.fullurl) || ('https://' + lang + '.wikipedia.org/wiki/' + encodeURIComponent(p.title))
        };
      });
  }

  // Wikipedia REST API：获取摘要 + 缩略图（更友好的 summary）
  function fetchWikipediaSummary(title, lang) {
    lang = lang || 'zh';
    var url = 'https://' + lang + '.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title);
    return fetch(url, { cache: 'no-cache' })
      .then(function (r) { if (r.status === 404) throw new Error('未找到该词条'); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        return {
          title: data.title,
          summary: data.extract || '',
          thumbnail: (data.thumbnail && data.thumbnail.source) || '',
          url: (data.content_urls && data.content_urls.desktop && data.content_urls.desktop.page) || ''
        };
      });
  }

  // 百度百科：经 r.jina.ai 阅读器中转抓取（实验性，可能受限于网络/速率）
  function fetchBaiduViaReader(title) {
    var target = 'https://baike.baidu.com/item/' + encodeURIComponent(title);
    var readerUrl = 'https://r.jina.ai/' + target;
    return fetch(readerUrl, { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (md) {
        if (!md || md.length < 50) throw new Error('抓取内容为空');
        // r.jina.ai 返回的 markdown 顶部通常含 Title: / URL Source: / Markdown Content:
        var cleaned = cleanReaderMarkdown(md);
        return {
          title: title,
          markdown: cleaned.body,
          url: target
        };
      });
  }

  function cleanReaderMarkdown(md) {
    // 提取 Title 与正文
    var title = '';
    var mTitle = md.match(/^Title:\s*(.+)$/m);
    if (mTitle) title = mTitle[1].trim();
    // 截掉 URL Source 行及之后到 Markdown Content 之间的元信息
    var body = md;
    var mContent = md.match(/Markdown Content:\s*\n?([\s\S]*)$/);
    if (mContent) body = mContent[1];
    else {
      // 移除前导元数据行
      body = md.replace(/^(Title|URL Source|Markdown Content):.*\n?/gm, '');
    }
    return { title: title, body: body.trim() };
  }

  // 执行导入
  function runImport() {
    var f = $('#wikiImportForm').elements;
    var source = f.source.value;
    var title = f.title.value.trim();
    if (source !== 'manual' && !title) { toast('请输入词条名称', 'error'); f.title.focus(); return; }

    var btn = $('#wikiImportBtn');
    var statusEl = $('#wikiImportStatus');
    btn.disabled = true;
    btn.classList.add('loading');
    statusEl.className = 'wiki-import-status info';
    statusEl.textContent = '正在抓取「' + (title || '手动内容') + '」…';

    var promise;
    if (source === 'zh') {
      promise = Promise.all([fetchWikipediaSummary(title, 'zh'), fetchWikipediaExtract(title, 'zh')])
        .then(function (arr) {
          var sum = arr[0], ext = arr[1];
          return {
            title: ext.title || sum.title || title,
            summary: sum.summary || '',
            content: wikiTextToMd(ext.extract) || '',
            category: '',
            source: 'wikipedia',
            sourceUrl: ext.url || sum.url,
            thumbnail: sum.thumbnail
          };
        });
    } else if (source === 'en') {
      promise = Promise.all([fetchWikipediaSummary(title, 'en'), fetchWikipediaExtract(title, 'en')])
        .then(function (arr) {
          var sum = arr[0], ext = arr[1];
          return {
            title: ext.title || sum.title || title,
            summary: sum.summary || '',
            content: wikiTextToMd(ext.extract) || '',
            category: '',
            source: 'wikipedia_en',
            sourceUrl: ext.url || sum.url,
            thumbnail: sum.thumbnail
          };
        });
    } else if (source === 'baidu') {
      promise = fetchBaiduViaReader(title).then(function (r) {
        return {
          title: r.title || title,
          summary: stripMd(r.markdown).slice(0, 120),
          content: r.markdown,
          category: '',
          source: 'baidu',
          sourceUrl: r.url
        };
      });
    } else {
      // 手动粘贴
      var manualTitle = f.manualTitle.value.trim();
      var manualContent = f.manualContent.value.trim();
      if (!manualTitle) { toast('请填写标题', 'error'); btn.disabled = false; btn.classList.remove('loading'); return; }
      if (!manualContent) { toast('请粘贴正文内容', 'error'); btn.disabled = false; btn.classList.remove('loading'); return; }
      promise = Promise.resolve({
        title: manualTitle,
        summary: stripMd(manualContent).slice(0, 120),
        content: manualContent,
        category: '',
        source: 'manual',
        sourceUrl: ''
      });
    }

    promise.then(function (data) {
      // 填入编辑器，让用户确认 / 补充分类与标签
      closeModal('wikiImportModal');
      // 新建编辑器并预填
      state.editingId = null;
      var ef = $('#wikiEditorForm').elements;
      ef.title.value = data.title;
      ef.aliases.value = '';
      ef.category.value = data.category || '';
      ef.tags.value = '';
      ef.summary.value = data.summary || '';
      ef.content.value = data.content || '';
      updateEditorPreview();
      $('#wikiEditorTitle').textContent = '导入预览（可编辑后保存）';
      openModal('wikiEditorModal');
      statusEl.className = 'wiki-import-status success';
      statusEl.textContent = '抓取成功，请在编辑器中确认后保存。';
      btn.disabled = false;
      btn.classList.remove('loading');
    }).catch(function (err) {
      console.warn('[Wiki] 导入失败:', err);
      statusEl.className = 'wiki-import-status error';
      var hint = '';
      if (source === 'baidu') hint = '（百度百科需经阅读器中转，可能被限流；可改用「手动粘贴」）';
      else if (source === 'zh' || source === 'en') hint = '（请确认词条名称拼写，或网络是否可访问维基百科）';
      statusEl.textContent = '抓取失败：' + err.message + hint;
      btn.disabled = false;
      btn.classList.remove('loading');
    });
  }

  // 切换导入源时显示/隐藏手动粘贴区
  function syncImportSourceUI() {
    var f = $('#wikiImportForm').elements;
    var source = f.source.value;
    var manualBox = $('#wikiManualBox');
    var titleBox = $('#wikiImportTitleBox');
    if (manualBox) manualBox.style.display = (source === 'manual') ? '' : 'none';
    if (titleBox) titleBox.style.display = (source === 'manual') ? 'none' : '';
  }

  // ===== 导出备份 =====
  function exportBackup() {
    try {
      var blob = new Blob([JSON.stringify(state.entries, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'bioquest-wiki-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast('已导出备份', 'success');
    } catch (e) {
      toast('导出失败：' + e.message, 'error');
    }
  }

  // ===== 事件绑定 =====
  function bindEvents() {
    // 搜索（防抖）
    var search = $('#wikiSearch');
    if (search) {
      var onSearch = (typeof window.debounce === 'function' ? window.debounce : function (fn) { return fn; })(function () {
        state.filter.keyword = search.value;
        renderList();
      }, 200);
      search.addEventListener('input', onSearch);
    }

    // 分类 / 标签筛选（事件委托）
    document.body.addEventListener('click', function (ev) {
      var catChip = ev.target.closest('[data-cat]');
      if (catChip && $('#wikiCategoryFilters').contains(catChip)) {
        state.filter.category = catChip.dataset.cat;
        renderCategoryChips();
        renderList();
        return;
      }
      var tagChip = ev.target.closest('[data-tag]');
      if (tagChip && ($('#wikiTagFilters').contains(tagChip) || tagChip.closest('.wiki-card-tags') || tagChip.closest('.wiki-detail-content'))) {
        var tn = tagChip.dataset.tag;
        if (!tn) { // "全部"
          state.filter.tag = '';
        } else {
          state.filter.tag = (state.filter.tag === tn) ? '' : tn;
        }
        renderTagChips();
        renderList();
        if ($('#wikiTagFilters')) $('#wikiTagFilters').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      // 词条卡片点击 → 详情
      var card = ev.target.closest('.wiki-card[data-id]');
      if (card && $('#wikiGrid').contains(card)) {
        openDetail(card.dataset.id);
        return;
      }
    });

    // 工具栏按钮
    var newBtn = $('#wikiNewBtn');
    if (newBtn) newBtn.addEventListener('click', function () { openEditor(null); });
    var importBtn = $('#wikiImportOpenBtn');
    if (importBtn) importBtn.addEventListener('click', function () {
      syncImportSourceUI();
      openModal('wikiImportModal');
    });
    var exportBtn = $('#wikiExportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportBackup);

    // 模态框关闭
    $all('.wiki-modal-close, .wiki-modal-backdrop').forEach(function (el) {
      el.addEventListener('click', function () {
        var modal = el.closest('.wiki-modal');
        if (modal) closeModal(modal.id);
      });
    });
    // ESC 关闭最上层模态
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        var opened = $all('.wiki-modal.show');
        if (opened.length) closeModal(opened[opened.length - 1].id);
      }
    });

    // 编辑器
    var editorForm = $('#wikiEditorForm');
    if (editorForm) {
      editorForm.addEventListener('submit', saveEditor);
      var contentTa = editorForm.elements['content'];
      if (contentTa) {
        var onPreview = (typeof window.debounce === 'function' ? window.debounce : function (fn) { return fn; })(updateEditorPreview, 250);
        contentTa.addEventListener('input', onPreview);
      }
      // 插入 Markdown 快捷按钮
      $all('[data-md-insert]').forEach(function (btn) {
        btn.addEventListener('click', function () { insertMdSnippet(btn.dataset.mdInsert); });
      });
    }
    var editorCancel = $('#wikiEditorCancel');
    if (editorCancel) editorCancel.addEventListener('click', function () { closeModal('wikiEditorModal'); });

    // 详情操作
    var detailEdit = $('#wikiDetailEdit');
    if (detailEdit) detailEdit.addEventListener('click', function () { openEditor(detailEdit.dataset.id); });
    var detailDelete = $('#wikiDetailDelete');
    if (detailDelete) detailDelete.addEventListener('click', function () { deleteEntry(detailDelete.dataset.id); });

    // 导入
    var importForm = $('#wikiImportForm');
    if (importForm) {
      importForm.addEventListener('submit', function (ev) { ev.preventDefault(); runImport(); });
      var sourceSel = importForm.elements['source'];
      if (sourceSel) sourceSel.addEventListener('change', syncImportSourceUI);
    }
    var importCancel = $('#wikiImportCancel');
    if (importCancel) importCancel.addEventListener('click', function () { closeModal('wikiImportModal'); });
  }

  function insertMdSnippet(kind) {
    var ta = $('#wikiEditorForm').elements['content'];
    if (!ta) return;
    var wrap = function (pre, post) {
      var s = ta.selectionStart, e = ta.selectionEnd;
      var sel = ta.value.slice(s, e);
      var val = ta.value.slice(0, s) + pre + sel + (post || pre) + ta.value.slice(e);
      ta.value = val;
      ta.focus();
      ta.selectionStart = s + pre.length;
      ta.selectionEnd = e + pre.length;
      updateEditorPreview();
    };
    var linePrefix = function (pfx) {
      var s = ta.selectionStart;
      var lineStart = ta.value.lastIndexOf('\n', s - 1) + 1;
      ta.value = ta.value.slice(0, lineStart) + pfx + ta.value.slice(lineStart);
      ta.focus();
      updateEditorPreview();
    };
    if (kind === 'bold') wrap('**', '**');
    else if (kind === 'italic') wrap('*', '*');
    else if (kind === 'code') wrap('`', '`');
    else if (kind === 'h2') linePrefix('## ');
    else if (kind === 'h3') linePrefix('### ');
    else if (kind === 'link') wrap('[', '](https://)');
    else if (kind === 'list') linePrefix('- ');
    else if (kind === 'quote') linePrefix('> ');
  }

  // ===== 初始化 =====
  function init() {
    bindEvents();
    ensureSeed(); // ensureSeed 内部会触发 renderAll
    // 暴露调试接口
    window.BioQuestWiki = {
      getEntries: function () { return state.entries; },
      reload: function () { state.entries = loadEntries(); renderAll(); },
      resetSeed: function () {
        localStorage.removeItem(SEED_FLAG_KEY);
        localStorage.removeItem(STORAGE_KEY);
        ensureSeed();
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
