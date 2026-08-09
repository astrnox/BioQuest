/**
 * ============================================================
 * OpenMAIC Action Parser — 解析 LLM 结构化输出为 Action[]（移植自 lib/generation/action-parser.ts）
 * ------------------------------------------------------------
 * 原版依赖 partial-json + jsonrepair + nanoid（npm 包），本文件用
 * 纯 JS 重写核心解析逻辑，复用 openmaic-json-repair.js。
 *
 * 支持输入格式：
 *   1. 新格式：[{type:'text',content:'speech'}, {type:'action',name:'spotlight',params:{...}}]
 *   2. 老格式：[{type:'text',content:'speech'}, {type:'action',tool_name:'spotlight',parameters:{...}}]
 *
 * 用法：
 *   var acts = OpenMAICActionParser.parseFromOutput(llmText, sceneType, allowedActions);
 * ============================================================
 */
(function (global) {
  'use strict';

  var Actions = global.OpenMAICActions;
  var JsonRepair = global.OpenMAICJsonRepair;
  var Element = global.OpenMAICElement;

  // 去除 markdown 代码围栏
  function _stripFences(text) {
    return text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');
  }

  // 提取 JSON 数组的起止位置
  function _extractArrayBounds(text) {
    var start = text.indexOf('[');
    var end = text.lastIndexOf(']');
    if (start === -1) return null;
    if (end > start) return text.slice(start, end + 1);
    // 未闭合 → 让后续 JSON repair 处理
    return text.slice(start);
  }

  // 解析 JSON 数组（多重容错）
  function _parseArray(str) {
    // 尝试 1: 直接 parse
    try { var d = JSON.parse(str); return Array.isArray(d) ? d : null; } catch (e0) {}
    // 尝试 2: JsonRepair
    try { var d2 = JsonRepair.tryParseJson(str); return Array.isArray(d2) ? d2 : null; } catch (e1) {}
    return null;
  }

  /**
   * 把 LLM 输出解析为有序 Action[]。
   * @param {string} response - LLM 原始输出
   * @param {string} [sceneType] - 场景类型，slide 之外会过滤 spotlight/laser
   * @param {string[]} [allowedActions] - 允许的 action 白名单
   * @returns {Array} 解析后的 Action 列表
   */
  function parseFromOutput(response, sceneType, allowedActions) {
    if (typeof response !== 'string' || !response.trim()) return [];
    var cleaned = _stripFences(response.trim());
    var jsonStr = _extractArrayBounds(cleaned);
    if (!jsonStr) return [];

    var items = _parseArray(jsonStr);
    if (!items) return [];

    var actions = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it || typeof it !== 'object' || !it.type) continue;

      if (it.type === 'text') {
        var text = (it.content || '').toString().trim();
        if (text) actions.push(Actions.make('speech', { text: text }));
      } else if (it.type === 'action') {
        var name = it.name || it.tool_name;
        if (!name) continue;
        var params = it.params || it.parameters || {};
        // 支持 action_id / tool_id 自定义 ID
        if (it.action_id || it.tool_id) params.id = it.action_id || it.tool_id;
        try {
          var act = Actions.make(name, params);
          if (Actions.isValidAction(act)) actions.push(act);
        } catch (e) { /* skip invalid */ }
      }
    }

    // 后处理 1: discussion 必须为最后一个 action
    var discIdx = -1;
    for (var j = 0; j < actions.length; j++) {
      if (actions[j].type === 'discussion') { discIdx = j; break; }
    }
    if (discIdx !== -1 && discIdx < actions.length - 1) {
      actions = actions.slice(0, discIdx + 1);
    }

    // 后处理 2: 过滤非 slide 场景的 spotlight/laser
    actions = Actions.filterSlideOnly(actions, sceneType);

    // 后处理 3: 白名单过滤
    actions = Actions.filterByAllowed(actions, allowedActions);

    return actions;
  }

  /**
   * 从纯文本（如 tts 段落）抽取并转换为 speech action 列表。
   * 按句子边界分割（兼容中英文标点）。
   */
  function splitTextToSpeech(text, idPrefix) {
    if (typeof text !== 'string' || !text.trim()) return [];
    var parts = text.split(/(?<=[.!?。！？\n])\s*/);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var t = parts[i].trim();
      if (t) out.push(Actions.make('speech', { text: t }));
    }
    return out.length ? out : [Actions.make('speech', { text: text })];
  }

  global.OpenMAICActionParser = {
    parseFromOutput: parseFromOutput,
    splitTextToSpeech: splitTextToSpeech,
  };
})(typeof window !== 'undefined' ? window : globalThis);
