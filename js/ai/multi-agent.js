/**
 * ============================================================
 * BioQuest v3.1 — 多智能体课堂讨论 + 苏格拉底助教（T1-8 / T1-9）
 * 5 角色课堂讨论：主讲老师 / 助教 / 学霸同学 / 困惑同学 / 应用同学
 *
 * 借鉴 OpenMAIC 多智能体课堂范式：
 * - 主讲讲完 → 困惑同学提问 → 主讲重新讲解或助教引导
 * - 学霸同学延伸提问 → 触发深度拓展
 * - 应用同学联系实际 → 触发案例展示
 * - 主讲总结
 *
 * 苏格拉底助教：不直接给答案，用提问引导（4 级提示）
 * ============================================================
 */

(function () {
  'use strict';

  if (window.MultiAgentDiscussion) return;

  var AiClient = window.AiClient;

  // ====== 角色人设库（T1-8） ======

  var ROLE_PERSONAS = {
    '主讲老师': {
      icon: '🎤',
      systemPrompt: '你是一名严谨的生物学教授，正在主讲一节高中生物课。你的讲解要：1) 准确无误 2) 由浅入深 3) 配合动作指令演示。每次回复不超过 150 字。',
      ttsRole: '主讲老师'
    },
    '助教': {
      icon: '🤔',
      systemPrompt: '你是课堂助教，采用苏格拉底式教学法。不要直接给答案，用提问引导学生自己推导。每次回复不超过 80 字，结尾用一个问题。',
      ttsRole: '助教'
    },
    '学霸同学': {
      icon: '🎓',
      systemPrompt: '你是提前预习的尖子生。你会：1) 延伸提问 2) 补充有趣的冷知识 3) 提出老师没讲到的角度。语气自信但谦逊，每次回复不超过 60 字。',
      ttsRole: '学霸同学'
    },
    '困惑同学': {
      icon: '❓',
      systemPrompt: '你是基础薄弱的学生。你会问基础但关键的问题，让老师重新讲解难点。语气真诚困惑，每次回复不超过 50 字，必须以问号结尾。',
      ttsRole: '困惑同学'
    },
    '应用同学': {
      icon: '💡',
      systemPrompt: '你是喜欢联系实际的学生。你会问"这个在生活里有什么用？"或"这个能解释什么现象？"。每次回复不超过 60 字。',
      ttsRole: '应用同学'
    }
  };

  // ====== 苏格拉底提示等级（T1-9） ======

  var SOCRATIC_LEVELS = {
    1: { name: '提问引导', desc: '只提问，不给任何提示', instruction: '请只用一个反问句引导学生思考，不提供任何答案线索。' },
    2: { name: '给提示', desc: '给一个关键提示', instruction: '请给一个关键提示（不直接给答案），帮助学生继续推导。' },
    3: { name: '部分答案', desc: '给出推导的前半部分', instruction: '请给出推导的前半部分，留后半部分让学生完成。' },
    4: { name: '完整答案', desc: '直接给完整答案', instruction: '请直接给出完整答案和解释。' }
  };

  // ====== 讨论流程 ======

  /**
   * 课堂讨论 scene 生成器
   * @param {Object} opts - { topic, question, roles, onMessage, onComplete }
   *   onMessage: function(role, text) 每条消息回调
   *   onComplete: function() 讨论结束回调
   */
  function runDiscussion(opts) {
    opts = opts || {};
    var topic = opts.topic || '';
    var question = opts.question || '';
    var roles = opts.roles || ['困惑同学', '学霸同学', '应用同学'];
    var onMessage = opts.onMessage || function () {};
    var onComplete = opts.onComplete || function () {};

    var history = [
      {
        role: 'system',
        content: '这是一节关于「' + topic + '」的生物课的讨论环节。讨论问题：' + question
          + '\n参与角色：主讲老师、' + roles.join('、')
          + '\n讨论流程：困惑同学提问 → 主讲老师回应 → 学霸同学延伸 → 应用同学联系实际 → 主讲老师总结'
          + '\n每个角色回复不超过 80 字，保持对话自然流畅。'
      }
    ];

    // 5 轮对话
    var turns = [
      { role: '困惑同学', prompt: '请针对「' + question + '」提出一个基础但关键的问题。' },
      { role: '主讲老师', prompt: '困惑同学刚问了一个问题，请简短回应（50 字内），引导大家思考。' },
      { role: '学霸同学', prompt: '请基于老师刚才的回应，提出一个延伸问题或补充冷知识。' },
      { role: '应用同学', prompt: '请把刚才的内容联系到一个生活实际现象。' },
      { role: '主讲老师', prompt: '请用一句话总结这次讨论的核心要点。' }
    ];

    var i = 0;
    function nextTurn() {
      if (i >= turns.length) { onComplete(); return; }
      var turn = turns[i++];
      var persona = ROLE_PERSONAS[turn.role];
      if (!persona) { nextTurn(); return; }

      var messages = history.concat([
        { role: 'system', content: persona.systemPrompt },
        { role: 'user', content: turn.prompt }
      ]);

      AiClient.callByStage('teacher_script', messages, {
        onChunk: function (chunk) {
          // 流式可选，这里不实时渲染
        },
        onDone: function (fullText) {
          if (!fullText) { nextTurn(); return; }
          history.push({ role: 'assistant', content: fullText });
          onMessage(turn.role, fullText);
          // 串行下一轮（间隔 800ms 让用户读完）
          setTimeout(nextTurn, 800);
        },
        onError: function (err) {
          console.warn('[MultiAgent] ' + turn.role + ' 回复失败，跳过:', err.message);
          nextTurn();
        }
      });
    }
    nextTurn();
  }

  // ====== 苏格拉底助教（T1-9） ======

  /**
   * 苏格拉底式引导
   * @param {Object} opts - { question, level(1-4), history, onDone, onError }
   */
  function socraticGuide(opts) {
    opts = opts || {};
    var level = opts.level || 1;
    var levelCfg = SOCRATIC_LEVELS[level] || SOCRATIC_LEVELS[1];
    var messages = (opts.history || []).slice();
    messages.push({
      role: 'system',
      content: '你是苏格拉底式生物助教。' + levelCfg.instruction + ' 每次回复不超过 100 字。'
    });
    messages.push({ role: 'user', content: opts.question });

    return AiClient.callByStage('socratic_guide', messages, {
      onChunk: opts.onChunk,
      onDone: opts.onDone,
      onError: opts.onError
    });
  }

  // ====== 暴露 API ======
  window.MultiAgentDiscussion = {
    runDiscussion: runDiscussion,
    socraticGuide: socraticGuide,
    ROLE_PERSONAS: ROLE_PERSONAS,
    SOCRATIC_LEVELS: SOCRATIC_LEVELS
  };

})();
