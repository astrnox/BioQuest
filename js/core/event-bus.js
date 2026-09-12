/**
 * ============================================================
 * BioQuest v3.1 — EventBus + 动作协议（T0-1/T0-2）
 * 让 AI 老师能主动操作任意 UI 模块
 * 纯前端零依赖，参考 OpenMAIC 多智能体课堂范式
 * ============================================================
 */

(function () {
  'use strict';

  if (window.BioQuestEventBus) return; // 防止重复加载

  /**
   * 简易事件总线
   * on(event, fn) 订阅，off(event, fn) 取消，emit(event, ...args) 触发
   */
  var listeners = {};

  function on(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
    return function () { off(event, fn); };
  }

  function off(event, fn) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(function (f) { return f !== fn; });
  }

  function emit(event) {
    var args = Array.prototype.slice.call(arguments, 1);
    var fns = listeners[event];
    if (!fns) return;
    // 复制一份避免订阅中修改数组
    fns.slice().forEach(function (fn) {
      try { fn.apply(null, args); }
      catch (e) { console.error('[EventBus] 订阅者执行出错:', event, e); }
    });
  }

  /**
   * 动作类型常量（与 PRD §5.2 协议一致）
   * AI 老师输出 [ACTION:type:param] 标签 → 解析为动作 → 派发到对应模块
   */
  var ACTION = {
    // 可视化模块
    HIGHLIGHT_ANIMATION_STEP: 'highlight_animation_step',  // [ACTION:highlight_animation_step:module:step]
    HIGHLIGHT_KG_NODE:        'highlight_kg_node',          // [ACTION:highlight_kg_node:nodeId]
    HIGHLIGHT_KG_SUBGRAPH:    'highlight_kg_subgraph',      // [ACTION:highlight_kg_subgraph:nodeId1,nodeId2,...]
    LAB_RUN_STEP:             'lab_run_step',               // [ACTION:lab_run_step:experimentId:stepIndex]
    LAB_SET_PARAM:            'lab_set_param',              // [ACTION:lab_set_param:experimentId:param:value]
    OPEN_3D:                  'open_3d',                    // [ACTION:open_3d:modelId:cameraTarget]
    // 交互模块
    WHITEBOARD_DRAW:          'whiteboard_draw',            // [ACTION:whiteboard_draw:json_commands]
    WHITEBOARD_CLEAR:         'whiteboard_clear',
    SANDBOX_SET_CODE:         'sandbox_set_code',           // [ACTION:sandbox_set_code:template_id]
    SANDBOX_RUN:              'sandbox_run',
    QUIZ_PUSH:                'quiz_push',                  // [ACTION:quiz_push:questionId1,questionId2,...]
    // 多模态
    TTS_SPEAK:                'tts_speak',                  // [ACTION:tts_speak:text]
    TTS_PAUSE:                'tts_pause',
    // 导航
    NAVIGATE:                 'navigate'                    // [ACTION:navigate:/route]
  };

  /**
   * 动作标签正则
   * 形如 [ACTION:highlight_kg_node:photosynthesis]
   *      [ACTION:whiteboard_draw:{"op":"draw_dna","x":100}]
   *      [ACTION:quiz_push:q1,q2,q3]
   */
  var ACTION_REGEX = /\[ACTION:([a-z_]+):([^\]]*)\]/gi;

  /**
   * 解析 AI 老师输出文本，拆分为 { text: 纯文本, actions: [动作] }
   * @param {string} raw - LLM 原始输出
   * @returns {{text: string, actions: Array<{type:string, param:string}>}}
   */
  function parseTeacherOutput(raw) {
    if (!raw || typeof raw !== 'string') return { text: '', actions: [] };
    var actions = [];
    var text = raw.replace(ACTION_REGEX, function (match, type, param) {
      actions.push({ type: type.toLowerCase(), param: param.trim() });
      return ''; // 从文本中移除动作标签（不朗读）
    });
    // 清理多余空行
    text = text.replace(/\n{3,}/g, '\n\n').trim();
    return { text: text, actions: actions };
  }

  /**
   * 执行一组动作（派发到 EventBus）
   * @param {Array} actions - parseTeacherOutput 返回的 actions
   */
  function dispatchActions(actions) {
    if (!actions || !actions.length) return;
    actions.forEach(function (action) {
      var type = action.type;
      var param = action.param;

      switch (type) {
        case ACTION.HIGHLIGHT_ANIMATION_STEP: {
          // param: "module:step"
          var parts = param.split(':');
          emit(ACTION.HIGHLIGHT_ANIMATION_STEP, parts[0], parseInt(parts[1] || '0', 10));
          break;
        }
        case ACTION.HIGHLIGHT_KG_NODE:
          emit(ACTION.HIGHLIGHT_KG_NODE, param);
          break;
        case ACTION.HIGHLIGHT_KG_SUBGRAPH:
          emit(ACTION.HIGHLIGHT_KG_SUBGRAPH, param.split(',').map(function (s) { return s.trim(); }));
          break;
        case ACTION.LAB_RUN_STEP: {
          var lp = param.split(':');
          emit(ACTION.LAB_RUN_STEP, lp[0], parseInt(lp[1] || '0', 10));
          break;
        }
        case ACTION.LAB_SET_PARAM: {
          var lpp = param.split(':');  // experimentId:param:value
          emit(ACTION.LAB_SET_PARAM, lpp[0], lpp[1], parseFloat(lpp[2] || '0'));
          break;
        }
        case ACTION.OPEN_3D:
          emit(ACTION.OPEN_3D, param);
          break;
        case ACTION.WHITEBOARD_DRAW:
          // param 是 JSON 命令字符串
          try {
            var cmds = JSON.parse(param);
            emit(ACTION.WHITEBOARD_DRAW, cmds);
          } catch (e) {
            console.warn('[EventBus] whiteboard_draw JSON 解析失败:', e.message, param);
          }
          break;
        case ACTION.WHITEBOARD_CLEAR:
          emit(ACTION.WHITEBOARD_CLEAR);
          break;
        case ACTION.SANDBOX_SET_CODE:
          emit(ACTION.SANDBOX_SET_CODE, param);
          break;
        case ACTION.SANDBOX_RUN:
          emit(ACTION.SANDBOX_RUN);
          break;
        case ACTION.QUIZ_PUSH:
          emit(ACTION.QUIZ_PUSH, param.split(',').map(function (s) { return s.trim(); }));
          break;
        case ACTION.TTS_SPEAK:
          emit(ACTION.TTS_SPEAK, param);
          break;
        case ACTION.TTS_PAUSE:
          emit(ACTION.TTS_PAUSE);
          break;
        case ACTION.NAVIGATE:
          emit(ACTION.NAVIGATE, param);
          break;
        default:
          console.warn('[EventBus] 未知动作类型:', type);
      }
    });
  }

  // ============================================================
  // v4.0 流式段解析 + 顺序执行（C.1.1 POC 增强）
  // 与 parseTeacherOutput/dispatchActions 并存，提供更精细的
  // 文本/动作交错执行能力，用于 v4.0 4-scene 深化课堂。
  // ============================================================

  /**
   * v4.0 简化动作别名（与 C.1.1 POC 一致）
   * 兼容旧的长名：highlight_animation_step / highlight_kg_node 等
   */
  var ACTION_ALIASES = {
    highlight: 'highlight',           // 高亮 DOM 元素
    lightup: 'lightup',               // 点亮知识图谱节点
    draw: 'draw',                     // 白板绘图指令
    tts: 'tts',                       // 语音朗读
    play: 'play',                     // 播放生物动画
    pause: 'pause',                   // 暂停动画
    seek: 'seek',                     // 跳转动画帧
    quiz: 'quiz',                     // 触发小测
    discuss: 'discuss',               // 触发多智能体讨论
    wait: 'wait',                     // 等待
    navigate: 'navigate',             // 路由跳转
    // 兼容旧名（长名归一化到短名）
    highlight_animation_step: 'highlight_animation_step',
    highlight_kg_node: 'lightup',
    highlight_kg_subgraph: 'lightup',
    whiteboard_draw: 'draw',
    whiteboard_clear: 'draw',
    tts_speak: 'tts',
    tts_pause: 'pause'
  };

  /**
   * 流式解析：将 LLM 原始输出拆分为交替的文本段与动作段
   * @param {string} raw
   * @returns {Array<{type:'text'|'action', payload}>}
   *   - text 段：payload 为字符串
   *   - action 段：payload 为 {type, param}
   */
  function parseStream(raw) {
    var segments = [];
    if (!raw || typeof raw !== 'string') return segments;
    var lastIndex = 0;
    var match;
    // 重置正则 lastIndex（全局正则需要）
    ACTION_REGEX.lastIndex = 0;
    while ((match = ACTION_REGEX.exec(raw)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', payload: raw.slice(lastIndex, match.index) });
      }
      var actionType = (match[1] || '').toLowerCase();
      var rawParam = match[2] || '';
      segments.push({
        type: 'action',
        payload: { type: ACTION_ALIASES[actionType] || actionType, param: rawParam.trim() }
      });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < raw.length) {
      segments.push({ type: 'text', payload: raw.slice(lastIndex) });
    }
    return segments;
  }

  /**
   * 按顺序执行段落数组
   * @param {Array} segments - parseStream 返回值
   * @param {Object} ctx - 课堂上下文，需提供：
   *   - renderText(text): Promise<void> 渲染文本到对话框
   *   - highlight(selector): Promise<void>
   *   - lightup(nodeId): Promise<void>
   *   - draw(instruction): Promise<void>
   *   - tts(text): Promise<void>
   *   - play(animationId): Promise<void>
   *   - pause(): Promise<void>
   *   - seek(frame): Promise<void>
   *   - quiz(spec): Promise<any>
   *   - discuss(topic): Promise<any>
   *   - navigate(route): Promise<void>
   *   - wait(ms): Promise<void>
   * @returns {Promise<void>}
   */
  function executeSegments(segments, ctx) {
    if (!segments || !segments.length) return Promise.resolve();
    return segments.reduce(function (chain, seg) {
      return chain.then(function () {
        if (seg.type === 'text') {
          var text = String(seg.payload || '').trim();
          if (!text) return Promise.resolve();
          if (ctx && typeof ctx.renderText === 'function') {
            return Promise.resolve(ctx.renderText(text));
          }
          return Promise.resolve();
        }
        // action 段
        var payload = seg.payload || {};
        var type = payload.type;
        var param = payload.param;
        var handler = ctx && ctx[type];
        if (typeof handler !== 'function') {
          console.warn('[EventBus] executeSegments: 上下文未提供 handler for', type);
          // 失败降级：作为纯文本显示
          if (ctx && typeof ctx.renderText === 'function') {
            return Promise.resolve(ctx.renderText('[' + type + ': ' + param + ']'));
          }
          return Promise.resolve();
        }
        try {
          return Promise.resolve(handler(param)).catch(function (err) {
            console.warn('[EventBus] ACTION ' + type + ' 执行失败:', err && err.message);
            if (ctx && typeof ctx.renderText === 'function') {
              return Promise.resolve(ctx.renderText('[' + type + ': ' + param + ']'));
            }
          });
        } catch (err) {
          console.warn('[EventBus] ACTION ' + type + ' 同步异常:', err && err.message);
          return Promise.resolve();
        }
      });
    }, Promise.resolve());
  }

  /**
   * 从段落数组中提取所有 ACTION 段
   */
  function extractActions(segments) {
    if (!segments) return [];
    return segments.filter(function (s) { return s.type === 'action'; })
      .map(function (s) { return s.payload; });
  }

  /**
   * 从段落数组中拼接所有文本段
   */
  function extractText(segments) {
    if (!segments) return '';
    return segments.filter(function (s) { return s.type === 'text'; })
      .map(function (s) { return s.payload; })
      .join('').replace(/\n{3,}/g, '\n\n').trim();
  }

  window.BioQuestEventBus = {
    on: on,
    off: off,
    emit: emit,
    ACTION: ACTION,
    ACTION_ALIASES: ACTION_ALIASES,
    // 旧 API（保留，向后兼容）
    parseTeacherOutput: parseTeacherOutput,
    dispatchActions: dispatchActions,
    // v4.0 新 API（C.1.1 POC）
    parseStream: parseStream,
    executeSegments: executeSegments,
    extractActions: extractActions,
    extractText: extractText
  };

})();
