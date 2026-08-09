/**
 * ============================================================
 * OpenMAIC JSON Repair — LLM 输出 JSON 容错解析（移植自 lib/generation/json-repair.ts）
 * ------------------------------------------------------------
 * 原版依赖 jsonrepair（npm 包），本文件将核心修复逻辑重写为纯 JS。
 *
 * 用法：
 *   var data = OpenMAICJsonRepair.parseJsonResponse(llmOutput);
 *   var data = OpenMAICJsonRepair.tryParseJson(jsonStr);
 * ============================================================
 */
(function (global) {
  'use strict';

  // ============== 主入口 ==============
  function parseJsonResponse(response) {
    if (typeof response !== 'string') return null;

    // 策略 1: markdown 代码块中的 JSON
    var codeBlockRe = /```(?:json)?\s*([\s\S]*?)```/g;
    var match;
    while ((match = codeBlockRe.exec(response)) !== null) {
      var extracted = match[1].trim();
      if (extracted.charAt(0) === '{' || extracted.charAt(0) === '[') {
        var r = tryParseJson(extracted);
        if (r !== null) return r;
      }
    }

    // 策略 2: 直接在文本中找 JSON 结构
    var jsonStartArray = response.indexOf('[');
    var jsonStartObject = response.indexOf('{');

    if (jsonStartArray !== -1 || jsonStartObject !== -1) {
      var startIndex;
      if (jsonStartArray === -1) startIndex = jsonStartObject;
      else if (jsonStartObject === -1) startIndex = jsonStartArray;
      else startIndex = Math.min(jsonStartArray, jsonStartObject);

      // 括号匹配（考虑字符串和转义）
      var depth = 0;
      var endIndex = -1;
      var inString = false;
      var escapeNext = false;
      for (var i = startIndex; i < response.length; i++) {
        var ch = response.charAt(i);
        if (escapeNext) { escapeNext = false; continue; }
        if (ch === '\\' && inString) { escapeNext = true; continue; }
        if (ch === '"' && !escapeNext) { inString = !inString; continue; }
        if (!inString) {
          if (ch === '[' || ch === '{') depth++;
          else if (ch === ']' || ch === '}') {
            depth--;
            if (depth === 0) { endIndex = i; break; }
          }
        }
      }
      if (endIndex !== -1) {
        var jsonStr = response.substring(startIndex, endIndex + 1);
        var r2 = tryParseJson(jsonStr);
        if (r2 !== null) return r2;
      }
    }

    // 策略 3: 整段文本
    return tryParseJson(response.trim());
  }

  // ============== 多次尝试 ==============
  function tryParseJson(jsonStr) {
    if (typeof jsonStr !== 'string') return null;

    // 尝试 1: 直接 parse
    try { return JSON.parse(jsonStr); } catch (e0) { /* fallthrough */ }

    // 尝试 2: 修复 LaTeX/控制字符问题
    try {
      var fixed = jsonStr;

      // 修复 1: 字符串内 LaTeX 命令（\frac、\left 等）需要双反斜杠
      fixed = fixed.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, function (_m, content) {
        var fixedContent = content.replace(/\\([a-zA-Z])/g, function (_m2, ch) {
          if ('bfnrtu'.indexOf(ch) !== -1) return '\\' + ch; // 合法 JSON 转义保留
          return '\\\\' + ch; // LaTeX 命令双转义
        });
        return '"' + fixedContent + '"';
      });

      // 修复 2: 其他非法转义（\S、\L 等）
      fixed = fixed.replace(/\\([^"\\\/bfnrtu\n\r])/g, function (match, ch) {
        if (/[a-zA-Z]/.test(ch)) return '\\\\' + ch;
        return match;
      });

      // 修复 3: 截断的 JSON
      var trimmed = fixed.trim();
      if (trimmed.charAt(0) === '[' && trimmed.charAt(trimmed.length - 1) !== ']') {
        var last = fixed.lastIndexOf('}');
        if (last > 0) {
          fixed = fixed.substring(0, last + 1) + ']';
        }
      } else if (trimmed.charAt(0) === '{' && trimmed.charAt(trimmed.length - 1) !== '}') {
        var opens = (fixed.match(/\{/g) || []).length;
        var closes = (fixed.match(/\}/g) || []).length;
        if (opens > closes) fixed += '}'.repeat(opens - closes);
      }

      return JSON.parse(fixed);
    } catch (e1) { /* fallthrough */ }

    // 尝试 3: 自实现轻量 jsonrepair（处理未转义中文引号等）
    try {
      var repaired = _lightJsonRepair(jsonStr);
      return JSON.parse(repaired);
    } catch (e2) { /* fallthrough */ }

    // 尝试 4: 移除控制字符
    try {
      var cleaned = jsonStr.replace(/[\x00-\x1F\x7F]/g, function (ch) {
        if (ch === '\n') return '\\n';
        if (ch === '\r') return '\\r';
        if (ch === '\t') return '\\t';
        return '';
      });
      return JSON.parse(cleaned);
    } catch (e3) { /* fallthrough */ }

    return null;
  }

  // ============== 轻量 JSON 修复 ==============
  // 处理常见 AI 输出问题：
  //   1. 字符串内出现裸中文/英文引号未转义
  //   2. 字符串未闭合
  //   3. 数组/对象末尾多余逗号
  function _lightJsonRepair(str) {
    var out = '';
    var inStr = false;
    var escape = false;
    for (var i = 0; i < str.length; i++) {
      var c = str.charAt(i);
      if (escape) { out += c; escape = false; continue; }
      if (c === '\\') { out += c; escape = true; continue; }
      if (c === '"') {
        // 判断是字符串闭合还是裸引号
        // 向前看：下一个非空白字符若是 , } ] :，则是字符串闭合
        var next = '';
        for (var j = i + 1; j < str.length; j++) {
          var cj = str.charAt(j);
          if (/\s/.test(cj)) continue;
          next = cj;
          break;
        }
        if (inStr) {
          if (next === ',' || next === '}' || next === ']' || next === ':' || next === '') {
            out += c;
            inStr = false;
          } else {
            // 字符串内出现裸引号，转义
            out += '\\"';
          }
        } else {
          out += c;
          inStr = true;
        }
        continue;
      }
      out += c;
    }
    // 移除对象/数组末尾多余逗号
    out = out.replace(/,(\s*[}\]])/g, '$1');
    return out;
  }

  global.OpenMAICJsonRepair = {
    parseJsonResponse: parseJsonResponse,
    tryParseJson: tryParseJson,
  };
})(typeof window !== 'undefined' ? window : globalThis);
