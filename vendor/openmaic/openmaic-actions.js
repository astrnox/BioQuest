/**
 * ============================================================
 * OpenMAIC Action Executor — 动作播放器
 * ------------------------------------------------------------
 * 移植自 OpenMAIC 运行时 Action 执行器
 * 把 DSL 中的 Action（speech、wb_*、discussion、spotlight 等）真正执行
 * ------------------------------------------------------------
 * 使用：
 *   ActionRunner.run(action);  // 同步执行单个动作
 *   ActionRunner.runSequence(actions, opts);  // 顺序执行
 *   ActionRunner.on('speech', handler);  // 订阅事件
 * ============================================================
 */
(function (global) {
  'use strict';

  var DSL = global.OpenMAICDSL;
  var Renderer = global.OpenMAICRenderer;

  // 简易事件总线
  var listeners = {};
  function emit(event, data) {
    (listeners[event] || []).forEach(function (cb) {
      try { cb(data); } catch (e) { console.error('[ActionRunner]', e); }
    });
  }

  function on(event, cb) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(cb);
  }

  // ============== Action 处理器 ==============

  var handlers = {
    // 聚光（fire-and-forget）：通过 CSS class 实现
    spotlight: function (a) {
      var id = a.elementId;
      if (!id) return Promise.resolve();
      var el = document.getElementById(id);
      if (!el) return Promise.resolve();
      var dimOpacity = a.dimOpacity != null ? a.dimOpacity : 0.5;
      // 标记聚光元素
      document.querySelectorAll('.openmaic-spotlight-target').forEach(function (n) {
        n.classList.remove('openmaic-spotlight-target');
        n.style.opacity = '';
      });
      el.classList.add('openmaic-spotlight-target');
      el.style.opacity = 1;
      // 父容器其他元素变暗
      var siblings = el.parentElement ? el.parentElement.children : [];
      for (var i = 0; i < siblings.length; i++) {
        if (siblings[i] !== el) siblings[i].style.opacity = dimOpacity;
      }
      emit('spotlight', a);
      return Promise.resolve();
    },

    // 激光（fire-and-forget）：在元素中心画一个红色激光点
    laser: function (a) {
      var id = a.elementId;
      if (!id) return Promise.resolve();
      var el = document.getElementById(id);
      if (!el) return Promise.resolve();
      var rect = el.getBoundingClientRect();
      var dot = document.createElement('div');
      dot.className = 'openmaic-laser-dot';
      dot.style.cssText = 'position:fixed;left:' + (rect.left + rect.width / 2 - 8) + 'px;'
        + 'top:' + (rect.top + rect.height / 2 - 8) + 'px;width:16px;height:16px;'
        + 'border-radius:50%;background:' + (a.color || '#ff0000') + ';'
        + 'box-shadow:0 0 12px ' + (a.color || '#ff0000') + ';'
        + 'pointer-events:none;z-index:9999;animation:openmaic-laser-pulse 0.6s ease-in-out 2;';
      document.body.appendChild(dot);
      setTimeout(function () { dot.remove(); }, 1500);
      emit('laser', a);
      return Promise.resolve();
    },

    // 语音（同步）：触发 BioQuest 的 TTS 模块
    speech: function (a) {
      if (!a.text) return Promise.resolve();
      // 通过 BioQuest EventBus 触发 TTS
      if (global.EventBus && DSL && DSL.ACTION && DSL.ACTION.TTS_SPEAK) {
        global.EventBus.emit(DSL.ACTION.TTS_SPEAK, a.text, a.voice || '主讲老师');
      } else if (global.TTS) {
        global.TTS.speak(a.text, a.voice);
      }
      emit('speech', a);
      // 估算朗读时长：150 字/分钟
      var durationMs = (a.text.length / 2.5) * 1000;
      return new Promise(function (r) { setTimeout(r, Math.min(durationMs, 8000)); });
    },

    // 白板动作：通过 EventBus 转发给 BioQuest Whiteboard
    wb_open: function (a) {
      if (global.EventBus) global.EventBus.emit('WB_OPEN', a);
      emit('wb_open', a);
      return Promise.resolve();
    },
    wb_close: function (a) {
      if (global.EventBus) global.EventBus.emit('WB_CLOSE', a);
      emit('wb_close', a);
      return Promise.resolve();
    },
    wb_clear: function (a) {
      if (global.Whiteboard) global.Whiteboard.clear();
      emit('wb_clear', a);
      return Promise.resolve();
    },
    wb_delete: function (a) {
      if (!a.elementId) return Promise.resolve();
      var el = document.getElementById(a.elementId);
      if (el) el.remove();
      emit('wb_delete', a);
      return Promise.resolve();
    },
    wb_draw_text: function (a) {
      if (global.Whiteboard) {
        global.Whiteboard.executeCommands([{
          op: 'text_block',
          text: a.content,
          x: a.x || 50, y: a.y || 50,
          w: a.width || 400, h: a.height || 100,
          size: a.fontSize || 18,
          color: a.color || '#333'
        }]);
      }
      emit('wb_draw_text', a);
      return Promise.resolve();
    },
    wb_draw_shape: function (a) {
      if (global.Whiteboard) {
        var op = a.shape === 'circle' ? 'circle' : 'box';
        if (op === 'box') {
          global.Whiteboard.executeCommands([{
            op: 'box',
            x: a.x, y: a.y, w: a.width, h: a.height,
            fill: a.fillColor, text: a.text
          }]);
        } else {
          global.Whiteboard.executeCommands([{
            op: 'circle',
            cx: a.x + a.width / 2,
            cy: a.y + a.height / 2,
            r: Math.min(a.width, a.height) / 2,
            fill: a.fillColor, text: a.text
          }]);
        }
      }
      emit('wb_draw_shape', a);
      return Promise.resolve();
    },
    wb_draw_chart: function (a) {
      // 图表通过 HTML 叠加层展示（覆盖在 canvas 上方）
      _drawChartOverlay(a);
      emit('wb_draw_chart', a);
      return Promise.resolve();
    },
    wb_draw_latex: function (a) {
      // LaTeX 显示为 div（用 KaTeX 异步渲染）
      _drawLatexOverlay(a);
      emit('wb_draw_latex', a);
      return Promise.resolve();
    },
    wb_draw_table: function (a) {
      _drawTableOverlay(a);
      emit('wb_draw_table', a);
      return Promise.resolve();
    },
    wb_draw_line: function (a) {
      if (global.Whiteboard) {
        global.Whiteboard.executeCommands([{
          op: 'draw_arrow',
          x1: a.startX, y1: a.startY, x2: a.endX, y2: a.endY,
          color: a.color
        }]);
      }
      emit('wb_draw_line', a);
      return Promise.resolve();
    },
    wb_draw_code: function (a) {
      _drawCodeOverlay(a);
      emit('wb_draw_code', a);
      return Promise.resolve();
    },
    play_video: function (a) {
      var el = document.getElementById(a.elementId);
      if (el && el.tagName === 'VIDEO') el.play();
      emit('play_video', a);
      return Promise.resolve();
    },
    discussion: function (a) {
      if (global.MultiAgentDiscussion) {
        global.MultiAgentDiscussion.runDiscussion({
          topic: a.topic,
          question: a.prompt || '',
          onMessage: function (role, text) { emit('discussion_message', { role: role, text: text }); }
        });
      }
      emit('discussion', a);
      return Promise.resolve();
    },
    widget_highlight: function (a) {
      var iframe = document.querySelector('iframe.openmaic-widget');
      if (iframe && iframe.contentDocument) {
        var target = iframe.contentDocument.querySelector(a.target);
        if (target) target.classList.add('widget-highlight-active');
      }
      emit('widget_highlight', a);
      return Promise.resolve();
    },
    widget_setState: function (a) {
      if (global.EventBus) global.EventBus.emit('WIDGET_SET_STATE', a.state);
      emit('widget_setState', a);
      return Promise.resolve();
    }
  };

  // ============== 叠加层渲染（图表/LaTeX/表格/代码）==============

  function _getOverlayContainer() {
    var c = document.getElementById('openmaic-overlay-layer');
    if (!c) {
      c = document.createElement('div');
      c.id = 'openmaic-overlay-layer';
      c.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:10;';
      var stage = document.querySelector('.cls-stage, .whiteboard-stage, #classroom-stage');
      (stage || document.body).appendChild(c);
    }
    return c;
  }

  function _drawChartOverlay(a) {
    var c = _getOverlayContainer();
    var node = document.createElement('canvas');
    node.id = a.elementId || ('chart_' + Date.now());
    node.style.cssText = 'position:absolute;left:' + a.x + 'px;top:' + a.y + 'px;'
      + 'width:' + a.width + 'px;height:' + a.height + 'px;pointer-events:auto;background:#fff;border-radius:6px;';
    c.appendChild(node);
    setTimeout(function () {
      if (Renderer) Renderer.renderSlide(node, {
        viewportSize: 1000, viewportRatio: a.width / a.height,
        elements: [Object.assign({ type: 'chart' }, a)]
      });
    }, 0);
  }

  function _drawLatexOverlay(a) {
    var c = _getOverlayContainer();
    var node = document.createElement('div');
    node.id = a.elementId || ('latex_' + Date.now());
    node.style.cssText = 'position:absolute;left:' + a.x + 'px;top:' + a.y + 'px;'
      + 'width:' + (a.width || 400) + 'px;min-height:40px;'
      + 'display:flex;align-items:center;justify-content:center;'
      + 'color:' + (a.color || '#000') + ';font-size:' + (a.fontSize || 20) + 'px;'
      + 'background:#fff;padding:8px 12px;border-radius:6px;pointer-events:auto;';
    node.textContent = a.latex;
    c.appendChild(node);
    // 异步尝试 KaTeX 渲染（如已加载）
    if (global.katex) {
      try { global.katex.render(a.latex, node, { throwOnError: false }); } catch (e) {}
    }
  }

  function _drawTableOverlay(a) {
    var c = _getOverlayContainer();
    var node = document.createElement('canvas');
    node.id = a.elementId || ('table_' + Date.now());
    node.style.cssText = 'position:absolute;left:' + a.x + 'px;top:' + a.y + 'px;'
      + 'width:' + a.width + 'px;height:' + a.height + 'px;pointer-events:auto;background:#fff;border-radius:6px;';
    c.appendChild(node);
    setTimeout(function () {
      if (Renderer) Renderer.renderSlide(node, {
        viewportSize: 1000, viewportRatio: a.width / a.height,
        elements: [Object.assign({ type: 'table' }, a)]
      });
    }, 0);
  }

  function _drawCodeOverlay(a) {
    var c = _getOverlayContainer();
    var node = document.createElement('div');
    node.id = a.elementId || ('code_' + Date.now());
    node.style.cssText = 'position:absolute;left:' + a.x + 'px;top:' + a.y + 'px;'
      + 'width:' + (a.width || 500) + 'px;height:' + (a.height || 300) + 'px;'
      + 'background:#1e1e1e;color:#d4d4d4;font-family:"JetBrains Mono","Fira Code",monospace;'
      + 'font-size:13px;line-height:1.5;padding:12px 14px;border-radius:6px;'
      + 'overflow:auto;pointer-events:auto;box-sizing:border-box;';
    if (a.fileName) {
      var head = document.createElement('div');
      head.style.cssText = 'color:#888;font-size:11px;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid #333;';
      head.textContent = a.fileName;
      node.appendChild(head);
    }
    var pre = document.createElement('pre');
    pre.style.cssText = 'margin:0;white-space:pre-wrap;word-break:break-all;';
    pre.textContent = a.code;
    node.appendChild(pre);
    c.appendChild(node);
  }

  // ============== 主入口 ==============

  function run(action) {
    if (!action || !action.type) return Promise.resolve();
    var h = handlers[action.type];
    if (!h) {
      console.warn('[ActionRunner] 未知动作类型:', action.type);
      return Promise.resolve();
    }
    try { return h(action) || Promise.resolve(); }
    catch (e) { console.error('[ActionRunner] 执行失败:', e); return Promise.resolve(); }
  }

  // 顺序执行动作数组（fire-and-forget 不阻塞，sync 动作等待）
  function runSequence(actions, opts) {
    opts = opts || {};
    if (!actions || !actions.length) return Promise.resolve();
    var i = 0;
    return new Promise(function (resolve) {
      function next() {
        if (i >= actions.length) { resolve(); return; }
        var a = actions[i++];
        run(a).then(function () {
          if (opts.delayBetween) setTimeout(next, opts.delayBetween);
          else next();
        });
      }
      next();
    });
  }

  // 注入样式
  function _injectStyles() {
    if (document.getElementById('openmaic-styles')) return;
    var s = document.createElement('style');
    s.id = 'openmaic-styles';
    s.textContent = '@keyframes openmaic-laser-pulse{0%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:.6}100%{transform:scale(1);opacity:1}}'
      + '.openmaic-spotlight-target{transition:opacity .3s ease;box-shadow:0 0 0 4px rgba(196,149,106,.6);border-radius:6px;}'
      + '.widget-highlight-active{outline:3px solid #c4956a !important;animation:openmaic-laser-pulse 1s ease-in-out 2;}';
    document.head.appendChild(s);
  }

  // 暴露
  var ActionRunner = {
    run: run,
    runSequence: runSequence,
    on: on,
    handlers: handlers
  };
  global.OpenMAICActionRunner = ActionRunner;

  // 自动注入样式
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _injectStyles);
  } else {
    _injectStyles();
  }

})(typeof window !== 'undefined' ? window : globalThis);
