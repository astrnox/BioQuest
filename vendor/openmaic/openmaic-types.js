/**
 * OpenMAIC 类型定义 — JSDoc port of lib/types/chat.ts + lib/types/action.ts
 *
 * 不包含实际代码逻辑，仅作为 JSDoc 类型参考与运行时守卫工具。
 * 引入到 IDE 即可获得悬停提示与基础类型校验。
 *
 * @see lib/types/chat.ts
 * @see lib/types/action.ts
 */

// ───────────────────  会话类型  ───────────────────
// SessionType = 'qa' | 'discussion' | 'lecture'
// SessionStatus = 'idle' | 'active' | 'interrupted' | 'completed'

// ───────────────────  消息元数据  ───────────────────
/**
 * @typedef {object} ChatMessageMetadata
 * @property {string} [senderName]
 * @property {string} [senderAvatar]
 * @property {'teacher'|'agent'|'user'} [originalRole]
 * @property {MessageAction[]} [actions]
 * @property {string} [agentId]
 * @property {string} [agentColor]
 * @property {number} [createdAt]
 * @property {boolean} [interrupted]
 */

// ───────────────────  Action（来自 lib/types/action.ts）───────────────────
/**
 * @typedef {'spotlight'|'laser'|'speech'|'play_video'|'wb_open'|'wb_close'|'wb_clear'|'wb_delete'|'wb_draw_text'|'wb_draw_shape'|'wb_draw_chart'|'wb_draw_latex'|'wb_draw_table'|'wb_draw_line'|'wb_draw_code'|'wb_edit_code'|'discussion'} ActionName
 */

/**
 * @typedef {object} Action
 * @property {ActionName} type
 * @property {string} [actionId]
 * @property {string} [agentId]
 * @property {string} [messageId]
 * @property {Record<string, any>} [params]
 * @property {number} [ts]
 */

// ───────────────────  DirectorState（无状态 loop 状态）───────────────────
/**
 * @typedef {object} AgentTurnSummary
 * @property {string} agentId
 * @property {string} [summary]
 * @property {string[]} [actions]
 */

/**
 * @typedef {object} WhiteboardActionRecord
 * @property {string} actionId
 * @property {string} actionName
 * @property {string} [sceneId]
 * @property {number} [ts]
 */

/**
 * @typedef {object} DirectorState
 * @property {number} turnCount
 * @property {AgentTurnSummary[]} agentResponses
 * @property {WhiteboardActionRecord[]} whiteboardLedger
 */

// ───────────────────  课程笔记（Notes）───────────────────
/**
 * @typedef {object} LectureNoteItem
 * @property {'speech'|'action'} kind
 * @property {string} [text]     // speech 时
 * @property {string} [type]     // action 时
 * @property {string} [label]    // action 时
 */

/**
 * @typedef {object} LectureNoteEntry
 * @property {string} sceneId
 * @property {string} sceneTitle
 * @property {number} sceneOrder
 * @property {LectureNoteItem[]} items
 * @property {number} completedAt
 */

// ───────────────────  工具调用（tool call）───────────────────
/**
 * @typedef {object} ToolCallRequest
 * @property {string} toolCallId
 * @property {string} toolName
 * @property {Record<string, any>} args
 * @property {string} agentId
 * @property {'pending'|'executing'} status
 * @property {number} requestedAt
 */

/**
 * @typedef {object} ToolCallRecord
 * @property {string} toolCallId
 * @property {string} toolName
 * @property {Record<string, any>} args
 * @property {string} agentId
 * @property {*} [result]
 * @property {string} [error]
 * @property {'pending'|'executing'|'completed'|'failed'} status
 * @property {number} requestedAt
 * @property {number} [completedAt]
 */

// ───────────────────  运行时守卫 / 工具函数  ───────────────────

/** 是否属于 fire-and-forget 行为（spotlight / laser） */
function isFireAndForget(type) {
  return type === 'spotlight' || type === 'laser';
}

/** 是否属于 slide-only 行为（仅在 slide 中出现，不在 chat 流） */
function isSlideOnly(type) {
  // 原 repo 中无明确常量；保守起见把 wb_* 一律视为 slide
  return typeof type === 'string' && type.startsWith('wb_');
}

/** 是否属于同步行为（执行完成才算 action 结束） */
function isSync(type) {
  return type === 'speech' || type === 'play_video' || type === 'discussion' || isSlideOnly(type);
}

/** 过滤出 slide-only 行为 */
function filterSlideOnly(actions) {
  return (actions || []).filter(a => isSlideOnly(a.type));
}

/** 按白名单过滤 */
function filterByAllowed(actions, allowed) {
  if (!allowed || !allowed.length) return actions || [];
  const set = new Set(allowed);
  return (actions || []).filter(a => set.has(a.type));
}

// ───────────────────  导出  ───────────────────
(function (global) {
  'use strict';
  const OpenMAICTypes = {
    isFireAndForget,
    isSlideOnly,
    isSync,
    filterSlideOnly,
    filterByAllowed,
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = OpenMAICTypes;
  } else {
    global.OpenMAICTypes = OpenMAICTypes;
  }
})(typeof window !== 'undefined' ? window : globalThis);
