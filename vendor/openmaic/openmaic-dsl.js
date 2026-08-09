/**
 * ============================================================
 * OpenMAIC DSL — Pure JS Port（零依赖）
 * ------------------------------------------------------------
 * 移植自 https://github.com/THU-MAIC/OpenMAIC
 *   packages/@openmaic/dsl/src/{slides,stage,action,guards,version}.ts
 * 原项目为 TypeScript，本文件把核心数据结构/常量/guards 重写为纯 JS
 * 零依赖（无 React、无 shadcn、无 pptxgenjs），适配 BioQuest 纯前端架构
 * ------------------------------------------------------------
 * 使用：
 *   - DSL.elements.text({content, x:60, y:80, w:680, h:100, ...})  // 创建元素
 *   - DSL.createSlide({title, elements: [...]})                       // 创建 Slide
 *   - DSL.createStage({name, scenes: [...]})                          // 创建 Stage
 *   - DSL.action.wb_draw_text({x:60, y:80, content:'xxx'})          // 创建 Action
 *   - DSL.guards.isSlideContent(c)                                   // 类型守卫
 *   - DSL.SLIDE_VIEWPORT                                             // 1000×562 标准画布
 * ============================================================
 */
(function (global) {
  'use strict';

  // ============== 常量 ==============

  var DSL_VERSION = '0.3.0';

  // 元素类型（与原 dsl 的 ElementTypes 枚举等价）
  var ElementTypes = {
    TEXT: 'text',
    IMAGE: 'image',
    SHAPE: 'shape',
    LINE: 'line',
    CHART: 'chart',
    TABLE: 'table',
    LATEX: 'latex',
    VIDEO: 'video',
    AUDIO: 'audio',
    CODE: 'code'
  };

  // 场景类型
  var SceneType = {
    SLIDE: 'slide',
    QUIZ: 'quiz',
    INTERACTIVE: 'interactive',
    PBL: 'pbl'
  };

  // Stage 模式
  var StageMode = {
    AUTONOMOUS: 'autonomous',
    PLAYBACK: 'playback',
    EDIT: 'edit'
  };

  // 文本类型
  var TextType = {
    TITLE: 'title',
    SUBTITLE: 'subtitle',
    CONTENT: 'content',
    ITEM: 'item',
    ITEM_TITLE: 'itemTitle',
    NOTES: 'notes',
    HEADER: 'header',
    FOOTER: 'footer',
    PART_NUMBER: 'partNumber',
    ITEM_NUMBER: 'itemNumber'
  };

  // 形状路径公式（与原 ShapePathFormulasKeys 枚举等价）
  var ShapePathFormulasKeys = {
    ROUND_RECT: 'roundRect',
    ROUND_RECT_DIAGONAL: 'roundRectDiagonal',
    ROUND_RECT_SINGLE: 'roundRectSingle',
    ROUND_RECT_SAMESIDE: 'roundRectSameSide',
    CUT_RECT_DIAGONAL: 'cutRectDiagonal',
    CUT_RECT_SINGLE: 'cutRectSingle',
    CUT_RECT_SAMESIDE: 'cutRectSameSide',
    CUT_ROUND_RECT: 'cutRoundRect',
    MESSAGE: 'message',
    ROUND_MESSAGE: 'roundMessage',
    L: 'L',
    RING_RECT: 'ringRect',
    PLUS: 'plus',
    TRIANGLE: 'triangle',
    PARALLELOGRAM_LEFT: 'parallelogramLeft',
    PARALLELOGRAM_RIGHT: 'parallelogramRight',
    TRAPEZOID: 'trapezoid',
    BULLET: 'bullet',
    INDICATOR: 'indicator',
    DONUT: 'donut',
    DIAGSTRIPE: 'diagStripe'
  };

  // Action 类型分类
  var FIRE_AND_FORGET_ACTIONS = ['spotlight', 'laser'];
  var SLIDE_ONLY_ACTIONS = ['spotlight', 'laser'];
  var SYNC_ACTIONS = [
    'speech', 'play_video', 'wb_open', 'wb_draw_text', 'wb_draw_shape',
    'wb_draw_chart', 'wb_draw_latex', 'wb_draw_table', 'wb_draw_line',
    'wb_draw_code', 'wb_edit_code', 'wb_clear', 'wb_delete', 'wb_close',
    'discussion', 'widget_highlight', 'widget_setState', 'widget_annotation', 'widget_reveal'
  ];

  // 画布标准尺寸（1000×562 — 16:9）
  var SLIDE_VIEWPORT = { width: 1000, height: 562 };

  // ============== ID 生成器 ==============

  function _id(prefix) {
    return (prefix || 'el') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  // ============== 元素工厂（element factory）==============
  // 原 dsl 用 TS interface，BioQuest 用工厂函数同时做默认值填充

  function element(opts) {
    // 通用基类字段
    var base = {
      id: opts.id || _id(opts.type || 'el'),
      left: opts.left || opts.x || 0,
      top: opts.top || opts.y || 0,
      width: opts.width || opts.w || 100,
      height: opts.height || opts.h || 50,
      rotate: opts.rotate || 0,
      name: opts.name || ''
    };
    return Object.assign(base, opts);
  }

  var elements = {
    text: function (o) {
      return Object.assign(element(Object.assign({ type: 'text' }, o)), {
        content: o.content || '',
        defaultFontName: o.defaultFontName || '"LXGW WenKai", sans-serif',
        defaultColor: o.defaultColor || '#1a3a2a',
        lineHeight: o.lineHeight || 1.5,
        opacity: o.opacity != null ? o.opacity : 1,
        textType: o.textType || TextType.CONTENT,
        vAlign: o.vAlign || 'top'
      });
    },
    image: function (o) {
      return Object.assign(element(Object.assign({ type: 'image' }, o)), {
        src: o.src || '',
        fixedRatio: o.fixedRatio != null ? o.fixedRatio : true,
        flipH: !!o.flipH, flipV: !!o.flipV
      });
    },
    shape: function (o) {
      return Object.assign(element(Object.assign({ type: 'shape' }, o)), {
        path: o.path || ShapePathFormulasKeys.ROUND_RECT,
        fill: o.fill || '#4a7c59',
        outline: o.outline || { style: 'solid', width: 1, color: '#1a3a2a' },
        text: o.text ? { content: o.text, defaultFontName: '"LXGW WenKai", sans-serif', defaultColor: '#fff' } : undefined,
        flipH: !!o.flipH, flipV: !!o.flipV
      });
    },
    line: function (o) {
      return Object.assign(element(Object.assign({ type: 'line' }, o)), {
        start: [o.startX != null ? o.startX : 0, o.startY != null ? o.startY : 0],
        end: [o.endX != null ? o.endX : 100, o.endY != null ? o.endY : 0],
        color: o.color || '#1a3a2a',
        width: o.width || 2,
        style: o.style || 'solid',
        points: o.points || ['', '']  // ['', 'arrow'] / ['arrow', 'arrow'] 等
      });
    },
    chart: function (o) {
      return Object.assign(element(Object.assign({ type: 'chart' }, o)), {
        chartType: o.chartType || 'bar',  // bar/column/line/pie/ring/area/radar/scatter
        data: o.data || { labels: [], legends: [], series: [] },
        themeColors: o.themeColors || ['#4a7c59', '#c4956a', '#5a7bc4', '#c47a4a']
      });
    },
    table: function (o) {
      return Object.assign(element(Object.assign({ type: 'table' }, o)), {
        data: o.data || [[]],  // 二维数组，第一行是表头
        outline: o.outline || { width: 1, style: 'solid', color: '#d4d4d4' },
        theme: o.theme || { color: '#4a7c59' }
      });
    },
    latex: function (o) {
      return Object.assign(element(Object.assign({ type: 'latex' }, o)), {
        latex: o.latex || '',
        color: o.color || '#1a3a2a',
        fontSize: o.fontSize || 20
      });
    },
    video: function (o) {
      return Object.assign(element(Object.assign({ type: 'video' }, o)), {
        src: o.src || '',
        autoplay: !!o.autoplay,
        loop: !!o.loop
      });
    },
    audio: function (o) {
      return Object.assign(element(Object.assign({ type: 'audio' }, o)), {
        src: o.src || '',
        autoplay: !!o.autoplay,
        loop: !!o.loop
      });
    },
    code: function (o) {
      return Object.assign(element(Object.assign({ type: 'code' }, o)), {
        language: o.language || 'plaintext',
        code: o.code || '',
        fileName: o.fileName || ''
      });
    }
  };

  // ============== Slide 工厂 ==============

  function createSlide(opts) {
    var elements_ = (opts.elements || []).map(function (e) {
      // 元素已带 type 字段，直接返回
      return Object.assign({ id: e.id || _id(e.type) }, e);
    });
    return {
      id: opts.id || _id('slide'),
      type: 'slide',
      elements: elements_,
      // 原 dsl 还有 theme/turningMode/sectionTag/notes 等可选字段，按需透传
      theme: opts.theme,
      turningMode: opts.turningMode,
      sectionTag: opts.sectionTag,
      notes: opts.notes,
      // BioQuest 扩展：脚本（老师讲稿）
      script: opts.script || '',
      // BioQuest 扩展：viewportSize（与原 dsl 一致）
      viewportSize: opts.viewportSize || SLIDE_VIEWPORT.width,
      viewportRatio: opts.viewportRatio || (SLIDE_VIEWPORT.width / SLIDE_VIEWPORT.height)
    };
  }

  // ============== Scene 工厂 ==============

  function createScene(opts) {
    return {
      id: opts.id || _id('scene'),
      stageId: opts.stageId || '',
      type: opts.type || SceneType.SLIDE,
      title: opts.title || '',
      order: opts.order != null ? opts.order : 0,
      content: opts.content,
      actions: opts.actions || [],
      whiteboards: opts.whiteboards || [],
      multiAgent: opts.multiAgent,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  // ============== Stage 工厂 ==============

  function createStage(opts) {
    return {
      id: opts.id || _id('stage'),
      name: opts.name || '',
      description: opts.description || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      languageDirective: opts.languageDirective,
      style: opts.style,
      whiteboard: opts.whiteboard || [],
      videoManifest: opts.videoManifest,
      agentIds: opts.agentIds || [],
      generatedAgentConfigs: opts.generatedAgentConfigs || [],
      interactiveMode: !!opts.interactiveMode,
      taskEngineMode: !!opts.taskEngineMode
    };
  }

  // ============== Action 工厂 ==============

  var action = {
    spotlight: function (o) { return Object.assign({ id: _id('act'), type: 'spotlight' }, o); },
    laser: function (o) { return Object.assign({ id: _id('act'), type: 'laser', color: o.color || '#ff0000' }, o); },
    speech: function (o) {
      return Object.assign({ id: _id('act'), type: 'speech', speed: o.speed || 1.0, voice: o.voice || 'female' }, o);
    },
    wb_open: function (o) { return Object.assign({ id: _id('act'), type: 'wb_open' }, o || {}); },
    wb_close: function (o) { return Object.assign({ id: _id('act'), type: 'wb_close' }, o || {}); },
    wb_clear: function (o) { return Object.assign({ id: _id('act'), type: 'wb_clear' }, o || {}); },
    wb_delete: function (o) { return Object.assign({ id: _id('act'), type: 'wb_delete' }, o); },
    wb_draw_text: function (o) {
      return Object.assign({ id: _id('act'), type: 'wb_draw_text', width: 400, height: 100, fontSize: 18, color: '#333333' }, o);
    },
    wb_draw_shape: function (o) {
      return Object.assign({ id: _id('act'), type: 'wb_draw_shape', shape: 'rectangle', fillColor: '#5b9bd5' }, o);
    },
    wb_draw_chart: function (o) {
      return Object.assign({ id: _id('act'), type: 'wb_draw_chart', chartType: 'bar', data: { labels: [], legends: [], series: [] } }, o);
    },
    wb_draw_latex: function (o) {
      return Object.assign({ id: _id('act'), type: 'wb_draw_latex', width: 400, color: '#000000' }, o);
    },
    wb_draw_table: function (o) {
      return Object.assign({ id: _id('act'), type: 'wb_draw_table', data: [[]] }, o);
    },
    wb_draw_line: function (o) {
      return Object.assign({ id: _id('act'), type: 'wb_draw_line', color: '#333333', width: 2, style: 'solid', points: ['', ''] }, o);
    },
    wb_draw_code: function (o) {
      return Object.assign({ id: _id('act'), type: 'wb_draw_code', language: 'plaintext', code: '', width: 500, height: 300 }, o);
    },
    wb_edit_code: function (o) {
      return Object.assign({ id: _id('act'), type: 'wb_edit_code' }, o);
    },
    play_video: function (o) { return Object.assign({ id: _id('act'), type: 'play_video' }, o); },
    discussion: function (o) { return Object.assign({ id: _id('act'), type: 'discussion' }, o); },
    widget_highlight: function (o) { return Object.assign({ id: _id('act'), type: 'widget_highlight' }, o); },
    widget_setState: function (o) { return Object.assign({ id: _id('act'), type: 'widget_setState' }, o); },
    widget_annotation: function (o) { return Object.assign({ id: _id('act'), type: 'widget_annotation' }, o); },
    widget_reveal: function (o) { return Object.assign({ id: _id('act'), type: 'widget_reveal' }, o); }
  };

  // ============== Guards（类型守卫，移植自 dsl/guards.ts）==============

  var guards = {
    isTextElement: function (e) { return e && e.type === 'text'; },
    isImageElement: function (e) { return e && e.type === 'image'; },
    isShapeElement: function (e) { return e && e.type === 'shape'; },
    isLineElement: function (e) { return e && e.type === 'line'; },
    isChartElement: function (e) { return e && e.type === 'chart'; },
    isTableElement: function (e) { return e && e.type === 'table'; },
    isLatexElement: function (e) { return e && e.type === 'latex'; },
    isVideoElement: function (e) { return e && e.type === 'video'; },
    isAudioElement: function (e) { return e && e.type === 'audio'; },
    isCodeElement: function (e) { return e && e.type === 'code'; },
    isSlideContent: function (c) { return c && c.type === SceneType.SLIDE; },
    isQuizContent: function (c) { return c && c.type === SceneType.QUIZ; },
    isSyncAction: function (a) { return a && SYNC_ACTIONS.indexOf(a.type) >= 0; },
    isFireAndForgetAction: function (a) { return a && FIRE_AND_FORGET_ACTIONS.indexOf(a.type) >= 0; }
  };

  // ============== 坐标转换（百分比 ↔ 像素）==============

  function pctToPx(pct, viewportSize) {
    // 百分比坐标 [0-100] 转像素（OpenMAIC spotlight/laser 用百分比几何）
    var vw = viewportSize || SLIDE_VIEWPORT.width;
    var vh = viewportSize ? viewportSize * (SLIDE_VIEWPORT.height / SLIDE_VIEWPORT.width) : SLIDE_VIEWPORT.height;
    return {
      x: (pct.x / 100) * vw,
      y: (pct.y / 100) * vh,
      w: (pct.w / 100) * vw,
      h: (pct.h / 100) * vh
    };
  }

  // ============== 暴露 API ==============

  var DSL = {
    VERSION: DSL_VERSION,
    ElementTypes: ElementTypes,
    SceneType: SceneType,
    StageMode: StageMode,
    TextType: TextType,
    ShapePathFormulasKeys: ShapePathFormulasKeys,
    SLIDE_VIEWPORT: SLIDE_VIEWPORT,
    FIRE_AND_FORGET_ACTIONS: FIRE_AND_FORGET_ACTIONS,
    SLIDE_ONLY_ACTIONS: SLIDE_ONLY_ACTIONS,
    SYNC_ACTIONS: SYNC_ACTIONS,

    elements: elements,
    createSlide: createSlide,
    createScene: createScene,
    createStage: createStage,
    action: action,
    guards: guards,
    pctToPx: pctToPx,
    id: _id
  };

  global.OpenMAICDSL = DSL;

  // 也挂到 window.BioQuestDSL 别名（避免与 OpenMAIC 原项目命名冲突）
  global.BioQuestDSL = DSL;

})(typeof window !== 'undefined' ? window : globalThis);
