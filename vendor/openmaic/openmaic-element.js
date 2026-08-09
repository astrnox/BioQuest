/**
 * ============================================================
 * OpenMAIC Element Utils — 元素工具（移植自 lib/utils/element.ts）
 * ------------------------------------------------------------
 * 提供：
 *   - 元素 AABB 计算（getElementRange）
 *   - 元素列表 AABB（getElementListRange）
 *   - ID 重映射（createElementIdMap, createSlideIdMap）
 *   - 线条路径生成（getLineElementPath）
 *   - 表格配色（getTableSubThemeColor）
 *   - 视口可见判断（isElementInViewport）
 *   - 元素指纹（elementFingerprint）
 *
 * 原版用 nanoid + tinycolor2，本文件用纯 JS 替代：
 *   - nanoid → 自实现 _nanoid
 *   - tinycolor2 → 简单 rgba 转换
 * ============================================================
 */
(function (global) {
  'use strict';

  // ============== 简单 ID 生成（替代 nanoid） ==============
  function _nanoid(n) {
    n = n || 10;
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var id = '';
    for (var i = 0; i < n; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  // ============== 几何计算 ==============
  function getRectRotatedRange(rect) {
    var left = rect.left || 0;
    var top = rect.top || 0;
    var w = rect.width || 0;
    var h = rect.height || 0;
    var rotate = rect.rotate || 0;
    var radius = Math.sqrt(w * w + h * h) / 2;
    var aux = (Math.atan(h / w) * 180) / Math.PI;
    var r1 = ((180 - rotate - aux) * Math.PI) / 180;
    var r2 = ((aux - rotate) * Math.PI) / 180;
    var cx = left + w / 2;
    var cy = top + h / 2;
    var xs = [cx + radius * Math.cos(r1), cx + radius * Math.cos(r2), cx - radius * Math.cos(r1), cx - radius * Math.cos(r2)];
    var ys = [cy - radius * Math.sin(r1), cy - radius * Math.sin(r2), cy + radius * Math.sin(r1), cy + radius * Math.sin(r2)];
    return {
      xRange: [Math.min.apply(null, xs), Math.max.apply(null, xs)],
      yRange: [Math.min.apply(null, ys), Math.max.apply(null, ys)],
    };
  }

  function getElementRange(element) {
    var minX, maxX, minY, maxY;
    if (element.type === 'line') {
      minX = element.left;
      maxX = element.left + Math.max(element.start[0], element.end[0]);
      minY = element.top;
      maxY = element.top + Math.max(element.start[1], element.end[1]);
    } else if (element.rotate) {
      var r = getRectRotatedRange(element);
      minX = r.xRange[0];
      maxX = r.xRange[1];
      minY = r.yRange[0];
      maxY = r.yRange[1];
    } else {
      minX = element.left;
      maxX = element.left + element.width;
      minY = element.top;
      maxY = element.top + element.height;
    }
    return { minX: minX, maxX: maxX, minY: minY, maxY: maxY };
  }

  function getElementListRange(elements) {
    var l = [], t = [], r = [], b = [];
    for (var i = 0; i < elements.length; i++) {
      var g = getElementRange(elements[i]);
      l.push(g.minX);
      t.push(g.minY);
      r.push(g.maxX);
      b.push(g.maxY);
    }
    return {
      minX: Math.min.apply(null, l),
      maxX: Math.max.apply(null, r),
      minY: Math.min.apply(null, t),
      maxY: Math.max.apply(null, b),
    };
  }

  function getLineElementLength(el) {
    var dx = el.end[0] - el.start[0];
    var dy = el.end[1] - el.start[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getLineElementPath(el) {
    var start = Array.isArray(el.start) ? el.start : [0, 0];
    var end = Array.isArray(el.end) ? el.end : [100, 100];
    var s = start.join(',');
    var e = end.join(',');
    if (el.broken) {
      return 'M' + s + ' L' + el.broken.join(',') + ' L' + e;
    }
    if (el.curve) {
      return 'M' + s + ' Q' + el.curve.join(',') + ' ' + e;
    }
    if (el.cubic) {
      return 'M' + s + ' C' + el.cubic[0].join(',') + ' ' + el.cubic[1].join(',') + ' ' + e;
    }
    return 'M' + s + ' L' + e;
  }

  // ============== ID 重映射 ==============
  function createSlideIdMap(slides) {
    var map = {};
    for (var i = 0; i < slides.length; i++) map[slides[i].id] = _nanoid(10);
    return map;
  }

  function createElementIdMap(elements) {
    var groupIdMap = {};
    var elIdMap = {};
    for (var i = 0; i < elements.length; i++) {
      var g = elements[i].groupId;
      if (g && !groupIdMap[g]) groupIdMap[g] = _nanoid(10);
      elIdMap[elements[i].id] = _nanoid(10);
    }
    return { groupIdMap: groupIdMap, elIdMap: elIdMap };
  }

  // ============== 颜色工具（替代 tinycolor2） ==============
  function _hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(hex, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function _toRgba(rgb, a) {
    return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + a + ')';
  }
  function getTableSubThemeColor(themeColor) {
    var rgb = _hexToRgb(themeColor || '#5b9bd5');
    return [_toRgba(rgb, 0.3), _toRgba(rgb, 0.1)];
  }

  // ============== 元素指纹（用于历史快照去重） ==============
  function _semanticPart(e) {
    switch (e.type) {
      case 'text': return { content: e.content };
      case 'image': return { src: e.src };
      case 'shape': return { path: e.path, fill: e.fill, text: (e.text && e.text.content) || '' };
      case 'line': return { start: e.start, end: e.end, color: e.color, style: e.style };
      case 'chart': return { chartType: e.chartType, data: e.data, themeColors: e.themeColors };
      case 'table': return { data: e.data, colWidths: e.colWidths };
      case 'latex': return { latex: e.latex };
      case 'video': return { src: e.src };
      case 'audio': return { src: e.src };
      case 'code': return { language: e.language, lines: e.lines, fileName: e.fileName || '' };
      default: return null;
    }
  }
  function elementFingerprint(elements) {
    return JSON.stringify(
      (elements || []).map(function (e) {
        return {
          id: e.id,
          left: e.left || 0,
          top: e.top || 0,
          width: e.width || 0,
          height: e.height || 0,
          sem: _semanticPart(e),
        };
      })
    );
  }

  // ============== 视口可见判断 ==============
  function isElementInViewport(el, parent) {
    var r1 = el.getBoundingClientRect();
    var r2 = parent.getBoundingClientRect();
    return r1.top >= r2.top && r1.bottom <= r2.bottom;
  }

  global.OpenMAICElement = {
    nanoid: _nanoid,
    getRectRotatedRange: getRectRotatedRange,
    getElementRange: getElementRange,
    getElementListRange: getElementListRange,
    getLineElementLength: getLineElementLength,
    getLineElementPath: getLineElementPath,
    createSlideIdMap: createSlideIdMap,
    createElementIdMap: createElementIdMap,
    getTableSubThemeColor: getTableSubThemeColor,
    elementFingerprint: elementFingerprint,
    isElementInViewport: isElementInViewport,
  };
})(typeof window !== 'undefined' ? window : globalThis);
