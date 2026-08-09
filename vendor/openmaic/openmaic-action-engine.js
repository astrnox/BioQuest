/**
 * ============================================================
 * OpenMAIC Action Engine — 动作执行器（移植自 lib/action/engine.ts）
 * ------------------------------------------------------------
 * 统一执行所有 Action（speech / wb_* / discussion / play_video /
 * spotlight / laser）。两类执行模式：
 *   - Fire-and-forget：spotlight、laser（立即返回）
 *   - Synchronous：speech、whiteboard、discussion（等完成后回调）
 *
 * 与原版差异：
 *   - 白板绘制走 BioQuest 现有 js/whiteboard.js（命令式）
 *     而不是 OpenMAIC stageAPI，依赖 window.Whiteboard.executeCommands
 *   - latex 用占位文字（BioQuest 无 KaTeX）
 *   - 视频/媒体占位跳过（BioQuest 走白板文字描述）
 *   - speech 可桥接 BioQuestTTS 或直接调用 actionEngine.audioPlayer
 *
 * 用法：
 *   var engine = new OpenMAICActionEngine({ audioPlayer: window.BioQuestTTS });
 *   await engine.execute({ type: 'wb_draw_text', x: 100, y: 100, content: 'hi' });
 * ============================================================
 */
(function (global) {
  'use strict';

  var Actions = global.OpenMAICActions;
  var CanvasStore = global.OpenMAICCanvasStore;
  var HistoryStore = global.OpenMAICWhiteboardHistoryStore;
  var Element = global.OpenMAICElement;

  var EFFECT_AUTO_CLEAR_MS = 5000;
  var SHAPE_PATHS = {
    rectangle: 'M 0 0 L 1000 0 L 1000 1000 L 0 1000 Z',
    circle: 'M 500 0 A 500 500 0 1 1 499 0 Z',
    triangle: 'M 500 0 L 1000 1000 L 0 1000 Z',
  };

  function _delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function _uid() { return Element.nanoid(8); }

  /**
   * @param {Object} [opts]
   * @param {Object} [opts.audioPlayer] - 音频播放器（BioQuest TTS）
   * @param {Object} [opts.whiteboard]  - 白板（默认用 window.Whiteboard）
   * @param {Object} [opts.eventBus]    - 事件总线（默认 window.BioQuestEventBus）
   */
  function ActionEngine(opts) {
    opts = opts || {};
    this.audioPlayer = opts.audioPlayer || null;
    this.whiteboard = opts.whiteboard || (global.Whiteboard || null);
    this.eventBus = opts.eventBus || (global.BioQuestEventBus || null);
    this._effectTimer = null;
  }

  ActionEngine.prototype.dispose = function () {
    if (this._effectTimer) { clearTimeout(this._effectTimer); this._effectTimer = null; }
  };

  /**
   * 执行单个 action。fire-and-forget 立即返回，sync 返回 Promise。
   */
  ActionEngine.prototype.execute = function (action) {
    var self = this;
    // 自动开白板
    var promise = Promise.resolve();
    if (action.type && action.type.indexOf('wb_') === 0 && action.type !== 'wb_open' && action.type !== 'wb_close') {
      promise = promise.then(function () { return self._ensureWhiteboardOpen(); });
    }
    return promise.then(function () {
      switch (action.type) {
        case 'spotlight': self._executeSpotlight(action); return;
        case 'laser': self._executeLaser(action); return;
        case 'speech': return self._executeSpeech(action);
        case 'play_video': return self._executePlayVideo(action);
        case 'wb_open': return self._executeWbOpen();
        case 'wb_close': return self._executeWbClose();
        case 'wb_clear': return self._executeWbClear();
        case 'wb_delete': return self._executeWbDelete(action);
        case 'wb_draw_text': return self._executeWbDrawText(action);
        case 'wb_draw_shape': return self._executeWbDrawShape(action);
        case 'wb_draw_chart': return self._executeWbDrawChart(action);
        case 'wb_draw_latex': return self._executeWbDrawLatex(action);
        case 'wb_draw_table': return self._executeWbDrawTable(action);
        case 'wb_draw_line': return self._executeWbDrawLine(action);
        case 'wb_draw_code': return self._executeWbDrawCode(action);
        case 'wb_edit_code': return self._executeWbEditCode(action);
        case 'discussion': return; // 由 PlaybackEngine 回调处理
        default: return;
      }
    });
  };

  ActionEngine.prototype.clearEffects = function () {
    if (this._effectTimer) { clearTimeout(this._effectTimer); this._effectTimer = null; }
    if (CanvasStore) CanvasStore.getState().clearAllEffects();
  };

  ActionEngine.prototype._scheduleEffectClear = function () {
    var self = this;
    if (this._effectTimer) clearTimeout(this._effectTimer);
    this._effectTimer = setTimeout(function () {
      if (CanvasStore) CanvasStore.getState().clearAllEffects();
      self._effectTimer = null;
    }, EFFECT_AUTO_CLEAR_MS);
  };

  // ==================== Fire-and-forget ====================

  ActionEngine.prototype._executeSpotlight = function (a) {
    if (!CanvasStore) return;
    CanvasStore.getState().setSpotlight(a.elementId, { dimness: a.dimOpacity != null ? a.dimOpacity : 0.5 });
    this._scheduleEffectClear();
  };

  ActionEngine.prototype._executeLaser = function (a) {
    if (!CanvasStore) return;
    CanvasStore.getState().setLaser(a.elementId, { color: a.color || '#ff0000' });
    this._scheduleEffectClear();
  };

  // ==================== Speech ====================

  ActionEngine.prototype._executeSpeech = function (a) {
    if (!this.audioPlayer || !this.audioPlayer.play) return Promise.resolve();
    var self = this;
    return new Promise(function (resolve) {
      self.audioPlayer.onEnded(function () { resolve(); });
      self.audioPlayer.play(a.audioId || '', a.audioUrl)
        .then(function (started) { if (!started) resolve(); })
        .catch(function () { resolve(); });
    });
  };

  // ==================== Video ====================

  ActionEngine.prototype._executePlayVideo = function (a) {
    if (!CanvasStore) return Promise.resolve();
    CanvasStore.getState().playVideo(a.elementId);
    // 不实际等待（BioQuest 视频以事件为主）
    return _delay(500);
  };

  // ==================== Whiteboard helpers ====================

  ActionEngine.prototype._ensureWhiteboardOpen = function () {
    if (CanvasStore && !CanvasStore.getState().whiteboardOpen) {
      return this._executeWbOpen();
    }
    return Promise.resolve();
  };

  ActionEngine.prototype._wbExecute = function (commands) {
    if (this.whiteboard && typeof this.whiteboard.executeCommands === 'function') {
      this.whiteboard.executeCommands(commands);
      return;
    }
    // 退路：通过事件总线发指令（BioQuest EventBus 约定）
    if (this.eventBus && this.eventBus.emit) {
      this.eventBus.emit('whiteboard:execute', commands);
    } else if (this.eventBus && this.eventBus.publish) {
      this.eventBus.publish('whiteboard:execute', commands);
    }
  };

  ActionEngine.prototype._pushHistory = function () {
    if (HistoryStore && this.whiteboard && typeof this.whiteboard.getElements === 'function') {
      HistoryStore.getState().pushSnapshot(this.whiteboard.getElements());
    }
  };

  ActionEngine.prototype._executeWbOpen = function () {
    if (CanvasStore) CanvasStore.getState().setWhiteboardOpen(true);
    return _delay(400); // 缩短 BioQuest 动画等待（原版 2000ms 太长）
  };

  ActionEngine.prototype._executeWbClose = function () {
    if (CanvasStore) CanvasStore.getState().setWhiteboardOpen(false);
    return _delay(300);
  };

  ActionEngine.prototype._executeWbClear = function () {
    this._pushHistory();
    if (CanvasStore) CanvasStore.getState().setWhiteboardClearing(true);
    var self = this;
    return _delay(400).then(function () {
      self._wbExecute([{ type: 'clear' }]);
      if (CanvasStore) CanvasStore.getState().setWhiteboardClearing(false);
    });
  };

  ActionEngine.prototype._executeWbDelete = function (a) {
    if (!a.elementId) return Promise.resolve();
    this._wbExecute([{ type: 'delete', elementId: a.elementId }]);
    return _delay(200);
  };

  ActionEngine.prototype._executeWbDrawText = function (a) {
    if (!a.content) return Promise.resolve();
    var html = a.content;
    if (typeof html === 'string' && html.charAt(0) !== '<') {
      var fs = a.fontSize || 18;
      html = '<p style="font-size:' + fs + 'px;">' + html + '</p>';
    }
    this._wbExecute([{
      type: 'text',
      id: a.elementId || _uid(),
      x: a.x, y: a.y,
      w: a.width || 400, h: a.height || 100,
      text: html,
      color: a.color || '#333333',
    }]);
    return _delay(300);
  };

  ActionEngine.prototype._executeWbDrawShape = function (a) {
    var shape = a.shape || 'rectangle';
    // BioQuest whiteboard 用 box / circle，路径映射
    var bioType = shape === 'circle' ? 'circle' : 'box';
    this._wbExecute([{
      type: bioType,
      id: a.elementId || _uid(),
      x: a.x, y: a.y, w: a.width, h: a.height,
      fill: a.fillColor || '#5b9bd5',
    }]);
    return _delay(300);
  };

  ActionEngine.prototype._executeWbDrawChart = function (a) {
    // BioQuest 无图表原生支持 → 退化为占位文字
    var labels = (a.data && a.data.labels) || [];
    var series = (a.data && a.data.series) || [];
    var lines = ['<h3>📊 图表（' + (a.chartType || 'chart') + '）</h3>'];
    for (var i = 0; i < labels.length; i++) {
      var row = (series[0] && series[0][i] != null) ? series[0][i] : '';
      lines.push('<div>' + labels[i] + ': ' + row + '</div>');
    }
    this._wbExecute([{
      type: 'text',
      id: a.elementId || _uid(),
      x: a.x, y: a.y, w: a.width || 400, h: a.height || 200,
      text: lines.join(''),
      color: '#1a3a2a',
    }]);
    return _delay(300);
  };

  ActionEngine.prototype._executeWbDrawLatex = function (a) {
    // BioQuest 无 KaTeX → 占位文字
    this._wbExecute([{
      type: 'text',
      id: a.elementId || _uid(),
      x: a.x, y: a.y, w: a.width || 400, h: a.height || 80,
      text: '<code style="font-family:Consolas,monospace;font-size:18px;">' + (a.latex || '') + '</code>',
      color: a.color || '#000000',
    }]);
    return _delay(200);
  };

  ActionEngine.prototype._executeWbDrawTable = function (a) {
    var data = a.data || [];
    if (!data.length) return Promise.resolve();
    var html = '<table style="border-collapse:collapse;width:100%;font-size:14px;">';
    for (var r = 0; r < data.length; r++) {
      html += '<tr>';
      for (var c = 0; c < data[r].length; c++) {
        var tag = r === 0 ? 'th' : 'td';
        var bg = r === 0 ? '#e8f0e8' : 'transparent';
        html += '<' + tag + ' style="border:1px solid #eeece1;padding:6px;background:' + bg + ';">' + data[r][c] + '</' + tag + '>';
      }
      html += '</tr>';
    }
    html += '</table>';
    this._wbExecute([{
      type: 'text',
      id: a.elementId || _uid(),
      x: a.x, y: a.y, w: a.width || 500, h: a.height || 200,
      text: html,
    }]);
    return _delay(400);
  };

  ActionEngine.prototype._executeWbDrawLine = function (a) {
    // BioQuest 没有原生 line → 退化为超细 box
    var x1 = a.startX, y1 = a.startY, x2 = a.endX, y2 = a.endY;
    var left = Math.min(x1, x2), top = Math.min(y1, y2);
    var w = Math.max(1, Math.abs(x2 - x1));
    var h = Math.max(1, Math.abs(y2 - y1));
    var isHoriz = h <= 4;
    this._wbExecute([{
      type: isHoriz ? 'box' : 'box',
      id: a.elementId || _uid(),
      x: left, y: top, w: w, h: isHoriz ? 2 : h,
      fill: a.color || '#333333',
    }]);
    return _delay(200);
  };

  ActionEngine.prototype._executeWbDrawCode = function (a) {
    var code = a.code || '';
    var lines = code.split('\n');
    var html = '<pre style="background:#1e1e1e;color:#d4d4d4;padding:12px;border-radius:6px;font-family:Consolas,monospace;font-size:13px;overflow:auto;"><code>' +
      lines.map(function (l) { return l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }).join('\n') +
      '</code></pre>';
    this._wbExecute([{
      type: 'text',
      id: a.elementId || _uid(),
      x: a.x, y: a.y, w: a.width || 500, h: a.height || 300,
      text: html,
    }]);
    return _delay(Math.min(800 + lines.length * 30, 2000));
  };

  ActionEngine.prototype._executeWbEditCode = function (a) {
    // BioQuest 无代码块编辑 → 整体替换
    if (!a.content) return Promise.resolve();
    this._executeWbDrawCode({ code: a.content, x: 0, y: 0, width: 500, height: 300 });
    return _delay(400);
  };

  global.OpenMAICActionEngine = ActionEngine;
})(typeof window !== 'undefined' ? window : globalThis);
