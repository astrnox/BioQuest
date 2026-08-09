/**
 * ============================================================
 * OpenMAIC Geometry — 几何计算（移植自 lib/utils/geometry.ts）
 * ------------------------------------------------------------
 * 把 OpenMAIC 元素坐标系（1000×562 视口）换算为百分比，便于
 * spotlight/laser 等效果在响应式画布上保持正确位置。
 *
 * 用法：
 *   var g = OpenMAICGeometry.getElementPercentageGeometry(el);
 *   OpenMAICGeometry.findNearestCorner(g);  // {x,y} 0-100
 * ============================================================
 */
(function (global) {
  'use strict';

  var DEFAULT_VIEWPORT = 1000;
  var VIEWPORT_RATIO = 0.5625; // 16:9
  var VIEWPORT_HEIGHT = DEFAULT_VIEWPORT * VIEWPORT_RATIO; // 562.5

  /**
   * 计算元素的百分比几何信息。
   * @param {Object} element - { left, top, width, height }，可缺省
   * @param {number} viewportSize - 视口宽（默认 1000）
   * @returns {Object|null} { x, y, w, h, centerX, centerY } 或 null
   */
  function getElementPercentageGeometry(element, viewportSize) {
    if (!element) return null;
    viewportSize = viewportSize || DEFAULT_VIEWPORT;
    if (
      element.left == null ||
      element.top == null ||
      element.width == null ||
      element.height == null
    ) {
      return null;
    }
    var vpH = viewportSize * VIEWPORT_RATIO;
    var x = (element.left / viewportSize) * 100;
    var y = (element.top / vpH) * 100;
    var w = (element.width / viewportSize) * 100;
    var h = (element.height / vpH) * 100;
    return {
      x: x,
      y: y,
      w: w,
      h: h,
      centerX: x + w / 2,
      centerY: y + h / 2,
    };
  }

  /**
   * 在 scene 中按 ID 查找元素的百分比几何信息。
   * 支持两种 scene 结构：scene.elements（旧） / scene.content.canvas.elements（新）。
   */
  function findElementGeometry(scene, elementId, viewportSize) {
    if (!scene || scene.type !== 'slide') return null;
    var elements = null;
    if (Array.isArray(scene.elements)) {
      elements = scene.elements;
    } else if (scene.content && scene.content.canvas && Array.isArray(scene.content.canvas.elements)) {
      elements = scene.content.canvas.elements;
    }
    if (!elements) return null;
    var found = null;
    for (var i = 0; i < elements.length; i++) {
      if (elements[i].id === elementId) {
        found = elements[i];
        break;
      }
    }
    if (!found) return null;
    return getElementPercentageGeometry(found, viewportSize);
  }

  /**
   * 找最近的画布角落（用于 spotlight 落点）。
   */
  function findNearestCorner(geometry) {
    if (!geometry) return { x: 0, y: 0 };
    var corners = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
    ];
    var minDist = Infinity;
    var nearest = corners[0];
    for (var i = 0; i < corners.length; i++) {
      var c = corners[i];
      var dx = c.x - geometry.centerX;
      var dy = c.y - geometry.centerY;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDist) {
        minDist = d;
        nearest = c;
      }
    }
    return nearest;
  }

  /**
   * 计算两点距离。
   */
  function distance(ax, ay, bx, by) {
    var dx = bx - ax;
    var dy = by - ay;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 计算旋转后矩形的 AABB（轴对齐包围盒）。
   * @param {Object} rect - { left, top, width, height, rotate }
   */
  function getRectRotatedRange(rect) {
    var left = rect.left || 0;
    var top = rect.top || 0;
    var width = rect.width || 0;
    var height = rect.height || 0;
    var rotate = rect.rotate || 0;
    var radius = Math.sqrt(width * width + height * height) / 2;
    var auxDeg = (Math.atan(height / width) * 180) / Math.PI;
    var tlbraRad = ((180 - rotate - auxDeg) * Math.PI) / 180;
    var trblaRad = ((auxDeg - rotate) * Math.PI) / 180;
    var midL = left + width / 2;
    var midT = top + height / 2;
    var xs = [
      midL + radius * Math.cos(tlbraRad),
      midL + radius * Math.cos(trblaRad),
      midL - radius * Math.cos(tlbraRad),
      midL - radius * Math.cos(trblaRad),
    ];
    var ys = [
      midT - radius * Math.sin(tlbraRad),
      midT - radius * Math.sin(trblaRad),
      midT + radius * Math.sin(tlbraRad),
      midT + radius * Math.sin(trblaRad),
    ];
    return {
      xRange: [Math.min.apply(null, xs), Math.max.apply(null, xs)],
      yRange: [Math.min.apply(null, ys), Math.max.apply(null, ys)],
    };
  }

  global.OpenMAICGeometry = {
    DEFAULT_VIEWPORT: DEFAULT_VIEWPORT,
    VIEWPORT_RATIO: VIEWPORT_RATIO,
    VIEWPORT_HEIGHT: VIEWPORT_HEIGHT,
    getElementPercentageGeometry: getElementPercentageGeometry,
    findElementGeometry: findElementGeometry,
    findNearestCorner: findNearestCorner,
    distance: distance,
    getRectRotatedRange: getRectRotatedRange,
  };
})(typeof window !== 'undefined' ? window : globalThis);
