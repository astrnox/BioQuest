/**
 * ============================================================
 * OpenMAIC Actions — Action 类型定义与守卫（移植自 lib/types/action.ts）
 * ------------------------------------------------------------
 * OpenMAIC 的核心是统一的 Action 体系：fire-and-forget（spotlight/laser）
 * 和 synchronous（speech / wb_* / discussion / play_video）。
 *
 * 本文件用 JSDoc 替代 TS interface，提供同名工厂函数和类型守卫。
 *
 * 用法：
 *   var speech = OpenMAICActions.createAction('speech', { text: 'hi' });
 *   if (OpenMAICActions.isFireAndForget(speech)) { ... }
 * ============================================================
 */
(function (global) {
  'use strict';

  // ============== 类型常量 ==============
  var FIRE_AND_FORGET = ['spotlight', 'laser'];
  var SLIDE_ONLY = ['spotlight', 'laser'];
  var SYNC = [
    'speech', 'play_video',
    'wb_open', 'wb_draw_text', 'wb_draw_shape', 'wb_draw_chart',
    'wb_draw_latex', 'wb_draw_table', 'wb_draw_line',
    'wb_draw_code', 'wb_edit_code', 'wb_clear', 'wb_delete', 'wb_close',
    'discussion',
  ];
  var ALL = FIRE_AND_FORGET.concat(SYNC);

  // ============== 工厂函数 ==============
  function _id() {
    return 'act_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  function make(type, params) {
    params = params || {};
    var base = { id: params.id || _id(), type: type };
    switch (type) {
      case 'spotlight':
        return Object.assign(base, { elementId: params.elementId, dimOpacity: params.dimOpacity });
      case 'laser':
        return Object.assign(base, { elementId: params.elementId, color: params.color });
      case 'speech':
        return Object.assign(base, {
          text: params.text,
          audioId: params.audioId,
          audioUrl: params.audioUrl,
          voice: params.voice,
          speed: params.speed,
        });
      case 'play_video':
        return Object.assign(base, { elementId: params.elementId });
      case 'wb_open':
      case 'wb_clear':
      case 'wb_close':
        return base;
      case 'wb_draw_text':
        return Object.assign(base, {
          elementId: params.elementId,
          content: params.content,
          x: params.x, y: params.y,
          width: params.width, height: params.height,
          fontSize: params.fontSize, color: params.color,
        });
      case 'wb_draw_shape':
        return Object.assign(base, {
          elementId: params.elementId,
          shape: params.shape,
          x: params.x, y: params.y, width: params.width, height: params.height,
          fillColor: params.fillColor,
        });
      case 'wb_draw_chart':
        return Object.assign(base, {
          elementId: params.elementId,
          chartType: params.chartType,
          x: params.x, y: params.y, width: params.width, height: params.height,
          data: params.data, themeColors: params.themeColors,
        });
      case 'wb_draw_latex':
        return Object.assign(base, {
          elementId: params.elementId, latex: params.latex,
          x: params.x, y: params.y, width: params.width, height: params.height,
          color: params.color,
        });
      case 'wb_draw_table':
        return Object.assign(base, {
          elementId: params.elementId,
          x: params.x, y: params.y, width: params.width, height: params.height,
          data: params.data, outline: params.outline, theme: params.theme,
        });
      case 'wb_draw_line':
        return Object.assign(base, {
          elementId: params.elementId,
          startX: params.startX, startY: params.startY,
          endX: params.endX, endY: params.endY,
          color: params.color, width: params.width,
          style: params.style, points: params.points,
        });
      case 'wb_draw_code':
        return Object.assign(base, {
          elementId: params.elementId, language: params.language,
          code: params.code, x: params.x, y: params.y,
          width: params.width, height: params.height,
          fileName: params.fileName,
        });
      case 'wb_edit_code':
        return Object.assign(base, {
          elementId: params.elementId, operation: params.operation,
          lineId: params.lineId, lineIds: params.lineIds, content: params.content,
        });
      case 'wb_delete':
        return Object.assign(base, { elementId: params.elementId });
      case 'discussion':
        return Object.assign(base, {
          topic: params.topic, prompt: params.prompt, agentId: params.agentId,
        });
      default:
        return Object.assign(base, params);
    }
  }

  // ============== 守卫函数 ==============
  function isFireAndForget(action) {
    return !!action && FIRE_AND_FORGET.indexOf(action.type) !== -1;
  }
  function isSlideOnly(action) {
    return !!action && SLIDE_ONLY.indexOf(action.type) !== -1;
  }
  function isSync(action) {
    return !!action && SYNC.indexOf(action.type) !== -1;
  }
  function isSpeech(action) {
    return !!action && action.type === 'speech';
  }
  function isWhiteboard(action) {
    return !!action && action.type.indexOf('wb_') === 0;
  }
  function isDiscussion(action) {
    return !!action && action.type === 'discussion';
  }
  function isValidAction(action) {
    return !!action && ALL.indexOf(action.type) !== -1;
  }

  // ============== 校验过滤器 ==============
  /**
   * 过滤非 slide 场景的 spotlight/laser（防御）
   */
  function filterSlideOnly(actions, sceneType) {
    if (sceneType && sceneType !== 'slide') {
      return actions.filter(function (a) { return !isSlideOnly(a); });
    }
    return actions;
  }

  /**
   * 按白名单过滤（防止幻觉 action）
   * @param {Array} actions
   * @param {Array<string>} allowed - 允许的 action type 列表（speech 永远保留）
   */
  function filterByAllowed(actions, allowed) {
    if (!allowed || !allowed.length) return actions;
    return actions.filter(function (a) {
      return a.type === 'speech' || allowed.indexOf(a.type) !== -1;
    });
  }

  global.OpenMAICActions = {
    TYPES: ALL,
    FIRE_AND_FORGET: FIRE_AND_FORGET,
    SLIDE_ONLY: SLIDE_ONLY,
    SYNC: SYNC,
    make: make,
    isFireAndForget: isFireAndForget,
    isSlideOnly: isSlideOnly,
    isSync: isSync,
    isSpeech: isSpeech,
    isWhiteboard: isWhiteboard,
    isDiscussion: isDiscussion,
    isValidAction: isValidAction,
    filterSlideOnly: filterSlideOnly,
    filterByAllowed: filterByAllowed,
  };
})(typeof window !== 'undefined' ? window : globalThis);
