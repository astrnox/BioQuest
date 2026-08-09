/**
 * ============================================================
 * BioQuest v3.1 — AI 课堂 Orchestrator（T0-7/T1-1/T1-3）
 * 一键生成 6-scene AI 生物课堂，按大纲顺序执行
 *
 * 课堂结构（参考 OpenMAIC 课堂范式）：
 *   1. 导入 (intro)     — AI 老师口述 + 白板画图
 *   2. 讲解 (lecture)   — Canvas 动画播放 + AI 老师同步解说 + 动作指令
 *   3. 模拟 (simulate)  — 虚拟实验室/3D 探索 + AI 操作
 *   4. 讨论 (discuss)   — 多智能体课堂讨论
 *   5. 测验 (quiz)      — IRT 自适应抽 3 题
 *   6. 任务 (pbl)       — PBL 项目任务布置
 * ============================================================
 */

(function () {
  'use strict';

  if (window.Classroom) return;

  var EventBus = window.BioQuestEventBus;
  var AiClient = window.AiClient;
  var IrtEngine = window.IrtEngine;
  var MultiAgent = window.MultiAgentDiscussion;

  // ====== T0-7: 课堂大纲 JSON Schema ======
  /**
   * 课堂大纲结构定义（用于 LLM 约束输出）
   * @typedef {Object} ClassroomOutline
   * @property {string} title - 课堂标题
   * @property {string} topic - 主题
   * @property {string} kgNodeId - 关联知识图谱节点 id
   * @property {string} objective - 学习目标
   * @property {Array<Scene>} scenes - 6 个场景
   *
   * @typedef {Object} Scene
   * @property {string} type - intro|lecture|simulate|discuss|quiz|pbl
   * @property {string} title - 场景标题
   * @property {number} duration - 预计时长（秒）
   * @property {Object} content - 场景内容（类型相关）
   */
  var OUTLINE_SCHEMA = {
    title: 'string',
    topic: 'string',
    kgNodeId: 'string',
    objective: 'string',
    scenes: [
      { type: 'intro',    title: 'string', duration: 60, content: { hook: 'string', whiteboardTopic: 'string' } },
      { type: 'lecture',  title: 'string', duration: 180, content: { animationId: 'string', keyPoints: ['string'], kgNodes: ['string'] } },
      { type: 'simulate', title: 'string', duration: 120, content: { experimentId: 'string', exploreGoal: 'string' } },
      { type: 'discuss',  title: 'string', duration: 60, content: { question: 'string', roles: ['string'] } },
      { type: 'quiz',     title: 'string', duration: 60, content: { count: 3, focusNode: 'string' } },
      { type: 'pbl',      title: 'string', duration: 0, content: { project: 'string', scaffold: ['string'] } }
    ]
  };

  // ====== T1-1: 课堂生成 ======

  /**
   * 生成课堂大纲
   * @param {Object} input - { topic, kgNodeId?, sourceType, sourceRef? }
   * @returns {Promise<ClassroomOutline>}
   */
  function generateOutline(input) {
    // 加载知识图谱节点信息
    return _loadKgNode(input.kgNodeId).then(function (node) {
      var nodeDesc = node ? (node.label + '：' + node.description) : input.topic;

      var prompt = [
        {
          role: 'system',
          content: [
            '你是一名资深生物教师，擅长把高中生物知识点设计成 8 分钟的微课。',
            '请基于给定主题生成课堂大纲，严格输出 JSON（不要 markdown 代码块）。',
            '',
            '大纲结构（6 个场景）：',
            '1. intro（导入，60秒）：用生活现象或问题引入',
            '2. lecture（讲解，180秒）：指定一个动画/图示，列出 3-5 个讲解要点',
            '3. simulate（模拟，120秒）：指定一个虚拟实验，给出探究目标',
            '4. discuss（讨论，60秒）：给出一个引发思考的讨论问题',
            '5. quiz（测验，60秒）：3 道选择题，聚焦本节核心',
            '6. pbl（项目任务）：布置一个 30 分钟的开放性项目',
            '',
            '可用动画 ID（animationId）:',
            '  microscope（显微镜观察）, mitosis（有丝分裂）, meiosis（减数分裂）',
            '  dna_replication（DNA复制）, transcription（转录）, translation（翻译）, photosynthesis（光合作用）',
            '可用实验 ID（experimentId）:',
            '  enzyme（酶活性探究）, plasmolysis（质壁分离）, photosynthesis（色素提取）',
            '  dna_model（DNA模型）, diffusion（扩散作用）, membrane（跨膜运输）',
            '',
            '严格 JSON 输出格式：',
            '{',
            '  "title": "课堂标题",',
            '  "topic": "主题",',
            '  "kgNodeId": "' + (input.kgNodeId || '') + '",',
            '  "objective": "学习目标（一句话）",',
            '  "scenes": [',
            '    {"type":"intro","title":"场景标题","duration":60,"content":{"hook":"导入文案","whiteboardTopic":"白板主题"}},',
            '    {"type":"lecture","title":"场景标题","duration":180,"content":{"animationId":"动画id","keyPoints":["要点1","要点2"],"kgNodes":["节点id"]}},',
            '    {"type":"simulate","title":"场景标题","duration":120,"content":{"experimentId":"实验id","exploreGoal":"探究目标"}},',
            '    {"type":"discuss","title":"场景标题","duration":60,"content":{"question":"讨论问题","roles":["困惑同学","学霸同学"]}},',
            '    {"type":"quiz","title":"场景标题","duration":60,"content":{"count":3,"focusNode":"知识点id"}},',
            '    {"type":"pbl","title":"场景标题","duration":0,"content":{"project":"项目描述","scaffold":["脚手架1","脚手架2"]}}',
            '  ]',
            '}'
          ].join('\n')
        },
        {
          role: 'user',
          content: '主题：' + input.topic + '\n知识点描述：' + nodeDesc + '\n请生成课堂大纲。'
        }
      ];

      return AiClient.callByStage('classroom_outline', prompt).then(function (text) {
        return _parseOutlineJson(text, input);
      });
    });
  }

  /**
   * 解析 LLM 输出为大纲对象（容错处理）
   */
  function _parseOutlineJson(text, input) {
    // 移除 markdown 代码块包裹
    var cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    try {
      var outline = JSON.parse(cleaned);
      // 兜底字段
      outline.topic = outline.topic || input.topic;
      outline.kgNodeId = outline.kgNodeId || input.kgNodeId || '';
      if (!outline.scenes || outline.scenes.length < 6) {
        outline = _fallbackOutline(input);
      }
      return outline;
    } catch (e) {
      console.warn('[Classroom] 大纲 JSON 解析失败，使用兜底大纲:', e.message);
      return _fallbackOutline(input);
    }
  }

  /**
   * 兜底大纲（LLM 失败时用，保证零成本可用）
   */
  function _fallbackOutline(input) {
    return {
      title: input.topic + ' — AI 课堂',
      topic: input.topic,
      kgNodeId: input.kgNodeId || '',
      objective: '掌握 ' + input.topic + ' 的核心概念与应用',
      scenes: [
        { type: 'intro',    title: '导入', duration: 60,  content: { hook: '让我们从一个生活现象开始：' + input.topic + ' 在我们身边如何体现？', whiteboardTopic: input.topic } },
        { type: 'lecture',  title: '核心讲解', duration: 180, content: { animationId: 'microscope', keyPoints: ['核心概念', '关键过程', '生物学意义'], kgNodes: [input.kgNodeId || ''] } },
        { type: 'simulate', title: '虚拟实验', duration: 120, content: { experimentId: 'enzyme', exploreGoal: '通过实验探究 ' + input.topic + ' 的影响因素' } },
        { type: 'discuss',  title: '课堂讨论', duration: 60, content: { question: input.topic + ' 的实际应用有哪些？', roles: ['困惑同学', '学霸同学', '应用同学'] } },
        { type: 'quiz',     title: '随堂测验', duration: 60, content: { count: 3, focusNode: input.kgNodeId || '' } },
        { type: 'pbl',      title: '课后项目', duration: 0, content: { project: '设计一个与 ' + input.topic + ' 相关的探究实验', scaffold: ['查阅资料', '提出假设', '设计对照', '预期结果'] } }
      ]
    };
  }

  // ====== T1-3: AI 老师讲稿生成（结构化 JSON 输出） ======

  /**
   * 为某个场景生成 AI 老师讲稿 + 白板绘图指令
   * LLM 输出结构化 JSON，代码主动驱动白板/动画/图谱
   * @param {Object} outline - 课堂大纲
   * @param {Object} scene - 当前场景
   * @returns {Promise<{script: string, whiteboard: Array, animation: string, kgNodes: Array}>}
   */
  function generateScript(outline, scene) {
    var sceneCtx = JSON.stringify(scene.content);
    var prompt = [
      {
        role: 'system',
        content: [
          '你是一名资深生物老师，正在讲一节关于「' + outline.topic + '」的课。',
          '当前场景：' + scene.title + '（' + scene.type + '）',
          '场景内容配置：' + sceneCtx,
          '',
          '## 你的任务',
          '用 JSON 输出一段讲稿 + 白板绘图指令。',
          '',
          '## 输出格式（严格 JSON，无前后缀）',
          '{"script":"讲解文本","whiteboard":[...指令...],"animation":"","kgNodes":[]}',
          '',
          '## 可用白板指令（op 字段）',
          '- title: {op:"title",text:"标题",y:20,size:28}    居中带下划线标题',
          '- text_block: {op:"text_block",text:"段落",x:60,y:80,w:680}    自动换行段落',
          '- bullet_list: {op:"bullet_list",items:["要点1","要点2"],x:60,y:120,w:680}    圆点列表',
          '- label: {op:"label",text:"标签",x:100,y:100,size:14}    简短文字',
          '- box: {op:"box",x:50,y:50,w:200,h:60,text:"框内字",fill:"#edf5f0"}    矩形框带字',
          '- circle: {op:"circle",cx:400,cy:250,r:80,text:"圆内字",fill:"#fff5e6"}    圆圈带字',
          '- draw_arrow: {op:"draw_arrow",x1:100,y1:100,x2:300,y2:100,color:"#4a7c59"}    带箭头直线',
          '- equation: {op:"equation",text:"A + B → C",y:300}    居中反应式',
          '- mindmap: {op:"mindmap",cx:400,cy:250,root:"中心词",branches:[{text:"分支1"},{text:"分支2"}]}    放射思维导图（推荐用于概念总览）',
          '- flowchart: {op:"flowchart",steps:["步骤1","步骤2","步骤3"],y:200,color:"#4a7c59"}    水平流程图（推荐用于过程）',
          '- card_group: {op:"card_group",cards:[{title:"卡1",text:"说明"}],x:50,y:100,cols:2}    网格卡片（推荐用于对比）',
          '- tree: {op:"tree",root:{text:"根",children:[{text:"子1"},{text:"子2"}]},x:400,y:60}    树形图（推荐用于分类）',
          '- draw_dna_helix: {op:"draw_dna_helix",x:100,y:80,length:300,turns:3}    DNA 双螺旋',
          '- draw_membrane: {op:"draw_membrane",x:50,y:200,width:400}    磷脂双分子层',
          '- draw_cell: {op:"draw_cell",cx:400,cy:250,r:100,label:"细胞"}    细胞',
          '- highlight: {op:"highlight",x:50,y:50,w:200,h:100}    虚线高亮框',
          '',
          '## 选指令的指导',
          '- 概念总览/分类/关系 → mindmap 或 tree',
          '- 时间过程/步骤/通路 → flowchart',
          '- 对比/并列要点 → card_group',
          '- 简单说明 → bullet_list + text_block',
          '- 结构/分子 → draw_dna_helix / draw_membrane / draw_cell',
          '',
          '## 坐标建议（画布 ~800×500）',
          '- 标题在 y=20',
          '- 内容从 y=80 开始',
          '- 多个对象水平均分布置，避免重叠',
          '',
          '## 要求',
          '1. 严格输出 JSON，{ 开头 } 结尾，不要 markdown 代码块',
          '2. script 100-180 字，口语化、生动、有启发性',
          '3. whiteboard 2-5 条指令组合',
          '4. 禁止 SVG 代码块、禁止 [[ANIM:xxx]] 标签',
          '5. 禁止在 JSON 外加任何解释文字',
          '',
          '## 示例输出',
          '{"script":"同学们，光合作用是植物利用光能合成有机物的过程。","whiteboard":[{"op":"title","text":"光合作用总览","y":20,"size":28},{"op":"mindmap","cx":400,"cy":280,"root":"光合作用","branches":[{"text":"光反应"},{"text":"暗反应"},{"text":"叶绿体"}]}],"animation":"photosynthesis","kgNodes":["光合作用"]}'
        ].join('\n')
      },
      {
        role: 'user',
        content: '请讲解「' + scene.title + '」，并在白板上绘制核心内容。'
      }
    ];

    return AiClient.callByStage('teacher_script', prompt).then(function (text) {
      return _parseScriptJson(text);
    });
  }

  /**
   * 解析讲稿 JSON（多重容错：直接 parse → 剥离 markdown → 提取首个 {} 块 → 降级）
   */
  function _parseScriptJson(text) {
    var raw = String(text).trim();
    // 1. 尝试直接 parse
    try { return _normalizeScript(JSON.parse(raw)); } catch (e) {}
    // 2. 剥离 markdown 代码块
    var cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    try { return _normalizeScript(JSON.parse(cleaned)); } catch (e) {}
    // 3. 提取第一个 { 到最后一个 }
    var firstBrace = cleaned.indexOf('{');
    var lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try { return _normalizeScript(JSON.parse(cleaned.substring(firstBrace, lastBrace + 1))); } catch (e) {}
    }
    // 4. 全部失败：降级为纯文本 + 兜底白板
    console.warn('[Classroom] 讲稿 JSON 解析失败，降级为纯文本');
    return {
      script: raw.substring(0, 300),
      whiteboard: [{ op: 'text_block', text: raw.substring(0, 200), x: 60, y: 80, w: 680 }],
      animation: '',
      kgNodes: []
    };
  }

  function _normalizeScript(obj) {
    return {
      script: String(obj.script || ''),
      whiteboard: Array.isArray(obj.whiteboard) ? obj.whiteboard : [],
      animation: String(obj.animation || ''),
      kgNodes: Array.isArray(obj.kgNodes) ? obj.kgNodes : []
    };
  }

  // ====== v3.1+: 直接生成 OpenMAIC DSL Stage JSON ======
  // 借力 OpenMAIC 的 Slide/Action/Stage 范式，让 LLM 一次性输出完整课堂 JSON

  /**
   * 生成符合 OpenMAIC DSL 的 Stage（一整堂课）
   * LLM 输出格式：{ stageId, scenes: [{type, title, slide:{elements:[...]}, actions:[...], quiz?... }] }
   */
  function generateStageDSL(topic) {
    if (!window.OpenMAICDSL) {
      throw new Error('OpenMAICDSL 未加载，请检查 vendor/openmaic/ 脚本挂载顺序');
    }
    var DSL = window.OpenMAICDSL;
    var prompt = [
      {
        role: 'system',
        content: [
          '你是一名生物老师，正在生成一节关于「' + topic + '」的 AI 课堂。',
          '',
          '## 输出格式（严格 JSON，无前后缀）',
          '{',
          '  "stageId": "stage_' + Date.now() + '",',
          '  "scenes": [',
          '    {',
          '      "id":"s1","type":"intro","title":"导入：' + topic + '是什么",',
          '      "slide":{',
          '        "elements":[',
          '          {"type":"text","left":100,"top":80,"width":800,"height":60,',
          '           "content":"<h2>' + topic + '是什么？</h2>","defaultColor":"#1a3a2a","fontSize":32},',
          '          {"type":"text","left":100,"top":180,"width":800,"height":300,',
          '           "content":"（用 3-5 行的方式介绍，激发学生兴趣）","defaultColor":"#3a6347","fontSize":18}',
          '        ]',
          '      },',
          '      "actions":[',
          '        {"type":"speech","text":"同学们好，今天我们学习' + topic + '..."},',
          '        {"type":"wb_clear"},',
          '        {"type":"wb_open"}',
          '      ]',
          '    },',
          '    ...（共 5-6 个 scene：intro/lecture/simulate/discuss/quiz/pbl）',
          '  ]',
          '}',
          '',
          '## 元素类型（op 字段 → element type）',
          '- text: {type:"text", left, top, width, height, content, fontSize?, defaultColor?, vAlign?}',
          '  content 支持简单 HTML：<h2>标题</h2> <b>加粗</b> <i>斜体</i> <br>换行',
          '- shape: {type:"shape", left, top, width, height, path, fill, text?, outline?}',
          '  path: rect/roundRect/circle/triangle/diamond/parallelogramLeft/parallelogramRight/trapezoid',
          '- line: {type:"line", start:[x,y], end:[x,y], color?, width?, style?:"solid"|"dashed", points?:[""|"arrow",""|"arrow"]}',
          '- chart: {type:"chart", left, top, width, height, chartType, data:{labels, legends, series}, themeColors?}',
          '  chartType: bar/column/line/pie/ring/area/radar/scatter',
          '- table: {type:"table", left, top, width, height, data:[["表头",...],["行1",...]], theme?, outline?}',
          '- latex: {type:"latex", left, top, width, height, latex:"\\\\frac{a}{b}", color?, fontSize?}',
          '- code: {type:"code", left, top, width, height, language, code, fileName?}',
          '- image: {type:"image", left, top, width, height, src, fixedRatio?}',
          '',
          '## 坐标系统（1000×562 标准画布）',
          '元素位置 left/top 范围 0-1000 / 0-562',
          '建议布局：标题 (100,80,800,60)，正文 (100,160,800,200)，图示 (100,380,800,160)',
          '',
          '## Action 类型',
          '- speech: {type:"speech", text:"老师要朗读的内容"}',
          '- wb_clear: 清空白板',
          '- wb_open / wb_close: 打开/关闭白板',
          '- spotlight / laser: 聚光/激光（fire-and-forget）',
          '- discussion: {type:"discussion", topic, prompt} 触发多智能体讨论',
          '',
          '## 课堂必须包含 5-6 个 scene',
          '1. intro（导入，3-5 个 element）',
          '2. lecture（讲解，含 1-2 个 chart/diagram）',
          '3. simulate（模拟实验，含步骤图）',
          '4. discuss（讨论议题，给一个开放问题）',
          '5. quiz（3 道选择题，存为 scene.content.questions）',
          '6. pbl（课后项目，给出项目脚手架）',
          '',
          '## 要求',
          '1. 严格 JSON，{ 开头 } 结尾，无 markdown 代码块',
          '2. 每个 scene 的 slide 元素 3-8 个，合理排版不重叠',
          '3. 每个 scene 的 actions 包含 1 个 speech（不超过 200 字）和必要 wb_clear',
          '4. quiz scene.content.questions 是数组，格式：[{id, type:"single", question, options:[{label,value}], answer:["A"], analysis}]',
          '5. 禁止在 JSON 外加任何解释文字',
          '',
          '## 元素复用建议',
          '概念总览：text(标题) + 多个 shape(节点) + line(连接)',
          '过程：多个 shape(box) 用 line 串联',
          '对比：table(2-3 列)',
          '数据：chart',
          '反应/公式：latex',
          '',
          '## 输出示例（仅参考，实际按 topic 生成）',
          '{"stageId":"stage_demo","scenes":[{"id":"s1","type":"intro","title":"导入","slide":{"elements":[{"type":"text","left":100,"top":80,"width":800,"height":60,"content":"<h2>光合作用</h2>","fontSize":32}]},"actions":[{"type":"speech","text":"同学们好"},{"type":"wb_open"}]}]}'
        ].join('\n')
      },
      {
        role: 'user',
        content: '请为「' + topic + '」生成完整的 5-6 个 scene 的 OpenMAIC DSL Stage JSON。'
      }
    ];

    return AiClient.callByStage('classroom_outline', prompt).then(function (text) {
      return _parseStageDSL(text);
    });
  }

  function _parseStageDSL(text) {
    var raw = String(text || '').trim();
    if (raw.length > 0) {

    }

    // 优先使用 OpenMAIC JSON Repair 库（已包含 brace balancing + control char 修复 + 多种策略）
    if (window.OpenMAICJsonRepair) {
      var parsed = window.OpenMAICJsonRepair.parseJsonResponse(raw);
      if (parsed) {
        try { return _normalizeStage(parsed); } catch (e) {
          console.warn('[DSL] JSON Repair 成功但 normalize 失败', e);
        }
      }
    }

    // 兜底：本地 6 重策略
    try { return _normalizeStage(JSON.parse(raw)); } catch (e) {}
    var cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '')
      .replace(/^<\|.*?\|>/g, '')
      .trim();
    try { return _normalizeStage(JSON.parse(cleaned)); } catch (e) {}
    var first = cleaned.indexOf('{'), last = cleaned.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try { return _normalizeStage(JSON.parse(cleaned.substring(first, last + 1))); } catch (e) {}
    }
    if (first >= 0) {
      var balanced = _tryBalanceBraces(cleaned.substring(first));
      if (balanced) {
        try { return _normalizeStage(JSON.parse(balanced)); } catch (e) {}
      }
    }
    var scenesMatch = cleaned.match(/"scenes"\s*:\s*\[([\s\S]*?)\](?=\s*[,}])/);
    if (scenesMatch) {
      try {
        var scenes = JSON.parse('[' + scenesMatch[1] + ']');
        if (Array.isArray(scenes) && scenes.length > 0) {
          return _normalizeStage({ stageId: 'stage_fallback_' + Date.now(), scenes: scenes });
        }
      } catch (e) {}
    }
    console.warn('[DSL] 所有解析策略失败，使用降级 stage');
    return _buildFallbackStage(cleaned);
  }

  // 尝试补全截断的 JSON 字符串（处理 LLM 输出被截断）
  function _tryBalanceBraces(str) {
    var depth = 0;
    var inString = false;
    var escape = false;
    var lastValid = -1;
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{' || ch === '[') depth++;
      if (ch === '}' || ch === ']') {
        depth--;
        if (depth === 0) {
          return str.substring(0, i + 1);
        }
      }
    }
    // 字符串没闭合，补一个 "
    if (inString) {
      str += '"';
    }
    // 补全所有未关闭的括号
    while (depth > 0) {
      str += '}';
      depth--;
    }
    return str;
  }

  // 降级 stage：保证 DSL 流程不会因为 LLM 失败而崩溃
  function _buildFallbackStage(rawText) {
    var DSL = window.OpenMAICDSL;
    var scenes = [];
    // 尝试从原始文本里匹配中文标题作为 scene 标题
    var titleMatches = rawText.match(/["']title["']\s*:\s*["']([^"']{2,30})["']/g) || [];
    var titles = titleMatches.map(function (m) {
      var match = m.match(/["']([^"']+)["']\s*$/);
      return match ? match[1] : '';
    }).filter(Boolean);
    if (titles.length === 0) {
      titles = ['导入', '讲解', '模拟', '讨论', '测验', '项目'];
    }
    titles.forEach(function (title, i) {
      scenes.push(DSL.createScene({
        id: DSL.id('scene'),
        stageId: 'stage_fallback',
        type: ['intro', 'lecture', 'simulate', 'discuss', 'quiz', 'pbl'][i] || 'lecture',
        title: title,
        slide: {
          elements: [
            { type: 'text', left: 100, top: 100, width: 800, height: 80,
              content: '<h2>' + title + '</h2>', fontSize: 32, defaultColor: '#1a3a2a' },
            { type: 'text', left: 100, top: 220, width: 800, height: 200,
              content: 'AI 课堂内容生成中遇到问题，已切换到降级模式。请检查网络或更换 API Key。',
              fontSize: 16, defaultColor: '#64748b' }
          ]
        },
        actions: [
          { type: 'speech', text: '正在讲解：' + title },
          { type: 'wb_open' }
        ]
      }));
    });
    return {
      stage: DSL.createStage({
        id: 'stage_fallback',
        name: 'AI 课堂（降级）',
        description: 'LLM 解析失败，使用降级 stage'
      }),
      scenes: scenes,
      _isFallback: true
    };
  }

  function _normalizeStage(obj) {
    var DSL = window.OpenMAICDSL;
    return {
      stage: DSL.createStage({
        id: obj.stageId || DSL.id('stage'),
        name: obj.name || obj.scenes && obj.scenes[0] && obj.scenes[0].title || 'AI 课堂',
        description: obj.description
      }),
      scenes: (obj.scenes || []).map(function (s, i) {
        return DSL.createScene({
          id: s.id || DSL.id('scene'),
          stageId: obj.stageId,
          type: s.type || 'slide',
          title: s.title || '',
          order: i,
          content: s.content || (s.type === 'slide' ? { type: 'slide', canvas: s.slide || {} } : null),
          actions: (s.actions || []).map(function (a) {
            // 给 action 补 id
            return Object.assign({ id: DSL.id('act') }, a);
          })
        });
      })
    };
  }

  // ====== 课堂执行引擎 ======

  /**
   * 课堂实例
   * @param {Object} outline - 课堂大纲
   * @param {Object} hooks - 回调 { onSceneStart, onScriptChunk, onScriptDone, onAction, onSceneEnd, onClassroomEnd }
   */
  function ClassroomInstance(outline, hooks) {
    this.outline = outline;
    this.hooks = hooks || {};
    this.currentSceneIndex = -1;
    this.sceneStates = [];
    this.aborted = false;
  }

  ClassroomInstance.prototype.start = function () {
    this.currentSceneIndex = -1;
    this._next();
  };

  ClassroomInstance.prototype._next = function () {
    if (this.aborted) return;
    this.currentSceneIndex++;
    if (this.currentSceneIndex >= this.outline.scenes.length) {
      if (this.hooks.onClassroomEnd) this.hooks.onClassroomEnd({ completed: true, sceneStates: this.sceneStates });
      return;
    }
    var scene = this.outline.scenes[this.currentSceneIndex];
    if (this.hooks.onSceneStart) this.hooks.onSceneStart(scene, this.currentSceneIndex);
    this._runScene(scene);
  };

  ClassroomInstance.prototype._runScene = function (scene) {
    var self = this;

    if (scene.type === 'quiz') {
      // 测验 scene：触发测验事件，等用户答完
      EventBus.emit(EventBus.ACTION.QUIZ_PUSH, scene.content.focusNode ? [scene.content.focusNode] : []);
      this.sceneStates.push({ type: 'quiz', status: 'pending' });
      // 测验由 UI 收尾后调用 self.completeScene()
      return;
    }

    if (scene.type === 'pbl') {
      // PBL scene：展示项目，无需 LLM 讲稿
      if (this.hooks.onScriptDone) this.hooks.onScriptDone({ script: '📝 课后项目：' + scene.content.project, whiteboard: [], kgNodes: [] });
      this.sceneStates.push({ type: 'pbl', project: scene.content.project });
      return;
    }

    if (scene.type === 'discuss' && MultiAgent && scene.content && scene.content.question) {
      // discuss scene：调用多智能体讨论（5 角色 5 轮串行）
      this.sceneStates.push({ type: 'discuss', status: 'running' });
      var self2 = this;
      MultiAgent.runDiscussion({
        topic: this.outline.topic,
        question: scene.content.question,
        roles: scene.content.roles || ['困惑同学', '学霸同学', '应用同学'],
        onMessage: function (role, text) {
          if (self2.hooks.onDiscussionMessage) self2.hooks.onDiscussionMessage(role, text);
          if (EventBus) EventBus.emit(EventBus.ACTION.TTS_SPEAK, text, role);
        },
        onComplete: function () {
          self2.completeScene({ discussionRounds: 5 });
        }
      });
      return;
    }

    // intro/lecture/simulate：生成结构化讲稿 + 白板绘图指令
    generateScript(this.outline, scene).then(function (parsed) {
      if (self.aborted) return;
      // 通知 UI（player 会执行白板绘图、动画切换、图谱点亮）
      if (self.hooks.onScriptDone) self.hooks.onScriptDone(parsed);
      // 点亮知识图谱节点
      if (parsed.kgNodes && parsed.kgNodes.length && EventBus) {
        parsed.kgNodes.forEach(function (nodeLabel) {
          EventBus.emit(EventBus.ACTION.HIGHLIGHT_KG_NODE, nodeLabel);
        });
      }
      // TTS 朗读讲稿
      if (parsed.script && EventBus) {
        EventBus.emit(EventBus.ACTION.TTS_SPEAK, parsed.script, '主讲老师');
      }
      self.sceneStates.push({ type: scene.type, script: parsed.script, whiteboard: parsed.whiteboard });
      // 自动进入下一 scene（延迟 4 秒让用户读完，TTS 朗读约 150 字需 ~30 秒，但用户可手动下一段）
      setTimeout(function () {
        if (!self.aborted) self._next();
      }, 4000);
    }).catch(function (err) {
      console.error('[Classroom] scene 执行失败:', err);
      self.sceneStates.push({ type: scene.type, error: err.message });
      self._next();
    });
  };

  /**
   * 完成当前 scene（用于 quiz 等用户交互场景）
   */
  ClassroomInstance.prototype.completeScene = function (result) {
    if (this.currentSceneIndex < 0) return;
    this.sceneStates[this.currentSceneIndex] = Object.assign(
      this.sceneStates[this.currentSceneIndex] || {},
      { status: 'completed', result: result }
    );
    if (this.hooks.onSceneEnd) this.hooks.onSceneEnd(this.outline.scenes[this.currentSceneIndex], result);
    var self = this;
    setTimeout(function () { if (!self.aborted) self._next(); }, 1500);
  };

  ClassroomInstance.prototype.abort = function () {
    this.aborted = true;
    EventBus.emit(EventBus.ACTION.TTS_PAUSE);
  };

  /**
   * 跳到下一场景（用户手动跳过）
   */
  ClassroomInstance.prototype.skip = function () {
    this._next();
  };

  // ====== 辅助：加载知识图谱节点 ======

  function _loadKgNode(nodeId) {
    if (!nodeId) return Promise.resolve(null);
    return fetch('data/knowledge-graph.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var nodes = data.nodes || [];
        for (var i = 0; i < nodes.length; i++) {
          if (nodes[i].id === nodeId) return nodes[i];
        }
        return null;
      })
      .catch(function () { return null; });
  }

  // ====== v3.1+: DSL 模式课堂播放 ======

  /**
   * 播放 OpenMAIC DSL Stage
   * @param {Object} stageData - {stage, scenes} （generateStageDSL 的输出）
   * @param {Object} hooks - 回调
   */
  function runDSLStage(stageData, hooks) {
    hooks = hooks || {};
    var i = 0;
    var scenes = stageData.scenes || [];
    var aborted = false;

    function playScene() {
      if (aborted || i >= scenes.length) {
        if (hooks.onClassroomEnd) hooks.onClassroomEnd({ total: scenes.length });
        return;
      }
      var scene = scenes[i];
      if (hooks.onSceneStart) hooks.onSceneStart(scene, i);
      playSceneActions(scene).then(function () {
        if (hooks.onSceneEnd) hooks.onSceneEnd(scene, null);
        i++;
        // 间隔 1.5s 进入下一 scene
        setTimeout(playScene, 1500);
      });
    }

    function playSceneActions(scene) {
      var actions = (scene.actions || []).slice();
      if (!window.OpenMAICActionRunner) {
        // 降级：串行执行
        var p = Promise.resolve();
        actions.forEach(function (a) {
          p = p.then(function () { return _dslRunAction(a, scene); });
        });
        return p;
      }
      return window.OpenMAICActionRunner.runSequence(actions, { delayBetween: 200 });
    }

    playScene();
    return {
      abort: function () { aborted = true; if (window.EventBus) window.EventBus.emit(window.EventBus.ACTION.TTS_PAUSE); },
      skip: function () { i++; playScene(); }
    };
  }

  function _dslRunAction(action, scene) {
    // 降级：直接渲染 slide + speech 通过 TTS
    if (action.type === 'speech' && action.text) {
      if (window.EventBus) window.EventBus.emit(window.EventBus.ACTION.TTS_SPEAK, action.text, '主讲老师');
      var dur = (action.text.length / 2.5) * 1000;
      return new Promise(function (r) { setTimeout(r, Math.min(dur, 6000)); });
    }
    if (action.type === 'wb_clear' && window.Whiteboard) {
      window.Whiteboard.clear();
      return Promise.resolve();
    }
    if (action.type === 'wb_open' || action.type === 'wb_close') {
      // 通知 player 切白板 stage
      if (window.EventBus) window.EventBus.emit('WB_OPEN', action);
      return Promise.resolve();
    }
    return Promise.resolve();
  }

  // ====== v4.0 4-scene 深化课堂（§7.1 + C.1.2 POC） ======
  //
  // 与 v3.1 的 6-scene 模式并存。v4.0 特点：
  //   1. 4 scene 结构：lecture(导入) → animation(讲解) → discussion(讨论) → quiz(测验)
  //   2. AI 老师输出 纯文本 + [ACTION:type:param] 标签混合（不再用 JSON）
  //   3. 用 EventBus.parseStream / executeSegments 顺序执行
  //   4. Per-stage LLM 路由（outline/teacher_script/discussion/quiz/quick_qa）

  var V4_AVAILABLE_ANIMATIONS = [
    'microscope', 'mitosis', 'meiosis',
    'dna_replication', 'transcription', 'translation', 'photosynthesis'
  ];

  /**
   * v4.0 课堂大纲生成（4 scene 结构）
   * @param {Object} input - { topic, kgNodeId?, sourceType, sourceRef? }
   * @returns {Promise<Object>} outline
   */
  function generateOutlineV4(input) {
    return _loadKgNode(input.kgNodeId).then(function (node) {
      var nodeDesc = node ? (node.label + '：' + node.description) : input.topic;
      var prompt = [
        {
          role: 'system',
          content: [
            '你是一名资深生物教师，把高中生物知识点设计成 5-8 分钟的微课。',
            '严格输出 JSON（不要 markdown 代码块），结构如下：',
            '{',
            '  "title": "课堂标题",',
            '  "topic": "主题",',
            '  "kgNodeId": "' + (input.kgNodeId || '') + '",',
            '  "objective": "学习目标",',
            '  "scenes": [',
            '    {"type":"lecture","name":"导入","title":"场景标题","duration":60,"content":{"hook":"导入文案","whiteboardTopic":"白板主题","kgNodes":["节点id"]}},',
            '    {"type":"animation","name":"讲解","title":"场景标题","duration":180,"content":{"animationId":"动画id","keyPoints":["要点1","要点2"],"animationSteps":[3,5]}},',
            '    {"type":"discussion","name":"讨论","title":"场景标题","duration":90,"content":{"question":"讨论问题","topStudentQuestion":"学霸提问","confusedStudentQuestion":"困惑同学提问"}},',
            '    {"type":"quiz","name":"测验","title":"场景标题","duration":90,"content":{"count":3,"focusNode":"知识点id"}}',
            '  ]',
            '}',
            '',
            '可用动画 ID（animationId）：' + V4_AVAILABLE_ANIMATIONS.join(', '),
            '要求：4 个 scene，严格 JSON，禁止 markdown 代码块。'
          ].join('\n')
        },
        {
          role: 'user',
          content: '主题：' + input.topic + '\n知识点描述：' + nodeDesc + '\n请生成 v4.0 4-scene 课堂大纲。'
        }
      ];

      return AiClient.callByStage('classroom_outline', prompt).then(function (text) {
        return _parseOutlineV4Json(text, input);
      });
    });
  }

  function _parseOutlineV4Json(text, input) {
    var cleaned = String(text || '').replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    try {
      var outline = JSON.parse(cleaned);
      outline.topic = outline.topic || input.topic;
      outline.kgNodeId = outline.kgNodeId || input.kgNodeId || '';
      outline._mode = 'v4';
      if (!outline.scenes || outline.scenes.length < 4) {
        return _fallbackOutlineV4(input);
      }
      // 强制 4 scene，多余的截断
      outline.scenes = outline.scenes.slice(0, 4);
      return outline;
    } catch (e) {
      console.warn('[Classroom v4] 大纲 JSON 解析失败，使用兜底大纲:', e.message);
      return _fallbackOutlineV4(input);
    }
  }

  function _fallbackOutlineV4(input) {
    return {
      title: input.topic + ' — AI 课堂 v4',
      topic: input.topic,
      kgNodeId: input.kgNodeId || '',
      objective: '掌握 ' + input.topic + ' 的核心概念与应用',
      _mode: 'v4',
      scenes: [
        {
          type: 'lecture', name: '导入', title: '导入：' + input.topic, duration: 60,
          content: {
            hook: '让我们从生活现象开始：' + input.topic + ' 在我们身边如何体现？',
            whiteboardTopic: input.topic,
            kgNodes: [input.kgNodeId || '']
          }
        },
        {
          type: 'animation', name: '讲解', title: '核心讲解：' + input.topic, duration: 180,
          content: {
            animationId: 'microscope',
            keyPoints: ['核心概念', '关键过程', '生物学意义'],
            animationSteps: [1, 3]
          }
        },
        {
          type: 'discussion', name: '讨论', title: '课堂讨论', duration: 90,
          content: {
            question: input.topic + ' 的实际应用有哪些？',
            topStudentQuestion: '老师，' + input.topic + ' 的关键机制是什么？',
            confusedStudentQuestion: '我没太理解 ' + input.topic + '，能再讲一下吗？'
          }
        },
        {
          type: 'quiz', name: '测验', title: '随堂测验', duration: 90,
          content: { count: 3, focusNode: input.kgNodeId || '' }
        }
      ]
    };
  }

  /**
   * v4.0 讲稿生成（输出纯文本 + [ACTION:] 标签）
   * @param {Object} outline - v4 大纲
   * @param {Object} scene - 当前 scene
   * @returns {Promise<string>} LLM 原始输出（含 [ACTION:] 标签）
   */
  function generateScriptV4(outline, scene) {
    var sceneCtx = JSON.stringify(scene.content);
    var availableActions = 'highlight|lightup|draw|tts|play|pause|seek|quiz|discuss|wait|navigate';
    var prompt = [
      {
        role: 'system',
        content: [
          '你是 BioQuest 的 AI 生物老师，正在讲一节关于「' + outline.topic + '」的课。',
          '当前场景：' + scene.title + '（' + scene.type + '）',
          '场景配置：' + sceneCtx,
          '',
          '## 输出格式',
          '1. 纯文本讲解 + [ACTION:type:param] 标签混合',
          '2. 每个 ACTION 标签独占一行',
          '3. 可用 ACTION 类型：' + availableActions,
          '   - highlight:CSS 选择器 或 DOM 元素描述（如 #kg-node-photosynthesis）',
          '   - lightup:知识图谱节点 ID 或标签（如 光合作用）',
          '   - draw:白板绘图指令（如 画出叶绿体结构 / {"op":"mindmap",...}）',
          '   - tts:朗读文本（如 现在我们看光反应...）',
          '   - play:生物动画 ID（如 mitosis / photosynthesis / dna_replication）',
          '   - pause:暂停动画（无参数）',
          '   - seek:动画帧号（如 5）',
          '   - quiz:concept=知识点&count=数量（如 concept=有丝分裂&count=3）',
          '   - discuss:讨论主题文本',
          '   - wait:毫秒数（如 2000）',
          '   - navigate:路由（如 /knowledge-graph）',
          '',
          '## 可用动画 ID',
          V4_AVAILABLE_ANIMATIONS.join(', '),
          '',
          '## 要求',
          '1. 讲稿 80-150 字，口语化、生动、有启发性',
          '2. 包含 2-4 个 [ACTION:] 标签（按场景类型合理选择）',
          '3. 禁止 SVG 代码块、禁止 JSON 输出、禁止 [[ANIM:xxx]] 旧标签',
          '4. 高中生能懂，避免过度学术化',
          '',
          '## 示例',
          '同学们，今天我们学习光合作用。',
          '[ACTION:tts:光合作用是植物利用光能合成有机物的过程]',
          '首先看光反应阶段，发生在类囊体膜上。',
          '[ACTION:play:photosynthesis]',
          '[ACTION:wait:3000]',
          '[ACTION:lightup:光合作用]',
          '[ACTION:quiz:concept=光合作用&count=2]'
        ].join('\n')
      },
      {
        role: 'user',
        content: '请讲解「' + scene.title + '」，并配合合适的 ACTION 标签。'
      }
    ];

    return AiClient.callByStage('teacher_script', prompt);
  }

  /**
   * v4.0 课堂实例（4-scene，使用 EventBus.parseStream/executeSegments）
   * @param {Object} outline - v4 大纲
   * @param {Object} hooks - 回调 { onSceneStart, onScriptChunk, onScriptDone, onDiscussionMessage, onSceneEnd, onClassroomEnd }
   * @param {Object} actionCtx - EventBus.executeSegments 用的上下文（renderText/highlight/lightup/draw/tts/play/pause/seek/quiz/discuss/wait/navigate）
   */
  function ClassroomInstanceV4(outline, hooks, actionCtx) {
    this.outline = outline;
    this.hooks = hooks || {};
    this.actionCtx = actionCtx || {};
    this.currentSceneIndex = -1;
    this.sceneStates = [];
    this.aborted = false;
  }

  ClassroomInstanceV4.prototype.start = function () {
    this.currentSceneIndex = -1;
    this._next();
  };

  ClassroomInstanceV4.prototype._next = function () {
    if (this.aborted) return;
    this.currentSceneIndex++;
    if (this.currentSceneIndex >= this.outline.scenes.length) {
      if (this.hooks.onClassroomEnd) {
        this.hooks.onClassroomEnd({ completed: true, sceneStates: this.sceneStates });
      }
      return;
    }
    var scene = this.outline.scenes[this.currentSceneIndex];
    if (this.hooks.onSceneStart) this.hooks.onSceneStart(scene, this.currentSceneIndex);
    this._runScene(scene);
  };

  ClassroomInstanceV4.prototype._runScene = function (scene) {
    var self = this;

    if (scene.type === 'quiz') {
      // quiz scene：触发 EventBus.QUIZ_PUSH 事件，由 player 渲染
      if (EventBus) {
        EventBus.emit(EventBus.ACTION.QUIZ_PUSH, scene.content.focusNode ? [scene.content.focusNode] : []);
      }
      this.sceneStates.push({ type: 'quiz', status: 'pending' });
      return;
    }

    if (scene.type === 'discussion' && MultiAgent && scene.content && scene.content.question) {
      // discussion scene：调用多智能体讨论
      this.sceneStates.push({ type: 'discussion', status: 'running' });
      MultiAgent.runDiscussion({
        topic: this.outline.topic,
        question: scene.content.question,
        roles: ['困惑同学', '学霸同学', '应用同学'],
        onMessage: function (role, text) {
          if (self.hooks.onDiscussionMessage) self.hooks.onDiscussionMessage(role, text);
          if (EventBus) EventBus.emit(EventBus.ACTION.TTS_SPEAK, text, role);
        },
        onComplete: function () {
          self.completeScene({ discussionRounds: 5 });
        }
      });
      return;
    }

    // lecture / animation scene：生成讲稿（含 [ACTION:] 标签）→ parseStream → executeSegments
    generateScriptV4(this.outline, scene).then(function (rawScript) {
      if (self.aborted) return;
      var segments = EventBus.parseStream(rawScript);
      var cleanText = EventBus.extractText(segments);
      var actions = EventBus.extractActions(segments);

      // 通知 UI：讲稿完成（纯文本 + 动作列表）
      if (self.hooks.onScriptDone) {
        self.hooks.onScriptDone({ script: cleanText, rawScript: rawScript, actions: actions, segments: segments });
      }

      // 点亮知识图谱节点（如果 scene 配置了）
      if (scene.content && scene.content.kgNodes && EventBus) {
        scene.content.kgNodes.forEach(function (nodeLabel) {
          if (nodeLabel) EventBus.emit(EventBus.ACTION.HIGHLIGHT_KG_NODE, nodeLabel);
        });
      }

      // 顺序执行所有 ACTION 段（renderText 由 player 提供，会把文本写到对话框）
      var ctx = Object.assign({}, self.actionCtx, {
        renderText: function (text) {
          if (self.hooks.onScriptChunk) self.hooks.onScriptChunk(text);
          return Promise.resolve();
        }
      });

      return EventBus.executeSegments(segments, ctx).then(function () {
        self.sceneStates.push({ type: scene.type, script: cleanText, actions: actions });
        // 自动进入下一 scene（延迟 3 秒让用户读完）
        setTimeout(function () {
          if (!self.aborted) self._next();
        }, 3000);
      });
    }).catch(function (err) {
      console.error('[Classroom v4] scene 执行失败:', err);
      self.sceneStates.push({ type: scene.type, error: err && err.message });
      self._next();
    });
  };

  ClassroomInstanceV4.prototype.completeScene = function (result) {
    if (this.currentSceneIndex < 0) return;
    this.sceneStates[this.currentSceneIndex] = Object.assign(
      this.sceneStates[this.currentSceneIndex] || {},
      { status: 'completed', result: result }
    );
    if (this.hooks.onSceneEnd) this.hooks.onSceneEnd(this.outline.scenes[this.currentSceneIndex], result);
    var self = this;
    setTimeout(function () { if (!self.aborted) self._next(); }, 1500);
  };

  ClassroomInstanceV4.prototype.abort = function () {
    this.aborted = true;
    if (EventBus) EventBus.emit(EventBus.ACTION.TTS_PAUSE);
  };

  ClassroomInstanceV4.prototype.skip = function () {
    this._next();
  };

  // ====== 暴露 API ======
  window.Classroom = {
    generateOutline: generateOutline,
    generateScript: generateScript,
    generateStageDSL: generateStageDSL,    // OpenMAIC DSL 模式
    runDSLStage: runDSLStage,
    create: function (outline, hooks) { return new ClassroomInstance(outline, hooks); },
    OUTLINE_SCHEMA: OUTLINE_SCHEMA,
    // v4.0 4-scene 深化模式
    generateOutlineV4: generateOutlineV4,
    generateScriptV4: generateScriptV4,
    createV4: function (outline, hooks, actionCtx) { return new ClassroomInstanceV4(outline, hooks, actionCtx); },
    V4_AVAILABLE_ANIMATIONS: V4_AVAILABLE_ANIMATIONS
  };

})();
