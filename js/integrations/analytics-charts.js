/**
 * BioQuest — 学习分析图表集成模块（Chart.js）
 * 提供折线、雷达、柱状、环形等图表的统一封装
 * 依赖：js/vendor/chart.umd.min.js -> window.Chart
 */
(function () {
  'use strict';

  var _instances = {};  // id -> Chart 实例

  function ensureChart() {
    if (typeof window.Chart === 'undefined') {
      console.warn('[AnalyticsCharts] Chart.js 未加载');
      return false;
    }
    return true;
  }

  // 主题色板（生物主题）
  var BIO_COLORS = {
    green: '#4a7c59',
    amber: '#e8a830',
    sage: '#6b9b6e',
    brown: '#c4956a',
    leaf: '#a8c8a0',
    rose: '#c0595e',
    sky: '#5a8fa8'
  };
  var COLOR_SEQ = [BIO_COLORS.green, BIO_COLORS.amber, BIO_COLORS.sage, BIO_COLORS.brown, BIO_COLORS.rose, BIO_COLORS.sky, BIO_COLORS.leaf];

  function getCtx(containerId) {
    var el = document.getElementById(containerId);
    if (!el) {
      console.warn('[AnalyticsCharts] 容器不存在:', containerId);
      return null;
    }
    // 容器是 canvas 直接用，否则插入 canvas
    var canvas = el.tagName === 'CANVAS' ? el : el.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      el.appendChild(canvas);
    }
    return canvas.getContext('2d');
  }

  function destroy(containerId) {
    var inst = _instances[containerId];
    if (inst) {
      try { inst.destroy(); } catch (e) {}
      delete _instances[containerId];
    }
  }

  function destroyAll() {
    Object.keys(_instances).forEach(destroy);
  }

  function applyDefaults(opts, type) {
    opts = opts || {};
    var common = {
      responsive: opts.responsive != null ? opts.responsive : true,
      maintainAspectRatio: opts.maintainAspectRatio != null ? opts.maintainAspectRatio : false,
      plugins: Object.assign({
        legend: { display: true, position: 'bottom', labels: { font: { size: 12 } } },
        tooltip: { enabled: true }
      }, opts.plugins || {}),
      animation: opts.animation != null ? opts.animation : { duration: 400 }
    };
    return Object.assign({}, opts, common);
  }

  function applyColorPalette(datasets) {
    if (!Array.isArray(datasets)) return datasets;
    return datasets.map(function (ds, idx) {
      var color = ds.borderColor || ds.backgroundColor || COLOR_SEQ[idx % COLOR_SEQ.length];
      var out = Object.assign({}, ds);
      if (!out.borderColor) out.borderColor = color;
      if (!out.backgroundColor) {
        out.backgroundColor = typeAlpha(color, 0.2);
      }
      return out;
    });
  }

  // 颜色透明度
  function typeAlpha(hex, alpha) {
    if (!hex || hex[0] !== '#' || hex.length !== 7) return hex;
    var num = parseInt(hex.slice(1), 16);
    var r = (num >> 16) & 0xff;
    var g = (num >> 8) & 0xff;
    var b = num & 0xff;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  /**
   * 渲染折线图
   * @param {string} containerId
   * @param {Array<string>} labels X 轴标签
   * @param {Array<object>} datasets [{ label, data, borderColor?, ... }]
   * @param {object} opts
   */
  function renderLine(containerId, labels, datasets, opts) {
    if (!ensureChart()) return null;
    var ctx = getCtx(containerId);
    if (!ctx) return null;
    destroy(containerId);
    var chartOpts = applyDefaults(opts || {}, 'line');
    chartOpts.scales = Object.assign({
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }
    }, chartOpts.scales || {});
    try {
      var c = new window.Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: applyColorPalette(datasets) },
        options: chartOpts
      });
      _instances[containerId] = c;
      return c;
    } catch (e) {
      console.error('[AnalyticsCharts] line 渲染失败:', e);
      return null;
    }
  }

  /**
   * 渲染雷达图（能力诊断）
   */
  function renderRadar(containerId, labels, data, opts) {
    if (!ensureChart()) return null;
    var ctx = getCtx(containerId);
    if (!ctx) return null;
    destroy(containerId);
    var chartOpts = applyDefaults(opts || {}, 'radar');
    chartOpts.scales = Object.assign({
      r: {
        beginAtZero: true,
        suggestedMax: 100,
        grid: { color: 'rgba(0,0,0,0.08)' },
        pointLabels: { font: { size: 12 } }
      }
    }, chartOpts.scales || {});
    try {
      var c = new window.Chart(ctx, {
        type: 'radar',
        data: {
          labels: labels,
          datasets: Array.isArray(data) && data.length && typeof data[0] === 'object'
            ? applyColorPalette(data)
            : [{ label: (opts && opts.label) || '能力', data: data, borderColor: BIO_COLORS.green, backgroundColor: typeAlpha(BIO_COLORS.green, 0.2) }]
        },
        options: chartOpts
      });
      _instances[containerId] = c;
      return c;
    } catch (e) {
      console.error('[AnalyticsCharts] radar 渲染失败:', e);
      return null;
    }
  }

  /**
   * 渲染柱状图
   */
  function renderBar(containerId, labels, datasets, opts) {
    if (!ensureChart()) return null;
    var ctx = getCtx(containerId);
    if (!ctx) return null;
    destroy(containerId);
    var chartOpts = applyDefaults(opts || {}, 'bar');
    chartOpts.scales = Object.assign({
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }
    }, chartOpts.scales || {});
    try {
      var c = new window.Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: applyColorPalette(datasets) },
        options: chartOpts
      });
      _instances[containerId] = c;
      return c;
    } catch (e) {
      console.error('[AnalyticsCharts] bar 渲染失败:', e);
      return null;
    }
  }

  /**
   * 渲染环形图
   */
  function renderDoughnut(containerId, labels, data, opts) {
    if (!ensureChart()) return null;
    var ctx = getCtx(containerId);
    if (!ctx) return null;
    destroy(containerId);
    var chartOpts = applyDefaults(opts || {}, 'doughnut');
    chartOpts.cutout = opts && opts.cutout != null ? opts.cutout : '60%';
    try {
      var c = new window.Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: (opts && opts.colors) || COLOR_SEQ,
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: chartOpts
      });
      _instances[containerId] = c;
      return c;
    } catch (e) {
      console.error('[AnalyticsCharts] doughnut 渲染失败:', e);
      return null;
    }
  }

  /**
   * 更新已有图表数据
   */
  function update(containerId, labels, datasets) {
    var c = _instances[containerId];
    if (!c) return null;
    if (labels) c.data.labels = labels;
    if (datasets) c.data.datasets = applyColorPalette(datasets);
    try { c.update(); } catch (e) {}
    return c;
  }

  /**
   * 设置全局默认值（Chart 字体、颜色）
   */
  function setGlobalDefaults() {
    if (!ensureChart()) return;
    try {
      window.Chart.defaults.font.family = '"LXGW WenKai", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      window.Chart.defaults.color = '#4b5563';
      window.Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(26,47,29,0.92)';
      window.Chart.defaults.plugins.tooltip.padding = 10;
    } catch (e) {}
  }

  // 启动时设置默认
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setGlobalDefaults);
  } else {
    setGlobalDefaults();
  }

  /**
   * 学习分析图表模块对外接口，基于 Chart.js 提供折线/雷达/柱状/环形等图表的渲染、更新与销毁能力。
   * @type {Object}
   */
  window.AnalyticsCharts = {
    renderLine: renderLine,
    renderRadar: renderRadar,
    renderBar: renderBar,
    renderDoughnut: renderDoughnut,
    update: update,
    destroy: destroy,
    destroyAll: destroyAll,
    COLORS: BIO_COLORS,
    isAvailable: ensureChart
  };
})();
