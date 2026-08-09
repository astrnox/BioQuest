/**
 * OpenMAIC 常量 — pure-JS port of lib/constants/agent-defaults.ts
 *
 * Agent 配色盘与默认头像路径。
 * 与原仓库保持一致；纯前端可复用。
 */

(function (global) {
  'use strict';

  /** 12 色循环调色板 */
  const AGENT_COLOR_PALETTE = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#8b5cf6', // violet
    '#f97316', // orange
    '#14b8a6', // teal
    '#e11d48', // rose
    '#6366f1', // indigo
    '#84cc16', // lime
    '#a855f7', // purple
  ];

  /** 10 个默认头像路径（每个必须对应 public/avatars/ 下实际存在的文件） */
  const AGENT_DEFAULT_AVATARS = [
    '/avatars/teacher.png',
    '/avatars/assist.png',
    '/avatars/curious.png',
    '/avatars/thinker.png',
    '/avatars/note-taker.png',
    '/avatars/teacher-2.png',
    '/avatars/assist-2.png',
    '/avatars/curious-2.png',
    '/avatars/thinker-2.png',
    '/avatars/note-taker-2.png',
  ];

  /**
   * 给定 index，从调色板循环取一个颜色。
   * @param {number} index
   * @returns {string}
   */
  function pickColor(index) {
    if (!Number.isFinite(index)) return AGENT_COLOR_PALETTE[0];
    const i = ((index % AGENT_COLOR_PALETTE.length) + AGENT_COLOR_PALETTE.length) % AGENT_COLOR_PALETTE.length;
    return AGENT_COLOR_PALETTE[i];
  }

  /**
   * 给定 index，从默认头像列表循环取一个。
   * @param {number} index
   * @returns {string}
   */
  function pickAvatar(index) {
    if (!Number.isFinite(index)) return AGENT_DEFAULT_AVATARS[0];
    const i = ((index % AGENT_DEFAULT_AVATARS.length) + AGENT_DEFAULT_AVATARS.length) % AGENT_DEFAULT_AVATARS.length;
    return AGENT_DEFAULT_AVATARS[i];
  }

  const OpenMAICConstants = {
    AGENT_COLOR_PALETTE,
    AGENT_DEFAULT_AVATARS,
    pickColor,
    pickAvatar,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = OpenMAICConstants;
  } else {
    global.OpenMAICConstants = OpenMAICConstants;
  }
})(typeof window !== 'undefined' ? window : globalThis);
