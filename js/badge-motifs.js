/**
 * ============================================================
 * BioQuest - 手绘风格成就徽章 SVG 库（单一数据源）
 * 设计原则：
 *   1. 手绘感：圆头笔触 + 微不规则曲线 + 轮廓"重影"描边（sketch echo）
 *   2. 小尺寸可辨识：48x48 viewBox，主体占 60% 以上，细节 <= 3 层
 *   3. 贴切含义：每个成就 key 映射到专属主题（火焰=连续打卡、奖章=分数…）
 * 使用：window.renderBadgeSvg(key, { size, earned, color })
 * ============================================================
 */
(function (root) {
  'use strict';

  /* ---------- 手绘主题（inner SVG，坐标均在 48x48 内） ---------- */
  /* 每个主题函数接收描边色 c，返回 SVG 片段。主线宽 2.2，圆头。 */

  var MOTIFS = {
    /* 火焰 —— 连续打卡/坚持 */
    flame: function (c) {
      return '<path d="M24 7 C26 13 31 16 32 22 C33 28 29 33 24 33 C18 33 15 28 16 22 C17 18 20 16 21 12 C21.5 10.5 22 8.5 24 7 Z" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M24 33 C18 33 15 28 16 22" fill="none" stroke="' + c + '" stroke-width="1.2" stroke-linecap="round" opacity="0.35" transform="translate(0.8,0.6)"/>' +
        '<path d="M24 19 C25.5 22 27 23.5 26.5 26.5 C26 29 23.5 29.5 22.5 28 C21.5 26.5 22.8 24.5 23.2 22.5 C23.4 21.3 23.6 20 24 19 Z" fill="' + c + '" opacity="0.85"/>';
    },
    /* 奖章 —— 分数成就 */
    medal: function (c) {
      return '<circle cx="24" cy="18" r="9.5" fill="none" stroke="' + c + '" stroke-width="2.2"/>' +
        '<circle cx="24" cy="18" r="9.5" fill="none" stroke="' + c + '" stroke-width="1.1" opacity="0.35" transform="translate(0.7,0.7)"/>' +
        '<path d="M24 13 L25.4 16.2 L29 16.6 L26.4 19 L27.3 22.6 L24 20.8 L20.7 22.6 L21.6 19 L19 16.6 L22.6 16.2 Z" fill="' + c + '"/>' +
        '<path d="M19.5 26.5 L16 37 L21 34.5 M28.5 26.5 L32 37 L27 34.5" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
    },
    /* 书堆 —— 刷题数量 */
    books: function (c) {
      return '<path d="M10 32 C10 30.8 11 30 12.5 30 L36 30 C37.5 30 38 31 38 32 C38 33 37.5 34 36 34 L12.5 34 C11 34 10 33.2 10 32 Z" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linejoin="round"/>' +
        '<path d="M12 24 C12 22.8 13 22 14.5 22 L34 22 C35.5 22 36 23 36 24 C36 25 35.5 26 34 26 L14.5 26 C13 26 12 25.2 12 24 Z" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linejoin="round"/>' +
        '<path d="M14 16 C14 14.8 15 14 16.5 14 L32 14 C33.5 14 34 15 34 16 C34 17 33.5 18 32 18 L16.5 18 C15 18 14 17.2 14 16 Z" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linejoin="round"/>' +
        '<path d="M20 14 L20 18 M26 22 L26 26" stroke="' + c + '" stroke-width="1.4" stroke-linecap="round" opacity="0.6"/>';
    },
    /* 靶心 —— 正确率 */
    target: function (c) {
      return '<circle cx="22" cy="24" r="13" fill="none" stroke="' + c + '" stroke-width="2.2"/>' +
        '<circle cx="22" cy="24" r="13" fill="none" stroke="' + c + '" stroke-width="1.1" opacity="0.35" transform="translate(0.7,-0.6)"/>' +
        '<circle cx="22" cy="24" r="7.5" fill="none" stroke="' + c + '" stroke-width="1.8"/>' +
        '<circle cx="22" cy="24" r="2.4" fill="' + c + '"/>' +
        '<path d="M30 16 L38 8 M38 8 L33.5 8 M38 8 L38 12.5" fill="none" stroke="' + c + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    },
    /* 对话框 —— 社区发帖 */
    bubble: function (c) {
      return '<path d="M10 14 C10 11.8 11.8 10 14 10 L34 10 C36.2 10 38 11.8 38 14 L38 25 C38 27.2 36.2 29 34 29 L22 29 L15 36 C14.4 36.6 13.5 36.2 13.5 35.4 L13.8 29.6 C11.7 29.2 10 27.4 10 25 Z" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M16 17 L32 17 M16 22.5 L28 22.5" stroke="' + c + '" stroke-width="2" stroke-linecap="round" opacity="0.75"/>';
    },
    /* 学士帽 —— 模拟考试 */
    cap: function (c) {
      return '<path d="M24 10 L42 17.5 L24 25 L6 17.5 Z" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linejoin="round"/>' +
        '<path d="M24 10 L42 17.5 L24 25" fill="none" stroke="' + c + '" stroke-width="1.1" opacity="0.35" transform="translate(0.6,0.7)"/>' +
        '<path d="M14 21.5 L14 29 C14 31.5 18.5 33.5 24 33.5 C29.5 33.5 34 31.5 34 29 L34 21.5" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linecap="round"/>' +
        '<path d="M38 21 L38 31 M38 31 C38 31 36.5 32.5 38 34.5 C39.5 32.5 38 31 38 31" fill="none" stroke="' + c + '" stroke-width="2" stroke-linecap="round"/>';
    },
    /* 铅笔 —— 第一次做题 */
    pencil: function (c) {
      return '<path d="M30.5 9.5 L38.5 17.5 L20 36 L10.5 38.5 L13 29 Z" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M27.5 12.5 L35.5 20.5" stroke="' + c + '" stroke-width="1.8" stroke-linecap="round"/>' +
        '<path d="M13 29 L20 36" stroke="' + c + '" stroke-width="1.4" stroke-linecap="round" opacity="0.6"/>' +
        '<path d="M10.5 38.5 L14.5 37.8" stroke="' + c + '" stroke-width="2.2" stroke-linecap="round"/>';
    },
    /* 信封+对勾 —— 邮箱验证 */
    envelope: function (c) {
      return '<rect x="9" y="13" width="30" height="22" rx="3" fill="none" stroke="' + c + '" stroke-width="2.2"/>' +
        '<path d="M10.5 15.5 L24 26 L37.5 15.5" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M28 31 L31.5 34.5 L38 27" fill="none" stroke="#5a7d5c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
    },
    /* 地球笑脸 —— 你好世界（首次登录） */
    globe: function (c) {
      return '<circle cx="24" cy="23" r="14" fill="none" stroke="' + c + '" stroke-width="2.2"/>' +
        '<circle cx="24" cy="23" r="14" fill="none" stroke="' + c + '" stroke-width="1.1" opacity="0.35" transform="translate(0.7,0.7)"/>' +
        '<path d="M10.5 20 C15 22.5 33 22.5 37.5 20 M10.5 27 C15 24.5 33 24.5 37.5 27" fill="none" stroke="' + c + '" stroke-width="1.6" stroke-linecap="round" opacity="0.8"/>' +
        '<path d="M24 9 C20 14 20 32 24 37 M24 9 C28 14 28 32 24 37" fill="none" stroke="' + c + '" stroke-width="1.6" stroke-linecap="round" opacity="0.8"/>';
    },
    /* 清单对勾 —— 单日全勤 */
    checklist: function (c) {
      return '<rect x="12" y="8" width="24" height="32" rx="3.5" fill="none" stroke="' + c + '" stroke-width="2.2"/>' +
        '<path d="M18 16 L27 16 M18 22 L27 22" stroke="' + c + '" stroke-width="2" stroke-linecap="round" opacity="0.7"/>' +
        '<path d="M17 30.5 L21.5 35 L31 24.5" fill="none" stroke="' + c + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
    },
    /* 山顶旗帜 —— 累计打卡/目标达成 */
    flag: function (c) {
      return '<path d="M8 38 L19 18 C20 15.5 22.5 15.5 24 18 L31 30 L34 25.5 C35 24 36.5 24 37.5 25.5 L42 38 Z" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linejoin="round"/>' +
        '<path d="M21.5 16.5 L21.5 6.5 M21.5 6.5 L31 9 L21.5 12" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
    },
    /* 日出飞鸟 —— 早起鸟 */
    sunrise: function (c) {
      return '<path d="M10 32 C10 24 16.5 18 24 18 C31.5 18 38 24 38 32" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linecap="round"/>' +
        '<path d="M6 32 L42 32" stroke="' + c + '" stroke-width="2.2" stroke-linecap="round"/>' +
        '<path d="M24 12 L24 15.5 M13 15 L14.8 17.8 M35 15 L33.2 17.8" stroke="' + c + '" stroke-width="2" stroke-linecap="round"/>' +
        '<path d="M15 9 C16.5 7 18.5 7 20 9 M27 7 C28.5 5 30.5 5 32 7" fill="none" stroke="' + c + '" stroke-width="1.8" stroke-linecap="round"/>';
    },
    /* 弯月 —— 夜猫子 */
    moon: function (c) {
      return '<path d="M29.5 8.5 C23 10 18.5 15.5 18.5 22.5 C18.5 29.5 23.5 35 30.5 36.5 C22 36.8 13.5 30.5 13.5 22 C13.5 13.5 21 6.8 29.5 8.5 Z" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linejoin="round"/>' +
        '<path d="M33 12 L34 15 L37 15.5 L34.6 17.4 L35.4 20.5 L33 18.8 L30.6 20.5 L31.4 17.4 L29 15.5 L32 15 Z" fill="' + c + '" opacity="0.9"/>' +
        '<circle cx="36.5" cy="26" r="1.3" fill="' + c + '" opacity="0.7"/>';
    },
    /* 星星闪耀 —— 满分/完美 */
    sparkle: function (c) {
      return '<path d="M24 8 L27.2 18.8 L38 19.5 L29.6 26.2 L32.4 37 L24 30.8 L15.6 37 L18.4 26.2 L10 19.5 L20.8 18.8 Z" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M24 30.8 L15.6 37 L18.4 26.2" fill="none" stroke="' + c + '" stroke-width="1.1" opacity="0.35" transform="translate(0.7,0.6)"/>' +
        '<path d="M38.5 8 L38.5 13 M36 10.5 L41 10.5 M9.5 33 L9.5 38 M7 35.5 L12 35.5" stroke="' + c + '" stroke-width="1.8" stroke-linecap="round"/>';
    },
    /* 奖杯 —— 通用高阶成就 */
    trophy: function (c) {
      return '<path d="M16 9 L32 9 L32 19 C32 24.5 28.5 28 24 28 C19.5 28 16 24.5 16 19 Z" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linejoin="round"/>' +
        '<path d="M16 12 L11 12 C9.5 12 8.5 13.5 9.5 15.5 C10.5 17.5 13 18.5 16 18 M32 12 L37 12 C38.5 12 39.5 13.5 38.5 15.5 C37.5 17.5 35 18.5 32 18" fill="none" stroke="' + c + '" stroke-width="2" stroke-linecap="round"/>' +
        '<path d="M24 28 L24 33 M18 37.5 L30 37.5 M20.5 33 L27.5 33 L29 37.5 L19 37.5" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
    }
  };

  /* ---------- 成就 key → { motif, label } 映射（含义贴切性人工核对） ---------- */
  var KEY_MAP = {
    /* 新手村 */
    first_login:     { motif: 'globe',    label: '' },     // 你好世界 → 地球
    first_practice:  { motif: 'pencil',   label: '' },     // 第一题 → 铅笔
    email_verified:  { motif: 'envelope', label: '' },     // 邮箱验证 → 信封对勾
    /* 熬夜修仙（连续打卡 → 火焰家族，数字区分段位） */
    streak_3:        { motif: 'flame',    label: '3' },
    streak_7:        { motif: 'flame',    label: '7' },
    streak_14:       { motif: 'flame',    label: '14' },
    streak_30:       { motif: 'flame',    label: '30' },
    streak_60:       { motif: 'flame',    label: '60' },
    streak_100:      { motif: 'flame',    label: '100' },
    streak_365:      { motif: 'flame',    label: '365' },
    /* 分数玄学（分数 → 奖章家族） */
    score_60:        { motif: 'medal',    label: '60' },
    score_70:        { motif: 'medal',    label: '70' },
    score_80:        { motif: 'medal',    label: '80' },
    score_90:        { motif: 'medal',    label: '90' },
    score_100:       { motif: 'medal',    label: '100' },
    /* 刷题机器（数量 → 书堆家族） */
    questions_50:    { motif: 'books',    label: '50' },
    questions_100:   { motif: 'books',    label: '100' },
    questions_300:   { motif: 'books',    label: '300' },
    questions_500:   { motif: 'books',    label: '500' },
    questions_1000:  { motif: 'books',    label: '1K' },
    questions_2000:  { motif: 'books',    label: '2K' },
    questions_5000:  { motif: 'books',    label: '5K' },
    /* 神射手（正确率 → 靶心家族） */
    accuracy_60:     { motif: 'target',   label: '60' },
    accuracy_70:     { motif: 'target',   label: '70' },
    accuracy_80:     { motif: 'target',   label: '80' },
    accuracy_90:     { motif: 'target',   label: '90' },
    accuracy_95:     { motif: 'target',   label: '95' },
    /* 社交牛逼症（发帖 → 对话框家族） */
    community_first: { motif: 'bubble',   label: '1' },
    community_5:     { motif: 'bubble',   label: '5' },
    community_10:    { motif: 'bubble',   label: '10' },
    community_50:    { motif: 'bubble',   label: '50' },
    community_100:   { motif: 'bubble',   label: '100' },
    /* 考场战神（模考 → 学士帽；满分 → 星星闪耀） */
    exam_first:      { motif: 'cap',      label: '1' },
    exam_5:          { motif: 'cap',      label: '5' },
    exam_10:         { motif: 'cap',      label: '10' },
    exam_perfect:    { motif: 'sparkle',  label: '' },
    /* 习惯系统专属 */
    habit_all_done:  { motif: 'checklist', label: '' },    // 全勤标兵 → 清单对勾
    habit_total_100: { motif: 'flag',      label: '100' }, // 百日筑基 → 山顶旗帜
    habit_total_500: { motif: 'flag',      label: '500' }, // 勤学不倦 → 山顶旗帜
    early_bird:      { motif: 'sunrise',   label: '' },    // 早起鸟 → 日出飞鸟
    night_owl:       { motif: 'moon',      label: '' },    // 夜猫子 → 弯月
    goal_master:     { motif: 'trophy',    label: '10' }   // 目标达人 → 奖杯
  };

  /* habits.js 旧徽章 id 兼容映射 */
  var LEGACY_ID_MAP = {
    'badge-streak3': 'streak_3',
    'badge-streak7': 'streak_7',
    'badge-streak30': 'streak_30',
    'badge-streak100': 'streak_100',
    'badge-alldone': 'habit_all_done',
    'badge-total100': 'habit_total_100',
    'badge-total500': 'habit_total_500',
    'badge-earlybird': 'early_bird',
    'badge-nightowl': 'night_owl',
    'badge-goal': 'goal_master'
  };

  var EARNED_COLOR = '#8a6a4a';     // 手绘棕（与站点 clay 色系一致）
  var UNEARNED_COLOR = '#9a948a';   // 未解锁灰

  /**
   * 渲染手绘徽章 SVG
   * @param {string} key - 成就 key（支持 habits 旧 badge-xxx id）
   * @param {object} [opts] - { size=44, earned=true, color, label }
   * @returns {string} SVG 字符串
   */
  /* 输入消毒：key/label 允许字符白名单化，color 限 CSS 颜色字符集，size 限数值范围。
     当前调用方均为内部常量，本消毒为防御 window 公共面被第三方脚本滥用注入。 */
  function _sanKey(k) { return String(k == null ? '' : k).replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 40); }
  function _sanLabel(l) {
    return String(l == null ? '' : l).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').slice(0, 8);
  }
  function _sanColor(c) {
    c = String(c == null ? '' : c);
    return /^[#a-zA-Z0-9(),.\s%\-]{1,40}$/.test(c) ? c : '#8a6a4a';
  }
  function _sanSize(s) {
    var n = parseInt(s, 10);
    if (isNaN(n)) return 44;
    return Math.max(8, Math.min(256, n));
  }

  function renderBadgeSvg(key, opts) {
    opts = opts || {};
    var size = _sanSize(opts.size || 44);
    var earned = opts.earned !== false;
    var normKey = _sanKey(LEGACY_ID_MAP[key] || key);
    var def = KEY_MAP[normKey];
    var color = _sanColor(opts.color || (earned ? EARNED_COLOR : UNEARNED_COLOR));
    var opacity = earned ? 1 : 0.55;

    if (!def || !MOTIFS[def.motif]) {
      // 兜底：手绘圆环
      return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 48 48" role="img" aria-label="badge" style="opacity:' + opacity + '">' +
        '<circle cx="24" cy="24" r="14" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-dasharray="3 4" stroke-linecap="round"/></svg>';
    }

    var label = _sanLabel((opts.label !== undefined) ? opts.label : def.label);
    var inner = MOTIFS[def.motif](color);
    if (label) {
      // 手绘风数字标签：斜体衬线，右下角，不超出 viewBox
      var fs = label.length >= 3 ? 9 : (label.length === 2 ? 10.5 : 12);
      inner += '<text x="42" y="43" font-size="' + fs + '" font-style="italic" font-weight="700" ' +
        'font-family="\'Segoe Print\',\'Comic Sans MS\',\'Noto Serif SC\',cursive,serif" ' +
        'fill="' + color + '" text-anchor="end">' + label + '</text>';
    }
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 48 48" role="img" aria-label="' + normKey + '" style="opacity:' + opacity + '">' + inner + '</svg>';
  }

  /* 导出：浏览器全局 + Node（校验脚本用） */
  var api = { renderBadgeSvg: renderBadgeSvg, KEY_MAP: KEY_MAP, MOTIFS: MOTIFS, LEGACY_ID_MAP: LEGACY_ID_MAP };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.renderBadgeSvg = renderBadgeSvg;
    root.getAchievementSvg = renderBadgeSvg; // 兼容别名
    root.BADGE_MOTIFS = api;
  }
})(typeof window !== 'undefined' ? window : null);
