/**
 * BioQuest — RDKit 2D 分子结构查看器集成模块
 * 基于 @rdkit/rdkit (BSD-3-Clause) 渲染 SMILES → 2D 分子结构图
 * 懒加载策略：RDKit_minimal.wasm 体积 6.7MB，首次调用 render() 才加载
 */
(function () {
  'use strict';

  var _rdkit = null;
  var _loadingPromise = null;
  var _scriptInjected = false;

  var SMILES_PRESETS = {
    'glucose':      { smiles: 'OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O', name: '葡萄糖' },
    'ethanol':      { smiles: 'CCO', name: '乙醇' },
    'water':        { smiles: 'O', name: '水' },
    'caffeine':     { smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C', name: '咖啡因' },
    'acetic-acid':  { smiles: 'CC(=O)O', name: '醋酸' },
    'alanine':      { smiles: 'CC(N)C(=O)O', name: '丙氨酸（氨基酸）' },
    'benzene':      { smiles: 'c1ccccc1', name: '苯环' },
    'aspirin':      { smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O', name: '阿司匹林' },
    'dopamine':     { smiles: 'NCCc1ccc(O)c(O)c1', name: '多巴胺' }
  };

  function injectScript() {
    if (_scriptInjected) return Promise.resolve();
    if (typeof window.initRDKitModule === 'function') return Promise.resolve();
    return window.loadScriptOnce('js/vendor/RDKit_minimal.js?v=20260723d', {
      verify: function () { return typeof window.initRDKitModule === 'function'; }
    }).then(function () {
      _scriptInjected = true;
    });
  }

  function ensureReady() {
    if (_rdkit) return Promise.resolve(_rdkit);
    if (_loadingPromise) return _loadingPromise;
    _loadingPromise = injectScript().then(function () {
      return window.initRDKitModule({
        locateFile: function (path) {
          if (path.indexOf('.wasm') !== -1) {
            return 'js/vendor/RDKit_minimal.wasm?v=20260723d';
          }
          return path;
        }
      });
    }).then(function (rdkit) {
      _rdkit = rdkit;
      console.info('[RDKitViewer] WASM 初始化完成');
      return rdkit;
    }).catch(function (err) {
      _loadingPromise = null;
      throw err;
    });
    return _loadingPromise;
  }

  function render(containerId, smiles, opts) {
    var container = document.getElementById(containerId);
    if (!container) return Promise.reject(new Error('容器不存在: ' + containerId));
    if (!smiles) return Promise.reject(new Error('SMILES 为空'));

    opts = opts || {};
    var width = opts.width || 400;
    var height = opts.height || 300;

    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">' +
      '<div>🔬 正在加载分子引擎（首次约 6.7MB）...</div></div>';

    return ensureReady().then(function (rdkit) {
      var mol = null;
      try {
        mol = rdkit.get_mol(smiles);
        if (!mol || !mol.is_valid()) {
          container.innerHTML = '<p style="color:var(--color-error);text-align:center;padding:40px;">无效的 SMILES</p>';
          if (mol) mol.delete();
          return false;
        }

        var svg = mol.get_svg(width, height);
        if (!svg) {
          if (!mol.generate_aligned_coords(1)) {
            container.innerHTML = '<p style="color:var(--color-error);padding:40px;">无法生成 2D 坐标</p>';
            mol.delete();
            return false;
          }
          svg = mol.get_svg(width, height);
        }

        if (!svg) {
          container.innerHTML = '<p style="color:var(--color-error);padding:40px;">SVG 生成失败</p>';
          mol.delete();
          return false;
        }

        container.innerHTML = '<div style="text-align:center;">' + svg + '</div>';
        var svgEl = container.querySelector('svg');
        if (svgEl) {
          svgEl.style.maxWidth = '100%';
          svgEl.style.height = 'auto';
        }
        mol.delete();
        return true;
      } catch (e) {
        console.error('[RDKitViewer] 渲染失败:', e);
        container.innerHTML = '<p style="color:var(--color-error);padding:40px;">分子渲染失败</p>';
        if (mol) { try { mol.delete(); } catch (x) {} }
        return false;
      }
    }).catch(function (err) {
      console.error('[RDKitViewer] 引擎加载失败:', err);
      container.innerHTML = '<p style="color:var(--color-error);text-align:center;padding:40px;">分子引擎加载失败</p>';
      return false;
    });
  }

  function getPresets() {
    return Object.keys(SMILES_PRESETS).map(function (key) {
      return Object.assign({ key: key }, SMILES_PRESETS[key]);
    });
  }

  var _escapeHtml = window.escapeHtml;

  function renderMoleculesPage(target) {
    if (!target) return;
    var presets = getPresets();
    var cardsHtml = presets.map(function (p) {
      return '<div class="smiles-card" data-smiles="' + _escapeHtml(p.smiles) + '" data-name="' + _escapeHtml(p.name) + '" style="background:var(--surface-primary,#fff);border:1px solid var(--border-light,#ece8e1);border-radius:var(--radius-lg,20px);padding:20px;cursor:pointer;">' +
        '<div style="font-family:var(--font-mono,monospace);font-size:0.78rem;color:var(--color-amber,#c4956a);font-weight:700;word-break:break-all;">' + _escapeHtml(p.smiles) + '</div>' +
        '<div style="font-family:var(--font-serif,serif);font-size:1rem;font-weight:600;color:var(--color-deep,#1a3a2a);margin:6px 0;">' + _escapeHtml(p.name) + '</div>' +
        '<div style="font-size:0.78rem;color:var(--text-muted,#8a8a8a);">点击查看 2D 结构</div>' +
        '</div>';
    }).join('');

    target.innerHTML =
      '<div style="max-width:900px;margin:0 auto;padding:24px 20px 80px;">' +
      '<h1 style="font-family:var(--font-serif,serif);font-size:1.8rem;color:var(--color-deep,#1a3a2a);margin-bottom:8px;">🧪 SMILES 2D 分子查看器</h1>' +
      '<p style="color:var(--text-muted,#8a8a8a);font-size:0.9rem;margin-bottom:24px;">基于 RDKit-JS（BSD-3）渲染 SMILES 字符串为 2D 分子结构图</p>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-bottom:32px;">' + cardsHtml + '</div>' +
      '<div style="background:var(--surface-primary,#fff);border:1px solid var(--border-light,#ece8e1);border-radius:var(--radius-lg,20px);padding:20px;">' +
        '<h3 style="font-family:var(--font-serif,serif);font-size:1.1rem;color:var(--color-deep,#1a3a2a);margin-bottom:12px;">自定义 SMILES</h3>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '<input id="smiles-input" type="text" placeholder="例如：CCO（乙醇）" style="flex:1;min-width:200px;padding:8px 12px;border:1px solid var(--border-default,#e0dcd5);border-radius:8px;font-family:var(--font-mono,monospace);font-size:0.9rem;">' +
          '<button id="smiles-render-btn" style="padding:8px 18px;background:var(--color-sage,#5a7d5c);color:#fff;border:none;border-radius:8px;cursor:pointer;">渲染</button>' +
        '</div>' +
        '<div id="smiles-custom-container" style="margin-top:16px;min-height:200px;background:#faf7f2;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--text-muted,#8a8a8a);">输入 SMILES 后点击渲染</div>' +
      '</div>' +
      '<div id="smiles-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;align-items:center;justify-content:center;">' +
        '<div style="background:#fff;border-radius:16px;padding:16px;width:90%;max-width:600px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
            '<h3 id="smiles-modal-title" style="font-family:var(--font-serif,serif);font-size:1.2rem;color:var(--color-deep,#1a3a2a);"></h3>' +
            '<button id="smiles-close-btn" style="background:none;border:none;font-size:1.5rem;cursor:pointer;">×</button>' +
          '</div>' +
          '<div id="smiles-modal-container" style="width:100%;min-height:300px;background:#faf7f2;border-radius:8px;"></div>' +
        '</div>' +
      '</div>' +
      '</div>';

    var cards = document.querySelectorAll('.smiles-card');
    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        var smiles = card.getAttribute('data-smiles');
        var name = card.getAttribute('data-name') || smiles;
        var modal = document.getElementById('smiles-modal');
        var title = document.getElementById('smiles-modal-title');
        if (modal) modal.style.display = 'flex';
        if (title) title.textContent = name;
        render('smiles-modal-container', smiles, { width: 500, height: 350 });
      });
    });

    var renderBtn = document.getElementById('smiles-render-btn');
    var input = document.getElementById('smiles-input');
    if (renderBtn && input) {
      renderBtn.addEventListener('click', function () {
        var s = input.value.trim();
        if (s) render('smiles-custom-container', s, { width: 500, height: 300 });
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') renderBtn.click();
      });
    }

    var closeBtn = document.getElementById('smiles-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', function () {
      var modal = document.getElementById('smiles-modal');
      if (modal) modal.style.display = 'none';
    });
  }

  /**
   * RDKit 2D 分子结构查看器模块对外接口，将 SMILES 字符串渲染为 2D 分子结构图，并提供预设、懒加载与就绪状态查询。
   * @type {Object}
   */
  window.RDKitViewer = {
    render: render,
    ensureReady: ensureReady,
    isReady: function () { return !!_rdkit; },
    getPresets: getPresets,
    PRESETS: SMILES_PRESETS
  };

  /**
   * 渲染 SMILES 分子结构查看器页面入口，构建预设分子卡片列表与渲染容器。
   * @function
   * @param {HTMLElement} target - 挂载容器
   * @returns {void}
   */
  window.renderSmilesPage = renderMoleculesPage;
  /**
   * 哈希路由入口：根据路由与容器初始化 SMILES 分子结构查看器页面。
   * @function
   * @param {string} route - 哈希路由
   * @param {HTMLElement} target - 挂载容器
   * @returns {void}
   */
  window.initSmiles = function (route, target) {
    renderMoleculesPage(target);
  };
})();
