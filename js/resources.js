// 学习资源模块
'use strict';

let allResources = [];
let addedTitles = new Set();
let dataLoaded = false;
let currentFilter = { category: '全部', tag: '全部', keyword: '' };
let activeResourceId = null;

// HTML 转义 — 统一使用 window.escapeHtml（Q-01，规范实现在 js/utils.js）
var escapeHtml = (typeof window !== 'undefined' && typeof window.escapeHtml === 'function')
  ? window.escapeHtml
  : function(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    };

const extraPool = [
  {"source":"Cell Press","title":"细胞代谢调控网络","link":"https://www.cell.com/cell/fulltext/S0092-8674(24)00123-4","excerpt":"代谢通路与信号通路的交叉调控机制研究。","tag":"综述","category":"细胞生物学"},
  {"source":"Nature Genetics","title":"全基因组关联研究进展","link":"https://www.nature.com/articles/s41588-024-01456-7","excerpt":"GWAS在复杂疾病研究中的应用与挑战。","tag":"论文","category":"遗传学"},
  {"source":"Science","title":"蛋白质折叠与错误折叠疾病","link":"https://www.science.org/doi/10.1126/science.abf2864","excerpt":"阿尔茨海默症、帕金森症相关蛋白研究。","tag":"研究","category":"分子生物学"},
  {"source":"Plant Cell","title":"植物免疫系统最新发现","link":"https://academic.oup.com/plcell/article/36/1/123/7692388","excerpt":"PTI与ETI免疫反应的协同机制。","tag":"综述","category":"植物学"},
  {"source":"eLife","title":"神经发育的可塑性研究","link":"https://elifesciences.org/articles/87654","excerpt":"神经回路形成与经验依赖的可塑性。","tag":"研究","category":"动物学"},
  {"source":"Bioinformatics","title":"单细胞RNA测序分析教程","link":"https://academic.oup.com/bioinformatics/article/40/1/btad765/7494719","excerpt":"scRNA-seq数据分析流程与可视化。","tag":"教程","category":"生物信息"},
  {"source":"Trends in Ecology","title":"气候变化对生态系统的影响","link":"https://www.cell.com/trends/ecology-evolution/fulltext/S0169-5347(24)00023-9","excerpt":"物种分布、迁徙模式变化研究。","tag":"综述","category":"生态学"},
  {"source":"Journal of Cell Biology","title":"细胞骨架动力学机制","link":"https://rupress.org/jcb/article/223/3/e202306047/227058","excerpt":"微管、微丝与中间丝的动态调控。","tag":"研究","category":"细胞生物学"},
  {"source":"Microbiome","title":"土壤微生物组研究","link":"https://microbiomejournal.biomedcentral.com/articles/10.1186/s40168-024-01892-3","excerpt":"根际微生物与植物互作机制。","tag":"研究","category":"微生物学"},
  {"source":"BioRxiv","title":"疫苗设计新策略","link":"https://www.biorxiv.org/content/10.1101/2024.01.15.576021v1","excerpt":"mRNA疫苗与载体疫苗最新进展。","tag":"综述","category":"分子生物学"},
  {"source":"Developmental Cell","title":"胚胎发育的基因调控","link":"https://www.cell.com/developmental-cell/fulltext/S1534-5807(24)00056-3","excerpt":"胚胎干细胞分化与器官形成机制。","tag":"研究","category":"细胞生物学"},
  {"source":"Molecular Biology","title":"RNA剪接调控机制","link":"https://link.springer.com/article/10.1007/s12039-024-02234-5","excerpt":"可变剪接在疾病中的作用。","tag":"综述","category":"分子生物学"},
  {"source":"Nature Methods","title":"基因组编辑新工具","link":"https://www.nature.com/articles/s41592-024-02234-5","excerpt":"CRISPR/Cas12、Cas13等新一代工具开发。","tag":"论文","category":"分子生物学"},
  {"source":"Science Translational Medicine","title":"精准医疗最新进展","link":"https://www.science.org/doi/10.1126/scitranslmed.adf3456","excerpt":"个性化药物与诊断技术开发。","tag":"研究","category":"医学"},
  {"source":"Cell Metabolism","title":"能量代谢与癌症","link":"https://www.cell.com/cell-metabolism/fulltext/S1550-4131(24)00078-2","excerpt":"Warburg效应与肿瘤代谢重编程。","tag":"综述","category":"细胞生物学"},
  {"source":"Plant Physiology","title":"光合作用效率提升策略","link":"https://academic.oup.com/plphys/article/198/4/1789/7664897","excerpt":"通过基因工程改造提高光合效率。","tag":"研究","category":"植物学"},
  {"source":"Neuron","title":"突触传递的分子机制","link":"https://www.cell.com/neuron/fulltext/S0896-6273(24)00045-1","excerpt":"神经递质释放与受体调控。","tag":"研究","category":"动物学"},
  {"source":"Nature Chemical Biology","title":"药物发现新技术","link":"https://www.nature.com/articles/s41589-024-01567-8","excerpt":"AI辅助的虚拟筛选与化合物设计。","tag":"综述","category":"医学"},
  {"source":"Journal of Virology","title":"病毒进化与宿主互作","link":"https://journals.asm.org/doi/10.1128/jvi.00023-24","excerpt":"病毒变异、传播和致病性研究。","tag":"论文","category":"微生物学"},
  {"source":"Genome Research","title":"表观遗传组学分析","link":"https://genome.cshlp.org/content/34/1/123.short","excerpt":"ChIP-seq、ATAC-seq等技术应用。","tag":"教程","category":"生物信息"}
];

async function loadResourcesData() {
  // 直接从本地 JSON 加载（添加缓存破坏参数）
  try {
    var cacheBust = '_t=' + Date.now();
    var res = await fetch('data/resources.json?' + cacheBust);
    if (res.ok) {
      var data = await res.json();
      if (data.资源库 && data.资源库.length > 0) {
        allResources = data.资源库;
        allResources.forEach(r => addedTitles.add(r.title));
        dataLoaded = true;
        applyFilter();
        return;
      }
    }
  } catch (e) {
    console.error('加载资源数据失败', e);
  }
  // 如果 JSON 加载失败，使用 extraPool 作为备用
  if (!dataLoaded && extraPool.length > 0) {
    allResources = extraPool.map(function(r, i) {
      return Object.assign({}, r, { id: i + 1 });
    });
    allResources.forEach(r => addedTitles.add(r.title));
    dataLoaded = true;
    applyFilter();
  }
}

function getCategories() {
  const cats = new Set(['全部']);
  allResources.forEach(r => { if (r.category) cats.add(r.category); });
  return Array.from(cats);
}

function getTags() {
  const tags = new Set(['全部']);
  allResources.forEach(r => { if (r.tag) tags.add(r.tag); });
  return Array.from(tags);
}

function applyFilter() {
  let filtered = allResources.filter(r => {
    const matchCat = currentFilter.category === '全部' || r.category === currentFilter.category;
    const matchTag = currentFilter.tag === '全部' || r.tag === currentFilter.tag;
    const matchKw = !currentFilter.keyword || 
      r.title.toLowerCase().includes(currentFilter.keyword) ||
      r.excerpt.toLowerCase().includes(currentFilter.keyword) ||
      r.source.toLowerCase().includes(currentFilter.keyword);
    return matchCat && matchTag && matchKw;
  });
  renderResources(filtered);
}

function renderResources(list = allResources) {
  const grid = document.getElementById('resourcesGrid');
  if (!grid) return;
  
  if (list.length === 0) {
    grid.innerHTML = '<div class="quiz-empty" style="grid-column: 1/-1;"><p>没有找到匹配的资源</p></div>';
    return;
  }

  grid.innerHTML = list.map((r, i) => {
    var hasLink = r.link && r.link !== '#' && !r.link.startsWith('javascript');
    var sourceUrl = hasLink ? escapeHtml(r.link) : '';
    return `
    <div class="resource-item" data-idx="${i}" onclick="openResourceDetail(${i})">
      <div class="resource-source">${escapeHtml(r.source)}</div>
      <div class="resource-title">${escapeHtml(r.title)}</div>
      <div class="resource-excerpt">${escapeHtml(r.excerpt)}</div>
      <div class="resource-meta">
        <span class="resource-tag">${escapeHtml(r.tag)}</span>
        ${r.category ? `<span class="resource-tag" style="background:rgba(232,168,48,0.1);color:#e8a830;">${escapeHtml(r.category)}</span>` : ''}
        ${r.isNew ? '<span class="resource-new">NEW</span>' : ''}
      </div>
      <span class="resource-link-icon">↗</span>
    </div>
  `}).join('');

  document.getElementById('resultCount').textContent = list.length;
}

function fetchNewResources() {
  if (!dataLoaded) return;

  const btn = document.getElementById('crawlBtn');
  const status = document.getElementById('crawlStatus');
  if (!btn || !status) return;

  btn.classList.add('loading');
  status.classList.remove('show', 'success');

  setTimeout(() => {
    const available = extraPool.filter(r => !addedTitles.has(r.title));
    
    if (available.length === 0) {
      btn.classList.remove('loading');
      status.textContent = '资源池已空，所有可用资源已加载';
      status.classList.add('show', 'success');
      return;
    }

    const count = Math.min(3, available.length);
    const selected = available.slice(0, count);
    
    selected.forEach(r => {
      const newResource = { ...r, id: Date.now() + Math.random(), isNew: true };
      allResources.unshift(newResource);
      addedTitles.add(r.title);
    });

    applyFilter();
    initFilters(); // 重新生成筛选标签，因为分类可能增加
    btn.classList.remove('loading');
    status.textContent = `新增 ${count} 条资源，当前共 ${allResources.length} 条`;
    status.classList.add('show', 'success');
  }, 1200);
}

function initFilters() {
  const catContainer = document.getElementById('categoryFilters');
  const tagContainer = document.getElementById('tagFilters');
  if (!catContainer || !tagContainer) return;

  catContainer.innerHTML = getCategories().map(c => 
    `<button class="filter-chip ${c === '全部' ? 'active' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`
  ).join('');

  tagContainer.innerHTML = getTags().map(t => 
    `<button class="filter-chip ${t === '全部' ? 'active' : ''}" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`
  ).join('');

  catContainer.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      catContainer.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter.category = btn.dataset.cat;
      applyFilter();
    });
  });

  tagContainer.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      tagContainer.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter.tag = btn.dataset.tag;
      applyFilter();
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadResourcesData();
  initFilters();

  const searchInput = document.getElementById('resourceSearch');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      currentFilter.keyword = e.target.value.trim().toLowerCase();
      applyFilter();
    });
  }

  const crawlBtn = document.getElementById('crawlBtn');
  if (crawlBtn) {
    crawlBtn.addEventListener('click', fetchNewResources);
  }
});

// 点击卡片展开详情
function openResourceDetail(idx) {
  var r = allResources[idx];
  if (!r) return;
  
  // 关闭已打开的详情
  closeResourceDetail();
  
  activeResourceId = 'res-detail-' + idx;
  
  var grid = document.getElementById('resourcesGrid');
  var card = grid.querySelector('[data-idx="' + idx + '"]');
  if (!card) return;
  
  var hasLink = r.link && r.link !== '#' && !r.link.startsWith('javascript');
  var detailHTML = '<div class="resource-detail-panel" id="' + activeResourceId + '">' +
    '<button class="resource-detail-close" onclick="event.stopPropagation();closeResourceDetail();">&times;</button>' +
    '<div class="resource-detail-header">' +
      '<span class="resource-detail-source">' + escapeHtml(r.source) + '</span>' +
      '<h3 class="resource-detail-title">' + escapeHtml(r.title) + '</h3>' +
    '</div>' +
    '<div class="resource-detail-body">' +
      '<p class="resource-detail-excerpt">' + escapeHtml(r.excerpt) + '</p>' +
      '<p class="resource-detail-desc">资源来自 ' + escapeHtml(r.source) + '，点击下方按钮访问原始资源。</p>' +
    '</div>' +
    '<div class="resource-detail-footer">' +
      '<span class="resource-tag">' + escapeHtml(r.tag) + '</span>' +
      (r.category ? '<span class="resource-tag" style="background:rgba(232,168,48,0.1);color:#e8a830;">' + escapeHtml(r.category) + '</span>' : '') +
      (hasLink ? '<a href="' + escapeHtml(r.link) + '" target="_blank" rel="noopener noreferrer" class="resource-detail-link" onclick="event.stopPropagation();">访问源站 ↗</a>' : '') +
    '</div>' +
  '</div>';
  
  card.insertAdjacentHTML('afterend', detailHTML);
  card.classList.add('resource-item--active');
  
  // Scroll to detail
  var panel = document.getElementById(activeResourceId);
  if (panel) {
    setTimeout(function() {
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }
}

function closeResourceDetail() {
  if (activeResourceId) {
    var panel = document.getElementById(activeResourceId);
    if (panel) panel.remove();
    var activeCard = document.querySelector('.resource-item--active');
    if (activeCard) activeCard.classList.remove('resource-item--active');
    activeResourceId = null;
  }
}
