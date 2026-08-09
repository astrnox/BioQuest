/**
 * ============================================================
 * OpenMAIC Renderer — Pure JS/Canvas/DOM Port（零依赖）
 * ------------------------------------------------------------
 * 移植自 https://github.com/THU-MAIC/OpenMAIC
 *   packages/@openmaic/renderer/src/elements/*
 * 原项目为 React 组件，本文件把 11 种元素渲染器重写为纯 Canvas/DOM
 * 适配 BioQuest 纯前端架构
 * ------------------------------------------------------------
 * 使用：
 *   Renderer.renderSlide(canvas, slide);  // 渲染整个 Slide 到 canvas
 *   Renderer.renderText(ctx, el, x, y, scale);  // 单元素渲染
 *   Renderer.htmlSlide(slide, container);  // 渲染为 HTML 节点（富文本/代码块用 DOM）
 * ============================================================
 */
(function (global) {
  'use strict';

  var DSL = global.OpenMAICDSL;
  if (!DSL) {
    console.warn('[OpenMAICRenderer] DSL 未加载，渲染器可能无法工作');
  }

  // ============== 工具函数 ==============

  function _escape(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function _rRect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  // 标准化元素坐标：DSL 用 left/top/width/height，Canvas 用 x/y/w/h
  function _pos(el) {
    return { x: el.left || el.x || 0, y: el.top || el.y || 0, w: el.width || el.w || 100, h: el.height || el.h || 50 };
  }

  // 坐标系缩放（DSL 默认 1000×562，Canvas 实际尺寸可能不同）
  function _scale(viewportW, viewportH, actualW, actualH) {
    return { sx: actualW / viewportW, sy: actualH / viewportH };
  }

  // ============== 元素渲染器 ==============

  var elementRenderers = {

    // ---- 文本 ----
    text: function (ctx, el, scale) {
      var p = _pos(el);
      var x = p.x * scale.sx, y = p.y * scale.sy;
      var w = p.w * scale.sx, h = p.h * scale.sy;
      var fontSize = (el.fontSize || 18) * Math.min(scale.sx, scale.sy);
      var lineHeight = el.lineHeight || 1.5;
      var color = el.defaultColor || el.color || '#1a3a2a';
      var fontName = el.defaultFontName || '"LXGW WenKai", sans-serif';
      var vAlign = el.vAlign || el.verticalAlign || 'top';

      // 填充
      if (el.fill) {
        ctx.fillStyle = el.fill;
        ctx.fillRect(x, y, w, h);
      }
      // 描边
      if (el.outline) {
        ctx.strokeStyle = el.outline.color || '#1a3a2a';
        ctx.lineWidth = el.outline.width || 1;
        ctx.strokeRect(x, y, w, h);
      }
      // 文字
      ctx.fillStyle = color;
      ctx.font = fontSize + 'px ' + fontName;
      ctx.textBaseline = 'top';
      var text = el.content || '';
      // 简易 HTML 剥离（保留 \n 换行）
      var plain = text.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
      var lines = plain.split('\n');
      var lh = fontSize * lineHeight;
      var yStart = y;
      if (vAlign === 'middle') yStart = y + (h - lines.length * lh) / 2;
      else if (vAlign === 'bottom') yStart = y + h - lines.length * lh;

      for (var i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], x, yStart + i * lh);
      }
    },

    // ---- 图片 ----
    image: function (ctx, el, scale, onLoad) {
      var p = _pos(el);
      var x = p.x * scale.sx, y = p.y * scale.sy;
      var w = p.w * scale.sx, h = p.h * scale.sy;
      if (!el.src) {
        // 占位
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#999';
        ctx.font = (14 * Math.min(scale.sx, scale.sy)) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('[图片]', x + w / 2, y + h / 2);
        ctx.textAlign = 'left';
        return;
      }
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        if (el.flipH || el.flipV) {
          ctx.save();
          ctx.translate(el.flipH ? x + w : x, el.flipV ? y + h : y);
          ctx.scale(el.flipH ? -1 : 1, el.flipV ? -1 : 1);
          ctx.drawImage(img, 0, 0, w, h);
          ctx.restore();
        } else {
          ctx.drawImage(img, x, y, w, h);
        }
        if (onLoad) onLoad();
      };
      img.onerror = function () {
        ctx.fillStyle = '#fdd';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#c33';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('图片加载失败', x + w / 2, y + h / 2);
        ctx.textAlign = 'left';
      };
      img.src = el.src;
    },

    // ---- 形状 ----
    shape: function (ctx, el, scale) {
      var p = _pos(el);
      var x = p.x * scale.sx, y = p.y * scale.sy;
      var w = p.w * scale.sx, h = p.h * scale.sy;
      var fill = el.fill || '#4a7c59';
      var path = el.path || 'roundRect';
      var r = Math.min(w, h) * 0.15;

      ctx.fillStyle = fill;
      ctx.beginPath();
      switch (path) {
        case 'rect':
        case 'roundRect':
          _rRect(ctx, x, y, w, h, r);
          break;
        case 'circle':
          ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
          break;
        case 'triangle':
          ctx.moveTo(x + w / 2, y);
          ctx.lineTo(x, y + h);
          ctx.lineTo(x + w, y + h);
          ctx.closePath();
          break;
        case 'diamond':
          ctx.moveTo(x + w / 2, y);
          ctx.lineTo(x + w, y + h / 2);
          ctx.lineTo(x + w / 2, y + h);
          ctx.lineTo(x, y + h / 2);
          ctx.closePath();
          break;
        case 'parallelogramLeft':
          ctx.moveTo(x + w * 0.2, y);
          ctx.lineTo(x + w, y);
          ctx.lineTo(x + w * 0.8, y + h);
          ctx.lineTo(x, y + h);
          ctx.closePath();
          break;
        case 'parallelogramRight':
          ctx.moveTo(x, y);
          ctx.lineTo(x + w * 0.8, y);
          ctx.lineTo(x + w, y + h);
          ctx.lineTo(x + w * 0.2, y + h);
          ctx.closePath();
          break;
        case 'trapezoid':
          ctx.moveTo(x + w * 0.1, y);
          ctx.lineTo(x + w * 0.9, y);
          ctx.lineTo(x + w, y + h);
          ctx.lineTo(x, y + h);
          ctx.closePath();
          break;
        default:
          _rRect(ctx, x, y, w, h, r);
      }
      ctx.fill();

      // 描边
      if (el.outline && el.outline.width) {
        ctx.strokeStyle = el.outline.color || '#1a3a2a';
        ctx.lineWidth = (el.outline.width || 1) * Math.min(scale.sx, scale.sy);
        ctx.stroke();
      }

      // 形状内文字
      if (el.text && el.text.content) {
        var fontSize = (el.text.fontSize || 14) * Math.min(scale.sx, scale.sy);
        ctx.fillStyle = el.text.defaultColor || '#fff';
        ctx.font = fontSize + 'px ' + (el.text.defaultFontName || 'sans-serif');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(el.text.content, x + w / 2, y + h / 2);
        ctx.textAlign = 'left';
      }
    },

    // ---- 直线 / 箭头 ----
    line: function (ctx, el, scale) {
      var s = el.start || [0, 0], e = el.end || [100, 0];
      var x1 = s[0] * scale.sx, y1 = s[1] * scale.sy;
      var x2 = e[0] * scale.sx, y2 = e[1] * scale.sy;
      var lw = (el.width || 2) * Math.min(scale.sx, scale.sy);
      ctx.strokeStyle = el.color || '#1a3a2a';
      ctx.lineWidth = lw;
      if (el.style === 'dashed') ctx.setLineDash([lw * 4, lw * 3]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 端点标记
      var points = el.points || ['', ''];
      var arrowSize = lw * 4;
      if (points[0] === 'arrow') _drawArrow(ctx, x2, y2, x1, y1, arrowSize, el.color);
      if (points[1] === 'arrow') _drawArrow(ctx, x1, y1, x2, y2, arrowSize, el.color);
    },

    // ---- 图表（bar/line/pie/ring）----
    chart: function (ctx, el, scale) {
      var p = _pos(el);
      var x = p.x * scale.sx, y = p.y * scale.sy;
      var w = p.w * scale.sx, h = p.h * scale.sy;
      var type = el.chartType || 'bar';
      var data = el.data || { labels: [], legends: [], series: [] };
      var colors = el.themeColors || ['#4a7c59', '#c4956a', '#5a7bc4', '#c47a4a'];

      var chart = { x: x, y: y, w: w, h: h, padding: 30 * Math.min(scale.sx, scale.sy) };
      chart.plotX = chart.x + chart.padding;
      chart.plotY = chart.y + chart.padding;
      chart.plotW = chart.w - chart.padding * 2;
      chart.plotH = chart.h - chart.padding * 2;

      // 坐标轴
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(chart.plotX, chart.plotY);
      ctx.lineTo(chart.plotX, chart.plotY + chart.plotH);
      ctx.lineTo(chart.plotX + chart.plotW, chart.plotY + chart.plotH);
      ctx.stroke();

      var labels = data.labels || [];
      var series = data.series || [];
      var max = 1;
      series.forEach(function (s) { s.forEach(function (v) { if (v > max) max = v; }); });

      if (type === 'bar' || type === 'column') {
        // 分组柱状图
        var groupW = chart.plotW / Math.max(labels.length, 1);
        var barW = groupW * 0.7 / Math.max(series.length, 1);
        for (var g = 0; g < labels.length; g++) {
          for (var s2 = 0; s2 < series.length; s2++) {
            var v = series[s2][g] || 0;
            var barH = (v / max) * chart.plotH;
            var bx = chart.plotX + g * groupW + s2 * barW + (groupW - barW * series.length) / 2;
            var by = chart.plotY + chart.plotH - barH;
            ctx.fillStyle = colors[s2 % colors.length];
            ctx.fillRect(bx, by, barW, barH);
          }
          // x 轴标签
          ctx.fillStyle = '#666';
          ctx.font = (10 * Math.min(scale.sx, scale.sy)) + 'px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(labels[g], chart.plotX + g * groupW + groupW / 2, chart.plotY + chart.plotH + 15);
          ctx.textAlign = 'left';
        }
      } else if (type === 'line') {
        for (var s3 = 0; s3 < series.length; s3++) {
          ctx.strokeStyle = colors[s3 % colors.length];
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (var i2 = 0; i2 < series[s3].length; i2++) {
            var px2 = chart.plotX + (i2 / Math.max(labels.length - 1, 1)) * chart.plotW;
            var py2 = chart.plotY + chart.plotH - (series[s3][i2] / max) * chart.plotH;
            if (i2 === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
          }
          ctx.stroke();
        }
      } else if (type === 'pie' || type === 'ring') {
        // 饼图（取第一个 series）
        var data2 = series[0] || [];
        var total = data2.reduce(function (a, b) { return a + b; }, 0) || 1;
        var cx2 = chart.x + chart.w / 2, cy2 = chart.y + chart.h / 2;
        var r2 = Math.min(chart.plotW, chart.plotH) / 2 * 0.8;
        var startA = -Math.PI / 2;
        for (var pi2 = 0; pi2 < data2.length; pi2++) {
          var sliceA = (data2[pi2] / total) * Math.PI * 2;
          ctx.fillStyle = colors[pi2 % colors.length];
          ctx.beginPath();
          ctx.moveTo(cx2, cy2);
          if (type === 'ring') {
            ctx.arc(cx2, cy2, r2, startA, startA + sliceA);
            ctx.arc(cx2, cy2, r2 * 0.55, startA + sliceA, startA, true);
          } else {
            ctx.arc(cx2, cy2, r2, startA, startA + sliceA);
          }
          ctx.closePath();
          ctx.fill();
          startA += sliceA;
        }
      }

      // 图例
      var legends = data.legends || [];
      for (var l2 = 0; l2 < legends.length; l2++) {
        var ly2 = chart.y + 10 + l2 * 16;
        ctx.fillStyle = colors[l2 % colors.length];
        ctx.fillRect(chart.x + chart.w - 80, ly2, 10, 10);
        ctx.fillStyle = '#666';
        ctx.font = (10 * Math.min(scale.sx, scale.sy)) + 'px sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(legends[l2], chart.x + chart.w - 65, ly2 + 5);
        ctx.textBaseline = 'top';
      }
    },

    // ---- 表格 ----
    table: function (ctx, el, scale) {
      var p = _pos(el);
      var x = p.x * scale.sx, y = p.y * scale.sy;
      var w = p.w * scale.sx, h = p.h * scale.sy;
      var rows = el.data || [[]];
      var rowH = h / Math.max(rows.length, 1);
      var themeColor = (el.theme && el.theme.color) || '#4a7c59';
      var borderColor = (el.outline && el.outline.color) || '#d4d4d4';
      var borderW = (el.outline && el.outline.width) || 1;

      for (var r3 = 0; r3 < rows.length; r3++) {
        var row = rows[r3];
        var colW = w / Math.max(row.length, 1);
        // 表头底色
        if (r3 === 0) {
          ctx.fillStyle = themeColor;
          ctx.fillRect(x, y + r3 * rowH, w, rowH);
        } else {
          // 斑马纹
          if (r3 % 2 === 0) {
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(x, y + r3 * rowH, w, rowH);
          }
        }
        for (var c3 = 0; c3 < row.length; c3++) {
          var cell = row[c3];
          var fontSize = (12 * Math.min(scale.sx, scale.sy));
          ctx.font = (r3 === 0 ? 'bold ' : '') + fontSize + 'px "LXGW WenKai", sans-serif';
          ctx.fillStyle = r3 === 0 ? '#fff' : '#1a3a2a';
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'center';
          ctx.fillText(String(cell), x + c3 * colW + colW / 2, y + r3 * rowH + rowH / 2);
        }
        ctx.textAlign = 'left';
      }
      // 边框
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderW;
      ctx.strokeRect(x, y, w, h);
    },

    // ---- 视频 ----
    video: function (ctx, el, scale) {
      var p = _pos(el);
      var x = p.x * scale.sx, y = p.y * scale.sy;
      var w = p.w * scale.sx, h = p.h * scale.sy;
      ctx.fillStyle = '#222';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#fff';
      ctx.font = (16 * Math.min(scale.sx, scale.sy)) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('▶ 视频', x + w / 2, y + h / 2);
      ctx.textAlign = 'left';
    },

    // ---- 音频（占位）----
    audio: function (ctx, el, scale) {
      var p = _pos(el);
      var x = p.x * scale.sx, y = p.y * scale.sy;
      var w = p.w * scale.sx, h = p.h * scale.sy;
      ctx.fillStyle = '#f0e6d6';
      _rRect(ctx, x, y, w, h, 8);
      ctx.fill();
      ctx.strokeStyle = '#c4956a';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#c4956a';
      ctx.font = (12 * Math.min(scale.sx, scale.sy)) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔊 音频：' + (el.fileName || 'audio'), x + w / 2, y + h / 2);
      ctx.textAlign = 'left';
    },

    // ---- LaTeX（用 MathJax/KaTeX 渲染，外层包 DOM 元素更可靠）----
    latex: function (ctx, el, scale) {
      var p = _pos(el);
      var x = p.x * scale.sx, y = p.y * scale.sy;
      var w = p.w * scale.sx, h = p.h * scale.sy;
      // 简化为：框内显示 LaTeX 源码
      ctx.fillStyle = '#fff';
      _rRect(ctx, x, y, w, h, 4);
      ctx.fill();
      ctx.strokeStyle = el.color || '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = el.color || '#000';
      ctx.font = 'italic ' + (el.fontSize || 16) * Math.min(scale.sx, scale.sy) + 'px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(el.latex || '', x + w / 2, y + h / 2);
      ctx.textAlign = 'left';
    }
  };

  function _drawArrow(ctx, fromX, fromY, toX, toY, size, color) {
    var angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - size * Math.cos(angle - Math.PI / 6), toY - size * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - size * Math.cos(angle + Math.PI / 6), toY - size * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }

  // ============== DOM 渲染器（code 用 HTML 元素，保留语法高亮）==============

  var domRenderers = {
    code: function (el) {
      var p = _pos(el);
      var wrap = document.createElement('div');
      wrap.style.cssText = 'position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;width:' + p.w + 'px;height:' + p.h + 'px;'
        + 'background:#1e1e1e;color:#d4d4d4;font-family:"JetBrains Mono","Fira Code",Consolas,monospace;'
        + 'font-size:13px;line-height:1.5;padding:12px 14px;border-radius:6px;overflow:auto;'
        + 'box-shadow:0 2px 8px rgba(0,0,0,0.15);box-sizing:border-box;';
      // 文件名头部
      if (el.fileName) {
        var head = document.createElement('div');
        head.style.cssText = 'color:#888;font-size:11px;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid #333;';
        head.textContent = el.fileName;
        wrap.appendChild(head);
      }
      // 代码体（保留换行）
      var pre = document.createElement('pre');
      pre.style.cssText = 'margin:0;white-space:pre-wrap;word-break:break-all;';
      pre.textContent = el.code || '';
      wrap.appendChild(pre);
      return wrap;
    },
    text: function (el) {
      // 文本也可以用 DOM（保留 HTML 标签）
      var p = _pos(el);
      var div = document.createElement('div');
      div.style.cssText = 'position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;width:' + p.w + 'px;'
        + 'min-height:' + p.h + 'px;color:' + (el.defaultColor || '#1a3a2a') + ';'
        + 'font:' + (el.fontSize || 16) + 'px ' + (el.defaultFontName || 'sans-serif') + ';'
        + 'line-height:' + (el.lineHeight || 1.5) + ';'
        + 'box-sizing:border-box;word-wrap:break-word;overflow-wrap:break-word;';
      div.innerHTML = el.content || '';
      return div;
    }
  };

  // ============== Slide 渲染主入口 ==============

  function renderSlide(canvas, slide, opts) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var rect = canvas.getBoundingClientRect();
    var actualW = canvas.width = rect.width * (window.devicePixelRatio || 1);
    var actualH = canvas.height = rect.height * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    var viewportW = slide.viewportSize || (DSL && DSL.SLIDE_VIEWPORT.width) || 1000;
    var viewportH = viewportW / (slide.viewportRatio || 16 / 9);
    var scale = _scale(viewportW, viewportH, rect.width, rect.height);

    // 背景
    ctx.fillStyle = (slide.background && slide.background.color) || '#fefcf7';
    ctx.fillRect(0, 0, rect.width, rect.height);

    var elements = (slide.elements || []).slice();
    // 形状在文字下方，线条在最下
    var order = ['shape', 'line', 'image', 'chart', 'table', 'latex', 'text', 'video', 'audio'];
    elements.sort(function (a, b) { return order.indexOf(a.type) - order.indexOf(b.type); });

    elements.forEach(function (el) {
      var r = elementRenderers[el.type];
      if (r) r(ctx, el, scale);
    });
  }

  // ============== HTML 模式渲染（适合需要交互的代码块）==============

  function htmlSlide(slide, container) {
    if (!container) return;
    container.innerHTML = '';
    var viewportW = slide.viewportSize || (DSL && DSL.SLIDE_VIEWPORT.width) || 1000;
    var viewportH = viewportW / (slide.viewportRatio || 16 / 9);
    container.style.cssText = 'position:relative;width:100%;padding-bottom:' + (viewportH / viewportW * 100) + '%;'
      + 'background:' + ((slide.background && slide.background.color) || '#fefcf7') + ';'
      + 'border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);';

    var layer = document.createElement('div');
    layer.style.cssText = 'position:absolute;inset:0;transform-origin:0 0;';
    container.appendChild(layer);

    var elements = (slide.elements || []).slice();
    elements.forEach(function (el) {
      var dom = domRenderers[el.type];
      if (dom) {
        var node = dom(el);
        if (node) layer.appendChild(node);
      }
    });
    return layer;
  }

  // ============== 暴露 API ==============

  var Renderer = {
    renderSlide: renderSlide,
    htmlSlide: htmlSlide,
    elementRenderers: elementRenderers,
    domRenderers: domRenderers
  };

  global.OpenMAICRenderer = Renderer;

})(typeof window !== 'undefined' ? window : globalThis);
