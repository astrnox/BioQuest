/**
 * ============================================================
 * BioQuest — AI API Key 安全存取单例
 * 【P1-3 修复】消除明文 Key 直接暴露在 window 全局的问题
 *
 * 设计要点：
 *  1. Key 仅存在于本模块的闭包内存中，不再挂到 window 的普通可枚举属性上；
 *  2. 对外仅暴露 get/set/clear/isRemember 接口，无接口外的明文读取面；
 *  3. 提供「会话内记住」（用户显式勾选）：Key 额外写入 sessionStorage，
 *     同一标签页内刷新可恢复，关闭标签页即清除，不落 localStorage、不入 git；
 *  4. 兼容旧版：检测到 localStorage 中残留的明文 Key 时，搬入内存后立即擦除。
 *
 * 残余风险说明（评审需知）：
 *  纯前端应用无法真正向页面自身脚本隐藏 Key——同源脚本在任意时刻都能调用
 *  get() 或拦截 fetch。此处通过「闭包 + 非枚举属性 + 分页会话绑定」降低
 *  XSS / 误操作泄露面，真正的密钥隔离仍须依赖后端代理（见 ai-client.js 的
 *  server.py 透传模式说明）。
 * ============================================================
 */
(function () {
  'use strict';

  if (window.BioQuestKeyStore) return; // 幂等，避免重复装载覆盖

  var _key = '';                                  // 页面内存中的 Key
  var _SESSION_KEY = 'bioquest_ai_key_session';   // 会话内持久化槽（sessionStorage）
  var _REMEMBER_FLAG = 'bioquest_ai_key_remember';// 「会话内记住」偏好（非敏感）
  var _LEGACY_CFG = 'bioquest_ai_key_config';     // 旧版 localStorage 明文槽

  function _isValid(k) {
    return typeof k === 'string' && k.length >= 8;
  }

  function _readSession() {
    try { return sessionStorage.getItem(_SESSION_KEY) || ''; } catch (e) { return ''; }
  }

  function _writeSession(k) {
    try {
      if (k) sessionStorage.setItem(_SESSION_KEY, k);
      else sessionStorage.removeItem(_SESSION_KEY);
    } catch (e) {
      // Safari 隐私模式等场景写入 sessionStorage 可能抛异常：忽略，退化为页面内存
    }
  }

  // 旧版迁移：localStorage 残留明文 Key → 搬入内存并立即擦除
  function _migrateLegacy() {
    try {
      var raw = localStorage.getItem(_LEGACY_CFG);
      if (!raw) return '';
      var cfg = JSON.parse(raw);
      if (cfg && _isValid(cfg.apiKey)) {
        var k = cfg.apiKey;
        cfg.apiKey = '';
        localStorage.setItem(_LEGACY_CFG, JSON.stringify(cfg));
        return k;
      }
    } catch (e) { /* 损坏数据则忽略 */ }
    return '';
  }

  var store = {
    get: function () {
      if (_key) return _key;                       // 优先内存
      var s = _readSession();                      // 会话内记住模式下的恢复
      if (_isValid(s)) { _key = s; return s; }
      var legacy = _migrateLegacy();               // 旧版残量迁移
      if (legacy) { _key = legacy; return legacy; }
      return '';
    },
    set: function (k, remember) {
      _key = (typeof k === 'string') ? k : '';
      var r = !!remember;
      // 仅当用户显式选择「会话内记住」时才写入 sessionStorage，否则清理
      _writeSession(r && _key ? _key : '');
      try {
        if (r) localStorage.setItem(_REMEMBER_FLAG, '1');
        else localStorage.removeItem(_REMEMBER_FLAG);
      } catch (e) { /* 忽略偏好写入失败 */ }
    },
    clear: function () {
      _key = '';
      try { sessionStorage.removeItem(_SESSION_KEY); } catch (e) {}
    },
    isRemember: function () {
      try { return localStorage.getItem(_REMEMBER_FLAG) === '1'; } catch (e) { return false; }
    }
  };

  // 以「不可枚举」方式暴露，避免被 Object.keys(window) 等常规枚举直接发现
  try {
    Object.defineProperty(window, 'BioQuestKeyStore', { value: store, enumerable: false, configurable: true, writable: false });
  } catch (e) {
    window.BioQuestKeyStore = store;
  }
})();