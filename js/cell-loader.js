/**
 * ============================================================
 * BioQuest — PRD §5-42：细胞分裂 Loading 动画
 * Canvas 实现有丝分裂周期动画，替代传统转圈加载
 * ============================================================
 */
(function () {
  'use strict';

  var _canvas = null;
  var _ctx = null;
  var _animId = null;
  var _startTime = 0;
  var _phaseDuration = 1200; // 每期毫秒

  function _createCanvas(container) {
    if (!container) return;
    _canvas = document.createElement('canvas');
    _canvas.width = 80;
    _canvas.height = 80;
    _canvas.style.cssText = 'display:block;margin:0 auto;';
    container.appendChild(_canvas);
    _ctx = _canvas.getContext('2d');
  }

  function _drawNucleus(cx, cy, radius, t) {
    // 细胞核（圆形）
    _ctx.beginPath();
    _ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    _ctx.fillStyle = 'rgba(90, 125, 92, 0.15)';
    _ctx.fill();
    _ctx.strokeStyle = 'rgba(90, 125, 92, 0.4)';
    _ctx.lineWidth = 1.5;
    _ctx.stroke();
  }

  function _drawChromosomes(cx, cy, radius, t, phase) {
    var progress = (t % _phaseDuration) / _phaseDuration;
    var count = 4;
    _ctx.strokeStyle = 'rgba(196, 149, 106, 0.8)';
    _ctx.lineWidth = 2.5;

    for (var i = 0; i < count; i++) {
      var angle = (i / count) * Math.PI * 2 + progress * Math.PI * 0.5;
      var r = radius * 0.6;

      if (phase === 'metaphase') {
        // 赤道板排列
        var x = cx - radius * 0.5 + (i / (count - 1)) * radius;
        var y = cy + Math.sin(i * 1.5 + t * 0.002) * 2;
        _ctx.beginPath();
        _ctx.arc(x, y, 3, 0, Math.PI * 2);
        _ctx.fillStyle = 'rgba(196, 149, 106, 0.9)';
        _ctx.fill();
        // 染色体臂
        _ctx.beginPath();
        _ctx.moveTo(x, y);
        _ctx.lineTo(x, y - 15);
        _ctx.stroke();
        _ctx.beginPath();
        _ctx.moveTo(x, y);
        _ctx.lineTo(x, y + 15);
        _ctx.stroke();
      } else if (phase === 'anaphase') {
        // 姐妹染色单体分离
        var separation = progress * radius * 0.8;
        var x1 = cx + Math.cos(angle) * separation;
        var y1 = cy + Math.sin(angle) * separation;
        var x2 = cx - Math.cos(angle) * separation;
        var y2 = cy - Math.sin(angle) * separation;
        _ctx.beginPath();
        _ctx.arc(x1, y1, 2.5, 0, Math.PI * 2);
        _ctx.fillStyle = 'rgba(196, 149, 106, 0.9)';
        _ctx.fill();
        _ctx.beginPath();
        _ctx.arc(x2, y2, 2.5, 0, Math.PI * 2);
        _ctx.fill();
      } else {
        // 间期/前期：散在核内
        var x = cx + Math.cos(angle + t * 0.001) * r;
        var y = cy + Math.sin(angle + t * 0.001) * r;
        _ctx.beginPath();
        _ctx.arc(x, y, 3, 0, Math.PI * 2);
        _ctx.fillStyle = 'rgba(196, 149, 106, 0.7)';
        _ctx.fill();
      }
    }
  }

  function _render(timestamp) {
    if (!_startTime) _startTime = timestamp;
    if (!_ctx) return;

    var elapsed = timestamp - _startTime;
    var w = _canvas.width;
    var h = _canvas.height;
    var cx = w / 2;
    var cy = h / 2;
    var radius = 20;

    _ctx.clearRect(0, 0, w, h);

    // 细胞膜（外圈）
    _ctx.beginPath();
    _ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2);
    _ctx.strokeStyle = 'rgba(90, 125, 92, 0.3)';
    _ctx.lineWidth = 2;
    _ctx.setLineDash([3, 3]);
    _ctx.stroke();
    _ctx.setLineDash([]);

    // 根据时间确定阶段
    var phaseIndex = Math.floor(elapsed / _phaseDuration) % 5;
    var phases = ['interphase', 'prophase', 'metaphase', 'anaphase', 'telophase'];
    var phase = phases[phaseIndex];

    _drawNucleus(cx, cy, radius, elapsed);
    _drawChromosomes(cx, cy, radius, elapsed, phase);

    // 阶段标签
    var labels = {
      interphase: '间期',
      prophase: '前期',
      metaphase: '中期',
      anaphase: '后期',
      telophase: '末期'
    };
    _ctx.fillStyle = 'rgba(90, 125, 92, 0.6)';
    _ctx.font = '10px sans-serif';
    _ctx.textAlign = 'center';
    _ctx.fillText(labels[phase] || '', cx, h - 6);

    _animId = requestAnimationFrame(_render);
  }

  function start(container) {
    stop();
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    if (!container) {
      container = document.getElementById('loading-container') ||
        document.querySelector('.loading-container') ||
        document.body;
    }
    _createCanvas(container);
    _startTime = 0;
    _animId = requestAnimationFrame(_render);
  }

  function stop() {
    if (_animId) {
      cancelAnimationFrame(_animId);
      _animId = null;
    }
  }

  // 暴露全局
  window.CellLoader = { start: start, stop: stop };

  // 自动检测 loading 容器
  if (document.readyState === 'complete') {
    var container = document.getElementById('loading-container') || document.querySelector('.loading-container');
    if (container) start(container);
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      var container = document.getElementById('loading-container') || document.querySelector('.loading-container');
      if (container) start(container);
    });
  }

  console.log('[BioQuest] 细胞分裂 Loading 动画已加载');
})();